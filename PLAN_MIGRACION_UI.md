# Plan de migración de UI — DropWear → diseño Stitch

> ✅ **COMPLETADO (jul-2026) y en producción** (`dropwear.vercel.app`). Todas las pantallas (Login, Dashboard, Inventario, Catálogos, Bitácora, Personal, Perfil), la navegación y los modales ya usan el sistema Stitch. Este documento se conserva como registro del plan que se siguió. Los tokens viven en `src/index.css` + `tailwind.config.js`.

Plan paso a paso para migrar la interfaz al nuevo sistema de diseño de Stitch ("Herramienta operativa premium con alma de marca de ropa": base hueso/tinta, acento rojo del logo, Space Grotesk / Inter / JetBrains Mono). Referencia de diseño: el paquete de Stitch (`DESIGN.md` + pantallas) y `rediseno-ui-stitch-prompt.md`.

## Principios

1. **Re-skin, no reescritura.** Toda la lógica de React, rutas, datos, TanStack Query y Supabase **no se toca**. Solo cambia la capa visual (tokens + estilos de componentes).
2. **Paridad de funciones.** Cada pantalla migrada conserva exactamente el mismo comportamiento; la migración es puramente visual.
3. **Incremental y desplegable.** Cada fase/pantalla es un commit y un deploy independiente. La app funciona en todo momento.
4. **Verificable.** Tras cada paso: `build` + `typecheck` + `tests` + `lint` en verde (CI), y verificación visual en el deploy en vivo.

## Aprovechamos el theming por tokens

La app ya usa variables CSS de shadcn (`src/index.css`) mapeadas en `tailwind.config.js` (`bg-background`, `text-foreground`, `bg-primary`, `border-border`, etc.). **Cambiar los valores de esos tokens re-skinea automáticamente** todos los componentes que los usan. El trabajo manual queda para los componentes con clases "hardcodeadas" (`text-gray-900`, `bg-white`, `text-gray-500`…), que se migran pantalla por pantalla.

---

## Fase 0 — Fundamentos (tokens + tipografía)

Objetivo: cambiar la "piel" base sin tocar componentes. Al terminar, la app entera ya se ve hueso/tinta con tipografía nueva.

1. **Tipografía** — reemplazar Geist por las 3 fuentes (self-hosted vía `@fontsource`, no CDN):
   - `@fontsource-variable/inter` (cuerpo/UI), `@fontsource/space-grotesk` (títulos), `@fontsource-variable/jetbrains-mono` (números/precios/IDs).
   - En `src/index.css`: quitar el import de Geist, agregar los nuevos.
   - En `tailwind.config.js` → `theme.extend.fontFamily`: `sans: ['Inter Variable', ...]`, `heading/display: ['Space Grotesk', ...]`, `mono: ['JetBrains Mono Variable', ...]`.
2. **Paleta (variables CSS en `src/index.css :root`)** — mapear los tokens shadcn a los valores Stitch:

   | Token shadcn | Valor nuevo (Stitch) |
   |---|---|
   | `--background` | `#F7F7F5` (hueso) |
   | `--foreground` | `#0E0E10` (tinta) |
   | `--card` / `--popover` | `#FFFFFF` (blanco puro) |
   | `--primary` | `#0E0E10` (negro tinta) · `--primary-foreground` `#FFFFFF` |
   | `--secondary` / `--muted` | `#F4F4F2` · foreground `#47464A` |
   | `--border` / `--input` | `#E7E7E4` (hairline) |
   | `--ring` | `#E32130` (foco = acento rojo) |
   | `--destructive` | `#EF4444` |
   | `--radius` | `0.75rem` (12px para botones/inputs; tarjetas usan `rounded-2xl` = 16px) |

3. **Tokens nuevos en `tailwind.config.js`** (colores que shadcn no cubre):
   - `brand: '#E32130'` (rojo del logo; acento).
   - `status-available: '#10B981'`, `status-reserved: '#F59E0B'`, `status-sold: '#3B82F6'`, `status-returned: '#EF4444'`.
   - `hairline: '#E7E7E4'`, `bone: '#F7F7F5'`, `ink: '#0E0E10'`.
   - Sombra suave única: `shadow-soft: 0 4px 12px rgba(0,0,0,.03)`.
