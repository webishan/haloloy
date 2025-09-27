import { Router } from 'express';
import { RewardSystemService } from './services/RewardSystemService';

const router = Router();
const rewardSystemService = new RewardSystemService();

// Create a new Global Reward Number when customer reaches 1500 points
router.post('/create-global-number', async (req, res) => {
  try {
    const { customerId } = req.body;
    
    if (!customerId) {
      return res.status(400).json({ error: 'Customer ID is required' });
    }

    const globalRewardNumber = await rewardSystemService.createGlobalRewardNumber(customerId);
    res.json(globalRewardNumber);
  } catch (error: any) {
    console.error('Error creating global reward number:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get all Global Reward Numbers for a customer
router.get('/customer/:customerId', async (req, res) => {
  try {
    const { customerId } = req.params;
    const globalRewardNumbers = await rewardSystemService.getGlobalRewardNumbersByCustomer(customerId);
    res.json(globalRewardNumbers);
  } catch (error: any) {
    console.error('Error fetching global reward numbers:', error);
    res.status(500).json({ error: error.message });
  }
});

// Add points to a Global Reward Number
router.post('/add-points', async (req, res) => {
  try {
    const { globalNumberId, points } = req.body;
    
    if (!globalNumberId || !points) {
      return res.status(400).json({ error: 'Global Number ID and points are required' });
    }

    await rewardSystemService.addPointsToRewardNumber(globalNumberId, points);
    res.json({ success: true });
  } catch (error: any) {
    console.error('Error adding points to global reward number:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get complete reward system data for a customer
router.get('/system-data/:customerId', async (req, res) => {
  try {
    const { customerId } = req.params;
    const systemData = await rewardSystemService.getRewardSystemData(customerId);
    res.json(systemData);
  } catch (error: any) {
    console.error('Error fetching reward system data:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get all Global Reward Numbers (admin only)
router.get('/all', async (req, res) => {
  try {
    const allGlobalNumbers = await rewardSystemService.getAllGlobalRewardNumbers();
    res.json(allGlobalNumbers);
  } catch (error: any) {
    console.error('Error fetching all global reward numbers:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;