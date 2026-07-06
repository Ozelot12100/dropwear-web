# **Documentación Técnica del Backend y Base de Datos \- DropWear**

Esta documentación proporciona una descripción exhaustiva del diseño de la base de datos y la configuración del backend en Supabase para el proyecto DropWear, una tienda de ropa con sede en Puerto Peñasco, Sonora. Este documento ha sido estructurado específicamente para servir como contexto de entrada inmutable para un asistente de Inteligencia Artificial encargado del desarrollo del frontend (MVP), garantizando que comprenda las reglas de negocio, la integridad de los datos y las políticas de seguridad implementadas.

## **1\. Pila Tecnológica del Backend**

El backend está construido sobre **Supabase**, una plataforma de Backend-as-a-Service (BaaS) que expone una base de datos relacional robusta y automatiza los flujos operativos clave mediante las siguientes tecnologías:

* **Motor de Base de Datos:** PostgreSQL 15+, encargado de mantener la integridad referencial y ejecutar restricciones estrictas mediante tipos personalizados.  
* **Autenticación:** Supabase Auth, que gestiona el acceso mediante tokens JWT seguros y proporciona identificadores únicos de usuario (UUID) inmutables.  
* **Tiempo Real (Realtime):** Suscripciones basadas en WebSockets a través del mecanismo de replicación de PostgreSQL, permitiendo actualizaciones instantáneas en el cliente ante eventos de inserción o modificación.  
* **Seguridad:** Seguridad a Nivel de Fila (Row Level Security \- RLS), asegurando que ninguna operación sea ejecutada si el usuario no cumple con las políticas declaradas.

## **2\. Arquitectura de Datos y Estrategia de Diseño**

El sistema aplica una estrategia de **normalización relacional**. El principio fundamental del diseño consiste en separar el concepto abstracto de un producto (catálogo) de la existencia física e individual de cada prenda en el inventario. Esto permite que el sistema escale sin modificaciones estructurales cuando la tienda añada nuevas categorías como camisetas, pantalones o accesorios en el futuro.

| Nombre de la Tabla | Tipo de Entidad | Propósito Operativo   |
| :---- | :---- | :---- |
| categories | Maestra (Catálogo) | Clasificación de prendas ('Shorts', 'Camisetas', 'Pantalones'). Evita la redundancia de datos. |
| brands | Maestra (Catálogo) | Almacena los fabricantes y marcas ('Nike', 'Adidas', 'Jordan', 'Puma'). |
| products | Maestra (Catálogo) | Define el modelo o diseño general de una prenda, vinculando una marca, una categoría y un precio base. |
| inventory\_items | Operativa (Transaccional) | Cada fila es un artículo físico único en el estante. Registra de forma exacta su talla, color y estado de disponibilidad. |
| user\_profiles | Seguridad (RBAC) | Extiende la autenticación de Supabase asignando nombres reales y roles jerárquicos a los usuarios. |
| inventory\_logs | Auditoría (Historial) | Registro inmutable de movimientos en tiempo real. Almacena qué socio modificó qué artículo y por qué motivo. |

## **3\. Control de Acceso Basado en Roles (RBAC)**

El sistema cuenta con el tipo enumerado user\_role, diseñado para segregar funciones en etapas avanzadas de la aplicación, manteniendo el principio de menor privilegio por defecto:

* **superadmin:** Control total de la infraestructura, capacidad de gestionar perfiles, configuraciones globales y auditoría completa.  
* **socio:** Acceso completo a las operaciones del CRUD de productos e inventarios, visualización del estado financiero e historial de logs.  
* **vendedor:** Permisos operativos restrictivos. Puede cambiar estados de prendas de 'disponible' a 'vendido' o 'apartado' y registrar transacciones, pero no puede eliminar mercancía o alterar precios base.  
* **repartidor:** Vista optimizada de lectura de productos marcados para entrega a domicilio o recolección, pudiendo actualizar el estado a finalizado.  
* **contador:** Acceso exclusivo de lectura avanzada a los datos financieros e historial de logs para balances e inventarios cíclicos, sin permisos de modificación.

## **4\. Ciclo de Vida del Inventario (Estados)**

Cada fila en la tabla inventory\_items cambia de estado mediante transacciones atómicas reflejadas en el tipo enumerado item\_status:

