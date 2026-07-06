-- ============================================================================
-- Refinamiento del Corte de Caja: salidas de efectivo del cajón.
-- Para que el arqueo sea exacto hay que restar el efectivo que SALIÓ del cajón
-- durante el turno (gastos pagados en efectivo o retiros):
--   efectivo esperado = fondo inicial + ventas en efectivo − salidas de efectivo.
-- Columna aditiva, no destructiva (default 0; los cortes previos quedan válidos).
-- ============================================================================

ALTER TABLE public.cash_cuts
  ADD COLUMN IF NOT EXISTS cash_out NUMERIC(12, 2) NOT NULL DEFAULT 0;

ALTER TABLE public.cash_cuts
  DROP CONSTRAINT IF EXISTS cash_cuts_cash_out_non_negative,
  ADD CONSTRAINT cash_cuts_cash_out_non_negative CHECK (cash_out >= 0);
