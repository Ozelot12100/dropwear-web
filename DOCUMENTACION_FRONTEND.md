# Arquitectura y Estado del Frontend - DropWear MVP

Bienvenido al equipo. Este documento detalla la arquitectura, decisiones de diseño, estado actual y hoja de ruta del frontend para el MVP de **DropWear**, nuestra plataforma de gestión de inventario en tiempo real adaptada para las operaciones de nuestra sucursal física en Puerto Peñasco.

Este documento es tu punto de partida para entender cómo está configurado el cliente web y cuáles son los estándares de código esperados. La documentación del backend y la base de datos vive en el archivo `Documentación Técnica del Backend y Base de Datos - DropWear.md`.

---

## 1. Visión y Objetivos del MVP

Nuestra necesidad principal tecnológica es eliminar la fricción en la sincronización del almacén físico. Los socios y vendedores operan el piso de venta y hacen entregas a domicilio usando sus teléfonos celulares.

* **El Objetivo principal:** Sincronización en tiempo real. Cuando una prenda física cambia su estado de "disponible" a "vendido" o "apartado" por el _Socio A_, el _Socio B_ debe ver ese cambio reflejado en pantalla en menos de 300ms sin recargar la página.
* **Trazabilidad:** Cualquier cambio de estado monetario debe quedar registrado inmutablemente y vinculado al ID de la persona que operó la caja/entregó la prenda.
* **Mobile-First:** La interfaz debe ser sumamente rápida y los botones lo suficientemente accesibles para ser operada a una sola mano en movimiento.

---

## 2. Stack Tecnológico (Frontend)

