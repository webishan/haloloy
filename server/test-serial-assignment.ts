import { storage } from './storage';

// Test function to assign global serial numbers to eligible customers
export async function assignGlobalSerialsToEligibleCustomers() {
  try {
    console.log('🔍 Checking for customers eligible for global serial numbers...');
    
    // Get all customer profiles
    const allCustomers = await storage.getAllCustomerProfiles();
    console.log(`Found ${allCustomers.length} total customers`);
    
    // Filter customers with 1500+ points
    const eligibleCustomers = allCustomers.filter(customer => 
      (customer.totalPointsEarned || 0) >= 1500
    );
    
    console.log(`Found ${eligibleCustomers.length} customers with 1500+ points`);
    
    let assignedCount = 0;
    
    for (const customer of eligibleCustomers) {
      try {
        const customerId = customer.id;
        const existingSerial = await storage.getCustomerSerialNumber(customerId);
        
        if (!existingSerial) {
          console.log(`🎯 Assigning global serial to customer ${customer.userId} with ${customer.totalPointsEarned} points`);
          await storage.assignSerialNumberToCustomer(customerId);
          
          const newSerial = await storage.getCustomerSerialNumber(customerId);
          console.log(`✅ Assigned global serial number ${newSerial?.globalSerialNumber} to customer ${customer.userId}`);
          assignedCount++;
        } else {
          console.log(`ℹ️ Customer ${customer.userId} already has global serial number ${existingSerial.globalSerialNumber}`);
        }
      } catch (error) {
        console.error(`❌ Error processing customer ${customer.userId}:`, error);
      }
    }
    
    console.log(`🎉 Completed! Assigned ${assignedCount} new global serial numbers out of ${eligibleCustomers.length} eligible customers`);
    return { assignedCount, eligibleCustomers: eligibleCustomers.length };
  } catch (error) {
    console.error('❌ Error in assignGlobalSerialsToEligibleCustomers:', error);
    throw error;
  }
}