const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// read .env
const envContent = fs.readFileSync(path.join(process.cwd(), '.env'), 'utf8');
const env = Object.fromEntries(
    envContent.split('\n')
        .map(line => line.trim())
        .filter(line => line && !line.startsWith('#'))
        .map(line => {
            const idx = line.indexOf('=');
            if (idx === -1) return [line, ''];
            return [line.substring(0, idx), line.substring(idx + 1).replace(/^"|"$/g, '')];
        })
);

const supabaseUrl = env.SUPABASE_URL || env.VITE_SUPABASE_URL;
const supabaseKey = env.SUPABASE_SERVICE_ROLE_KEY || env.VITE_SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function inspectData() {
    console.log("Checking Organizations and White Label Settings...");
    const { data: orgs, error: orgsErr } = await supabase
        .from('organizations')
        .select('*, white_label_settings(*)');

    if (orgsErr) {
        console.error("Error fetching orgs:", orgsErr);
        return;
    }

    console.log("ORGS FOUND:", orgs.length);

    orgs.forEach(org => {
        console.log(`\n--- ORG: ${org.name} (${org.slug}) ---`);
        if (org.white_label_settings) {
            console.log(`System Prompt (snippet): ${org.white_label_settings.system_prompt?.substring(0, 300)}...`);
            console.log(`Custom Domain: ${org.white_label_settings.custom_domain}`);
        } else {
            console.log("No White Label Settings found for this org.");
        }
    });

    console.log("\nChecking Feeds (with custom_prompt)...");
    const { data: feeds, error: feedsErr } = await supabase
        .from('feeds')
        .select('id, name, custom_prompt, organization_id')
        .limit(20);

    if (feedsErr) {
        console.error("Error fetching feeds:", feedsErr);
        return;
    }

    feeds.forEach(f => {
        const org = orgs.find(o => o.id === f.organization_id);
        console.log(`\nFeed: ${f.name} (Org: ${org ? org.name : 'Unknown'})`);
        console.log(`Custom Prompt: ${f.custom_prompt}`);
    });
}

inspectData();
