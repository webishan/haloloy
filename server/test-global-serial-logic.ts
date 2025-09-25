import { storage } from './storage';

// Test function to verify global serial number assignment logic
async function testGlobalSerialLogic() {
  console.log('🧪 Testing Global Serial Number Assignment Logic...\n');

  try {
    // Get all customers with 1500+ points
    const allCustomers = await storage.getAllCustomerProfiles();
    const eligibleCustomers = allCustomers.filter(customer => 
      (customer.totalPointsEarned || 0) >= 1500
    );

    console.log(`📊 Found ${eligibleCustomers.length} customers with 1500+ points`);

    // Sort by total points earned (descending) to simulate achievement order
    eligibleCustomers.sort((a, b) => (b.totalPointsEarned || 0) - (a.totalPointsEarned || 0));

    console.log('\n🏆 Top customers by points (achievement order):');
    eligibleCustomers.slice(0, 10).forEach((customer, index) => {
      console.log(`${index + 1}. Customer ${customer.userId}: ${customer.totalPointsEarned} points`);
    });

    // Check current serial number assignments
    console.log('\n🔍 Checking current global serial number assignments...');
    let assignedCount = 0;
    let pendingCount = 0;

    for (const customer of eligibleCustomers) {
      const serialNumber = await storage.getCustomerSerialNumber(customer.id);
      
      if (serialNumber) {
        assignedCount++;
        const rewardTier = getRewardTierBySerial(serialNumber.globalSerialNumber);
        console.log(`✅ Customer ${customer.userId}: Serial #${serialNumber.globalSerialNumber} (${rewardTier.name} - ${rewardTier.reward} points)`);
      } else {
        pendingCount++;
        console.log(`⏳ Customer ${customer.userId}: No serial assigned (${customer.totalPointsEarned} points)`);
      }
    }

    console.log(`\n📈 Summary:`);
    console.log(`- Assigned: ${assignedCount} customers`);
    console.log(`- Pending: ${pendingCount} customers`);
    console.log(`- Total eligible: ${eligibleCustomers.length} customers`);

    // Test reward tier distribution
    console.log('\n🎯 Testing reward tier distribution logic:');
    for (let serial = 1; serial <= 100; serial++) {
      const tier = getRewardTierBySerial(serial);
      if (serial <= 5 || serial === 15 || serial === 37 || serial === 65 || serial === 100) {
        console.log(`Serial #${serial}: ${tier.name} (${tier.range}) - ${tier.reward} points`);
      }
    }

    console.log('\n✅ Global serial logic test completed!');

  } catch (error) {
    console.error('❌ Error testing global serial logic:', error);
  }
}

// Get reward tier based on global serial number (matching the Bengali logic)
function getRewardTierBySerial(serialNumber: number): { name: string; range: string; reward: number } {
  if (serialNumber === 1) {
    return { name: 'Champion', range: '1', reward: 38000 };
  } else if (serialNumber >= 2 && serialNumber <= 5) {
    return { name: 'Elite', range: '2-5', reward: 15000 };
  } else if (serialNumber >= 6 && serialNumber <= 15) {
    return { name: 'Premium', range: '6-15', reward: 8000 };
  } else if (serialNumber >= 16 && serialNumber <= 37) {
    return { name: 'Gold', range: '16-37', reward: 3500 };
  } else if (serialNumber >= 38 && serialNumber <= 65) {
    return { name: 'Silver', range: '38-65', reward: 1500 };
  } else {
    return { name: 'Bronze', range: '66+', reward: 800 };
  }
}

// Run the test if this file is executed directly
if (require.main === module) {
  testGlobalSerialLogic();
}

export { testGlobalSerialLogic };