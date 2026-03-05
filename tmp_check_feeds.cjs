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

async function checkFeeds() {
    const newsBvOrgId = 'de67488c-3cba-48b4-8885-7ba5bec7d129';
    const paiDeguaOrgId = 'da798a65-d3b2-4423-a23c-6bdee3039a87';

    const { data: newsBvFeeds } = await supabase.from('feeds').select('*').eq('organization_id', newsBvOrgId);
    const { data: paiDeguaFeeds } = await supabase.from('feeds').select('*').eq('organization_id', paiDeguaOrgId);

    let output = "FEEDS COMPARISON\n\n";
    output += `--- NewsBV ---\n`;
    if (newsBvFeeds) newsBvFeeds.forEach(f => {
        output += `Feed: ${f.name}\n  Custom Prompt: ${f.custom_prompt}\n  Image Engine: ${f.image_engine}\n  Highlights: ${f.generate_highlights}\n  Include Source Link: ${f.include_source_link}\n`;
    });

    output += `\n--- Pai D'Egda ---\n`;
    if (paiDeguaFeeds) paiDeguaFeeds.forEach(f => {
        output += `Feed: ${f.name}\n  Custom Prompt: ${f.custom_prompt}\n  Image Engine: ${f.image_engine}\n  Highlights: ${f.generate_highlights}\n  Include Source Link: ${f.include_source_link}\n`;
    });

    fs.writeFileSync('tmp_feeds_comparison.txt', output, 'utf8');
}

checkFeeds();
