import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function isValidPublicUrl(urlStr: string): boolean {
  try {
    const url = new URL(urlStr);
    if (!['http:', 'https:'].includes(url.protocol)) return false;
    const hostname = url.hostname.toLowerCase();
    const isInternal = hostname === 'localhost' || 
                       hostname === '127.0.0.1' || 
                       hostname === '0.0.0.0' ||
                       hostname.startsWith('10.') || 
                       hostname.startsWith('172.16.') || 
                       hostname.startsWith('192.168.') ||
                       hostname.endsWith('.internal') ||
                       hostname.endsWith('.local');
    return !isInternal;
  } catch { return false; }
}

function getHighResImage(url: string | null): string | null {
  if (!url) return url;
  try {
    const urlObj = new URL(url);
    const resizeParams = ['w', 'h', 'resize', 'fit', 'quality', 'zoom', 'width', 'height', 'ssl'];
    
    resizeParams.forEach(p => {
      if (urlObj.searchParams.has(p)) {
        urlObj.searchParams.delete(p);
      }
    });

    let cleaned = urlObj.toString();
    cleaned = cleaned.replace(/-(\d+)x(\d+)(\.(?:jpg|jpeg|png|webp|gif))$/i, '$3');

    return cleaned;
  } catch (e) {
    return url;
  }
}

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

    // 1. Buscar o item
    const { data: item, error: itemError } = await supabase
      .from('feed_items')
      .select('*')
      .eq('id', feedItemId)
      .maybeSingle();

    if (itemError || !item) throw new Error('Item não encontrado');

    // Buscar o feed separadamente para evitar problemas de Join no RLS
    const { data: feed, error: feedError } = await supabase
      .from('feeds')
      .select('post_status, user_id, credit_source, image_credit_text, include_source_link')
      .eq('id', item.feed_id)
      .maybeSingle();

    if (feedError || !feed) throw new Error('Feed do item não encontrado');

    // 2. Buscar as configurações do WordPress do usuário dono do feed
    const { data: wpSettings, error: wpError } = await supabase
      .from('platform_settings')
      .select('*')
      .eq('platform_id', 'wordpress')
      .eq('user_id', item.user_id) 
      .maybeSingle();

    if (wpError || !wpSettings || !wpSettings.is_connected) {
      throw new Error('WordPress não configurado ou desconectado. Verifique a aba Integrações nas Configurações.');
    }

    const { url, username, app_password } = wpSettings.credentials;

    if (!url || !username || !app_password) {
      throw new Error('Credenciais do WordPress incompletas');
    }

    if (!isValidPublicUrl(url)) {
      throw new Error(`URL do WordPress (${url}) bloqueada por segurança. Use apenas endereços públicos.`);
    }

    const auth = btoa(`${username}:${app_password}`);

    console.log(`Publicando no WordPress: ${url} para o usuário ${username}`);

    // 3. (Opcional) Fazer o upload da imagem se houver
    let featuredMediaId = null;
    const imageUrl = getHighResImage(item.rewritten_image || item.source_image);
    
    if (imageUrl) {
      try {
        if (!isValidPublicUrl(imageUrl)) {
          console.warn(`URL da imagem (${imageUrl}) bloqueada por segurança.`);
        } else {
          console.log(`Tentando upload da imagem para WP: ${imageUrl}`);
          const imageRes = await fetch(imageUrl, {
            headers: {
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            }
          });
          const imageBlob = await imageRes.blob();
          const imageName = `image_${Date.now()}.jpg`;
          
          const mediaResponse = await fetch(`${url.replace(/\/$/, '')}/wp-json/wp/v2/media`, {
            method: 'POST',
            headers: {
              'Authorization': `Basic ${auth}`,
              'Content-Type': imageRes.headers.get('Content-Type') || 'image/jpeg',
              'Content-Disposition': `attachment; filename="${imageName}"`,
              'X-Source-Quality': 'original',
            },
            body: imageBlob,
          });
          
          if (mediaResponse.ok) {
            const mediaResult = await mediaResponse.json();
            featuredMediaId = mediaResult.id;
            console.log(`Imagem enviada ao WP com sucesso! ID: ${featuredMediaId}`);
          } else {
            console.warn('Falha ao enviar imagem para o WP, continuando sem imagem destacada.');
          }
        }
      } catch (imgWpError) {
        console.error('Erro no upload de imagem para WP:', imgWpError);
      }
    }

    // 3.5 Buscar mapeamento de categoria se houver
    let wpCategoryIds: number[] = [];
    const { data: feedData, error: feedCatError } = await supabase
      .from('feeds')
      .select('category_id')
      .eq('id', item.feed_id)
      .single();

    if (!feedCatError && feedData?.category_id) {
      const { data: categoryData } = await supabase
        .from('categories')
        .select('external_id')
        .eq('id', feedData.category_id)
        .single();
      
      if (categoryData?.external_id) {
        wpCategoryIds = [parseInt(categoryData.external_id)];
        console.log(`Mapeando post para categoria WP ID: ${categoryData.external_id}`);
      }
    }

    // 3.6 Sincronizar Tags no WordPress
    let wpTagIds: number[] = [];
    if (item.tags && item.tags.length > 0) {
      console.log(`Sincronizando tags no WP: ${item.tags.join(', ')}`);
      for (const tagName of item.tags) {
        try {
          const searchRes = await fetch(`${url.replace(/\/$/, '')}/wp-json/wp/v2/tags?search=${encodeURIComponent(tagName)}`, {
            headers: { 'Authorization': `Basic ${auth}` }
          });
          const searchData = await searchRes.json();
          let tagId = Array.isArray(searchData) ? searchData.find((t: any) => t.name.toLowerCase() === tagName.toLowerCase())?.id : null;
          
          if (!tagId) {
            const createRes = await fetch(`${url.replace(/\/$/, '')}/wp-json/wp/v2/tags`, {
              method: 'POST',
              headers: {
                'Authorization': `Basic ${auth}`,
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({ name: tagName })
            });
            const createData = await createRes.json();
            if (createData.id) tagId = createData.id;
          }
          
          if (tagId) wpTagIds.push(tagId);
        } catch (tagErr) {
          console.error(`Erro ao sincronizar tag ${tagName}:`, tagErr);
        }
      }
    }

    // Limpar marcadores de IA do conteúdo e título
    const aiMarker = /\u200B\u200C\u200B/g;
    let cleanTitle = (item.rewritten_title || item.source_title || "").replace(aiMarker, "");
    let cleanContent = (item.rewritten_content || item.source_content || "").replace(aiMarker, "");
    const cleanDescription = (item.meta_description || "").replace(aiMarker, "");

    // Adicionar vídeo se houver
    if (item.source_video) {
      let videoEmbed = '';
      const videoUrl = item.source_video;
      
      if (videoUrl.includes('youtube.com') || videoUrl.includes('youtu.be')) {
        const vidId = videoUrl.includes('v=') ? videoUrl.split('v=')[1].split('&')[0] : videoUrl.split('/').pop();
        videoEmbed = `<figure class="wp-block-embed is-type-video is-provider-youtube wp-block-embed-youtube wp-embed-aspect-16-9 wp-has-aspect-ratio"><div class="wp-block-embed__wrapper"><iframe title="YouTube video player" src="https://www.youtube.com/embed/${vidId}" width="100%" height="450" frameborder="0" allowfullscreen="allowfullscreen"></iframe></div></figure>`;
      } else {
        videoEmbed = `<figure class="wp-block-video"><video controls src="${videoUrl}" style="width:100%"></video></figure>`;
      }
      
      cleanContent = `${videoEmbed}\n${cleanContent}`;
    }

    // Adicionar Créditos de Imagem se houver
    if (feed.credit_source && feed.image_credit_text && feed.image_credit_text.trim() !== '') {
      const creditsHtml = `<p style="font-size: 11px; color: #666; font-style: italic; margin-top: 5px; margin-bottom: 20px;">Créditos da imagem: ${feed.image_credit_text}</p>`;
      cleanContent = `${creditsHtml}\n${cleanContent}`;
    }

    // Adicionar Link da Fonte se habilitado
    if (feed.include_source_link && item.source_url) {
      try {
        const sourceHostname = new URL(item.source_url).hostname.replace('www.', '');
        const sourceHtml = `<p style="margin-top: 30px; border-top: 1px solid #eee; padding-top: 15px; font-style: italic;">Fonte: <a href="${item.source_url}" target="_blank" rel="noopener noreferrer">${sourceHostname}</a></p>`;
        cleanContent = `${cleanContent}\n${sourceHtml}`;
      } catch (e) {
        console.warn('Erro ao gerar link da fonte:', e);
      }
    }

    // 4. Preparar o corpo do post com SEO completo
    const focusKeyword = item.keywords && item.keywords.length > 0
      ? item.keywords[0]
      : (item.tags && item.tags.length > 0 ? item.tags[0] : "");
    const allKeywords = item.keywords && item.keywords.length > 0
      ? item.keywords.join(', ')
      : focusKeyword;

    // Gera slug SEO-friendly a partir do título se não existir
    const seoSlug = item.slug || cleanTitle
      .toLowerCase()
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9\s-]/g, '')
      .trim()
      .replace(/\s+/g, '-')
      .substring(0, 80);

    const postData: any = {
      title: cleanTitle,
      content: cleanContent,
      excerpt: cleanDescription || undefined,
      slug: seoSlug,
      status: requestedStatus || ((feed.post_status === 'published' || feed.post_status === 'scheduled') ? 'publish' : 'draft'),
      featured_media: featuredMediaId,
      categories: wpCategoryIds,
      tags: wpTagIds,
      format: 'standard',
      // Metadados SEO — aceitos pela REST API quando os campos estão registrados pelo plugin
      meta: {
        // ── Rank Math ──
        rank_math_title:         cleanTitle,
        rank_math_description:   cleanDescription,
        rank_math_focus_keyword: allKeywords,
        rank_math_robots:        'index,follow',
        // ── Yoast SEO ──
        _yoast_wpseo_title:    cleanTitle,
        _yoast_wpseo_metadesc: cleanDescription,
        _yoast_wpseo_focuskw:  focusKeyword,
        // ── SEOPress ──
        _seopress_titles_title: cleanTitle,
        _seopress_titles_desc:  cleanDescription,
        // ── Genérico ──
        meta_description: cleanDescription,
        focus_keyword:    focusKeyword,
      }
    };

    // 5. Fazer o disparo para a REST API do WordPress
    const wpApiUrl = `${url.replace(/\/$/, '')}/wp-json/wp/v2/posts`;

    const wpResponse = await fetch(wpApiUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(postData),
    });

    const wpResult = await wpResponse.json();

    if (!wpResponse.ok) {
      const errorMsg = `Erro WP: ${wpResult.message || wpResponse.statusText}`;
      console.error(errorMsg);
      throw new Error(errorMsg);
    }

    console.log(`Sucesso! ID WP: ${wpResult.id}, Link: ${wpResult.link}`);

    // 5. Injetar SEO via Rank Math REST API (chamada separada, mais confiável)
    // O Rank Math expõe /wp-json/rankmath/v1/updateMeta quando o plugin está ativo
    const wpBase = url.replace(/\/$/, '');
    try {
      const rankMathPayload = {
        objectID:  wpResult.id,
        objectType: 'post',
        meta: {
          'rank_math_title':         cleanTitle,
          'rank_math_description':   cleanDescription,
          'rank_math_focus_keyword': allKeywords,
          'rank_math_robots':        'index,follow',
        }
      };
      const rmRes = await fetch(`${wpBase}/wp-json/rankmath/v1/updateMeta`, {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${auth}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(rankMathPayload),
      });
      if (rmRes.ok) {
        console.log('[SEO] Rank Math meta updated via /rankmath/v1/updateMeta');
      } else {
        const rmErr = await rmRes.text();
        console.warn('[SEO] Rank Math endpoint unavailable, fallback to PATCH meta:', rmErr);

        // Fallback: PATCH direto no post — funciona quando o Rank Math registrou os campos corretamente
        const patchRes = await fetch(`${wpBase}/wp-json/wp/v2/posts/${wpResult.id}`, {
          method: 'PATCH',
          headers: {
            'Authorization': `Basic ${auth}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            meta: {
              rank_math_title:         cleanTitle,
              rank_math_description:   cleanDescription,
              rank_math_focus_keyword: allKeywords,
              rank_math_robots:        'index,follow',
              _yoast_wpseo_title:      cleanTitle,
              _yoast_wpseo_metadesc:   cleanDescription,
              _yoast_wpseo_focuskw:    focusKeyword,
              _seopress_titles_title:  cleanTitle,
              _seopress_titles_desc:   cleanDescription,
            }
          }),
        });
        if (patchRes.ok) {
          console.log('[SEO] Meta updated via PATCH fallback.');
        } else {
          console.warn('[SEO] PATCH meta also failed. SEO plugin may need manual configuration.');
        }
      }
    } catch (seoErr) {
      console.warn('[SEO] Error updating Rank Math meta (non-fatal):', seoErr);
    }

    // 6. Atualizar o item e logar sucesso
    const { error: updateError } = await supabase
      .from('feed_items')
      .update({ 
        status: 'published',
        processed_at: new Date().toISOString(),
        published_url: wpResult.link
      })
      .eq('id', feedItemId);

    if (updateError) {
      console.error('Erro ao atualizar feed_item no banco:', updateError);
    }

    await supabase.from('logs').insert({
      feed_id: item.feed_id,
      user_id: item.user_id, 
      feed_item_id: feedItemId,
      status: updateError ? 'warning' : 'success',
      step: 'wordpress_publish',
      message: updateError 
        ? `Post publicado no WP (${wpResult.id}), mas erro ao atualizar banco: ${updateError.message}`
        : `Post publicado com sucesso no WordPress! ID WP: ${wpResult.id} | SEO: title+desc+keywords`,
    });

    return new Response(
      JSON.stringify({ success: true, wp_id: wpResult.id, link: wpResult.link }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('ERRO FATAL WordPress:', error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
