// Fix script that works with database storage
import { DatabaseStorage } from './database-storage';
import { db } from './db';
import { merchants, merchantWallets } from '@shared/schema';
import { eq } from 'drizzle-orm';

async function fixMerchantPoints() {
  console.log('🔧 Fixing merchant loyalty points in database...');
  
  // Create storage instance
  const storage = new DatabaseStorage();
  
  try {
    // Get all merchants from database
    const merchantsList = await db.select().from(merchants);
    console.log(`📊 Found ${merchantsList.length} merchants`);
    
    let fixedCount = 0;
    
    for (const merchant of merchantsList) {
      // Check if merchant has non-zero loyalty points
      if (merchant.loyaltyPointsBalance > 0 || merchant.availablePoints > 0) {
        console.log(`🔍 Fixing merchant: ${merchant.businessName}`);
        console.log(`   - Current loyaltyPointsBalance: ${merchant.loyaltyPointsBalance}`);
        console.log(`   - Current availablePoints: ${merchant.availablePoints}`);
        
        // Reset to 0 in database
        await db.update(merchants)
          .set({
            loyaltyPointsBalance: 0,
            availablePoints: 0,
            updatedAt: new Date()
          })
          .where(eq(merchants.id, merchant.id));
        
        // Also update merchant wallet if it exists
        try {
          const wallet = await db.select().from(merchantWallets).where(eq(merchantWallets.merchantId, merchant.id)).limit(1);
          if (wallet.length > 0 && wallet[0].rewardPointBalance > 0) {
            await db.update(merchantWallets)
              .set({
                rewardPointBalance: 0,
                updatedAt: new Date()
              })
              .where(eq(merchantWallets.merchantId, merchant.id));
            console.log(`   - Updated merchant wallet rewardPointBalance to 0`);
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
    const updatedMerchants = await db.select().from(merchants);
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
