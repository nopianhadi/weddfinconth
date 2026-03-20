const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const envContent = fs.readFileSync(path.join(__dirname, '..', '.env'), 'utf8');
const env = {};
envContent.split('\n').forEach(line => {
    const parts = line.split('=');
    if (parts.length >= 2) {
        const key = parts[0].trim();
        const value = parts.slice(1).join('=').trim().replace(/^"(.*)"$/, '$1').replace(/^'(.*)'$/, '$1');
        env[key] = value;
    }
});

const supabaseUrl = env.VITE_SUPABASE_URL;
const supabaseKey = env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase environment variables');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkTable() {
    console.log('Checking for table: wedding_day_checklists...');
    const { data, error, count } = await supabase
        .from('wedding_day_checklists')
        .select('*', { count: 'exact', head: true });

    if (error) {
        console.error('Error checking table:', error.message);
        if (error.code === 'P0001' || error.message.includes('does not exist')) {
            console.log('STATUS: TABLE_MISSING');
        } else {
            console.log('STATUS: ERROR');
        }
    } else {
        console.log('Table exists. Row count:', count);
        console.log('STATUS: TABLE_EXISTS');
    }
}

checkTable();
