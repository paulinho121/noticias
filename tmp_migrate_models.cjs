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

async function forceMigration() {
    console.log('Migrating white_label_settings...');
    const { error: wlErr } = await supabase
        .from('white_label_settings')
        .update({ ai_model: 'gemini-2.0-flash' })
        .eq('ai_provider', 'gemini');
    if (wlErr) console.error('WL Migration failed:', wlErr);
    else console.log('White Label Settings updated successfully.');

    console.log('Migrating feeds...');
    // We update any feed that has gemini in model string or is gemini-pro
    const { data: feedsToUpdate, error: fErr } = await supabase
        .from('feeds')
        .select('id, ai_model')
        .or('ai_model.ilike.%gemini-1.5%,ai_model.eq.gemini-pro');
    
    if (fErr) {
        console.error('Feeds fetching failed:', fErr);
    } else if (feedsToUpdate && feedsToUpdate.length > 0) {
        for (const feed of feedsToUpdate) {
            await supabase.from('feeds').update({ ai_model: 'gemini-2.0-flash' }).eq('id', feed.id);
        }
        console.log(`Updated ${feedsToUpdate.length} feeds.`);
    } else {
        console.log('No feeds to update.');
    }
}

forceMigration();
