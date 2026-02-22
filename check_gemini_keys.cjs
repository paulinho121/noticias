const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const supabaseUrl = "https://aozbgeguelpphxhptrwy.supabase.co";
const serviceKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFvemJnZWd1ZWxwcGh4aHB0cnd5Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2Njg1Nzg3MSwiZXhwIjoyMDgyNDMzODcxfQ.nJwzX_HCfXIICWzvfW5tI0gbCtxrU6oclCEYrUK82UM";

const supabase = createClient(supabaseUrl, serviceKey);

async function check() {
    const { data, error } = await supabase.from('platform_settings').select('*').in('platform_id', ['google_gemini', 'gemini', 'nano_banana']);
    if (error) {
        console.error(error);
        return;
    }
    console.log("Gemini keys found:", data.map(d => ({ id: d.id, platform: d.platform_id, hasKey: !!d.credentials?.api_key })));
}

check();
