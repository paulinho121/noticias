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

async function compareSeo() {
    const newsBvItemId = '46f57727-a036-4549-9eb9-6fa31b1ec66a';
    const paiDeguaItemId = 'da798a65-d3b2-4423-a23c-6bdee3039a87'; // The one I found earlier - wait, I need the actual ID

    const { data: item1 } = await supabase.from('feed_items').select('*').eq('id', newsBvItemId).single();

    // Find a Pai D'Égua item again
    const { data: item2 } = await supabase.from('feed_items').select('*').eq('organization_id', 'da798a65-d3b2-4423-a23c-6bdee3039a87').order('created_at', { ascending: false }).limit(1).single();

    let output = "SEO COMPARISON\n\n";
    if (item1) {
        output += `NewsBV Item: ${item1.rewritten_title}\n`;
        output += `Slug: ${item1.slug}\n`;
        output += `Meta Desc: ${item1.meta_description}\n`;
        output += `Tags: ${item1.tags}\n`;
        output += `Keywords: ${item1.keywords}\n\n`;
    }
    if (item2) {
        output += `Pai D'Égua Item: ${item2.rewritten_title}\n`;
        output += `Slug: ${item2.slug}\n`;
        output += `Meta Desc: ${item2.meta_description}\n`;
        output += `Tags: ${item2.tags}\n`;
        output += `Keywords: ${item2.keywords}\n\n`;
    }
    fs.writeFileSync('tmp_seo_comparison.txt', output, 'utf8');
}

compareSeo();
