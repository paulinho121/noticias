
-- Adiciona coluna para provedor de IA preferencial
ALTER TABLE white_label_settings ADD COLUMN IF NOT EXISTS ai_provider TEXT DEFAULT 'gemini';

-- Comentário para documentar os valores possíveis
COMMENT ON COLUMN white_label_settings.ai_provider IS 'Provedor de IA preferencial: gemini ou openai';
