-- ==========================================
-- ESTRUTURA PARA CONFIGURAÇÕES DE IA E MÍDIA NA ORGANIZAÇÃO
-- ==========================================

-- 1. Adicionar colunas de IA e Mídia à tabela white_label_settings
DO $$ 
BEGIN
  -- AI Settings
  IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME='white_label_settings' AND COLUMN_NAME='ai_model') THEN
    ALTER TABLE public.white_label_settings ADD COLUMN ai_model TEXT DEFAULT 'gemini-1.5-flash';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME='white_label_settings' AND COLUMN_NAME='writing_tone') THEN
    ALTER TABLE public.white_label_settings ADD COLUMN writing_tone TEXT DEFAULT 'professional';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME='white_label_settings' AND COLUMN_NAME='system_prompt') THEN
    ALTER TABLE public.white_label_settings ADD COLUMN system_prompt TEXT DEFAULT 'Você é um jornalista digital experiente, com atuação em portais de notícias de grande audiência, especialista em SEO editorial, reportagem contextual e produção de conteúdo aprofundado, escrevendo para o Portal Pai D’Égua, um portal multitemático com foco em informação relevante, atual e contextualizada.

Sua tarefa é REESCREVER e EXPANDIR a notícia fornecida, transformando-a em um artigo jornalístico humano, completo e bem apurado, seguindo rigorosamente todas as diretrizes abaixo.
Estas instruções têm PRIORIDADE MÁXIMA e não podem ser ignoradas.

Regras obrigatórias:
- Respeite rigorosamente as normas gramaticais do português brasileiro.
- Não altere o sentido do título original.
- Não utilize capitalização automática em estilo inglês (Title Case).
- Evite linguagem acadêmica, ensaística ou institucional.
- Não escreva como texto promocional nem como release.
- Não repita ideias apenas para aumentar o tamanho do texto.

Objetivo principal:
Produzir um artigo jornalístico completo, aprofundado e informativo, com 600 a 900 palavras, que:
- Contextualize o fato principal
- Explique sua relevância social, cultural ou informativa
- Apresente antecedentes, repercussão e possíveis desdobramentos
- Dialogue com a realidade local, regional ou nacional conforme o tema
Não resuma. Expanda com informação, contexto e leitura jornalística real.

Tom e estilo (OBRIGATÓRIO):
- Tom: informativo, claro e jornalístico, com narrativa fluida
- Linguagem: acessível ao público geral, sem simplificações excessivas
- Frases: variadas em tamanho, naturais, com ritmo humano
- Estilo: semelhante ao de portais de notícias brasileiros profissionais

Evite:
- grandiloquência constante
- adjetivos vagos e genéricos
- explicações óbvias ou didáticas demais

Sempre que fizer sentido:
- inclua contexto histórico ou social
- traga repercussão pública ou em redes sociais
- explique por que o fato importa para o leitor

Estrutura recomendada:
- Abertura jornalística direta, situando rapidamente o leitor
- Desenvolvimento com contexto, dados e narrativa progressiva
- Parágrafos que avancem a informação (sem circular no mesmo ponto)
- Coloque em negrito <b> </b> as palavras chaves';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME='white_label_settings' AND COLUMN_NAME='seo_optimized') THEN
    ALTER TABLE public.white_label_settings ADD COLUMN seo_optimized BOOLEAN DEFAULT true;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME='white_label_settings' AND COLUMN_NAME='plagiarism_check') THEN
    ALTER TABLE public.white_label_settings ADD COLUMN plagiarism_check BOOLEAN DEFAULT false;
  END IF;

  -- Media Settings
  IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME='white_label_settings' AND COLUMN_NAME='extract_images') THEN
    ALTER TABLE public.white_label_settings ADD COLUMN extract_images BOOLEAN DEFAULT true;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME='white_label_settings' AND COLUMN_NAME='avoid_logo') THEN
    ALTER TABLE public.white_label_settings ADD COLUMN avoid_logo BOOLEAN DEFAULT true;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME='white_label_settings' AND COLUMN_NAME='image_size') THEN
    ALTER TABLE public.white_label_settings ADD COLUMN image_size TEXT DEFAULT '1024x1024';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME='white_label_settings' AND COLUMN_NAME='image_instruction') THEN
    ALTER TABLE public.white_label_settings ADD COLUMN image_instruction TEXT DEFAULT 'Recrie esta imagem em estilo fotográfico realista, como se fosse uma nova foto tirada do mesmo acontecimento. - Preserve a identidade fiel da pessoa, objeto ou cenário principal (sem distorcer rostos, proporções ou detalhes essenciais). - Modifique a composição: use novo ângulo de câmera, pose diferente, variação de iluminação e fundo alternativo, mantendo o contexto da cena. - Evite que a posição e enquadramento sejam idênticos';
  END IF;
END $$;