4. **Modo oscuro** — el diseño Stitch es solo claro ("bone"). Decisión: **desactivar dark mode por ahora** (simplifica) o dejarlo para una fase posterior. (Ver *Decisiones abiertas*.)
5. **Verificar**: build + revisar Login y Dashboard en vivo (ya deberían verse distintos solo con esto).

---

## Fase 1 — Componentes compartidos (primitivos del sistema)

Restilizar los componentes reutilizables para que TODO herede el look correcto. Feature-parity estricta.

- **Button** (`ui/button.tsx`): primary = negro sólido; outline = borde hairline + texto tinta; destructive = fondo rojo suave + texto `status-returned`; radio 12px; micro-feedback `active:scale-[.98]`.
- **StatusBadge** (nuevo, `ui/status-badge.tsx`): chip con **punto de color + etiqueta** por estatus (disponible/apartado/vendido/devuelto). Reutilizable en Inventario, Bitácora, Dashboard.
- **Badge** (`ui/badge.tsx`): pill; variante de rol.
- **Card** (`ui/card.tsx`): blanco, borde hairline, radio 16px, `shadow-soft`.
- **Input** (`ui/input.tsx`): radio 12px, borde hairline, anillo de foco en `brand` (rojo).
- **Money** (nuevo helper): número en `font-mono` tabular; verde cuando es venta/ingreso.
- **Navbar** (escritorio) y **BottomNav** (móvil): ya tienen la estructura correcta (logo, enlaces, avatar / tabs). Restilizar: logo en Space Grotesk, estado activo en negro tinta, iconos lucide (se mantienen).
- **Verificar** cada uno (build/tests) + visual.

---

## Fase 2 — Pantalla por pantalla (re-skin con paridad)

Orden pensado para fijar el estilo temprano y priorizar lo más usado. Cada pantalla = commit + deploy + verificación visual.

1. **Login** — tarjeta única sobre hueso, logo, botón negro ancho, nota de registro desactivado, crédito al pie.
2. **Dashboard (Resumen Ejecutivo)** — 4 tarjetas KPI con **barra de estatus lateral** de color, número grande en mono, ingresos en verde; feed "Últimas Actividades" con avatar + monto de color.
3. **Inventario** (móvil tarjetas + escritorio tabla) — chips de estatus con punto y contador, precios en mono (venta en verde), talla en chip mono, hueco para foto de prenda, skeleton/vacío.
4. **Modales de inventario** — Transacción, Agregar, Editar prenda.
5. **Catálogos** — pestañas Marcas/Categorías/Productos + `ConfirmDialog` ya migrado.
6. **Bitácora** — chips por acción con contador, tabla (escritorio) / tarjetas (móvil), sensación de registro inmutable.
7. **Personal (Staff)** — tabla de colaboradores, badges de rol, modales; ya usa TanStack Query.
8. **Mi Perfil** + modal de cambio de contraseña.

---

## Fase 3 — Fotos de prenda (dato + storage) — opcional/paralela

El diseño asume foto por prenda (resuelve un hueco de datos del informe). Requiere decisión de negocio + esquema:
1. Columna `image_url` en `products` (migración) — o en `inventory_items` si la foto es por pieza.
2. Bucket de Supabase Storage + subida en Agregar/Editar producto.
3. Mostrar la foto en tarjetas/tabla de inventario (con placeholder cuando falte).

---

## Verificación y rollout

- Tras cada paso: `npm run build` + `npm test` + `npm run lint` (gates del CI) y **verificación visual en el deploy** (Vercel auto-deploya cada push).
- Si algo se ve mal, se corrige en un commit pequeño antes de seguir.
- Nada de cambios de comportamiento durante el re-skin (si surge un bug, va aparte).

## Decisiones abiertas (a confirmar antes de implementar)

1. **Modo oscuro**: ¿lo desactivamos por ahora (el diseño Stitch es solo claro) o lo tematizamos también más adelante?
2. **Fotos de prenda (Fase 3)**: ¿entran en esta migración o van como track aparte? ¿la foto es por *producto* (modelo) o por *pieza física* (inventory_item)?
3. **Ritmo**: ¿pantalla por pantalla con deploy y tu visto bueno en cada una (recomendado), o migramos varias juntas?
