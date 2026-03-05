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

async function searchEverything() {
    const orgId = 'de67488c-3cba-48b4-8885-7ba5bec7d129'; // NewsBV

    const { data: items } = await supabase.from('feed_items').select('*').eq('organization_id', orgId).ilike('rewritten_content', '%produto%').limit(5);

    let output = "SEARCH FOR 'produto' in NewsBV ITEMS:\n";
    if (items) items.forEach(it => {
        output += `Item: ${it.rewritten_title} | ID: ${it.id}\nContent Snippet: ${it.rewritten_content?.substring(0, 500)}\n\n`;
    });

    const { data: feeds } = await supabase.from('feeds').select('*').eq('organization_id', orgId);
    output += "\nALL FEEDS FOR NewsBV:\n";
    if (feeds) feeds.forEach(f => {
        output += `Feed: ${f.name} | Prompt: ${f.custom_prompt}\n`;
    });

    fs.writeFileSync('tmp_exhaustive_search.txt', output, 'utf8');
}

searchEverything();
