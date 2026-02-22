-- Criar bucket para assets de marca se não existir
INSERT INTO storage.buckets (id, name, public)
VALUES ('brand_assets', 'brand_assets', true)
ON CONFLICT (id) DO NOTHING;

-- Política para permitir que qualquer pessoa veja os assets (Público)
CREATE POLICY "Public Access"
ON storage.objects FOR SELECT
USING ( bucket_id = 'brand_assets' );

-- Política para permitir que usuários autenticados façam upload
CREATE POLICY "Authenticated users can upload assets"
ON storage.objects FOR INSERT 
TO authenticated 
WITH CHECK ( bucket_id = 'brand_assets' );

-- Política para permitir que usuários autenticados deletem seus assets se necessário
CREATE POLICY "Users can delete assets"
ON storage.objects FOR DELETE
TO authenticated
USING ( bucket_id = 'brand_assets' );
