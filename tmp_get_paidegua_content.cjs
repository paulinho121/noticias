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

async function checkContent() {
    const id = '773972bd-aab1-4b3a-812c-870aba4e9b31';
    const { data: item } = await supabase.from('feed_items').select('rewritten_content').eq('id', id).single();
    if (item) {
        fs.writeFileSync('tmp_paidegua_content.html', item.rewritten_content, 'utf8');
    }
}

checkContent();
