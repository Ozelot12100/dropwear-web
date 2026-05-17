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

## **6\. Políticas de Seguridad (RLS) y Replicación Realtime**

La base de datos cuenta con Seguridad a Nivel de Fila (RLS) activada de manera obligatoria en todas sus tablas. Para agilizar el MVP de DropWear, las políticas actuales operan bajo una regla unificada para usuarios autenticados, asegurando que ninguna entidad anónima externa a la organización pueda interceptar o modificar datos mediante la API REST expuesta:

* **Políticas de Lectura (SELECT):** Otorgadas globalmente a cualquier token válido con el rol authenticated.  
* **Políticas de Escritura (ALL/INSERT):** Permitidas a usuarios autenticados para agilizar el CRUD entre los tres socios actuales.  
* **Canales de Tiempo Real:** Las tablas inventory\_items e inventory\_logs han sido explícitamente añadidas al bloque de publicación supabase\_realtime. El motor de base de datos emitirá un payload JSON a cualquier cliente WebSocket activo cuando ocurra un cambio físico en el inventario.

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