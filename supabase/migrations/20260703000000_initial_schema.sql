-- =====================================================================
-- DropWear · Esquema inicial (reconstrucción)
-- Fuente: "Documentación Técnica del Backend y Base de Datos - DropWear.md"
--         + src/types/database.types.ts + supabase/functions/*
-- =====================================================================

-- 1. TIPOS ENUM PERSONALIZADOS ----------------------------------------
CREATE TYPE item_status AS ENUM ('disponible', 'apartado', 'vendido', 'devuelto');
CREATE TYPE log_action  AS ENUM ('creacion', 'actualizacion_estado', 'venta', 'apartado', 'devolucion');
CREATE TYPE user_role   AS ENUM ('superadmin', 'socio', 'vendedor', 'repartidor', 'contador');

-- 2. TABLAS MAESTRAS Y SEGURIDAD --------------------------------------
CREATE TABLE user_profiles (
    id         UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
    full_name  VARCHAR(100) NOT NULL,
    role       user_role NOT NULL DEFAULT 'vendedor',
    -- is_active: soft-delete/baneo. Requerido por la Edge Function toggle-user-status.
    is_active  BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE categories (
    id         BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    name       VARCHAR(50) NOT NULL UNIQUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE brands (
    id         BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    name       VARCHAR(50) NOT NULL UNIQUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE products (
    id          BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    brand_id    BIGINT REFERENCES brands(id) ON DELETE RESTRICT NOT NULL,
    category_id BIGINT REFERENCES categories(id) ON DELETE RESTRICT NOT NULL,
    name        VARCHAR(100) NOT NULL,
    description TEXT,
    base_price  NUMERIC(10, 2) NOT NULL DEFAULT 250.00,
    created_at  TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. TABLAS TRANSACCIONALES -------------------------------------------
CREATE TABLE inventory_items (
    id         BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    product_id BIGINT REFERENCES products(id) ON DELETE CASCADE NOT NULL,
    size       VARCHAR(10) NOT NULL,
    color      VARCHAR(30) NOT NULL,
    status     item_status NOT NULL DEFAULT 'disponible',
    price_sold NUMERIC(10, 2),
    updated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE inventory_logs (
    id              BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    item_id         BIGINT REFERENCES inventory_items(id) ON DELETE CASCADE NOT NULL,
    partner_id      UUID REFERENCES user_profiles(id) ON DELETE SET NULL,
    action          log_action NOT NULL,
    previous_status item_status,
    new_status      item_status,
    notes           TEXT,
    created_at      TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. ROW LEVEL SECURITY (RLS) -----------------------------------------
-- Regla unificada del MVP: cualquier usuario 'authenticated' puede leer y
-- escribir; ningún usuario anónimo puede tocar los datos vía API REST.
ALTER TABLE user_profiles   ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories      ENABLE ROW LEVEL SECURITY;
ALTER TABLE brands          ENABLE ROW LEVEL SECURITY;
ALTER TABLE products        ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_logs  ENABLE ROW LEVEL SECURITY;

CREATE POLICY "authenticated_all" ON user_profiles   FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "authenticated_all" ON categories      FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "authenticated_all" ON brands          FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "authenticated_all" ON products        FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "authenticated_all" ON inventory_items FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "authenticated_all" ON inventory_logs  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- 5. REPLICACIÓN REALTIME ---------------------------------------------
-- El frontend se suscribe a cambios de inventory_items e inventory_logs.
ALTER PUBLICATION supabase_realtime ADD TABLE inventory_items;
ALTER PUBLICATION supabase_realtime ADD TABLE inventory_logs;

-- 6. SEMILLAS DE DATOS INICIALES --------------------------------------
INSERT INTO categories (name) VALUES ('Shorts')
    ON CONFLICT (name) DO NOTHING;
INSERT INTO brands (name) VALUES ('Jordan'), ('Adidas'), ('Nike'), ('Puma')
    ON CONFLICT (name) DO NOTHING;
