-- Adicionar coluna favicon_url às organizações se não existir
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME='organizations' AND COLUMN_NAME='favicon_url') THEN
    ALTER TABLE public.organizations ADD COLUMN favicon_url TEXT;
  END IF;
END $$;

-- Garantir que white_label_settings tenha as colunas necessárias
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME='white_label_settings' AND COLUMN_NAME='app_name') THEN
    ALTER TABLE public.white_label_settings ADD COLUMN app_name TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME='white_label_settings' AND COLUMN_NAME='hero_title') THEN
    ALTER TABLE public.white_label_settings ADD COLUMN hero_title TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME='white_label_settings' AND COLUMN_NAME='hero_subtitle') THEN
    ALTER TABLE public.white_label_settings ADD COLUMN hero_subtitle TEXT;
  END IF;
END $$;
