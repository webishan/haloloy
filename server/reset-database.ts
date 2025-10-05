import 'dotenv/config';
import { db } from './db';
import { 
  users, admins, merchants, customers, orders, rewardTransactions, 
  customerGlobalNumbers, stepUpMilestones, infinityRewardCycles, infinityMerchantDistributions,
  rewardNumbers, cartItems, wishlistItems, reviews, chatMessages, conversations, chatRooms,
  pointDistributions, userWallets, pointTransactions, referrals, commissionTransactions,
  merchantTransactions, qrTransfers, adminSettings, leaderboards, pointGenerationRequests,
  merchantWallets, walletTransactions, merchantIncome, merchantReferrals, royaltyDistributions,
  merchantShops, pointRecharges, productSales, merchantActivity, emerchantProducts,
  productReviewSettings, pointDistributionReports, customerProfiles, customerPointTransactions,
  customerSerialNumbers, customerOTPs, customerPointTransfers, customerPurchases, customerWallets,
  customerRewards, customerAffiliateLinks, customerReferrals, customerDailyLogins,
  customerBirthdayPoints, shoppingVouchers, serialActivationQueue, customerWalletTransactions,
  customerWalletTransfers, customerReferralCommissions, companyReferrer, wasteManagementRewards,
  medicalFacilityBenefits, globalNumbers, stepUpConfig, stepUpRewards, globalNumberConfig,
  merchantCashbackTransactions, monthlyCashbackDistributions, monthlyCashbackDistributionDetails,
  shoppingVoucherDistributions, merchantRankHistory, merchantRankConditions, voucherCashOutRequests,
  merchantCustomers, blockedCustomers, products, categories, brands
} from '@shared/schema';
import { eq, sql } from 'drizzle-orm';

