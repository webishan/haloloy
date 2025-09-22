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

// ==================== THREE WALLET SYSTEM ====================

// Get customer wallet overview
router.get('/wallet-overview', authenticateToken, async (req, res) => {
  try {
    const customerId = await getCustomerId(req.user.id);
    const wallet = await storage.getCustomerWallet(customerId);
    
    if (!wallet) {
      // Create wallet if it doesn't exist
      const newWallet = await storage.createCustomerWallet({
        customerId,
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
      return res.json(newWallet);
    }

    res.json(wallet);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get wallet transactions
router.get('/transactions', authenticateToken, async (req, res) => {
  try {
    const customerId = await getCustomerId(req.user.id);
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
    const customerId = await getCustomerId(req.user.id);
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

    const customerId = await getCustomerId(req.user.id);
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

    const customerId = await getCustomerId(req.user.id);
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

    const customerId = await getCustomerId(req.user.id);
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

    const customerId = await getCustomerId(req.user.id);
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

    const customerId = await getCustomerId(req.user.id);
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

    const customerId = await getCustomerId(req.user.id);
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

    const customerId = await getCustomerId(req.user.id);
    const transaction = await storage.addRewardPoints(customerId, points, source);
    
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

    const customerId = await getCustomerId(req.user.id);
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
    const customerId = await getCustomerId(req.user.id);
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
    const customerId = await getCustomerId(req.user.id);
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

    const customerId = await getCustomerId(req.user.id);
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
    const customerId = await getCustomerId(req.user.id);
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

    const customerId = await getCustomerId(req.user.id);
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
    const customerId = await getCustomerId(req.user.id);
    const companyReferrer = await storage.getCompanyReferrer(customerId);
    
    res.json(companyReferrer);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Assign company as referrer
router.post('/company-referrer/assign', authenticateToken, async (req, res) => {
  try {
    const customerId = await getCustomerId(req.user.id);
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
    const customerId = await getCustomerId(req.user.id);
    
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

export default router;
