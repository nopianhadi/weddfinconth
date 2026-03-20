const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testFetch() {
  console.log('Testing fetch for team_members...');
  try {
    const { data, error, status, statusText } = await supabase
      .from('team_members')
      .select('*')
      .order('name')
      .limit(5);

    if (error) {
       console.error('Fetch failed with error:', error);
       console.log('HTTP Status:', status, statusText);
    } else {
       console.log('Fetch successful! Data count:', data.length);
    }
  } catch (err) {
    console.error('Unexpected error:', err);
  }
}

testFetch();
