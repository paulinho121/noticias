
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
    const { planId } = await req.json();

    const accessToken = Deno.env.get('MERCADO_PAGO_ACCESS_TOKEN')?.trim();
    if (!accessToken) {
      return new Response(JSON.stringify({
        success: false,
        error: 'Configuração incompleta: Chave do Mercado Pago não encontrada.'
      }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // Verify user authentication
    const authHeader = req.headers.get('Authorization') || req.headers.get('authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ success: false, error: 'Token de autenticação não encontrado.' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const token = authHeader.replace('Bearer ', '');
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(token);
    if (userError || !user) {
      return new Response(JSON.stringify({
        success: false,
        error: 'Sessão expirada.',
        details: userError?.message || 'Token inválido'
      }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // Get organization
    const { data: memberData } = await supabaseAdmin
      .from('organization_members')
      .select('organization_id')
      .eq('user_id', user.id)
      .maybeSingle();

    if (!memberData?.organization_id) {
      return new Response(JSON.stringify({ success: false, error: 'Organização não encontrada.' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const organizationId = memberData.organization_id;

    // Define plan details
    const planMap: Record<string, { title: string; price: number }> = {
      monthly:     { title: 'Assinatura Mensal — Plano PRO',     price: 69.90  },
      'semi-annual': { title: 'Assinatura Semestral — Plano PRO', price: 279.90 },
      annual:      { title: 'Assinatura Anual — Plano PRO',       price: 489.84 },
    };

    const plan = planMap[planId];
    if (!plan) {
      throw new Error(`Plano inválido: ${planId}`);
    }

    console.log(`[PIX] Creating payment for plan: ${planId} | User: ${user.email} | Org: ${organizationId}`);

    // Create PIX payment via Mercado Pago Payments API
    const notificationUrl = `${Deno.env.get('SUPABASE_URL')}/functions/v1/mercadopago-webhook`;

    const pixPayload = {
      transaction_amount: plan.price,
      description: plan.title,
      payment_method_id: 'pix',
      external_reference: organizationId,
      notification_url: notificationUrl,
      metadata: { plan_id: planId },
      payer: {
        email: user.email,
        first_name: user.user_metadata?.full_name?.split(' ')[0] || 'Cliente',
        last_name:  user.user_metadata?.full_name?.split(' ').slice(1).join(' ') || '',
      },
    };

    const mpResponse = await fetch('https://api.mercadopago.com/v1/payments', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        'X-Idempotency-Key': `${organizationId}-${planId}-${Date.now()}`,
      },
      body: JSON.stringify(pixPayload),
    });

    const mpData = await mpResponse.json();

    if (!mpResponse.ok) {
      console.error('[PIX] MP Error:', JSON.stringify(mpData));
      throw new Error(mpData?.message || `Erro Mercado Pago: ${mpResponse.status}`);
    }

    const qrCode      = mpData?.point_of_interaction?.transaction_data?.qr_code;
    const qrCodeBase64 = mpData?.point_of_interaction?.transaction_data?.qr_code_base64;
    const paymentId   = mpData?.id;

    if (!qrCode || !qrCodeBase64) {
      console.error('[PIX] No QR code in response:', JSON.stringify(mpData));
      throw new Error('Mercado Pago não retornou QR Code PIX.');
    }

    console.log(`[PIX] Payment created: ${paymentId} | Status: ${mpData.status}`);

    return new Response(JSON.stringify({
      success: true,
      paymentId,
      qrCode,
      qrCodeBase64,
      status: mpData.status,
      expiresAt: mpData.date_of_expiration,
      planTitle: plan.title,
      amount: plan.price,
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 });

  } catch (error: any) {
    console.error('[PIX] Fatal Error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error.message || 'Erro interno ao gerar PIX.'
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 });
  }
});
