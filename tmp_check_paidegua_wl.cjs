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

async function checkPaiDeguaWl() {
    const orgId = 'da798a65-d3b2-4423-a23c-6bdee3039a87';
    const { data: wl } = await supabase.from('white_label_settings').select('*').eq('organization_id', orgId).single();
    if (wl) {
        fs.writeFileSync('tmp_paidegua_wl.txt', JSON.stringify(wl, null, 2), 'utf8');
    }
}

checkPaiDeguaWl();
