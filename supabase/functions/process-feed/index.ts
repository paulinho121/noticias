import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  let feedId: string | null = null;
  
  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) throw new Error("Acesso negado: Token de autorização não encontrado.");
    
    const body = await req.json().catch(() => ({}));
    feedId = body.feedId;
    
    if (!feedId) throw new Error('feedId is required');

    // Configuração com Fallback Automático
    const PROJECT_REF = "aozbgeguelpphxhptrwy";
    const supabaseUrl = Deno.env.get('SUPABASE_URL') || `https://${PROJECT_REF}.supabase.co`;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || Deno.env.get('MASTER_KEY')!;

    const supabase = createClient(supabaseUrl, supabaseKey);

    // 1. Buscar dados do Feed
    const { data: feed, error: feedError } = await supabase.from('feeds').select('*').eq('id', feedId).single();
    if (feedError || !feed) throw new Error(`Feed não encontrado: ${feedError?.message}`);

    // VALIDAR TOKEN E PROPRIEDADE (IDOR Protection)
    const userClient = createClient(supabaseUrl, authHeader.replace('Bearer ', ''));
    const { data: { user }, error: authError } = await userClient.auth.getUser();

    if (authError || !user) {
        if (authHeader !== `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`) {
            throw new Error("Sessão inválida ou expirada.");
        }
    } else {
        const { data: orgMember } = await supabase
            .from('organization_members')
            .select('organization_id')
            .eq('user_id', user.id)
            .eq('organization_id', feed.organization_id)
            .maybeSingle();

        const isMaster = [
            'paulofernandoautomacao@gmail.com',
            'jotavmkt@gmail.com',
            'labwpplus@gmail.com',
            'labnews.pro@gmail.com',
            'admin@labnews.pro'
        ].includes(user.email || '');

        if (!orgMember && !isMaster) {
            throw new Error("Acesso negado: Você não tem permissão para processar este feed.");
        }
    }

    console.log(`[NuclearEngine] Iniciando busca para: ${feed.name}`);

    // 2. Registrar Log Inicial (Batimento Cardíaco)
    await supabase.from('logs').insert({
      feed_id: feedId,
      user_id: feed.user_id,
      organization_id: feed.organization_id,
      status: 'processing',
      step: 'ingestion_init',
      message: `Motor Nuclear: Iniciando busca de notícias...`,
    });

    // 3. Chamar Ingestão (fetch-rss ou keywords)
    const endpoint = feed.source_type === 'keywords' ? 'generate-from-keywords' : 'fetch-rss';
    const subBody = feed.source_type === 'keywords' ? { feedId } : { feedId, feedUrl: feed.url };

    console.log(`[NuclearEngine] Chamando sub-serviço: ${endpoint}`);

    const response = await fetch(`${supabaseUrl}/functions/v1/${endpoint}`, {
      method: 'POST',
      headers: { 
        'Authorization': `Bearer ${supabaseKey}`, 
        'Content-Type': 'application/json' 
      },
      body: JSON.stringify(subBody),
    });

    if (!response.ok) {
      let errorDetail = "";
      try {
        const errJson = await response.json();
        errorDetail = errJson.error || errJson.message || "";
      } catch (e) {
        errorDetail = await response.text();
      }
      console.error(`[NuclearEngine] Falha no sub-serviço (${endpoint}):`, errorDetail);
      throw new Error(`O motor de busca (${endpoint}) falhou: ${errorDetail || response.status}`);
    }

    const result = await response.json();

    return new Response(JSON.stringify({ 
      success: true, 
      message: "Pipeline iniciado com sucesso",
      details: result 
    }), { 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200 
    });

  } catch (error: any) {
    console.error(`[NuclearEngine] ERRO FATAL:`, error.message);
    
    // Log the error to database if possible
    try {
      const PROJECT_REF = "aozbgeguelpphxhptrwy";
      const supabaseUrl = Deno.env.get('SUPABASE_URL') || `https://${PROJECT_REF}.supabase.co`;
      const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || Deno.env.get('MASTER_KEY') || Deno.env.get('SUPABASE_ANON_KEY');
      if (supabaseKey && feedId) {
        const supabase = createClient(supabaseUrl, supabaseKey);
        await supabase.from('logs').insert({
          feed_id: feedId,
          status: 'error',
          step: 'fatal_error',
          message: `Erro no Motor: ${error.message}`
        });
      }
    } catch (e) {
      console.error("[NuclearEngine] Failed to log error to DB:", e.message);
    }

    return new Response(JSON.stringify({ 
      success: false, 
      error: error.message 
    }), { 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200 // Retornamos 200 com success:false para o frontend não dar erro de rede genérico
    });
  }
});
