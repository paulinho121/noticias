
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
import { addMonths, addYears } from 'https://esm.sh/date-fns@2.30.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const body = await req.json();
    console.log('[Webhook] Received notification:', JSON.stringify(body));

    const accessToken = Deno.env.get('MERCADO_PAGO_ACCESS_TOKEN');
    if (!accessToken) {
      console.error('[Webhook] ERROR: MERCADO_PAGO_ACCESS_TOKEN not configured');
      return new Response(JSON.stringify({ error: 'Server configuration error' }), { status: 500, headers: corsHeaders });
    }

    // Determine notification type and ID
    const type = body.type || body.topic;
    const id = body.data?.id || (body.resource ? body.resource.split('/').pop() : null);

    if (!id) {
       console.log('[Webhook] No resource ID found, skipping. Body:', JSON.stringify(body));
       return new Response(JSON.stringify({ message: 'No ID found' }), { headers: corsHeaders, status: 200 });
    }

    // Initialize Supabase Admin Client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    let organizationId: string | null = null;
    let planId: string | null = null;
    let status: string | null = null;

    if (type === 'payment' || body.topic === 'payment') {
        console.log('[Webhook] Fetching payment details:', id);
        const mpResponse = await fetch(`https://api.mercadopago.com/v1/payments/${id}`, {
            headers: { 'Authorization': `Bearer ${accessToken}` }
        });

        if (mpResponse.ok) {
            const paymentData = await mpResponse.json();
            status = paymentData.status;
            organizationId = paymentData.external_reference;
            planId = paymentData.metadata?.plan_id;
            console.log(`[Webhook] Payment ${id} status: ${status} | Org: ${organizationId}`);
        }
    } else if (type === 'preapproval') {
        console.log('[Webhook] Fetching preapproval details:', id);
        const mpResponse = await fetch(`https://api.mercadopago.com/preapproval/${id}`, {
            headers: { 'Authorization': `Bearer ${accessToken}` }
        });

        if (mpResponse.ok) {
            const preapprovalData = await mpResponse.json();
            status = preapprovalData.status; // 'authorized' is what we want
            organizationId = preapprovalData.external_reference;
            planId = preapprovalData.reason?.toLowerCase().includes('annual') ? 'annual' : 
                     preapprovalData.reason?.toLowerCase().includes('semi') ? 'semi-annual' : 'monthly';
            
            // If it's authorized, handle it like an approved payment for the first time
            if (status === 'authorized') status = 'approved'; 
            console.log(`[Webhook] Preapproval ${id} status: ${status} | Org: ${organizationId}`);
        }
    }

    if (status === 'approved' && organizationId) {
        console.log('[Webhook] Processing approval for:', organizationId, 'Plan:', planId);

        // Fetch current org data to extend subscription if active
        const { data: org } = await supabase.from('organizations').select('trial_ends_at').eq('id', organizationId).single();
        
        let baseDate = new Date();
        if (org?.trial_ends_at && new Date(org.trial_ends_at) > new Date()) {
             baseDate = new Date(org.trial_ends_at);
        }

        let newExpiryDate: Date;
        if (planId === 'annual') {
            newExpiryDate = addYears(baseDate, 1);
        } else if (planId === 'semi-annual') {
            newExpiryDate = addMonths(baseDate, 6);
        } else {
            newExpiryDate = addMonths(baseDate, 1);
        }

        const { error: updateError } = await supabase
          .from('organizations')
          .update({
            subscription_plan: 'pro',
            trial_ends_at: newExpiryDate.toISOString(),
            updated_at: new Date().toISOString()
          })
          .eq('id', organizationId);

        if (updateError) {
          console.error('[Webhook] Failed to update organization:', updateError);
          return new Response(JSON.stringify({ error: 'Update failed' }), { status: 500, headers: corsHeaders });
        }

        console.log('[Webhook] Organization updated. New expiry:', newExpiryDate.toISOString());
    }

    return new Response(JSON.stringify({ received: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })

  } catch (error: any) {
    console.error('[Webhook] Fatal error:', error);
    return new Response(JSON.stringify({ error: error.message }), { status: 200, headers: corsHeaders });
  }
})
