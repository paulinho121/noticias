
const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkQueue() {
    const { data, error } = await supabase
        .from('processing_queue')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(10);

    if (error) {
        console.error('Error fetching queue:', error.message);
    } else {
        console.log('Recent Queue Items:', data.length);
        data.forEach(item => {
            console.log(`- Status: ${item.status}, Task: ${item.payload.task}, Feed ID: ${item.feed_id}`);
        });
    }
}

checkQueue();
