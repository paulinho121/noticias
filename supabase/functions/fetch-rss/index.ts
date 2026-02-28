import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface RSSItem {
  title: string;
  link: string;
  description: string;
  pubDate?: string;
  image?: string;
  content?: string;
  video?: string;
}

function decodeHTMLEntities(text: string): string {
  return text
    .replace(/&#(\d+);/g, (match, dec) => String.fromCharCode(dec))
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&apos;/g, "'")
    .replace(/&nbsp;/g, ' ');
}

function getHighResImage(url: string | null): string | null {
  if (!url) return url;
  
  // Anti-Bloqueio: Se for link expirado ou URL assinada que PRECISA de parâmetros, NÃO TOCAR.
  if (url.includes('oaidalleapiprodscus.blob.core.windows.net') || 
      url.includes('glbimg.com') || 
      url.includes('fbcdn.net') || 
      url.includes('googleusercontent.com') ||
      url.includes('wp-content')) {
    return url;
  }

  try {
    const urlObj = new URL(url);
    const resizeParams = ['w', 'h', 'resize', 'fit', 'quality', 'zoom', 'width', 'height'];
    resizeParams.forEach(p => { if (urlObj.searchParams.has(p)) urlObj.searchParams.delete(p); });
    let cleaned = urlObj.toString();
    cleaned = cleaned.replace(/-(\d+)x(\d+)(\.(?:jpg|jpeg|png|webp|gif))$/i, '$3');
    return cleaned;
  } catch (e) { return url; }
}

