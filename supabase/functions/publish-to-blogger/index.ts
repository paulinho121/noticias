import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  console.log("[Blogger] Request received:", req.method);
  
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const rawBody = await req.text();
    console.log("[Blogger] Raw body:", rawBody);
    
    let body;
    try {
      body = JSON.parse(rawBody);
    } catch (e) {
      throw new Error(`Invalid JSON body: ${rawBody}`);
    }

    const { feedItemId } = body;
    if (!feedItemId) {
      throw new Error('feedItemId is required');
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Environment variables SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY are missing');
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // 1. Buscar o item
    console.log("[Blogger] Fetching item:", feedItemId);
    const { data: item, error: itemError } = await supabase
      .from('feed_items')
      .select('*, feeds(*)')
      .eq('id', feedItemId)
      .maybeSingle();

    if (itemError) throw new Error(`Database error fetching item: ${itemError.message}`);
    if (!item) throw new Error('Item not found');

    // 2. Buscar as configurações do Blogger
    console.log("[Blogger] Fetching settings for user:", item.user_id);
    const { data: bloggerSettings, error: bloggerError } = await supabase
      .from('platform_settings')
      .select('*')
      .eq('platform_id', 'blogger')
      .eq('user_id', item.user_id) 
      .maybeSingle();

    if (bloggerError) throw new Error(`Database error fetching settings: ${bloggerError.message}`);
    if (!bloggerSettings || !bloggerSettings.is_connected) {
      throw new Error('Blogger não configurado ou desconectado nas Configurações.');
    }

    const credentials = bloggerSettings.credentials || {};
    const posting_email = credentials.posting_email;
    const blog_id = credentials.blog_id;

    if (!posting_email) {
      throw new Error('E-mail secreto de postagem não encontrado nas configurações.');
    }

    console.log(`[Blogger] Preparing email for: ${posting_email}`);

    // 3. Preparar o conteúdo
    const title = item.rewritten_title || item.source_title;
    let content = item.rewritten_content || item.source_content || "";
    const imageUrl = item.rewritten_image || item.source_image;

    if (imageUrl) {
        let creditsHtml = '';
        if (item.feeds.credit_source && item.feeds.image_credit_text) {
          creditsHtml = `<p style="font-size: 10px; color: #666; font-style: italic; margin-top: 5px; margin-bottom: 20px;">Créditos da imagem: ${item.feeds.image_credit_text}</p>`;
        }
        content = `<img src="${imageUrl}" style="max-width:100%; height:auto; margin-bottom:5px;" />\n${creditsHtml}\n<br/>${content}`;
    }

    // Adicionar Link da Fonte se habilitado
    if (item.feeds.include_source_link && item.source_url) {
        try {
            const host = new URL(item.source_url).hostname.replace('www.', '');
            const sourceHtml = `<p style="margin-top: 30px; padding-top: 15px; border-top: 1px solid #eeeeee; font-style: italic;">Fonte: <a href="${item.source_url}">${host}</a></p>`;
            content = `${content}\n${sourceHtml}`;
        } catch (e) {
            console.warn("[Blogger] Erro ao extrair host da fonte:", e);
        }
    }

    // 4. Enviar via Resend
    const resendApiKey = Deno.env.get('RESEND_API_KEY');
    if (!resendApiKey) {
        throw new Error('Chave do Resend (RESEND_API_KEY) não configurada no Supabase.');
    }

    console.log("[Blogger] Sending email via Resend...");
    const emailResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${resendApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'Notícias AI <onboarding@resend.dev>',
        to: [posting_email],
        subject: item.tags && item.tags.length > 0 ? `${title} [${item.tags.join(', ')}]` : title,
        html: content,
      }),
    });

    if (!emailResponse.ok) {
        const errorData = await emailResponse.json().catch(() => ({}));
        throw new Error(`Erro no Resend: ${errorData.message || emailResponse.statusText}`);
    }

    const emailResult = await emailResponse.json();
    console.log("[Blogger] Email sent successfully:", emailResult.id);

    // 5. Atualizar item e registrar log
    const { error: updateError } = await supabase
      .from('feed_items')
      .update({ 
        status: 'published',
        processed_at: new Date().toISOString(),
        published_url: credentials.public_url || `https://www.blogger.com/blog/posts/${blog_id}`
      })
      .eq('id', feedItemId);

    if (updateError) console.error("[Blogger] Error updating item status:", updateError);

    await supabase.from('logs').insert({
      feed_id: item.feed_id,
      user_id: item.user_id, 
      feed_item_id: feedItemId,
      status: 'success',
      step: 'blogger_publish',
      message: `Post publicado via e-mail para o Blogger!`,
    }).catch((e: any) => console.error("[Blogger] Logging error:", e));

    return new Response(
      JSON.stringify({ success: true, email_id: emailResult.id }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('[Blogger Publish Global Error]:', error.message);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
