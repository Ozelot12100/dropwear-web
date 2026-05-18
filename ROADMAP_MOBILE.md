# Plan de Optimización Mobile para DropWear 📱

Enfocado en potenciar la experiencia desde teléfonos móviles para el personal operativo, proponemos la siguiente hoja de ruta para el desarrollo futuro:

### 1. Soporte PWA (Progressive Web App)
- **Concepto:** Configurar un `manifest.json` y Service Workers para permitir que DropWear sea "instalable" en la pantalla de inicio de Android/iOS.
- **Beneficio:** Brinda una experiencia de aplicación nativa a pantalla completa, eliminando la barra del navegador y mejorando la percepción de rendimiento.

### 2. Lector de Códigos QR / Barras con la Cámara
- **Concepto:** Integrar un botón en la vista de inventario que active la cámara del dispositivo móvil para escanear etiquetas de la ropa.
- **Beneficio:** Agiliza masivamente la búsqueda de prendas, el ingreso de nuevo stock o la marca de un artículo como "Vendido".

### 3. Navegación Inferior (Bottom Tab Bar) — ✅ Parcialmente Implementado
- **Concepto:** Ocultar el menú superior (Hamburger Menu) en pantallas móviles y reemplazarlo por una barra de navegación inferior con iconos fijos (Dashboard, Inventario, Escáner, Perfil).
- **Estado Actual:** El componente `BottomNav.tsx` ya se integró exitosamente y se niveló con la autenticación RBAC para mostrar a los usuarios móviles las mismas 5 pestañas completas que en escritorio.
- **Beneficio:** Mejora enormemente la ergonomía, ya que los pulgares del usuario alcanzan las opciones principales sin esfuerzo.

### 4. Optimización de Formularios para Pantallas Táctiles
- **Concepto:** Actualizar los campos de formularios (`input`) para aprovechar los teclados nativos móviles.
- **Acciones:**
  - Usar `inputMode="decimal"` o `type="number"` para precios (despliega teclado numérico).
  - Componentes nativos o adaptados de `shadcn/ui` para la selección de fechas (calendario mobile-friendly).
  - Gestos de deslizar (Swipe) para eliminar o editar registros rápidos en el inventario.

### 5. Funcionalidad Pull-to-Refresh
- **Concepto:** Permitir que los usuarios "jalen" la pantalla hacia abajo en el Dashboard o el Inventario para forzar la recarga de la información con `TanStack Query`.
- **Beneficio:** Es el estándar moderno de la industria para refrescar datos en dispositivos táctiles.
