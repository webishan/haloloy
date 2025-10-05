import { Router } from 'express';
import { z } from 'zod';
import { storage } from './storage';
import { authenticateToken } from './auth';
import { 
  insertCustomerWalletTransactionSchema,
  insertCustomerWalletTransferSchema,
  insertCustomerReferralCommissionSchema,
  insertWasteManagementRewardSchema,
  insertMedicalFacilityBenefitSchema
} from '@shared/schema';

const router = Router();

// Helper function to get customer ID from user
const getCustomerId = async (userId: string) => {
  const profile = await storage.getCustomerProfile(userId);
  if (!profile) {
    throw new Error('Customer profile not found');
  }
  return profile.id;
};

// ==================== WALLET SYSTEM ====================

// Get wallet transactions
router.get('/transactions', authenticateToken, async (req, res) => {
  try {
    const customerId = await getCustomerId(req.user.userId);
    const { walletType } = req.query;
    
    const transactions = await storage.getCustomerWalletTransactions(
      customerId, 
      walletType as string
    );

    res.json(transactions);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ==================== WALLET TRANSFERS ====================

// Get wallet transfers
router.get('/transfers', authenticateToken, async (req, res) => {
  try {
    const customerId = await getCustomerId(req.user.userId);
    const transfers = await storage.getCustomerWalletTransfers(customerId);
    
    res.json(transfers);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Transfer between wallets
router.post('/transfer', authenticateToken, async (req, res) => {
  try {
    const { fromWallet, toWallet, amount } = req.body;
    
    if (!fromWallet || !toWallet || !amount) {
      return res.status(400).json({ error: 'All fields are required' });
    }

    if (fromWallet === toWallet) {
      return res.status(400).json({ error: 'Cannot transfer to the same wallet' });
    }

    if (amount <= 0) {
      return res.status(400).json({ error: 'Amount must be positive' });
    }

    const customerId = await getCustomerId(req.user.userId);
    const transfer = await storage.transferBetweenWallets(customerId, fromWallet, toWallet, amount);
    
    res.json({ 
      success: true, 
      transfer,
      message: `Transfer completed: ${amount} from ${fromWallet} to ${toWallet}` 
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ==================== COMMERCE WALLET (MFS) ====================

// Add balance to commerce wallet
router.post('/commerce/add-balance', authenticateToken, async (req, res) => {
  try {
    const { amount, method } = req.body;
    
    if (!amount || !method) {
      return res.status(400).json({ error: 'Amount and method are required' });
    }

    if (amount <= 0) {
      return res.status(400).json({ error: 'Amount must be positive' });
    }

    const customerId = await getCustomerId(req.user.userId);
    const transaction = await storage.addCommerceBalance(customerId, amount, method);
    
    res.json({ 
      success: true, 
      transaction,
      message: `Balance added successfully: ${amount} BDT via ${method}` 
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Withdraw from commerce wallet
router.post('/commerce/withdraw', authenticateToken, async (req, res) => {
  try {
    const { amount, method } = req.body;
    
    if (!amount || !method) {
      return res.status(400).json({ error: 'Amount and method are required' });
    }

    if (amount <= 0) {
      return res.status(400).json({ error: 'Amount must be positive' });
    }

    const customerId = await getCustomerId(req.user.userId);
    const transaction = await storage.withdrawCommerceBalance(customerId, amount, method);
    
    res.json({ 
      success: true, 
      transaction,
      message: `Withdrawal successful: ${amount} BDT via ${method}` 
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Spend from commerce wallet
router.post('/commerce/spend', authenticateToken, async (req, res) => {
  try {
    const { amount, description } = req.body;
    
    if (!amount || !description) {
      return res.status(400).json({ error: 'Amount and description are required' });
    }

    if (amount <= 0) {
      return res.status(400).json({ error: 'Amount must be positive' });
    }

    const customerId = await getCustomerId(req.user.userId);
    const transaction = await storage.spendCommerceBalance(customerId, amount, description);
    
    res.json({ 
      success: true, 
      transaction,
      message: `Payment successful: ${amount} BDT for ${description}` 
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ==================== INCOME WALLET ====================

// Add income to income wallet
router.post('/income/add', authenticateToken, async (req, res) => {
  try {
    const { amount, source } = req.body;
    
    if (!amount || !source) {
      return res.status(400).json({ error: 'Amount and source are required' });
    }

    if (amount <= 0) {
      return res.status(400).json({ error: 'Amount must be positive' });
    }

    const customerId = await getCustomerId(req.user.userId);
    const transaction = await storage.addIncomeBalance(customerId, amount, source);
    
    res.json({ 
      success: true, 
      transaction,
      message: `Income added successfully: ${amount} BDT from ${source}` 
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Spend from income wallet
router.post('/income/spend', authenticateToken, async (req, res) => {
  try {
    const { amount, description } = req.body;
    
    if (!amount || !description) {
      return res.status(400).json({ error: 'Amount and description are required' });
    }

    if (amount <= 0) {
      return res.status(400).json({ error: 'Amount must be positive' });
    }

    const customerId = await getCustomerId(req.user.userId);
    const transaction = await storage.spendIncomeBalance(customerId, amount, description);
    
    res.json({ 
      success: true, 
      transaction,
      message: `Payment successful: ${amount} BDT for ${description}` 
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ==================== REWARD POINT WALLET ====================

// Add reward points
router.post('/reward-points/add', authenticateToken, async (req, res) => {
  try {
    const { points, source } = req.body;
    
    if (!points || !source) {
      return res.status(400).json({ error: 'Points and source are required' });
    }

    if (points <= 0) {
      return res.status(400).json({ error: 'Points must be positive' });
    }

    const customerId = await getCustomerId(req.user.userId);
    const transaction = await storage.addRewardPoints(customerId, points, source);
    
    // Calculate referral commission for the referrer (if this customer was referred)
    try {
      await storage.calculateReferralCommission(customerId, points);
    } catch (error) {
      console.error('Error calculating referral commission:', error);
      // Don't fail the main transaction if referral commission fails
    }
    
    res.json({ 
      success: true, 
      transaction,
      message: `Reward points added successfully: ${points} points from ${source}` 
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Spend reward points
router.post('/reward-points/spend', authenticateToken, async (req, res) => {
  try {
    const { points, description } = req.body;
    
    if (!points || !description) {
      return res.status(400).json({ error: 'Points and description are required' });
    }

    if (points <= 0) {
      return res.status(400).json({ error: 'Points must be positive' });
    }

    const customerId = await getCustomerId(req.user.userId);
    const transaction = await storage.spendRewardPoints(customerId, points, description);
    
    res.json({ 
      success: true, 
      transaction,
      message: `Reward points spent successfully: ${points} points for ${description}` 
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ==================== ENHANCED REFERRAL COMMISSIONS ====================

// Get referral commissions
router.get('/referral-commissions', authenticateToken, async (req, res) => {
  try {
    const customerId = await getCustomerId(req.user.userId);
    const commissions = await storage.getCustomerReferralCommissions(customerId);
    
    res.json(commissions);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Process referral commission (for testing/admin use)
router.post('/referral-commissions/process', authenticateToken, async (req, res) => {
  try {
    const { referredId, rewardStep, rewardType, originalRewardId } = req.body;
    
    if (!referredId || !rewardStep || !rewardType || !originalRewardId) {
      return res.status(400).json({ error: 'All fields are required' });
    }

    if (![1, 2, 3, 4].includes(rewardStep)) {
      return res.status(400).json({ error: 'Invalid reward step' });
    }

    await storage.processReferralCommission(referredId, rewardStep, rewardType, originalRewardId);
    
    res.json({ 
      success: true, 
      message: `Referral commission processed for step ${rewardStep}` 
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ==================== WASTE MANAGEMENT REWARDS ====================

// Get waste management rewards
router.get('/waste-management', authenticateToken, async (req, res) => {
  try {
    const customerId = await getCustomerId(req.user.userId);
    const rewards = await storage.getWasteManagementRewards(customerId);
    
    res.json(rewards);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Process waste management reward
router.post('/waste-management/process', authenticateToken, async (req, res) => {
  try {
    const { wasteType, quantity } = req.body;
    
    if (!wasteType || !quantity) {
      return res.status(400).json({ error: 'Waste type and quantity are required' });
    }

    if (quantity <= 0) {
      return res.status(400).json({ error: 'Quantity must be positive' });
    }

    const customerId = await getCustomerId(req.user.userId);
    const reward = await storage.processWasteManagementReward(customerId, wasteType, quantity);
    
    res.json({ 
      success: true, 
      reward,
      message: `Waste management reward processed: ${reward.pointsAwarded} points for ${quantity} kg of ${wasteType}` 
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ==================== MEDICAL FACILITY BENEFITS ====================

// Get medical facility benefits
router.get('/medical-benefits', authenticateToken, async (req, res) => {
  try {
    const customerId = await getCustomerId(req.user.userId);
    const benefits = await storage.getMedicalFacilityBenefits(customerId);
    
    res.json(benefits);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Use medical facility benefit
router.post('/medical-benefits/use', authenticateToken, async (req, res) => {
  try {
    const { benefitId } = req.body;
    
    if (!benefitId) {
      return res.status(400).json({ error: 'Benefit ID is required' });
    }

    const benefit = await storage.useMedicalFacilityBenefit(benefitId);
    
    res.json({ 
      success: true, 
      benefit,
      message: 'Medical facility benefit used successfully' 
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create medical facility benefit (for testing/admin use)
router.post('/medical-benefits/create', authenticateToken, async (req, res) => {
  try {
    const { benefitType, benefitAmount, facilityName, facilityType, expiresAt } = req.body;
    
    if (!benefitType || !benefitAmount || !facilityName || !facilityType) {
      return res.status(400).json({ error: 'All fields are required' });
    }

    const customerId = await getCustomerId(req.user.userId);
    const benefit = await storage.createMedicalFacilityBenefit({
      customerId,
      benefitType,
      benefitAmount: benefitAmount.toString(),
      facilityName,
      facilityType,
      expiresAt: expiresAt ? new Date(expiresAt) : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days default
    });
    
    res.json({ 
      success: true, 
      benefit,
      message: 'Medical facility benefit created successfully' 
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ==================== COMPANY REFERRER ====================

// Get company referrer status
router.get('/company-referrer', authenticateToken, async (req, res) => {
  try {
    const customerId = await getCustomerId(req.user.userId);
    const companyReferrer = await storage.getCompanyReferrer(customerId);
    
    res.json(companyReferrer);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Assign company as referrer
router.post('/company-referrer/assign', authenticateToken, async (req, res) => {
  try {
    const customerId = await getCustomerId(req.user.userId);
    const companyReferrer = await storage.assignCompanyAsReferrer(customerId);
    
    res.json({ 
      success: true, 
      companyReferrer,
      message: 'Company assigned as referrer successfully' 
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ==================== COMPREHENSIVE WALLET DASHBOARD ====================

// Get comprehensive wallet dashboard
router.get('/dashboard', authenticateToken, async (req, res) => {
  try {
    const customerId = await getCustomerId(req.user.userId);
    
    // Get all wallet data
    const [
      wallet,
      transactions,
      transfers,
      referralCommissions,
      wasteManagementRewards,
      medicalBenefits,
      companyReferrer
    ] = await Promise.all([
      storage.getCustomerWallet(customerId),
      storage.getCustomerWalletTransactions(customerId),
      storage.getCustomerWalletTransfers(customerId),
      storage.getCustomerReferralCommissions(customerId),
      storage.getWasteManagementRewards(customerId),
      storage.getMedicalFacilityBenefits(customerId),
      storage.getCompanyReferrer(customerId)
    ]);

    // Calculate statistics
    const totalRewardPoints = wallet?.rewardPointBalance || 0;
    const totalIncome = parseFloat(wallet?.incomeBalance.toString() || '0');
    const totalCommerce = parseFloat(wallet?.commerceBalance.toString() || '0');
    
    const totalTransactions = transactions.length;
    const totalTransfers = transfers.length;
    const totalReferralCommissions = referralCommissions.reduce((sum, c) => sum + parseFloat(c.commissionAmount.toString()), 0);
    const totalWasteRewards = wasteManagementRewards.reduce((sum, r) => sum + r.pointsAwarded, 0);
    const availableMedicalBenefits = medicalBenefits.filter(b => b.status === 'available').length;

    const dashboardData = {
      wallet,
      statistics: {
        totalRewardPoints,
        totalIncome,
        totalCommerce,
        totalTransactions,
        totalTransfers,
        totalReferralCommissions,
        totalWasteRewards,
        availableMedicalBenefits
      },
      recentTransactions: transactions.slice(0, 10),
      recentTransfers: transfers.slice(0, 5),
      referralCommissions: referralCommissions.slice(0, 5),
      wasteManagementRewards: wasteManagementRewards.slice(0, 5),
      medicalBenefits: medicalBenefits.slice(0, 5),
      companyReferrer
    };

    res.json(dashboardData);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ==================== RIPPLE REWARD SYSTEM ====================

// Get customer's Ripple rewards (as a referrer)
router.get('/ripple-rewards', authenticateToken, async (req, res) => {
  try {
    const customerId = await getCustomerId(req.user.userId);
    const rippleRewards = await storage.getRippleRewards(customerId);
    
    const totalRippleRewards = rippleRewards.reduce((sum, r) => sum + r.rippleRewardAmount, 0);
    
    res.json({
      rippleRewards,
      totalRippleRewards,
      count: rippleRewards.length
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ==================== SHOPPING VOUCHERS ====================

// Get customer's shopping vouchers
router.get('/shopping-vouchers', authenticateToken, async (req, res) => {
  try {
    const customerId = await getCustomerId(req.user.userId);
    const vouchers = await storage.getCustomerShoppingVouchers(customerId);
    
    const activeVouchers = vouchers.filter(v => v.status === 'active');
    const usedVouchers = vouchers.filter(v => v.status === 'used');
    const expiredVouchers = vouchers.filter(v => v.status === 'expired');
    
    const totalVoucherValue = activeVouchers.reduce((sum, v) => sum + v.voucherValue, 0);
    
    res.json({
      vouchers,
      statistics: {
        totalVouchers: vouchers.length,
        activeVouchers: activeVouchers.length,
        usedVouchers: usedVouchers.length,
        expiredVouchers: expiredVouchers.length,
        totalVoucherValue
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get voucher by code (for validation/usage)
router.get('/shopping-vouchers/:voucherCode', authenticateToken, async (req, res) => {
  try {
    const { voucherCode } = req.params;
    const voucher = await storage.getShoppingVoucherByCode(voucherCode);
    
    if (!voucher) {
      return res.status(404).json({ error: 'Voucher not found' });
    }
    
    res.json(voucher);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Use/redeem a shopping voucher
router.post('/shopping-vouchers/:voucherCode/use', authenticateToken, async (req, res) => {
  try {
    const { voucherCode } = req.params;
    const customerId = await getCustomerId(req.user.userId);
    
    const voucher = await storage.getShoppingVoucherByCode(voucherCode);
    
    if (!voucher) {
      return res.status(404).json({ error: 'Voucher not found' });
    }
    
    if (voucher.customerId !== customerId) {
      return res.status(403).json({ error: 'This voucher does not belong to you' });
    }
    
    if (voucher.status !== 'active') {
      return res.status(400).json({ error: `Voucher is ${voucher.status}` });
    }
    
    const usedVoucher = await storage.useShoppingVoucher(voucherCode);
    
    res.json({
      success: true,
      voucher: usedVoucher,
      message: 'Voucher redeemed successfully'
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ==================== REFERRAL SYSTEM ====================

// Get customer referral information (link & code)
router.get('/wallet/referral-info', authenticateToken, async (req, res) => {
  try {
    console.log('🔍 Fetching referral info for userId:', req.user.userId);
    
    // Get customer profile first, create if doesn't exist
    let profile = await storage.getCustomerProfile(req.user.userId);
    console.log('🔍 Profile found:', !!profile, profile ? `ID: ${profile.id}` : 'null');
    
    if (!profile) {
      console.log('🔍 Creating customer profile for userId:', req.user.userId);
      
      // Get user info
      const user = await storage.getUser(req.user.userId);
      if (!user) {
        console.log('❌ User not found for userId:', req.user.userId);
        return res.status(404).json({ error: 'User not found' });
      }

      // Generate unique account number
      const uniqueAccountNumber = await storage.generateUniqueAccountNumber();
      
      // Create customer profile
      profile = await storage.createCustomerProfile({
        userId: req.user.userId,
        uniqueAccountNumber,
        mobileNumber: user.phone || `+880${Math.floor(Math.random() * 1000000000)}`,
        email: user.email,
        fullName: `${user.firstName} ${user.lastName}`,
        profileComplete: false,
        totalPointsEarned: 0,
        currentPointsBalance: 0,
        accumulatedPoints: 0,
        globalSerialNumber: 0,
        localSerialNumber: 0,
        tier: 'bronze',
        isActive: true
      });

      // Create customer wallet
      await storage.createCustomerWallet({
        customerId: profile.id,
        pointsBalance: 0,
        totalPointsEarned: 0,
        totalPointsSpent: 0,
        totalPointsTransferred: 0
      });

      console.log('✅ Customer profile created successfully');
    }

    // Now get/create referral code using profile ID
    const referralCode = await storage.ensureCustomerHasReferralCode(profile.id);
    console.log('🔍 Referral code:', referralCode);
    
    // Build a robust base URL for referral links
    const headerOrigin = (req.headers.origin as string) || '';
    const hostHeader = (req.headers.host as string) || '';
    const protocol = (req.headers['x-forwarded-proto'] as string) || (req.protocol || 'http');
    const inferredBase = hostHeader ? `${protocol}://${hostHeader}` : '';
    const baseUrl = process.env.PUBLIC_APP_ORIGIN || headerOrigin || inferredBase || 'http://localhost:5006';

    const referralLink = `${baseUrl}/register?ref=${referralCode}`;

    const response = {
      referralCode,
      referralLink,
      customerName: profile.fullName,
      accountNumber: profile.uniqueAccountNumber
    };

    console.log('📋 Referral Info Response:', JSON.stringify(response, null, 2));
    res.json(response);
  } catch (error) {
    console.error('❌ Error getting referral info:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get referral statistics and referred customers list
router.get('/wallet/referral-stats', authenticateToken, async (req, res) => {
  try {
    console.log('🔍 Fetching referral stats for userId:', req.user.userId);
    
    // Get customer profile first, create if doesn't exist
    let profile = await storage.getCustomerProfile(req.user.userId);
    console.log('🔍 Profile found for stats:', !!profile, profile ? `ID: ${profile.id}` : 'null');
    
    if (!profile) {
      console.log('🔍 Creating customer profile for referral stats, userId:', req.user.userId);
      
      // Get user info
      const user = await storage.getUser(req.user.userId);
      if (!user) {
        console.log('❌ User not found for userId:', req.user.userId);
        return res.status(404).json({ error: 'User not found' });
      }

      // Generate unique account number
      const uniqueAccountNumber = await storage.generateUniqueAccountNumber();
      
      // Create customer profile
      profile = await storage.createCustomerProfile({
        userId: req.user.userId,
        uniqueAccountNumber,
        mobileNumber: user.phone || `+880${Math.floor(Math.random() * 1000000000)}`,
        email: user.email,
        fullName: `${user.firstName} ${user.lastName}`,
        profileComplete: false,
        totalPointsEarned: 0,
        currentPointsBalance: 0,
        accumulatedPoints: 0,
        globalSerialNumber: 0,
        localSerialNumber: 0,
        tier: 'bronze',
        isActive: true
      });

      // Create customer wallet
      await storage.createCustomerWallet({
        customerId: profile.id,
        pointsBalance: 0,
        totalPointsEarned: 0,
        totalPointsSpent: 0,
        totalPointsTransferred: 0
      });

      console.log('✅ Customer profile created for referral stats');
    }
    
    const stats = await storage.getReferralStatistics(profile.id);
    console.log('🔍 Referral stats:', JSON.stringify(stats, null, 2));
    
    const response = {
      success: true,
      ...stats,
      commissionRate: 5
    };
    
    console.log('📊 Referral Stats Response:', JSON.stringify(response, null, 2));
    res.json(response);
  } catch (error) {
    console.error('❌ Error getting referral stats:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
