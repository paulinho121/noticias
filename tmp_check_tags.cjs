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

async function checkTags() {
    const { data: items } = await supabase.from('feed_items').select('id, rewritten_title, tags, keywords, organization_id, published_url').order('created_at', { ascending: false }).limit(20);

    let output = "TAGS/KEYWORDS REPORT:\n";
    if (items) items.forEach(it => {
        output += `Item: ${it.rewritten_title}\n  Org: ${it.organization_id}\n  URL: ${it.published_url}\n  Tags: ${it.tags ? it.tags.join(', ') : 'NONE'}\n  Keywords: ${it.keywords ? it.keywords.join(', ') : 'NONE'}\n----------------\n`;
    });
    fs.writeFileSync('tmp_tags_report.txt', output, 'utf8');
}

checkTags();