function parseRSS(xml: string): RSSItem[] {
  const items: RSSItem[] = [];
  
  // Suporte para <item> (RSS) e <entry> (Atom)
  const itemRegex = /<(item|entry)[^>]*>([\s\S]*?)<\/\1>/gi;
  let itemMatch;
  
  while ((itemMatch = itemRegex.exec(xml)) !== null) {
    const itemContent = itemMatch[2];
    
    // Extract title - mais robusto para namespaces e CDATA
    const titleMatch = itemContent.match(/<title[^>]*>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/title>/i);
    let title = titleMatch ? titleMatch[1].trim().replace(/<!\[CDATA\[|\]\]>/g, '') : '';
    title = decodeHTMLEntities(title);
    
    // Extract link - suporte para <link>...</link> e <link href="..."/>
    let link = '';
    const linkTagMatch = itemContent.match(/<link[^>]*>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/link>/i);
    if (linkTagMatch && linkTagMatch[1].trim()) {
      link = linkTagMatch[1].trim().replace(/<!\[CDATA\[|\]\]>/g, '');
    } else {
      const hrefMatch = itemContent.match(/<link[^>]*href=["']([^"']+)["'][^>]*>/i);
      link = hrefMatch ? hrefMatch[1] : '';
    }
    
    // Extract content - preferir content:encoded sobre description/summary
    const contentEncodedMatch = itemContent.match(/<content:encoded[^>]*>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/content:encoded>/i);
    const contentMatch = itemContent.match(/<content[^>]*>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/content>/i);
    const summaryMatch = itemContent.match(/<summary[^>]*>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/summary>/i);
    const descTagMatch = itemContent.match(/<description[^>]*>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/description>/i);
    
    let rawDescription = contentEncodedMatch?.[1] || contentMatch?.[1] || descTagMatch?.[1] || summaryMatch?.[1] || "";
    let description = decodeHTMLEntities(rawDescription.trim().replace(/<!\[CDATA\[|\]\]>/g, ''));
    
    // Extract date
    const dateMatch = itemContent.match(/<(pubDate|published|updated|dc:date)[^>]*>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/\1>/i);
    const pubDate = dateMatch ? dateMatch[2].trim() : undefined;

    // Extract image (suporte para media:content, media:thumbnail, enclosure, og:image, etc)
    let image = '';
    
    // 1. Try media:content or enclosure tags (usually higher res)
    const mediaContentMatch = itemContent.match(/<(media:content|enclosure|media:image)[^>]*url=["']([^"']+)["'][^>]*>/i);
    if (mediaContentMatch) {
      image = mediaContentMatch[2];
    } else {
      // 1b. Try media:thumbnail if no content tag
      const thumbMatch = itemContent.match(/<media:thumbnail[^>]*url=["']([^"']+)["'][^>]*>/i);
      if (thumbMatch) {
        image = thumbMatch[1];
      }
    }
    
    // 2. Try to find image in description/content if not found yet
    if (!image) {
      const imgTagMatch = itemContent.match(/<img[^>]*src=["']([^"']+)["'][^>]*>/i);
      if (imgTagMatch) {
        image = imgTagMatch[1];
      }
    }
    
    // 3. Fallback to image tag (common in some feeds)
    if (!image) {
      const imgMatch = itemContent.match(/<image[^>]*>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/image>/i);
      if (imgMatch) {
        image = imgMatch[1].trim().replace(/<!\[CDATA\[|\]\]>/g, '');
      }
    }

    // Final cleanup for high resolution
    if (image) {
      image = getHighResImage(image) || '';
    }

    // Extract video (enclosure, media:content, or iframe in description)
    let video = '';
    
    // 1. Enclosure video
    const enclVideoMatch = itemContent.match(/<enclosure[^>]*url=["']([^"']+)["'][^>]*type=["']video\/[^"']+["'][^>]*>/i);
    if (enclVideoMatch) {
      video = enclVideoMatch[1];
    }
    
    // 2. Media:content video
    if (!video) {
        const mediaVidMatch = itemContent.match(/<media:content[^>]*url=["']([^"']+)["'][^>]*medium=["']video["'][^>]*>/i) ||
                             itemContent.match(/<media:content[^>]*medium=["']video["'][^>]*url=["']([^"']+)["'][^>]*>/i);
        if (mediaVidMatch) {
            video = mediaVidMatch[1] || mediaVidMatch[2];
        }
    }
    
    // 3. Iframe in description (YouTube, etc)
    if (!video) {
        const iframeMatch = description.match(/<iframe[^>]*src=["']([^"']+)["'][^>]*><\/iframe>/i) ||
                            description.match(/<iframe[^>]*src=["']([^"']+)["'][^>]*>/i);
        if (iframeMatch) {
            video = iframeMatch[1];
        }
    }

    if (video && !isValidPublicUrl(video)) {
        video = '';
    }

    if (title && link) {
      items.push({ title, link, description, pubDate, image, video });
    }
  }
  
  return items;
}

function stripHtml(html: string): string {
  if (!html) return '';
  
  // Lista de termos e padrões de lixo/publicidade para remover
  const junkPatterns = [
    /CONTINUA DEPOIS DA PUBLICIDADE/gi,
    /Publicidade/gi,
    /Leia mais/gi,
    /Confira também/gi,
    /Assine a nossa newsletter/gi,
    /Siga-nos nas redes sociais/gi,
    /Imagem ilustrativa/gi
  ];

  let cleaned = html
    .replace(/<script[^>]*>([\s\S]*?)<\/script>/gi, '') // Remover scripts
    .replace(/<style[^>]*>([\s\S]*?)<\/style>/gi, '')   // Remover estilos
    .replace(/<iframe[^>]*>([\s\S]*?)<\/iframe>/gi, '') // Remover iframes/ads
    .replace(/<aside[^>]*>([\s\S]*?)<\/aside>/gi, '')   // Remover barras laterais
    .replace(/<figure[^>]*>([\s\S]*?)<\/figure>/gi, '') // Remover figuras/legendas
    .replace(/<[^>]*>/g, ' ');                           // Remover outras tags, mantendo espaço

  // Aplicar limpeza de padrões de lixo
  junkPatterns.forEach(pattern => {
    cleaned = cleaned.replace(pattern, '');
  });

  return cleaned
    .replace(/\s+/g, ' ') // Normalizar espaços
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .trim();
}

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

async function fetchFullContent(url: string): Promise<{ content: string | null, image: string | null }> {
  try {
    if (!isValidPublicUrl(url)) {
      console.warn(`[DeepScraper] URL bloqueada por motivos de segurança: ${url}`);
      return { content: null, image: null };
    }
    console.log(`[DeepScraper] Fetching full content from: ${url}`);
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      }
    });
    
    if (!response.ok) return { content: null, image: null };
    const html = await response.text();
    
    // 1. Extração de Imagem (og:image ou twitter:image)
    let scrapedImage = null;
    const ogImageMatch = html.match(/<meta[^>]*property=["']og:image["'][^>]*content=["']([^"']+)["'][^>]*>/i) ||
                         html.match(/<meta[^>]*content=["']([^"']+)["'][^>]*property=["']og:image["'][^>]*>/i);
    
    if (ogImageMatch) {
      scrapedImage = ogImageMatch[1];
    } else {
      const twitterImageMatch = html.match(/<meta[^>]*name=["']twitter:image["'][^>]*content=["']([^"']+)["'][^>]*>/i);
      if (twitterImageMatch) {
        scrapedImage = twitterImageMatch[1];
      } else {
        // Fallback: Tentar encontrar a primeira imagem grande no corpo do HTML
        const bodyImgMatch = html.match(/<img[^>]*src=["']([^"']+\.(?:jpg|jpeg|png|webp))["'][^>]*>/i);
        if (bodyImgMatch) {
          scrapedImage = bodyImgMatch[1];
        }
      }
    }

    // 2. Extração básica de parágrafos significativos
    const pRegex = /<p[^>]*>([\s\S]*?)<\/p>/gi;
    let paragraphs = [];
    let match;
    
    while ((match = pRegex.exec(html)) !== null) {
      const pText = stripHtml(match[1]);
      // Ignorar parágrafos muito curtos ou que parecem lixo informativo
      if (pText.length > 60 && 
          !pText.includes('Copyright') && 
          !pText.includes('Todos os direitos') &&
          !pText.includes('cookies')) {
        paragraphs.push(pText);
      }
    }
    
    return {
      content: paragraphs.length > 2 ? paragraphs.join('\n\n') : null,
      image: scrapedImage ? getHighResImage(scrapedImage) : null
    };
  } catch (err) {
    console.error(`[DeepScraper] Error scraping ${url}:`, err);
    return { content: null, image: null };
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { feedId, feedUrl } = await req.json();
    
    // SSRF Protection: Validate the feed URL before fetching
    if (!isValidPublicUrl(feedUrl)) {
      console.error(`[FetchRSS] Bloqueado: URL inválida ou interna: ${feedUrl}`);
      return new Response(
        JSON.stringify({ success: false, error: 'URL do feed é inválida ou proibida por motivos de segurança.' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!feedId || !feedUrl) {
      return new Response(
        JSON.stringify({ success: false, error: 'feedId and feedUrl are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[FetchRSS] Ingesting: ${feedUrl}`);

    // Fetch the RSS feed with more headers
    const response = await fetch(feedUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'application/rss+xml, application/xml, text/xml, application/atom+xml, */*',
        'Cache-Control': 'no-cache'
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch RSS: ${response.status} ${response.statusText}`);
    }

    const xml = await response.text();
    console.log(`[FetchRSS] Received ${xml.length} bytes. Parsing...`);

    // Parse the RSS
    const items = parseRSS(xml);
    console.log(`[FetchRSS] Identified ${items.length} items`);

    if (items.length === 0) {
      console.warn(`[FetchRSS] Zero items found. XML preview: ${xml.substring(0, 500)}`);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Nenhuma reportagem encontrada no feed. O formato pode ser incompatível.',
          debug_xml_start: xml.substring(0, 500)
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Initialize Supabase client with robust fallbacks
    const PROJECT_REF = "aozbgeguelpphxhptrwy";
    const supabaseUrl = Deno.env.get('SUPABASE_URL') || `https://${PROJECT_REF}.supabase.co`;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || Deno.env.get('MASTER_KEY') || Deno.env.get('SUPABASE_ANON_KEY');
    
    if (!supabaseUrl) throw new Error('SUPABASE_URL não configurada no ambiente da função.');
    if (!supabaseKey) throw new Error('SUPABASE_KEY não encontrada (SERVICE_ROLE, MASTER ou ANON).');
    
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get feed metadata including user/org for isolation
    // Selecionamos '*' para evitar erro se 'user_id' não existir (pode ser 'author_id')
    const { data: feed, error: feedError } = await supabase
      .from('feeds')
      .select('*')
      .eq('id', feedId)
      .maybeSingle();

    if (feedError || !feed) {
      console.error(`[FetchRSS] Feed metadata error:`, feedError);
      throw new Error(`Feed não encontrado no banco de dados (${feedId}). Erro: ${feedError?.message || 'Nenhum dado'}`);
    }

    const feedOwnerId = feed.user_id || feed.author_id || null;
    const feedOrgId = feed.organization_id || null;

    // Insert items into feed_items table
    const feedItems = await Promise.all(items.slice(0, 1).map(async (item) => {
      let finalContent = item.description;
      
      // Heurística de Truncamento: Se o texto for curto e terminar em reticências ou for claramente um snippet
      const isTruncated = finalContent.length < 500 || 
                          finalContent.trim().endsWith('...') || 
                          finalContent.toLowerCase().includes('leia mais') ||
                          finalContent.toLowerCase().includes('confira');

      const needsDeepScrape = (isTruncated || !item.image) && item.link;

      if (needsDeepScrape) {
        console.log(`[FetchRSS] Tentando Deep Extraction para: ${item.title}...`);
        const result = await fetchFullContent(item.link);
        
        if (isTruncated && result.content && result.content.length > finalContent.length) {
          finalContent = result.content;
          console.log(`[FetchRSS] Deep Content Extraction bem sucedida`);
        }
        
        if (!item.image && result.image) {
          item.image = result.image;
          console.log(`[FetchRSS] Imagem extraída da página: ${item.image}`);
        }
      }

      return {
        feed_id: feedId,
        user_id: feedOwnerId,
        organization_id: feedOrgId,
        source_url: item.link,
        source_title: stripHtml(item.title),
        source_content: finalContent,
        source_video: item.video,
        source_image: item.image,
        source_pub_date: item.pubDate ? (isNaN(Date.parse(item.pubDate)) ? null : new Date(item.pubDate).toISOString()) : null,
        status: 'pending',
      };
    }));

    console.log(`[FetchRSS] Upserting ${feedItems.length} items to database...`);

    // IMPORTANT: Regra Inquebrável - Jamais repuxar a mesma postagem.
    // Usamos ignoreDuplicates para que, se a URL já existir no banco, ela seja sumariamente ignorada
    // e seu status atual (seja pending, ready ou published) permaneça intacto.
    const { data: insertedItems, error: insertError } = await supabase
      .from('feed_items')
      .upsert(feedItems, { 
        onConflict: 'feed_id,source_url',
        ignoreDuplicates: true
      })
      .select();

    if (insertError) {
      console.error('[FetchRSS] Database Insert Error:', insertError);
      throw new Error(`Erro ao salvar itens: ${insertError.message}`);
    }

    const itemsProcessed = insertedItems?.length || 0;
    console.log(`[FetchRSS] Sucesso! ${itemsProcessed} itens processados.`);

    // Log the fetch operation
    await supabase.from('logs').insert({
      feed_id: feedId,
      user_id: feedOwnerId,
      organization_id: feedOrgId,
      source_url: feedUrl,
      source_title: 'Sincronização de Feed',
      status: 'success',
      step: 'fetch_rss',
      message: `Feed lido com sucesso: ${items.length} notícias encontradas (${itemsProcessed} prontas para reescrita).`,
    });

    return new Response(
      JSON.stringify({ 
        success: true, 
        itemsFound: items.length,
        itemsProcessed: itemsProcessed, // Changed from itemsInserted
        processedItems: insertedItems // Changed from items
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
