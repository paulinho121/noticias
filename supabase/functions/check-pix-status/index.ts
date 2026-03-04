
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
    const { paymentId } = await req.json();

    if (!paymentId) {
      return new Response(JSON.stringify({ success: false, error: 'paymentId é obrigatório.' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const accessToken = Deno.env.get('MERCADO_PAGO_ACCESS_TOKEN')?.trim();
    if (!accessToken) {
      return new Response(JSON.stringify({ success: false, error: 'Configuração de servidor incompleta.' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const mpResponse = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
      headers: { 'Authorization': `Bearer ${accessToken}` },
    });

    if (!mpResponse.ok) {
      throw new Error(`Erro ao consultar pagamento: ${mpResponse.status}`);
    }

    const data = await mpResponse.json();

    return new Response(JSON.stringify({
      success: true,
      status: data.status, // 'pending', 'approved', 'rejected', 'cancelled'
      statusDetail: data.status_detail,
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 });

  } catch (error: any) {
    console.error('[CheckPIX] Error:', error);
    return new Response(JSON.stringify({ success: false, error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 });
  }
});
