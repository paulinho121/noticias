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

async function checkSert() {
    const sertId = '5bd51b0d-9ec3-488c-9ff9-700f550f9b60';
    const { data: wl } = await supabase.from('white_label_settings').select('*').eq('organization_id', sertId).single();
    if (wl) {
        fs.writeFileSync('tmp_sert_wl.txt', `SYSTEM PROMPT:\n${wl.system_prompt}\n\nHERO TITLE: ${wl.hero_title}`, 'utf8');
    }
}

checkSert();
