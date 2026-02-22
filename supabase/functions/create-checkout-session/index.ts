
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { planId, successUrl, cancelUrl } = await req.json()

    const accessToken = Deno.env.get('MERCADO_PAGO_ACCESS_TOKEN')?.trim();
    if (!accessToken) {
      console.error('[Checkout] ERROR: MERCADO_PAGO_ACCESS_TOKEN not found');
      return new Response(JSON.stringify({ 
        success: false, 
        error: 'Configuração incompleta: Chave do Mercado Pago não encontrada no servidor.' 
      }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // Verify user authentication
    const authHeader = req.headers.get('Authorization') || req.headers.get('authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ success: false, error: 'Token de autenticação não encontrado.' }), 
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const token = authHeader.replace('Bearer ', '');
    const supabaseAdmin = createClient(Deno.env.get('SUPABASE_URL') ?? '', Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '');
    
    // Use admin client to verify the token - much more reliable
    const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(token);
    
    if (userError || !user) {
      console.error('[Checkout] Auth error detail:', userError);
      return new Response(JSON.stringify({ 
        success: false, 
        error: 'Sessão expirada.',
        details: userError?.message || 'Token inválido'
      }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // Get organization
    const { data: memberData } = await supabaseAdmin.from('organization_members').select('organization_id').eq('user_id', user.id).maybeSingle();
    if (!memberData?.organization_id) {
        return new Response(JSON.stringify({ success: false, error: 'Organização não encontrada.' }), 
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const organizationId = memberData.organization_id;
    
    // Define plan details
    let planDetails: any;
    let isRecurring = true;

    switch (planId) {
      case 'test_plan':
        planDetails = { title: 'Teste de Integração - Plano PRO', price: 1.00, months: 1 };
        isRecurring = false; // Test plan can be one-time
        break;
      case 'monthly':
        planDetails = { title: 'Assinatura Mensal - Plano PRO', price: 69.90, months: 1 };
        break;
      case 'semi-annual':
        planDetails = { title: 'Assinatura Semestral - Plano PRO', price: 279.90, months: 6 };
        break;
      case 'annual':
        planDetails = { title: 'Assinatura Anual - Plano PRO', price: 489.84, months: 12 };
        break;
      default:
        throw new Error(`Plano inválido: ${planId}`);
    }

    console.log(`[Checkout] Creating ${isRecurring ? 'Subscription' : 'Preference'} for ${planId} | User: ${user.email}`);

    let responseData: any;

    if (isRecurring) {
        // Create Preapproval (Actual recurring subscription)
        const preapprovalData = {
            back_url: successUrl,
            reason: planDetails.title,
            external_reference: organizationId,
            payer_email: user.email,
            auto_recurring: {
                frequency: planDetails.months,
                frequency_type: 'months',
                transaction_amount: planDetails.price,
                currency_id: 'BRL'
            },
            status: 'pending'
        };

        const mpResponse = await fetch('https://api.mercadopago.com/preapproval', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(preapprovalData)
        });

        if (!mpResponse.ok) {
            const errorText = await mpResponse.text();
            console.error('[Checkout] MP Subscription Error:', errorText);
            throw new Error(`Erro Mercado Pago: ${errorText}`);
        }
        responseData = await mpResponse.json();
    } else {
        // Create Preference (One-time payment)
        const preferenceData = {
            items: [{
                id: planId,
                title: planDetails.title,
                quantity: 1,
                unit_price: planDetails.price,
                currency_id: 'BRL'
            }],
            back_urls: { success: successUrl, failure: cancelUrl, pending: cancelUrl },
            auto_return: 'approved',
            external_reference: organizationId,
            notification_url: `${Deno.env.get('SUPABASE_URL')}/functions/v1/mercadopago-webhook`,
            metadata: { plan_id: planId }
        };

        const mpResponse = await fetch('https://api.mercadopago.com/checkout/preferences', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(preferenceData)
        });

        if (!mpResponse.ok) {
            const errorText = await mpResponse.text();
            throw new Error(`Erro Mercado Pago: ${errorText}`);
        }
        responseData = await mpResponse.json();
    }

    const initPoint = responseData.init_point || responseData.sandbox_init_point;
    
    if (!initPoint) {
        console.error('[Checkout] No init_point in response:', JSON.stringify(responseData));
        throw new Error('Mercado Pago não retornou URL de pagamento.');
    }

    return new Response(JSON.stringify({ 
        success: true, 
        url: initPoint,
        id: responseData.id 
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 });

  } catch (error: any) {
    console.error('[Checkout] Fatal Error:', error);
    return new Response(JSON.stringify({ 
        success: false, 
        error: error.message || 'Erro interno no servidor de pagamentos' 
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 });
  }
})
