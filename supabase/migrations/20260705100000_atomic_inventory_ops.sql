-- =====================================================================
-- DropWear · Fase 2 — Integridad transaccional
-- Convierte las operaciones de inventario (multi-paso, no atómicas) en
-- funciones RPC de Postgres que hacen UPDATE/INSERT + bitácora en UNA
-- transacción, con bloqueo de fila (FOR UPDATE) para eliminar la doble
-- venta (C2). Añade CHECK constraints de integridad (M1).
-- Las funciones son SECURITY INVOKER: respetan las políticas RLS de la
-- Fase 1 (rol) y sellan actor vía los triggers ya existentes.
-- =====================================================================

-- 1. CONSTRAINTS DE INTEGRIDAD ----------------------------------------
ALTER TABLE public.inventory_items
  ADD CONSTRAINT price_sold_required_when_sold
    CHECK (status <> 'vendido' OR price_sold IS NOT NULL),
  ADD CONSTRAINT price_sold_non_negative
    CHECK (price_sold IS NULL OR price_sold >= 0);
ALTER TABLE public.products
  ADD CONSTRAINT base_price_non_negative CHECK (base_price >= 0);

-- 2. RPC: cambio de estado atómico (venta / apartado / devolución) ----
CREATE OR REPLACE FUNCTION public.change_item_status(
  p_item_id    bigint,
  p_new_status public.item_status,
  p_price_sold numeric DEFAULT NULL,
  p_notes      text    DEFAULT NULL
) RETURNS public.inventory_items
LANGUAGE plpgsql SECURITY INVOKER SET search_path = public AS $$
DECLARE
  v_prev   public.item_status;
  v_action public.log_action;
  v_item   public.inventory_items;
BEGIN
  IF p_new_status = 'vendido' AND (p_price_sold IS NULL OR p_price_sold <= 0) THEN
    RAISE EXCEPTION 'Debe capturar un precio de venta válido (mayor a 0).';
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

  UPDATE public.inventory_items
     SET status     = p_new_status,
         price_sold = CASE WHEN p_new_status = 'vendido' THEN p_price_sold ELSE NULL END,
         updated_at = now()
   WHERE id = p_item_id AND status = v_prev   -- guard extra ante cualquier carrera
   RETURNING * INTO v_item;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'No autorizado o el artículo cambió de estado. Recarga e intenta de nuevo.';
  END IF;

  -- partner_id lo sella el trigger stamp_log_actor; updated_by lo sella stamp_item_actor.
  INSERT INTO public.inventory_logs (item_id, action, previous_status, new_status, notes)
    VALUES (p_item_id, v_action, v_prev, p_new_status, p_notes);

  RETURN v_item;
END; $$;

-- 3. RPC: alta de artículo atómica (item + log de creación) -----------
CREATE OR REPLACE FUNCTION public.add_inventory_item(
  p_product_id bigint, p_size text, p_color text
) RETURNS public.inventory_items
LANGUAGE plpgsql SECURITY INVOKER SET search_path = public AS $$
DECLARE v_item public.inventory_items;
BEGIN
  INSERT INTO public.inventory_items (product_id, size, color)
    VALUES (p_product_id, upper(trim(p_size)), lower(trim(p_color)))
    RETURNING * INTO v_item;   -- status = 'disponible' por default del esquema

  INSERT INTO public.inventory_logs (item_id, action, previous_status, new_status)
    VALUES (v_item.id, 'creacion', NULL, 'disponible');

  RETURN v_item;
END; $$;

-- 4. RPC: corrección de detalles atómica (update + log) --------------
CREATE OR REPLACE FUNCTION public.update_item_details(
  p_item_id bigint, p_product_id bigint, p_size text, p_color text
) RETURNS public.inventory_items
LANGUAGE plpgsql SECURITY INVOKER SET search_path = public AS $$
DECLARE
  v_old  public.inventory_items;
  v_item public.inventory_items;
BEGIN
  SELECT * INTO v_old FROM public.inventory_items WHERE id = p_item_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'El artículo % no existe.', p_item_id;
  END IF;

  UPDATE public.inventory_items
     SET product_id = p_product_id,
         size       = upper(trim(p_size)),
         color      = lower(trim(p_color)),
         updated_at = now()
   WHERE id = p_item_id
   RETURNING * INTO v_item;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'No autorizado para editar este artículo.';
  END IF;

  INSERT INTO public.inventory_logs (item_id, action, previous_status, new_status, notes)
    VALUES (p_item_id, 'actualizacion_estado', v_old.status, v_old.status,
            format('Corrección de detalles (Antes -> Talla: %s, Color: %s)', v_old.size, v_old.color));

  RETURN v_item;
END; $$;

-- 5. PERMISOS: solo usuarios autenticados pueden ejecutar los RPC -----
REVOKE EXECUTE ON FUNCTION public.change_item_status(bigint, public.item_status, numeric, text) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.add_inventory_item(bigint, text, text) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.update_item_details(bigint, bigint, text, text) FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.change_item_status(bigint, public.item_status, numeric, text) TO authenticated;
GRANT  EXECUTE ON FUNCTION public.add_inventory_item(bigint, text, text) TO authenticated;
GRANT  EXECUTE ON FUNCTION public.update_item_details(bigint, bigint, text, text) TO authenticated;
