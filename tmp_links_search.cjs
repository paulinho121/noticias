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

async function searchLinks() {
    const { data: wls } = await supabase.from('white_label_settings').select('*');
    let output = "SEARCH FOR LINKS/PRODUCT IN PROMPTS:\n";
    if (wls) wls.forEach(wl => {
        if (wl.system_prompt && (wl.system_prompt.includes('href') || wl.system_prompt.includes('link') || wl.system_prompt.includes('produto'))) {
            output += `Org: ${wl.organization_id} | Prompt: ${wl.system_prompt}\n`;
        }
    });

    const { data: feeds } = await supabase.from('feeds').select('*');
    if (feeds) feeds.forEach(f => {
        if (f.custom_prompt && (f.custom_prompt.includes('href') || f.custom_prompt.includes('link') || f.custom_prompt.includes('produto'))) {
            output += `Feed: ${f.name} (Org: ${f.organization_id}) | Prompt: ${f.custom_prompt}\n`;
        }
    });

    fs.writeFileSync('tmp_links_search.txt', output, 'utf8');
}

searchLinks();
