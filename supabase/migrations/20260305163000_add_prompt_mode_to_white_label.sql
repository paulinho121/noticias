-- Add prompt_mode to white_label_settings
ALTER TABLE public.white_label_settings ADD COLUMN IF NOT EXISTS prompt_mode TEXT DEFAULT 'system';

-- Add comment for clarity
COMMENT ON COLUMN public.white_label_settings.prompt_mode IS 'Determina se usa o prompt padrao do sistema ou o personalizado do cliente (system | custom)';
