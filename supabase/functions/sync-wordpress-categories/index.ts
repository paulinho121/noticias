import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get the user from the authorization header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) throw new Error('Missing Authorization header');
    const { data: { user }, error: authError } = await supabase.auth.getUser(authHeader.replace('Bearer ', ''));
    if (authError || !user) throw new Error('Invalid user');

    // Fetch WordPress settings for this user
    const { data: wpSettings, error: wpError } = await supabase
      .from('platform_settings')
      .select('*')
      .eq('platform_id', 'wordpress')
      .eq('user_id', user.id)
      .maybeSingle();

    if (wpError || !wpSettings || !wpSettings.is_connected) {
      throw new Error('WordPress não configurado. Por favor, conecte o WordPress nas configurações.');
    }

    const { url, username, app_password } = wpSettings.credentials;
    const auth = btoa(`${username}:${app_password}`);

    // Fetch categories from WordPress
    const wpUrl = `${url.replace(/\/$/, '')}/wp-json/wp/v2/categories?per_page=100`;
    const wpRes = await fetch(wpUrl, {
      headers: { 'Authorization': `Basic ${auth}` }
    });

    if (!wpRes.ok) {
      const err = await wpRes.json().catch(() => ({}));
      throw new Error(`Erro ao buscar categorias do WordPress: ${err.message || wpRes.statusText}`);
    }

    const wpCategories = await wpRes.json();
    
    // Fetch organization_id
    const { data: memberData } = await supabase
      .from('organization_members')
      .select('organization_id')
      .eq('user_id', user.id)
      .maybeSingle();

    // Sync with Supabase categories table
    const results = [];
    for (const wpCat of wpCategories) {
      const { data, error } = await supabase
        .from('categories')
        .upsert({
          name: wpCat.name,
          slug: wpCat.slug,
          user_id: user.id,
          organization_id: memberData?.organization_id || null,
          external_id: wpCat.id.toString()
        }, {
          onConflict: 'user_id, external_id'
        })
        .select()
        .single();
      
      if (!error) results.push(data);
    }

    return new Response(
      JSON.stringify({ success: true, count: results.length, categories: results }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('ERRO Sync Categories:', error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
