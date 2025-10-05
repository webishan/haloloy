// Direct fix for referral relationship - run this in the server context
import { storage } from './storage';

export async function fixIshanTanjilaReferral() {
  try {
    console.log('🔧 DIRECT FIX: Starting Ishan-Tanjila referral relationship fix...');
    
    // Get all merchants
    const allMerchants = await storage.getMerchants();
    console.log(`Found ${allMerchants.length} total merchants`);
    
    // Find Ishan and Tanjila by checking business names and emails
    let ishan = null;
    let tanjila = null;
    
    for (const merchant of allMerchants) {
      const name = merchant.businessName?.toLowerCase() || '';
      const email = merchant.email?.toLowerCase() || '';
      
      if (name.includes('ishan') || email.includes('ishan')) {
        ishan = merchant;
        console.log(`✅ Found Ishan: ${merchant.businessName} (${merchant.userId})`);
      }
      
      if (name.includes('tanjila') || email.includes('tanjila')) {
        tanjila = merchant;
        console.log(`✅ Found Tanjila: ${merchant.businessName} (${merchant.userId})`);
      }
    }
    
    if (!ishan) {
      console.error('❌ Ishan merchant not found');
      return { success: false, error: 'Ishan not found' };
    }
    
    if (!tanjila) {
      console.error('❌ Tanjila merchant not found');
      return { success: false, error: 'Tanjila not found' };
    }
    
    // Check current state
    console.log(`Current state:`);
    console.log(`- Ishan affiliate cashback: ${ishan.affiliateCashback || 0}`);
    console.log(`- Tanjila referredByMerchant: ${tanjila.referredByMerchant || 'None'}`);
    
    // Step 1: Establish referral relationship
    if (tanjila.referredByMerchant !== ishan.userId) {
      console.log('🔗 Establishing referral relationship...');
      
      // Update Tanjila's referredByMerchant field directly
      await storage.updateMerchant(tanjila.userId, {
        referredByMerchant: ishan.userId
      });
      
      // Create MerchantReferral record
      await storage.createMerchantReferral({
        referrerMerchantId: ishan.userId,
        referredMerchantId: tanjila.userId,
        referralCode: ishan.merchantReferralCode || `MERCH_${ishan.userId.substring(0, 8).toUpperCase()}`,
        commissionEarned: 0,
        totalSales: 0,
        isActive: true
      });
      
      console.log('✅ Referral relationship established');
    } else {
      console.log('✅ Referral relationship already exists');
    }
    
    // Step 2: Award commission (2% of 100 points = 2 points)
    console.log('💰 Awarding commission...');
    
    const commissionAmount = 2; // 2% of 100 points
    const currentCashback = parseFloat(ishan.affiliateCashback?.toString() || '0');
    const newCashback = currentCashback + commissionAmount;
    
    // Update Ishan's affiliate cashback
    await storage.updateMerchant(ishan.userId, {
      affiliateCashback: newCashback.toString(),
      totalCashback: (parseFloat(ishan.totalCashback?.toString() || '0') + commissionAmount).toString()
    });
    
    // Create commission transaction record
    await storage.createMerchantTransaction({
      merchantId: ishan.userId,
      transactionType: 'referral_commission',
      amount: commissionAmount.toString(),
      pointsInvolved: 100,
      referredMerchantId: tanjila.userId,
      commissionRate: 0.02,
      originalTransactionId: `fix-transaction-${Date.now()}`,
      description: `2% affiliate commission from referred merchant point transfer (Fix)`
    });
    
    console.log(`💰 Commission awarded: ${currentCashback} → ${newCashback}`);
    
    // Step 3: Verify the fix
    const updatedIshan = await storage.getMerchantByUserId(ishan.userId);
    const updatedTanjila = await storage.getMerchantByUserId(tanjila.userId);
    
    console.log('🎯 Final verification:');
    console.log(`- Ishan affiliate cashback: ${updatedIshan.affiliateCashback || 0}`);
    console.log(`- Tanjila referredByMerchant: ${updatedTanjila.referredByMerchant || 'None'}`);
    
    // Get referral stats
    const referralStats = await storage.getMerchantReferralsByReferrer(ishan.userId);
    console.log(`- Ishan total referrals: ${referralStats.length}`);
    
    console.log('✅ DIRECT FIX completed successfully!');
    
    return {
      success: true,
      ishan: {
        userId: updatedIshan.userId,
        businessName: updatedIshan.businessName,
        affiliateCashback: updatedIshan.affiliateCashback,
        totalReferrals: referralStats.length
      },
      tanjila: {
        userId: updatedTanjila.userId,
        businessName: updatedTanjila.businessName,
        referredByMerchant: updatedTanjila.referredByMerchant
      }
    };
    
  } catch (error) {
    console.error('❌ DIRECT FIX failed:', error);
    return { success: false, error: error.message };
  }
}