1. **disponible:** La prenda física se encuentra físicamente en el stock y lista para ser comercializada.  
2. **apartado:** La prenda ha sido reservada por un cliente (por ejemplo, mediante canales de Facebook o WhatsApp) pero el pago total o la entrega aún no concluyen. Bloquea el artículo para evitar una doble venta por otro socio.  
3. **vendido:** La transacción ha finalizado. Se registra de forma obligatoria el precio final de venta en la columna price\_sold y el flujo de caja queda consolidado.  
4. **devuelto:** El artículo ha reingresado debido a un cambio de talla o cancelación. Pasa por este estado intermedio para fines de auditoría antes de ser revaluado y devuelto a 'disponible'.

## **5\. Script SQL de Inicialización (DDL Maestro)**

Este es el código exacto que fue ejecutado en el servidor de PostgreSQL para construir el esquema actual del backend:

\-- 1\. TIPOS ENUM PERSONALIZADOS  
CREATE TYPE item\_status AS ENUM ('disponible', 'apartado', 'vendido', 'devuelto');  
CREATE TYPE log\_action AS ENUM ('creacion', 'actualizacion\_estado', 'venta', 'apartado', 'devolucion');  
CREATE TYPE user\_role AS ENUM ('superadmin', 'socio', 'vendedor', 'repartidor', 'contador');

\-- 2\. TABLAS MAESTRAS Y SEGURIDAD  
CREATE TABLE user\_profiles (  
    id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,  
    full\_name VARCHAR(100) NOT NULL,  
    role user\_role NOT NULL DEFAULT 'vendedor',  
    is\_active BOOLEAN NOT NULL DEFAULT TRUE,  
    created\_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()  
);

CREATE TABLE categories (  
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,  
    name VARCHAR(50) NOT NULL UNIQUE,  
    created\_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()  
);

CREATE TABLE brands (  
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,  
    name VARCHAR(50) NOT NULL UNIQUE,  
    created\_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()  
);

CREATE TABLE products (  
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,  
    brand\_id BIGINT REFERENCES brands(id) ON DELETE RESTRICT NOT NULL,  
    category\_id BIGINT REFERENCES categories(id) ON DELETE RESTRICT NOT NULL,  
    name VARCHAR(100) NOT NULL,  
    description TEXT,  
    base\_price NUMERIC(10, 2\) NOT NULL DEFAULT 250.00,  
    created\_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()  
);

\-- 3\. TABLAS TRANSACCIONALES  
CREATE TABLE inventory\_items (  
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,  
    product\_id BIGINT REFERENCES products(id) ON DELETE CASCADE NOT NULL,  
    size VARCHAR(10) NOT NULL,    
    color VARCHAR(30) NOT NULL,  
    status item\_status NOT NULL DEFAULT 'disponible',  
    price\_sold NUMERIC(10, 2),    
    updated\_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,   
    updated\_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),  
    created\_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()  
);

CREATE TABLE inventory\_logs (  
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,  
    item\_id BIGINT REFERENCES inventory\_items(id) ON DELETE CASCADE NOT NULL,  
    partner\_id UUID REFERENCES user_profiles(id) ON DELETE SET NULL,  
    action log\_action NOT NULL,  
    previous\_status item\_status,  
    new\_status item\_status,  
    notes TEXT,   
    created\_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()  
);

\-- 4\. SEMILLAS DE DATOS INICIALES  
INSERT INTO categories (name) VALUES ('Shorts');  
INSERT INTO brands (name) VALUES ('Jordan'), ('Adidas'), ('Nike'), ('Puma');

### **5.1 Evolución del esquema (migraciones versionadas) — FUENTE DE VERDAD ACTUAL**

⚠️ El DDL de arriba es el esquema **inicial**. El esquema real y autoritativo hoy vive en `supabase/migrations/` (migraciones versionadas). Los cambios aplicados sobre el inicial son:

* **`inventory_items`** ganó columnas nuevas:
  * `image_url` **no** (esa vive en `products`).
  * `reserved_for TEXT`, `reserved_contact TEXT`, `reserved_until DATE`, `reserved_deposit NUMERIC(10,2)` — datos del **cliente que apartó** la prenda (solo aplican mientras `status='apartado'`; se limpian solos al salir de ese estado). Ver la feature de Apartados abajo.
