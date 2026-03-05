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

async function listFeeds() {
    const { data: feeds } = await supabase.from('feeds').select('*, organizations(name)');
    let output = "ALL FEEDS:\n";
    if (feeds) feeds.forEach(f => {
        output += `Feed: ${f.name} | Org: ${f.organizations?.name} (ID: ${f.organization_id})\n`;
    });
    fs.writeFileSync('tmp_all_feeds.txt', output, 'utf8');
}

listFeeds();
