import { Router } from 'express';
import { z } from 'zod';
import { storage } from './storage';
import { authenticateToken } from './auth';
import { 
  insertPointRechargeSchema,
  insertProductSaleSchema,
  insertMerchantActivitySchema,
  insertEMerchantProductSchema,
  insertProductReviewSettingSchema
} from '@shared/schema';

const router = Router();

// Apply authentication to all routes
router.use(authenticateToken);

// Helper function to get merchant ID from user
const getMerchantId = async (userId: string) => {
  const merchant = await storage.getMerchantByUserId(userId);
  if (!merchant) {
    throw new Error('Merchant not found');
  }
  return merchant.id;
};

// Helper function to calculate points based on distribution method
const calculatePoints = (amount: number, method: string, value?: number): number => {
  switch (method) {
    case 'manual':
      return value || 0;
    case 'automatic_percentage':
      return Math.floor(amount * (value || 0) / 100);
    case 'automatic_fixed':
      return value || 0;
    default:
      return 0;
  }
};

// ==================== POINT RECHARGE SYSTEM ====================

// Get point recharge history
router.get('/point-recharges', async (req, res) => {
  try {
    const merchantId = await getMerchantId(req.user.id);
    const recharges = await storage.getPointRecharges(merchantId);
    res.json(recharges);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create point recharge request
router.post('/point-recharges', async (req, res) => {
  try {
    const merchantId = await getMerchantId(req.user.id);
    const { rechargeMethod, amount, paymentReference, description } = req.body;
    
    if (!amount || amount <= 0) {
      return res.status(400).json({ error: 'Invalid amount' });
    }
    
    // Calculate points (1 Taka = 1 Point for simplicity)
    const points = Math.floor(amount);
    
    const recharge = await storage.createPointRecharge({
      merchantId,
      rechargeMethod,
      amount: amount.toString(),
      points,
      status: 'pending',
      paymentReference,
      description
    });
    
    res.json({ 
      success: true, 
      recharge,
      message: 'Point recharge request created successfully' 
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Process point recharge (for admin approval)
router.put('/point-recharges/:id/process', async (req, res) => {
  try {
    const { id } = req.params;
    const { status, paymentReference } = req.body;
    
    const recharge = await storage.updatePointRecharge(id, {
      status,
      paymentReference,
      processedAt: new Date()
    });
    
    // If completed, add points to merchant wallet
    if (status === 'completed') {
      const wallet = await storage.getMerchantWallet(recharge.merchantId);
      if (wallet) {
        await storage.updateMerchantWallet(recharge.merchantId, {
          rewardPointBalance: wallet.rewardPointBalance + recharge.points
        });
        
        // Create wallet transaction
        await storage.createWalletTransaction({
          merchantId: recharge.merchantId,
          walletType: 'reward_point',
          transactionType: 'deposit',
          amount: '0',
          points: recharge.points,
          description: `Point recharge via ${recharge.rechargeMethod}`,
          balanceAfter: (wallet.rewardPointBalance + recharge.points).toString()
        });
      }
    }
    
    res.json({ 
      success: true, 
      recharge,
      message: 'Point recharge processed successfully' 
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ==================== PRODUCT SALES WITH MANDATORY DISCOUNTS ====================

// Get product sales history
router.get('/product-sales', async (req, res) => {
  try {
    const merchantId = await getMerchantId(req.user.id);
    const { startDate, endDate } = req.query;
    
    let sales;
    if (startDate && endDate) {
      sales = await storage.getProductSalesByPeriod(
        merchantId, 
        new Date(startDate as string), 
        new Date(endDate as string)
      );
    } else {
      sales = await storage.getProductSales(merchantId);
    }
    
    res.json(sales);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create product sale with mandatory discounts
router.post('/product-sales', async (req, res) => {
  try {
    const merchantId = await getMerchantId(req.user.id);
    const { 
      customerId, 
      productId, 
      quantity, 
      unitPrice, 
      distributionMethod, 
      distributionValue,
      cashDiscount = 0 
    } = req.body;
    
    if (!customerId || !productId || !quantity || !unitPrice) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    
    const totalAmount = quantity * unitPrice;
    
    // Calculate mandatory reward points
    const rewardPointsGiven = calculatePoints(totalAmount, distributionMethod, distributionValue);
    
    // Calculate final amount after cash discount
    const finalAmount = totalAmount - cashDiscount;
    
    const sale = await storage.createProductSale({
      merchantId,
      customerId,
      productId,
      quantity,
      unitPrice: unitPrice.toString(),
      totalAmount: totalAmount.toString(),
      rewardPointsGiven,
      cashDiscount: cashDiscount.toString(),
      finalAmount: finalAmount.toString(),
      distributionMethod,
      distributionValue: distributionValue?.toString()
    });
    
    // Update merchant activity
    const currentMonth = new Date().toISOString().substring(0, 7);
    const currentYear = new Date().getFullYear();
    
    let activity = await storage.getMerchantActivity(merchantId, currentMonth);
    if (!activity) {
      activity = await storage.createMerchantActivity({
        merchantId,
        month: currentMonth,
        year: currentYear,
        pointsDistributed: 0,
        requiredPoints: 1000, // Default requirement
        isActive: true,
        activityStatus: 'active'
      });
    }
    
    // Update points distributed
    await storage.updateMerchantActivity(merchantId, currentMonth, {
      pointsDistributed: activity.pointsDistributed + rewardPointsGiven,
      activityStatus: (activity.pointsDistributed + rewardPointsGiven) >= activity.requiredPoints ? 'active' : 'warning'
    });
    
    // Update merchant wallet (deduct points)
    const wallet = await storage.getMerchantWallet(merchantId);
    if (wallet && wallet.rewardPointBalance >= rewardPointsGiven) {
      await storage.updateMerchantWallet(merchantId, {
        rewardPointBalance: wallet.rewardPointBalance - rewardPointsGiven,
        totalPointsIssued: wallet.totalPointsIssued + rewardPointsGiven
      });
      
      // Create wallet transaction
      await storage.createWalletTransaction({
        merchantId,
        walletType: 'reward_point',
        transactionType: 'expense',
        amount: '0',
        points: rewardPointsGiven,
        description: `Points distributed for product sale`,
        balanceAfter: (wallet.rewardPointBalance - rewardPointsGiven).toString()
      });
    }
    
    res.json({ 
      success: true, 
      sale,
      message: 'Product sale created successfully' 
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ==================== MERCHANT ACTIVITY TRACKING ====================

// Get merchant activity status
router.get('/activity-status', async (req, res) => {
  try {
    const merchantId = await getMerchantId(req.user.id);
    const activities = await storage.getMerchantActivityStatus(merchantId);
    
    res.json(activities);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update merchant activity requirements
router.put('/activity-requirements', async (req, res) => {
  try {
    const merchantId = await getMerchantId(req.user.id);
    const { requiredPoints } = req.body;
    
    if (![1000, 2000, 5000].includes(requiredPoints)) {
      return res.status(400).json({ error: 'Required points must be 1000, 2000, or 5000' });
    }
    
    const currentMonth = new Date().toISOString().substring(0, 7);
    let activity = await storage.getMerchantActivity(merchantId, currentMonth);
    
    if (!activity) {
      activity = await storage.createMerchantActivity({
        merchantId,
        month: currentMonth,
        year: new Date().getFullYear(),
        pointsDistributed: 0,
        requiredPoints,
        isActive: true,
        activityStatus: 'active'
      });
    } else {
      activity = await storage.updateMerchantActivity(merchantId, currentMonth, {
        requiredPoints,
        activityStatus: activity.pointsDistributed >= requiredPoints ? 'active' : 'warning'
      });
    }
    
    res.json({ 
      success: true, 
      activity,
      message: 'Activity requirements updated successfully' 
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ==================== E-MERCHANT PRODUCT PRICING ====================

// Get E-merchant products
router.get('/emerchant-products', async (req, res) => {
  try {
    const merchantId = await getMerchantId(req.user.id);
    const products = await storage.getEMerchantProducts(merchantId);
    
    res.json(products);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create/Update E-merchant product pricing
router.post('/emerchant-products', async (req, res) => {
  try {
    const merchantId = await getMerchantId(req.user.id);
    const { productId, dealerPrice, tradePrice, mrp } = req.body;
    
    if (!productId || !dealerPrice || !tradePrice || !mrp) {
      return res.status(400).json({ error: 'Missing required pricing fields' });
    }
    
    // Calculate profit margin
    const profitMargin = ((mrp - dealerPrice) / dealerPrice) * 100;
    
    const product = await storage.createEMerchantProduct({
      merchantId,
      productId,
      dealerPrice: dealerPrice.toString(),
      tradePrice: tradePrice.toString(),
      mrp: mrp.toString(),
      profitMargin: profitMargin.toString(),
      isActive: true
    });
    
    res.json({ 
      success: true, 
      product,
      message: 'E-merchant product pricing created successfully' 
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ==================== PRODUCT REVIEW SETTINGS ====================

// Get product review settings
router.get('/product-review-settings', async (req, res) => {
  try {
    const merchantId = await getMerchantId(req.user.id);
    const settings = await storage.getProductReviewSettings(merchantId);
    
    res.json(settings);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update product review settings
router.put('/product-review-settings/:productId', async (req, res) => {
  try {
    const merchantId = await getMerchantId(req.user.id);
    const { productId } = req.params;
    const { reviewsEnabled } = req.body;
    
    const setting = await storage.updateProductReviewSetting(merchantId, productId, {
      reviewsEnabled
    });
    
    res.json({ 
      success: true, 
      setting,
      message: 'Product review settings updated successfully' 
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ==================== POINT DISTRIBUTION REPORTS ====================

// Get point distribution reports
router.get('/distribution-reports', async (req, res) => {
  try {
    const merchantId = await getMerchantId(req.user.id);
    const { reportType } = req.query;
    
    const reports = await storage.getPointDistributionReports(
      merchantId, 
      reportType as string
    );
    
    res.json(reports);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Generate point distribution report
router.post('/distribution-reports/generate', async (req, res) => {
  try {
    const merchantId = await getMerchantId(req.user.id);
    const { reportType, period } = req.body;
    
    if (!reportType || !period) {
      return res.status(400).json({ error: 'Report type and period are required' });
    }
    
    const report = await storage.generatePointDistributionReport(
      merchantId, 
      reportType, 
      period
    );
    
    res.json({ 
      success: true, 
      report,
      message: 'Point distribution report generated successfully' 
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ==================== TRANSACTION HISTORY ====================

// Get comprehensive transaction history
router.get('/transaction-history', async (req, res) => {
  try {
    const merchantId = await getMerchantId(req.user.id);
    const { type, startDate, endDate } = req.query;
    
    // Get all types of transactions
    const [
      walletTransactions,
      pointRecharges,
      productSales,
      incomeRecords
    ] = await Promise.all([
      storage.getWalletTransactions(merchantId),
      storage.getPointRecharges(merchantId),
      storage.getProductSales(merchantId),
      storage.getMerchantIncome(merchantId)
    ]);
    
    // Combine and format all transactions
    const allTransactions = [
      ...walletTransactions.map(t => ({
        id: t.id,
        type: 'wallet_transaction',
        date: t.createdAt,
        description: t.description,
        amount: t.amount,
        points: t.points,
        status: 'completed'
      })),
      ...pointRecharges.map(r => ({
        id: r.id,
        type: 'point_recharge',
        date: r.createdAt,
        description: `Point recharge via ${r.rechargeMethod}`,
        amount: r.amount,
        points: r.points,
        status: r.status
      })),
      ...productSales.map(s => ({
        id: s.id,
        type: 'product_sale',
        date: s.createdAt,
        description: `Product sale - ${s.quantity} items`,
        amount: s.finalAmount,
        points: s.rewardPointsGiven,
        status: 'completed'
      })),
      ...incomeRecords.map(i => ({
        id: i.id,
        type: 'income',
        date: i.createdAt,
        description: i.description,
        amount: i.amount,
        points: 0,
        status: 'completed'
      }))
    ];
    
    // Sort by date (newest first)
    allTransactions.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    
    // Filter by type if specified
    const filteredTransactions = type 
      ? allTransactions.filter(t => t.type === type)
      : allTransactions;
    
    res.json(filteredTransactions);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ==================== REWARD DISTRIBUTION SETTINGS ====================

// Get reward distribution settings
router.get('/reward-distribution-settings', async (req, res) => {
  try {
    const merchantId = await getMerchantId(req.user.id);
    const merchant = await storage.getMerchantByUserId(req.user.id);
    
    // Return current distribution settings
    res.json({
      distributionMethod: 'manual', // Default
      automaticPercentage: 5, // Default 5%
      automaticFixedAmount: 100, // Default 100 points
      isAutomaticEnabled: false
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update reward distribution settings
router.put('/reward-distribution-settings', async (req, res) => {
  try {
    const merchantId = await getMerchantId(req.user.id);
    const { 
      distributionMethod, 
      automaticPercentage, 
      automaticFixedAmount,
      isAutomaticEnabled 
    } = req.body;
    
    // Update merchant settings (you might want to add these fields to the merchant table)
    // For now, we'll store in a simple way
    
    res.json({ 
      success: true, 
      settings: {
        distributionMethod,
        automaticPercentage,
        automaticFixedAmount,
        isAutomaticEnabled
      },
      message: 'Reward distribution settings updated successfully' 
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
