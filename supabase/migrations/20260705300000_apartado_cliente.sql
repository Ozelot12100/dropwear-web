-- ============================================================================
-- Feature de negocio: Apartados con cliente y vencimiento
-- Registra a quién se apartó una prenda, su contacto, la fecha de vencimiento
-- del apartado y un anticipo/depósito opcional. Estos datos viven en el ítem
-- mientras está 'apartado' y se limpian automáticamente al salir de ese estado.
-- El nombre y demás quedan además embebidos en el log para conservar el
-- histórico en la Bitácora aunque luego el ítem se venda.
-- ============================================================================

-- 1. Columnas de apartado en el ítem (nullable; solo aplican cuando status='apartado')
ALTER TABLE public.inventory_items
  ADD COLUMN IF NOT EXISTS reserved_for     TEXT,
  ADD COLUMN IF NOT EXISTS reserved_contact TEXT,
  ADD COLUMN IF NOT EXISTS reserved_until   DATE,
  ADD COLUMN IF NOT EXISTS reserved_deposit NUMERIC(10, 2);

ALTER TABLE public.inventory_items
  DROP CONSTRAINT IF EXISTS reserved_deposit_non_negative,
  ADD CONSTRAINT reserved_deposit_non_negative
    CHECK (reserved_deposit IS NULL OR reserved_deposit >= 0);

-- 2. Reemplazar change_item_status para capturar/limpiar los datos de apartado.
--    Se elimina la firma anterior (4 args) para evitar overloads ambiguos.
DROP FUNCTION IF EXISTS public.change_item_status(bigint, public.item_status, numeric, text);

CREATE OR REPLACE FUNCTION public.change_item_status(
  p_item_id          bigint,
  p_new_status       public.item_status,
  p_price_sold       numeric DEFAULT NULL,
  p_notes            text    DEFAULT NULL,
  p_reserved_for     text    DEFAULT NULL,
  p_reserved_contact text    DEFAULT NULL,
  p_reserved_until   date    DEFAULT NULL,
  p_reserved_deposit numeric DEFAULT NULL
) RETURNS public.inventory_items
LANGUAGE plpgsql SECURITY INVOKER SET search_path = public AS $$
DECLARE
  v_prev   public.item_status;
  v_action public.log_action;
  v_item   public.inventory_items;
  v_notes  text;
BEGIN
  IF p_new_status = 'vendido' AND (p_price_sold IS NULL OR p_price_sold <= 0) THEN
    RAISE EXCEPTION 'Debe capturar un precio de venta válido (mayor a 0).';
  END IF;

  IF p_new_status = 'apartado' AND NULLIF(trim(coalesce(p_reserved_for, '')), '') IS NULL THEN
    RAISE EXCEPTION 'Debe capturar el nombre del cliente para apartar la prenda.';
  END IF;

  -- Bloquea la fila: serializa lectura+escritura y elimina la carrera de doble venta.
  SELECT status INTO v_prev FROM public.inventory_items WHERE id = p_item_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'El artículo % no existe.', p_item_id;
  END IF;
  IF v_prev = p_new_status THEN
    RAISE EXCEPTION 'El artículo ya está en estado "%".', p_new_status;
  END IF;

  v_action := CASE p_new_status
    WHEN 'vendido'  THEN 'venta'
    WHEN 'apartado' THEN 'apartado'
    WHEN 'devuelto' THEN 'devolucion'
    ELSE 'actualizacion_estado' END::public.log_action;

  -- Para apartados, embebe los datos del cliente en las notas del log (histórico).
  v_notes := p_notes;
  IF p_new_status = 'apartado' THEN
    v_notes := 'Cliente: ' || trim(p_reserved_for)
      || CASE WHEN NULLIF(trim(coalesce(p_reserved_contact, '')), '') IS NOT NULL
              THEN ' (' || trim(p_reserved_contact) || ')' ELSE '' END
      || CASE WHEN p_reserved_until IS NOT NULL
              THEN ' · vence ' || to_char(p_reserved_until, 'DD/MM/YYYY') ELSE '' END
      || CASE WHEN p_reserved_deposit IS NOT NULL
              THEN ' · anticipo $' || to_char(p_reserved_deposit, 'FM999999990.00') ELSE '' END
      || CASE WHEN NULLIF(trim(coalesce(p_notes, '')), '') IS NOT NULL
              THEN ' · ' || trim(p_notes) ELSE '' END;
  END IF;

  UPDATE public.inventory_items
     SET status           = p_new_status,
         price_sold       = CASE WHEN p_new_status = 'vendido'  THEN p_price_sold                       ELSE NULL END,
         reserved_for     = CASE WHEN p_new_status = 'apartado' THEN NULLIF(trim(p_reserved_for), '')   ELSE NULL END,
         reserved_contact = CASE WHEN p_new_status = 'apartado' THEN NULLIF(trim(coalesce(p_reserved_contact, '')), '') ELSE NULL END,
         reserved_until   = CASE WHEN p_new_status = 'apartado' THEN p_reserved_until                   ELSE NULL END,
         reserved_deposit = CASE WHEN p_new_status = 'apartado' THEN p_reserved_deposit                 ELSE NULL END,
         updated_at       = now()
   WHERE id = p_item_id AND status = v_prev   -- guard extra ante cualquier carrera
   RETURNING * INTO v_item;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'No autorizado o el artículo cambió de estado. Recarga e intenta de nuevo.';
  END IF;

  -- partner_id lo sella el trigger stamp_log_actor; updated_by lo sella stamp_item_actor.
  INSERT INTO public.inventory_logs (item_id, action, previous_status, new_status, notes)
    VALUES (p_item_id, v_action, v_prev, p_new_status, v_notes);

  RETURN v_item;
END; $$;

-- 3. Permisos para la nueva firma (8 args): solo usuarios autenticados.
REVOKE EXECUTE ON FUNCTION public.change_item_status(bigint, public.item_status, numeric, text, text, text, date, numeric) FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.change_item_status(bigint, public.item_status, numeric, text, text, text, date, numeric) TO authenticated;
