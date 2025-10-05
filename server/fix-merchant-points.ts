// Simple fix script that works with in-memory storage
import { MemStorage } from './storage';

async function fixMerchantPoints() {
  console.log('🔧 Fixing merchant loyalty points...');
  
  // Create storage instance
  const storage = new MemStorage();
  
  try {
    // Get all merchants from in-memory storage
    const merchants = Array.from(storage['merchants'].values());
    console.log(`📊 Found ${merchants.length} merchants`);
    
    let fixedCount = 0;
    
    for (const merchant of merchants) {
      // Check if merchant has non-zero loyalty points
      if (merchant.loyaltyPointsBalance > 0 || merchant.availablePoints > 0) {
        console.log(`🔍 Fixing merchant: ${merchant.businessName}`);
        console.log(`   - Current loyaltyPointsBalance: ${merchant.loyaltyPointsBalance}`);
        console.log(`   - Current availablePoints: ${merchant.availablePoints}`);
        
        // Reset to 0 directly in the Map
        const updatedMerchant = {
          ...merchant,
          loyaltyPointsBalance: 0,
          availablePoints: 0
        };
        storage['merchants'].set(merchant.id, updatedMerchant);
        
        // Also update merchant wallet if it exists
        try {
          const merchantWallets = storage['merchantWallets'];
          if (merchantWallets && merchantWallets.has(merchant.id)) {
            const wallet = merchantWallets.get(merchant.id);
            if (wallet && wallet.rewardPointBalance > 0) {
              const updatedWallet = {
                ...wallet,
                rewardPointBalance: 0
              };
              merchantWallets.set(merchant.id, updatedWallet);
              console.log(`   - Updated merchant wallet rewardPointBalance to 0`);
            }
          }
        } catch (error) {
          console.log(`   - No merchant wallet found or error updating wallet: ${error}`);
        }
        
        fixedCount++;
        console.log(`   ✅ Fixed merchant: ${merchant.businessName}`);
      }
    }
    
    console.log(`🎉 Fixed ${fixedCount} merchants`);
    
    // Verify the fixes
    console.log('\n📋 Verification:');
    const updatedMerchants = Array.from(storage['merchants'].values());
    for (const merchant of updatedMerchants) {
      if (merchant.loyaltyPointsBalance > 0 || merchant.availablePoints > 0) {
        console.log(`❌ Merchant ${merchant.businessName} still has points: loyalty=${merchant.loyaltyPointsBalance}, available=${merchant.availablePoints}`);
      } else {
        console.log(`✅ Merchant ${merchant.businessName} has 0 points`);
      }
    }
    
  } catch (error) {
    console.error('❌ Error fixing merchant points:', error);
  }
}

// Run the fix
fixMerchantPoints().then(() => {
  console.log('🏁 Merchant points fix completed');
  process.exit(0);
}).catch((error) => {
  console.error('💥 Fatal error:', error);
  process.exit(1);
});
