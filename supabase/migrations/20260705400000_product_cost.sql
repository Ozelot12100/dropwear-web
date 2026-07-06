-- ============================================================================
-- Feature de negocio: Costo por producto (para calcular utilidad / margen)
-- Agrega el costo estándar de cada producto del catálogo. La utilidad de una
-- venta se calcula como price_sold − cost. El costo es un dato financiero:
-- hoy se restringe solo en la UI (a roles financieros); el endurecimiento a
-- nivel de columna en la BD queda pendiente (hallazgo M2, ver AUDITORIA.md).
-- ============================================================================

ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS cost NUMERIC(10, 2);

ALTER TABLE public.products
  DROP CONSTRAINT IF EXISTS cost_non_negative,
  ADD CONSTRAINT cost_non_negative CHECK (cost IS NULL OR cost >= 0);
