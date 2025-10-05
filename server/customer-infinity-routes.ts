import { Router } from 'express';
import { authenticateToken } from './auth';
import { storage } from './storage';
import { infinityRewardSystem } from './services/InfinityRewardSystem';

// Helper function to get customer ID from user
const getCustomerId = async (userId: string): Promise<string> => {
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

// Get customer's infinity rewards data
router.get('/infinity-rewards', authenticateToken, async (req, res) => {
  try {
    const customerId = await getCustomerId(req.user.userId);
    if (!customerId) {
      return res.status(404).json({ error: 'Customer not found' });
    }

    // Get customer profile
    const profile = await storage.getCustomerProfileById(customerId);
    if (!profile) {
      return res.status(404).json({ error: 'Customer profile not found' });
    }

    // Get infinity cycles
    const cycles = await storage.getCustomerInfinityCycles(customerId);
    
    // Calculate totals
    const totalCycles = cycles.length;
    const totalGlobalNumbers = cycles.reduce((sum, cycle) => sum + cycle.globalNumbersGenerated, 0);
    
    // Check eligibility for next cycle
    const eligibility = await infinityRewardSystem.checkInfinityEligibility(req.user.userId);
    
    // Get global numbers for each cycle
    const cyclesWithGlobalNumbers = await Promise.all(
      cycles.map(async (cycle) => ({
        ...cycle,
        globalNumbers: await storage.getGlobalNumbersForCycle(cycle.id)
      }))
    );

    res.json({
      cycles: cyclesWithGlobalNumbers,
      totalCycles,
      totalGlobalNumbers,
      nextCycleRequirement: 30000,
      isEligible: eligibility.isEligible,
      currentPoints: eligibility.currentPoints
    });
  } catch (error: any) {
    console.error('Error fetching infinity rewards:', error);
    res.status(500).json({ error: error.message });
  }
});

// Trigger infinity cycle (for testing)
router.post('/infinity-rewards/trigger', authenticateToken, async (req, res) => {
  try {
    const customerId = await getCustomerId(req.user.userId);
    if (!customerId) {
      return res.status(404).json({ error: 'Customer not found' });
    }

    const result = await infinityRewardSystem.processInfinityCycle(req.user.userId);
    
    if (result.success) {
      res.json({
        success: true,
        message: 'Infinity cycle processed successfully',
        cycleData: result.cycleData
      });
    } else {
      res.status(400).json({
        success: false,
        error: result.error
      });
    }
  } catch (error: any) {
    console.error('Error triggering infinity cycle:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
