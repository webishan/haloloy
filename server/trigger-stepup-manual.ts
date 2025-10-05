// Manual StepUp Reward Trigger
// This script will manually trigger StepUp rewards for existing customers

import { storage } from './storage';
import { unifiedStepUpRewardSystem } from './services/UnifiedStepUpRewardSystem';
import bcrypt from 'bcryptjs';

async function triggerStepUpRewards() {
  try {
    console.log('🎯 Manually Triggering StepUp Rewards...');
    
    // Get all customers with Global Numbers
    const allCustomers = await storage.getAllCustomerProfiles();
    const customersWithGlobalNumbers = allCustomers.filter(c => c.globalSerialNumber && c.globalSerialNumber > 0);
    
    console.log(`📊 Found ${customersWithGlobalNumbers.length} customers with Global Numbers:`);
    customersWithGlobalNumbers.forEach(customer => {
      console.log(`  - ${customer.fullName}: Global #${customer.globalSerialNumber}`);
    });
    
    if (customersWithGlobalNumbers.length === 0) {
      console.log('❌ No customers with Global Numbers found. Creating test customers...');
      
      // Create test customers with 1500+ points
      for (let i = 1; i <= 5; i++) {
        const hashedPassword = await bcrypt.hash(`customer${i}123`, 10);
        
        // Create user
        const user = await storage.createUser({
          username: `customer${i}`,
          email: `customer${i}@test.com`,
          password: hashedPassword,
          firstName: `Customer`,
          lastName: `${i}`,
          role: 'customer',
          country: 'BD',
          phone: `+880123456789${i}`
        });
        
        // Create customer profile with 1500+ points
        const customerProfile = await storage.createCustomerProfile({
          userId: user.id,
          uniqueAccountNumber: `ACC${i.toString().padStart(3, '0')}`,
          mobileNumber: `+880123456789${i}`,
          email: user.email,
          fullName: `Customer ${i}`,
          profileComplete: true,
          totalPointsEarned: 1500 + (i * 100),
          currentPointsBalance: 1500 + (i * 100),
          accumulatedPoints: 1500 + (i * 100),
          globalSerialNumber: i, // Assign Global Numbers directly
          localSerialNumber: 0,
          tier: 'bronze',
          isActive: true
        });
        
        // Create customer wallet
        await storage.createCustomerWallet({
          customerId: customerProfile.id,
          rewardPointBalance: 1500 + (i * 100),
          totalRewardPointsEarned: 1500 + (i * 100),
          totalRewardPointsSpent: 0,
          totalRewardPointsTransferred: 0,
          incomeBalance: "0.00",
          totalIncomeEarned: "0.00",
          totalIncomeSpent: "0.00",
          totalIncomeTransferred: "0.00",
          commerceBalance: "0.00",
          totalCommerceAdded: "0.00",
          totalCommerceSpent: "0.00",
          totalCommerceWithdrawn: "0.00"
        });
        
        console.log(`✅ Created Customer ${i} with Global Number ${i}`);
      }
      
      // Get updated customer list
      const updatedCustomers = await storage.getAllCustomerProfiles();
      const updatedCustomersWithGlobalNumbers = updatedCustomers.filter(c => c.globalSerialNumber && c.globalSerialNumber > 0);
      console.log(`📊 Now have ${updatedCustomersWithGlobalNumbers.length} customers with Global Numbers`);
    }
    
    // Now trigger StepUp rewards for Global Number 5
    console.log('\n🎯 Triggering StepUp rewards for Global Number 5...');
    const rewards = await unifiedStepUpRewardSystem.processNewGlobalNumber(5);
    
    console.log(`🎁 Awarded ${rewards.length} StepUp rewards:`);
    rewards.forEach(reward => {
      console.log(`  - Customer Global #${reward.recipientGlobalNumber}: ${reward.rewardPoints} points`);
    });
    
    // Check the first customer's wallet
    const allCustomersAfter = await storage.getAllCustomerProfiles();
    const customersWithGlobalNumbersAfter = allCustomersAfter.filter(c => c.globalSerialNumber && c.globalSerialNumber > 0);
    
    if (customersWithGlobalNumbersAfter.length > 0) {
      const firstCustomer = customersWithGlobalNumbersAfter[0];
      const wallet = await storage.getCustomerWallet(firstCustomer.id);
      console.log(`\n💰 First customer wallet after StepUp rewards:`);
      console.log(`  - Income Balance: ${wallet?.incomeBalance || '0'} points`);
      console.log(`  - Reward Points: ${wallet?.rewardPointBalance || '0'} points`);
    }
    
    console.log('\n✅ StepUp rewards triggered successfully!');
    console.log('Now check the customer dashboard to see the StepUp rewards!');
    
  } catch (error) {
    console.error('❌ Error triggering StepUp rewards:', error.message);
    console.error('Stack trace:', error.stack);
  }
}

// Run the function
triggerStepUpRewards();
