
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const envContent = fs.readFileSync(path.join(__dirname, '.env'), 'utf8');
const env = {};
envContent.split('\n').forEach(line => {
    const [key, value] = line.split('=');
    if (key && value) {
        env[key.trim()] = value.trim().replace(/^"(.*)"$/, '$1');
    }
});

const supabaseUrl = env.VITE_SUPABASE_URL;
const supabaseKey = env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkProfile() {
    try {
        console.log('--- Fetching Profile Data ---');
        const { data, error } = await supabase.from('profiles').select('*');
        
        if (error) {
            console.error('Error fetching profiles:', error);
            return;
        }

        if (!data || data.length === 0) {
            console.log('No profiles found.');
        } else {
            console.log(`Found ${data.length} profiles:`);
            data.forEach((p, i) => {
                console.log(`\nProfile ${i + 1}:`);
                console.log(`ID: ${p.id}`);
                console.log(`Full Name: ${p.full_name}`);
                console.log(`Email: ${p.email}`);
                console.log(`Company: ${p.company_name}`);
                console.log(`Website: ${p.website}`);
                console.log(`Admin User ID: ${p.admin_user_id}`);
                // Add more fields if necessary
            });
        }
    } catch (err) {
        console.error('Execution Error:', err);
    }
}

checkProfile();
