import { Express, Request, Response } from "express";
import { storage } from "./storage";
import { rewardSystemService } from "./services/RewardSystemService";

// Authentication middleware (copied from routes.ts)
function authenticateToken(req: Request, res: Response, next: Function) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ message: 'Access token required' });
  }

  // For development, we'll use a simple token validation
  // In production, you'd verify JWT tokens properly
  if (token.startsWith('dev-token-') || token === 'test-token') {
    req.user = { userId: 'test-user-id', role: 'customer' };
    next();
  } else {
    res.status(403).json({ message: 'Invalid or expired token' });
  }
}

// Authorization middleware
function authorizeRole(allowedRoles: string[]) {
  return (req: Request, res: Response, next: Function) => {
    if (!req.user || !allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ message: 'Insufficient permissions' });
    }
    next();
  };
}

export function registerGlobalRewardRoutes(app: Express) {
  
  // Get customer's comprehensive reward system data (matches screenshot)
  app.get('/api/customer/reward-system-data', authenticateToken, authorizeRole(['customer']), async (req, res) => {
    try {
      const customerId = await getCustomerId(req.user.userId);
      if (!customerId) {
        return res.status(404).json({ error: 'Customer profile not found' });
      }

      const rewardData = await rewardSystemService.getRewardSystemData(customerId);
      res.json(rewardData);
    } catch (error) {
      console.error('Error getting reward system data:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // Add accumulated points (from various sources) - implements 1500 conversion logic
  app.post('/api/customer/add-accumulated-points', authenticateToken, authorizeRole(['customer', 'merchant']), async (req, res) => {
    try {
      const { customerId, points, source } = req.body;
      
      if (!customerId || !points || !source) {
        return res.status(400).json({ error: 'Missing required fields' });
      }

      const result = await rewardSystemService.addAccumulatedPoints(customerId, points, source);
      
      res.json({
        success: true,
        rewardNumberCreated: result.rewardNumberCreated,
        newSerialNumber: result.newSerialNumber,
        message: result.rewardNumberCreated 
          ? `🎉 Congratulations! You've earned Global Serial Number #${result.newSerialNumber}! Your accumulated points have been converted to a reward number.`
          : `Added ${points} points from ${source} to accumulated points`
      });
    } catch (error) {
      console.error('Error adding accumulated points:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // Transfer from reward wallet to balance wallet (with 12.5% VAT + 5% service charge)
  app.post('/api/customer/transfer-reward-to-balance', authenticateToken, authorizeRole(['customer']), async (req, res) => {
    try {
      const { amount } = req.body;
      const customerId = await getCustomerId(req.user.userId);
      
      if (!customerId) {
        return res.status(404).json({ error: 'Customer profile not found' });
      }

      if (!amount || amount <= 0) {
        return res.status(400).json({ error: 'Invalid amount' });
      }

      const result = await rewardSystemService.transferRewardToBalance(customerId, amount);
      
      res.json({
        success: true,
        ...result,
        message: `Successfully transferred ${amount} Taka from reward income to balance wallet. Final amount: ${result.finalAmount} Taka (after VAT: ${result.vatAmount} Taka, Service charge: ${result.serviceCharge} Taka)`
      });
    } catch (error) {
      console.error('Error transferring reward to balance:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // Get customer's global reward numbers
  app.get('/api/customer/global-reward-numbers', authenticateToken, authorizeRole(['customer']), async (req, res) => {
    try {
      const customerId = await getCustomerId(req.user.userId);
      if (!customerId) {
        return res.status(404).json({ error: 'Customer profile not found' });
      }

      const rewardNumbers = await storage.getGlobalRewardNumbersByCustomer(customerId);
      res.json(rewardNumbers);
    } catch (error) {
      console.error('Error getting global reward numbers:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // Process affiliate reward (when someone you referred earns points)
  app.post('/api/customer/process-affiliate-reward', authenticateToken, authorizeRole(['system', 'merchant']), async (req, res) => {
    try {
      const { referrerId, refereeId, basePoints } = req.body;
      
      if (!referrerId || !refereeId || !basePoints) {
        return res.status(400).json({ error: 'Missing required fields' });
      }

      await globalRewardSystem.processAffiliateReward(referrerId, refereeId, basePoints);
      
      res.json({
        success: true,
        message: `Affiliate reward processed: ${referrerId} earned 5% commission from ${refereeId}'s ${basePoints} points`
      });
    } catch (error) {
      console.error('Error processing affiliate reward:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // Process ripple reward (when someone you referred completes a tier)
  app.post('/api/customer/process-ripple-reward', authenticateToken, authorizeRole(['system']), async (req, res) => {
    try {
      const { referrerId, refereeRewardTier } = req.body;
      
      if (!referrerId || !refereeRewardTier) {
        return res.status(400).json({ error: 'Missing required fields' });
      }

      await globalRewardSystem.processRippleReward(referrerId, refereeRewardTier);
      
      res.json({
        success: true,
        message: `Ripple reward processed: ${referrerId} earned reward from referee's tier ${refereeRewardTier} completion`
      });
    } catch (error) {
      console.error('Error processing ripple reward:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // Test endpoint to simulate adding points and see the system work
  app.post('/api/test/add-points-to-customer', async (req, res) => {
    try {
      const { customerId, points, source } = req.body;
      
      if (!customerId || !points || !source) {
        return res.status(400).json({ error: 'Missing required fields: customerId, points, source' });
      }

      console.log(`🧪 TEST: Adding ${points} points from ${source} to customer ${customerId}`);

      // Add points using the reward system
      const result = await rewardSystemService.addAccumulatedPoints(customerId, points, source);
      
      // Get updated reward system data
      const updatedData = await rewardSystemService.getRewardSystemData(customerId);

      res.json({
        success: true,
        result,
        updatedData,
        message: result.rewardNumberCreated 
          ? `🎉 Customer earned ${points} points from ${source} and got Global Serial Number #${result.newSerialNumber}!`
          : `✅ Added ${points} points from ${source}. Total accumulated: ${updatedData.accumulatedPoints.totalAccumulated}`
      });
    } catch (error) {
      console.error('Error in test add points:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // Test endpoint to get all customers for testing
  app.get('/api/test/customers', async (req, res) => {
    try {
      const customers = await storage.getAllCustomerProfiles();
      res.json(customers.map(c => ({
        id: c.id,
        userId: c.userId,
        fullName: c.fullName,
        totalPointsEarned: c.totalPointsEarned || 0,
        accumulatedPoints: c.accumulatedPoints || 0
      })));
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });
}

// Helper function to get customer ID from user ID
async function getCustomerId(userId: string): Promise<string | null> {
  try {
    const profile = await storage.getCustomerProfile(userId);
    return profile ? profile.id : null;
  } catch (error) {
    return null;
  }
}