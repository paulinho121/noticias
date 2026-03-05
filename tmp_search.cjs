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

async function searchData() {
    let output = "SEARCH RESULTS FOR 'NewsBV' and 'Sert'\n";

    const { data: orgs } = await supabase.from('organizations').select('*');
    orgs.forEach(o => {
        if (o.name.includes('News') || o.name.includes('BV') || o.name.includes('Sert')) {
            output += `Found Org: ${o.name} (Slug: ${o.slug}, ID: ${o.id})\n`;
        }
    });

    const { data: wls } = await supabase.from('white_label_settings').select('*');
    wls.forEach(wl => {
        if ((wl.system_prompt && wl.system_prompt.includes('News')) || (wl.app_name && wl.app_name.includes('News'))) {
            output += `Found WL: OrgID=${wl.organization_id}, Prompt Snippet: ${wl.system_prompt.substring(0, 100)}\n`;
        }
    });

    const { data: feeds } = await supabase.from('feeds').select('*');
    feeds.forEach(f => {
        if (f.name.includes('News') || (f.custom_prompt && f.custom_prompt.includes('News'))) {
            output += `Found Feed: ${f.name} (OrgID: ${f.organization_id}, Prompt: ${f.custom_prompt})\n`;
        }
    });

    fs.writeFileSync('tmp_search_output.txt', output, 'utf8');
}

searchData();