async function resetDatabase() {
  console.log('🔄 Starting comprehensive database reset...');
  
  try {
    // Step 1: Reset all numeric counters and balances to 0
    console.log('📊 Resetting all numeric values to 0...');
    
    // Reset merchants
    await db.update(merchants).set({
      loyaltyPointsBalance: 0,
      totalCashback: '0.00',
      totalSales: '0.00',
      totalOrders: 0,
      productCount: 0,
      availablePoints: 0,
      totalPointsPurchased: 0,
      totalPointsDistributed: 0,
      instantCashback: '0.00',
      referralCommission: '0.00',
      royaltyBonus: '0.00',
      affiliateCashback: '0.00',
      monthlyCashback: '0.00',
      shoppingVoucherBalance: '0.00',
      incentiveClubBonus: '0.00',
      totalRankBonus: '0.00',
      komarceBalance: '500.00', // Keep initial balance
      totalReceived: '0.00',
      totalWithdrawn: '0.00',
      currentRank: 'none',
      rankAchievedAt: null
    });

    // Reset customers
    await db.update(customers).set({
      totalPoints: 0,
      accumulatedPoints: 0,
      currentPointsBalance: 0,
      totalPointsEarned: 0,
      globalRewardNumbers: 0,
      globalSerialNumber: null,
      currentTier: 'tier_1',
      stepUpCompleted: false,
      stepUpCompletedAt: null,
      infinityEligible: false,
      infinityCyclesCompleted: 0,
      lastInfinityCycleAt: null,
      totalReferrals: 0,
      totalAffiliateCommission: '0.00',
      totalOrders: 0,
      totalSpent: '0.00',
      dailyLoginCount: 0,
      lastLoginDate: null
    });

    // Reset merchant wallets
    await db.update(merchantWallets).set({
      rewardPointBalance: 0,
      totalPointsIssued: 0,
      incomeWalletBalance: '0.00',
      cashbackIncome: '0.00',
      referralIncome: '0.00',
      royaltyIncome: '0.00',
      commerceWalletBalance: '0.00',
      totalDeposited: '0.00',
      totalWithdrawn: '0.00'
    });

    // Reset customer wallets
    await db.update(customerWallets).set({
      rewardPointBalance: 0,
      totalRewardPointsEarned: 0,
      totalRewardPointsSpent: 0,
      totalRewardPointsTransferred: 0,
      incomeBalance: '0.00',
      totalIncomeEarned: '0.00',
      totalIncomeSpent: '0.00',
      totalIncomeTransferred: '0.00',
      commerceBalance: '0.00',
      totalCommerceAdded: '0.00',
      totalCommerceSpent: '0.00',
      totalCommerceWithdrawn: '0.00',
      lastTransactionAt: null
    });

    // Reset customer profiles
    await db.update(customerProfiles).set({
      globalSerialNumber: null,
      localSerialNumber: null,
      totalPointsEarned: 0,
      currentPointsBalance: 0,
      accumulatedPoints: 0,
      globalRewardNumbers: 0,
      tier: 'bronze'
    });

    // Reset admins (keep login but reset counters)
    await db.update(admins).set({
      pointsBalance: 0,
      totalPointsReceived: 0,
      totalPointsDistributed: 0
    });

    // Step 2: Delete all transaction and activity data
    console.log('🗑️ Clearing all transaction data...');
    
    await db.delete(orders);
    await db.delete(rewardTransactions);
    await db.delete(customerGlobalNumbers);
    await db.delete(stepUpMilestones);
    await db.delete(infinityRewardCycles);
    await db.delete(infinityMerchantDistributions);
    await db.delete(rewardNumbers);
    await db.delete(cartItems);
    await db.delete(wishlistItems);
    await db.delete(reviews);
    await db.delete(chatMessages);
    await db.delete(conversations);
    await db.delete(chatRooms);
    await db.delete(pointDistributions);
    await db.delete(userWallets);
    await db.delete(pointTransactions);
    await db.delete(referrals);
    await db.delete(commissionTransactions);
    await db.delete(merchantTransactions);
    await db.delete(qrTransfers);
    await db.delete(leaderboards);
    await db.delete(pointGenerationRequests);
    await db.delete(walletTransactions);
    await db.delete(merchantIncome);
    await db.delete(merchantReferrals);
    await db.delete(royaltyDistributions);
    await db.delete(merchantShops);
    await db.delete(pointRecharges);
    await db.delete(productSales);
    await db.delete(merchantActivity);
    await db.delete(emerchantProducts);
    await db.delete(productReviewSettings);
    await db.delete(pointDistributionReports);
    await db.delete(customerPointTransactions);
    await db.delete(customerSerialNumbers);
    await db.delete(customerOTPs);
    await db.delete(customerPointTransfers);
    await db.delete(customerPurchases);
    await db.delete(customerRewards);
    await db.delete(customerAffiliateLinks);
    await db.delete(customerReferrals);
    await db.delete(customerDailyLogins);
    await db.delete(customerBirthdayPoints);
    await db.delete(shoppingVouchers);
    await db.delete(serialActivationQueue);
    await db.delete(customerWalletTransactions);
    await db.delete(customerWalletTransfers);
    await db.delete(customerReferralCommissions);
    await db.delete(companyReferrer);
    await db.delete(wasteManagementRewards);
    await db.delete(medicalFacilityBenefits);
    await db.delete(globalNumbers);
    await db.delete(stepUpRewards);
    await db.delete(merchantCashbackTransactions);
    await db.delete(monthlyCashbackDistributions);
    await db.delete(monthlyCashbackDistributionDetails);
    await db.delete(shoppingVoucherDistributions);
    await db.delete(merchantRankHistory);
    await db.delete(merchantRankConditions);
    await db.delete(voucherCashOutRequests);
    await db.delete(merchantCustomers);
    await db.delete(blockedCustomers);

    // Step 3: Delete all non-admin users (merchants and customers)
    console.log('👥 Removing all merchants and customers...');
    
    // First delete merchants
    await db.delete(merchants);
    await db.delete(merchantWallets);
    
    // Then delete customers
    await db.delete(customers);
    await db.delete(customerWallets);
    await db.delete(customerProfiles);
    
    // Finally delete user accounts (except admins)
    await db.delete(users).where(sql`role != 'global_admin' AND role != 'local_admin'`);

    // Step 4: Reset global counters
    console.log('🔢 Resetting global counters...');
    
    // Reset global number config
    await db.update(globalNumberConfig).set({
      pointsThreshold: 1500,
      rewardPointsCountTowardThreshold: false
    });

    // Reset step up config
    await db.update(stepUpConfig).set({
      multiplier: 5,
      rewardPoints: 500
    });

    // Step 5: Reset admin settings but keep basic configuration
    console.log('⚙️ Resetting admin settings...');
    
    await db.delete(adminSettings);
    
    // Recreate basic admin settings
    await db.insert(adminSettings).values([
      {
        settingKey: 'min_points_for_global_number',
        settingValue: 1500,
        settingType: 'number',
        description: 'Minimum points required for global number assignment',
        category: 'thresholds'
      },
      {
        settingKey: 'cashback_rate',
        settingValue: 15,
        settingType: 'number',
        description: 'Default cashback rate percentage',
        category: 'rates'
      },
      {
        settingKey: 'referral_commission_rate',
        settingValue: 5,
        settingType: 'number',
        description: 'Default referral commission rate percentage',
        category: 'rates'
      }
    ]);

    // Step 6: Reset products and categories (optional - you can keep or reset)
    console.log('🛍️ Resetting products and categories...');
    
    await db.delete(products);
    await db.delete(categories);
    await db.delete(brands);

    console.log('✅ Database reset completed successfully!');
    console.log('📋 Summary of changes:');
    console.log('   - All numeric counters reset to 0');
    console.log('   - All transactions and activities cleared');
    console.log('   - All merchants and customers removed');
    console.log('   - All non-admin users deleted');
    console.log('   - Admin login credentials preserved');
    console.log('   - Global counters reset to initial values');
    console.log('   - Products and categories cleared');
    
    console.log('🎯 Your website is now ready for a fresh start!');
    
  } catch (error) {
    console.error('❌ Error during database reset:', error);
    throw error;
  }
}

// Run the reset if this file is executed directly
if (process.argv[1] && process.argv[1].endsWith('reset-database.ts')) {
  resetDatabase()
    .then(() => {
      console.log('🎉 Database reset completed successfully!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Database reset failed:', error);
      process.exit(1);
    });
}

export { resetDatabase };
