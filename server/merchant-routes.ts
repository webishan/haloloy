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
      const merchantId = req.user.id;
      
      // Get merchant's scanned customers
      const merchantCustomers = await storage.getMerchantCustomers(merchantId);
      
      // Format the response
      const customers = merchantCustomers.map(mc => ({
        id: mc.customerId,
        fullName: mc.customerName,
        email: mc.customerEmail,
        mobileNumber: mc.customerMobile,
        accountNumber: mc.accountNumber,
        currentPointsBalance: mc.currentPointsBalance,
        totalPointsEarned: mc.totalPointsEarned,
        tier: mc.tier,
        isActive: mc.isActive,
        lastUpdated: mc.updatedAt
      }));

      res.json(customers);
    } catch (error) {
      console.error('Get scanned customers error:', error);
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
      const { customerId, points, description } = req.body;
      const merchantId = req.user.id;

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

      // Check if merchant has enough points
      if (merchant.availablePoints < pointsAmount) {
        return res.status(400).json({ message: 'Insufficient points balance' });
      }

      // Get customer profile
      const customerProfile = await storage.getCustomerProfile(customerId);
      if (!customerProfile) {
        return res.status(404).json({ message: 'Customer not found' });
      }

      // Create point transaction
      const transaction = await storage.createPointTransaction({
        userId: customerProfile.userId,
        points: pointsAmount,
        transactionType: 'transfer_in',
        description: description,
        balanceBefore: customerProfile.currentPointsBalance,
        balanceAfter: customerProfile.currentPointsBalance + pointsAmount
      });

      // Update customer points
      await storage.updateCustomerProfile(customerProfile.userId, {
        currentPointsBalance: customerProfile.currentPointsBalance + pointsAmount,
        totalPointsEarned: customerProfile.totalPointsEarned + pointsAmount
      });

      // Update merchant available points
      await storage.updateMerchant(merchantId, {
        availablePoints: merchant.availablePoints - pointsAmount,
        totalPointsDistributed: merchant.totalPointsDistributed + pointsAmount
      });

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
      const merchantId = req.user.id;

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

      // Update customer profile
      await storage.updateCustomerProfile(customerProfile.userId, {
        currentPointsBalance: customerProfile.currentPointsBalance + pointsAmount,
        totalPointsEarned: customerProfile.totalPointsEarned + pointsAmount
      });

      // Update merchant available points
      await storage.updateMerchant(merchantId, {
        availablePoints: merchant.availablePoints - pointsAmount,
        totalPointsDistributed: merchant.totalPointsDistributed + pointsAmount
      });

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
      const merchantId = req.user.id;

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
        availablePoints: 1000, // Give merchant some initial points
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

  // ==================== MERCHANT QR SCANNING ====================
  
  // Scan customer QR code and create/retrieve customer profile
  app.post('/api/merchant/scan-customer', authenticateToken, async (req, res) => {
    try {
      const { qrCode } = req.body;
      const merchantId = req.user.id;

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

      // Check if customer already exists in merchant's customer list
      let merchantCustomer = await storage.getMerchantCustomer(merchantId, customerId);
      
      if (!merchantCustomer) {
        // Create customer in merchant's database
        merchantCustomer = await storage.createMerchantCustomer({
          merchantId,
          customerId: customerProfile.id,
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
        merchantCustomer = await storage.updateMerchantCustomer(merchantId, customerId, {
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
}