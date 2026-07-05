# Auditoría Técnica y Endurecimiento — DropWear

Registro de la auditoría técnica realizada el **5 de julio de 2026** (código, arquitectura, seguridad, escalabilidad y mantenibilidad) y el estado de remediación de cada hallazgo. La auditoría se hizo leyendo el código real en tres frentes paralelos: seguridad/backend, arquitectura frontend y escalabilidad/tooling.

## Resumen

**28 hallazgos** — 4 críticos, 9 altos, 9 medios, 5 bajos. Los **4 críticos y la mayoría de los altos están resueltos**, desplegados y verificados (build/typecheck/tests/CI en verde, funciones probadas por API). Quedan pendientes algunos ítems de menor prioridad y los que dependen de decisiones de negocio o de crear cuentas externas.

## Trabajo realizado

### Fase 1 — Seguridad del backend (crítico)
- **C1 ✅** Las políticas RLS abiertas (`USING(true)`) se reemplazaron por **políticas por rol** con la función `current_user_role()`. Cierra la autoescalada a superadmin y el borrado/alteración no autorizada. `user_profiles` ya no es escribible por el cliente. Registro público (`enable_signup`) desactivado. → `migrations/20260705000000_rls_role_hardening.sql`
- **C3 ✅** La **bitácora es inmutable** (sin UPDATE/DELETE) y el actor (`partner_id`/`updated_by`) se sella en el servidor vía trigger (anti-falsificación).

### Fase 2 — Integridad transaccional (crítico)
- **C2 ✅** Las operaciones de inventario son **atómicas** vía funciones RPC de Postgres (`change_item_status`, `add_inventory_item`, `update_item_details`) con bloqueo de fila `FOR UPDATE`: elimina la doble venta y el estado inconsistente. → `migrations/20260705100000_atomic_inventory_ops.sql`
- **M1 ✅** `CHECK` constraints: precio obligatorio si el estado es "vendido"; precios no negativos.

### Fase 3 — Red de seguridad (crítico)
- **C4 ✅** **Vitest** (11 tests) + **CI en GitHub Actions** (`.github/workflows/ci.yml`) con build/typecheck/tests/lint como gates bloqueantes.
- **H7 (parcial) ✅** **ErrorBoundary** global + hook central de monitoreo (`src/lib/monitoring.ts`). Sentry queda listo para enchufar con `VITE_SENTRY_DSN`.

### Quick wins
- **H1 ✅** Filtros avanzados de inventario ahora sí se aplican.
- **H2 ✅** Contadores de la bitácora correctos (ya no muestran 0).
- **H3 ✅** Code-splitting por ruta: bundle inicial 785 KB → 655 KB (19 chunks).
- **H4 ✅** TypeScript `strict` + `noUncheckedIndexedAccess` (0 errores).
- **H5 ✅** Las 5 Edge Functions devuelven **códigos HTTP reales** (401/403/400/500) + validación de inputs + `catch(unknown)`; cliente con helper robusto.
- **H6 ✅** StaffPage: fetching manual → **TanStack Query** + invalidación.
- **H9 ✅** `database.types.ts` **generado** desde el esquema (RPC + `is_active`).
- **L1 ✅** Defaults de React Query para red lenta.
- **L2 ✅** Headers de caché/seguridad en Vercel + `.env.example`.
- **M3 ✅** "Ventas Hoy" se deriva de la bitácora (ya no se infla al editar).
- **M5 ✅** `ConfirmDialog` reutilizable reemplaza `confirm()`/`alert()` nativos.
- **M6 ✅** Verificado: la autorización de `reset-password` ya era correcta.
- **M8 ✅** Favicon 48 KB → 1.9 KB.
- Deuda de lint limpiada; el lint es ahora un gate bloqueante (0 errores).

## Estado por hallazgo

| ID | Sev. | Hallazgo | Estado |
|----|------|----------|--------|
| C1 | 🔴 | RLS abierto anula el RBAC | ✅ Resuelto |
| C2 | 🔴 | Operaciones no atómicas (doble venta) | ✅ Resuelto |
| C3 | 🔴 | Bitácora falsificable/borrable | ✅ Resuelto |
| C4 | 🔴 | Sin tests ni CI | ✅ Resuelto |
| H1 | 🟠 | Filtros de inventario no se aplican | ✅ Resuelto |
| H2 | 🟠 | Contadores de bitácora en 0 | ✅ Resuelto |
| H3 | 🟠 | Bundle monolítico sin code-splitting | ✅ Resuelto |
| H4 | 🟠 | TypeScript no estricto | ✅ Resuelto |
| H5 | 🟠 | Edge Functions: HTTP 200 en errores | ✅ Resuelto |
| H6 | 🟠 | StaffPage god-component + fetch manual | ✅ Resuelto |
| H7 | 🟠 | Sin observabilidad | 🟡 ErrorBoundary ✅ · Sentry pendiente |
| H8 | 🟠 | Rol/ban no se reflejan sin recargar | ⏸️ Pendiente |
| H9 | 🟠 | `database.types.ts` a mano | ✅ Resuelto |
| M1 | 🟡 | Constraints de integridad faltantes | ✅ Resuelto |
| M2 | 🟡 | Visibilidad financiera inconsistente | ⏸️ Pendiente (nivel columna) |
| M3 | 🟡 | "Ventas Hoy" se infla al editar | ✅ Resuelto |
| M4 | 🟡 | Dashboard hace polling en vez de realtime | ⏸️ Pendiente (menor) |
| M5 | 🟡 | `alert()`/`confirm()` nativos | ✅ Resuelto |
| M6 | 🟡 | Authz de cambio de contraseña propia | ✅ Verificado seguro |
| M7 | 🟡 | Fuente Geist con subsets innecesarios | ➖ N/A (unicode-range ya lo evita) |
| M8 | 🟡 | Favicon de 48 KB | ✅ Resuelto |
| M9 | 🟡 | Sin Prettier ni pre-commit hooks | ⏸️ Pendiente |
| L1 | 🔵 | QueryClient sin defaults | ✅ Resuelto |
| L2 | 🔵 | vercel.json sin headers / falta .env.example | ✅ Resuelto |
| L3 | 🔵 | Stack en versiones "bleeding-edge" | ⏸️ Pendiente (fijar versiones) |
| L4 | 🔵 | Accesibilidad (aria-labels, lang, tabs) | ⏸️ Pendiente |
| L5 | 🔵 | Limpieza menor (tipos dup., colSpan) | 🟡 colSpan ✅ · resto pendiente |

## Pendiente

**Requiere tu participación:**
- **Sentry** — crear el proyecto y definir `VITE_SENTRY_DSN` (el hook ya está cableado).
- **Producto / datos** — fotos de prendas, cliente en apartados (nombre/contacto/vencimiento), y costo de prenda para calcular margen. Son huecos del modelo de datos que requieren decisión de negocio.

**Técnico, de menor prioridad (se puede hacer sin dependencias):**
- H8 · suscribir realtime al propio perfil (rol/ban en vivo).
- M2 · ocultar `price_sold` a roles no financieros a nivel de columna (vista o grants).
- M4 · Dashboard por suscripción realtime en vez de polling de 30 s.
- M9 · Prettier + husky/lint-staged; fijar `engines` de Node.
- L3 · fijar versiones exactas del stack y cadencia de actualización deliberada.
- L4 · accesibilidad (aria-labels, `lang="es"`, roles de tabs).
