
const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_PUBLISHABLE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Error: Missing Supabase credentials');
    console.error('URL:', supabaseUrl);
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkSchema() {
    try {
        // Direct query to check columns
        const { data: cols, error: queryError } = await supabase
            .from('processing_queue')
            .select('*')
            .limit(1);

        if (queryError) {
            console.error('Query error:', queryError.message);
        } else {
            console.log('Sample row columns:', Object.keys(cols[0] || {}));
        }

        // Try to get column names from information_schema via RPC if possible
        // We'll try to use the 'check_all_active_feeds' function logic or similar if available
        // but the error message is enough proof.

    } catch (err) {
        console.error('Unexpected error:', err);
    }
}

checkSchema();
