import { db } from './db.js';
import { customerSerialNumbers } from '../shared/schema.js';
import { eq } from 'drizzle-orm';

async function checkGlobalNumbers() {
  try {
    console.log('🔍 Checking customer serial numbers in database...');
    const allSerials = await db.select().from(customerSerialNumbers).orderBy(customerSerialNumbers.globalSerialNumber);
    
    console.log(`📊 Found ${allSerials.length} serial numbers:`);
    allSerials.forEach(serial => {
      console.log(`  Global #${serial.globalSerialNumber} -> Customer ${serial.customerId} (Local: ${serial.localSerialNumber})`);
    });
    
    // Check for duplicates
    const globalNumbers = allSerials.map(s => s.globalSerialNumber);
    const duplicates = globalNumbers.filter((num, index) => globalNumbers.indexOf(num) !== index);
    
    if (duplicates.length > 0) {
      console.log(`⚠️ Found duplicate global numbers: ${[...new Set(duplicates)].join(', ')}`);
    } else {
      console.log('✅ No duplicate global numbers found');
    }
    
    // Group by customer
    const customerGroups = {};
    allSerials.forEach(serial => {
      if (!customerGroups[serial.customerId]) {
        customerGroups[serial.customerId] = [];
      }
      customerGroups[serial.customerId].push(serial.globalSerialNumber);
    });
    
    console.log('\n👥 Global numbers by customer:');
    Object.entries(customerGroups).forEach(([customerId, numbers]) => {
      console.log(`  Customer ${customerId}: ${numbers.sort((a, b) => a - b).join(', ')}`);
    });
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    process.exit(0);
  }
}

checkGlobalNumbers();
