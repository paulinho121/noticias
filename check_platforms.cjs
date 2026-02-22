const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const supabaseUrl = "https://aozbgeguelpphxhptrwy.supabase.co";
const serviceKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFvemJnZWd1ZWxwcGh4aHB0cnd5Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2Njg1Nzg3MSwiZXhwIjoyMDgyNDMzODcxfQ.nJwzX_HCfXIICWzvfW5tI0gbCtxrU6oclCEYrUK82UM";

const supabase = createClient(supabaseUrl, serviceKey);

async function check() {
    const { data, error } = await supabase.from('platform_settings').select('*').limit(5);
    if (error) {
        fs.writeFileSync('platform_check.txt', "Error: " + JSON.stringify(error));
        return;
    }
    fs.writeFileSync('platform_check.txt', JSON.stringify(data, null, 2));
}

check();
