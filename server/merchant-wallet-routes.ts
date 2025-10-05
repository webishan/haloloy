import { Router } from 'express';
import { z } from 'zod';
import { storage } from './storage';
import { authenticateToken } from './auth';
import { 
  insertMerchantWalletSchema, 
  insertWalletTransactionSchema,
  insertMerchantIncomeSchema,
  insertMerchantReferralSchema,
  insertMerchantShopSchema
} from '../shared/schema.js';

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

// Helper function to calculate VAT and service charge (12.5%)
const calculateVATAndServiceCharge = (amount: number): number => {
  return amount * 0.125; // 12.5%
};

// Cashback and commission calculation functions removed - will be rebuilt from scratch

// Get merchant wallet information
router.get('/wallet', async (req, res) => {
  try {
    const merchantId = await getMerchantId(req.user.userId);
    let wallet = await storage.getMerchantWallet(merchantId);
    
    // Create wallet if it doesn't exist
    if (!wallet) {
      wallet = await storage.createMerchantWallet({
        merchantId,
        rewardPointBalance: 0,
        totalPointsIssued: 0,
        incomeWalletBalance: 0,
        cashbackIncome: 0,
        referralIncome: 0,
        royaltyIncome: 0,
        commerceWalletBalance: 0,
        totalDeposited: 0,
        totalWithdrawn: 0
      });
    }
    
    // Prevent caching to ensure fresh data
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    res.setHeader('ETag', `wallet-${Date.now()}`);
    
    res.json(wallet);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get wallet transactions
router.get('/wallet/transactions', async (req, res) => {
  try {
    const merchantId = await getMerchantId(req.user.id);
    const { walletType } = req.query;
    
    const transactions = await storage.getWalletTransactions(
      merchantId, 
      walletType as string
    );
    
    res.json(transactions);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Add balance to Commerce Wallet (from external sources)
router.post('/wallet/deposit', async (req, res) => {
  try {
    const merchantId = await getMerchantId(req.user.id);
    const { amount, paymentMethod, description } = req.body;
    
    if (!amount || amount <= 0) {
      return res.status(400).json({ error: 'Invalid amount' });
    }
    
    const wallet = await storage.getMerchantWallet(merchantId);
    if (!wallet) {
      return res.status(404).json({ error: 'Wallet not found' });
    }
    
    // Update wallet balance
    const newBalance = parseFloat(wallet.commerceWalletBalance) + amount;
    const newTotalDeposited = parseFloat(wallet.totalDeposited) + amount;
    
    await storage.updateMerchantWallet(merchantId, {
      commerceWalletBalance: newBalance.toString(),
      totalDeposited: newTotalDeposited.toString()
    });
    
    // Create transaction record
    await storage.createWalletTransaction({
      merchantId,
      walletType: 'commerce',
      transactionType: 'deposit',
      amount: amount.toString(),
      description: description || `Deposit via ${paymentMethod}`,
      balanceAfter: newBalance.toString()
    });
    
    res.json({ 
      success: true, 
      newBalance,
      message: 'Deposit successful' 
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Transfer from Income Wallet to Commerce Wallet (with 12.5% VAT and service charge)
router.post('/wallet/transfer-income-to-commerce', async (req, res) => {
  try {
    const merchantId = await getMerchantId(req.user.id);
    const { amount } = req.body;
    
    if (!amount || amount <= 0) {
      return res.status(400).json({ error: 'Invalid amount' });
    }
    
    const wallet = await storage.getMerchantWallet(merchantId);
    if (!wallet) {
      return res.status(404).json({ error: 'Wallet not found' });
    }
    
    const incomeBalance = parseFloat(wallet.incomeWalletBalance);
    if (incomeBalance < amount) {
      return res.status(400).json({ error: 'Insufficient income wallet balance' });
    }
    
    // Calculate VAT and service charge (12.5%)
    const vatAndServiceCharge = calculateVATAndServiceCharge(amount);
    const transferAmount = amount - vatAndServiceCharge;
    
    // Update wallet balances
    const newIncomeBalance = incomeBalance - amount;
    const newCommerceBalance = parseFloat(wallet.commerceWalletBalance) + transferAmount;
    
    await storage.updateMerchantWallet(merchantId, {
      incomeWalletBalance: newIncomeBalance.toString(),
      commerceWalletBalance: newCommerceBalance.toString()
    });
    
    // Create transaction records
    await storage.createWalletTransaction({
      merchantId,
      walletType: 'income',
      transactionType: 'expense',
      amount: amount.toString(),
      description: 'Transfer to Commerce Wallet',
      vatAmount: vatAndServiceCharge.toString(),
      balanceAfter: newIncomeBalance.toString()
    });
    
    await storage.createWalletTransaction({
      merchantId,
      walletType: 'commerce',
      transactionType: 'transfer',
      amount: transferAmount.toString(),
      description: 'Transfer from Income Wallet (after VAT & service charge)',
      vatAmount: vatAndServiceCharge.toString(),
      balanceAfter: newCommerceBalance.toString()
    });
    
    res.json({ 
      success: true, 
      transferAmount,
      vatAndServiceCharge,
      newIncomeBalance,
      newCommerceBalance,
      message: 'Transfer successful' 
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Withdraw from Commerce Wallet
router.post('/wallet/withdraw', async (req, res) => {
  try {
    const merchantId = await getMerchantId(req.user.id);
    const { amount, bankAccount, description } = req.body;
    
    if (!amount || amount <= 0) {
      return res.status(400).json({ error: 'Invalid amount' });
    }
    
    if (!bankAccount) {
      return res.status(400).json({ error: 'Bank account details required' });
    }
    
    const wallet = await storage.getMerchantWallet(merchantId);
    if (!wallet) {
      return res.status(404).json({ error: 'Wallet not found' });
    }
    
    const commerceBalance = parseFloat(wallet.commerceWalletBalance);
    if (commerceBalance < amount) {
      return res.status(400).json({ error: 'Insufficient commerce wallet balance' });
    }
    
    // Check if merchant profile is complete for withdrawal
    const merchant = await storage.getMerchantByUserId(req.user.id);
    if (!merchant.fathersName || !merchant.mothersName || !merchant.nidNumber || !merchant.nomineeDetails) {
      return res.status(400).json({ 
        error: 'Complete profile required for withdrawal. Please update: Father\'s name, Mother\'s name, NID/Passport, and Nominee details.' 
      });
    }
    
    // Update wallet balance
    const newBalance = commerceBalance - amount;
    const newTotalWithdrawn = parseFloat(wallet.totalWithdrawn) + amount;
    
    await storage.updateMerchantWallet(merchantId, {
      commerceWalletBalance: newBalance.toString(),
      totalWithdrawn: newTotalWithdrawn.toString()
    });
    
    // Create transaction record
    await storage.createWalletTransaction({
      merchantId,
      walletType: 'commerce',
      transactionType: 'withdrawal',
      amount: amount.toString(),
      description: description || `Withdrawal to ${bankAccount}`,
      balanceAfter: newBalance.toString()
    });
    
    res.json({ 
      success: true, 
      newBalance,
      message: 'Withdrawal request submitted successfully' 
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Issue reward points to customers
router.post('/wallet/issue-points', async (req, res) => {
  try {
    const merchantId = await getMerchantId(req.user.id);
    const { customerId, points, description } = req.body;
    
    if (!points || points <= 0) {
      return res.status(400).json({ error: 'Invalid points amount' });
    }
    
    const wallet = await storage.getMerchantWallet(merchantId);
    if (!wallet) {
      return res.status(404).json({ error: 'Wallet not found' });
    }
    
    const rewardPointBalance = wallet.rewardPointBalance;
    if (rewardPointBalance < points) {
      return res.status(400).json({ error: 'Insufficient reward points balance' });
    }
    
    // Update wallet balance
    const newBalance = rewardPointBalance - points;
    const newTotalIssued = wallet.totalPointsIssued + points;
    
    await storage.updateMerchantWallet(merchantId, {
      rewardPointBalance: newBalance,
      totalPointsIssued: newTotalIssued
    });
    
    // Create transaction record
    await storage.createWalletTransaction({
      merchantId,
      walletType: 'reward_point',
      transactionType: 'expense',
      amount: '0',
      points: points,
      description: description || `Points issued to customer ${customerId}`,
      balanceAfter: newBalance.toString()
    });
    
    res.json({ 
      success: true, 
      newBalance,
      message: 'Points issued successfully' 
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get merchant income details
router.get('/income', async (req, res) => {
  try {
    const merchantId = await getMerchantId(req.user.id);
    const { incomeType } = req.query;
    
    const income = await storage.getMerchantIncome(
      merchantId, 
      incomeType as string
    );
    
    res.json(income);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Cashback income processing removed - will be rebuilt from scratch

// Process referral income (2% per 1000 Taka)
router.post('/income/referral', async (req, res) => {
  try {
    const merchantId = await getMerchantId(req.user.userId);
    const { referralAmount, referredMerchantId } = req.body;
    
    if (!referralAmount || referralAmount < 0) {
      return res.status(400).json({ error: 'Invalid referral amount' });
    }
    
    const referralCommission = calculateReferralCommission(referralAmount);
    if (referralCommission <= 0) {
      return res.status(400).json({ 
        error: 'Minimum 1000 Taka referral required for commission' 
      });
    }
    
    const wallet = await storage.getMerchantWallet(merchantId);
    if (!wallet) {
      return res.status(404).json({ error: 'Wallet not found' });
    }
    
    // Update wallet balance
    const newIncomeBalance = parseFloat(wallet.incomeWalletBalance) + referralCommission;
    const newReferralIncome = parseFloat(wallet.referralIncome) + referralCommission;
    
    await storage.updateMerchantWallet(merchantId, {
      incomeWalletBalance: newIncomeBalance.toString(),
      referralIncome: newReferralIncome.toString()
    });
    
    // Create income record
    await storage.createMerchantIncome({
      merchantId,
      incomeType: 'referral_2_percent',
      amount: referralCommission.toString(),
      sourceAmount: referralAmount.toString(),
      description: `2% referral commission on ${referralAmount} Taka`,
      referenceId: referredMerchantId
    });
    
    // Create transaction record
    await storage.createWalletTransaction({
      merchantId,
      walletType: 'income',
      transactionType: 'income',
      amount: referralCommission.toString(),
      description: `2% referral commission income`,
      balanceAfter: newIncomeBalance.toString()
    });
    
    res.json({ 
      success: true, 
      referralCommission,
      newIncomeBalance,
      message: 'Referral commission processed successfully' 
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Process royalty income (1% of total sales distributed monthly)
router.post('/income/royalty', async (req, res) => {
  try {
    const merchantId = await getMerchantId(req.user.userId);
    const { totalSales, month, year } = req.body;
    
    if (!totalSales || totalSales < 0) {
      return res.status(400).json({ error: 'Invalid total sales amount' });
    }
    
    const royaltyAmount = totalSales * 0.01; // 1% royalty
    
    const wallet = await storage.getMerchantWallet(merchantId);
    if (!wallet) {
      return res.status(404).json({ error: 'Wallet not found' });
    }
    
    // Update wallet balance
    const newIncomeBalance = parseFloat(wallet.incomeWalletBalance) + royaltyAmount;
    const newRoyaltyIncome = parseFloat(wallet.royaltyIncome) + royaltyAmount;
    
    await storage.updateMerchantWallet(merchantId, {
      incomeWalletBalance: newIncomeBalance.toString(),
      royaltyIncome: newRoyaltyIncome.toString()
    });
    
    // Create income record
    await storage.createMerchantIncome({
      merchantId,
      incomeType: 'royalty_1_percent',
      amount: royaltyAmount.toString(),
      sourceAmount: totalSales.toString(),
      description: `1% royalty on ${totalSales} Taka sales for ${month}/${year}`,
      referenceId: `${month}-${year}`
    });
    
    // Create transaction record
    await storage.createWalletTransaction({
      merchantId,
      walletType: 'income',
      transactionType: 'income',
      amount: royaltyAmount.toString(),
      description: `1% royalty income for ${month}/${year}`,
      balanceAfter: newIncomeBalance.toString()
    });
    
    res.json({ 
      success: true, 
      royaltyAmount,
      newIncomeBalance,
      message: 'Royalty income processed successfully' 
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get merchant income summary
router.get('/income/summary', async (req, res) => {
  try {
    const merchantId = await getMerchantId(req.user.userId);
    const { period = 'all' } = req.query;
    
    const wallet = await storage.getMerchantWallet(merchantId);
    if (!wallet) {
      return res.status(404).json({ error: 'Wallet not found' });
    }
    
    // Get income records for the period
    const now = new Date();
    let periodDate = new Date(0);
    
    if (period !== 'all') {
      periodDate = getPeriodDate(now, period as string);
    }
    
    const incomes = await storage.getMerchantIncomes(merchantId, periodDate);
    
    const summary = {
      totalIncome: parseFloat(wallet.incomeWalletBalance),
      cashbackIncome: parseFloat(wallet.cashbackIncome),
      referralIncome: parseFloat(wallet.referralIncome),
      royaltyIncome: parseFloat(wallet.royaltyIncome),
      periodIncomes: incomes,
      breakdown: {
        cashback: incomes.filter(i => i.incomeType === 'cashback_15_percent')
          .reduce((sum, i) => sum + parseFloat(i.amount), 0),
        referral: incomes.filter(i => i.incomeType === 'referral_2_percent')
          .reduce((sum, i) => sum + parseFloat(i.amount), 0),
        royalty: incomes.filter(i => i.incomeType === 'royalty_1_percent')
          .reduce((sum, i) => sum + parseFloat(i.amount), 0)
      }
    };
    
    res.json(summary);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Helper function to get period date
function getPeriodDate(now: Date, period: string): Date {
  const date = new Date(now);
  switch (period) {
    case 'daily':
      date.setDate(date.getDate() - 1);
      break;
    case 'weekly':
      date.setDate(date.getDate() - 7);
      break;
    case 'monthly':
      date.setMonth(date.getMonth() - 1);
      break;
    case 'yearly':
      date.setFullYear(date.getFullYear() - 1);
      break;
    default:
      return new Date(0);
  }
  return date;
}

// Get merchant incomes for a period
router.get('/incomes', async (req, res) => {
  try {
    const merchantId = await getMerchantId(req.user.userId);
    const { period = 'all' } = req.query;
    
    const now = new Date();
    let periodDate = new Date(0);
    
    if (period !== 'all') {
      periodDate = getPeriodDate(now, period as string);
    }
    
    const incomes = await storage.getMerchantIncomes(merchantId, periodDate);
    res.json(incomes);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Process merchant referral commission (2% per 1000 Taka)
router.post('/process-referral-commission', async (req, res) => {
  try {
    const merchantId = await getMerchantId(req.user.userId);
    const { salesAmount, referredMerchantId, saleId } = req.body;
    
    if (!salesAmount || salesAmount <= 0) {
      return res.status(400).json({ error: 'Invalid sales amount' });
    }
    
    const referralAmount = calculateReferralIncome(salesAmount);
    if (referralAmount <= 0) {
      return res.status(400).json({ 
        error: 'Minimum 1000 Taka sales required for referral income' 
      });
    }
    
    const wallet = await storage.getMerchantWallet(merchantId);
    if (!wallet) {
      return res.status(404).json({ error: 'Wallet not found' });
    }
    
    // Update wallet balance
    const newIncomeBalance = parseFloat(wallet.incomeWalletBalance) + referralAmount;
    const newReferralIncome = parseFloat(wallet.referralIncome) + referralAmount;
    
    await storage.updateMerchantWallet(merchantId, {
      incomeWalletBalance: newIncomeBalance.toString(),
      referralIncome: newReferralIncome.toString()
    });
    
    // Create income record
    await storage.createMerchantIncome({
      merchantId,
      incomeType: 'referral_2_percent',
      amount: referralAmount.toString(),
      sourceAmount: salesAmount.toString(),
      description: `2% referral income from ${salesAmount} Taka sales`,
      referenceId: saleId
    });
    
    // Create transaction record
    await storage.createWalletTransaction({
      merchantId,
      walletType: 'income',
      transactionType: 'income',
      amount: referralAmount.toString(),
      description: `2% referral income from merchant ${referredMerchantId}`,
      balanceAfter: newIncomeBalance.toString()
    });
    
    res.json({ 
      success: true, 
      referralAmount,
      newIncomeBalance,
      message: 'Referral income processed successfully' 
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get merchant referrals
router.get('/referrals', async (req, res) => {
  try {
    const merchantId = await getMerchantId(req.user.id);
    const referrals = await storage.getMerchantReferrals(merchantId);
    
    res.json(referrals);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create merchant referral
router.post('/referrals', async (req, res) => {
  try {
    const merchantId = await getMerchantId(req.user.id);
    const { referredMerchantId, referralCode } = req.body;
    
    if (!referredMerchantId || !referralCode) {
      return res.status(400).json({ error: 'Referred merchant ID and referral code required' });
    }
    
    // Check if referral code already exists
    const existingReferral = await storage.getMerchantReferralByCode(referralCode);
    if (existingReferral) {
      return res.status(400).json({ error: 'Referral code already exists' });
    }
    
    const referral = await storage.createMerchantReferral({
      referrerMerchantId: merchantId,
      referredMerchantId,
      referralCode,
      commissionEarned: '0',
      totalSales: '0',
      isActive: true
    });
    
    res.json({ 
      success: true, 
      referral,
      message: 'Referral created successfully' 
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get merchant shop/marketplace
router.get('/shop', async (req, res) => {
  try {
    const merchantId = await getMerchantId(req.user.id);
    const shop = await storage.getMerchantShop(merchantId);
    
    res.json(shop);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create/Update merchant shop
router.post('/shop', async (req, res) => {
  try {
    const merchantId = await getMerchantId(req.user.id);
    const { shopName, shopUrl, bannerImage, description, rewardPointsOffered } = req.body;
    
    if (!shopName || !shopUrl) {
      return res.status(400).json({ error: 'Shop name and URL required' });
    }
    
    const existingShop = await storage.getMerchantShop(merchantId);
    
    if (existingShop) {
      // Update existing shop
      const updatedShop = await storage.updateMerchantShop(merchantId, {
        shopName,
        shopUrl,
        bannerImage,
        description,
        rewardPointsOffered: rewardPointsOffered || 0,
        platformFee: '0.00', // 0% for KOMARCE
        marketingPromotion: rewardPointsOffered > 0
      });
      
      res.json({ 
        success: true, 
        shop: updatedShop,
        message: 'Shop updated successfully' 
      });
    } else {
      // Create new shop
      const newShop = await storage.createMerchantShop({
        merchantId,
        shopName,
        shopUrl,
        bannerImage,
        description,
        isActive: true,
        platformFee: '0.00', // 0% for KOMARCE
        marketingPromotion: rewardPointsOffered > 0,
        rewardPointsOffered: rewardPointsOffered || 0
      });
      
      res.json({ 
        success: true, 
        shop: newShop,
        message: 'Shop created successfully' 
      });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get royalty distributions
router.get('/royalty-distributions', async (req, res) => {
  try {
    const distributions = await storage.getRoyaltyDistributions();
    res.json(distributions);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update merchant profile for withdrawal requirements
router.put('/profile/withdrawal-info', async (req, res) => {
  try {
    const merchantId = await getMerchantId(req.user.id);
    const { fathersName, mothersName, nidNumber, nomineeDetails } = req.body;
    
    if (!fathersName || !mothersName || !nidNumber || !nomineeDetails) {
      return res.status(400).json({ 
        error: 'All fields required: Father\'s name, Mother\'s name, NID/Passport, and Nominee details' 
      });
    }
    
    const merchant = await storage.getMerchantByUserId(req.user.id);
    if (!merchant) {
      return res.status(404).json({ error: 'Merchant not found' });
    }
    
    const updatedMerchant = await storage.updateMerchant(merchantId, {
      fathersName,
      mothersName,
      nidNumber,
      nomineeDetails
    });
    
    res.json({ 
      success: true, 
      merchant: updatedMerchant,
      message: 'Withdrawal information updated successfully' 
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ========== Withdrawal System ==========

// Request withdrawal from income wallet
router.post('/withdraw/request', async (req, res) => {
  try {
    const merchantId = await getMerchantId(req.user.userId);
    const { amount, withdrawalMethod, accountDetails } = req.body;
    
    if (!amount || amount <= 0) {
      return res.status(400).json({ error: 'Invalid withdrawal amount' });
    }
    
    const wallet = await storage.getMerchantWallet(merchantId);
    if (!wallet) {
      return res.status(404).json({ error: 'Wallet not found' });
    }
    
    const availableBalance = parseFloat(wallet.incomeWalletBalance);
    if (availableBalance < amount) {
      return res.status(400).json({ error: 'Insufficient balance for withdrawal' });
    }
    
    // Calculate VAT and service charge
    const vatAndServiceCharge = calculateVATAndServiceCharge(amount);
    const finalAmount = amount - vatAndServiceCharge;
    
    // Create withdrawal request
    const withdrawalRequest = await storage.createWithdrawalRequest({
      merchantId,
      amount: amount.toString(),
      vatAmount: vatAndServiceCharge.toString(),
      serviceCharge: '0.00', // Service charge included in VAT
      finalAmount: finalAmount.toString(),
      withdrawalMethod,
      accountDetails,
      status: 'pending',
      requestedAt: new Date()
    });
    
    res.json({
      success: true,
      withdrawalRequest,
      message: 'Withdrawal request submitted successfully'
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get withdrawal requests
router.get('/withdraw/requests', async (req, res) => {
  try {
    const merchantId = await getMerchantId(req.user.userId);
    const { status = 'all' } = req.query;
    
    let requests = await storage.getWithdrawalRequests(merchantId);
    
    if (status !== 'all') {
      requests = requests.filter(req => req.status === status);
    }
    
    res.json(requests);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Cancel withdrawal request
router.post('/withdraw/cancel/:id', async (req, res) => {
  try {
    const merchantId = await getMerchantId(req.user.userId);
    const requestId = req.params.id;
    
    const request = await storage.getWithdrawalRequest(requestId);
    if (!request || request.merchantId !== merchantId) {
      return res.status(404).json({ error: 'Withdrawal request not found' });
    }
    
    if (request.status !== 'pending') {
      return res.status(400).json({ error: 'Cannot cancel non-pending withdrawal request' });
    }
    
    await storage.updateWithdrawalRequest(requestId, {
      status: 'cancelled',
      cancelledAt: new Date()
    });
    
    res.json({
      success: true,
      message: 'Withdrawal request cancelled successfully'
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get withdrawal history
router.get('/withdraw/history', async (req, res) => {
  try {
    const merchantId = await getMerchantId(req.user.userId);
    const { period = 'all' } = req.query;
    
    const now = new Date();
    let periodDate = new Date(0);
    
    if (period !== 'all') {
      periodDate = getPeriodDate(now, period as string);
    }
    
    const history = await storage.getWithdrawalHistory(merchantId, periodDate);
    res.json(history);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
