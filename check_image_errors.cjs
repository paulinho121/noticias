const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const envData = fs.readFileSync('.env', 'utf8');
const env = {};
envData.split('\n').forEach(line => {
    const parts = line.split('=');
    if (parts.length >= 2) {
        env[parts[0].trim()] = parts.slice(1).join('=').trim().replace(/['"]/g, '');
    }
});

const supabase = createClient(env.VITE_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

async function check() {
    const { data } = await supabase
        .from('logs')
        .select('*')
        // Get all logs related to image generation
        .or('step.eq.image,message.ilike.%Nano%,message.ilike.%Imagen%,message.ilike.%OpenAI%')
        .order('created_at', { ascending: false })
        .limit(20);

    console.log("--- Logs de Geração de Imagem ---");
    for (let log of (data || [])) {
        console.log("------------------------------------------");
        console.log(`[${log.created_at}] [${log.status}] [${log.step}]`);
        console.log(`Message: ${log.message}`);
    }
}

check();
