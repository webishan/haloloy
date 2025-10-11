import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';

const connectionString = "postgresql://postgres:postgres@localhost:5432/haloloy";

const client = postgres(connectionString);
const db = drizzle(client);

async function checkGlobalNumbers() {
  try {
    console.log('🔍 Checking customer serial numbers in database...');
    
    const result = await client`
      SELECT global_serial_number, customer_id, local_serial_number, is_active
      FROM customer_serial_numbers 
      ORDER BY global_serial_number
    `;
    
    console.log(`📊 Found ${result.length} serial numbers:`);
    result.forEach(serial => {
      console.log(`  Global #${serial.global_serial_number} -> Customer ${serial.customer_id} (Local: ${serial.local_serial_number})`);
    });
    
    // Check for duplicates
    const globalNumbers = result.map(s => s.global_serial_number);
    const duplicates = globalNumbers.filter((num, index) => globalNumbers.indexOf(num) !== index);
    
    if (duplicates.length > 0) {
      console.log(`⚠️ Found duplicate global numbers: ${[...new Set(duplicates)].join(', ')}`);
    } else {
      console.log('✅ No duplicate global numbers found');
    }
    
    // Group by customer
    const customerGroups = {};
    result.forEach(serial => {
      if (!customerGroups[serial.customer_id]) {
        customerGroups[serial.customer_id] = [];
      }
      customerGroups[serial.customer_id].push(serial.global_serial_number);
    });
    
    console.log('\n👥 Global numbers by customer:');
    Object.entries(customerGroups).forEach(([customerId, numbers]) => {
      console.log(`  Customer ${customerId}: ${numbers.sort((a, b) => a - b).join(', ')}`);
    });
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await client.end();
    process.exit(0);
  }
}

checkGlobalNumbers();
