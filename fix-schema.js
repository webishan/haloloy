const { Client } = require('pg');

const client = new Client({
  connectionString: "postgresql://postgres:postgres@localhost:5432/haloloy"
});

async function fixSchema() {
  try {
    await client.connect();
    console.log('🔗 Connected to database');

    // Drop the unique constraint on customer_id to allow multiple global numbers per customer
    console.log('🔄 Dropping unique constraint on customer_id...');
    await client.query(`
      ALTER TABLE customer_serial_numbers 
      DROP CONSTRAINT IF EXISTS customer_serial_numbers_customer_id_unique;
    `);
    console.log('✅ Successfully removed unique constraint on customer_id');

    // Add an index on customer_id for better query performance
    console.log('🔄 Adding index on customer_id...');
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_customer_serial_numbers_customer_id 
      ON customer_serial_numbers(customer_id);
    `);
    console.log('✅ Successfully added index on customer_id');

    // Add an index on global_serial_number for better query performance
    console.log('🔄 Adding index on global_serial_number...');
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_customer_serial_numbers_global_serial_number 
      ON customer_serial_numbers(global_serial_number);
    `);
    console.log('✅ Successfully added index on global_serial_number');

    // Check current data
    console.log('\n🔍 Checking current customer serial numbers...');
    const result = await client.query(`
      SELECT customer_id, global_serial_number, local_serial_number, is_active
      FROM customer_serial_numbers 
      ORDER BY global_serial_number
    `);
    
    console.log(`📊 Found ${result.rows.length} serial numbers:`);
    result.rows.forEach(row => {
      console.log(`  Global #${row.global_serial_number} -> Customer ${row.customer_id} (Local: ${row.local_serial_number})`);
    });

    console.log('\n🎉 Schema migration completed successfully!');
    console.log('✅ Customers can now earn multiple global numbers');

  } catch (error) {
    console.error('❌ Migration failed:', error.message);
  } finally {
    await client.end();
  }
}

fixSchema();
