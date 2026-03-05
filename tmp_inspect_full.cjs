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
    const { data: orgs } = await supabase.from('organizations').select('*, white_label_settings(*)');
    if (!orgs) return;

    for (const org of orgs) {
        console.log(`\n================================`);
        console.log(`ORG: ${org.name} | SLUG: ${org.slug}`);
        if (org.white_label_settings) {
            const wl = org.white_label_settings;
            console.log(`DOMAIN: ${wl.custom_domain}`);
            console.log(`SYSTEM PROMPT:`);
            console.log(wl.system_prompt);
        }

        const { data: feeds } = await supabase.from('feeds').select('*').eq('organization_id', org.id);
        if (feeds) {
            feeds.forEach(f => {
                console.log(`  > FEED: ${f.name} (ID: ${f.id})`);
                console.log(`    CUSTOM PROMPT: ${f.custom_prompt || 'None'}`);
                console.log(`    AUTOPUBLISH: ${f.auto_publish}`);
                console.log(`    HIGHLIGHTS: ${f.generate_highlights}`);
            });
        }
    }
}

inspectData();
