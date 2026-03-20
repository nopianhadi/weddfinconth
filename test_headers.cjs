const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const { fetch } = require('cross-fetch'); // Use cross-fetch just in case
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;

async function testFetchWithHeaders() {
  const url = `${supabaseUrl}/rest/v1/team_members?select=*&limit=1`;
  console.log('Fetching URL:', url);
  
  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'apikey': supabaseAnonKey,
        'Authorization': `Bearer ${supabaseAnonKey}`
      }
    });

    console.log('Status:', response.status, response.statusText);
    console.log('Headers:');
    response.headers.forEach((v, k) => console.log(`  ${k}: ${v}`));
    
    const body = await response.text();
    console.log('Body snippet:', body.substring(0, 200));
  } catch (err) {
    console.error('Fetch error:', err);
  }
}

testFetchWithHeaders();
