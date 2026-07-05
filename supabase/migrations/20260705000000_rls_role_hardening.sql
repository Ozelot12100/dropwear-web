-- =====================================================================
-- DropWear · Fase 1 de seguridad — RLS por rol + bitácora inmutable
-- Reemplaza las políticas abiertas `authenticated_all USING(true)` por
-- políticas que respetan el RBAC de 5 roles. Cierra:
--   C1) autoescalada de rol y escritura/borrado no autorizado
--   C3) falsificación/borrado de la bitácora de auditoría
-- Matriz de roles (según la documentación de negocio):
--   superadmin: todo · socio: CRUD de catálogo e inventario
--   vendedor: alta/edición de inventario y estados (no borra, no toca precios base)
--   repartidor: actualiza estado de entrega · contador: solo lectura
-- =====================================================================

-- 0. Helper: rol del usuario actual. SECURITY DEFINER (lo ejecuta el owner,
--    que ignora RLS) evita recursión al leer user_profiles desde una política.
CREATE OR REPLACE FUNCTION public.current_user_role()
RETURNS public.user_role
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = ''
AS $$
  SELECT role FROM public.user_profiles WHERE id = (SELECT auth.uid());
$$;

-- 1. Eliminar la política abierta anterior en las 6 tablas
DROP POLICY IF EXISTS "authenticated_all" ON public.user_profiles;
DROP POLICY IF EXISTS "authenticated_all" ON public.categories;
DROP POLICY IF EXISTS "authenticated_all" ON public.brands;
DROP POLICY IF EXISTS "authenticated_all" ON public.products;
DROP POLICY IF EXISTS "authenticated_all" ON public.inventory_items;
DROP POLICY IF EXISTS "authenticated_all" ON public.inventory_logs;

-- 2. user_profiles: lectura para autenticados; SIN escritura de cliente.
--    (rol/nombre/is_active se mutan solo vía Edge Functions con service_role,
--     que ignora RLS). Esto cierra la autoescalada a superadmin.
CREATE POLICY "profiles_select" ON public.user_profiles
  FOR SELECT TO authenticated USING (true);

-- 3. Catálogo: lectura todos; escritura solo socio/superadmin.
CREATE POLICY "categories_select" ON public.categories FOR SELECT TO authenticated USING (true);
CREATE POLICY "categories_write"  ON public.categories FOR ALL TO authenticated
  USING      ((SELECT public.current_user_role()) IN ('socio','superadmin'))
  WITH CHECK ((SELECT public.current_user_role()) IN ('socio','superadmin'));

CREATE POLICY "brands_select" ON public.brands FOR SELECT TO authenticated USING (true);
CREATE POLICY "brands_write"  ON public.brands FOR ALL TO authenticated
  USING      ((SELECT public.current_user_role()) IN ('socio','superadmin'))
  WITH CHECK ((SELECT public.current_user_role()) IN ('socio','superadmin'));

CREATE POLICY "products_select" ON public.products FOR SELECT TO authenticated USING (true);
CREATE POLICY "products_write"  ON public.products FOR ALL TO authenticated
  USING      ((SELECT public.current_user_role()) IN ('socio','superadmin'))
  WITH CHECK ((SELECT public.current_user_role()) IN ('socio','superadmin'));

-- 4. inventory_items: lectura todos; alta (vendedor+), edición operativa
--    (incluye repartidor para entregas), borrado solo socio/superadmin.
CREATE POLICY "items_select" ON public.inventory_items FOR SELECT TO authenticated USING (true);
CREATE POLICY "items_insert" ON public.inventory_items FOR INSERT TO authenticated
  WITH CHECK ((SELECT public.current_user_role()) IN ('vendedor','socio','superadmin'));
CREATE POLICY "items_update" ON public.inventory_items FOR UPDATE TO authenticated
  USING      ((SELECT public.current_user_role()) IN ('vendedor','repartidor','socio','superadmin'))
  WITH CHECK ((SELECT public.current_user_role()) IN ('vendedor','repartidor','socio','superadmin'));
CREATE POLICY "items_delete" ON public.inventory_items FOR DELETE TO authenticated
  USING      ((SELECT public.current_user_role()) IN ('socio','superadmin'));

-- 5. inventory_logs: lectura todos; inserción atribuida a UNO MISMO; INMUTABLE.
--    (sin políticas de UPDATE/DELETE ⇒ nadie puede editar ni borrar el historial)
CREATE POLICY "logs_select" ON public.inventory_logs FOR SELECT TO authenticated USING (true);
CREATE POLICY "logs_insert" ON public.inventory_logs FOR INSERT TO authenticated
  WITH CHECK (partner_id = (SELECT auth.uid()));

-- 6. Sellar el actor en el servidor: ignora el partner_id/updated_by que envíe
--    el cliente y lo fija a la identidad real del JWT (anti-spoofing).
CREATE OR REPLACE FUNCTION public.stamp_log_actor()
RETURNS trigger LANGUAGE plpgsql SET search_path = '' AS $$
BEGIN
  IF (SELECT auth.uid()) IS NOT NULL THEN
    NEW.partner_id := (SELECT auth.uid());
  END IF;
  RETURN NEW;
END; $$;
DROP TRIGGER IF EXISTS trg_stamp_log_actor ON public.inventory_logs;
CREATE TRIGGER trg_stamp_log_actor BEFORE INSERT ON public.inventory_logs
  FOR EACH ROW EXECUTE FUNCTION public.stamp_log_actor();

CREATE OR REPLACE FUNCTION public.stamp_item_actor()
RETURNS trigger LANGUAGE plpgsql SET search_path = '' AS $$
BEGIN
  IF (SELECT auth.uid()) IS NOT NULL THEN
    NEW.updated_by := (SELECT auth.uid());
  END IF;
  RETURN NEW;
END; $$;
DROP TRIGGER IF EXISTS trg_stamp_item_actor ON public.inventory_items;
CREATE TRIGGER trg_stamp_item_actor BEFORE INSERT OR UPDATE ON public.inventory_items
  FOR EACH ROW EXECUTE FUNCTION public.stamp_item_actor();
