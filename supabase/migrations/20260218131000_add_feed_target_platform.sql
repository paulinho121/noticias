-- Adicionar target_platform à tabela feeds
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME='feeds' AND COLUMN_NAME='target_platform') THEN
    ALTER TABLE public.feeds ADD COLUMN target_platform TEXT DEFAULT 'wordpress';
  END IF;
END $$;