* **Core:** React 19, empaquetado y servido por Vite.
* **Lenguaje:** TypeScript estricto (no se permite el uso de `any` para las iteraciones de la Base de Datos).
* **Estilos:** Tailwind CSS (v3) + Tailwind Merge y CLSX para manipulación dinámica de clases.
* **Sistema de diseño (Stitch):** la UI se rediseñó por completo (jul-2026) al sistema **"herramienta operativa premium con alma de marca de ropa"**: base **hueso/tinta**, acento rojo de marca (`#E32130`) y sistema de estatus semántico (Disponible=verde, Apartado=ámbar, Vendido=azul, Devuelto=rojo). El theming es **por tokens** (variables CSS en `src/index.css` mapeadas en `tailwind.config.js`: `bg-background`, `text-ink`, `border-hairline`, `bg-brand`, `bg-status-*`). Tipografía self-hosted vía `@fontsource`: **Inter** (cuerpo/UI, `font-sans`), **Space Grotesk** (títulos, `font-heading`), **JetBrains Mono** (números/precios/IDs, `font-mono`). Detalle en `PLAN_MIGRACION_UI.md`.
* **Componentes Base:** primitivos de [shadcn/ui](https://ui.shadcn.com/) sobre Base UI (`@base-ui/react`), re-skineados con los tokens Stitch (Button, Input, Dialog, Sheet, Table, Select, Badge…).
* **Ruteo:** React Router DOM v7.
* **Gestor de Estado (Server-State):** TanStack React Query v5.
* **BaaS (Backend):** `@supabase/supabase-js` para Base de datos (PostgreSQL), Autenticación, Storage (fotos) y WebSockets (Realtime).
* **Formato:** Prettier (`npm run format`); `.npmrc` con `save-exact=true` fija versiones exactas a futuro.

---

## 3. Arquitectura del Directorio `src/`

Nuestra filosofía estructural se basa en la separación de responsabilidades:

```text
src/
├── assets/          # Imágenes estáticas y SVGs base.
├── components/      
│   ├── auth/        # Modales relacionadas con autenticación (PasswordChangeModal).
│   ├── dashboard/   # Panel de analítica del negocio (BusinessAnalytics).
│   ├── inventory/   # Modales de inventario (AddItemModal, EditItemModal, TransactionModal).
│   ├── layout/      # Componentes estructurales (Navbar, BottomNav, PrivateRoute, RoleGuard).
│   └── ui/          # Componentes base generados por shadcn/ui (Button, Input, Dialog…).
├── context/         
│   └── AuthContext.tsx # Contexto maestro (Autenticación y Perfil de Usuario/Rol).
├── hooks/           # Hooks personalizados reusables (ej. useAuth).
├── lib/             
│   ├── supabase.ts  # Inicialización del cliente Supabase fuertemente tipado.
│   ├── csv.ts       # Exportación a CSV (BOM UTF-8, sin dependencias).
│   ├── monitoring.ts# Punto único de reporte de errores (Sentry-ready).
│   └── utils.ts     # Helpers generales (función `cn` para Tailwind).
├── pages/           # Vistas enrutables (Login, DashboardPage, InventoryPage, CatalogsPage, LogsPage, ExpensesPage, StaffPage, ProfilePage).
├── services/        # Acceso a datos (inventory, catalogs, dashboard, analytics, logs, expenses, users).
└── types/           
    ├── database.types.ts  # Tipos autogenerados, reflejo exacto del esquema de PostgreSQL.
    └── index.ts     # Interfaces derivadas y consolidación de tipos limpios.
```

---

## 4. Estado Actual — Lo que ya está implementado ✅

### 4.1 Infraestructura y Autenticación
- **Andamiaje y Tipado:** Sistema inicializado y blindado por `src/types/database.types.ts`. Cada consulta infiere exactamente las columnas de Postgres.
- **Autenticación Base y RBAC:** `AuthContext` consume `supabase.auth` y cruza con `user_profiles` para guardar el rol exacto (`superadmin`, `socio`, `vendedor`, `repartidor`, `contador`) en el contexto de React.
- **Protección de Rutas:** `PrivateRoute.tsx` bloquea el acceso a usuarios no autenticados y expone el `Navbar` unificado.

### 4.2 Inventario en Tiempo Real
- `InventoryPage.tsx` consume `inventoryService.getAllItems()` via React Query.
- Integra `supabase.channel()` que escucha eventos Postgres; al detectar un cambio de estado invalida la caché de React Query y re-renderiza la lista sin recargar el navegador.
- **Filtros de Acceso Rápido:** Píldoras (Pills) con scroll horizontal para filtrar por estatus (`Todos`, `Disponible`, `Apartado`, `Vendido`, etc.).
- **Filtros Avanzados (Sheet UI):** Menú lateral/inferior para búsquedas complejas. Genera dinámicamente las opciones disponibles de `Marca`, `Categoría` y `Talla` basado en el stock actual. UI optimizada para pantallas táctiles (uso del componente `<Sheet>` y botones-píldora para las tallas).
- **Acciones masivas (multi-selección):** el botón **"Seleccionar"** activa casillas en tarjetas (móvil) y tabla (escritorio) + "seleccionar todo lo visible". Una barra fija muestra el conteo y dos acciones en lote: **Regresar a stock** (→ disponible) y **Vender (remate)** (marca disponibles como vendidas a un mismo precio). Cada ítem pasa por la RPC atómica `change_item_status` (con log); se reportan aplicadas/omitidas. Por diseño **no hay borrado en lote** (evita cascada sobre la bitácora inmutable).

### 4.3 Modales de Inventario
- **`AddItemModal.tsx`:** Formulario para dar de alta prendas seleccionando producto del catálogo, talla y color. Todas las validaciones de campos están implementadas.
- **`TransactionModal.tsx`:** Actualización de estatus de artículos vía la RPC atómica `change_item_status`. El nuevo estatus se elige en una **rejilla 2×2 de tarjetas** (punto de color por estado). Obliga a capturar el `price_sold` si es `vendido`. Si es **`apartado`**, captura los datos del cliente (nombre\*, teléfono, fecha de vencimiento\* con default +7 días, anticipo). Deshabilita el estatus actual.
- **`EditItemModal.tsx`:** Modal de modificación para corregir errores de dedo. Permite editar el producto, color y talla de un artículo específico, dejando rastro de la modificación en la bitácora ("actualizacion_estado").

### 4.4 Catálogos
- `CatalogsPage.tsx` con gestión de `brands` (Marcas), `categories` (Categorías) y `products` (Productos maestros), en pestañas.
- **Foto de producto:** el modal de producto permite **subir imagen** (a Storage `product-images` vía `catalogService.uploadProductImage`) con vista previa; la miniatura aparece en la tabla de Catálogos y en las tarjetas de Inventario.

### 4.5 Bitácora de Operaciones
- `LogsPage.tsx` que consume `inventory_logs` mostrando la trazabilidad de cada movimiento (quién, cuándo, qué prenda, qué acción).
- **Filtros Avanzados (Sheet UI):** Menú lateral para filtrar la bitácora por un **Operador** en específico (generado dinámicamente según los usuarios que hayan registrado operaciones) y por **Rango de Tiempo** rápido (Hoy, Ayer, Esta Semana, Este Mes) utilizando `date-fns`.

### 4.6 Control de Gastos (ExpensesPage) — Roles Financieros
- `ExpensesPage.tsx` (ruta `/expenses`, protegida por `RoleGuard` a `superadmin`/`socio`/`contador`) para registrar egresos operativos y ver la **utilidad neta real**.
- **Resumen mensual** con navegación por mes (‹ ›): 4 tiles KPI — Ingresos, Costo de venta, Gastos y **Utilidad Neta** (destacada, con margen neto %). Fórmula: `ingresos − COGS − gastos`; los ingresos/COGS salen de la bitácora de ventas (`inventory_logs`) y el costo actual del producto, vía `expenseService.getMonthlyFinancials`.
- **CRUD de gastos** (registrar/editar/borrar solo `socio`/`superadmin`; `contador` lo ve en solo lectura): monto con teclado numérico (`inputMode="decimal"`), categoría, fecha y descripción. Lista en **tarjetas** (móvil) y **tabla** (escritorio) con pill de categoría y autor.
- **Exportar CSV** del mes (respeta el mes en vista), vía `src/lib/csv.ts`.

### 4.7 Gestión de Personal (StaffPage) — Superadmin Only
- Tabla de colaboradores con nombre, rol, fecha de ingreso e ID parcial.
- **Nuevo Colaborador:** Formulario con validación completa (nombre mín. 3 chars, email regex, contraseña con campo de confirmación). Éxito con feedback inline verde. Se resetea al cerrar.
- **Restablecer Contraseña:** Modal para cambiar la clave de cualquier colaborador. Incluye campo de confirmación de contraseña. Éxito con feedback inline (reemplazó `alert()`).
- **Banear / Desbloquear:** Botón por fila que invoca `toggle-user-status` Edge Function. Muestra badge rojo `BLOQUEADO` en colaboradores suspendidos. Protegido: no puede banearte a ti mismo.
- **Cambiar mi propia contraseña:** Disponible desde el menú desplegable del Navbar (`PasswordChangeModal.tsx`). Usa la Edge Function `reset-password` en lugar del cliente JS (workaround a bug de Supabase).

### 4.8 Validaciones de Formularios
Todas las modales aplican validación en **dos capas**: atributos HTML (UX inmediata) + lógica JavaScript (integridad antes de envío). Resumen:

| Modal | Validaciones clave |
|---|---|
| Cambiar mi contraseña | Mín. 6 chars · Confirmar coincidencia |
| Nuevo Colaborador | Nombre mín. 3 chars · Email regex · Contraseña mín. 6 · Confirmar coincidencia |
| Restablecer Contraseña | Mín. 6 chars · Confirmar coincidencia |
| Agregar Prenda | Producto requerido · Talla requerida · Color solo letras mín. 3 chars (regex con acentos/ñ) · Contador 0/30 |
| Actualizar Artículo | Estatus diferente al actual (opciones inhabilitadas en select) · Precio > 0 si vendido · Notas máx. 200 chars con contador |

### 4.9 Comportamiento y Bugs Específicos Móviles (Mobile Caveats)
La experiencia puramente móvil y PWA acarrea limitaciones de navegador que hemos mitigado:

1. **Autocorrección Móvil:** Los teclados de iOS/Android insertan un espacio final en los campos `.email`. Fue mitigado con auto-recortes (`.trim()`) en el payload de acceso.
2. **Supabase "Web Lock Deadlock":** Supabase usa `navigator.locks` subyacentes. En pestañas en modo _Incógnito_ o en Safari, si se recarga la pestaña (`window.location.href`) durante validación asíncrona, el navegador nunca suelta el lock internamente, bloqueando el estado y congelando el login. Se resolvió delegando las transiciones suavemente con React Router y desusando redrecciones forzadas (hard-redirects) tras `signInWithPassword`.
3. **Pausado de Eventos (Google App WebView):** Al estar la PWA o visor de web dentro de la aplicación de Google, el sistema silencia los eventos en background (`onAuthStateChange` de Supabase nunca se dispara). Se solucionó inyectando **un hard navigate** programado con React Router con `500ms` de retraso como plan alternativo de seguridad tras ganar la sesión.

### 4.10 Features de negocio y mejoras recientes ✅
- **Fotos de producto:** subida a Storage `product-images` desde el modal de Catálogos; miniatura en Catálogos e Inventario (móvil).
- **Apartados con cliente:** al apartar se registra cliente, teléfono, vencimiento y anticipo (RPC `change_item_status`). Inventario muestra "🔖 cliente · vence …" y **resalta los vencidos**; el Dashboard marca cuántos apartados están vencidos. El histórico queda embebido en la nota del log (Bitácora).
- **Costo y margen:** el modal de Catálogos captura el `cost` por producto; la tabla muestra Costo y Margen esperado. El Dashboard muestra **"Utilidad Hoy"** (ingresos − costo) como sub-nota de Ingresos, **solo a roles financieros** (superadmin/socio/contador).
- **Dashboard en tiempo real (M4):** dejó el polling de 30 s; ahora se suscribe a `inventory_items` e invalida `dashboardStats`/`recentActivity`/`businessAnalytics` en vivo.
- **Panel de Analítica en el Dashboard:** sección **"Análisis del Negocio"** (`components/dashboard/BusinessAnalytics.tsx`, solo roles financieros) con gráficas propias **sin dependencias** (CSS): tendencia de **6 meses** (ingresos + utilidad neta por mes) y **top 5 productos** del mes. Servicio `analytics.ts`; se refresca en tiempo real con las ventas. (Roadmap 2.2 ✅)
- **Vistas móviles con tarjetas:** además de Inventario, **Bitácora** y **Personal** tienen vista de tarjetas en móvil (tabla solo en escritorio).
- **Revalidación de perfil (H8):** `AuthContext` re-verifica el perfil al recuperar el foco de la pestaña; si un admin bloquea la cuenta (`is_active=false`) cierra la sesión sin recargar.
- **Accesibilidad (L4):** `lang="es"`, roles ARIA en pestañas, foco visible.

---

## 5. Servicios (`src/services/`)

| Archivo | Métodos principales |
|---|---|
| `inventory.ts` | `getAllItems()`, `addItem()`, `updateItemStatus()` (incluye datos de apartado), `updateItemDetails()` |
| `catalogs.ts` | `getProducts/Brands/Categories()`, CRUD de cada uno, `uploadProductImage()` |
| `dashboard.ts` | `getDashboardStats()` (disponibles, apartados, vencidos, ventas/ingresos de hoy), `getRecentActivity()` |
| `logs.ts` | `getLogs()` (bitácora con relaciones) |
| `expenses.ts` | `getExpenses()`, `getMonthlyFinancials()` (ingresos − COGS − gastos), `createExpense/updateExpense/deleteExpense()` |
| `analytics.ts` | `getBusinessAnalytics()` (tendencia 6 meses + top productos, para el panel del Dashboard) |
| `users.ts` | `getUsers()`, `createUser()`, `resetPassword()`, `toggleUserStatus()`, `updateUserRole()`, `updateProfileName()` |

Los métodos de escritura de inventario usan **RPCs atómicas** de Postgres; los que requieren privilegios elevados invocan **Supabase Edge Functions** (nunca exponen `SERVICE_ROLE_KEY` en el cliente).

---

## 6. Backlog — Completados ✅

### 6.1 Vistas Condicionales según Rol (RBAC) — ✅ Implementado
- **Estado:** Se implementó el componente `<RoleGuard />` para proteger componentes individuales (como botones de "Agregar Prenda") y rutas completas en `App.tsx` (ej. `/staff`, `/catalogs`).

### 6.2 Diseño Mobile-First — ✅ Implementado
- **Estado:** Se mejoró `InventoryPage` incorporando el componente `<ItemCard />` que renderiza las prendas en tarjetas amigables para dispositivos móviles, dejando la `<Table />` estándar solo para desktop.

### 6.3 Dashboard / Resumen Ejecutivo — ✅ Implementado
- **Estado:** Se creó la página `DashboardPage.tsx` accesible en `/` que consume el servicio `dashboard.ts` para presentar métricas clave (disponibles, apartados, vencidos, ventas/ingresos de hoy) y las últimas actividades (logs). Para **roles financieros** incluye además el panel **"Análisis del Negocio"** (`BusinessAnalytics`): tendencia de 6 meses y top de productos (ver §4.10).

### 6.4 Página de Perfil de Usuario — ✅ Implementado
- **Estado:** Se desarrolló la ruta `/profile` con `ProfilePage.tsx` para permitir a los usuarios visualizar su rol, email y gestionar su contraseña en un apartado dedicado.

### 6.5 Gestión y Cambio de Roles (Superadmin) — ✅ Implementado
- **Estado:** Se añadió la funcionalidad para que un `superadmin` modifique el rol de cualquier otra cuenta desde `StaffPage`.
- **Detalle de Seguridad:** Se creó la Edge Function `update-user-role`. El sistema bloquea explícitamente que un `superadmin` cambie su propio rol para evitar la pérdida de acceso accidental (lockout).

### 6.6 Edición del Nombre Completo en el Perfil — ✅ Implementado
- **Estado:** Se agregó el modo edición en `ProfilePage.tsx` permitiendo al usuario cambiar su nombre.
- **Detalle de Seguridad:** Debido a bloqueos por la política RLS en `user_profiles`, se implementó a través de la nueva Edge Function `update-profile-name` para asegurar la correcta escritura y evasión segura del RLS.

---

## 7. Lineamientos de Código para el Equipo

1. **Nunca realizar fetches dentro de `useEffect` directamente:** Usar siempre `useQuery` o `useMutation` de TanStack Query. (Excepción legítima: montar/desmontar **suscripciones realtime** de Supabase con `supabase.channel(...)` sí vive en un `useEffect` que invalida la caché de React Query.)
2. **Tipado de la base de datos:** Antes de declarar una `interface`, revisar `src/types/index.ts`. Usar los tipos derivados del backend.
3. **Evitar Código Espagueti:** Si una función hace peticiones a Supabase, debe vivir en `src/services/`. Un componente de React solo inyecta UI y dispara las funciones de servicio.
4. **Responsivo obligatorio:** Testear frecuentemente reduciendo el simulador del navegador a tamaños de iPhone 13 (390px).
5. **Nunca usar `alert()`:** Toda notificación de éxito o error debe ser un mensaje `inline` dentro del componente correspondiente, nunca un `alert()` nativo del navegador.
6. **Validación en dos capas:** Siempre añadir validación JS además de los atributos HTML (`required`, `minLength`, etc.). Los atributos HTML son bypasseables.

---


