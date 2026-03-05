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

async function checkLogs() {
    const feedItemId = 'fa773e31-3199-4cb0-b6e9-7a38b1dfb28d'; // A NewsBV item
    const { data: logs1 } = await supabase.from('logs').select('*').eq('feed_item_id', feedItemId);
    console.log("NewsBV Logs:", logs1?.length);

    const feedItemId2 = 'fa75047b-1175-47f6-86f2-8951e4cae782'; // Let me find a Pai D'Égua item ID properly
    const { data: items } = await supabase.from('feed_items').select('id').eq('organization_id', 'da798a65-d3b2-4423-a23c-6bdee3039a87').limit(1);
    if (items && items[0]) {
        const { data: logs2 } = await supabase.from('logs').select('*').eq('feed_item_id', items[0].id);
        fs.writeFileSync('tmp_paidegua_logs.txt', JSON.stringify(logs2, null, 2), 'utf8');
    }
}

checkLogs();
