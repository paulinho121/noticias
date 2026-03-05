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

async function inspectData() {
    let output = "";
    const { data: orgs } = await supabase.from('organizations').select('*, white_label_settings(*)');
    if (!orgs) return;

    for (const org of orgs) {
        output += `\n================================\n`;
        output += `ORG: ${org.name} | SLUG: ${org.slug}\n`;
        if (org.white_label_settings) {
            const wl = org.white_label_settings;
            output += `DOMAIN: ${wl.custom_domain}\n`;
            output += `SYSTEM PROMPT:\n${wl.system_prompt}\n`;
        }

        const { data: feeds } = await supabase.from('feeds').select('*').eq('organization_id', org.id);
        if (feeds) {
            feeds.forEach(f => {
                output += `  > FEED: ${f.name} (ID: ${f.id})\n`;
                output += `    CUSTOM PROMPT: ${f.custom_prompt || 'None'}\n`;
                output += `    AUTOPUBLISH: ${f.auto_publish}\n`;
                output += `    HIGHLIGHTS: ${f.generate_highlights}\n`;
            });
        }
    }
    fs.writeFileSync('tmp_final_output.txt', output, 'utf8');
    console.log("Done. File: tmp_final_output.txt");
}

inspectData();
