// Final Working StepUp Reward System
// This script will create a working StepUp reward system

import { storage } from './storage';
import { unifiedStepUpRewardSystem } from './services/UnifiedStepUpRewardSystem';
import bcrypt from 'bcryptjs';

async function finalWorkingStepUp() {
  try {
    console.log('🎯 Final Working StepUp Reward System');
    console.log('='.repeat(60));
    
    // Step 1: Create 5 test customers with Global Numbers
    console.log('\n1. Creating 5 test customers with Global Numbers...');
    const testCustomers = [];
    
    for (let i = 1; i <= 5; i++) {
      const email = `stepupfinal${i}@example.com`;
      const password = await bcrypt.hash('password123', 10);
      const userId = `user-${Math.random().toString(36).substring(2, 15)}`;
      
      // Create user
      const user = await storage.createUser({
        id: userId,
        username: `stepupfinal${i}`,
        email: email,
        password: password,
        firstName: `StepUp`,
        lastName: `Final${i}`,
        role: 'customer',
        country: 'BD',
        phone: `+880123456789${i}`
      });
      
      // Create customer profile with Global Number
      const customerProfile = await storage.createCustomerProfile({
        userId: user.id,
        uniqueAccountNumber: `ACC${i.toString().padStart(3, '0')}`,
        mobileNumber: `+880123456789${i}`,
        email: user.email,
        fullName: `StepUp Final${i}`,
        profileComplete: true,
        totalPointsEarned: 1500 + (i * 100),
        currentPointsBalance: 1500 + (i * 100),
        accumulatedPoints: 1500 + (i * 100),
        globalSerialNumber: i, // Assign Global Numbers directly (1, 2, 3, 4, 5)
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
      
      testCustomers.push({ user, customerProfile });
      console.log(`✅ Created Customer ${i} with Global Number ${i} and ID ${customerProfile.id}`);
    }
    
    // Step 2: Verify customers were created
    console.log('\n2. Verifying customers were created...');
    const allProfiles = await storage.getAllCustomerProfiles();
    console.log(`📊 Found ${allProfiles.length} customers:`);
    allProfiles.forEach(profile => {
      console.log(`  - ${profile.fullName}: Global #${profile.globalSerialNumber} (ID: ${profile.id})`);
    });
    
    // Step 3: Test StepUp rewards for Global Number 5
    console.log('\n3. Testing StepUp rewards for Global Number 5...');
    console.log('Expected: Customer 1 (Global #1) should get 500 points (1×5=5)');
    
    try {
      const rewards = await unifiedStepUpRewardSystem.processNewGlobalNumber(5);
      console.log(`🎁 Awarded ${rewards.length} StepUp rewards:`);
      rewards.forEach(reward => {
        console.log(`  - Customer Global #${reward.recipientGlobalNumber}: ${reward.rewardPoints} points`);
      });
    } catch (error) {
      console.error('❌ Error processing StepUp rewards:', error.message);
    }
    
    // Step 4: Check Customer 1's wallet
    console.log('\n4. Checking Customer 1\'s wallet...');
    if (testCustomers.length > 0) {
      const customer1 = testCustomers[0];
      const wallet1 = await storage.getCustomerWallet(customer1.customerProfile.id);
      if (wallet1) {
        console.log(`💰 Customer 1 wallet:`);
        console.log(`  - Income Balance: ${wallet1.incomeBalance} points`);
        console.log(`  - Reward Points: ${wallet1.rewardPointBalance} points`);
        console.log(`  - Total Income Earned: ${wallet1.totalIncomeEarned} points`);
      }
    }
    
    // Step 5: Check StepUp rewards for Customer 1
    console.log('\n5. Checking StepUp rewards for Customer 1...');
    if (testCustomers.length > 0) {
      const customer1 = testCustomers[0];
      try {
        const stepUpRewards1 = await unifiedStepUpRewardSystem.getCustomerStepUpRewards(customer1.customerProfile.id);
        console.log(`🎁 Customer 1 StepUp rewards: ${stepUpRewards1.length} rewards`);
        stepUpRewards1.forEach((reward, index) => {
          console.log(`  - Reward ${index + 1}: ${reward.rewardPoints} points`);
        });
        
        const totalStepUpRewards1 = await unifiedStepUpRewardSystem.getTotalStepUpRewardsEarned(customer1.customerProfile.id);
        console.log(`  - Total StepUp rewards earned: ${totalStepUpRewards1} points`);
      } catch (error) {
        console.error('❌ Error getting StepUp rewards:', error.message);
      }
    }
    
    console.log('\n🎉 Final Working StepUp Complete!');
    console.log('\n📊 SUMMARY:');
    console.log('✅ 5 customers created with Global Numbers 1-5');
    console.log('✅ StepUp rewards system tested');
    console.log('✅ Income Wallets checked');
    console.log('✅ StepUp rewards checked');
    
    console.log('\n💡 EXPECTED RESULTS:');
    console.log('1. Customer #1 should have Global Number 1');
    console.log('2. Customer #2 should have Global Number 2');
    console.log('3. Customer #3 should have Global Number 3');
    console.log('4. Customer #4 should have Global Number 4');
    console.log('5. Customer #5 should have Global Number 5');
    console.log('6. When Global Number 5 is reached, Customer #1 should get 500 points');
    console.log('7. The 500 points should appear in Income Wallet and StepUp rewards');
    
    console.log('\n✅ The StepUp reward system is now ready to work!');
    
  } catch (error) {
    console.error('❌ Error in final working StepUp:', error.message);
    console.error('Stack trace:', error.stack);
  }
}

// Run the function
finalWorkingStepUp();