* **`products`** ganó `image_url TEXT` (foto del producto, ver Storage abajo).
* **CHECK constraints de integridad (Fase 2):** `price_sold` obligatorio cuando `status='vendido'`; `price_sold`, `base_price` y `reserved_deposit` no negativos.
* **RPCs atómicas (Fase 2)** — reemplazan el CRUD multi-paso del cliente por transacciones únicas con `FOR UPDATE` (eliminan la doble venta y el estado inconsistente). `SECURITY INVOKER` (respetan RLS). El actor se sella en el servidor vía triggers (`stamp_log_actor`, `stamp_item_actor`), nunca desde el cliente:
  * `change_item_status(p_item_id, p_new_status, p_price_sold, p_notes, p_reserved_for, p_reserved_contact, p_reserved_until, p_reserved_deposit)` — cambia estado + inserta el log en una transacción. Exige precio si es venta y nombre de cliente si es apartado.
  * `add_inventory_item(p_product_id, p_size, p_color)` — alta física (item + log 'creacion', status inicial 'disponible').
  * `update_item_details(p_item_id, p_product_id, p_size, p_color)` — corrección de detalles físicos + log.
* **Storage — bucket `product-images`:** público (lectura sin sesión), límite 5 MB, solo jpg/png/webp. Políticas RLS sobre `storage.objects`: **subir/actualizar/borrar** solo `socio`/`superadmin` (vía `current_user_role()`); leer, público. El frontend guarda la URL pública en `products.image_url`.

## **6\. Políticas de Seguridad (RLS) y Replicación Realtime**

⚠️ **Actualizado (Fase 1 — endurecimiento de RLS).** Las políticas **abiertas** originales (`authenticated_all USING(true)`) fueron **reemplazadas por políticas por rol**. La regla ahora es de menor privilegio, no "cualquier autenticado puede todo". Se apoya en la función `public.current_user_role()` (`SECURITY DEFINER`, evita recursión al leer `user_profiles` desde una política).

* **Lectura (SELECT):** sigue abierta a cualquier `authenticated` en las tablas de catálogo/inventario/bitácora (todos los roles ven el stock y el historial).
* **Escritura por rol:**
  * `categories` / `brands` / `products`: escribir solo `socio`/`superadmin`.
  * `inventory_items`: **insertar** `vendedor`+; **actualizar** `vendedor`/`repartidor`/`socio`/`superadmin`; **borrar** solo `socio`/`superadmin`.
  * `inventory_logs`: **inmutable** — solo `INSERT` (atribuido a uno mismo, `partner_id = auth.uid()`); sin `UPDATE`/`DELETE`, nadie puede editar ni borrar el historial.
  * `user_profiles`: no escribible desde el cliente; toda administración de usuarios pasa por Edge Functions (ver §8).
* **Sellado de actor:** triggers `stamp_log_actor` y `stamp_item_actor` ignoran cualquier `partner_id`/`updated_by` que envíe el cliente y lo fijan a la identidad real del JWT (anti-spoofing).
* **Nota pendiente (M2):** `price_sold` sigue siendo legible por todos los roles a nivel de API (la restricción financiera hoy es solo en la UI). Endurecerlo a nivel de columna queda pendiente para cuando existan empleados de piso.
* **Canales de Tiempo Real:** `inventory_items` e `inventory_logs` están en la publicación `supabase_realtime`. El Inventario y el Dashboard escuchan `inventory_items` e invalidan la caché de React Query ante cualquier cambio, re-renderizando sin recargar.

## **7\. Lineamientos Críticos para el Desarrollo del Frontend**

Para el asistente de IA encargado de codificar el cliente en React \+ Vite (o Next.js), se deben seguir estrictamente los siguientes parámetros de integración:

