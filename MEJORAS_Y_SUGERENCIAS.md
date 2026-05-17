# Mejoras aplicadas + roadmap de sugerencias — DropWear

Documento de bitácora de los cambios introducidos en esta iteración y backlog accionable para las siguientes.

---

## 1. Cambios aplicados

### 🔒 Concurrencia segura (bloqueo optimista)
- **Migración SQL nueva**: [`supabase/migrations/20260516120000_optimistic_locking.sql`](supabase/migrations/20260516120000_optimistic_locking.sql)
  - Función `change_item_status(...)` con `SELECT … FOR UPDATE` + verificación de `expected_previous_status`. Si dos vendedores intentan vender la misma prenda al mismo tiempo, sólo el primero gana y el segundo recibe `STALE_STATE` → la UI refresca y obliga a revalidar el estado real.
  - Función `add_inventory_item(...)` que hace el `INSERT` + log de creación dentro de una sola transacción atómica.
  - Inclusión idempotente de `inventory_items` e `inventory_logs` en la publicación `supabase_realtime`.
- **Servicio frontend reescrito**: [`src/services/inventory.ts`](src/services/inventory.ts) ahora consume las RPCs en lugar de hacer `SELECT` + `UPDATE` + `INSERT` separados.

> ⚠️ **Acción requerida**: aplicar la migración SQL en Supabase antes de desplegar:
> ```bash
> supabase db push
> # o pegar el SQL en el editor del dashboard
> ```

### ⚡ Realtime granular
- Nuevo hook [`src/hooks/useInventoryRealtime.ts`](src/hooks/useInventoryRealtime.ts):
  - `INSERT` → fetch del registro nuevo (necesitamos joins) y se inserta al inicio de la caché.
  - `UPDATE` → patch in-place de las columnas escalares preservando `products/brands/categories`. **Sin refetch del listado completo**.
  - `DELETE` → filtro local del arreglo.
  - Expone `status` del canal (`live | connecting | reconnecting | offline`) y `lastActivity` (id + tipo) para feedback visual.
- **Píldora "En vivo"**: [`src/components/layout/LiveBadge.tsx`](src/components/layout/LiveBadge.tsx) con punto pulsante verde y mensajes de degradación.
- **Pulso visual** sobre el ítem que acaba de cambiar (2.5 s) para que sepas "esto lo movió otro usuario en este momento" sin saturar con toasts.

### ✅ Validaciones + manejo de errores
- [`src/lib/errors.ts`](src/lib/errors.ts) — parser que mapea códigos `23505`, `23503`, `42501`, `PGRST301`, errores de auth y de red a mensajes accionables en español.
- [`src/lib/validation.ts`](src/lib/validation.ts) — validadores puros (nombre, precio, talla, color, status, id) + helpers de normalización.
- Errores de la RPC SQL (`STALE_STATE:`, `INVALID_PRICE:`, `ITEM_NOT_FOUND:`, `NO_AUTH:`) se traducen automáticamente a mensajes para el usuario.

### 🔔 Sistema de toasts global
- [`src/components/ui/toast.tsx`](src/components/ui/toast.tsx) — provider con 4 variantes, autocierre, máx 5 simultáneos, accesible (`aria-live`), animaciones de entrada.
- Cableado en [`src/main.tsx`](src/main.tsx). Uso: `const toast = useToast(); toast.success('Hecho', 'descripción')`.
- `ConfirmDialog`: reemplazo accesible del `window.confirm()` con variante destructive.

### 🎨 Rediseño frontend
- **Dashboard**: hero card con gradiente, KPIs en tiempo real (total / disponibles / apartadas / ventas hoy en MXN), búsqueda + filtros sticky en móvil, tarjetas con borde de color por estado e indicador de pulso.
- **TransactionModal**: `StatusPicker` visual (grid 2×2 táctil) en lugar de un `<select>`. Precios sugeridos (-10% / base / +10%) que se aplican con un tap. Input de notas con contador 200/200. Botones de 44px en móvil (target táctil iOS).
- **AddItemModal**: buscador inline de productos por nombre/marca/categoría, talla como pills (40px alto), confirmación visual del producto seleccionado.
- **Login**: glassmorphism, gradiente azul→violeta, toggle de visibilidad de contraseña, feedback por toast.
- **Navbar**: sticky con backdrop blur, chip de rol con color por role, mejor jerarquía.
- **CatalogsPage**: tabs con íconos, `ConfirmDialog` en lugar de `confirm()`, validaciones por campo, toasts en lugar de `alert()`.

