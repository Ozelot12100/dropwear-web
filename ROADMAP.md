# Roadmap de Desarrollo: DropWear (Móvil y Administración) 🚀

Este documento detalla las funcionalidades pendientes para mejorar la experiencia operativa en dispositivos móviles, así como nuevas herramientas para la administración integral del negocio tanto en PC como en móvil.

## 1. Experiencia Móvil y Operativa 📱

### 1.1 Soporte PWA (Progressive Web App) — 🟡 Parcial (instalable)
- **Hecho:** `manifest.webmanifest` + iconos (192/512/maskable + apple-touch) + metas de iOS. **Ya se puede instalar** DropWear en la pantalla de inicio de Android/iOS a pantalla completa (display `standalone`), con splash hueso y barra en tinta.
- **Pendiente (deliberado):** **Service Worker / offline.** Se omitió por ahora porque un SW mal configurado puede dejar a los usuarios con versiones cacheadas rotas en una app de negocio en vivo. Si se quiere offline, agregarlo con `vite-plugin-pwa` (`registerType: 'autoUpdate'`) para evitar el problema de caché obsoleta.

### 1.2 Lector de Códigos QR / Barras
- **Concepto:** Integrar la cámara del celular en la vista de inventario.
- **Beneficio:** Agiliza masivamente la búsqueda de prendas, el ingreso de nuevo stock o la marca rápida de un artículo como "Vendido" / "Apartado".

### 1.3 Perfeccionamiento de Formularios Táctiles
- **Pendiente:** Usar `inputMode="decimal"` o `type="number"` en los campos de precio y costo (despliega teclado numérico nativo al vender).
- **Pendiente:** Integrar gestos de deslizar (*Swipe-to-action*) en las tarjetas de inventario para accesos directos de edición o cobro.

### 1.4 Pull-to-Refresh
- **Concepto:** Permitir que el Staff "jale" la pantalla hacia abajo en el Dashboard o el Inventario para forzar la recarga de datos con TanStack Query.

---

## 2. Administración y Control del Negocio (PC y Gerencia) 💼

### 2.1 Módulo de Corte de Caja (Arqueo) 💰
- **Concepto:** Un sistema para aperturar caja con un fondo inicial y cerrarla al final del turno.
- **Beneficio:** Permite cuadrar el efectivo/transferencias reales de la tienda física contra las acciones registradas en sistema, detectando sobrantes o faltantes.

### 2.2 Panel de Analítica y Gráficas 📊
- **Concepto:** Añadir gráficas visuales (ej. usando `Recharts`) en el Dashboard actual.
- **Beneficio:** Visualizar curvas de ingresos semanales/mensuales, el top de marcas/categorías más vendidas y conocer los días con mayor flujo de clientes.

### 2.3 Exportación de Reportes (Excel / CSV) 📥 — ✅ Implementado
- **Estado:** botón **"Exportar"** en **Inventario** y **Bitácora**. Genera un CSV (con BOM UTF-8, abre bien en Excel) de las filas **según los filtros activos**, sin dependencias externas (`src/lib/csv.ts`). La Bitácora incluye el precio de venta solo para roles financieros.
- **Beneficio:** contabilidad externa, reportes a socios/auditores y respaldos.

### 2.4 Control de Gastos (Egresos Operativos) 📉
- **Concepto:** Una pequeña sección para registrar gastos hormiga o fijos (paquetería, limpieza, servicios, nómina).
- **Beneficio:** Al cruzar los *Ingresos (Ventas)* menos el *Costo de las Prendas* y los *Gastos*, podrás ver la **Utilidad Neta Real** del negocio.

### 2.5 Acciones Masivas (Batch Operations) 📦
- **Concepto:** `Checkboxes` en la tabla de PC para seleccionar de 2 a 50 artículos a la vez.
- **Beneficio:** Permite aplicar remates, devolver apartados a stock o marcar lotes enteros como vendidos en 1 solo clic, ahorrando horas de administración manual.
