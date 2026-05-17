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

* **Core:** React 18, empaquetado y servido por Vite.
* **Lenguaje:** TypeScript estricto (no se permite el uso de `any` para las iteraciones de la Base de Datos).
* **Estilos:** Tailwind CSS (v3) + Tailwind Merge y CLSX para manipulación dinámica de clases.
* **Componentes Base:** [shadcn/ui](https://ui.shadcn.com/) (Instalado y configurado con Radix UI).
* **Ruteo:** React Router DOM v6.
* **Gestor de Estado (Server-State):** TanStack React Query v5.
* **BaaS (Backend):** `@supabase/supabase-js` para Base de datos (PostgreSQL), Autenticación y WebSockets (Realtime).

---

## 3. Arquitectura del Directorio `src/`

Nuestra filosofía estructural se basa en la separación de responsabilidades:

```text
src/
├── assets/          # Imágenes estáticas y SVGs base.
├── components/      
│   ├── auth/        # Modales relacionadas con autenticación (PasswordChangeModal).
│   ├── inventory/   # Modales de operación de inventario (AddItemModal, TransactionModal).
│   ├── layout/      # Componentes estructurales (Navbar, PrivateRoute).
│   └── ui/          # Componentes base generados por shadcn/ui (Button, Input, Dialog…).
├── context/         
│   └── AuthContext.tsx # Contexto maestro (Autenticación y Perfil de Usuario/Rol).
├── hooks/           # Hooks personalizados reusables (ej. useAuth).
├── lib/             
│   ├── supabase.ts  # Inicialización del cliente Supabase fuertemente tipado.
│   └── utils.ts     # Helpers generales (función `cn` para Tailwind).
├── pages/           # Vistas enrutables (Login, InventoryPage, CatalogsPage, LogsPage, StaffPage).
├── services/        # Lógica exclusiva de acceso a datos (inventory.ts, users.ts, catalogs.ts).
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
- Filtros por estatus (`Todos`, `Disponible`, `Apartado`, `Vendido`) funcionales.

### 4.3 Modales de Inventario
- **`AddItemModal.tsx`:** Formulario para dar de alta prendas seleccionando producto del catálogo, talla y color. Todas las validaciones de campos están implementadas.
- **`TransactionModal.tsx`:** Actualización de estatus de artículos. Obliga a capturar el `price_sold` si el estatus es `vendido`. Deshabilita opciones de estatus que ya tenga el artículo.

### 4.4 Catálogos
- `CatalogsPage.tsx` con gestión de `brands` (Marcas) y `categories` (Categorías) y `products` (Productos maestros).

### 4.5 Bitácora de Operaciones
- `LogsPage.tsx` que consume `inventory_logs` mostrando la trazabilidad de cada movimiento (quién, cuándo, qué prenda, qué acción).

### 4.6 Gestión de Personal (StaffPage) — Superadmin Only
- Tabla de colaboradores con nombre, rol, fecha de ingreso e ID parcial.
- **Nuevo Colaborador:** Formulario con validación completa (nombre mín. 3 chars, email regex, contraseña con campo de confirmación). Éxito con feedback inline verde. Se resetea al cerrar.
- **Restablecer Contraseña:** Modal para cambiar la clave de cualquier colaborador. Incluye campo de confirmación de contraseña. Éxito con feedback inline (reemplazó `alert()`).
- **Banear / Desbloquear:** Botón por fila que invoca `toggle-user-status` Edge Function. Muestra badge rojo `BLOQUEADO` en colaboradores suspendidos. Protegido: no puede banearte a ti mismo.
- **Cambiar mi propia contraseña:** Disponible desde el menú desplegable del Navbar (`PasswordChangeModal.tsx`). Usa la Edge Function `reset-password` en lugar del cliente JS (workaround a bug de Supabase).

### 4.7 Validaciones de Formularios
Todas las modales aplican validación en **dos capas**: atributos HTML (UX inmediata) + lógica JavaScript (integridad antes de envío). Resumen:

| Modal | Validaciones clave |
|---|---|
| Cambiar mi contraseña | Mín. 6 chars · Confirmar coincidencia |
| Nuevo Colaborador | Nombre mín. 3 chars · Email regex · Contraseña mín. 6 · Confirmar coincidencia |
| Restablecer Contraseña | Mín. 6 chars · Confirmar coincidencia |
| Agregar Prenda | Producto requerido · Talla requerida · Color solo letras mín. 3 chars (regex con acentos/ñ) · Contador 0/30 |
| Actualizar Artículo | Estatus diferente al actual (opciones inhabilitadas en select) · Precio > 0 si vendido · Notas máx. 200 chars con contador |

---

## 5. Servicios (`src/services/`)

| Archivo | Métodos principales |
|---|---|
| `inventory.ts` | `getAllItems()`, `addItem()`, `updateItemStatus()` |
| `catalogs.ts` | `getProducts()`, `getBrands()`, `getCategories()`, `createProduct()`, etc. |
| `users.ts` | `getUsers()`, `createUser()`, `resetPassword()`, `toggleUserStatus()` |

Todos los métodos que requieren privilegios elevados invocan **Supabase Edge Functions** (nunca exponen `SERVICE_ROLE_KEY` en el cliente).

---

## 6. Backlog — Completados ✅

### 6.1 Vistas Condicionales según Rol (RBAC) — ✅ Implementado
- **Estado:** Se implementó el componente `<RoleGuard />` para proteger componentes individuales (como botones de "Agregar Prenda") y rutas completas en `App.tsx` (ej. `/staff`, `/catalogs`).

### 6.2 Diseño Mobile-First — ✅ Implementado
- **Estado:** Se mejoró `InventoryPage` incorporando el componente `<ItemCard />` que renderiza las prendas en tarjetas amigables para dispositivos móviles, dejando la `<Table />` estándar solo para desktop.

### 6.3 Dashboard / Resumen Ejecutivo — ✅ Implementado
- **Estado:** Se creó la página `DashboardPage.tsx` accesible en `/` que consume el nuevo servicio `dashboard.ts` para presentar métricas clave (disponibles, apartados, ventas de hoy, ingresos) y las últimas actividades (logs) de manera gráfica.

### 6.4 Página de Perfil de Usuario — ✅ Implementado
- **Estado:** Se desarrolló la ruta `/profile` con `ProfilePage.tsx` para permitir a los usuarios visualizar su rol, email y gestionar su contraseña en un apartado dedicado.

---

## 7. Lineamientos de Código para el Equipo

1. **Nunca realizar fetches dentro de `useEffect` directamente:** Usar siempre `useQuery` o `useMutation` de TanStack Query.
2. **Tipado de la base de datos:** Antes de declarar una `interface`, revisar `src/types/index.ts`. Usar los tipos derivados del backend.
3. **Evitar Código Espagueti:** Si una función hace peticiones a Supabase, debe vivir en `src/services/`. Un componente de React solo inyecta UI y dispara las funciones de servicio.
4. **Responsivo obligatorio:** Testear frecuentemente reduciendo el simulador del navegador a tamaños de iPhone 13 (390px).
5. **Nunca usar `alert()`:** Toda notificación de éxito o error debe ser un mensaje `inline` dentro del componente correspondiente, nunca un `alert()` nativo del navegador.
6. **Validación en dos capas:** Siempre añadir validación JS además de los atributos HTML (`required`, `minLength`, etc.). Los atributos HTML son bypasseables.

---

## 8. Siguientes Mejoras / Propuestas 💡

A partir de la retroalimentación del equipo, se proponen los siguientes puntos para el próximo ciclo de desarrollo:

### 8.1 Gestión y Cambio de Roles (Superadmin)
- **Concepto:** Que un `superadmin` pueda modificar el rol de cualquier otra cuenta existente desde la vista de `StaffPage`.
- **Análisis y Viabilidad:** Es una característica vital para la administración del equipo a largo plazo. Un `superadmin` definitivamente debe poder promover a alguien (ej. de `vendedor` a `socio`) o degradarlo, e incluso debería poder cambiar el rol de otro `superadmin` si este último dejara la empresa.
- **Regla de Seguridad Crítica:** Para evitar un "bloqueo accidental" (lockout), el sistema debe impedir que un `superadmin` se cambie el rol **a sí mismo**. Si necesitas dejar de ser superadmin, otro superadmin debe hacerlo por ti.
- **Implementación técnica:** Requerirá crear una nueva Edge Function (ej. `update-user-role`) ya que modificar roles involucra escalada de privilegios y debe ejecutarse del lado del servidor para evitar que usuarios malintencionados modifiquen su propio rol desde el cliente.

### 8.2 Edición del Nombre Completo en el Perfil
- **Concepto:** Permitir que los usuarios corrijan o actualicen su `full_name` (Nombre completo) desde la plataforma.
- **Análisis y Viabilidad:** Absolutamente necesario. Es un estándar de usabilidad que el usuario tenga control sobre su información de visualización.
- **Implementación técnica:** Se puede añadir fácilmente un modo de "Edición" en la recién creada `ProfilePage.tsx`. A diferencia de los roles o contraseñas, actualizar el propio nombre solo requiere hacer un `UPDATE` a la tabla `user_profiles`. Gracias a que tenemos RLS (Row Level Security) configurado, esto se puede hacer **directamente desde el cliente frontend** (sin Edge Function), ya que la base de datos permite que el usuario edite su propia fila.
