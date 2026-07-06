-- ============================================================================
-- Feature de negocio: Método de pago en ventas + Corte de Caja (arqueo)
-- 1) Cada venta registra su método de pago (efectivo / transferencia / tarjeta).
-- 2) Nueva tabla `cash_cuts` para el corte diario: fondo inicial + ventas en
--    efectivo del día = efectivo esperado; se compara contra el efectivo
--    contado y se guarda la diferencia (sobrante/faltante) como registro.
-- ============================================================================

-- 1. Enum de método de pago (idempotente).
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'payment_method') THEN
    CREATE TYPE public.payment_method AS ENUM ('efectivo', 'transferencia', 'tarjeta');
  END IF;
END $$;

-- 2. Columna en el ítem (nullable; solo aplica cuando status='vendido').
ALTER TABLE public.inventory_items
  ADD COLUMN IF NOT EXISTS payment_method public.payment_method;

-- 3. Extender change_item_status para capturar el método de pago en la venta.
--    Se elimina la firma anterior (8 args) y se crea la nueva (9 args).
DROP FUNCTION IF EXISTS public.change_item_status(bigint, public.item_status, numeric, text, text, text, date, numeric);

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
LANGUAGE plpgsql SECURITY INVOKER SET search_path = public AS $$
DECLARE
  v_prev   public.item_status;
  v_action public.log_action;
  v_item   public.inventory_items;
  v_notes  text;
  v_method public.payment_method;
BEGIN
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

-- Permisos para la nueva firma (9 args).
REVOKE EXECUTE ON FUNCTION public.change_item_status(bigint, public.item_status, numeric, text, text, text, date, numeric, public.payment_method) FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.change_item_status(bigint, public.item_status, numeric, text, text, text, date, numeric, public.payment_method) TO authenticated;

-- 4. Tabla de cortes de caja (arqueo). Cada fila es un corte guardado.
CREATE TABLE IF NOT EXISTS public.cash_cuts (
  id            BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  cut_date      DATE NOT NULL DEFAULT CURRENT_DATE,
  opening_float NUMERIC(10, 2) NOT NULL DEFAULT 0,  -- fondo inicial de caja
  sales_cash    NUMERIC(12, 2) NOT NULL DEFAULT 0,  -- ventas en efectivo del día (snapshot)
  expected_cash NUMERIC(12, 2) NOT NULL,            -- opening_float + sales_cash
  counted_cash  NUMERIC(12, 2) NOT NULL,            -- efectivo contado en el cajón
  difference    NUMERIC(12, 2) NOT NULL,            -- counted − expected (+ sobrante / − faltante)
  notes         TEXT,
  created_by    UUID REFERENCES public.user_profiles(id) ON DELETE SET NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT cash_cuts_non_negative CHECK (opening_float >= 0 AND counted_cash >= 0)
);
CREATE INDEX IF NOT EXISTS idx_cash_cuts_date ON public.cash_cuts (cut_date DESC);

-- 5. RLS: dato financiero. Leer contador/socio/superadmin; escribir socio/superadmin.
ALTER TABLE public.cash_cuts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "cash_cuts_select" ON public.cash_cuts;
CREATE POLICY "cash_cuts_select" ON public.cash_cuts FOR SELECT TO authenticated
  USING ((SELECT public.current_user_role()) IN ('contador', 'socio', 'superadmin'));

DROP POLICY IF EXISTS "cash_cuts_insert" ON public.cash_cuts;
CREATE POLICY "cash_cuts_insert" ON public.cash_cuts FOR INSERT TO authenticated
  WITH CHECK ((SELECT public.current_user_role()) IN ('socio', 'superadmin'));

DROP POLICY IF EXISTS "cash_cuts_delete" ON public.cash_cuts;
CREATE POLICY "cash_cuts_delete" ON public.cash_cuts FOR DELETE TO authenticated
  USING ((SELECT public.current_user_role()) IN ('socio', 'superadmin'));

-- 6. Sellado de autor (anti-spoofing).
CREATE OR REPLACE FUNCTION public.stamp_cash_cut_actor()
RETURNS trigger LANGUAGE plpgsql SET search_path = '' AS $$
BEGIN
  IF (SELECT auth.uid()) IS NOT NULL THEN
    NEW.created_by := (SELECT auth.uid());
  END IF;
  RETURN NEW;
END; $$;
DROP TRIGGER IF EXISTS trg_stamp_cash_cut_actor ON public.cash_cuts;
CREATE TRIGGER trg_stamp_cash_cut_actor BEFORE INSERT ON public.cash_cuts
  FOR EACH ROW EXECUTE FUNCTION public.stamp_cash_cut_actor();
