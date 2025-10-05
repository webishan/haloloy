import { Router } from 'express';
import { authenticateToken } from './auth';
import { storage } from './storage';

const router = Router();

// Get customer's ripple rewards data
router.get('/ripple-rewards', authenticateToken, async (req, res) => {
  try {
    const customerId = await storage.getCustomerId(req.user.userId);
    if (!customerId) {
      return res.status(404).json({ error: 'Customer not found' });
    }

    // Get ripple rewards
    const rippleRewards = await storage.getCustomerRippleRewards(customerId);
    
    // Calculate totals
    const totalRippleRewards = rippleRewards.reduce((sum, reward) => sum + reward.rippleAmount, 0);
    const totalRippleCount = rippleRewards.length;
    
    // Get recent ripple events
    const recentRipples = rippleRewards.slice(0, 10).map(reward => ({
      id: reward.id,
      referredCustomerId: reward.referredCustomerId,
      referredCustomerName: reward.referredCustomerName,
      stepUpRewardAmount: reward.stepUpRewardAmount,
      rippleAmount: reward.rippleAmount,
      ripplePercentage: reward.ripplePercentage,
      createdAt: reward.createdAt,
      description: reward.description
    }));

    // Calculate ripple breakdown by amount
    const rippleBreakdown = {
      amount500: rippleRewards.filter(r => r.stepUpRewardAmount === 500).length,
      amount1500: rippleRewards.filter(r => r.stepUpRewardAmount === 1500).length,
      amount3000: rippleRewards.filter(r => r.stepUpRewardAmount === 3000).length,
      amount30000: rippleRewards.filter(r => r.stepUpRewardAmount === 30000).length,
      amount160000: rippleRewards.filter(r => r.stepUpRewardAmount === 160000).length
    };

    res.json({
      totalRippleRewards,
      totalRippleCount,
      recentRipples,
      rippleBreakdown
    });
  } catch (error: any) {
    console.error('Error fetching ripple rewards:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get ripple reward history
router.get('/ripple-rewards/history', authenticateToken, async (req, res) => {
  try {
    const customerId = await storage.getCustomerId(req.user.userId);
    if (!customerId) {
      return res.status(404).json({ error: 'Customer not found' });
    }

    const rippleRewards = await storage.getCustomerRippleRewards(customerId);
    res.json(rippleRewards);
  } catch (error: any) {
    console.error('Error fetching ripple reward history:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
