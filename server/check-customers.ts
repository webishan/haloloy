// Check Customer Data
// This script will check the current customer data

import { storage } from './storage';

async function checkCustomers() {
  try {
    console.log('🔍 Checking Customer Data...');
    
    // Get all customers
    const allCustomers = await storage.getAllCustomerProfiles();
    console.log(`📊 Found ${allCustomers.length} total customers:`);
    
    // Also check all users
    const allUsers = await storage.getAllUsers();
    const customerUsers = allUsers.filter(u => u.role === 'customer');
    console.log(`👥 Found ${customerUsers.length} customer users:`);
    
    customerUsers.forEach((user, index) => {
      console.log(`  ${index + 1}. ${user.firstName} ${user.lastName} (${user.email})`);
    });
    
    allCustomers.forEach((customer, index) => {
      console.log(`  ${index + 1}. ${customer.fullName}:`);
      console.log(`     - User ID: ${customer.userId}`);
      console.log(`     - Global Serial Number: ${customer.globalSerialNumber || 'Not assigned'}`);
      console.log(`     - Current Points Balance: ${customer.currentPointsBalance || 0}`);
      console.log(`     - Total Points Earned: ${customer.totalPointsEarned || 0}`);
      console.log(`     - Accumulated Points: ${customer.accumulatedPoints || 0}`);
      console.log('');
    });
    
    // Check if any customers have reached 1500 points
    const customersWith1500Points = allCustomers.filter(c => (c.currentPointsBalance || 0) >= 1500);
    console.log(`🎯 Customers with 1500+ points: ${customersWith1500Points.length}`);
    
    if (customersWith1500Points.length > 0) {
      console.log('These customers should have Global Numbers assigned:');
      customersWith1500Points.forEach(customer => {
        console.log(`  - ${customer.fullName}: ${customer.currentPointsBalance} points`);
      });
    } else {
      console.log('No customers have reached 1500 points yet.');
      console.log('This means Global Numbers haven\'t been assigned, so StepUp rewards can\'t be triggered.');
    }
    
    // Check customer wallets
    console.log('\n💰 Customer Wallets:');
    for (const customer of allCustomers) {
      const wallet = await storage.getCustomerWallet(customer.id);
      if (wallet) {
        console.log(`  ${customer.fullName}:`);
        console.log(`    - Income Balance: ${wallet.incomeBalance || '0'} points`);
        console.log(`    - Reward Points: ${wallet.rewardPointBalance || '0'} points`);
        console.log(`    - Commerce Balance: ${wallet.commerceBalance || '0'} points`);
      }
    }
    
  } catch (error) {
    console.error('❌ Error checking customers:', error.message);
    console.error('Stack trace:', error.stack);
  }
}

// Run the function
checkCustomers();
