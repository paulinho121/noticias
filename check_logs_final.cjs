
const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkLogs() {
    const { data, error } = await supabase
        .from('logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(20);

    if (error) {
        console.error('Error:', error.message);
    } else {
        console.log('Recent Logs:');
        data.forEach(log => {
            console.log(`- [${log.status}] ${log.step}: ${log.message.substring(0, 100)}`);
        });
    }
}

checkLogs();
