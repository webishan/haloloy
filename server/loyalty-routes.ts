import type { Express } from "express";
import { LoyaltyPointsService } from "./services/LoyaltyPointsService";
import { storage } from "./storage";
import { insertPointTransactionSchema, insertStepUpRewardNumberSchema } from "@shared/schema";
import { z } from "zod";

const loyaltyService = new LoyaltyPointsService(storage);

export function registerLoyaltyRoutes(app: Express): void {
  
  // =============== CORE POINT SYSTEM ===============
  
  // Add points to user (Purchase, cashback, etc.)
  app.post("/api/loyalty/add-points", async (req, res) => {
    try {
      const { userId, points, transactionType, metadata } = req.body;
      
      if (!userId || !points || !transactionType) {
        return res.status(400).json({ error: "Missing required fields" });
      }
      
      const transaction = await loyaltyService.addPoints(userId, points, transactionType, metadata);
      res.json(transaction);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });
  
  // Transfer points between users
  app.post("/api/loyalty/transfer-points", async (req, res) => {
    try {
      const { fromUserId, toUserId, points, description } = req.body;
      
      if (!fromUserId || !toUserId || !points) {
        return res.status(400).json({ error: "Missing required fields" });
      }
      
      const transaction = await loyaltyService.transferPoints(fromUserId, toUserId, points, description);
      res.json(transaction);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });
  
  // Get user's point transaction history
  app.get("/api/loyalty/transactions/:userId", async (req, res) => {
    try {
      const { userId } = req.params;
      const transactions = await loyaltyService.getUserPointsHistory(userId);
      res.json(transactions);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });
  
  // =============== THREE-WALLET SYSTEM ===============
  
  // Get wallet balance for specific wallet type
  app.get("/api/loyalty/wallet/:userId/:walletType", async (req, res) => {
    try {
      const { userId, walletType } = req.params;
      
      if (!['reward_points', 'income', 'commerce'].includes(walletType)) {
        return res.status(400).json({ error: "Invalid wallet type" });
      }
      
      const balance = await loyaltyService.getWalletBalance(userId, walletType as any);
      res.json({ balance, walletType, userId });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });
  
  // Get all wallet balances for user
  app.get("/api/loyalty/wallets/:userId", async (req, res) => {
    try {
      const { userId } = req.params;
      
      const rewardPoints = await loyaltyService.getWalletBalance(userId, 'reward_points');
      const income = await loyaltyService.getWalletBalance(userId, 'income');
      const commerce = await loyaltyService.getWalletBalance(userId, 'commerce');
      
      res.json({
        userId,
        wallets: {
          reward_points: rewardPoints,
          income: income,
          commerce: commerce
        },
        total: rewardPoints + income + commerce
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });
  
  // Transfer between wallets
  app.post("/api/loyalty/wallet-transfer", async (req, res) => {
    try {
      const { userId, fromWallet, toWallet, amount } = req.body;
      
      if (!userId || !fromWallet || !toWallet || !amount) {
        return res.status(400).json({ error: "Missing required fields" });
      }
      
      const transaction = await loyaltyService.transferBetweenWallets(userId, fromWallet, toWallet, amount);
      res.json(transaction);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });
  
  // Convert points to cash (with VAT deduction)
  app.post("/api/loyalty/convert-to-cash", async (req, res) => {
    try {
      const { userId, points } = req.body;
      
      if (!userId || !points) {
        return res.status(400).json({ error: "Missing required fields" });
      }
      
      const result = await loyaltyService.convertPointsToCash(userId, points);
      res.json(result);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });
  
  // =============== REWARD NUMBERS & STEPUP TIERS ===============
  
  // Create new reward number for user
  app.post("/api/loyalty/create-reward-number", async (req, res) => {
    try {
      const { userId, type } = req.body;
      
      if (!userId || !type) {
        return res.status(400).json({ error: "Missing required fields" });
      }
      
      if (!['global', 'local'].includes(type)) {
        return res.status(400).json({ error: "Invalid reward number type" });
      }
      
      const rewardNumber = await loyaltyService.createRewardNumber(userId, type);
      res.json(rewardNumber);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });
  
  // Get user's reward numbers and tier progress
  app.get("/api/loyalty/reward-numbers/:userId", async (req, res) => {
    try {
      const { userId } = req.params;
      const rewardNumbers = await storage.getActiveRewardNumbers(userId);
      res.json(rewardNumbers);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });
  
  // Check and update tier progression for user
  app.post("/api/loyalty/check-tiers/:userId", async (req, res) => {
    try {
      const { userId } = req.params;
      await loyaltyService.checkTierProgression(userId);
      
      // Return updated reward numbers
      const rewardNumbers = await storage.getActiveRewardNumbers(userId);
      res.json({ message: "Tier progression checked", rewardNumbers });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });
  
  // =============== MANUAL POINT GENERATION (GLOBAL ADMIN) ===============
  
  // Global admin manual point generation
  app.post("/api/loyalty/admin/generate-points", async (req, res) => {
    try {
      const { adminId, recipientId, points, description } = req.body;
      
      if (!adminId || !recipientId || !points || !description) {
        return res.status(400).json({ error: "Missing required fields" });
      }
      
      const transaction = await loyaltyService.generatePointsManually(adminId, recipientId, points, description);
      res.json(transaction);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });
  
  // =============== QR CODE TRANSFERS ===============
  
  // Generate QR code for point transfer
  app.post("/api/loyalty/generate-qr", async (req, res) => {
    try {
      const { senderId, points, expirationMinutes } = req.body;
      
      if (!senderId || !points) {
        return res.status(400).json({ error: "Missing required fields" });
      }
      
      const qrCode = await loyaltyService.generateQRCode(senderId, points, expirationMinutes);
      res.json({ qrCode, points, expirationMinutes: expirationMinutes || 30 });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });
  
  // Process QR code transfer
  app.post("/api/loyalty/process-qr", async (req, res) => {
    try {
      const { qrCode, receiverId } = req.body;
      
      if (!qrCode || !receiverId) {
        return res.status(400).json({ error: "Missing required fields" });
      }
      
      const transaction = await loyaltyService.processQRTransfer(qrCode, receiverId);
      res.json(transaction);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });
  
  // =============== MERCHANT COMMISSION SYSTEM ===============
  
  // Process merchant cashback (15% instant cashback)
  app.post("/api/loyalty/merchant/cashback", async (req, res) => {
    try {
      const { merchantId, pointsDistributed } = req.body;
      
      if (!merchantId || !pointsDistributed) {
        return res.status(400).json({ error: "Missing required fields" });
      }
      
      const transaction = await loyaltyService.processMerchantCashback(merchantId, pointsDistributed);
      res.json(transaction);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });
  
  // Get merchant transaction history
  app.get("/api/loyalty/merchant/transactions/:merchantId", async (req, res) => {
    try {
      const { merchantId } = req.params;
      const transactions = await storage.getMerchantTransactions(merchantId);
      res.json(transactions);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });
  
  // Process merchant referral commission
  app.post("/api/loyalty/merchant/referral-commission", async (req, res) => {
    try {
      const { merchantId, referredMerchantId } = req.body;
      
      if (!merchantId || !referredMerchantId) {
        return res.status(400).json({ error: "Missing required fields" });
      }
      
      await loyaltyService.processMerchantReferralCommission(merchantId, referredMerchantId);
      res.json({ message: "Referral commission processed" });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });
  
  // =============== LEADERBOARDS & ANALYTICS ===============
  
  // Get leaderboard
  app.get("/api/loyalty/leaderboard/:type", async (req, res) => {
    try {
      const { type } = req.params;
      const { country } = req.query;
      
      if (!['global', 'local'].includes(type)) {
        return res.status(400).json({ error: "Invalid leaderboard type" });
      }
      
      const leaderboard = await loyaltyService.getLeaderboard(type as any, country as string);
      res.json(leaderboard);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });
  
  // Get comprehensive user analytics
  app.get("/api/loyalty/analytics/:userId", async (req, res) => {
    try {
      const { userId } = req.params;
      
      // Get all user data
      const [transactions, rewardNumbers, wallets] = await Promise.all([
        loyaltyService.getUserPointsHistory(userId),
        storage.getActiveRewardNumbers(userId),
        Promise.all([
          loyaltyService.getWalletBalance(userId, 'reward_points'),
          loyaltyService.getWalletBalance(userId, 'income'),
          loyaltyService.getWalletBalance(userId, 'commerce')
        ])
      ]);
      
      // Calculate analytics
      const totalPoints = transactions.reduce((sum, t) => sum + t.points, 0);
      const totalEarned = transactions.filter(t => t.points > 0).reduce((sum, t) => sum + t.points, 0);
      const totalSpent = Math.abs(transactions.filter(t => t.points < 0).reduce((sum, t) => sum + t.points, 0));
      const completedTiers = rewardNumbers.reduce((sum, rn) => {
        let completed = 0;
        if (rn.tier1Status === 'completed') completed++;
        if (rn.tier2Status === 'completed') completed++;
        if (rn.tier3Status === 'completed') completed++;
        if (rn.tier4Status === 'completed') completed++;
        return sum + completed;
      }, 0);
      
      res.json({
        userId,
        summary: {
          totalPoints,
          totalEarned,
          totalSpent,
          rewardNumbers: rewardNumbers.length,
          completedTiers,
          wallets: {
            reward_points: wallets[0],
            income: wallets[1],
            commerce: wallets[2],
            total: wallets[0] + wallets[1] + wallets[2]
          }
        },
        recentTransactions: transactions.slice(0, 10),
        activeRewardNumbers: rewardNumbers
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });
  
  // =============== REFERRAL SYSTEM ===============
  
  // Create referral relationship
  app.post("/api/loyalty/create-referral", async (req, res) => {
    try {
      const { referrerId, refereeId, referralCode, referralType } = req.body;
      
      if (!referrerId || !refereeId || !referralCode || !referralType) {
        return res.status(400).json({ error: "Missing required fields" });
      }
      
      const referral = await storage.createReferral({
        referrerId,
        refereeId,
        referralCode,
        referralType
      });
      
      res.json(referral);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });
  
  // Get referral information for user
  app.get("/api/loyalty/referral/:userId", async (req, res) => {
    try {
      const { userId } = req.params;
      const referral = await storage.getReferralByReferee(userId);
      
      if (!referral) {
        return res.json({ referral: null, message: "No referral found" });
      }
      
      res.json(referral);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });
  
  // Get user's referral earnings (if they are a referrer)
  app.get("/api/loyalty/referral-earnings/:referrerId", async (req, res) => {
    try {
      const { referrerId } = req.params;
      const referrals = Array.from((storage as any).referrals.values())
        .filter((r: any) => r.referrerId === referrerId);
      
      const totalCommissions = referrals.reduce((sum: number, r: any) => 
        sum + parseFloat(r.lifetimeCommissionEarned), 0);
      const totalRippleRewards = referrals.reduce((sum: number, r: any) => 
        sum + r.totalRippleRewards, 0);
      
      res.json({
        referrerId,
        totalReferrals: referrals.length,
        totalCommissions,
        totalRippleRewards,
        referrals: referrals
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });
}