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

async function findCaixa() {
    const { data: items } = await supabase.from('feed_items')
        .select('id, rewritten_content, rewritten_title')
        .ilike('rewritten_title', '%Caixa Econômica%')
        .limit(1);

    if (items && items.length > 0) {
        console.log("Found item:", items[0].id);
        fs.writeFileSync('tmp_caixa_content.html', items[0].rewritten_content, 'utf8');
    } else {
        console.log("Not found");
    }
}

findCaixa();
