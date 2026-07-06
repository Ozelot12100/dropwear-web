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

### 2.2 Panel de Analítica y Gráficas 📊 — ✅ Implementado (v1)
- **Estado:** sección **"Análisis del Negocio"** en el Dashboard (solo roles financieros) con dos gráficas: **tendencia de 6 meses** (barras de ingresos + utilidad neta por mes) y **top 5 productos** del mes en curso (barras horizontales por ingreso). Datos derivados de `inventory_logs` + `products.cost` + `expenses` vía `analyticsService.getBusinessAnalytics`. Se actualiza en tiempo real con las ventas (invalida `businessAnalytics` en el canal de `inventory_items`).
- **Decisión técnica:** gráficas propias con CSS/flex (sin `Recharts` ni dependencias nuevas) para no inflar el bundle móvil, consistente con el enfoque del CSV. Con estados vacíos claros mientras no haya ventas.
- **Beneficio:** ver la trayectoria de ingresos/utilidad y qué productos mueven el negocio, de un vistazo.
- **Siguiente (v2, opcional):** ventas por día del mes, top por marca/categoría, comparativa mes vs. mes.

### 2.3 Exportación de Reportes (Excel / CSV) 📥 — ✅ Implementado
- **Estado:** botón **"Exportar"** en **Inventario** y **Bitácora**. Genera un CSV (con BOM UTF-8, abre bien en Excel) de las filas **según los filtros activos**, sin dependencias externas (`src/lib/csv.ts`). La Bitácora incluye el precio de venta solo para roles financieros.
- **Beneficio:** contabilidad externa, reportes a socios/auditores y respaldos.

### 2.4 Control de Gastos (Egresos Operativos) 📉 — ✅ Implementado
- **Estado:** módulo **Gastos** (`/expenses`) con tabla `public.expenses` (monto, categoría, descripción, fecha, autor). Registro/edición/borrado de gastos por categoría (paquetería, servicios, nómina, renta, limpieza, marketing, comisiones, otro) y **resumen mensual** con navegación por mes: **Ingresos − Costo de venta − Gastos = Utilidad Neta**, más margen neto %. Incluye exportación CSV.
- **Seguridad:** dato financiero sensible → RLS restringe la **lectura** a `superadmin/socio/contador` y la **escritura** a `socio/superadmin`; el personal de piso (vendedor/repartidor) **no ve los gastos**. El autor se sella en el servidor (trigger anti-spoofing). Validado E2E en producción (lectura/escritura por rol + sellado de autor).
- **Nota contable:** no se incluye "compra de mercancía" como gasto: su costo ya se captura en `products.cost` (COGS) y contarlo aquí lo restaría dos veces.
- **Beneficio:** cruzar *Ingresos − Costo de prendas − Gastos* da la **Utilidad Neta Real** del negocio.

### 2.5 Acciones Masivas (Batch Operations) 📦
- **Concepto:** `Checkboxes` en la tabla de PC para seleccionar de 2 a 50 artículos a la vez.
- **Beneficio:** Permite aplicar remates, devolver apartados a stock o marcar lotes enteros como vendidos en 1 solo clic, ahorrando horas de administración manual.
