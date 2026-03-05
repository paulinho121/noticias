const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// read .env
const envFiles = ['.env', '.env.local'];
let env = {};
envFiles.forEach(file => {
    const filePath = path.join(process.cwd(), file);
    if (fs.existsSync(filePath)) {
        const content = fs.readFileSync(filePath, 'utf8');
        content.split('\n').forEach(line => {
            const idx = line.indexOf('=');
            if (idx !== -1) {
                env[line.substring(0, idx).trim()] = line.substring(idx + 1).trim().replace(/^"|"$/g, '');
            }
        });
    }
});

const supabaseUrl = env.SUPABASE_URL || env.VITE_SUPABASE_URL;
const supabaseKey = env.SUPABASE_SERVICE_ROLE_KEY || env.VITE_SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function compare() {
    const newsBvOrgId = 'de67488c-3cba-48b4-8885-7ba5bec7d129';
    const paiDeguaOrgId = 'af69f2c0-8a88-4201-84ca-faf3c924cf46';

    const { data: newsBvWl } = await supabase.from('white_label_settings').select('*').eq('organization_id', newsBvOrgId).maybeSingle();
    const { data: paiDeguaWl } = await supabase.from('white_label_settings').select('*').eq('organization_id', paiDeguaOrgId).maybeSingle();

    const { data: newsBvFeeds } = await supabase.from('feeds').select('*').eq('organization_id', newsBvOrgId);
    const { data: paiDeguaFeeds } = await supabase.from('feeds').select('*').eq('organization_id', paiDeguaOrgId);

    let output = "COMPARISON\n\n";
    output += `--- NewsBV (Working) ---\n`;
    output += `System Prompt:\n${newsBvWl?.system_prompt}\n\n`;
    if (newsBvFeeds) newsBvFeeds.forEach(f => {
        output += `Feed: ${f.name} | Custom Prompt: ${f.custom_prompt}\n`;
    });

    output += `\n--- Portal Pai D'Égua (Not Working) ---\n`;
    output += `System Prompt:\n${paiDeguaWl?.system_prompt}\n\n`;
    if (paiDeguaFeeds) paiDeguaFeeds.forEach(f => {
        output += `Feed: ${f.name} | Custom Prompt: ${f.custom_prompt}\n`;
    });

    fs.writeFileSync('tmp_comparison.txt', output, 'utf8');
}

compare();
