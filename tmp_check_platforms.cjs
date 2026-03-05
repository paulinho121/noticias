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

async function checkPlatforms() {
    const { data: platforms } = await supabase.from('platform_settings').select('*, organizations(name)');
    let output = "PLATFORM SETTINGS:\n";
    if (platforms) platforms.forEach(p => {
        output += `Org: ${p.organizations?.name} (ID: ${p.organization_id})\n`;
        output += `  Platform: ${p.platform_id}\n`;
        output += `  Auto Publish: ${p.is_auto_publish}\n`;
        output += `  Credentials Keys: ${Object.keys(p.credentials || {}).join(', ')}\n`;
        output += `----------------\n`;
    });
    fs.writeFileSync('tmp_platforms_list.txt', output, 'utf8');
}

checkPlatforms();
