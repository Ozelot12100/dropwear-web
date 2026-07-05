-- Semillas base del catálogo DropWear.
-- Se ejecuta automáticamente en `supabase db reset` (entorno local).
-- En remoto, estas mismas semillas ya están incluidas en la migración inicial.
INSERT INTO categories (name) VALUES ('Shorts')
    ON CONFLICT (name) DO NOTHING;
INSERT INTO brands (name) VALUES ('Jordan'), ('Adidas'), ('Nike'), ('Puma')
    ON CONFLICT (name) DO NOTHING;
