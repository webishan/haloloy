import type { Express, Request, Response } from "express";
import { storage } from "./storage";
import { insertChatMessageSchema } from "@shared/schema";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";

const JWT_SECRET = process.env.JWT_SECRET || "komarce-secret-key";

// Authentication middleware
function authenticateToken(req: Request, res: Response, next: Function) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ message: 'Access token required' });
  }

  jwt.verify(token, JWT_SECRET, (err: any, user: any) => {
    if (err) return res.status(403).json({ message: 'Invalid or expired token' });
    req.user = user;
    next();
  });
}

// Role-based authorization middleware
function authorizeRole(roles: string[]) {
  return (req: Request, res: Response, next: Function) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ message: 'Insufficient permissions' });
    }
    next();
  };
}

export function setupMerchantRoutes(app: Express) {
  // Merchant login route
  app.post('/api/merchant/login', async (req, res) => {
    try {
      const { email, password } = req.body;
      
      const user = await storage.getUserByEmail(email);
      if (!user || !await bcrypt.compare(password, user.password)) {
        return res.status(401).json({ message: 'Invalid credentials' });
      }
      
      if (user.role !== 'merchant') {
        return res.status(403).json({ message: 'Not authorized as merchant' });
      }
      
      const token = jwt.sign(
        { userId: user.id, email: user.email, role: user.role },
        JWT_SECRET,
        { expiresIn: '24h' }
      );
      
      res.json({ user, token });
    } catch (error) {
      console.error('Merchant login error:', error);
      res.status(500).json({ message: 'Login failed' });
    }
  });

  // Merchant dashboard
  app.get('/api/merchant/dashboard', authenticateToken, authorizeRole(['merchant']), async (req, res) => {
    try {
      const userId = req.user.userId;
      const merchant = await storage.getMerchantByUserId(userId);
      
      if (!merchant) {
        return res.status(404).json({ message: 'Merchant not found' });
      }

      // Get merchant's data
      const orders = await storage.getOrdersByMerchant(merchant.id);
      const products = await storage.getProductsByMerchant(merchant.id);
      
      // Calculate metrics
      const totalSales = orders.reduce((sum, order) => sum + parseFloat(order.totalAmount || '0'), 0);
      const totalOrders = orders.length;
      const activeProducts = products.filter(p => p.isActive).length;
      
      console.log(`🔍 Merchant Dashboard Debug for ${req.user.userId}:`);
      console.log(`   - Merchant ID: ${merchant.id}`);
      console.log(`   - Loyalty Points Balance: ${merchant.loyaltyPointsBalance || 0}`);
      console.log(`   - Available Points: ${merchant.availablePoints || 0}`);
      console.log(`   - Total Points Purchased: ${merchant.totalPointsPurchased || 0}`);

      const dashboard = {
        merchant: {
          ...merchant,
          totalSales: totalSales.toFixed(2),
          totalOrders,
          activeProducts,
          loyaltyPointsBalance: merchant.loyaltyPointsBalance || 0
        },
        recentOrders: orders.slice(0, 5),
        topProducts: products.slice(0, 5)
      };

      res.json(dashboard);
    } catch (error) {
      console.error('Merchant dashboard error:', error);
      res.status(500).json({ message: 'Failed to fetch dashboard data' });
    }
  });

  // Get chat users for merchant (local admins and customers)
  app.get('/api/merchant/chat-users', authenticateToken, authorizeRole(['merchant']), async (req, res) => {
    try {
      const userId = req.user.userId;
      const merchant = await storage.getMerchantByUserId(userId);
      const merchantUser = await storage.getUser(userId);
      
      if (!merchant || !merchantUser) {
        return res.status(404).json({ message: 'Merchant not found' });
      }

      const chatUsers = await storage.getChatUsers(userId);
      
      // Filter to show only local admins from same country and customers
      const filteredUsers = chatUsers.filter(user => 
        (user.role === 'local_admin' && user.country === merchantUser.country) ||
        (user.role === 'customer')
      );

      res.json(filteredUsers);
    } catch (error) {
      console.error('Get merchant chat users error:', error);
      res.status(500).json({ message: 'Failed to fetch chat users' });
    }
  });

  // Get chat messages between merchant and another user
  app.get('/api/merchant/chat-messages', authenticateToken, authorizeRole(['merchant']), async (req, res) => {
    try {
      const { partnerId } = req.query;
      const userId = req.user.userId;
      
      if (partnerId) {
        // Get messages between merchant and specific user
        const messages = await storage.getChatMessages(userId);
        res.json(messages);
      } else {
        // Get all messages for the merchant
        const messages = await storage.getChatMessages(userId);
        res.json(messages);
      }
    } catch (error) {
      console.error('Get merchant chat messages error:', error);
      res.status(500).json({ message: 'Failed to fetch messages' });
    }
  });

  // Send message from merchant
  app.post('/api/merchant/send-message', authenticateToken, authorizeRole(['merchant']), async (req, res) => {
    try {
      const { receiverId, message } = req.body;
      
      if (!receiverId || !message?.trim()) {
        return res.status(400).json({ message: 'Receiver ID and message are required' });
      }
      
      const messageData = {
        senderId: req.user.userId,
        receiverId,
        message: message.trim(),
        messageType: 'text',
        isRead: false
      };
      
      const newMessage = await storage.createChatMessage(messageData);
      
      // Get sender info for real-time notification
      const sender = await storage.getUser(req.user.userId);
      const messageWithSender = {
        ...newMessage,
        senderName: sender ? `${sender.firstName} ${sender.lastName}` : 'Unknown'
      };
      
      res.json(messageWithSender);
    } catch (error) {
      console.error('Send merchant message error:', error);
      res.status(500).json({ message: 'Failed to send message' });
    }
  });

  // Get merchant's scanned customers (for point transfers)
  app.get('/api/merchant/scanned-customers', authenticateToken, authorizeRole(['merchant']), async (req, res) => {
    try {
      const merchantId = req.user.userId;
      
      console.log(`🔍 Getting scanned customers for merchant: ${merchantId}`);
      
      // Get merchant's scanned customers
      const merchantCustomers = await storage.getMerchantCustomers(merchantId);
      console.log(`📊 Found ${merchantCustomers.length} merchant customers`);
      
      // Format the response with real-time customer points balance
      const customers = [];
      for (const mc of merchantCustomers) {
        // Get the actual customer profile to get current points balance
        const customerProfile = await storage.getCustomerProfileById(mc.customerId);
        
        console.log(`🔍 Customer ${mc.customerName}:`);
        console.log(`   - Merchant Customer Record: ${mc.currentPointsBalance || 0} points`);
        console.log(`   - Customer Profile: ${customerProfile?.currentPointsBalance || 0} points`);
        
        const finalPoints = customerProfile?.currentPointsBalance ?? mc.currentPointsBalance ?? 0;
        console.log(`   - Final Points Displayed: ${finalPoints} points`);
        
        customers.push({
          id: mc.customerId,
          fullName: mc.customerName,
          email: mc.customerEmail,
          mobileNumber: mc.customerMobile,
          accountNumber: mc.accountNumber,
          // Use real-time balance from customer profile, fallback to merchant customer record
          currentPointsBalance: finalPoints,
          totalPointsEarned: customerProfile?.totalPointsEarned ?? mc.totalPointsEarned ?? 0,
          tier: customerProfile?.tier ?? mc.tier ?? 'bronze',
          isActive: mc.isActive,
          lastUpdated: mc.updatedAt
        });
      }

      console.log(`✅ Returning ${customers.length} customers with loyalty points`);
      res.json(customers);
    } catch (error) {
      console.error('❌ Get scanned customers error:', error);
      res.status(500).json({ error: 'Failed to get scanned customers' });
    }
  });

  // Get merchant's customers for chat (all customers from same country)
  app.get('/api/merchant/customers', authenticateToken, authorizeRole(['merchant']), async (req, res) => {
    try {
      const userId = req.user.userId;
      const merchant = await storage.getMerchantByUserId(userId);
      const merchantUser = await storage.getUser(userId);
      
      if (!merchant || !merchantUser) {
        return res.status(404).json({ message: 'Merchant not found' });
      }

      // Get customers from same country
      const customers = await storage.getCustomers(merchantUser.country);
      const customerUsers = [];
      
      for (const customer of customers) {
        const user = await storage.getUser(customer.userId);
        if (user) {
          customerUsers.push({
            id: user.id,
            username: user.username,
            email: user.email,
            firstName: user.firstName,
            lastName: user.lastName,
            role: user.role,
            country: user.country
          });
        }
      }

      res.json(customerUsers);
    } catch (error) {
      console.error('Get merchant customers error:', error);
      res.status(500).json({ message: 'Failed to fetch customers' });
    }
  });

  // Transfer points to customer via QR scan
  app.post('/api/merchant/transfer-points', authenticateToken, authorizeRole(['merchant']), async (req, res) => {
    try {
      console.log(`🚀 MERCHANT TRANSFER-POINTS ENDPOINT CALLED`);
      console.log(`📥 Request body:`, req.body);
      
      const { customerId, points, description } = req.body;
      const merchantId = req.user.userId;
      
      console.log(`👤 Merchant ID: ${merchantId}, Customer ID: ${customerId}, Points: ${points}`);

      if (!customerId || !points || !description) {
        return res.status(400).json({ message: 'Customer ID, points, and description are required' });
      }

      const pointsAmount = parseInt(points);
      if (isNaN(pointsAmount) || pointsAmount <= 0) {
        return res.status(400).json({ message: 'Points must be a positive number' });
      }

      // Get merchant info
      const merchant = await storage.getMerchantByUserId(merchantId);
      if (!merchant) {
        return res.status(404).json({ message: 'Merchant not found' });
      }

      // Check if merchant has enough points - use loyaltyPointsBalance for consistency with dashboard
      const merchantBalance = merchant.loyaltyPointsBalance || merchant.availablePoints || 0;
      if (merchantBalance < pointsAmount) {
        console.log(`❌ Insufficient balance: ${merchantBalance} < ${pointsAmount}`);
        return res.status(400).json({ message: 'Insufficient points balance' });
      }

      // Get customer profile - try by profile ID first, then by user ID
      let customerProfile = await storage.getCustomerProfileById(customerId);
      if (!customerProfile) {
        // Try by user ID
        customerProfile = await storage.getCustomerProfile(customerId);
      }
      if (!customerProfile) {
        return res.status(404).json({ message: 'Customer not found' });
      }

      // Create customer point transaction record
      const transaction = await storage.createCustomerPointTransaction({
        customerId: customerProfile.id,
        merchantId: merchant.id,
        transactionType: 'earned',
        points: pointsAmount,
        balanceAfter: customerProfile.currentPointsBalance + pointsAmount,
        description: description,
        customerName: customerProfile.fullName,
        customerAccountNumber: customerProfile.uniqueAccountNumber
      });

      console.log(`💾 Transaction created:`, {
        transactionId: transaction.id,
        customerId: customerProfile.id,
        customerUserId: customerProfile.userId,
        points: pointsAmount,
        description: description
      });

      // Log customer profile before Global Number processing
      console.log(`📊 Customer profile BEFORE Global Number processing:`, {
        id: customerProfile.id,
        userId: customerProfile.userId,
        currentPointsBalance: customerProfile.currentPointsBalance,
        globalSerialNumber: customerProfile.globalSerialNumber,
        globalRewardNumbers: customerProfile.globalRewardNumbers
      });

      // FIRST: Update customer profile directly to ensure loyalty points are added
      console.log(`💰 DIRECTLY updating customer profile with ${pointsAmount} loyalty points...`);
      await storage.updateCustomerProfile(customerProfile.userId, {
        currentPointsBalance: customerProfile.currentPointsBalance + pointsAmount,
        totalPointsEarned: customerProfile.totalPointsEarned + pointsAmount
      });
      console.log(`✅ Customer profile updated: ${customerProfile.currentPointsBalance} → ${customerProfile.currentPointsBalance + pointsAmount} points`);

      // THEN: Use the Global Number system for accumulated points (separate from loyalty points)
      console.log(`🔍 Calling Global Number System for customer ${customerProfile.userId} with ${pointsAmount} points`);
      const { globalNumberSystem } = await import('../services/GlobalNumberSystem');
      
      try {
        const result = await globalNumberSystem.checkAndAssignGlobalNumber(
          customerProfile.userId, 
          pointsAmount, 
          false // These are earned points, not reward points
        );

        console.log(`📊 Global Number System Result:`, {
          globalNumberAssigned: result.globalNumberAssigned,
          globalNumber: result.globalNumber,
          pointsReset: result.pointsReset,
          stepUpRewards: result.stepUpRewards.length,
          globalNumbers: result.globalNumbers
        });

        if (result.globalNumberAssigned) {
          console.log(`🎯 Global Number #${result.globalNumber} assigned to customer ${customerProfile.fullName}`);
          
          // Award StepUp rewards if any
          for (const reward of result.stepUpRewards) {
            console.log(`🎁 StepUp Reward awarded: ${reward.rewardPoints} points to customer with Global #${reward.globalNumber}`);
          }
        } else {
          console.log(`📊 No Global Number assigned. Points: ${pointsAmount}/1500`);
        }
      } catch (error) {
        console.error(`❌ Error in Global Number System:`, error);
        // Continue even if Global Number system fails
      }

      // Log customer profile after Global Number processing
      const updatedProfile = await storage.getCustomerProfile(customerProfile.userId);
      console.log(`📊 Customer profile AFTER Global Number processing:`, {
        id: updatedProfile?.id,
        userId: updatedProfile?.userId,
        currentPointsBalance: updatedProfile?.currentPointsBalance,
        globalSerialNumber: updatedProfile?.globalSerialNumber,
        globalRewardNumbers: updatedProfile?.globalRewardNumbers
      });
      // Get the FINAL updated customer profile after all processing
      const finalUpdatedProfile = await storage.getCustomerProfile(customerProfile.userId);
      
      if (finalUpdatedProfile) {
        try {
          console.log(`🔄 Updating merchant customer record for customer ${customerProfile.id}...`);
          console.log(`📊 Final customer profile points: ${finalUpdatedProfile.currentPointsBalance}`);
          
          // Check if merchant customer record exists
          const merchantCustomer = await storage.getMerchantCustomer(merchantId, customerProfile.id);
          if (merchantCustomer) {
            console.log(`✅ Found merchant customer record, updating loyalty points...`);
            await storage.updateMerchantCustomer(merchantId, customerProfile.id, {
              currentPointsBalance: finalUpdatedProfile.currentPointsBalance,
              totalPointsEarned: finalUpdatedProfile.totalPointsEarned,
              tier: finalUpdatedProfile.tier
            });
            console.log(`✅ Merchant customer record updated: ${finalUpdatedProfile.currentPointsBalance} loyalty points`);
          } else {
            console.log(`⚠️  Merchant customer record not found, creating new one...`);
            
            // Create merchant customer record if it doesn't exist
            await storage.createMerchantCustomer({
              merchantId: merchantId,
              customerId: customerProfile.id,
              customerName: customerProfile.fullName,
              customerEmail: customerProfile.email,
              customerMobile: customerProfile.mobileNumber,
              accountNumber: customerProfile.uniqueAccountNumber,
              currentPointsBalance: finalUpdatedProfile.currentPointsBalance,
              totalPointsEarned: finalUpdatedProfile.totalPointsEarned,
              tier: finalUpdatedProfile.tier,
              isActive: true
            });
            console.log(`✅ Created new merchant customer record with ${finalUpdatedProfile.currentPointsBalance} loyalty points`);
          }
        } catch (error) {
          console.error('❌ Error updating merchant customer record:', error);
          // Don't fail the entire transaction if merchant customer update fails
        }
      }

      // Update merchant available points - keep both fields in sync
      console.log(`💰 DEDUCTING POINTS FROM MERCHANT:`, {
        merchantId,
        businessName: merchant.businessName,
        referredByMerchant: merchant.referredByMerchant || 'None (direct signup)',
        isReferred: !!merchant.referredByMerchant,
        currentLoyaltyPoints: merchant.loyaltyPointsBalance,
        currentAvailablePoints: merchant.availablePoints,
        pointsToDeduct: pointsAmount,
        newLoyaltyPoints: (merchant.loyaltyPointsBalance || 0) - pointsAmount,
        newAvailablePoints: merchant.availablePoints - pointsAmount
      });
      
      await storage.updateMerchant(merchantId, {
        loyaltyPointsBalance: (merchant.loyaltyPointsBalance || 0) - pointsAmount,
        availablePoints: merchant.availablePoints - pointsAmount,
        totalPointsDistributed: merchant.totalPointsDistributed + pointsAmount
      });
      
      // CRITICAL FIX: Also update merchant wallet rewardPointBalance
      const wallet = await storage.getMerchantWallet(merchant.id);
      if (wallet) {
        const newWalletBalance = wallet.rewardPointBalance - pointsAmount;
        await storage.updateMerchantWallet(merchant.id, {
          rewardPointBalance: newWalletBalance
        });
        console.log(`✅ Updated merchant wallet: ${wallet.rewardPointBalance} → ${newWalletBalance}`);
      } else {
        console.log(`⚠️ Warning: Merchant wallet not found for ${merchant.id}`);
      }
      
      // Verify the update worked
      const updatedMerchant = await storage.getMerchantByUserId(merchantId);
      console.log(`✅ MERCHANT POINTS UPDATED:`, {
        businessName: updatedMerchant?.businessName,
        newLoyaltyPoints: updatedMerchant?.loyaltyPointsBalance,
        newAvailablePoints: updatedMerchant?.availablePoints
      });

      // Process affiliate commission if this merchant was referred
      try {
        console.log(`🔍 PROCESSING AFFILIATE COMMISSION FOR POINT TRANSFER:`);
        console.log(`   - Merchant ID (userId): ${merchantId}`);
        console.log(`   - Points Amount: ${pointsAmount}`);
        console.log(`   - Transaction ID: ${transaction.id}`);
        
        const { AffiliateCommissionService } = await import('./services/affiliate-commission-service');
        
        const clientIP = req.ip || req.connection.remoteAddress || 'unknown';
        const userAgent = req.get('User-Agent') || 'unknown';
        
        const commissionResult = await AffiliateCommissionService.processCommission(
          merchantId,
          pointsAmount,
          transaction.id,
          clientIP,
          userAgent
        );

        console.log(`📊 COMMISSION RESULT:`, {
          eligible: commissionResult.eligibleForCommission,
          amount: commissionResult.commissionAmount,
          referringMerchantId: commissionResult.referringMerchantId,
          referredMerchantId: commissionResult.referredMerchantId
        });

        if (commissionResult.eligibleForCommission && commissionResult.commissionAmount > 0) {
          console.log(`💰 ✅ AFFILIATE COMMISSION PROCESSED: ${commissionResult.commissionAmount} awarded to merchant ${commissionResult.referringMerchantId}`);
        } else {
          console.log(`ℹ️ ❌ NO AFFILIATE COMMISSION: ${commissionResult.eligibleForCommission ? 'Zero amount' : 'Not eligible'}`);
        }
      } catch (commissionError) {
        console.error('⚠️ ERROR PROCESSING AFFILIATE COMMISSION:', commissionError);
        console.error('Stack trace:', commissionError.stack);
        // Continue even if commission processing fails - the main point transfer succeeded
      }

      // Process 10% instant cashback
      try {
        console.log(`🔍 PROCESSING INSTANT CASHBACK FOR POINT TRANSFER:`);
        console.log(`   - Merchant ID: ${merchant.id}`);
        console.log(`   - Customer ID: ${customerProfile.id}`);
        console.log(`   - Points Amount: ${pointsAmount}`);
        console.log(`   - Transaction ID: ${transaction.id}`);
        
        const { InstantCashbackService } = await import('./services/InstantCashbackService');
        const cashbackService = new InstantCashbackService(storage);
        const cashbackResult = await cashbackService.processInstantCashback(
          merchant.id,
          customerProfile.id,
          pointsAmount,
          transaction.id
        );

        if (cashbackResult.success) {
          console.log(`💰 ✅ INSTANT CASHBACK PROCESSED: ${cashbackResult.cashbackAmount} points awarded to merchant`);
        } else {
          console.error(`❌ CASHBACK ERROR: ${cashbackResult.error}`);
        }
      } catch (cashbackError) {
        console.error('⚠️ ERROR PROCESSING INSTANT CASHBACK:', cashbackError);
        console.error('Stack trace:', cashbackError.stack);
        // Continue even if cashback processing fails - the main point transfer succeeded
      }

      res.json({
        success: true,
        transaction,
        message: `Successfully transferred ${pointsAmount} points to ${customerProfile.fullName}`
      });

    } catch (error) {
      console.error('Transfer points error:', error);
      res.status(500).json({ message: 'Failed to transfer points' });
    }
  });

  // Transfer points to customer after QR scan
  app.post('/api/merchant/transfer-points-qr', authenticateToken, authorizeRole(['merchant']), async (req, res) => {
    try {
      const { qrCode, points, description } = req.body;
      const merchantId = req.user.userId;

      if (!qrCode || !points || !description) {
        return res.status(400).json({ message: 'QR code, points, and description are required' });
      }

      const pointsAmount = parseInt(points);
      if (isNaN(pointsAmount) || pointsAmount <= 0) {
        return res.status(400).json({ message: 'Points must be a positive number' });
      }

      // Get customer from QR code
      const customerProfile = await storage.getCustomerByQRCode(qrCode);
      if (!customerProfile) {
        return res.status(404).json({ message: 'Invalid QR code or customer not found' });
      }

      // Get merchant info
      const merchant = await storage.getMerchantByUserId(merchantId);
      if (!merchant) {
        return res.status(404).json({ message: 'Merchant not found' });
      }

      // Check if merchant has enough points
      if (merchant.availablePoints < pointsAmount) {
        return res.status(400).json({ message: 'Insufficient points balance' });
      }

      // Create customer point transaction
      const transaction = await storage.createCustomerPointTransaction({
        customerId: customerProfile.id,
        merchantId: merchant.id,
        transactionType: 'earned',
        points: pointsAmount,
        balanceAfter: customerProfile.currentPointsBalance + pointsAmount,
        description: description
      });

      // Update customer wallet
      const customerWallet = await storage.getCustomerWallet(customerProfile.id);
      if (customerWallet) {
        await storage.updateCustomerWallet(customerProfile.id, {
          rewardPointBalance: customerWallet.rewardPointBalance + pointsAmount,
          totalRewardPointsEarned: customerWallet.totalRewardPointsEarned + pointsAmount,
          lastTransactionAt: new Date()
        });
      }

      // Update customer profile using proper accumulated points logic
      const { RewardSystemService } = await import('./services/RewardSystemService');
      const rewardSystemService = new RewardSystemService();
      
      // Add points using the proper accumulation logic that triggers Global Number assignment
      await rewardSystemService.addAccumulatedPoints(customerProfile.id, pointsAmount, 'purchase');
      
      // Also update the direct balance fields for compatibility
      await storage.updateCustomerProfile(customerProfile.userId, {
        currentPointsBalance: customerProfile.currentPointsBalance + pointsAmount,
        totalPointsEarned: customerProfile.totalPointsEarned + pointsAmount
      });

      // Update merchant customer record to keep it synchronized
      try {
        console.log(`🔄 Updating merchant customer record for QR transfer...`);
        
        // Get updated customer profile
        const updatedCustomerProfile = await storage.getCustomerProfile(customerProfile.userId);
        
        // Check if merchant customer record exists
        const merchantCustomer = await storage.getMerchantCustomer(merchantId, customerProfile.id);
        if (merchantCustomer) {
          console.log(`✅ Found merchant customer record, updating loyalty points...`);
          await storage.updateMerchantCustomer(merchantId, customerProfile.id, {
            currentPointsBalance: updatedCustomerProfile.currentPointsBalance,
            totalPointsEarned: updatedCustomerProfile.totalPointsEarned,
            tier: updatedCustomerProfile.tier
          });
          console.log(`✅ Merchant customer record updated: ${updatedCustomerProfile.currentPointsBalance} loyalty points`);
        } else {
          console.log(`⚠️  Merchant customer record not found, creating new one...`);
          
          // Create merchant customer record if it doesn't exist
          await storage.createMerchantCustomer({
            merchantId: merchantId,
            customerId: customerProfile.id,
            customerName: customerProfile.fullName,
            customerEmail: customerProfile.email,
            customerMobile: customerProfile.mobileNumber,
            accountNumber: customerProfile.uniqueAccountNumber,
            currentPointsBalance: updatedCustomerProfile.currentPointsBalance,
            totalPointsEarned: updatedCustomerProfile.totalPointsEarned,
            tier: updatedCustomerProfile.tier,
            isActive: true
          });
          console.log(`✅ Created new merchant customer record with ${updatedCustomerProfile.currentPointsBalance} loyalty points`);
        }
      } catch (error) {
        console.error('❌ Error updating merchant customer record for QR transfer:', error);
      }

      // Update merchant available points - keep both fields in sync
      await storage.updateMerchant(merchantId, {
        loyaltyPointsBalance: (merchant.loyaltyPointsBalance || 0) - pointsAmount,
        availablePoints: merchant.availablePoints - pointsAmount,
        totalPointsDistributed: merchant.totalPointsDistributed + pointsAmount
      });

      // Process affiliate commission if this merchant was referred
      try {
        console.log(`🔍 PROCESSING AFFILIATE COMMISSION FOR QR POINT TRANSFER:`);
        console.log(`   - Merchant ID (userId): ${merchantId}`);
        console.log(`   - Points Amount: ${pointsAmount}`);
        console.log(`   - Transaction ID: ${transaction.id}`);
        
        const { AffiliateCommissionService } = await import('./services/affiliate-commission-service');
        
        const clientIP = req.ip || req.connection.remoteAddress || 'unknown';
        const userAgent = req.get('User-Agent') || 'unknown';
        
        const commissionResult = await AffiliateCommissionService.processCommission(
          merchantId,
          pointsAmount,
          transaction.id,
          clientIP,
          userAgent
        );

        console.log(`📊 QR COMMISSION RESULT:`, {
          eligible: commissionResult.eligibleForCommission,
          amount: commissionResult.commissionAmount,
          referringMerchantId: commissionResult.referringMerchantId,
          referredMerchantId: commissionResult.referredMerchantId
        });

        if (commissionResult.eligibleForCommission && commissionResult.commissionAmount > 0) {
          console.log(`💰 ✅ QR AFFILIATE COMMISSION PROCESSED: ${commissionResult.commissionAmount} awarded to merchant ${commissionResult.referringMerchantId}`);
        } else {
          console.log(`ℹ️ ❌ NO QR AFFILIATE COMMISSION: ${commissionResult.eligibleForCommission ? 'Zero amount' : 'Not eligible'}`);
        }
      } catch (commissionError) {
        console.error('⚠️ ERROR PROCESSING QR AFFILIATE COMMISSION:', commissionError);
        console.error('Stack trace:', commissionError.stack);
        // Continue even if commission processing fails - the main point transfer succeeded
      }

      // Process 10% instant cashback
      try {
        console.log(`🔍 PROCESSING INSTANT CASHBACK FOR QR POINT TRANSFER:`);
        console.log(`   - Merchant ID: ${merchant.id}`);
        console.log(`   - Customer ID: ${customerProfile.id}`);
        console.log(`   - Points Amount: ${pointsAmount}`);
        console.log(`   - Transaction ID: ${transaction.id}`);
        
        const { InstantCashbackService } = await import('./services/InstantCashbackService');
        const cashbackService = new InstantCashbackService(storage);
        const cashbackResult = await cashbackService.processInstantCashback(
          merchant.id,
          customerProfile.id,
          pointsAmount,
          transaction.id
        );

        if (cashbackResult.success) {
          console.log(`💰 ✅ QR INSTANT CASHBACK PROCESSED: ${cashbackResult.cashbackAmount} points awarded to merchant`);
        } else {
          console.error(`❌ QR CASHBACK ERROR: ${cashbackResult.error}`);
        }
      } catch (cashbackError) {
        console.error('⚠️ ERROR PROCESSING QR INSTANT CASHBACK:', cashbackError);
        console.error('Stack trace:', cashbackError.stack);
        // Continue even if cashback processing fails - the main point transfer succeeded
      }

      res.json({
        success: true,
        transaction,
        customer: {
          id: customerProfile.id,
          fullName: customerProfile.fullName,
          accountNumber: customerProfile.uniqueAccountNumber,
          newBalance: customerProfile.currentPointsBalance + pointsAmount
        },
        message: `Successfully transferred ${pointsAmount} points to ${customerProfile.fullName}`
      });

    } catch (error) {
      console.error('Transfer points via QR error:', error);
      res.status(500).json({ message: 'Failed to transfer points' });
    }
  });

  // ==================== MERCHANT PROFILE MANAGEMENT ====================
  
  // Create merchant profile
  app.post('/api/merchant/profile', authenticateToken, authorizeRole(['merchant']), async (req, res) => {
    try {
      const { businessName, businessType, address, phone, country } = req.body;
      const merchantId = req.user.userId;

      // Check if merchant profile already exists
      const existingMerchant = await storage.getMerchantByUserId(merchantId);
      if (existingMerchant) {
        return res.status(400).json({ message: 'Merchant profile already exists' });
      }

      // Create merchant profile
      const merchantProfile = await storage.createMerchant({
        userId: merchantId,
        businessName,
        businessType,
        accountType: "merchant",
        tier: "merchant",
        referralId: `MERCH_${merchantId.substring(0, 8).toUpperCase()}`,
        loyaltyPointsBalance: 0,
        totalCashback: "0.00",
        totalSales: "0.00",
        totalOrders: 0,
        productCount: 0,
        availablePoints: 0, // Start with 0 points
        totalPointsPurchased: 0,
        totalPointsDistributed: 0,
        instantCashback: "0.00",
        referralCommission: "0.00",
        royaltyBonus: "0.00",
        komarceBalance: "500.00",
        totalReceived: "0.00",
        totalWithdrawn: "0.00",
        isActive: true
      });

      res.json({
        success: true,
        message: 'Merchant profile created successfully',
        merchant: merchantProfile
      });

    } catch (error) {
      console.error('Create merchant profile error:', error);
      res.status(500).json({ error: 'Failed to create merchant profile' });
    }
  });

  // Fix existing merchants loyalty points
  app.post('/api/merchant/fix-points', authenticateToken, authorizeRole(['merchant']), async (req, res) => {
    try {
      const merchantId = req.user.userId;
      const merchant = await storage.getMerchantByUserId(merchantId);
      
      if (!merchant) {
        return res.status(404).json({ message: 'Merchant not found' });
      }
      
      console.log(`🔧 FIXING MERCHANT POINTS:`, {
        businessName: merchant.businessName,
        currentLoyaltyPoints: merchant.loyaltyPointsBalance,
        currentAvailablePoints: merchant.availablePoints,
        referredByMerchant: merchant.referredByMerchant || 'None'
      });
      
      // Reset loyalty points to 0 if they're not already 0
      if (merchant.loyaltyPointsBalance > 0 || merchant.availablePoints > 0) {
        await storage.updateMerchant(merchantId, {
          loyaltyPointsBalance: 0,
          availablePoints: 0
        });
        
        // Also update merchant wallet if it exists
        try {
          const merchantWallet = await storage.getMerchantWallet(merchant.id);
          if (merchantWallet && merchantWallet.rewardPointBalance > 0) {
            await storage.updateMerchantWallet(merchant.id, {
              rewardPointBalance: 0
            });
            console.log(`✅ Updated merchant wallet rewardPointBalance to 0`);
          }
        } catch (error) {
          console.log('No merchant wallet found or error updating wallet:', error);
        }
        
        const updatedMerchant = await storage.getMerchantByUserId(merchantId);
        console.log(`✅ MERCHANT POINTS FIXED:`, {
          businessName: updatedMerchant.businessName,
          newLoyaltyPoints: updatedMerchant.loyaltyPointsBalance,
          newAvailablePoints: updatedMerchant.availablePoints
        });
        
        res.json({
          success: true,
          message: 'Merchant loyalty points reset to 0',
          merchant: updatedMerchant
        });
      } else {
        res.json({
          success: true,
          message: 'Merchant loyalty points are already 0',
          merchant: merchant
        });
      }
      
    } catch (error) {
      console.error('Fix merchant points error:', error);
      res.status(500).json({ error: 'Failed to fix merchant points' });
    }
  });

  // Admin endpoint to fix ALL existing merchants
  app.post('/api/admin/fix-all-merchants', authenticateToken, authorizeRole(['admin', 'global_admin']), async (req, res) => {
    try {
      console.log('🔧 FIXING ALL EXISTING MERCHANTS...');
      
      const allMerchants = await storage.getMerchants();
      let fixedCount = 0;
      
      for (const merchant of allMerchants) {
        if (merchant.loyaltyPointsBalance > 0 || merchant.availablePoints > 0) {
          console.log(`🔍 Fixing merchant: ${merchant.businessName} (${merchant.userId})`);
          
          // Reset to 0
          await storage.updateMerchant(merchant.userId, {
            loyaltyPointsBalance: 0,
            availablePoints: 0
          });
          
          // Also update merchant wallet if it exists
          try {
            const merchantWallet = await storage.getMerchantWallet(merchant.id);
            if (merchantWallet && merchantWallet.rewardPointBalance > 0) {
              await storage.updateMerchantWallet(merchant.id, {
                rewardPointBalance: 0
              });
            }
          } catch (error) {
            console.log(`No merchant wallet found for ${merchant.businessName}`);
          }
          
          fixedCount++;
          console.log(`✅ Fixed merchant: ${merchant.businessName}`);
        }
      }
      
      console.log(`🎉 Fixed ${fixedCount} merchants out of ${allMerchants.length} total merchants`);
      
      res.json({
        success: true,
        message: `Fixed ${fixedCount} merchants`,
        totalMerchants: allMerchants.length,
        fixedMerchants: fixedCount
      });
      
    } catch (error) {
      console.error('Fix all merchants error:', error);
      res.status(500).json({ error: 'Failed to fix all merchants' });
    }
  });

  // ==================== MERCHANT REPORTS AND TRANSACTIONS ====================
  
  // Get merchant's point transfers (points distributed to customers)
  app.get('/api/merchant/point-transfers', authenticateToken, authorizeRole(['merchant']), async (req, res) => {
    try {
      const merchantId = req.user.userId;
      
      // Get all point transfers made by this merchant
      const transfers = await storage.getMerchantPointTransfers(merchantId);
      
      res.json(transfers);
    } catch (error) {
      console.error('Get merchant point transfers error:', error);
      res.status(500).json({ error: 'Failed to get point transfers' });
    }
  });

  // Get merchant's points received from local admin
  app.get('/api/merchant/points-received', authenticateToken, authorizeRole(['merchant']), async (req, res) => {
    try {
      const merchantId = req.user.userId;
      
      // Get all points received by this merchant from local admin
      const pointsReceived = await storage.getMerchantPointsReceived(merchantId);
      
      res.json(pointsReceived);
    } catch (error) {
      console.error('Get merchant points received error:', error);
      res.status(500).json({ error: 'Failed to get points received' });
    }
  });

  // Get merchant's all transactions
  app.get('/api/merchant/transactions', authenticateToken, authorizeRole(['merchant']), async (req, res) => {
    try {
      const merchantId = req.user.userId;
      
      // Get all transactions for this merchant
      const transactions = await storage.getMerchantAllTransactions(merchantId);
      
      res.json(transactions);
    } catch (error) {
      console.error('Get merchant transactions error:', error);
      res.status(500).json({ error: 'Failed to get transactions' });
    }
  });

  // Get comprehensive merchant reports
  app.get('/api/merchant/reports', authenticateToken, authorizeRole(['merchant']), async (req, res) => {
    try {
      const merchantId = req.user.userId;
      const { period = 'monthly' } = req.query;
      
      // Get merchant data
      const merchant = await storage.getMerchantByUserId(merchantId);
      if (!merchant) {
        return res.status(404).json({ error: 'Merchant not found' });
      }

      // Get all relevant data
      const pointTransfers = await storage.getMerchantPointTransfers(merchantId);
      const pointsReceived = await storage.getMerchantPointsReceived(merchantId);
      const transactions = await storage.getMerchantAllTransactions(merchantId);

      // Calculate totals
      const totalPointsDistributed = pointTransfers.reduce((sum, t) => sum + t.points, 0);
      const totalPointsReceived = pointsReceived.reduce((sum, t) => sum + t.points, 0);
      const currentBalance = merchant.loyaltyPointsBalance || 0;

      const reportData = {
        summary: {
          totalReceived: totalPointsReceived,
          totalDistributed: totalPointsDistributed,
          balance: currentBalance,
          transactions: transactions.length
        },
        pointsReceived,
        pointsDistributed: pointTransfers,
        transactions
      };

      res.json(reportData);
    } catch (error) {
      console.error('Get merchant reports error:', error);
      res.status(500).json({ error: 'Failed to get reports' });
    }
  });

  // ==================== MERCHANT QR SCANNING ====================
  
  // Simple delete customer from merchant list only (alternative endpoint)
  app.delete('/api/merchant/customers/:customerId', authenticateToken, authorizeRole(['merchant']), async (req, res) => {
    try {
      console.log('🗑️ Simple delete customer request received:', req.params);
      const { customerId } = req.params;
      const merchantId = req.user.userId;

      if (!customerId) {
        return res.status(400).json({ error: 'Customer ID is required' });
      }

      // Just remove from merchant's customer list (simple approach)
      const merchantCustomer = await storage.getMerchantCustomer(merchantId, customerId);
      if (!merchantCustomer) {
        return res.status(404).json({ error: 'Customer not found in your list' });
      }

      await storage.deleteMerchantCustomer(merchantId, customerId);
      
      res.json({
        success: true,
        message: `Customer ${merchantCustomer.customerName} removed from your list`
      });

    } catch (error) {
      console.error('❌ Simple delete customer error:', error);
      res.status(500).json({ error: error.message || 'Failed to delete customer' });
    }
  });

  // Debug endpoint to check merchant customers
  app.get('/api/merchant/debug-customers', authenticateToken, authorizeRole(['merchant']), async (req, res) => {
    try {
      const merchantId = req.user.userId;
      const merchantCustomers = await storage.getMerchantCustomers(merchantId);
      
      console.log('🔍 Debug - Merchant customers:', merchantCustomers.length);
      merchantCustomers.forEach(mc => {
        console.log(`  - ${mc.customerName} (${mc.customerId})`);
      });
      
      res.json({
        success: true,
        merchantId,
        customerCount: merchantCustomers.length,
        customers: merchantCustomers.map(mc => ({
          id: mc.customerId,
          name: mc.customerName,
          phone: mc.customerMobile,
          accountNumber: mc.accountNumber
        }))
      });
    } catch (error) {
      console.error('Debug customers error:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // Get blocked customers for merchant
  app.get('/api/merchant/blocked-customers', authenticateToken, authorizeRole(['merchant']), async (req, res) => {
    try {
      const merchantId = req.user.userId;
      const blockedCustomers = await storage.getBlockedCustomers(merchantId);
      
      res.json({
        success: true,
        blockedCustomers
      });
    } catch (error) {
      console.error('Get blocked customers error:', error);
      res.status(500).json({ error: 'Failed to get blocked customers' });
    }
  });

  // Unblock a customer (allow them to be re-added)
  app.post('/api/merchant/unblock-customer/:customerId', authenticateToken, authorizeRole(['merchant']), async (req, res) => {
    try {
      const { customerId } = req.params;
      const merchantId = req.user.userId;

      if (!customerId) {
        return res.status(400).json({ error: 'Customer ID is required' });
      }

      const blockedCustomer = await storage.getBlockedCustomer(merchantId, customerId);
      if (!blockedCustomer) {
        return res.status(404).json({ error: 'Customer is not blocked' });
      }

      await storage.removeBlockedCustomer(merchantId, customerId);

      res.json({
        success: true,
        message: `Customer ${blockedCustomer.customerName} has been unblocked and can now be re-added`
      });
    } catch (error) {
      console.error('Unblock customer error:', error);
      res.status(500).json({ error: 'Failed to unblock customer' });
    }
  });

  // Reset customer password (for merchants to help customers who forgot their password)
  app.post('/api/merchant/reset-customer-password/:customerId', authenticateToken, authorizeRole(['merchant']), async (req, res) => {
    try {
      const { customerId } = req.params;
      const merchantId = req.user.userId;

      if (!customerId) {
        return res.status(400).json({ error: 'Customer ID is required' });
      }

      // Check if customer exists in merchant's customer list
      const merchantCustomer = await storage.getMerchantCustomer(merchantId, customerId);
      if (!merchantCustomer) {
        return res.status(404).json({ error: 'Customer not found in your list' });
      }

      // Generate a new temporary password
      const newTempPassword = Math.random().toString(36).slice(-8);
      const hashedPassword = await bcrypt.hash(newTempPassword, 10);

      // Get the user account
      const user = await storage.getUser(customerId);
      if (!user) {
        return res.status(404).json({ error: 'Customer user account not found' });
      }

      // Update the password
      await storage.updateUser(customerId, { password: hashedPassword });

      console.log(`🔑 Password reset for customer ${merchantCustomer.customerName} by merchant ${merchantId}`);

      res.json({
        success: true,
        tempPassword: newTempPassword,
        customer: {
          id: customerId,
          fullName: merchantCustomer.customerName,
          mobileNumber: merchantCustomer.customerMobile,
          email: merchantCustomer.customerEmail,
          accountNumber: merchantCustomer.accountNumber
        },
        message: `Password reset successfully for ${merchantCustomer.customerName}`
      });
    } catch (error) {
      console.error('Reset customer password error:', error);
      res.status(500).json({ error: 'Failed to reset customer password' });
    }
  });

  // Test route to check if DELETE method works
  app.delete('/api/merchant/test-delete', authenticateToken, authorizeRole(['merchant']), async (req, res) => {
    console.log('🧪 Test delete route called');
    res.json({ success: true, message: 'Delete route is working' });
  });

  // Delete customer completely from the system (using POST to avoid potential DELETE method issues)
  app.post('/api/merchant/delete-customer/:customerId', authenticateToken, authorizeRole(['merchant']), async (req, res) => {
    try {
      console.log('🗑️ Delete customer request received:', req.params);
      const { customerId } = req.params;
      const merchantId = req.user.userId;

      if (!customerId) {
        console.log('❌ No customer ID provided');
        return res.status(400).json({ error: 'Customer ID is required' });
      }

      console.log(`🔍 Looking for customer ${customerId} for merchant ${merchantId}`);

      // Debug: List all merchant customers to see what we have
      const allMerchantCustomers = await storage.getMerchantCustomers(merchantId);
      console.log('🔍 All merchant customers:', allMerchantCustomers.map(mc => ({
        id: mc.customerId,
        name: mc.customerName,
        accountNumber: mc.accountNumber
      })));

      // Check if customer exists in merchant's customer list
      const merchantCustomer = await storage.getMerchantCustomer(merchantId, customerId);
      if (!merchantCustomer) {
        console.log('❌ Customer not found in merchant list');
        console.log('🔍 Available customer IDs:', allMerchantCustomers.map(mc => mc.customerId));
        return res.status(404).json({ 
          error: 'Customer not found in your list',
          debug: {
            searchedId: customerId,
            availableIds: allMerchantCustomers.map(mc => mc.customerId)
          }
        });
      }

      console.log('✅ Customer found in merchant list:', merchantCustomer.customerName);

      // Safe customer deletion - only remove from merchant's list
      try {
        console.log('🗑️ Starting customer deletion from merchant list...');
        
        // Only delete the merchant-customer relationship for now
        // This is safer and avoids potential issues with complete deletion
        console.log('🗑️ Deleting merchant-customer relationship...');
        await storage.deleteMerchantCustomer(merchantId, customerId);
        
        console.log('✅ Customer successfully removed from merchant list');
        
        res.json({
          success: true,
          message: `Customer ${merchantCustomer.customerName} has been removed from your customer list`
        });

      } catch (deleteError) {
        console.error('❌ Error during customer deletion:', deleteError);
        console.error('❌ Delete error details:', deleteError.message, deleteError.stack);
        return res.status(500).json({ 
          error: 'Failed to delete customer from your list',
          details: deleteError.message 
        });
      }

    } catch (error) {
      console.error('❌ Delete customer error:', error);
      res.status(500).json({ error: 'Failed to delete customer' });
    }
  });

  // Create customer profile by merchant
  app.post('/api/merchant/create-customer', authenticateToken, authorizeRole(['merchant']), async (req, res) => {
    try {
      const { fullName, mobileNumber, email } = req.body;
      const merchantId = req.user.userId;

      if (!fullName || !mobileNumber) {
        return res.status(400).json({ error: 'Full name and mobile number are required' });
      }

      // Validate phone number format (Bangladesh)
      const phoneRegex = /^(\+88)?01[3-9]\d{8}$/;
      if (!phoneRegex.test(mobileNumber.replace(/\s/g, ''))) {
        return res.status(400).json({ error: 'Invalid mobile number format' });
      }

      // Check if customer already exists with this phone number
      const existingCustomer = await storage.getCustomerByMobile(mobileNumber);
      if (existingCustomer) {
        // If customer exists, check if they're already in merchant's customer list
        const merchantCustomer = await storage.getMerchantCustomer(merchantId, existingCustomer.userId);
        if (merchantCustomer) {
          return res.status(400).json({ error: 'Customer with this mobile number is already in your customer list' });
        }
        
        // Check if customer is blocked by this merchant
        const blockedCustomer = await storage.getBlockedCustomer(merchantId, existingCustomer.userId);
        if (blockedCustomer) {
          return res.status(403).json({ 
            error: 'Customer was previously removed',
            message: `This customer was removed from your list on ${blockedCustomer.blockedAt.toLocaleDateString()}. To re-add them, please contact support or use the unblock feature.`,
            details: {
              customerName: blockedCustomer.customerName,
              accountNumber: blockedCustomer.accountNumber,
              blockedAt: blockedCustomer.blockedAt,
              canUnblock: true
            }
          });
        }
        
        // Customer exists but not in merchant's list - add them back
        console.log(`📋 Re-adding existing customer ${existingCustomer.fullName} to merchant's list`);
        
        await storage.createMerchantCustomer({
          merchantId,
          customerId: existingCustomer.userId,
          customerName: existingCustomer.fullName,
          customerEmail: existingCustomer.email,
          customerMobile: existingCustomer.mobileNumber,
          accountNumber: existingCustomer.uniqueAccountNumber,
          totalPointsEarned: existingCustomer.totalPointsEarned,
          currentPointsBalance: existingCustomer.currentPointsBalance,
          tier: existingCustomer.tier,
          isActive: true,
          createdByMerchant: false // They weren't created by this merchant
        });

        return res.json({
          success: true,
          customer: {
            id: existingCustomer.userId, // This is the customer ID that might be in localStorage
            fullName: existingCustomer.fullName,
            email: existingCustomer.email,
            mobileNumber: existingCustomer.mobileNumber,
            accountNumber: existingCustomer.uniqueAccountNumber,
            loginInfo: {
              canLoginWith: existingCustomer.email ? 'Phone number or email' : 'Phone number only',
              phoneNumber: existingCustomer.mobileNumber,
              email: existingCustomer.email || 'Not provided'
            }
          },
          message: 'Customer re-added to your list successfully'
        });
      }

      // Check if email is provided and already exists
      if (email) {
        const existingEmailUser = await storage.getUserByEmail(email);
        if (existingEmailUser) {
          return res.status(400).json({ error: 'Customer with this email already exists' });
        }
      }

      // Generate unique username from phone number
      const username = `customer_${mobileNumber.replace(/\D/g, '')}`;
      
      // Generate a temporary password (customer can change it later)
      const tempPassword = Math.random().toString(36).slice(-8);
      const hashedPassword = await bcrypt.hash(tempPassword, 10);

      // Get merchant info for country
      const merchant = await storage.getMerchantByUserId(merchantId);
      const merchantUser = await storage.getUser(merchantId);
      
      if (!merchant || !merchantUser) {
        return res.status(404).json({ error: 'Merchant not found' });
      }

      // Create user account
      const newUser = await storage.createUser({
        username,
        email: email || `${username}@temp.komarce.com`,
        password: hashedPassword,
        firstName: fullName.split(' ')[0],
        lastName: fullName.split(' ').slice(1).join(' ') || '',
        role: 'customer',
        country: merchantUser.country,
        isActive: true,
        createdByMerchant: true
      });

      // Generate unique account number
      const accountNumber = `KOM${String(Date.now()).slice(-8)}`;

      // Create customer profile
      const customerProfile = await storage.createCustomerProfile({
        userId: newUser.id,
        fullName,
        email: email || null,
        mobileNumber,
        uniqueAccountNumber: accountNumber,
        currentPointsBalance: 0,
        totalPointsEarned: 0,
        accumulatedPoints: 0,
        globalSerialNumber: 0, // Start with 0 (not assigned yet)
        localSerialNumber: 0,  // Start with 0 (not assigned yet)
        tier: 'bronze',
        profileComplete: false,
        qrCode: `KOMARCE:CUSTOMER:${newUser.id}:${accountNumber}`,
        createdByMerchant: true
      });

      // Create customer wallet
      await storage.createCustomerWallet({
        customerId: customerProfile.id,
        rewardPointBalance: 0,
        totalRewardPointsEarned: 0,
        totalRewardPointsSpent: 0,
        totalRewardPointsTransferred: 0,
        lastTransactionAt: new Date()
      });

      // Add customer to merchant's customer list
      await storage.createMerchantCustomer({
        merchantId,
        customerId: newUser.id,
        customerName: fullName,
        customerEmail: email || null,
        customerMobile: mobileNumber,
        accountNumber,
        totalPointsEarned: 0,
        currentPointsBalance: 0,
        tier: 'bronze',
        isActive: true,
        createdByMerchant: true
      });

      res.json({
        success: true,
        customer: {
          id: newUser.id,
          fullName,
          email: email || null,
          mobileNumber,
          accountNumber,
          tempPassword, // Send temp password so merchant can inform customer
          loginInfo: {
            canLoginWith: email ? 'Phone number or email' : 'Phone number only',
            phoneNumber: mobileNumber,
            email: email || 'Not provided'
          }
        },
        message: 'Customer created successfully'
      });

    } catch (error) {
      console.error('Create customer error:', error);
      res.status(500).json({ error: 'Failed to create customer' });
    }
  });

  // Scan customer QR code and create/retrieve customer profile
  app.post('/api/merchant/scan-customer', authenticateToken, async (req, res) => {
    try {
      const { qrCode } = req.body;
      const merchantId = req.user.userId;

      if (!qrCode) {
        return res.status(400).json({ error: 'QR code is required' });
      }

      // Parse QR code to get customer information
      let customerId: string;
      let accountNumber: string;

      if (qrCode.startsWith('KOMARCE:CUSTOMER:')) {
        // New format: KOMARCE:CUSTOMER:customerId:accountNumber
        const parts = qrCode.split(':');
        if (parts.length >= 4) {
          customerId = parts[2];
          accountNumber = parts[3];
        } else {
          return res.status(400).json({ error: 'Invalid QR code format' });
        }
      } else {
        // Old JSON format - try to parse
        try {
          const qrData = JSON.parse(qrCode);
          customerId = qrData.customerId;
          accountNumber = qrData.accountNumber;
        } catch (e) {
          return res.status(400).json({ error: 'Invalid QR code format' });
        }
      }

      // Get customer profile from main database
      const customerProfile = await storage.getCustomerProfileById(customerId);
      if (!customerProfile) {
        return res.status(404).json({ error: 'Customer not found' });
      }

      // Check if customer is blocked by this merchant
      const blockedCustomer = await storage.getBlockedCustomer(merchantId, customerId);
      if (blockedCustomer) {
        return res.status(403).json({ 
          error: 'Customer access denied',
          message: `This customer was previously removed from your customer list on ${blockedCustomer.blockedAt.toLocaleDateString()}. You cannot re-add them using QR code.`,
          details: {
            customerName: blockedCustomer.customerName,
            accountNumber: blockedCustomer.accountNumber,
            blockedAt: blockedCustomer.blockedAt,
            reason: blockedCustomer.reason
          }
        });
      }

      // Check if customer already exists in merchant's customer list
      // Use customerProfile.userId consistently for the customerId field
      let merchantCustomer = await storage.getMerchantCustomer(merchantId, customerProfile.userId);
      
      if (!merchantCustomer) {
        // Create customer in merchant's database
        merchantCustomer = await storage.createMerchantCustomer({
          merchantId,
          customerId: customerProfile.userId,
          customerName: customerProfile.fullName,
          customerEmail: customerProfile.email,
          customerMobile: customerProfile.mobileNumber,
          accountNumber: customerProfile.uniqueAccountNumber,
          totalPointsEarned: customerProfile.totalPointsEarned,
          currentPointsBalance: customerProfile.currentPointsBalance,
          tier: customerProfile.tier,
          isActive: true
        });
      } else {
        // Update existing customer info
        merchantCustomer = await storage.updateMerchantCustomer(merchantId, customerProfile.userId, {
          customerName: customerProfile.fullName,
          customerEmail: customerProfile.email,
          customerMobile: customerProfile.mobileNumber,
          currentPointsBalance: customerProfile.currentPointsBalance,
          tier: customerProfile.tier
        });
      }

      res.json({
        success: true,
        customer: {
          id: customerProfile.id,
          fullName: customerProfile.fullName,
          accountNumber: customerProfile.uniqueAccountNumber,
          mobileNumber: customerProfile.mobileNumber,
          currentPointsBalance: customerProfile.currentPointsBalance,
          tier: customerProfile.tier
        },
        message: 'Customer profile created/updated successfully'
      });

    } catch (error) {
      console.error('Scan customer error:', error);
      res.status(500).json({ error: 'Failed to scan customer QR code' });
    }
  });

  // Get merchant referral program data
  app.get('/api/merchant/referral-program', authenticateToken, authorizeRole(['merchant']), async (req, res) => {
    try {
      const user = await storage.getUserById(req.user.userId);
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }

      const merchant = await storage.getMerchantByUserId(user.id);
      if (!merchant) {
        return res.status(404).json({ error: 'Merchant not found' });
      }

      // Generate referral link
      const baseUrl = process.env.PUBLIC_APP_ORIGIN || 
                     req.headers.origin || 
                     `${req.protocol}://${req.get('host')}`;
      
      const referralLink = `${baseUrl}/register?ref=${merchant.merchantReferralCode}`;

      // Get referred merchants
      const referredMerchants = await storage.getMerchantReferralsByReferrer(merchant.id);
      
      // Calculate statistics
      const totalReferrals = referredMerchants.length;
      const activeReferrals = referredMerchants.filter(r => r.isActive).length;
      
      // Calculate total commission earned
      const totalCommissionEarned = referredMerchants.reduce((sum, r) => 
        sum + parseFloat(r.commissionEarned || '0'), 0
      );

      // Calculate monthly commission (current month)
      const currentMonth = new Date().getMonth();
      const currentYear = new Date().getFullYear();
      const monthlyCommission = referredMerchants
        .filter(r => {
          const createdDate = new Date(r.createdAt);
          return createdDate.getMonth() === currentMonth && 
                 createdDate.getFullYear() === currentYear;
        })
        .reduce((sum, r) => sum + parseFloat(r.commissionEarned || '0'), 0);

      // Format referred merchants data
      const referredMerchantsData = await Promise.all(
        referredMerchants.map(async (referral) => {
          const referredMerchant = await storage.getMerchant(referral.referredMerchantId);
          const referredUser = referredMerchant ? 
            await storage.getUserById(referredMerchant.userId) : null;
          
          return {
            id: referral.referredMerchantId,
            businessName: referredMerchant?.businessName || 'Unknown Business',
            email: referredUser?.email || 'Unknown Email',
            totalPointsTransferred: parseFloat(referral.totalSales || '0'),
            commissionEarned: parseFloat(referral.commissionEarned || '0'),
            lastActivity: referredMerchant?.updatedAt || referral.createdAt,
            isActive: referral.isActive,
            registrationDate: referral.createdAt
          };
        })
      );

      res.json({
        referralLink,
        referralCode: merchant.merchantReferralCode,
        totalReferrals,
        activeReferrals,
        totalCommissionEarned,
        monthlyCommission,
        referredMerchants: referredMerchantsData
      });

    } catch (error) {
      console.error('Get referral program error:', error);
      res.status(500).json({ error: 'Failed to get referral program data' });
    }
  });
}