### 🛡️ TypeScript estricto
- `Database` type extendido con `Functions`, `Views`, `CompositeTypes` y `Relationships` (era lo que rompía la inferencia de `supabase.rpc()`).
- Build limpio: `tsc -b` 0 errores; `vite build` OK en 1.5s.

---

## 2. Roadmap de sugerencias (priorizado)

### 🔴 Alta prioridad — defensa antes de crecer

#### 2.1 Endurecer RLS por rol
Hoy las políticas son "todos los authenticated pueden todo". Recomiendo políticas granulares:

```sql
-- Sólo socio/superadmin pueden borrar inventario
CREATE POLICY "inventory_items_delete_admin"
ON inventory_items FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM user_profiles
    WHERE id = auth.uid() AND role IN ('socio', 'superadmin')
  )
);

-- Vendedor sólo puede actualizar a 'apartado' o 'vendido' (no 'devuelto')
CREATE POLICY "inventory_items_update_seller"
ON inventory_items FOR UPDATE
USING (true)
WITH CHECK (
  status IN ('apartado', 'vendido')
  OR EXISTS (
    SELECT 1 FROM user_profiles
    WHERE id = auth.uid() AND role IN ('socio', 'superadmin')
  )
);
```

#### 2.2 Auditoría inmutable real
La tabla `inventory_logs` debería ser **append-only** desde Postgres:

```sql
REVOKE UPDATE, DELETE ON inventory_logs FROM authenticated;
```

Así nadie (ni siquiera con la consola) puede falsificar el historial.

#### 2.3 Soft delete en `inventory_items`
Eliminar un producto borra en cascada todas sus prendas físicas → se pierde historial. Mejor agregar:

```sql
ALTER TABLE inventory_items ADD COLUMN deleted_at TIMESTAMPTZ;
-- Y filtrar `WHERE deleted_at IS NULL` en todas las queries.
```

Igual para `products`. Mantiene el historial de bitácora referenciable.

#### 2.4 Índices que faltan para la búsqueda
```sql
CREATE INDEX idx_inventory_items_status ON inventory_items(status);
CREATE INDEX idx_inventory_items_product ON inventory_items(product_id);
CREATE INDEX idx_inventory_logs_created ON inventory_logs(created_at DESC);
CREATE INDEX idx_inventory_logs_item ON inventory_logs(item_id);
```

Sin esto, con 5k+ prendas el dashboard empieza a tardar.

---

### 🟡 Media prioridad — UX y operación

#### 2.5 Paginación + búsqueda server-side
Hoy se traen todos los `inventory_items` de un jalón. Cuando lleguen a 10k registros el frontend se va a poner pesado. Implementar:
- `?cursor=...&limit=50` con keyset pagination en `getAllItems`.
- Búsqueda con `ilike` o `pg_trgm` en server.
- React Query `useInfiniteQuery` en el dashboard.

#### 2.6 Optimistic UI completa en el modal
Hoy el modal espera la respuesta de la RPC para cerrar. Podemos:
- Cerrar inmediatamente y mostrar el cambio en el listado.
- Si la RPC falla → toast de error + rollback automático + reabrir el modal.

#### 2.7 Notificación push entre sesiones
Mostrar un toast cuando alguien más vende una prenda que estás viendo:
> "Carlos acaba de vender Short Jordan T.L (negro) por $280"

Ya tenemos el evento. Sólo hay que cruzar `updated_by` con `user_profiles` y emitirlo cuando `updated_by !== currentUser`.

#### 2.8 Quick actions desde la tarjeta móvil
Swipe izquierda → "Vender rápido" / swipe derecha → "Apartar". Reduce taps de 3 a 1 para el flujo más común.

#### 2.9 Filtros avanzados
- Rango de fechas (vendido entre X y Y).
- Por marca/categoría/talla.
- Por vendedor que lo cobró.
- Persistencia de filtros en query params (`?status=vendido&from=2026-05-01`).

