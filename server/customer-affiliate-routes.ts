import { Router } from 'express';
import { authenticateToken } from './auth';
import { storage } from './storage';

// Helper function to get customer ID from user
const getCustomerId = async (userId: string): Promise<string | null> => {
  let profile = await storage.getCustomerProfile(userId);
  
  // If profile doesn't exist, create it
  if (!profile) {
    // Generate unique account number
    const uniqueAccountNumber = await storage.generateUniqueAccountNumber();
    
    // Create customer profile
    profile = await storage.createCustomerProfile({
      userId: userId,
      uniqueAccountNumber,
      mobileNumber: `+880${Math.floor(Math.random() * 1000000000)}`,
      email: 'customer@komarce.com', // Default email
      fullName: 'Customer User',
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
      rewardPointBalance: 0,
      totalRewardPointsEarned: 0,
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
  }

  return profile.id;
};

const router = Router();

// Get customer's affiliate rewards data
router.get('/affiliate-rewards/:userId?', authenticateToken, async (req, res) => {
  try {
    const { userId } = req.params;
    const targetUserId = userId || req.user.userId;
    
    // Verify the user is accessing their own data or is an admin
    if (targetUserId !== req.user.userId && req.user.role !== 'admin' && req.user.role !== 'global_admin') {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    console.log(`🔍 Getting affiliate rewards for user: ${targetUserId}`);
    const customerId = await getCustomerId(targetUserId);
    console.log(`📋 Customer ID: ${customerId}`);
    if (!customerId) {
      return res.status(404).json({ error: 'Customer not found' });
    }

    // Get affiliate commission data
    console.log(`📊 Getting commission data for customer: ${customerId}`);
    const commissionData = await storage.getCustomerAffiliateCommissions(customerId);
    console.log(`📊 Commission data retrieved: ${commissionData.length} items`);
    
    // Get referred customers
    console.log(`👥 Getting referred customers for customer: ${customerId}`);
    const referredCustomers = await storage.getReferredCustomers(customerId);
    console.log(`👥 Referred customers retrieved: ${referredCustomers.length} items`);
    
    // Calculate totals
    const totalCommissionEarned = commissionData.reduce((sum, commission) => sum + commission.amount, 0);
    const totalReferrals = referredCustomers.length;
    const activeReferrals = referredCustomers.filter(customer => customer.isActive).length;
    
    // Calculate lifetime and monthly commission
    const lifetimeCommission = totalCommissionEarned;
    const currentMonth = new Date().getMonth();
    const currentYear = new Date().getFullYear();
    const monthlyCommission = commissionData
      .filter(commission => {
        const commissionDate = new Date(commission.createdAt);
        return commissionDate.getMonth() === currentMonth && commissionDate.getFullYear() === currentYear;
      })
      .reduce((sum, commission) => sum + commission.amount, 0);

    // Generate referral link using the referral code
    const referralCode = await storage.ensureCustomerHasReferralCode(customerId);
    const referralLink = `${process.env.PUBLIC_APP_ORIGIN || 'http://localhost:5006'}/register?ref=${referralCode}`;

    res.json({
      totalCommissionEarned,
      totalReferrals,
      activeReferrals,
      lifetimeCommission,
      monthlyCommission,
      referredCustomers: referredCustomers.map(customer => ({
        id: customer.id,
        name: customer.fullName,
        email: customer.email,
        totalPointsEarned: customer.totalPointsEarned || 0,
        commissionEarned: customer.commissionEarned || 0,
        lastActivity: customer.lastActivity || customer.createdAt,
        isActive: customer.isActive
      })),
      referralLink,
      referralCode
    });
  } catch (error: any) {
    console.error('Error fetching affiliate rewards:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get affiliate commission history
router.get('/affiliate-commissions', authenticateToken, async (req, res) => {
  try {
    const customerId = await getCustomerId(req.user.userId);
    if (!customerId) {
      return res.status(404).json({ error: 'Customer not found' });
    }

    const commissions = await storage.getCustomerAffiliateCommissions(customerId);
    res.json(commissions);
  } catch (error: any) {
    console.error('Error fetching affiliate commissions:', error);
    res.status(500).json({ error: error.message });
  }
});

// Test endpoint to add points and trigger referral commission (for testing)
router.post('/test-add-points', async (req, res) => {
  try {
    const { customerId, points = 500 } = req.body;
    
    if (!customerId) {
      return res.status(400).json({ error: 'Customer ID is required' });
    }

    console.log(`🧪 Testing: Adding ${points} points to customer ${customerId}`);
    
    // Create a simple transaction that should trigger referral commission
    await storage.createCustomerPointTransaction({
      customerId,
      merchantId: 'test-merchant',
      transactionType: 'earned',
      points,
      balanceAfter: 0,
      description: `Test points for affiliate commission testing`,
      referenceId: 'test-reference'
    });

    // Trigger referral commission calculation
    await storage.calculateReferralCommission(customerId, points);
    
    console.log(`✅ Added ${points} points and triggered referral commission for customer ${customerId}`);
    
    res.json({
      success: true,
      message: `Added ${points} points to customer ${customerId} and triggered referral commission`,
      pointsAdded: points,
      customerId
    });
  } catch (error: any) {
    console.error('Error in test-add-points:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get customer's Infinity Rewards
router.get('/infinity-rewards/:userId?', authenticateToken, async (req, res) => {
  try {
    const { userId } = req.params;
    const targetUserId = userId || req.user.userId;
    
    // Verify the user is accessing their own data or is an admin
    if (targetUserId !== req.user.userId && req.user.role !== 'admin' && req.user.role !== 'global_admin') {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    console.log(`🔍 Getting Infinity Rewards for user: ${targetUserId}`);
    const customerId = await getCustomerId(targetUserId);
    if (!customerId) {
      return res.status(404).json({ error: 'Customer not found' });
    }

    const infinityCycles = await storage.getCustomerInfinityCycles(customerId);
    
    res.json({
      cycles: infinityCycles,
      totalCycles: infinityCycles.length,
      totalRewardNumbers: infinityCycles.reduce((sum, cycle) => sum + cycle.rewardNumbers.length, 0),
      totalPoints: infinityCycles.reduce((sum, cycle) => sum + cycle.totalPoints, 0)
    });
  } catch (error) {
    console.error('Error getting Infinity Rewards:', error);
    res.status(500).json({ error: error instanceof Error ? error.message : 'An error occurred' });
  }
});

// Get customer's Shopping Vouchers
router.get('/shopping-vouchers/:userId?', authenticateToken, async (req, res) => {
  try {
    const { userId } = req.params;
    const targetUserId = userId || req.user.userId;
    
    // Verify the user is accessing their own data or is an admin
    if (targetUserId !== req.user.userId && req.user.role !== 'admin' && req.user.role !== 'global_admin') {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    console.log(`🔍 Getting Shopping Vouchers for user: ${targetUserId}`);
    const customerId = await getCustomerId(targetUserId);
    if (!customerId) {
      return res.status(404).json({ error: 'Customer not found' });
    }

    const vouchers = await storage.getCustomerShoppingVouchers(customerId);
    const notifications = await storage.getCustomerShoppingVoucherNotifications(customerId);
    
    res.json({
      vouchers,
      notifications,
      totalVouchers: vouchers.length,
      totalPointsAllocated: vouchers.reduce((sum, voucher) => sum + voucher.pointsAllocated, 0),
      totalPointsUsed: vouchers.reduce((sum, voucher) => sum + voucher.pointsUsed, 0),
      totalPointsRemaining: vouchers.reduce((sum, voucher) => sum + voucher.pointsRemaining, 0),
      unreadNotifications: notifications.filter(n => !n.isRead).length
    });
  } catch (error) {
    console.error('Error getting Shopping Vouchers:', error);
    res.status(500).json({ error: error instanceof Error ? error.message : 'An error occurred' });
  }
});

// Use Shopping Voucher
router.post('/use-shopping-voucher', authenticateToken, async (req, res) => {
  try {
    const { voucherCode, amount } = req.body;
    
    if (!voucherCode || !amount || amount <= 0) {
      return res.status(400).json({ error: 'Valid voucher code and amount required' });
    }

    const customerId = await getCustomerId(req.user.userId);
    if (!customerId) {
      return res.status(404).json({ error: 'Customer not found' });
    }

    const result = await storage.useShoppingVoucher(voucherCode, amount, customerId);
    
    if (result.success) {
      res.json({
        success: true,
        message: result.message,
        remainingPoints: result.remainingPoints
      });
    } else {
      res.status(400).json({
        success: false,
        message: result.message
      });
    }
  } catch (error) {
    console.error('Error using shopping voucher:', error);
    res.status(500).json({ error: error instanceof Error ? error.message : 'An error occurred' });
  }
});

// Get customer's Ripple Rewards
router.get('/ripple-rewards/:userId?', authenticateToken, async (req, res) => {
  try {
    const { userId } = req.params;
    const targetUserId = userId || req.user.userId;
    
    // Verify the user is accessing their own data or is an admin
    if (targetUserId !== req.user.userId && req.user.role !== 'admin' && req.user.role !== 'global_admin') {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    console.log(`🔍 Getting Ripple Rewards for user: ${targetUserId}`);
    const customerId = await getCustomerId(targetUserId);
    if (!customerId) {
      return res.status(404).json({ error: 'Customer not found' });
    }

    const rippleRewards = await storage.getCustomerRippleRewards(customerId);
    
    res.json({
      rewards: rippleRewards,
      totalRewards: rippleRewards.length,
      totalPointsEarned: rippleRewards.reduce((sum, reward) => sum + reward.rippleRewardAmount, 0)
    });
  } catch (error) {
    console.error('Error getting Ripple Rewards:', error);
    res.status(500).json({ error: error instanceof Error ? error.message : 'An error occurred' });
  }
});

export default router;
