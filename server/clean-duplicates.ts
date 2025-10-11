import { db } from './db';
import { sql } from 'drizzle-orm';
import { customerSerialNumbers } from '../shared/schema';

async function cleanDuplicateGlobalNumbers() {
  try {
    console.log('🔍 Checking for duplicate global numbers...');

    // First, let's see what data we have
    const allRecords = await db.select()
      .from(customerSerialNumbers)
      .orderBy(customerSerialNumbers.customerId, customerSerialNumbers.globalSerialNumber);

    console.log(`📊 Found ${allRecords.length} total records:`);
    allRecords.forEach(record => {
      console.log(`  Customer ${record.customerId} -> Global #${record.globalSerialNumber} (Local: ${record.localSerialNumber})`);
    });

    // Find duplicates by customer_id and global_serial_number
    const duplicates = await db.execute(sql`
      SELECT customer_id, global_serial_number, COUNT(*) as count
      FROM customer_serial_numbers 
      GROUP BY customer_id, global_serial_number
      HAVING COUNT(*) > 1
      ORDER BY customer_id, global_serial_number
    `);

    console.log(`\n🔍 Found ${duplicates.length} duplicate combinations:`);
    duplicates.forEach((dup: any) => {
      console.log(`  Customer ${dup.customer_id} has Global #${dup.global_serial_number} ${dup.count} times`);
    });

    if (duplicates.length === 0) {
      console.log('✅ No duplicates found!');
      return;
    }

    // Clean up duplicates by keeping only the first occurrence of each combination
    console.log('\n🧹 Cleaning up duplicates...');
    
    for (const duplicate of duplicates) {
      console.log(`🔧 Cleaning duplicates for Customer ${duplicate.customer_id}, Global #${duplicate.global_serial_number}`);
      
      // Get all records for this customer and global number
      const duplicateRecords = await db.select()
        .from(customerSerialNumbers)
        .where(sql`customer_id = ${duplicate.customer_id} AND global_serial_number = ${duplicate.global_serial_number}`)
        .orderBy(customerSerialNumbers.assignedAt);

      // Keep the first record, delete the rest
      const recordsToDelete = duplicateRecords.slice(1);
      
      for (const record of recordsToDelete) {
        console.log(`  🗑️ Deleting duplicate record: ${record.id}`);
        await db.delete(customerSerialNumbers).where(sql`id = ${record.id}`);
      }
    }

    // Verify the cleanup
    console.log('\n✅ Verification after cleanup:');
    const finalRecords = await db.select()
      .from(customerSerialNumbers)
      .orderBy(customerSerialNumbers.customerId, customerSerialNumbers.globalSerialNumber);

    console.log(`📊 Now have ${finalRecords.length} records:`);
    finalRecords.forEach(record => {
      console.log(`  Customer ${record.customerId} -> Global #${record.globalSerialNumber} (Local: ${record.localSerialNumber})`);
    });

    // Check for any remaining duplicates
    const remainingDuplicates = await db.execute(sql`
      SELECT customer_id, global_serial_number, COUNT(*) as count
      FROM customer_serial_numbers 
      GROUP BY customer_id, global_serial_number
      HAVING COUNT(*) > 1
    `);

    if (remainingDuplicates.length === 0) {
      console.log('🎉 Successfully cleaned all duplicates!');
    } else {
      console.log(`⚠️ Still have ${remainingDuplicates.length} duplicate combinations`);
    }

  } catch (error) {
    console.error('❌ Error cleaning duplicates:', error);
  }
}

// Run the cleanup
cleanDuplicateGlobalNumbers().then(() => {
  console.log('Cleanup completed');
  process.exit(0);
}).catch((error) => {
  console.error('Cleanup failed:', error);
  process.exit(1);
});
