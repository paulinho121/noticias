import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { feedItemId, status: requestedStatus } = await req.json();
    if (!feedItemId) throw new Error('feedItemId é obrigatório');

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Buscar o item
    const { data: item, error: itemError } = await supabase
      .from('feed_items')
      .select('*')
      .eq('id', feedItemId)
      .maybeSingle();

    if (itemError || !item) throw new Error('Item não encontrado');

    // Buscar o feed
    const { data: feed } = await supabase
      .from('feeds')
      .select('post_status, user_id')
      .eq('id', item.feed_id)
      .maybeSingle();

    // Buscar credenciais Wix
    const { data: wixSettings } = await supabase
      .from('platform_settings')
      .select('*')
      .eq('platform_id', 'wix')
      .eq('user_id', item.user_id)
      .maybeSingle();

    if (!wixSettings?.is_connected) {
      throw new Error('Wix não configurado. Configure nas Integrações.');
    }

    const { api_key, site_id } = wixSettings.credentials;
    if (!api_key || !site_id) throw new Error('Credenciais Wix incompletas (api_key e site_id obrigatórios).');

    // Limpar conteúdo
    const aiMarker = /\u200B\u200C\u200B/g;
    const cleanTitle       = (item.rewritten_title || item.source_title || "").replace(aiMarker, "");
    const cleanContent     = (item.rewritten_content || item.source_content || "").replace(aiMarker, "");
    const cleanDescription = (item.meta_description || "").replace(aiMarker, "");

    // SEO fields
    const focusKeyword = item.keywords?.length > 0
      ? item.keywords[0]
      : (item.tags?.length > 0 ? item.tags[0] : "");
    const allKeywords = item.keywords?.length > 0
      ? item.keywords.join(', ')
      : focusKeyword;

    // Gerar slug
    const seoSlug = item.slug || cleanTitle
      .toLowerCase()
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9\s-]/g, '')
      .trim()
      .replace(/\s+/g, '-')
      .substring(0, 80);

    const publishStatus = requestedStatus === 'publish' || 
      feed?.post_status === 'published' || 
      feed?.post_status === 'scheduled' ? 'PUBLISHED' : 'DRAFT';

    // Build Wix Blog post payload
    // Doc: https://dev.wix.com/docs/rest/business-solutions/blog/blog-posts/create-draft-post
    const wixPayload = {
      post: {
        title: cleanTitle,
        richContent: {
          nodes: [
            {
              type: "PARAGRAPH",
              nodes: cleanContent.replace(/<[^>]*>/g, '').split('\n').filter(Boolean).map(text => ({
                type: "TEXT",
                textData: { text, decorations: [] }
              }))
            }
          ]
        },
        excerpt: cleanDescription,
        commentingEnabled: true,
        seoData: {
          tags: [
            { type: "title",       children: cleanTitle, custom: false, disabled: false },
            { type: "meta",        props: { name: "description", content: cleanDescription }, custom: false, disabled: false },
            { type: "meta",        props: { name: "keywords",    content: allKeywords },      custom: false, disabled: false },
            { type: "meta",        props: { property: "og:title",       content: cleanTitle },       custom: false, disabled: false },
            { type: "meta",        props: { property: "og:description",  content: cleanDescription }, custom: false, disabled: false },
          ]
        },
        ...(item.rewritten_image || item.source_image
          ? { coverMedia: { image: { url: item.rewritten_image || item.source_image } } }
          : {}),
        ...(item.tags?.length > 0
          ? { tagIds: [] } // Tags gerenciadas separadamente no Wix
          : {}),
      }
    };

    // 1. Criar o draft post
    const draftRes = await fetch(`https://www.wixapis.com/blog/v3/draft-posts`, {
      method: 'POST',
      headers: {
        'Authorization': api_key,
        'wix-site-id': site_id,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(wixPayload),
    });

    const draftData = await draftRes.json();
    if (!draftRes.ok) {
      throw new Error(`Erro Wix ao criar draft: ${draftData?.message || draftRes.status}`);
    }

    const draftId = draftData.draftPost?.id;
    if (!draftId) throw new Error('Wix não retornou ID do draft.');

    console.log(`[WIX] Draft criado: ${draftId}`);

    // 2. Publicar se necessário
    let publishedPostId = draftId;
    let publishedUrl = '';

    if (publishStatus === 'PUBLISHED') {
      const pubRes = await fetch(`https://www.wixapis.com/blog/v3/draft-posts/${draftId}/publish`, {
        method: 'POST',
        headers: {
          'Authorization': api_key,
          'wix-site-id': site_id,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({}),
      });
      const pubData = await pubRes.json();
      if (!pubRes.ok) {
        console.warn('[WIX] Falha ao publicar, ficou como draft:', pubData);
      } else {
        publishedPostId = pubData.post?.id || draftId;
        publishedUrl = pubData.post?.url || '';
        console.log(`[WIX] Publicado! ID: ${publishedPostId} | URL: ${publishedUrl}`);
      }
    }

    // 3. Atualizar banco
    await supabase.from('feed_items').update({
      status: publishStatus === 'PUBLISHED' ? 'published' : 'draft',
      processed_at: new Date().toISOString(),
      published_url: publishedUrl || undefined,
    }).eq('id', feedItemId);

    await supabase.from('logs').insert({
      feed_id: item.feed_id,
      user_id: item.user_id,
      feed_item_id: feedItemId,
      status: 'success',
      step: 'wix_publish',
      message: `Post publicado no Wix! ID: ${publishedPostId} | SEO: title+desc+keywords preenchidos`,
    });

    return new Response(JSON.stringify({
      success: true,
      wix_id: publishedPostId,
      link: publishedUrl,
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 });

  } catch (error: any) {
    console.error('[WIX] Fatal Error:', error);
    return new Response(JSON.stringify({ success: false, error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 });
  }
});
