-- ============================================================================
-- DropWear · Matriz de roles del inventario (endurecimiento)
-- ----------------------------------------------------------------------------
-- Objetivo: que cada rol solo pueda hacer lo que le corresponde en el
-- inventario, cumplido EN LA BASE DE DATOS (no solo en la UI).
--
-- Matriz de negocio (prendas / inventario):
--   superadmin, socio : todo (agregar, editar detalles, cualquier cambio de
--                       estado). Borrado sigue siendo socio/superadmin.
--   vendedor          : agregar prendas, editar detalles y cualquier cambio de
--                       estado (vender/apartar/devolver/regresar). No borra.
--   repartidor        : SOLO registrar la entrega de un apartado
--                       (apartado -> vendido). Nada más.
--   contador          : solo lectura (ningún cambio).
--
-- Cómo se hace cumplir:
--   Hasta hoy las RPC eran SECURITY INVOKER y la tabla inventory_items tenía
--   políticas de escritura por rol de grano grueso (items_update permitía a
--   vendedor/repartidor/socio/superadmin CUALQUIER update). Eso dejaba un hueco:
--   un repartidor podía SALTARSE la RPC y escribir la tabla directo vía la API
--   REST, evadiendo las reglas de transición.
--   Solución: se ELIMINAN las políticas de escritura directa (INSERT/UPDATE/
--   DELETE) de inventory_items y las 3 RPC pasan a SECURITY DEFINER con las
--   guardas de autorización DENTRO. Así la única vía de escritura son las RPC,
--   que validan rol y transición. La lectura (items_select) queda igual.
-- ============================================================================

-- 1. Cerrar la escritura directa de cliente a inventory_items -----------------
--    (la lectura se conserva; el borrado en cascada por producto no depende de
--     esta política y sigue funcionando).
DROP POLICY IF EXISTS "items_insert" ON public.inventory_items;
DROP POLICY IF EXISTS "items_update" ON public.inventory_items;
DROP POLICY IF EXISTS "items_delete" ON public.inventory_items;
-- items_select se mantiene: todos los autenticados pueden leer el inventario.

-- 2. RPC: alta de artículo (DEFINER + guarda de rol) --------------------------
CREATE OR REPLACE FUNCTION public.add_inventory_item(
  p_product_id bigint, p_size text, p_color text
) RETURNS public.inventory_items
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  v_role public.user_role := public.current_user_role();
  v_item public.inventory_items;
BEGIN
  IF v_role IS NULL OR v_role NOT IN ('vendedor','socio','superadmin') THEN
    RAISE EXCEPTION 'No autorizado: tu rol no puede agregar prendas al inventario.';
  END IF;

  INSERT INTO public.inventory_items (product_id, size, color)
    VALUES (p_product_id, upper(trim(p_size)), lower(trim(p_color)))
    RETURNING * INTO v_item;   -- status = 'disponible' por default del esquema

  INSERT INTO public.inventory_logs (item_id, action, previous_status, new_status)
    VALUES (v_item.id, 'creacion', NULL, 'disponible');

  RETURN v_item;
END; $$;

-- 3. RPC: corrección de detalles (DEFINER + guarda de rol) --------------------
CREATE OR REPLACE FUNCTION public.update_item_details(
  p_item_id bigint, p_product_id bigint, p_size text, p_color text
) RETURNS public.inventory_items
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  v_role public.user_role := public.current_user_role();
  v_old  public.inventory_items;
  v_item public.inventory_items;
BEGIN
  IF v_role IS NULL OR v_role NOT IN ('vendedor','socio','superadmin') THEN
    RAISE EXCEPTION 'No autorizado: tu rol no puede editar los detalles de una prenda.';
  END IF;

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

  INSERT INTO public.inventory_logs (item_id, action, previous_status, new_status, notes)
    VALUES (p_item_id, 'actualizacion_estado', v_old.status, v_old.status,
            format('Corrección de detalles (Antes -> Talla: %s, Color: %s)', v_old.size, v_old.color));

  RETURN v_item;
END; $$;

