-- ─────────────────────────────────────────────────────────────────────────────
-- Migration: Cambio de estado atómico con bloqueo optimista para inventory_items
--
-- Problema que resuelve:
--   El flujo previo del frontend hacía SELECT del status actual y luego un
--   UPDATE separado. En operación concurrente (varios vendedores moviendo
--   inventario simultáneamente), dos usuarios podían marcar la misma prenda
--   como "vendido" antes de que el otro UPDATE se confirmara → doble venta.
--
-- Solución:
--   Una función SQL `change_item_status` que:
--     1. Bloquea físicamente la fila con SELECT ... FOR UPDATE.
--     2. Compara el `expected_previous_status` enviado por el cliente con el
--        valor real en BD. Si no coincide → STALE_STATE → el cliente refresca.
--     3. Aplica el UPDATE y registra el log en una sola transacción.
--   Toda la operación es atómica: o se hace todo o nada.
--
-- Idempotente: usa CREATE OR REPLACE FUNCTION.
-- ─────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.change_item_status(
    p_item_id BIGINT,
    p_expected_previous_status item_status,
    p_new_status item_status,
    p_price_sold NUMERIC DEFAULT NULL,
    p_notes TEXT DEFAULT NULL
)
RETURNS TABLE (
    item_id BIGINT,
    previous_status item_status,
    new_status item_status,
    log_id BIGINT
)
LANGUAGE plpgsql
SECURITY INVOKER -- Respeta las políticas RLS del usuario que llama
SET search_path = public, pg_temp
AS $$
DECLARE
    v_current_status item_status;
    v_user_id UUID;
    v_action log_action;
    v_log_id BIGINT;
BEGIN
    -- 1) Identidad del usuario (obligatoria por trazabilidad)
    v_user_id := auth.uid();
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'NO_AUTH: usuario no autenticado'
            USING ERRCODE = '28000';
    END IF;

    -- 2) Validación: ventas obligan precio > 0
    IF p_new_status = 'vendido' AND (p_price_sold IS NULL OR p_price_sold <= 0) THEN
        RAISE EXCEPTION 'INVALID_PRICE: el precio de venta debe ser mayor que cero'
            USING ERRCODE = '22023';
    END IF;

    -- 3) Bloqueo de fila + lectura del estado actual.
    --    FOR UPDATE serializa cualquier otra transacción concurrente sobre la misma prenda.
    SELECT status INTO v_current_status
        FROM inventory_items
        WHERE id = p_item_id
        FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'ITEM_NOT_FOUND: la prenda % no existe', p_item_id
            USING ERRCODE = 'P0002';
    END IF;

    -- 4) Verificación optimista: el estado en BD debe coincidir con lo que el cliente vio.
    IF v_current_status <> p_expected_previous_status THEN
        RAISE EXCEPTION 'STALE_STATE: el estado cambió de % a % por otro usuario',
                        p_expected_previous_status, v_current_status
            USING ERRCODE = '40001';
    END IF;

    -- 5) No-op explícito (mismo estado, mismo precio)
    IF v_current_status = p_new_status AND p_new_status <> 'vendido' THEN
        RAISE EXCEPTION 'NO_CHANGE: la prenda ya está en estado %', v_current_status
            USING ERRCODE = '22023';
    END IF;

    -- 6) Mapeo de acción para la bitácora
    v_action := CASE
        WHEN p_new_status = 'vendido'  THEN 'venta'::log_action
        WHEN p_new_status = 'apartado' THEN 'apartado'::log_action
        WHEN p_new_status = 'devuelto' THEN 'devolucion'::log_action
        ELSE 'actualizacion_estado'::log_action
    END;

    -- 7) UPDATE del ítem (price_sold solo persiste en estado vendido)
    UPDATE inventory_items
        SET status     = p_new_status,
            price_sold = CASE WHEN p_new_status = 'vendido' THEN p_price_sold ELSE NULL END,
            updated_by = v_user_id,
            updated_at = NOW()
        WHERE id = p_item_id;

    -- 8) Inserción del log inmutable (en la MISMA transacción)
    INSERT INTO inventory_logs (item_id, partner_id, action, previous_status, new_status, notes)
        VALUES (p_item_id, v_user_id, v_action, v_current_status, p_new_status, NULLIF(BTRIM(p_notes), ''))
        RETURNING id INTO v_log_id;

    -- 9) Devolución para que el cliente pueda actualizar la caché localmente sin refetch
    RETURN QUERY
        SELECT p_item_id, v_current_status, p_new_status, v_log_id;
END;
$$;

COMMENT ON FUNCTION public.change_item_status IS
  'Cambio de estado atómico con bloqueo optimista. Lanza STALE_STATE si el estado cambió bajo el usuario.';

-- Permisos: solo authenticated puede ejecutar
REVOKE ALL ON FUNCTION public.change_item_status FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.change_item_status TO authenticated;

-- ─────────────────────────────────────────────────────────────────────────────
-- Función paralela: alta de prenda + log de creación en una sola transacción.
-- ─────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.add_inventory_item(
    p_product_id BIGINT,
    p_size TEXT,
    p_color TEXT
)
RETURNS TABLE (item_id BIGINT, log_id BIGINT)
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_user_id UUID;
    v_item_id BIGINT;
    v_log_id  BIGINT;
    v_size    TEXT;
    v_color   TEXT;
BEGIN
    v_user_id := auth.uid();
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'NO_AUTH: usuario no autenticado' USING ERRCODE = '28000';
    END IF;

    v_size  := UPPER(BTRIM(p_size));
    v_color := LOWER(BTRIM(p_color));

    IF v_size = '' OR v_color = '' THEN
        RAISE EXCEPTION 'INVALID_INPUT: talla y color son obligatorios' USING ERRCODE = '22023';
    END IF;

    -- Validar existencia del producto antes del INSERT (mejor error)
    IF NOT EXISTS (SELECT 1 FROM products WHERE id = p_product_id) THEN
        RAISE EXCEPTION 'ITEM_NOT_FOUND: el producto % no existe', p_product_id USING ERRCODE = 'P0002';
    END IF;

    INSERT INTO inventory_items (product_id, size, color, updated_by)
        VALUES (p_product_id, v_size, v_color, v_user_id)
        RETURNING id INTO v_item_id;

    INSERT INTO inventory_logs (item_id, partner_id, action, previous_status, new_status, notes)
        VALUES (v_item_id, v_user_id, 'creacion'::log_action, NULL, 'disponible'::item_status, NULL)
        RETURNING id INTO v_log_id;

    RETURN QUERY SELECT v_item_id, v_log_id;
END;
$$;

COMMENT ON FUNCTION public.add_inventory_item IS
  'Alta de prenda física + log de creación en una sola transacción atómica.';

REVOKE ALL ON FUNCTION public.add_inventory_item FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.add_inventory_item TO authenticated;

-- ─────────────────────────────────────────────────────────────────────────────
-- Asegurar que las tablas relevantes están en la publicación de realtime
-- (idempotente: solo agrega si no estaban)
-- ─────────────────────────────────────────────────────────────────────────────
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables
        WHERE pubname = 'supabase_realtime' AND tablename = 'inventory_items'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.inventory_items;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables
        WHERE pubname = 'supabase_realtime' AND tablename = 'inventory_logs'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.inventory_logs;
    END IF;
EXCEPTION WHEN OTHERS THEN
    -- Si la publicación no existe en este entorno, lo ignoramos silenciosamente
    NULL;
END$$;