#### 2.10 Modo oscuro
Ya tenemos las CSS variables `.dark` definidas en `index.css`. Sólo falta:
- Toggle en Navbar.
- Persistir preferencia en `localStorage`.
- `<ThemeProvider>` que aplique `.dark` al `<html>`.

---

### 🟢 Baja prioridad — escalabilidad y deleite

#### 2.11 Dashboard de reportes para `contador`
Vista de KPIs financieros: ventas por día/semana/mes, prendas con más rotación, ticket promedio, devoluciones por marca. Puede vivir en `/reportes` con `RoleGuard allowed={['contador', 'socio', 'superadmin']}`.

#### 2.12 Exportar bitácora a CSV/Excel
Botón en `LogsPage` que descargue los registros filtrados — útil para cierres mensuales del contador.

#### 2.13 PWA + offline-first
La app vive en celulares. Convertirla en PWA con service worker:
- Vite tiene `vite-plugin-pwa`.
- Cachear última versión del inventario para que vean datos aunque pierdan señal.
- Cola de operaciones pendientes que se sincronizan al recuperar conexión.

#### 2.14 Fotos por prenda
Agregar `image_url` a `inventory_items` con Supabase Storage. Mejora identificación visual y reduce errores de "¿es esta o la otra?".

#### 2.15 QR/Barcode por prenda
Generar un sticker pequeño con el ID de la prenda + escaneo con cámara desde la app → abre directo el modal de transacción.

#### 2.16 Tests
- **Unit**: parser de errores, validators (Vitest).
- **E2E**: Playwright con 2 sesiones simultáneas verificando el bloqueo optimista.
- **Visual regression**: Percy o Chromatic en los componentes pesados.

#### 2.17 Sentry / Logtail
Hoy los errores se pierden en la consola del cliente. Integrar Sentry para capturar `PGRST*`, errores de red, stack traces de React.

#### 2.18 Rate limiting en RPC
Si hay un bug que dispara loops, puede saturar el plan free de Supabase. Postgres `pg_qualstats` o un trigger contador por usuario.

---

## 3. Cómo verificar localmente

```bash
# 1. Aplicar migración (escoge una):
supabase db push                             # si tienes supabase CLI ligado
# o pega el contenido del .sql en el SQL editor del dashboard

# 2. Levantar el cliente
npm install
npm run dev

# 3. Probar la concurrencia:
#    - Abre dos ventanas (incognito + normal) con el mismo usuario o usuarios distintos.
#    - Pon ambas en la misma prenda 'disponible'.
#    - En la ventana A marca "vendido" con precio.
#    - En la ventana B intenta marcar "apartado" sin refrescar.
#    -> A debe ganar; B debe recibir un toast "Esta prenda fue modificada por
#       otro usuario hace instantes. Refresca y vuelve a intentarlo."
```

---

## 4. Archivos creados / modificados

**Nuevos:**
- `supabase/migrations/20260516120000_optimistic_locking.sql`
- `src/lib/errors.ts`
- `src/lib/validation.ts`
- `src/hooks/useInventoryRealtime.ts`
- `src/components/ui/toast.tsx`
- `src/components/ui/confirm-dialog.tsx`
- `src/components/layout/LiveBadge.tsx`
- `src/components/inventory/StatusPicker.tsx`
- `src/components/inventory/StatCard.tsx`

**Reescritos / rediseñados:**
- `src/main.tsx` (toast provider + config QueryClient)
- `src/services/inventory.ts` (RPC en vez de SELECT+UPDATE)
- `src/types/database.types.ts` (Functions + Relationships)
- `src/hooks/index.ts` (export central)
- `src/pages/Dashboard.tsx` (hero + KPIs + realtime granular)
- `src/pages/Login.tsx` (glassmorphism)
- `src/pages/CatalogsPage.tsx` (tabs con íconos + ConfirmDialog + toasts)
- `src/components/inventory/TransactionModal.tsx` (StatusPicker + locking)
- `src/components/inventory/AddItemModal.tsx` (búsqueda inline + pills de talla)
- `src/components/layout/Navbar.tsx` (sticky + chips por rol)
- `src/index.css` (animación `pulse-once` + scrollbar-none + safe-bottom)
