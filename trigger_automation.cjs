
const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function triggerAutomation() {
    console.log('Triggering check_all_active_feeds...');
    const { data, error } = await supabase.rpc('check_all_active_feeds');

    if (error) {
        console.error('Error triggering automation:', error.message);
    } else {
        console.log('Automation triggered successfully!');
    }
}

triggerAutomation();
