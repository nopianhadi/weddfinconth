const { Client } = require('pg');

const connString = 'postgresql://postgres:Gedangburuk22@db.gpqlyqktdujyqbnyxhmf.supabase.co:5432/postgres';

async function checkRLS() {
  const client = new Client({ connectionString: connString });
  try {
    await client.connect();
    console.log('Connected to Supabase DB via pg.');

    // Check RLS status for team_members
    const rlsStatus = await client.query(`
      SELECT relname, relrowsecurity 
      FROM pg_class c 
      JOIN pg_namespace n ON n.oid = c.relnamespace 
      WHERE n.nspname = 'public' AND relname = 'team_members';
    `);

    console.log('RLS Status:', rlsStatus.rows[0]);

    // Check policies for team_members
    const policies = await client.query(`
      SELECT * FROM pg_policies WHERE tablename = 'team_members';
    `);

    console.log('Policies for team_members:', policies.rows);

    await client.end();
  } catch (err) {
    console.error('Database connection / query failed:', err);
    process.exit(1);
  }
}

checkRLS();
