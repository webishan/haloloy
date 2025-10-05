import { Router } from 'express';
import { authenticateToken } from './auth';
import { storage } from './storage';
import { InstantCashbackService } from './services/InstantCashbackService';

const router = Router();

// Get merchant cashback summary
router.get('/cashback/summary', authenticateToken, async (req, res) => {
  try {
    const merchant = await storage.getMerchantByUserId(req.user.userId);
    if (!merchant) {
      return res.status(404).json({ error: 'Merchant not found' });
    }

    const cashbackService = new InstantCashbackService(storage);
    const summary = await cashbackService.getMerchantCashbackSummary(merchant.id);

    res.json({
      success: true,
      ...summary
    });
  } catch (error: any) {
    console.error('Error getting cashback summary:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get comprehensive merchant rewards history (cashback + future rewards)
router.get('/rewards/history', authenticateToken, async (req, res) => {
  try {
    const merchant = await storage.getMerchantByUserId(req.user.userId);
    if (!merchant) {
      return res.status(404).json({ error: 'Merchant not found' });
    }

    const { page = 1, limit = 20 } = req.query;
    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const offset = (pageNum - 1) * limitNum;

    // Get all merchant income records (includes cashback and future rewards)
    const allIncomes = await storage.getMerchantIncomes(merchant.id);
    
    // Format rewards history with proper descriptions
    const rewardsHistory = allIncomes.map(income => ({
      id: income.id,
      type: income.incomeType,
      amount: parseFloat(income.amount),
      sourceAmount: income.sourceAmount ? parseFloat(income.sourceAmount) : null,
      description: income.description || getRewardDescription(income.incomeType, income.amount, income.sourceAmount),
      createdAt: income.createdAt,
      referenceId: income.referenceId
    }));

    // Sort by date (newest first)
    rewardsHistory.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    // Paginate results
    const totalRecords = rewardsHistory.length;
    const totalPages = Math.ceil(totalRecords / limitNum);
    const paginatedHistory = rewardsHistory.slice(offset, offset + limitNum);

    res.json({
      success: true,
      rewards: paginatedHistory,
      pagination: {
        currentPage: pageNum,
        totalPages,
        totalRecords,
        hasNext: pageNum < totalPages,
        hasPrev: pageNum > 1
      }
    });
  } catch (error: any) {
    console.error('Error getting rewards history:', error);
    res.status(500).json({ error: error.message });
  }
});

// Helper function to generate reward descriptions
function getRewardDescription(incomeType: string, amount: string, sourceAmount?: string): string {
  switch (incomeType) {
    case 'cashback_15_percent':
      return `10% instant cashback on ${sourceAmount || 'N/A'} points transfer`;
    case 'referral_2_percent':
      return `2% referral commission on ${sourceAmount || 'N/A'} sales`;
    case 'royalty_1_percent':
      return `1% monthly royalty distribution`;
    default:
      return `Reward earned: ${amount} points`;
  }
}

// Export comprehensive rewards history as CSV
router.get('/rewards/export', authenticateToken, async (req, res) => {
  try {
    const merchant = await storage.getMerchantByUserId(req.user.userId);
    if (!merchant) {
      return res.status(404).json({ error: 'Merchant not found' });
    }

    // Get all rewards history
    const allIncomes = await storage.getMerchantIncomes(merchant.id);
    
    // Format for CSV export
    const rewardsHistory = allIncomes.map(income => ({
      date: new Date(income.createdAt).toLocaleDateString(),
      time: new Date(income.createdAt).toLocaleTimeString(),
      type: getRewardTypeName(income.incomeType),
      amount: parseFloat(income.amount),
      sourceAmount: income.sourceAmount ? parseFloat(income.sourceAmount) : 'N/A',
      description: income.description || getRewardDescription(income.incomeType, income.amount, income.sourceAmount)
    }));

    // Sort by date (newest first)
    rewardsHistory.sort((a, b) => new Date(b.date + ' ' + b.time).getTime() - new Date(a.date + ' ' + a.time).getTime());

    // Generate CSV content
    const csvHeader = 'Date,Time,Reward Type,Amount (pts),Source Amount,Description\n';
    const csvRows = rewardsHistory.map(reward => 
      `${reward.date},${reward.time},"${reward.type}",${reward.amount},"${reward.sourceAmount}","${reward.description}"`
    ).join('\n');
    
    const csvContent = csvHeader + csvRows;

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="merchant-rewards-history-${new Date().toISOString().split('T')[0]}.csv"`);
    res.send(csvContent);

  } catch (error: any) {
    console.error('Error exporting rewards history:', error);
    res.status(500).json({ error: error.message });
  }
});

// Helper function to get readable reward type names
function getRewardTypeName(incomeType: string): string {
  switch (incomeType) {
    case 'cashback_15_percent':
      return 'Instant Cashback (10%)';
    case 'referral_2_percent':
      return 'Referral Commission (2%)';
    case 'royalty_1_percent':
      return 'Monthly Royalty (1%)';
    default:
      return 'Other Reward';
  }
}

export default router;