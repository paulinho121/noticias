-- Adicionar user_id e external_id à tabela de categorias para suportar multi-tenancy e sincronização externa
DO $$ 
BEGIN
  -- 1. Adicionar user_id se não existir
  IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME='categories' AND COLUMN_NAME='user_id') THEN
    ALTER TABLE public.categories ADD COLUMN user_id UUID REFERENCES auth.users(id) DEFAULT auth.uid();
  END IF;

  -- 2. Adicionar external_id se não existir (para IDs de categorias do WordPress/outros sites)
  IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME='categories' AND COLUMN_NAME='external_id') THEN
    ALTER TABLE public.categories ADD COLUMN external_id TEXT;
  END IF;

  -- 3. Remover UNIQUE no slug se existir (pois diferentes usuários podem ter categorias com o mesmo nome/slug)
  ALTER TABLE public.categories DROP CONSTRAINT IF EXISTS categories_slug_key;
END $$;

-- 4. Atualizar políticas RLS
-- Permitir que usuários vejam categorias públicas (sem user_id) E as suas próprias
DROP POLICY IF EXISTS "Public Categories access" ON public.categories;
CREATE POLICY "Users can manage own categories" 
ON public.categories FOR ALL 
USING (auth.uid() = user_id OR user_id IS NULL);

-- Garantir que anon e authenticated tenham acesso (já concedido no FULL_SETUP, mas reforçando)
GRANT ALL ON public.categories TO authenticated, service_role;
