const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const envData = fs.readFileSync('.env', 'utf8');
const env = {};
envData.split('\n').forEach(line => {
    const parts = line.split('=');
    if (parts.length >= 2) {
        env[parts[0].trim()] = parts.slice(1).join('=').trim().replace(/['"]/g, '');
    }
});

const supabase = createClient(env.VITE_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

async function check() {
    const { data } = await supabase
        .from('logs')
        .select('step, status, message, created_at')
        .ilike('message', '%flip%')
        .order('created_at', { ascending: false })
        .limit(10);

    console.log("--- Logs com 'flip' ---");
    for (let log of (data || [])) {
        console.log(`[${log.status}] ${log.step}: ${log.message}`);
    }

    // Also check last 5 complete logs
    const { data: data2 } = await supabase
        .from('logs')
        .select('step, status, message, created_at')
        .eq('step', 'complete')
        .order('created_at', { ascending: false })
        .limit(5);

    console.log("\n--- Últimos 5 logs 'complete' ---");
    for (let log of (data2 || [])) {
        console.log(`[${log.status}] ${log.step}: ${log.message}`);
    }
}

check();
