# Arquitectura y Roadmap del Frontend - DropWear MVP

Bienvenido al equipo. Este documento detalla la arquitectura, decisiones de diseño, estado actual y hoja de ruta del frontend para el MVP de **DropWear**, nuestra plataforma de gestión de inventario en tiempo real adaptada para las operaciones de nuestra sucursal física en Puerto Peñasco.

Este documento será tu punto de partida para entender cómo está configurado el cliente web y cuáles son los estándares de código esperados antes de hacer tu primer Pull Request.

---

## 1. Visión y Objetivos del MVP
Nuestra necesidad principal tecnológica es eliminar la fricción en la sincronización del almacén físico. Los socios y vendedores operan el piso de venta y hacen entregas a domicilio usando sus teléfonos celulares.

* **El Objetivo principal:** Sincronización en tiempo real. Cuando una prenda física cambia su estado de "disponible" a "vendido" o "apartado" por el _Socio A_, el _Socio B_ debe ver ese cambio reflejado en pantalla en menos de 300ms sin recargar la página.
* **Trazabilidad:** Cualquier cambio de estado monetario debe quedar registrado inmutablemente y vinculado al ID de la persona que operó la caja/entregó la prenda.
* **Mobile-First:** La interfaz debe ser sumamente rápida y los botones lo suficientemente accesibles para ser operada a una sola mano en movimiento.

---

## 2. Stack Tecnológico (Frontend)
Para lograr la reactividad y compatibilidad, estamos usando la siguiente pila tecnológica montada y configurada:

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
│   ├── layout/      # Componentes estructurales (Navbar, PrivateRoute, Sidebar).
│   └── ui/          # Componentes tontos generados por shadcn/ui.
├── context/         
│   └── AuthContext.tsx # Contexto maestro (Autenticación y Perfil de Usuario/Rol).
├── hooks/           # Hooks personalizados reusables (ej. useAuth).
├── lib/             
│   ├── supabase.ts  # Inicialización del cliente Supabase fuertemente tipado.
│   └── utils.ts     # Helpers generales (ejemplo: función `cn` para Tailwind).
├── pages/           # Vistas enrutables a nivel de página (Login, Dashboard, etc).
├── services/        # Archivos que contienen exclusivamente lógica de acceso a datos (fetches, inserts).
└── types/           
    ├── database.types.ts  # Tipos autogenerados, reflejo exacto del esquema de PostgreSQL.
    └── index.ts     # Interfaces derivadas y consolidación de tipos limpios.
```

---

## 4. Estado Actual (Lo que ya tenemos implementado ✅)

1. **Andamiaje y Tipado:** El sistema fue inicializado y está blindado por `src/types/database.types.ts`. Cada consulta infiere exactamente las columnas que tenemos en Postgres.
2. **Autenticación Base y RBAC:** Ya existe el `AuthContext`. Usamos `supabase.auth`, pero además cruzamos la autenticación de sesión con la tabla `user_profiles` para guardar localmente en el contexto de React el rol exacto de la persona (`vendedor`, `socio`, `repartidor`).
3. **Protección de Rutas:** El componente `PrivateRoute.tsx` envuelve la app y evita intrusos, exponiendo un `Navbar` unificado. Ya está montado sobre un `<BrowserRouter>`.
4. **Dashboard y Modo Tiempo Real:**
   - La página `Dashboard.tsx` ya se conecta vía `inventoryService.getAllItems()` usando **React Query**.
   - Integra la escucha `supabase.channel()` que intercepta eventos Postgres; al detectar un cambio de estado en el inventario de otra sucursal, manda un evento a React Query para invalidar la caché e hidratar la lista reactivamente sin romper el DOM.

---

## 5. Hoja de Ruta y Tareas Pendientes (El Backlog 🚀)

Esta es su área de trabajo. Los siguientes son los módulos indispensables requeridos para la conclusión del MVP que nos faltan desarrollar:

### 1. UX/UI Transaccional de Inventario (Prioridad Alta)
- **Necesidad:** En este momento, el `Dashboard.tsx` solo lee la tabla. Necesitamos la interfaz para mutar.
- **Desarrollo:** Diseñar un Modal (`Dialog` o `Sheet` de shadcn) que se levante al dar click sobre una fila.
- **Regla de negocio:** Si un socio cambia el estatus de `"disponible"` a `"vendido"`, el frontend debe **obligatoriamente** renderizar un `Input` numérico exigiendo el **Precio Cobrado** (`price_sold`), pasarlo como parámetro al backend (ya existe el método `updateItemStatus` en el service) para guardar el log.

### 2. Panel de CRUD Base (Catálogos)
- **Necesidad:** Interfaz gráfica para que los administradores puedan dar de alta elementos nuevos (Prendas).
- **Desarrollo:** 
  - Vista para Crear, Editar y Eliminar de las tablas `brands` (Marcas) y `categories`.
  - Vista de alta de `products` (Catálogo maestro, ej. Playera Azul, Precio Base $300).
  - Formulario logístico para inyectar a `inventory_items`: "Dar de alta 3 sudaderas talla L al almacén" basado en un producto seleccionado.

### 3. Vistas Condicionales según Role (RBAC)
- **Necesidad:** Un "Repartidor" solo debe tener acceso de lectura, mientras que el "Socio" edita todo.
- **Desarrollo:** Desarrollar un Wrapper (ej. `<RoleGuard allowed={['socio', 'superadmin']}>`) que permita esconder botones de "Editar" u ocultar rutas completas en `App.tsx` basándose en el campo `profile.role` extraído de nuestro hook `useAuth()`.

### 4. Visor del Historial Operativo (Auditoría)
- **Necesidad:** Necesitamos una visión clara de trazabilidad para el contador y los socios.
- **Desarrollo:** Crear una vista de "Bitácora" u "Operaciones". Consumirá directamente datos de la tabla relacional `inventory_logs` mostrando qué prenda se movió por qué usuario y si hubo algún estatus de "devolución".

---

## 6. Lineamientos Generales de Código para el Equipo
1. **Nunca realizar fetchings dentro de useEffect directamente:** Usen siempre `useQuery` de o `useMutation` TanStack Query.
2. **Tipado de la base de datos:** Antes de declarar `interface MisDatos`, revisen si ya existe en `src/types/index.ts`. Usen los tipos derivativos autogenerados del backend (`import type { Product, InventoryItem } from '@/types'`).
3. **Evitar Código Espagueti:** Si una función engloba peticiones a la BD de Supabase, debe escribirse separadamente dentro de la carpeta `src/services/`. Un componente de React solo debe inyectar UI y dispararlas.
4. **El secreto es Responsivo:** Testeen frecuentemente la aplicación reduciendo el simulador del navegador a tamaños de iPhone 13. Las tablas de datos deben permitir "overflow-x" o transformarse en vistas de tarjetas apilables.

**¡Manos a la obra, el stack está 100% configurado para correr e instalar componentes nuevos!**
