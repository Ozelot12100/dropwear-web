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
| H8 | 🟠 | Rol/ban no se reflejan sin recargar | ✅ Resuelto (revalida al foco; cierra sesión si bloquean) |
| H9 | 🟠 | `database.types.ts` a mano | ✅ Resuelto |
| M1 | 🟡 | Constraints de integridad faltantes | ✅ Resuelto |
| M2 | 🟡 | Visibilidad financiera inconsistente | ⏸️ Pendiente (nivel columna) |
| M3 | 🟡 | "Ventas Hoy" se infla al editar | ✅ Resuelto |
| M4 | 🟡 | Dashboard hace polling en vez de realtime | ✅ Resuelto (realtime sobre inventory_items) |
| M5 | 🟡 | `alert()`/`confirm()` nativos | ✅ Resuelto |
| M6 | 🟡 | Authz de cambio de contraseña propia | ✅ Verificado seguro |
| M7 | 🟡 | Fuente Geist con subsets innecesarios | ➖ N/A (unicode-range ya lo evita) |
| M8 | 🟡 | Favicon de 48 KB | ✅ Resuelto |
| M9 | 🟡 | Sin Prettier ni pre-commit hooks | ✅ Prettier + `engines` (husky opcional) |
| L1 | 🔵 | QueryClient sin defaults | ✅ Resuelto |
| L2 | 🔵 | vercel.json sin headers / falta .env.example | ✅ Resuelto |
| L3 | 🔵 | Stack en versiones "bleeding-edge" | ✅ `.npmrc` save-exact + `engines` (lockfile ya reproducible) |
| L4 | 🔵 | Accesibilidad (aria-labels, lang, tabs) | ✅ `lang="es"` + roles de tabs + focus visible |
| L5 | 🔵 | Limpieza menor (tipos dup., colSpan) | 🟡 colSpan ✅ · resto pendiente |

## Pendiente

**Requiere tu participación:**
- **Sentry** — crear el proyecto y definir `VITE_SENTRY_DSN` (el hook ya está cableado).
- **Costo de prenda para calcular margen** — hueco del modelo de datos; permitiría mostrar utilidad/margen (no solo ingresos). Requiere capturar el costo por producto. Pendiente de decisión.
- ✅ **Fotos de prendas** — implementado (bucket Storage + `image_url`).
- ✅ **Cliente en apartados** (nombre/contacto/vencimiento/anticipo) — implementado; los apartados vencidos se resaltan en Inventario y Dashboard.

**Técnico, aún pendiente:**
- M2 · ocultar `price_sold` a roles no financieros a **nivel de columna** (vista o grants en Postgres). Requiere una migración adicional a producción **y** refactor de las queries de inventario/bitácora para leer de una vista sin la columna; por eso se dejó aparte. Hoy la restricción es solo en la UI (`canSeeFinancial`).
- M9 (opcional) · husky + lint-staged para formateo pre-commit (se omitió para no interferir con el flujo de commits; Prettier ya está configurado).

**Resueltos en esta iteración:** H8 (revalidación del perfil al foco + cierre si bloquean), M4 (realtime en Dashboard), M9 (Prettier + `engines`), L3 (`.npmrc` save-exact + `engines`), L4 (`lang="es"`, roles ARIA en tabs, focus visible).

---

## Evaluación del stack tecnológico (5-jul-2026)

**Veredicto: el stack es el correcto para DropWear. No conviene migrar el núcleo** (React + Supabase + Vercel). Sería caro y sin beneficio real. Lo que conviene son ajustes, no migraciones.

**Por qué encaja:**
- **Supabase** (Postgres + Auth + Realtime + Edge Functions) — la mejor decisión: el dominio es relacional (productos → inventario → ventas → bitácora con integridad referencial), Realtime cubre el requisito de <300 ms, y Auth+RLS dan seguridad sin backend propio. Firebase (NoSQL) sería peor; un backend propio sería más trabajo y operación para el mismo resultado.
- **React + Vite + TypeScript** — estándar de industria, productivo, ecosistema enorme; TS estricto protege el código que maneja dinero.
- **TanStack Query + React Router + Tailwind + shadcn** — combinación moderna y sólida para una SPA.
- **Vercel** — hosting simple para SPA estática con auto-deploy.

**Ajustes recomendados (no migraciones):**
1. **Versiones bleeding-edge (riesgo real):** Vite 8, TS 6, ESLint 10, React 19, Base UI 1.x son muy nuevos; para un equipo chico en producción implica menos soluciones documentadas y más bugs de ecosistema (ya ocurrió con el `package-lock` Windows↔Linux en CI). → Fijar versiones exactas y una cadencia de actualización deliberada; bajar a estables (Vite 7, TS 5.x) si algo se rompe. (Ver hallazgo L3.)
2. **Planes gratis vs. negocio real:** para una tienda que factura, el free tier es frágil (Supabase pausa proyectos a los 7 días; Vercel Hobby prohíbe uso comercial). → **Supabase Pro (~$25/mes)** por los backups automáticos (crítico para datos de ventas); y **Vercel Pro** o mover el hosting a **Cloudflare Pages / Netlify** (la SPA es portátil).
3. **PWA, no app nativa:** el roadmap ya lo pide; es el camino correcto (instalable, offline parcial) sin reescribir nada.

**Cuándo reconsiderar (a futuro):** Next.js solo si se quiere una tienda pública con SEO; Expo/React Native solo si se necesita escáner de barras muy fluido o push nativo (reutilizaría React + Supabase).
