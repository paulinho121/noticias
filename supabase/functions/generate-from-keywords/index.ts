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

    const systemPrompt = `Você é um editor de conteúdo criativo. Com base nas palavras-chave fornecidas pelo usuário, gere 1 ideia de postagem de alta qualidade.
    
    Se as palavras-chave parecerem relacionadas a RECEITAS, gere uma receita completa (Título e uma breve descrição do prato).
    Se forem relacionadas a MÚSICA/CIFRAS, gere um post sobre uma música específica ou dica de teoria/instrumentos.
    Caso contrário, gere um artigo informativo.

    RETORNE APENAS um JSON válido seguindo esta estrutura:
    {
      "items": [
        { "title": "Título sugerido", "content": "Descrição ou introdução breve do tema" }
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
          to_json: true,
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
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: `${systemPrompt}\n\nPalavras-chave: ${keywords}` }] }],
          generationConfig: { temperature: 0.7, responseMimeType: "application/json" }
        }),
      });

      if (!response.ok) {
        const err = await response.text();
        throw new Error(`Erro Gemini: ${response.status} - ${err}`);
      }

      const data = await response.json();
      aiContent = data.candidates?.[0]?.content?.parts?.[0]?.text;
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
      source_title: item.title,
      source_content: item.content,
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
