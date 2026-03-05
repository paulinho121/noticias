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

async function countItems() {
    const orgId = 'da798a65-d3b2-4423-a23c-6bdee3039a87';
    const { count } = await supabase.from('feed_items').select('*', { count: 'exact', head: true }).eq('organization_id', orgId);
    console.log("ITEM COUNT for", orgId, ":", count);

    const { count: count2 } = await supabase.from('feed_items').select('*', { count: 'exact', head: true }).eq('organization_id', 'de67488c-3cba-48b4-8885-7ba5bec7d129');
    console.log("ITEM COUNT for NewsBV (de67...):", count2);
}

countItems();
