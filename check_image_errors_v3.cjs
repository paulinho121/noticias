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
        .or('step.eq.image,message.ilike.%Nano%,message.ilike.%Imagen%,message.ilike.%OpenAI%,message.ilike.%falha%')
        .order('created_at', { ascending: false })
        .limit(20);

    let output = "--- Logs de Geração de Imagem ---\n";
    for (let log of (data || [])) {
        output += "------------------------------------------\n";
        output += `[${log.created_at}] [${log.status}] [${log.step}]\n`;
        output += `Message: ${log.message}\n`;
    }
    fs.writeFileSync('image_error_results.txt', output);
    console.log("Results written to image_error_results.txt");
}

check();
