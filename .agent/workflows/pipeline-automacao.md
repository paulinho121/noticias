---
description: Como operar a Pipeline de Automação Nuclear (100% Automática)
---

Este documento explica como funciona o novo sistema de automação total do seu software. Agora, praticamente tudo acontece sem você precisar clicar em nada.

### 1. O Fluxo Automático (Pipeline)
A partir de agora, o software segue este fluxo sem intervenção:
1. **Agendamento (`pg_cron`)**: A cada 15 minutos, o banco de dados chama a função `process-feed` para todos os feeds ativos.
2. **Ingestão (`process-feed`)**: Busca novas notícias no RSS ou via Palavras-Chave e as insere na tabela `feed_items` com status `pending`.
3. **Gatilho de Reescrita (Trigger SQL)**: No momento da inserção, um gatilho de banco de dados detecta o item `pending` e dispara IMEDIATAMENTE a função `rewrite-content`.
4. **AI Gateway (`rewrite-content`)**:
   - Analisa a imagem original (Vision).
   - Recria o texto com SEO e Humanização usando Gemini (ou OpenAI como fallback).
   - Gera uma nova imagem via Imagen 3 ou DALL-E 3.
   - Muda o status para `success` (ou `ready`).
5. **Auto-Publicação (Opcional)**: Se o feed estiver configurado com `Auto Publish = True`, ele dispara a publicação para o WordPress/Blogger logo após a reescrita.

### 2. O Que Mudou no Editor?
- **Status em Tempo Real**: Você verá os itens mudando de `Pendente` para `Processando` e `Sucesso` automaticamente na sua tela.
- **Sem Botões Manuais**: Você não precisa mais clicar em "Humanizar". A IA já faz isso na entrada. Use o editor apenas se quiser fazer um ajuste fino final.
- **Failover Automático**: Se o Gemini estiver fora do ar ou sem créditos, o sistema tentará o OpenAI automaticamente.

### 3. Manutenção e Logs
- **Pasta `tools/`**: Todos os scripts de teste e diagnóstico foram movidos para a pasta `tools/` para manter o projeto limpo.
- **Logs Detalhados**: Na aba de Logs, você verá o passo a passo da IA (desde a análise da imagem até a publicação final).

### 4. Como Adicionar Novos Feeds
Basta adicionar a URL do RSS. O sistema cuidará de todo o resto nos próximos 15 minutos (ou você pode forçar um "Sync Now").

// turbo
#### Para verificar o status da automação agora, você pode rodar:
`node tools/check_recent_logs.js`
