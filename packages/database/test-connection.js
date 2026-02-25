const { Client } = require('pg');

async function testConnection(password) {
  const config = {
    user: 'postgres.sfrzgcdtqlvvwgjzxqan',
    host: 'aws-0-us-west-2.pooler.supabase.com',
    database: 'postgres',
    password: password,
    port: 6543,
    ssl: { rejectUnauthorized: false }
  };

  const client = new Client(config);
  try {
    await client.connect();
    console.log(`Success with password: "${password}"`);
    await client.end();
    return true;
  } catch (err) {
    console.log(`Failed with password: "${password}" - Error: ${err.message}`);
    return false;
  }
}

async function main() {
  await testConnection('ventasve2026!');
  await testConnection('ventasve2026%21'); // URL encoded just in case pg client handles it weirdly (unlikely)
}

main();
