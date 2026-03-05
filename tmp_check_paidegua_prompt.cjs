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

async function checkPrompt() {
    const orgId = 'af69f2c0-8a88-4201-84ca-faf3c924cf46';
    const { data: wl } = await supabase.from('white_label_settings').select('system_prompt').eq('organization_id', orgId).single();
    if (wl) {
        fs.writeFileSync('tmp_paidegua_full_prompt.txt', wl.system_prompt, 'utf8');
    }
}

checkPrompt();
