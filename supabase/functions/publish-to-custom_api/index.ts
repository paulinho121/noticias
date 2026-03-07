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
    const { feedItemId, status: requestedStatus } = await req.json();

    if (!feedItemId) {
      throw new Error('feedItemId is required');
    }

    const supabaseUrl = Deno.env.get('SITE_URL') || Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('MASTER_KEY') || Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // 1. Fetch item
    const { data: item, error: itemError } = await supabase
      .from('feed_items')
      .select('*')
      .eq('id', feedItemId)
      .maybeSingle();

    if (itemError || !item) throw new Error('Item não encontrado');

    const { data: feed, error: feedError } = await supabase
      .from('feeds')
      .select('user_id')
      .eq('id', item.feed_id)
      .maybeSingle();

    if (feedError || !feed) throw new Error('Feed do item não encontrado');

    // 2. Fetch custom_api settings
    const { data: apiSettings, error: apiError } = await supabase
      .from('platform_settings')
      .select('*')
      .eq('platform_id', 'custom_api')
      .eq('user_id', feed.user_id) 
      .maybeSingle();

    if (apiError || !apiSettings || !apiSettings.is_connected) {
      throw new Error('Webhook/API Externa não configurada ou desconectada. Verifique as Integrações.');
    }

    const { webhook_url, auth_header } = apiSettings.credentials;

    if (!webhook_url) {
      throw new Error('URL do Webhook não fornecida nas configurações da integração.');
    }

    let final_url = webhook_url;
    // Map localhost to host.docker.internal for local testing with Supabase Deno container
    if (final_url.includes('localhost') || final_url.includes('127.0.0.1')) {
       final_url = final_url.replace('localhost', 'host.docker.internal').replace('127.0.0.1', 'host.docker.internal');
    }

    // Prepare headers
    const headers: Record<string, string> = {
      'Content-Type': 'application/json'
    };
    
    // Parse custom auth header if present
    if (auth_header && auth_header.includes(':')) {
      const parts = auth_header.split(':');
      const headerName = parts[0].trim();
      const headerVal = parts.slice(1).join(':').trim();
      headers[headerName] = headerVal;
    }

    // Clean markers
    const aiMarker = /\u200B\u200C\u200B/g;
    const cleanTitle = (item.rewritten_title || item.source_title || "").replace(aiMarker, "");
    const cleanContent = (item.rewritten_content || item.source_content || "").replace(aiMarker, "");
    const cleanDescription = (item.meta_description || "").replace(aiMarker, "");

    // Prepare payload
    const payload = {
      event: 'post_created',
      timestamp: new Date().toISOString(),
      post: {
        id: item.id,
        title: cleanTitle,
        content: cleanContent,
        excerpt: cleanDescription,
        slug: item.slug || cleanTitle.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^\w ]+/g, '').replace(/ +/g, '-'),
        image_url: item.rewritten_image || item.source_image,
        tags: item.tags || [],
        keywords: item.keywords || [],
        source_url: item.source_url,
        published_at: item.published_at,
        original_title: item.source_title
      }
    };

    console.log(`Enviando POST para webhook: ${final_url}`);

    const response = await fetch(final_url, {
      method: 'POST',
      headers: headers,
      body: JSON.stringify(payload)
    });

    const respText = await response.text();
    
    if (!response.ok) {
        throw new Error(`Webhook respondeu com status ${response.status}: ${respText}`);
    }

    console.log("Sucesso ao enviar webhook:", respText.substring(0, 500));
    
    // Attempt parse to check if API returned an ID
    let externalUrl = null;
    try {
        const respJson = JSON.parse(respText);
        if (respJson.url || respJson.link) {
            externalUrl = respJson.url || respJson.link;
        }
    } catch(e) {}

    // 6. Update item status
    const { error: updateError } = await supabase
      .from('feed_items')
      .update({ 
        status: 'published',
        processed_at: new Date().toISOString(),
        published_url: externalUrl || webhook_url
      })
      .eq('id', feedItemId);

    if (updateError) {
      console.error('Erro ao atualizar feed_item:', updateError);
    }

    await supabase.from('logs').insert({
      feed_id: item.feed_id,
      user_id: feed.user_id, 
      feed_item_id: feedItemId,
      status: updateError ? 'warning' : 'success',
      step: 'custom_api_publish',
      message: `Conteúdo enviado ao Webhook com sucesso!`
    });

    return new Response(
      JSON.stringify({ success: true, link: externalUrl || webhook_url }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('ERRO Webhook API:', error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
