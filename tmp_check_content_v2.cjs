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
    const newsBvItemId = '46f57727-a036-4549-9eb9-6fa31b1ec66a';
    const { data: item } = await supabase.from('feed_items').select('*').eq('id', newsBvItemId).single();

    if (item) {
        fs.writeFileSync('tmp_working_content.txt', `TITLE: ${item.rewritten_title}\n\nCONTENT:\n${item.rewritten_content}`, 'utf8');
    }
}

checkContent();
