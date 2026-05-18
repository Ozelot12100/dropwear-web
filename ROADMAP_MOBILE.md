# Plan de Optimización Mobile para DropWear 📱

Enfocado en potenciar la experiencia desde teléfonos móviles para el personal operativo, proponemos la siguiente hoja de ruta para el desarrollo futuro:

### 1. Soporte PWA (Progressive Web App)
- **Concepto:** Configurar un `manifest.json` y Service Workers para permitir que DropWear sea "instalable" en la pantalla de inicio de Android/iOS.
- **Beneficio:** Brinda una experiencia de aplicación nativa a pantalla completa, eliminando la barra del navegador y mejorando la percepción de rendimiento.

### 2. Lector de Códigos QR / Barras con la Cámara
- **Concepto:** Integrar un botón en la vista de inventario que active la cámara del dispositivo móvil para escanear etiquetas de la ropa.
- **Beneficio:** Agiliza masivamente la búsqueda de prendas, el ingreso de nuevo stock o la marca de un artículo como "Vendido".

### 3. Navegación Inferior (Bottom Tab Bar) — ✅ Implementado
- **Concepto:** Ocultar el menú superior (Hamburger Menu) en pantallas móviles y reemplazarlo por una barra de navegación inferior con iconos fijos (Dashboard, Inventario, Escáner, Perfil).
- **Estado Actual:** El componente `BottomNav.tsx` ya se integró exitosamente y se niveló con la autenticación RBAC para mostrar a los usuarios móviles las mismas 5 pestañas completas que en escritorio.
- **Beneficio:** Mejora enormemente la ergonomía, ya que los pulgares del usuario alcanzan las opciones principales sin esfuerzo.

### 4. Optimización de Formularios para Pantallas Táctiles — 🔄 En progreso
- **Concepto:** Actualizar los campos de formularios (`input`) y menús de opciones para aprovechar capacidades táctiles y teclados nativos.
- **Acciones:**
  - ✅ Reemplazar selectores de fecha complejos con **botones-píldora** rápidos amigables para pulgares (Implementado en `LogsPage` y filtros).
  - ✅ Utilizar componentes nativos inferiroes (Bottom `<Sheet>` de shadcn/ui) en vez de Modales flotantes para filtros avanzados.
  - ⏳ Usar `inputMode="decimal"` o `type="number"` para precios en la captura de ventas (despliega teclado numérico).
  - ⏳ Gestos de deslizar (Swipe) para eliminar o editar registros rápidos en el inventario.

### 5. Funcionalidad Pull-to-Refresh
- **Concepto:** Permitir que los usuarios "jalen" la pantalla hacia abajo en el Dashboard o el Inventario para forzar la recarga de la información con `TanStack Query`.
- **Beneficio:** Es el estándar moderno de la industria para refrescar datos en dispositivos táctiles.

### 6. Paneles Deslizables (Bottom Sheets) para Filtros — ✅ Implementado
- **Concepto:** Utilizar paneles inferiores/laterales optimizados para móviles en lugar de modales intrusivos para tareas densas como búsqueda cruzada.
- **Estado Actual:** Integrado exitosamente en **Inventario** y **Bitácora (Logs)** usando `<Sheet>` de shadcn/ui. Permite una interacción gestual y táctil muy fluida, acomodando comboboxes y píldoras dinámicas que no rompen el teclado de iOS/Android.
