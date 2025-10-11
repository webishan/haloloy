import { db } from '../db';
import { sql } from 'drizzle-orm';

export async function fixCustomerSerialNumbersSchema() {
  try {
    console.log('🔄 Fixing customer_serial_numbers table schema...');
    
    // Drop the unique constraint on customer_id to allow multiple global numbers per customer
    await db.execute(sql`
      ALTER TABLE customer_serial_numbers 
      DROP CONSTRAINT IF EXISTS customer_serial_numbers_customer_id_unique;
    `);
    
    console.log('✅ Successfully removed unique constraint on customer_id');
    
    // Add an index on customer_id for better query performance
    await db.execute(sql`
      CREATE INDEX IF NOT EXISTS idx_customer_serial_numbers_customer_id 
      ON customer_serial_numbers(customer_id);
    `);
    
    console.log('✅ Successfully added index on customer_id');
    
    // Add an index on global_serial_number for better query performance
    await db.execute(sql`
      CREATE INDEX IF NOT EXISTS idx_customer_serial_numbers_global_serial_number 
      ON customer_serial_numbers(global_serial_number);
    `);
    
    console.log('✅ Successfully added index on global_serial_number');
    
  } catch (error) {
    console.error('❌ Error fixing customer_serial_numbers schema:', error);
    throw error;
  }
}

// Run the migration if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  fixCustomerSerialNumbersSchema()
    .then(() => {
      console.log('✅ Migration completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Migration failed:', error);
      process.exit(1);
    });
}
