# DropWear - MVP Almacén Físico y Administrativo 👕📱

Bienvenido al repositorio de **DropWear**, una plataforma de punto de venta (POS) y gestión de inventario en tiempo real adaptada para operaciones en tienda física y entregas a domicilio en Puerto Peñasco, Sonora.

DropWear ha sido planeado, diseñado y construido utilizando React (TypeScript + Vite) en el frontend y Supabase (Postgres + Edge Functions) en el backend, priorizando siempre la estabilidad transaccional, trazabilidad de inventarios y una interfaz *Mobile-First*.

> **Estado (jul-2026):** en producción (`dropwear-web.vercel.app`). La UI está rediseñada al sistema **Stitch** (base hueso/tinta + tipografía Space Grotesk / Inter / JetBrains Mono; theming por tokens). Features vivas: inventario en tiempo real, catálogos con **foto de producto** y **costo/margen**, **apartados con cliente y vencimiento**, ventas con **método de pago** y **corte de caja (arqueo)**, bitácora, **control de gastos con utilidad neta**, panel de **analítica**, exportación **CSV**, gestión de personal y perfil (PWA instalable). Ver `AUDITORIA.md` para el estado de endurecimiento y pendientes.

---

## 📚 Índice de Documentación Técnica

Para que el próximo equipo de desarrollo o compañeros programadores puedan entender la estructura y el progreso del proyecto de manera impecable, la documentación ha sido dividida en los siguientes archivos clave que debes leer:

1. **[Arquitectura Frontend y Reglas de React](./DOCUMENTACION_FRONTEND.md)**
   Aprende cómo está estructurado el código de React, cuáles son los lineamientos del equipo (uso estricto de TanStack Query, nada de `any`), cómo funciona nuestra UI responsiva con `shadcn/ui` y qué modales/vistas ya están programadas al 100%.

2. **[Arquitectura Backend, Base de Datos y Edge Functions](./Documentación%20Técnica%20del%20Backend%20y%20Base%20de%20Datos%20-%20DropWear.md)**
   El corazón del proyecto. Aquí encontrarás el diagrama exacto de nuestras tablas en Postgres, cómo funciona el RBAC (Socio, Vendedor, Superadmin, etc.), cómo manejamos la sincronización Realtime (WebSockets) y el uso detallado de nuestras Edge Functions (Deno).

3. **[Hoja de Ruta (Lo que falta por construir)](./ROADMAP.md)**
   Conoce las funcionalidades futuras planeadas tanto para potenciar las ventas desde el celular (Pull to refresh, Swipe, escaner etc.) como las tareas gerenciales estratégicas desde PC (Cortes de caja, Analítica, Exportación a Excel).

4. **[Auditoría Técnica y Endurecimiento](./AUDITORIA.md)**
   Registro de la auditoría de seguridad, arquitectura, escalabilidad y calidad (5-jul-2026) y el estado de remediación de cada hallazgo. Léelo para entender qué se endureció (RLS por rol, operaciones atómicas, tests + CI, etc.) y qué queda pendiente.

---

## 🚀 Inicio Rápido (Quick Start)

### Requisitos Previos
* Node.js v20+ (requerido por Vite 8)
* Gestor de paquetes `npm` o `pnpm`
* CLI de Supabase instalado (opcional, pero recomendado para desplegar Edge Functions)

### Instalación

1. Clona el repositorio:
   ```bash
   git clone https://github.com/Ozelot12100/dropwear-web.git
   cd dropwear-web
   ```

2. Instala las dependencias:
   ```bash
   npm install
   ```

3. Variables de Entorno:
   Crea un archivo `.env.local` en la raíz (agrega lo siguiente y solicita los accesos de Supabase al administrador que tiene el control de la organización):
   ```env
   VITE_SUPABASE_URL=tu_url_aqui
   VITE_SUPABASE_ANON_KEY=tu_llave_anonima_aqui
   ```

4. Levanta el entorno de local:
   ```bash
   npm run dev
   ```

---

## 🛠 Comandos Útiles para el Nuevo Equipo

* **`npm run build`**: Compila el proyecto verificando estrictamente los tipos de TypeScript. Si hay errores (que no los hay actualmente), el CI detendrá el despliegue a Producción (Vercel).
* **`npm run lint`** / **`npm run format`**: ESLint y Prettier. Correr antes de commitear cambios grandes.
* **`npm run test`**: Ejecuta la suite de Vitest.
* **Despliegue de Edge Functions:** Cuando modifiquen una función en `supabase/functions/`, deben subirla con `supabase functions deploy <nombre_funcion> --no-verify-jwt`.
* **Migraciones de BD:** el esquema vive en `supabase/migrations/` (versionado). Nota de infra: desde algunos entornos el pooler/`supabase db push` no conecta; en ese caso se aplican vía la Management API de Supabase.

¡Mucho éxito con la continuación del proyecto! Revisar los documentos listados arriba garantiza dominar todo el ecosistema de DropWear sin fisuras.
