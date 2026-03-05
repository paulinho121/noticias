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

async function listWls() {
    const { data: wls } = await supabase.from('white_label_settings').select('*, organizations(name)');
    let output = "WHITE LABEL SETTINGS:\n";
    if (wls) wls.forEach(wl => {
        output += `Org: ${wl.organizations?.name} (ID: ${wl.organization_id})\n`;
        output += `  App Name: ${wl.app_name}\n`;
        output += `  Hero: ${wl.hero_title}\n`;
        output += `  Domain: ${wl.custom_domain}\n`;
        output += `  SEO Opt: ${wl.seo_optimized}\n`;
        output += `  Prompt: ${wl.system_prompt ? 'YES' : 'NO'}\n`;
        output += `----------------\n`;
    });
    fs.writeFileSync('tmp_wls_list.txt', output, 'utf8');
}

listWls();
