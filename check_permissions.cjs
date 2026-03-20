const { Client } = require('pg');

const connString = 'postgresql://postgres:Gedangburuk22@db.gpqlyqktdujyqbnyxhmf.supabase.co:5432/postgres';

async function checkPermissions() {
  const client = new Client({ connectionString: connString });
  try {
    await client.connect();
    console.log('Connected to DB.');

    // Check if anon / authenticated roles have SELECT on team_members
    const perms = await client.query(`
      SELECT grantee, privilege_type 
      FROM information_schema.role_table_grants 
      WHERE table_name = 'team_members' AND table_schema = 'public';
    `);

    console.log('Permissions for team_members:', perms.rows);

    await client.end();
  } catch (err) {
    console.error('Failed:', err);
    process.exit(1);
  }
}

checkPermissions();
