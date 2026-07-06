-- ============================================================================
-- Feature de negocio: Control de Gastos (Egresos Operativos)
-- Registra los gastos operativos del negocio (paquetería, servicios, nómina,
-- renta, etc.) para poder calcular la UTILIDAD NETA REAL:
--     Utilidad Neta = Ingresos (ventas) − Costo de venta (COGS) − Gastos.
--
-- Es dato financiero SENSIBLE:
--   · Lectura  → solo roles financieros (superadmin / socio / contador).
--   · Escritura→ solo socio / superadmin (contador es de solo lectura).
--   · El personal de piso (vendedor / repartidor) NO ve los gastos.
--
-- NOTA: no se incluye "mercancía / compra de stock" como categoría de gasto.
-- El costo de la mercancía ya se captura por producto en products.cost (COGS)
-- y restarlo también aquí lo contaría dos veces contra la utilidad.
-- ============================================================================

-- 1. TABLA -------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.expenses (
    id          BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    amount      NUMERIC(10, 2) NOT NULL,
    category    TEXT NOT NULL,
    description TEXT,
    spent_at    DATE NOT NULL DEFAULT CURRENT_DATE,
    -- created_by referencia user_profiles (igual que inventory_logs.partner_id)
    -- para poder incrustar el nombre del autor vía PostgREST.
    created_by  UUID REFERENCES public.user_profiles(id) ON DELETE SET NULL,
    created_at  TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    CONSTRAINT expenses_amount_positive CHECK (amount > 0),
    CONSTRAINT expenses_category_valid CHECK (
      category IN ('paqueteria','servicios','nomina','renta','limpieza','marketing','comisiones','otro')
    )
);

-- Índice para los filtros por rango de fecha (resumen mensual / listado).
CREATE INDEX IF NOT EXISTS idx_expenses_spent_at ON public.expenses (spent_at DESC);

-- 2. ROW LEVEL SECURITY ------------------------------------------------------
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;

-- Lectura: solo roles financieros. El personal de piso NO ve gastos.
DROP POLICY IF EXISTS "expenses_select" ON public.expenses;
CREATE POLICY "expenses_select" ON public.expenses FOR SELECT TO authenticated
  USING ((SELECT public.current_user_role()) IN ('contador','socio','superadmin'));

-- Escritura: solo socio / superadmin.
DROP POLICY IF EXISTS "expenses_insert" ON public.expenses;
CREATE POLICY "expenses_insert" ON public.expenses FOR INSERT TO authenticated
  WITH CHECK ((SELECT public.current_user_role()) IN ('socio','superadmin'));

DROP POLICY IF EXISTS "expenses_update" ON public.expenses;
CREATE POLICY "expenses_update" ON public.expenses FOR UPDATE TO authenticated
  USING      ((SELECT public.current_user_role()) IN ('socio','superadmin'))
  WITH CHECK ((SELECT public.current_user_role()) IN ('socio','superadmin'));

DROP POLICY IF EXISTS "expenses_delete" ON public.expenses;
CREATE POLICY "expenses_delete" ON public.expenses FOR DELETE TO authenticated
  USING      ((SELECT public.current_user_role()) IN ('socio','superadmin'));

-- 3. SELLADO DE ACTOR (anti-spoofing) ---------------------------------------
-- Ignora el created_by que envíe el cliente y lo fija a la identidad real del
-- JWT (mismo patrón que stamp_log_actor / stamp_item_actor).
CREATE OR REPLACE FUNCTION public.stamp_expense_actor()
RETURNS trigger LANGUAGE plpgsql SET search_path = '' AS $$
BEGIN
  IF (SELECT auth.uid()) IS NOT NULL THEN
    NEW.created_by := (SELECT auth.uid());
  END IF;
  RETURN NEW;
END; $$;
DROP TRIGGER IF EXISTS trg_stamp_expense_actor ON public.expenses;
CREATE TRIGGER trg_stamp_expense_actor BEFORE INSERT ON public.expenses
  FOR EACH ROW EXECUTE FUNCTION public.stamp_expense_actor();
