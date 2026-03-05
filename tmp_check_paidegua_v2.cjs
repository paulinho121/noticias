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
    console.log("Searching for items with 'Portal Pai D'Égua'...");
    const { data: items } = await supabase.from('feed_items').select('*').ilike('rewritten_content', '%Pai D\'Égua%').limit(1);

    if (items && items.length > 0) {
        const item = items[0];
        fs.writeFileSync('tmp_paidegua_content.txt', `ORG ID: ${item.organization_id}\nTITLE: ${item.rewritten_title}\n\nCONTENT:\n${item.rewritten_content}`, 'utf8');
    } else {
        console.log("No items found with that string in content");
    }
}

checkPaiDegua();
