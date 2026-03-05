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

async function findPrompts() {
    const { data: feeds } = await supabase.from('feeds').select('*').not('custom_prompt', 'is', null);
    let output = "FEEDS WITH CUSTOM PROMPTS:\n";
    if (seeds) feeds.forEach(f => {
        output += `Feed: ${f.name} | Prompt: ${f.custom_prompt}\n`;
    });

    const { data: wls } = await supabase.from('white_label_settings').select('*').not('system_prompt', 'is', null);
    output += "\nSYSTEM PROMPTS:\n";
    if (wls) wls.forEach(wl => {
        output += `Org: ${wl.organization_id} | Prompt: ${wl.system_prompt}\n`;
    });

    fs.writeFileSync('tmp_prompts_all.txt', output, 'utf8');
}

findPrompts();
