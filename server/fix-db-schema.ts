import { db } from './db';
import { sql } from 'drizzle-orm';

async function fixDatabaseSchema() {
  try {
    console.log('🔗 Connected to database');
    console.log('🔄 Running database migration...');

    // Drop the unique constraint on customer_id to allow multiple global numbers per customer
    console.log('🔄 Dropping unique constraint on customer_id...');
    await db.execute(sql`
      ALTER TABLE customer_serial_numbers 
      DROP CONSTRAINT IF EXISTS customer_serial_numbers_customer_id_unique;
    `);
    console.log('✅ Successfully removed unique constraint on customer_id');

    // Add an index on customer_id for better query performance
    console.log('🔄 Adding index on customer_id...');
    await db.execute(sql`
      CREATE INDEX IF NOT EXISTS idx_customer_serial_numbers_customer_id 
      ON customer_serial_numbers(customer_id);
    `);
    console.log('✅ Successfully added index on customer_id');

    // Add an index on global_serial_number for better query performance
    console.log('🔄 Adding index on global_serial_number...');
    await db.execute(sql`
      CREATE INDEX IF NOT EXISTS idx_customer_serial_numbers_global_serial_number 
      ON customer_serial_numbers(global_serial_number);
    `);
    console.log('✅ Successfully added index on global_serial_number');

    // Check current data
    console.log('\n🔍 Checking current customer serial numbers...');
    const result = await db.execute(sql`
      SELECT customer_id, global_serial_number, local_serial_number, is_active
      FROM customer_serial_numbers 
      ORDER BY global_serial_number
    `);
    
    console.log(`📊 Found ${result.length} serial numbers:`);
    result.forEach((row: any) => {
      console.log(`  Global #${row.global_serial_number} -> Customer ${row.customer_id} (Local: ${row.local_serial_number})`);
    });

    console.log('\n🎉 Database migration completed successfully!');
    console.log('✅ Customers can now earn multiple global numbers');
    console.log('🔄 Please restart your application for changes to take effect');

  } catch (error) {
    console.error('❌ Migration failed:', error);
  }
}

// Run the migration
fixDatabaseSchema().then(() => {
  console.log('Migration completed');
  process.exit(0);
}).catch((error) => {
  console.error('Migration failed:', error);
  process.exit(1);
});
