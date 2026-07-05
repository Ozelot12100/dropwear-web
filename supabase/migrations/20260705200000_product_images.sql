-- ============================================================================
-- Fase 3: Fotos de producto
-- Agrega una imagen representativa por producto del catálogo y un bucket de
-- Storage público para alojarlas. La escritura (subir/borrar) queda restringida
-- a socio/superadmin vía public.current_user_role(); la lectura es pública para
-- que las miniaturas carguen sin sesión.
-- ============================================================================

-- 1. Columna de imagen en el catálogo maestro (nullable: los productos existentes
--    siguen válidos sin foto).
ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS image_url TEXT;

-- 2. Bucket de Storage público, con límite de 5 MB y solo imágenes.
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'product-images',
  'product-images',
  true,
  5242880, -- 5 MB
  ARRAY['image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO UPDATE
  SET public = EXCLUDED.public,
      file_size_limit = EXCLUDED.file_size_limit,
      allowed_mime_types = EXCLUDED.allowed_mime_types;

-- 3. Políticas RLS sobre storage.objects para este bucket.
--    Lectura pública; escritura/edición/borrado solo socio y superadmin.
DROP POLICY IF EXISTS "product_images_public_read" ON storage.objects;
CREATE POLICY "product_images_public_read" ON storage.objects
  FOR SELECT TO public
  USING (bucket_id = 'product-images');

DROP POLICY IF EXISTS "product_images_insert" ON storage.objects;
CREATE POLICY "product_images_insert" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'product-images'
    AND (SELECT public.current_user_role()) IN ('socio', 'superadmin')
  );

DROP POLICY IF EXISTS "product_images_update" ON storage.objects;
CREATE POLICY "product_images_update" ON storage.objects
  FOR UPDATE TO authenticated
  USING (
    bucket_id = 'product-images'
    AND (SELECT public.current_user_role()) IN ('socio', 'superadmin')
  )
  WITH CHECK (
    bucket_id = 'product-images'
    AND (SELECT public.current_user_role()) IN ('socio', 'superadmin')
  );

DROP POLICY IF EXISTS "product_images_delete" ON storage.objects;
CREATE POLICY "product_images_delete" ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'product-images'
    AND (SELECT public.current_user_role()) IN ('socio', 'superadmin')
  );
