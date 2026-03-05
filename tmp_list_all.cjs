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

async function listAll() {
    const { data: orgs } = await supabase.from('organizations').select('id, name, slug');
    const { data: wls } = await supabase.from('white_label_settings').select('organization_id, system_prompt');

    let output = "";
    if (orgs) orgs.forEach(o => {
        const wl = wls?.find(w => w.organization_id === o.id);
        output += `ID: ${o.id}\nNAME: ${o.name}\nPROMPT: ${wl ? wl.system_prompt : 'NONE'}\n----------------\n`;
    });
    fs.writeFileSync('tmp_all_orgs_prompts.txt', output, 'utf8');
}

listAll();
