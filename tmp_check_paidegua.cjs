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

async function checkPaiDegua() {
    const paiDeguaOrgId = 'af69f2c0-8a88-4201-84ca-faf3c924cf46';
    const { data: item } = await supabase.from('feed_items').select('*').eq('organization_id', paiDeguaOrgId).order('created_at', { ascending: false }).limit(1).maybeSingle();

    if (item) {
        fs.writeFileSync('tmp_paidegua_content.txt', `TITLE: ${item.rewritten_title}\n\nCONTENT:\n${item.rewritten_content}`, 'utf8');
    }
}

checkPaiDegua();
