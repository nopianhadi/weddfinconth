
import { createClient } from '@supabase/supabase-js'
import fs from 'fs'
import path from 'path'

// Load from .env
const envPath = path.resolve(process.cwd(), '.env');
const envContent = fs.readFileSync(envPath, 'utf8');
const env = {};
envContent.split('\n').forEach(line => {
    const [key, ...value] = line.split('=');
    if (key && value.length > 0) {
        env[key.trim()] = value.join('=').trim();
    }
});

const supabaseUrl = env.VITE_SUPABASE_URL;
// Use service role key if available, otherwise things won't work well
const supabaseKey = env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkRest() {
    console.log("Using REST API via Supabase client to inspect database.");
    
    // Check team_members
    const { data: teamMembers, error: tmError } = await supabase
        .from('team_members')
        .select('*')
        .limit(1);
    
    if (tmError) {
        console.error("Error reading team_members:", tmError.message);
    } else {
        console.log("team_members first row:");
        console.log(teamMembers[0]);
    }
}

checkRest();
