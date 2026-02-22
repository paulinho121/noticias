
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { Client } from "https://deno.land/x/postgres@v0.17.0/mod.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const { query } = await req.json();
    const databaseUrl = Deno.env.get('SUPABASE_DB_URL') || Deno.env.get('DATABASE_URL');

    if (!databaseUrl) throw new Error('DATABASE_URL not found');

    const client = new Client(databaseUrl);
    await client.connect();

    try {
      if (query) {
        // Envolve em um bloco BEGIN/COMMIT para garantir que tudo rode ou nada rode
        console.log('[SQL] Executing migration block...');
        await client.queryArray('BEGIN;');
        await client.queryArray(query);
        await client.queryArray('COMMIT;');
        
        await client.end();
        return new Response(JSON.stringify({ success: true, message: 'Nuclear Isolation applied successfully' }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      } else {
        throw new Error('No query provided');
      }
    } catch (e: any) {
      await client.queryArray('ROLLBACK;').catch(() => {});
      await client.end().catch(() => {});
      console.error('[SQL] Error:', e.message);
      return new Response(JSON.stringify({ success: false, error: e.message }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }
  } catch (e: any) {
    return new Response(JSON.stringify({ success: false, error: e.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
