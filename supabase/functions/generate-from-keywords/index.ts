import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { feedId } = await req.json();

    const supabaseUrl = Deno.env.get('SITE_URL') || Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('MASTER_KEY') || Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || Deno.env.get('SUPABASE_ANON_KEY');
    
    if (!supabaseKey) throw new Error('Credenciais Supabase não encontradas.');
    
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { data: feed, error: feedError } = await supabase
      .from('feeds')
      .select('*')
      .eq('id', feedId)
      .single();

    if (feedError || !feed) {
      throw new Error(`Feed não encontrado: ${feedError?.message || 'ID inválido'}`);
    }

    const keywords = feed.keywords || feed.name;
    const userId = feed.user_id || feed.author_id;

    // --- GET USER API KEYS (with fallback logic) ---
    let { data: settings } = await supabase
       .from('platform_settings')
       .select('platform_id, credentials, user_id, organization_id')
       .eq('user_id', userId)
       .in('platform_id', ['openai', 'openai_images', 'google_gemini', 'gemini', 'google', 'deepseek', 'groq']);
    
    // Fallback Org
    if ((!settings || settings.length === 0) && feed?.organization_id) {
       const { data: orgSettings } = await supabase
         .from('platform_settings')
         .select('platform_id, credentials')
         .eq('organization_id', feed.organization_id);
       settings = orgSettings;
    }

    // Fallback ANY
    if (!settings || settings.length === 0) {
       const { data: anySettings } = await supabase
         .from('platform_settings')
         .select('platform_id, credentials')
         .limit(20);
       settings = anySettings;
    }

    const getCreds = (pid: string) => settings?.find((s: any) => s.platform_id === pid || (pid === 'google_gemini' && (s.platform_id === 'gemini' || s.platform_id === 'google')))?.credentials?.api_key;

    const OPENAI_API_KEY = getCreds('openai') || Deno.env.get('OPENAI_API_KEY');
    const GEMINI_API_KEY = getCreds('google_gemini') || Deno.env.get('GEMINI_API_KEY') || Deno.env.get('GOOGLE_AI_API_KEY');
    const GROQ_API_KEY = getCreds('groq') || Deno.env.get('GROQ_API_KEY');

    if (!OPENAI_API_KEY && !GEMINI_API_KEY) {
      throw new Error('Nenhuma chave de API configurada (OpenAI ou Gemini). Configure em Configurações > API.');
    }

    const systemPrompt = `Você é um Especialista em Marketing de Conteúdo e Editor Sênior. Sua tarefa é criar ideias de artigos de alta performance e nível PROFISSIONAL com base nas palavras-chave fornecidas.

    DETECÇÃO DE DOMÍNIO:
    1. Se as palavras-chave forem sobre CULINÁRIA/RECEITAS: Assuma a persona de um Chef de Cozinha renomado. Crie um artigo que inclua: Introdução envolvente, Ingredientes organizados, Modo de Preparo detalhado e uma "Dica do Chef" para um toque profissional.
    2. Se as palavras-chave forem sobre TECNOLOGIA/IA: Assuma a persona de um Analista de Sistemas/Tech Lead. Foque em tendências, impactos e aplicabilidade técnica.
    3. Se as palavras-chave forem sobre NEGÓCIOS/MARKETING: Assuma a persona de um Consultor de Estratégia. Foque em ROI, conversão e tendências de mercado.
    4. Caso contrário: Assuma a persona de um Jornalista Especialista no tema.

    REGRAS DE OURO:
    - O conteúdo deve ser rico, útil e pronto para publicação.
    - Use formatação HTML básica (<b>, <i>, <ul>, <li>) para estruturar o texto.
    - O tom deve ser EXPERT, evitando clichês e gerando valor real para o leitor.
    - Gere também metadados SEO (slug, meta_description, tags).

    RETORNE APENAS um JSON válido seguindo esta estrutura:
    {
      "items": [
        { 
          "title": "Título Profissional e Chamativo", 
          "content": "Conteúdo completo do artigo em HTML (mínimo 300 palavras)", 
          "meta_description": "Resumo para SEO",
          "slug": "url-do-artigo",
          "tags": ["tag1", "tag2"]
        }
      ]
    }`;

    let aiContent = "";

    if (GROQ_API_KEY) {
      console.log(`[Generate] Using Groq (llama-3.3-70b-versatile) for: ${keywords}`);
      const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${GROQ_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'llama-3.3-70b-versatile',
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: `Palavras-chave: ${keywords}` }
          ],
          temperature: 0.7,
          response_format: { type: "json_object" }
        }),
      });

      if (!response.ok) {
        const err = await response.text();
        throw new Error(`Erro Groq: ${response.status} - ${err}`);
      }

      const data = await response.json();
      aiContent = data.choices[0].message.content;
    } else if (GEMINI_API_KEY) {
      console.log(`[Generate] Using Gemini for: ${keywords}`);
      
      const models = ['gemini-2.5-flash'];
      let lastErr = "";
      
      const requestedModels = (feed.ai_model && feed.ai_model.includes('gemini')) 
        ? [feed.ai_model, ...models] 
        : models;

      // Force upgrade of legacy models
      const finalModels = [...new Set(requestedModels.map(m => (m.includes('gemini-1.5') || m.includes('gemini-2.0') || m.includes('gemini-pro') || m === 'gemini-pro') ? 'gemini-2.5-flash' : m))];

      for (const model of finalModels) {
        try {
          console.log(`[Generate] Trying Gemini model: ${model}`);
          const apiVersion = (model.includes('exp') || model.includes('beta')) ? 'v1beta' : 'v1';
          
          const makeRequest = async (v: string) => {
            return await fetch(`https://generativelanguage.googleapis.com/${v}/models/${model}:generateContent?key=${GEMINI_API_KEY}`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                contents: [{ parts: [{ text: `${systemPrompt}\n\nPalavras-chave: ${keywords}` }] }],
                generationConfig: { temperature: 0.7, responseMimeType: "application/json" }
              }),
            });
          };

          let response = await makeRequest(apiVersion);

          if (!response.ok && apiVersion === 'v1beta') {
             const cloned = response.clone();
             const errData = await cloned.json().catch(() => ({}));
             if (errData.error?.message?.includes('not found') || response.status === 404) {
               console.log(`[Generate] Fallback to v1 for model ${model}`);
               response = await makeRequest('v1');
             }
          }

          if (!response.ok) {
            const err = await response.text();
            lastErr = `Erro Gemini (${model}): ${response.status} - ${err}`;
            console.warn(lastErr);
            continue;
          }

          const data = await response.json();
          aiContent = data.candidates?.[0]?.content?.parts?.[0]?.text;
          if (aiContent) break;
        } catch (e: any) {
          lastErr = `Falha Gemini (${model}): ${e.message}`;
          console.warn(lastErr);
        }
      }

      if (!aiContent) throw new Error(`Todas as tentativas com Gemini falharam. Último erro: ${lastErr}`);
    } else if (OPENAI_API_KEY) {
      console.log(`[Generate] Using OpenAI for: ${keywords}`);
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${OPENAI_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: `Palavras-chave: ${keywords}` }
          ],
          response_format: { type: "json_object" }
        }),
      });

      if (!response.ok) {
        const err = await response.text();
        throw new Error(`Erro OpenAI: ${response.status} - ${err}`);
      }

      const data = await response.json();
      aiContent = data.choices[0].message.content;
    }

    if (!aiContent) throw new Error('IA não retornou conteúdo');

    // Robust JSON extraction (removes markdown backticks if present)
    let items;
    const cleanContent = aiContent.replace(/```json/g, '').replace(/```/g, '').trim();
    
    try {
      const firstBrace = cleanContent.indexOf('{');
      const lastBrace = cleanContent.lastIndexOf('}');
      
      if (firstBrace !== -1 && lastBrace !== -1) {
        const jsonString = cleanContent.substring(firstBrace, lastBrace + 1);
        const parsed = JSON.parse(jsonString);
        items = parsed.items;
      } else {
        throw new Error('Formato JSON não encontrado na resposta');
      }
    } catch (e) {
      console.error('Falha ao processar resposta da IA:', aiContent);
      throw new Error(`Erro ao interpretar os itens gerados pela IA.`);
    }

    if (!items || !Array.isArray(items)) throw new Error('Formato de resposta inválido');

    const feedItems = items.map((item: any) => ({
      feed_id: feedId,
      user_id: userId,
      organization_id: feed.organization_id,
      source_title: item.title,
      source_content: item.content,
      slug: item.slug,
      meta_description: item.meta_description,
      tags: item.tags,
      status: 'pending',
      source_url: `https://creative-generation/${Date.now()}/${Math.random().toString(36).substring(7)}`,
    }));

    const { data: inserted, error: insertError } = await supabase
        .from('feed_items')
        .insert(feedItems)
        .select();

    if (insertError) throw insertError;

    return new Response(
      JSON.stringify({ success: true, itemsInserted: inserted?.length || 0 }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('[Generate] Critical Error:', error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
