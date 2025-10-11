const { exec } = require('child_process');

console.log('🔄 Running database migration...');

// Run the SQL script using psql
const command = 'psql "postgresql://postgres:postgres@localhost:5432/haloloy" -f fix-schema.sql';

exec(command, (error, stdout, stderr) => {
  if (error) {
    console.error('❌ Migration failed:', error.message);
    console.log('\n📋 Manual Instructions:');
    console.log('1. Open your PostgreSQL client (pgAdmin, DBeaver, or command line)');
    console.log('2. Connect to your haloloy database');
    console.log('3. Run this SQL command:');
    console.log('');
    console.log('ALTER TABLE customer_serial_numbers');
    console.log('DROP CONSTRAINT IF EXISTS customer_serial_numbers_customer_id_unique;');
    console.log('');
    console.log('4. Add indexes:');
    console.log('CREATE INDEX IF NOT EXISTS idx_customer_serial_numbers_customer_id ON customer_serial_numbers(customer_id);');
    console.log('CREATE INDEX IF NOT EXISTS idx_customer_serial_numbers_global_serial_number ON customer_serial_numbers(global_serial_number);');
    return;
  }
  
  if (stderr) {
    console.log('⚠️ Warning:', stderr);
  }
  
  console.log('✅ Migration output:');
  console.log(stdout);
  console.log('🎉 Database migration completed successfully!');
  console.log('✅ Customers can now earn multiple global numbers');
});

console.log('📋 If the migration fails, you can run the SQL commands manually:');
console.log('1. Open your PostgreSQL client');
console.log('2. Run the commands in fix-schema.sql');
