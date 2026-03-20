
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Supabase credentials missing.');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function findHadi() {
    const { data, error } = await supabase
        .from('clients')
        .select('*')
        .ilike('name', '%Hadi%');
    
    if (error) {
        console.error('Error finding client:', error);
        return;
    }
    
    console.log('Found clients:', JSON.stringify(data, null, 2));
}

findHadi();
