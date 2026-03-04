import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

type NotificationType = 'error_alert' | 'post_published' | 'daily_summary';

interface NotificationPayload {
  type: NotificationType;
  organizationId?: string;
  subject?: string;
  data?: Record<string, any>;
}

function buildEmailHtml(type: NotificationType, data: Record<string, any> = {}, orgName = 'seu sistema'): { subject: string; html: string } {
  const brand = `
    <div style="background:#0f1420;padding:24px 32px;border-radius:12px 12px 0 0;border-bottom:1px solid #1e293b;">
      <span style="font-size:20px;font-weight:900;color:#ffffff;letter-spacing:-0.5px;">
        ⚡ ${orgName}
      </span>
    </div>
  `;
  const footer = `
    <div style="background:#0a0e1a;padding:16px 32px;border-radius:0 0 12px 12px;border-top:1px solid #1e293b;text-align:center;">
      <p style="color:#475569;font-size:11px;margin:0;">
        Você recebe este e-mail porque está cadastrado em ${orgName}. 
        <a href="#" style="color:#6366f1;text-decoration:none;">Gerenciar preferências</a>
      </p>
    </div>
  `;

  if (type === 'error_alert') {
    return {
      subject: `🚨 Alerta de erro — ${orgName}`,
      html: `
        <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;background:#080c14;padding:24px;">
          <div style="max-width:560px;margin:0 auto;">
            ${brand}
            <div style="background:#0f1420;padding:32px;border-radius:0;border:1px solid #1e293b;border-top:none;border-bottom:none;">
              <div style="background:#ff433420;border:1px solid #ff433430;border-radius:8px;padding:16px;margin-bottom:24px;">
                <p style="color:#ff4334;font-weight:700;font-size:14px;margin:0 0 4px;">⚠️ Erro detectado no sistema</p>
                <p style="color:#ff433480;font-size:12px;margin:0;">${new Date().toLocaleString('pt-BR')}</p>
              </div>
              <p style="color:#94a3b8;font-size:14px;line-height:1.6;">
                <strong style="color:#e2e8f0;">Operação:</strong> ${data.operation || 'Processamento de Feed'}<br/>
                <strong style="color:#e2e8f0;">Erro:</strong> ${data.error || 'Erro desconhecido'}<br/>
                ${data.feed_name ? `<strong style="color:#e2e8f0;">Feed:</strong> ${data.feed_name}<br/>` : ''}
              </p>
              <a href="${data.dashboard_url || 'https://app.labcreatorai.com'}" 
                 style="display:inline-block;margin-top:20px;background:#6366f1;color:#fff;font-weight:700;font-size:13px;padding:12px 24px;border-radius:8px;text-decoration:none;">
                Ver no Dashboard →
              </a>
            </div>
            ${footer}
          </div>
        </div>
      `
    };
  }

  if (type === 'post_published') {
    return {
      subject: `✅ Post publicado — ${data.title || 'Novo conteúdo'} | ${orgName}`,
      html: `
        <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;background:#080c14;padding:24px;">
          <div style="max-width:560px;margin:0 auto;">
            ${brand}
            <div style="background:#0f1420;padding:32px;border:1px solid #1e293b;border-top:none;border-bottom:none;">
              <div style="background:#00b38620;border:1px solid #00b38630;border-radius:8px;padding:16px;margin-bottom:24px;">
                <p style="color:#00b386;font-weight:700;font-size:14px;margin:0 0 4px;">✅ Publicação bem-sucedida!</p>
                <p style="color:#00b38680;font-size:12px;margin:0;">${new Date().toLocaleString('pt-BR')}</p>
              </div>
              ${data.image_url ? `<img src="${data.image_url}" alt="capa" style="width:100%;border-radius:8px;margin-bottom:16px;object-fit:cover;max-height:200px;"/>` : ''}
              <h2 style="color:#ffffff;font-size:18px;font-weight:800;margin:0 0 8px;">${data.title || 'Sem título'}</h2>
              <p style="color:#64748b;font-size:11px;margin:0 0 16px;">
                Publicado em: <strong style="color:#94a3b8;">${data.platform || 'Plataforma'}</strong>
              </p>
              <p style="color:#94a3b8;font-size:13px;line-height:1.6;">${data.excerpt || ''}</p>
              ${data.post_url ? `
                <a href="${data.post_url}" style="display:inline-block;margin-top:20px;background:#6366f1;color:#fff;font-weight:700;font-size:13px;padding:12px 24px;border-radius:8px;text-decoration:none;">
                  Ver post publicado →
                </a>
              ` : ''}
            </div>
            ${footer}
          </div>
        </div>
      `
    };
  }

  // daily_summary
  return {
    subject: `📊 Resumo diário — ${orgName}`,
    html: `
      <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;background:#080c14;padding:24px;">
        <div style="max-width:560px;margin:0 auto;">
          ${brand}
          <div style="background:#0f1420;padding:32px;border:1px solid #1e293b;border-top:none;border-bottom:none;">
            <p style="color:#94a3b8;font-size:14px;margin:0 0 24px;">
              Aqui está o resumo de atividades de <strong style="color:#e2e8f0;">${new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}</strong>:
            </p>
            <div style="display:flex;gap:12px;margin-bottom:24px;">
              ${[
                { label: 'Posts gerados', value: data.posts_generated ?? 0, color: '#6366f1' },
                { label: 'Publicados', value: data.posts_published ?? 0, color: '#00b386' },
                { label: 'Erros', value: data.errors ?? 0, color: data.errors > 0 ? '#ff4334' : '#475569' },
              ].map(s => `
                <div style="flex:1;background:#1e293b20;border:1px solid #1e293b;border-radius:10px;padding:16px;text-align:center;">
                  <p style="color:${s.color};font-size:28px;font-weight:900;margin:0;">${s.value}</p>
                  <p style="color:#475569;font-size:11px;margin:4px 0 0;">${s.label}</p>
                </div>
              `).join('')}
            </div>
            <a href="${data.dashboard_url || 'https://app.labcreatorai.com'}" 
               style="display:inline-block;background:#6366f1;color:#fff;font-weight:700;font-size:13px;padding:12px 24px;border-radius:8px;text-decoration:none;">
              Abrir Dashboard →
            </a>
          </div>
          ${footer}
        </div>
      </div>
    `
  };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const payload: NotificationPayload = await req.json();
    const { type, organizationId, data = {} } = payload;

    const resendKey = Deno.env.get('RESEND_API_KEY');
    if (!resendKey) {
      console.error('[Notif] RESEND_API_KEY not configured');
      return new Response(JSON.stringify({ success: false, error: 'Resend API key não configurada.' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // If organizationId provided, fetch notification preferences
    let toEmail: string | null = null;
    let orgName = 'seu sistema';
    let shouldSend = true;

    if (organizationId) {
      const { data: org } = await supabaseAdmin
        .from('organizations')
        .select('name, notif_email, notif_error_alerts, notif_published, notif_email_address')
        .eq('id', organizationId)
        .maybeSingle();

      if (org) {
        orgName = org.name || orgName;
        toEmail = org.notif_email_address;

        // Check if this type of notification is enabled
        if (type === 'error_alert' && !org.notif_error_alerts) shouldSend = false;
        if (type === 'post_published' && !org.notif_published) shouldSend = false;
        if (type === 'daily_summary' && !org.notif_email) shouldSend = false;
        if (!org.notif_email) shouldSend = false;
      }
    }

    // Use override email if provided in data
    if (data.to_email) toEmail = data.to_email;

    if (!toEmail) {
      console.log('[Notif] No email address configured for organization, skipping.');
      return new Response(JSON.stringify({ success: false, error: 'Nenhum email de notificação configurado.' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    if (!shouldSend) {
      console.log('[Notif] Notification type disabled for org, skipping.');
      return new Response(JSON.stringify({ success: true, skipped: true, reason: 'Notification type disabled.' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const { subject, html } = buildEmailHtml(type, { ...data, dashboard_url: `${Deno.env.get('SUPABASE_URL')?.replace('.supabase.co', '.app') || '#'}` }, orgName);
    const finalSubject = payload.subject || subject;

    console.log(`[Notif] Sending ${type} email to ${toEmail}`);

    const resendResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${resendKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: `${orgName} <notificacoes@resend.dev>`,
        to: [toEmail],
        subject: finalSubject,
        html,
      }),
    });

    const resendData = await resendResponse.json();

    if (!resendResponse.ok) {
      console.error('[Notif] Resend error:', JSON.stringify(resendData));
      throw new Error(resendData?.message || `Resend error: ${resendResponse.status}`);
    }

    console.log('[Notif] Email sent successfully. ID:', resendData.id);

    return new Response(JSON.stringify({ success: true, emailId: resendData.id }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 });

  } catch (error: any) {
    console.error('[Notif] Fatal Error:', error);
    return new Response(JSON.stringify({ success: false, error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 });
  }
});
