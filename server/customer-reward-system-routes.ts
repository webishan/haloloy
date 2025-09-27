import { Router } from 'express';
import { storage } from './storage';
import { RewardSystemService } from './services/RewardSystemService';

const rewardSystemService = new RewardSystemService();

const router = Router();

// Get complete reward system data for customer
router.get('/reward-system', async (req, res) => {
  try {
    const customerId = req.user?.id;
    if (!customerId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const rewardData = await rewardSystemService.getRewardSystemData(customerId);
    res.json(rewardData);
  } catch (error) {
    console.error('Error fetching reward system data:', error);
    res.status(500).json({ error: 'Failed to fetch reward system data' });
  }
});

// Get StepUp reward progress
router.get('/stepup-progress', async (req, res) => {
  try {
    const customerId = req.user?.id;
    if (!customerId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const rewardNumbers = await storage.getGlobalRewardNumbersByCustomer(customerId);
    const activeRewardNumber = rewardNumbers.find(rn => !rn.isCompleted);
    
    if (!activeRewardNumber) {
      return res.json({ 
        hasActiveReward: false,
        message: 'No active reward number. Accumulate 1500 points to get one!'
      });
    }

    const stepUpProgress = {
      rewardNumber: activeRewardNumber.rewardNumber,
      serialNumber: activeRewardNumber.serialNumber,
      currentPoints: activeRewardNumber.currentPoints,
      totalRequired: activeRewardNumber.totalRequired,
      steps: [
        {
          step: 1,
          multiplier: activeRewardNumber.step1.multiplier,
          pointsRequired: activeRewardNumber.step1.amount,
          reward: activeRewardNumber.step1.reward,
          completed: activeRewardNumber.step1.completed,
          progress: Math.min(100, (activeRewardNumber.currentPoints / activeRewardNumber.step1.amount) * 100)
        },
        {
          step: 2,
          multiplier: activeRewardNumber.step2.multiplier,
          pointsRequired: activeRewardNumber.step2.amount,
          reward: activeRewardNumber.step2.reward,
          completed: activeRewardNumber.step2.completed,
          progress: activeRewardNumber.step1.completed ? 
            Math.min(100, ((activeRewardNumber.currentPoints - activeRewardNumber.step1.amount) / activeRewardNumber.step2.amount) * 100) : 0
        },
        {
          step: 3,
          multiplier: activeRewardNumber.step3.multiplier,
          pointsRequired: activeRewardNumber.step3.amount,
          reward: activeRewardNumber.step3.reward,
          completed: activeRewardNumber.step3.completed,
          progress: activeRewardNumber.step2.completed ? 
            Math.min(100, ((activeRewardNumber.currentPoints - activeRewardNumber.step1.amount - activeRewardNumber.step2.amount) / activeRewardNumber.step3.amount) * 100) : 0
        },
        {
          step: 4,
          multiplier: activeRewardNumber.step4.multiplier,
          pointsRequired: activeRewardNumber.step4.amount,
          reward: activeRewardNumber.step4.reward,
          completed: activeRewardNumber.step4.completed,
          progress: activeRewardNumber.step3.completed ? 
            Math.min(100, ((activeRewardNumber.currentPoints - activeRewardNumber.step1.amount - activeRewardNumber.step2.amount - activeRewardNumber.step3.amount) / activeRewardNumber.step4.amount) * 100) : 0
        },
        {
          step: 5,
          multiplier: activeRewardNumber.step5.multiplier,
          pointsRequired: activeRewardNumber.step5.amount,
          reward: activeRewardNumber.step5.reward,
          completed: activeRewardNumber.step5.completed,
          progress: activeRewardNumber.step4.completed ? 
            Math.min(100, ((activeRewardNumber.currentPoints - activeRewardNumber.step1.amount - activeRewardNumber.step2.amount - activeRewardNumber.step3.amount - activeRewardNumber.step4.amount) / activeRewardNumber.step5.amount) * 100) : 0
        }
      ]
    };

    res.json(stepUpProgress);
  } catch (error) {
    console.error('Error fetching StepUp progress:', error);
    res.status(500).json({ error: 'Failed to fetch StepUp progress' });
  }
});

// Get affiliate rewards
router.get('/affiliate-rewards', async (req, res) => {
  try {
    const customerId = req.user?.id;
    if (!customerId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Get affiliate rewards from transactions
    const affiliateRewards = await storage.getCustomerPointTransactions(customerId, 'affiliate_reward');
    const totalAffiliateRewards = affiliateRewards.reduce((sum, transaction) => sum + transaction.points, 0);

    res.json({
      totalAffiliateRewards,
      transactions: affiliateRewards
    });
  } catch (error) {
    console.error('Error fetching affiliate rewards:', error);
    res.status(500).json({ error: 'Failed to fetch affiliate rewards' });
  }
});

// Get ripple rewards
router.get('/ripple-rewards', async (req, res) => {
  try {
    const customerId = req.user?.id;
    if (!customerId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Get ripple rewards from transactions
    const rippleRewards = await storage.getCustomerPointTransactions(customerId, 'ripple_reward');
    const totalRippleRewards = rippleRewards.reduce((sum, transaction) => sum + transaction.points, 0);

    res.json({
      totalRippleRewards,
      transactions: rippleRewards
    });
  } catch (error) {
    console.error('Error fetching ripple rewards:', error);
    res.status(500).json({ error: 'Failed to fetch ripple rewards' });
  }
});

// Get shopping vouchers
router.get('/shopping-vouchers', async (req, res) => {
  try {
    const customerId = req.user?.id;
    if (!customerId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const vouchers = await storage.getShoppingVouchersByCustomer(customerId);
    res.json(vouchers);
  } catch (error) {
    console.error('Error fetching shopping vouchers:', error);
    res.status(500).json({ error: 'Failed to fetch shopping vouchers' });
  }
});

// Process affiliate reward (called when referred customer earns points)
router.post('/process-affiliate-reward', async (req, res) => {
  try {
    const { referrerId, refereeId, basePoints } = req.body;
    
    if (!referrerId || !refereeId || !basePoints) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    await rewardSystemService.processAffiliateReward(referrerId, refereeId, basePoints);
    res.json({ success: true, message: 'Affiliate reward processed' });
  } catch (error) {
    console.error('Error processing affiliate reward:', error);
    res.status(500).json({ error: 'Failed to process affiliate reward' });
  }
});

// Process ripple reward (called when referred customer completes StepUp step)
router.post('/process-ripple-reward', async (req, res) => {
  try {
    const { referrerId, refereeRewardStep, refereeRewardAmount } = req.body;
    
    if (!referrerId || !refereeRewardStep || !refereeRewardAmount) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    await rewardSystemService.processRippleReward(referrerId, refereeRewardStep, refereeRewardAmount);
    res.json({ success: true, message: 'Ripple reward processed' });
  } catch (error) {
    console.error('Error processing ripple reward:', error);
    res.status(500).json({ error: 'Failed to process ripple reward' });
  }
});

// Create shopping voucher (called when StepUp step 4 is completed)
router.post('/create-shopping-voucher', async (req, res) => {
  try {
    const { customerId, merchantId } = req.body;
    
    if (!customerId || !merchantId) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    await rewardSystemService.createShoppingVoucher(customerId, merchantId);
    res.json({ success: true, message: 'Shopping voucher created' });
  } catch (error) {
    console.error('Error creating shopping voucher:', error);
    res.status(500).json({ error: 'Failed to create shopping voucher' });
  }
});

export default router;