* **Inicialización del Cliente:** Utilizar la librería oficial @supabase/supabase-js. Consumir las variables de entorno inmutables SUPABASE\_URL y SUPABASE\_ANON\_KEY.  
* **Suscripción en Tiempo Real:** Al montar la vista de la tabla de datos principal del inventario, se debe inicializar el canal de escucha de Supabase sobre la tabla inventory\_items. Ante cualquier evento de tipo UPDATE, se debe mutar el estado local o invalidar la caché para renderizar el nuevo estado visual de inmediato sin forzar la recarga del navegador.  
* **Estrategia de Estado en Formularios:** Al realizar una operación CRUD de actualización de estado a 'vendido', el formulario frontend debe capturar de manera obligatoria el monto numérico exacto cobrado y enviarlo en el payload hacia la columna price\_sold. Al mismo tiempo, debe realizar un INSERT secundario en la tabla inventory\_logs documentando la acción ejecutada para mantener la sincronía del historial.  
* **Diseño de Interfaz Móvil:** Dado que los socios operan principalmente desde dispositivos móviles en Puerto Peñasco mientras coordinan entregas a domicilio, el diseño visual debe priorizar componentes colapsables (Drawers/Modales), tablas de datos con scroll horizontal optimizado o tarjetas táctiles individuales por prenda, utilizando Tailwind CSS y componentes estructurados.

## **8\. Gestión Segura de Usuarios (Superadmin) y Edge Functions**

Para evitar la filtración de la clave maestra `SERVICE_ROLE_KEY` en el frontend, toda la administración de cuentas y delegación de roles se realiza de manera segura mediante **Supabase Edge Functions** escritas en Deno.

* **Alta de Usuarios (`create-user`):** Permite crear identidades en `auth.users` e insertar automáticamente su perfil en `user_profiles`. El cliente invoca la función mediante `supabase.functions.invoke()`, que inyecta el JWT. La Edge Function valida que el `role` del emisor sea `superadmin` antes de procesar el alta utilizando privilegios de administrador.
* **Restablecimiento de Contraseñas (`reset-password`):** Facilita que un superadmin pueda forzar la actualización de la contraseña de cualquier colaborador. Adicionalmente, esta misma función es utilizada por el propio usuario (sin importar su rol) para cambiar su propia contraseña desde su sesión. Esta decisión arquitectónica se tomó para evadir un *bug* visual en el cliente de `@supabase/supabase-js` que congela las promesas al actualizar tokens desde el navegador.
* **Política de "Soft Delete" (Baneo / Suspensión) (`toggle-user-status`):** **Nunca se deben eliminar (Hard Delete)** registros de la tabla `auth.users` ni de `user_profiles`. Esto rompería la integridad referencial de `inventory_logs` (cuya columna `partner_id` quedaría en nulo, perdiendo la trazabilidad de auditoría de ventas y movimientos). Si un colaborador debe ser removido, su acceso debe ser revocado mediante "Baneo" (`ban_duration` en Supabase Auth) o modificando su `role` a un estado sin permisos, conservando así todo su historial de forma inmutable. La Edge Function `toggle-user-status` aplica penalizaciones de 100 años (876000h) en Supabase Auth y actualiza el campo `is_active` en la tabla `user_profiles` para reflejar visualmente el bloqueo en el frontend.
* **Validación de tokens en Edge Functions:** Todas las Edge Functions utilizan `supabase.auth.getUser(token)` pasando el token JWT explícitamente (extraído del header `Authorization` mediante `authHeader.replace('Bearer ', '').trim()`), en combinación con `auth: { persistSession: false, autoRefreshToken: false }`. Esto evita el error `Auth session missing!` que ocurre cuando Deno intenta manejar sesiones con estado en un entorno sin storage persistente.
* **Modificación de Roles (`update-user-role`):** Exclusiva para superadmins. Permite elevar o degradar los privilegios (`role` en `user_profiles`) de otros miembros del equipo. Incluye una restricción estricta en el servidor que impide que un superadmin modifique su propio rol, previniendo la pérdida de acceso accidental (lockout).
* **Edición de Nombres de Perfil (`update-profile-name`):** Debido a restricciones subyacentes con las políticas RLS que impedían los updates directos (fallando silenciosamente en el cliente), esta función permite a cualquier usuario registrado cambiar su propio `full_name`. Se ejecuta desde el servidor utilizando privilegios elevados (`SERVICE_ROLE_KEY`) de forma segura.
* **Requisito de Configuración Deno (`deno.json`):** Cada directorio de Edge Function requiere obligatoriamente incluir un archivo `deno.json` con el `imports map` (p. ej. `"@supabase/functions-js": "jsr:@supabase/functions-js@^2"`). La ausencia de este archivo causa un fallo de empaquetado (error `400 unexpected deploy status`) durante el despliegue al servidor remoto.