-- 4. RPC: cambio de estado (DEFINER + guarda de rol + regla de transición) ----
--    Conserva TODA la lógica actual (precio, apartado con datos de cliente,
--    método de pago, bloqueo de fila anti-doble-venta) y añade la autorización.
CREATE OR REPLACE FUNCTION public.change_item_status(
  p_item_id          bigint,
  p_new_status       public.item_status,
  p_price_sold       numeric DEFAULT NULL,
  p_notes            text    DEFAULT NULL,
  p_reserved_for     text    DEFAULT NULL,
  p_reserved_contact text    DEFAULT NULL,
  p_reserved_until   date    DEFAULT NULL,
  p_reserved_deposit numeric DEFAULT NULL,
  p_payment_method   public.payment_method DEFAULT NULL
) RETURNS public.inventory_items
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  v_role   public.user_role := public.current_user_role();
  v_prev   public.item_status;
  v_action public.log_action;
  v_item   public.inventory_items;
  v_notes  text;
  v_method public.payment_method;
BEGIN
  -- Autorización base: contador (y cualquier rol desconocido) es de solo lectura.
  IF v_role IS NULL OR v_role NOT IN ('vendedor','repartidor','socio','superadmin') THEN
    RAISE EXCEPTION 'No autorizado: tu rol no puede cambiar el estatus de una prenda.';
  END IF;

  IF p_new_status = 'vendido' AND (p_price_sold IS NULL OR p_price_sold <= 0) THEN
    RAISE EXCEPTION 'Debe capturar un precio de venta válido (mayor a 0).';
  END IF;

  IF p_new_status = 'apartado' AND NULLIF(trim(coalesce(p_reserved_for, '')), '') IS NULL THEN
    RAISE EXCEPTION 'Debe capturar el nombre del cliente para apartar la prenda.';
  END IF;

  -- Método por defecto en ventas: efectivo (si el cliente no lo envía).
  v_method := COALESCE(p_payment_method, 'efectivo');

  -- Bloquea la fila: serializa lectura+escritura y elimina la carrera de doble venta.
  SELECT status INTO v_prev FROM public.inventory_items WHERE id = p_item_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'El artículo % no existe.', p_item_id;
  END IF;
  IF v_prev = p_new_status THEN
    RAISE EXCEPTION 'El artículo ya está en estado "%".', p_new_status;
  END IF;

  -- Regla de transición del repartidor: SOLO puede registrar la entrega de un
  -- apartado (apartado -> vendido). Cualquier otra transición se rechaza.
  IF v_role = 'repartidor' AND NOT (v_prev = 'apartado' AND p_new_status = 'vendido') THEN
    RAISE EXCEPTION 'Como repartidor solo puedes registrar la entrega (venta) de una prenda apartada.';
  END IF;

  v_action := CASE p_new_status
    WHEN 'vendido'  THEN 'venta'
    WHEN 'apartado' THEN 'apartado'
    WHEN 'devuelto' THEN 'devolucion'
    ELSE 'actualizacion_estado' END::public.log_action;

  -- Notas del log: en venta antepone el método de pago; en apartado embebe los
  -- datos del cliente (histórico en la Bitácora aunque luego cambie de estado).
  v_notes := p_notes;
  IF p_new_status = 'vendido' THEN
    v_notes := 'Pago: ' || v_method::text
      || CASE WHEN NULLIF(trim(coalesce(p_notes, '')), '') IS NOT NULL
              THEN ' · ' || trim(p_notes) ELSE '' END;
  ELSIF p_new_status = 'apartado' THEN
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
         payment_method   = CASE WHEN p_new_status = 'vendido'  THEN v_method                           ELSE NULL END,
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

  INSERT INTO public.inventory_logs (item_id, action, previous_status, new_status, notes)
    VALUES (p_item_id, v_action, v_prev, p_new_status, v_notes);

  RETURN v_item;
END; $$;

-- 5. Permisos: solo 'authenticated' ejecuta las RPC (nunca anon/public) -------
REVOKE EXECUTE ON FUNCTION public.add_inventory_item(bigint, text, text) FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.add_inventory_item(bigint, text, text) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.update_item_details(bigint, bigint, text, text) FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.update_item_details(bigint, bigint, text, text) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.change_item_status(bigint, public.item_status, numeric, text, text, text, date, numeric, public.payment_method) FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.change_item_status(bigint, public.item_status, numeric, text, text, text, date, numeric, public.payment_method) TO authenticated;
