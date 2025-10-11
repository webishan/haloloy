-- Fix customer_serial_numbers table schema
-- This removes the unique constraint on customer_id to allow multiple global numbers per customer

-- Drop the unique constraint on customer_id
ALTER TABLE customer_serial_numbers 
DROP CONSTRAINT IF EXISTS customer_serial_numbers_customer_id_unique;

-- Add indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_customer_serial_numbers_customer_id 
ON customer_serial_numbers(customer_id);

CREATE INDEX IF NOT EXISTS idx_customer_serial_numbers_global_serial_number 
ON customer_serial_numbers(global_serial_number);

-- Check current data
SELECT 
    customer_id, 
    global_serial_number, 
    local_serial_number, 
    is_active,
    assigned_at
FROM customer_serial_numbers 
ORDER BY global_serial_number;

-- Show success message
SELECT 'Schema migration completed successfully! Customers can now earn multiple global numbers.' as status;
