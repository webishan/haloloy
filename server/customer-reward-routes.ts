import { Router } from 'express';
import { z } from 'zod';
import { storage } from './storage';
import { authenticateToken } from './auth';
import { 
  insertCustomerRewardSchema,
  insertCustomerAffiliateLinkSchema,
  insertCustomerReferralSchema,
  insertCustomerDailyLoginSchema,
  insertCustomerBirthdayPointSchema,
  insertShoppingVoucherSchema,
  insertSerialActivationQueueSchema
} from '@shared/schema';
import { randomUUID } from 'crypto';

const router = Router();

// Helper function to get customer ID from user
const getCustomerId = async (userId: string) => {
  const profile = await storage.getCustomerProfile(userId);
  if (!profile) {
    throw new Error('Customer profile not found');
  }
  return profile.id;
};

// ==================== CUSTOMER REWARDS ====================

// Get customer rewards
router.get('/rewards', authenticateToken, async (req, res) => {
  try {
    const customerId = await getCustomerId(req.user.id);
    const { type } = req.query;
    
    let rewards;
    if (type) {
      rewards = await storage.getCustomerRewardsByType(customerId, type as string);
    } else {
      rewards = await storage.getCustomerRewards(customerId);
    }

    res.json(rewards);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Process serial reward (for testing/admin use)
router.post('/rewards/serial', authenticateToken, async (req, res) => {
  try {
    const { serialType, step } = req.body;
    
    if (!serialType || !step || !['global', 'local'].includes(serialType) || ![1, 2, 3, 4].includes(step)) {
      return res.status(400).json({ error: 'Invalid serial type or step' });
    }

    const customerId = await getCustomerId(req.user.id);
    const reward = await storage.processSerialReward(customerId, serialType, step);

    res.json({ 
      success: true, 
      reward,
      message: `Serial ${serialType} reward step ${step} processed successfully` 
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ==================== AFFILIATE LINKS ====================

// Get customer affiliate link
router.get('/affiliate-link', authenticateToken, async (req, res) => {
  try {
    const customerId = await getCustomerId(req.user.id);
    let affiliateLink = await storage.getCustomerAffiliateLink(customerId);
    
    // Create affiliate link if it doesn't exist
    if (!affiliateLink) {
      const affiliateCode = await storage.generateAffiliateCode(customerId);
      affiliateLink = await storage.getCustomerAffiliateLink(customerId);
    }

    res.json(affiliateLink);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Track affiliate link click
router.post('/affiliate-link/click', async (req, res) => {
  try {
    const { affiliateCode } = req.body;
    
    if (!affiliateCode) {
      return res.status(400).json({ error: 'Affiliate code is required' });
    }

    await storage.updateAffiliateLinkStats(affiliateCode, 'click');
    
    res.json({ 
      success: true, 
      message: 'Click tracked successfully' 
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ==================== REFERRALS ====================

// Get customer referrals
router.get('/referrals', authenticateToken, async (req, res) => {
  try {
    const customerId = await getCustomerId(req.user.id);
    const referrals = await storage.getCustomerReferrals(customerId);
    
    res.json(referrals);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create referral relationship (when someone registers via affiliate link)
router.post('/referrals', async (req, res) => {
  try {
    const { referrerId, referredId, referralCode } = req.body;
    
    if (!referrerId || !referredId || !referralCode) {
      return res.status(400).json({ error: 'All fields are required' });
    }

    // Check if referral already exists
    const existingReferral = await storage.getCustomerReferralByReferred(referredId);
    if (existingReferral) {
      return res.status(400).json({ error: 'Referral relationship already exists' });
    }

    const referral = await storage.createCustomerReferral({
      referrerId,
      referredId,
      referralCode,
      commissionRate: "5.00" // 5% commission
    });

    res.json({ 
      success: true, 
      referral,
      message: 'Referral relationship created successfully' 
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ==================== DAILY LOGIN POINTS ====================

// Process daily login
router.post('/daily-login', authenticateToken, async (req, res) => {
  try {
    const customerId = await getCustomerId(req.user.id);
    const login = await storage.processDailyLogin(customerId);
    
    res.json({ 
      success: true, 
      login,
      message: `Daily login processed! ${login.pointsAwarded} points awarded (${login.streakCount} day streak)` 
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get daily login history
router.get('/daily-logins', authenticateToken, async (req, res) => {
  try {
    const customerId = await getCustomerId(req.user.id);
    const logins = await storage.getCustomerDailyLogins(customerId);
    
    res.json(logins);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ==================== BIRTHDAY POINTS ====================

// Process birthday points
router.post('/birthday-points', authenticateToken, async (req, res) => {
  try {
    const { birthYear } = req.body;
    
    if (!birthYear) {
      return res.status(400).json({ error: 'Birth year is required' });
    }

    const customerId = await getCustomerId(req.user.id);
    const birthday = await storage.processBirthdayPoints(customerId, birthYear);
    
    res.json({ 
      success: true, 
      birthday,
      message: `Birthday points processed! ${birthday.pointsAwarded} points awarded` 
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get birthday points history
router.get('/birthday-points', authenticateToken, async (req, res) => {
  try {
    const customerId = await getCustomerId(req.user.id);
    const birthdays = await storage.getCustomerBirthdayPoints(customerId);
    
    res.json(birthdays);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ==================== SHOPPING VOUCHERS ====================

// Get customer shopping vouchers
router.get('/vouchers', authenticateToken, async (req, res) => {
  try {
    const customerId = await getCustomerId(req.user.id);
    const vouchers = await storage.getCustomerShoppingVouchers(customerId);
    
    res.json(vouchers);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Use shopping voucher
router.post('/vouchers/use', authenticateToken, async (req, res) => {
  try {
    const { voucherCode } = req.body;
    
    if (!voucherCode) {
      return res.status(400).json({ error: 'Voucher code is required' });
    }

    const voucher = await storage.useShoppingVoucher(voucherCode);
    
    res.json({ 
      success: true, 
      voucher,
      message: 'Voucher used successfully' 
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ==================== SERIAL ACTIVATION ====================

// Get serial activation queue
router.get('/serial-activation', authenticateToken, async (req, res) => {
  try {
    const customerId = await getCustomerId(req.user.id);
    const queue = await storage.getSerialActivationQueue(customerId);
    
    res.json(queue);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Process serial activation
router.post('/serial-activation', authenticateToken, async (req, res) => {
  try {
    const { serialType } = req.body;
    
    if (!serialType || !['global', 'local'].includes(serialType)) {
      return res.status(400).json({ error: 'Invalid serial type' });
    }

    const customerId = await getCustomerId(req.user.id);
    const queue = await storage.processSerialActivation(customerId, serialType);
    
    res.json({ 
      success: true, 
      queue,
      message: `Serial ${serialType} activation processed successfully` 
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ==================== REWARD DISTRIBUTION ====================

// Get reward distribution details
router.get('/reward-distribution/:rewardId', authenticateToken, async (req, res) => {
  try {
    const { rewardId } = req.params;
    const customerId = await getCustomerId(req.user.id);
    
    const rewards = await storage.getCustomerRewards(customerId);
    const reward = rewards.find(r => r.id === rewardId);
    
    if (!reward) {
      return res.status(404).json({ error: 'Reward not found' });
    }

    res.json({
      reward,
      distributionDetails: reward.distributionDetails
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ==================== COMPREHENSIVE DASHBOARD ====================

// Get comprehensive reward dashboard
router.get('/dashboard', authenticateToken, async (req, res) => {
  try {
    const customerId = await getCustomerId(req.user.id);
    
    // Get all customer data
    const [
      rewards,
      affiliateLink,
      referrals,
      dailyLogins,
      birthdayPoints,
      vouchers,
      serialQueue,
      wallet,
      profile
    ] = await Promise.all([
      storage.getCustomerRewards(customerId),
      storage.getCustomerAffiliateLink(customerId),
      storage.getCustomerReferrals(customerId),
      storage.getCustomerDailyLogins(customerId),
      storage.getCustomerBirthdayPoints(customerId),
      storage.getCustomerShoppingVouchers(customerId),
      storage.getSerialActivationQueue(customerId),
      storage.getCustomerWallet(customerId),
      storage.getCustomerProfile(req.user.id)
    ]);

    // Calculate statistics
    const totalRewards = rewards.reduce((sum, r) => sum + r.pointsAwarded, 0);
    const totalCashValue = rewards.reduce((sum, r) => sum + parseFloat(r.cashValue || '0'), 0);
    const totalReferralCommission = referrals.reduce((sum, r) => sum + parseFloat(r.totalCommissionEarned.toString()), 0);
    const totalDailyLoginPoints = dailyLogins.reduce((sum, l) => sum + l.pointsAwarded, 0);
    const totalBirthdayPoints = birthdayPoints.reduce((sum, b) => sum + b.pointsAwarded, 0);
    const activeVouchers = vouchers.filter(v => v.status === 'active');
    const totalVoucherValue = activeVouchers.reduce((sum, v) => sum + parseFloat(v.voucherValue.toString()), 0);

    // Calculate current streak
    const currentStreak = dailyLogins.length > 0 ? dailyLogins[0].streakCount : 0;

    // Calculate referral statistics
    const totalReferrals = referrals.length;
    const activeReferrals = referrals.filter(r => r.isActive).length;

    const dashboardData = {
      profile,
      wallet,
      statistics: {
        totalRewards,
        totalCashValue,
        totalReferralCommission,
        totalDailyLoginPoints,
        totalBirthdayPoints,
        totalVoucherValue,
        currentStreak,
        totalReferrals,
        activeReferrals
      },
      rewards: rewards.slice(0, 10), // Recent rewards
      affiliateLink,
      referrals: referrals.slice(0, 5), // Recent referrals
      recentDailyLogins: dailyLogins.slice(0, 7), // Last 7 days
      birthdayPoints,
      activeVouchers,
      serialQueue
    };

    res.json(dashboardData);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ==================== REFERRAL COMMISSION CALCULATION ====================

// Calculate referral commission (called when referred customer earns points)
router.post('/calculate-commission', async (req, res) => {
  try {
    const { referredId, pointsEarned } = req.body;
    
    if (!referredId || !pointsEarned) {
      return res.status(400).json({ error: 'Referred ID and points earned are required' });
    }

    await storage.calculateReferralCommission(referredId, pointsEarned);
    
    res.json({ 
      success: true, 
      message: 'Referral commission calculated successfully' 
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ==================== REWARD SYSTEM STATUS ====================

// Get reward system status and eligibility
router.get('/status', authenticateToken, async (req, res) => {
  try {
    const customerId = await getCustomerId(req.user.id);
    const [wallet, serialNumber, rewards] = await Promise.all([
      storage.getCustomerWallet(customerId),
      storage.getCustomerSerialNumber(customerId),
      storage.getCustomerRewards(customerId)
    ]);

    const totalPointsEarned = wallet?.totalPointsEarned || 0;
    const hasGlobalSerial = serialNumber?.globalSerialNumber !== null;
    const hasLocalSerial = serialNumber?.localSerialNumber !== null;

    // Check eligibility for next reward steps
    const globalRewards = rewards.filter(r => r.rewardType === 'global_serial');
    const localRewards = rewards.filter(r => r.rewardType === 'local_serial');

    const nextGlobalStep = globalRewards.length < 4 ? globalRewards.length + 1 : null;
    const nextLocalStep = localRewards.length < 4 ? localRewards.length + 1 : null;

    const status = {
      totalPointsEarned,
      hasGlobalSerial,
      hasLocalSerial,
      globalSerialNumber: serialNumber?.globalSerialNumber,
      localSerialNumber: serialNumber?.localSerialNumber,
      nextGlobalStep,
      nextLocalStep,
      canActivateSerial: (wallet?.pointsBalance || 0) >= 6000,
      eligibleForSerial: totalPointsEarned >= 1500,
      rewardProgress: {
        global: globalRewards.length,
        local: localRewards.length
      }
    };

    res.json(status);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
