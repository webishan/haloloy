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
        const messages = await storage.getChatMessages(userId, partnerId as string);
        res.json(messages);
      } else {
        // Get all messages for the merchant
        const messages = await storage.getAllChatMessages(userId);
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

  // Get merchant's customers for chat
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
}