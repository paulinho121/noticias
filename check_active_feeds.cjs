
const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkFeeds() {
    const { data, error } = await supabase
        .from('feeds')
        .select('id, name, is_active')
        .eq('is_active', true);

    if (error) {
        console.error('Error fetching feeds:', error);
    } else {
        console.log('Active feeds:', data.length);
        data.forEach(f => console.log(`- ${f.name} (${f.id})`));
    }
}

checkFeeds();
