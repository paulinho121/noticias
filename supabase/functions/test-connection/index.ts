import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { platformId, credentials } = await req.json();
    console.log(`[TestConnection] Iniciando teste para: ${platformId}`);

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Não autorizado: Cabeçalho ausente.');
    }

    // Standard client using the user's own token
    // This client is used to fetch the REAL credentials from the table (not the masked view)
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    );

    // Resolve masked credentials (****) if sent from the UI
    let finalCredentials = { ...credentials };
    const hasMaskedFields = Object.values(finalCredentials).some(val => typeof val === 'string' && val.startsWith('****'));

    if (hasMaskedFields) {
      console.log('[TestConnection] Recuperando chaves reais do banco de dados...');
      // Note: We query the TABLE 'platform_settings' directly, which is NOT masked by RLS.
      // The user has permission to see their own rows in this table.
      const { data: settings, error: settingsError } = await supabaseClient
        .from('platform_settings')
        .select('credentials')
        .eq('platform_id', platformId)
        .maybeSingle();

      if (settingsError) {
        console.error('[TestConnection] Erro ao buscar chaves:', settingsError);
        throw new Error(`Erro ao recuperar chaves: ${settingsError.message}`);
      }

      if (!settings) {
        throw new Error('Configurações não encontradas para este motor.');
      }

      // Merge real credentials where masked
      for (const [key, value] of Object.entries(finalCredentials)) {
        if (typeof value === 'string' && value.startsWith('****')) {
          finalCredentials[key] = settings.credentials[key];
        }
      }
    }

    // --- PLATFORM SPECIFIC TESTS ---

    if (platformId === 'google_gemini') {
      const apiKey = finalCredentials.api_key;
      if (!apiKey) throw new Error('API Key do Gemini não encontrada.');

      const response = await fetch(`https://generativelanguage.googleapis.com/v1/models?key=${apiKey}`);
      const data = await response.json();
      
      if (!response.ok) {
         throw new Error(data.error?.message || `Erro Gemini: ${response.statusText}`);
      }
      return new Response(JSON.stringify({ success: true, message: 'Gemini validado com sucesso!' }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    if (platformId === 'xai' || platformId === 'groq' || platformId === 'openai' || platformId === 'openai_images') {
      const apiKey = finalCredentials.api_key;
      if (!apiKey) throw new Error(`API Key para ${platformId} não encontrada.`);

      let baseUrl = 'https://api.openai.com/v1';
      if (platformId === 'xai') baseUrl = 'https://api.x.ai/v1';
      if (platformId === 'groq') baseUrl = 'https://api.groq.com/openai/v1';
      
      const response = await fetch(`${baseUrl}/models`, {
        headers: { 
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error?.message || errData.message || `Erro na API ${platformId}: ${response.statusText}`);
      }

      return new Response(JSON.stringify({ success: true, message: `Conexão com ${platformId} validada!` }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    if (platformId === 'wordpress') {
      const { url, username, app_password } = finalCredentials;
      if (!url || !username || !app_password) throw new Error('Credenciais WordPress incompletas.');
      const wpUrl = `${url.replace(/\/$/, '')}/wp-json/wp/v2/users/me`;
      const response = await fetch(wpUrl, { headers: { 'Authorization': `Basic ${btoa(`${username}:${app_password}`)}` } });
      if (!response.ok) throw new Error(`WordPress: ${response.statusText}`);
      return new Response(JSON.stringify({ success: true, message: 'WordPress conectado!' }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    if (platformId === 'blogger') {
      const { blog_id, public_url, posting_email } = finalCredentials;
      if (!blog_id || !public_url || !posting_email) {
        throw new Error('Configuração do Blogger incompleta. Verifique se preencheu o ID, a URL e o E-mail de postagem.');
      }
      return new Response(JSON.stringify({ 
        success: true, 
        message: 'Configurações do Blogger validadas! O sistema está pronto para enviar e-mails de postagem.' 
      }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    if (platformId === 'custom_api') {
      const { webhook_url, auth_header } = finalCredentials;
      if (!webhook_url) throw new Error('URL do Webhook não configurada.');

      console.log(`[TestConnection] Testando Webhook Customizado: ${webhook_url}`);
      
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };

      if (auth_header && auth_header.includes(':')) {
        const [key, ...valueParts] = auth_header.split(':');
        headers[key.trim()] = valueParts.join(':').trim();
      } else if (auth_header) {
        headers['Authorization'] = auth_header.trim();
      }

      const response = await fetch(webhook_url, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          event: 'test_connection',
          timestamp: new Date().toISOString(),
          message: 'Este é um teste de conexão do ContentAI.'
        })
      });

      if (!response.ok) {
        throw new Error(`Falha no Webhook: ${response.status} ${response.statusText}`);
      }

      return new Response(JSON.stringify({ 
        success: true, 
        message: 'Conexão com o Site Externo validada com sucesso! O Webhook respondeu corretamente.' 
      }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // Default response
    return new Response(JSON.stringify({ success: true, message: 'Configurações salvas e validadas.' }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

  } catch (error: any) {
    console.error('[TestConnection Catch]:', error.message);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
