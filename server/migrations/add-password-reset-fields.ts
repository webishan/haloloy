import { db } from '../db';
import { sql } from 'drizzle-orm';

/**
 * Migration: Add password reset fields to admins table
 * Adds: must_reset_password, last_password_reset
 */
export async function addPasswordResetFields() {
  console.log('🔄 Running migration: Add password reset fields to admins table...');
  
  try {
    // Add must_reset_password column
    await db.execute(sql`
      ALTER TABLE admins 
      ADD COLUMN IF NOT EXISTS must_reset_password BOOLEAN NOT NULL DEFAULT FALSE
    `);
    console.log('✅ Added must_reset_password column');
    
    // Add last_password_reset column
    await db.execute(sql`
      ALTER TABLE admins 
      ADD COLUMN IF NOT EXISTS last_password_reset TIMESTAMP
    `);
    console.log('✅ Added last_password_reset column');
    
    console.log('🎉 Migration completed successfully!');
    return true;
  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  }
}

// Run migration if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  addPasswordResetFields()
    .then(() => {
      console.log('✅ Migration script completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Migration script failed:', error);
      process.exit(1);
    });
}


