import { db } from '../db';
import { sql } from 'drizzle-orm';

export async function addCustomerNameFields() {
  try {
    console.log('🔄 Adding customerName and customerAccountNumber columns to customer_point_transactions table...');
    
    // Add customerName column
    await db.execute(sql`
      ALTER TABLE customer_point_transactions 
      ADD COLUMN IF NOT EXISTS customer_name VARCHAR(255);
    `);
    
    // Add customerAccountNumber column  
    await db.execute(sql`
      ALTER TABLE customer_point_transactions 
      ADD COLUMN IF NOT EXISTS customer_account_number VARCHAR(255);
    `);
    
    console.log('✅ Successfully added customerName and customerAccountNumber columns');
  } catch (error) {
    console.error('❌ Error adding customer name fields:', error);
    throw error;
  }
}

// Run the migration if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  addCustomerNameFields()
    .then(() => {
      console.log('✅ Migration completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Migration failed:', error);
      process.exit(1);
    });
}
