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
    let out = "";
    out += `System Gemini: ${!!env.GEMINI_API_KEY}\n`;
    out += `System OpenAI: ${!!env.OPENAI_API_KEY}\n`;

    const { data: wl } = await supabase.from('white_label_settings').select('*').limit(1);
    if (wl && wl[0]) {
        out += `WL Provider: ${wl[0].ai_provider}\n`;
        out += `WL Gemini Key: ${!!wl[0].gemini_api_key}\n`;
        out += `WL OpenAI Key: ${!!wl[0].openai_api_key}\n`;
    }

    const { data: platforms } = await supabase.from('platform_settings').select('*');
    out += `Platforms: ${platforms?.length}\n`;
    for (let p of (platforms || [])) {
        out += `- ${p.provider_id} (U:${!!p.user_id}, O:${!!p.organization_id})\n`;
    }
    fs.writeFileSync('ai_config_results.txt', out);
}

check();
