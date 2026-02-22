-- Criar bucket 'news-images' se não existir
INSERT INTO storage.buckets (id, name, public)
VALUES ('news-images', 'news-images', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- Remover políticas antigas para evitar duplicidade
DROP POLICY IF EXISTS "Public Access News Images" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload news images" ON storage.objects;
DROP POLICY IF EXISTS "Users can update news images" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete news images" ON storage.objects;

-- Política de Leitura Pública (Qualquer um pode ver)
CREATE POLICY "Public Access News Images"
ON storage.objects FOR SELECT
USING ( bucket_id = 'news-images' );

-- Política de Upload (Apenas autenticados)
CREATE POLICY "Authenticated users can upload news images"
ON storage.objects FOR INSERT 
TO authenticated 
WITH CHECK ( bucket_id = 'news-images' );

-- Política de Update (Apenas autenticados)
CREATE POLICY "Users can update news images"
ON storage.objects FOR UPDATE
TO authenticated
USING ( bucket_id = 'news-images' );

-- Política de Delete (Apenas autenticados)
CREATE POLICY "Users can delete news images"
ON storage.objects FOR DELETE
TO authenticated
USING ( bucket_id = 'news-images' );
