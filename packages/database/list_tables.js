
const { Client } = require('pg');

const client = new Client({
  connectionString: 'postgresql://ventasve_user:ventasve2026!@localhost:5432/ventasve?schema=public',
});

async function main() {
  try {
    await client.connect();
    const res = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
      ORDER BY table_name;
    `);
    
    console.log('Tables in database:');
    res.rows.forEach(row => {
      console.log(row.table_name);
    });
    
    const deliveryPerson = res.rows.find(row => row.table_name === 'delivery_persons');
    if (deliveryPerson) {
        console.log('\nSUCCESS: delivery_persons table exists!');
    } else {
        console.log('\nWARNING: delivery_persons table MISSING!');
    }

  } catch (err) {
    console.error('Error connecting or querying:', err);
  } finally {
    await client.end();
  }
}

main();
