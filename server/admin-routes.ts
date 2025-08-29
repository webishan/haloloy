import type { Express, Request, Response } from "express";
import { storage } from "./storage";
import { insertPointDistributionSchema, insertChatMessageSchema } from "@shared/schema";
import jwt from "jsonwebtoken";

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

export function setupAdminRoutes(app: Express) {
  // Only global admins can manually add points to their own balance
  app.post('/api/admin/add-points', authenticateToken, authorizeRole(['global_admin']), async (req, res) => {
    try {
      const { points, description } = req.body;
      
      if (!points || points <= 0) {
        return res.status(400).json({ message: 'Invalid points amount' });
      }
      
      const globalAdminId = req.user.userId;
      let globalAdmin = await storage.getAdmin(globalAdminId);
      
      if (!globalAdmin) {
        // Create admin record if it doesn't exist
        globalAdmin = await storage.createAdmin({
          userId: globalAdminId,
          adminType: 'global',
          country: 'Global',
          pointsBalance: 0,
          totalPointsReceived: 0,
          totalPointsDistributed: 0,
          isActive: true
        });
      }
      
      // Update global admin's points balance
      const updatedAdmin = await storage.updateAdmin(globalAdminId, {
        pointsBalance: (globalAdmin.pointsBalance || 0) + points,
        totalPointsReceived: (globalAdmin.totalPointsReceived || 0) + points
      });
      
      // Create a record of manual point addition
      await storage.createPointDistribution({
        fromUserId: 'system',
        toUserId: globalAdminId,
        points,
        description: description || 'Manual points addition by global admin',
        distributionType: 'manual_addition',
        toUserType: 'global_admin',
        status: 'completed'
      });
      
      res.json({
        message: 'Points added successfully',
        newBalance: updatedAdmin.pointsBalance || (globalAdmin.pointsBalance || 0) + points
      });
      
    } catch (error) {
      console.error('Add points error:', error);
      res.status(500).json({ message: 'Failed to add points' });
    }
  });

  // Comprehensive dashboard with analytics
  app.get('/api/admin/dashboard', authenticateToken, authorizeRole(['global_admin', 'local_admin']), async (req, res) => {
    try {
      const user = await storage.getUser(req.user.userId);
      const isGlobal = req.user.role === 'global_admin';
      
      // Get data based on admin scope
      const merchants = await storage.getMerchants(isGlobal ? undefined : user?.country);
      const customers = await storage.getCustomers(isGlobal ? undefined : user?.country);
      const pointDistributions = await storage.getPointDistributions();
      const orders = await storage.getOrders();
      
      // Calculate merchant tier distribution
      const merchantTiers = merchants.reduce((acc, merchant) => {
        const tier = merchant.tier || 'Star';
        acc[tier] = (acc[tier] || 0) + 1;
        return acc;
      }, {
        Star: 0,
        DoubleStar: 0,
        TripleStar: 0,
        Executive: 0
      });
      
      // Calculate financial metrics
      const totalSales = orders.reduce((sum, order) => sum + parseFloat(order.totalAmount || '0'), 0);
      const totalPointsDistributed = pointDistributions.reduce((sum, dist) => sum + dist.points, 0);
      
      // Customer analytics
      const customersByTier = customers.reduce((acc, customer) => {
        const tier = customer.currentTier || 'Bronze';
        acc[tier] = (acc[tier] || 0) + 1;
        return acc;
      }, {
        Bronze: 0,
        Silver: 0,
        Gold: 0,
        Platinum: 0,
        Diamond: 0
      });
      
      // Top customers by points
      const topCustomers = customers
        .sort((a, b) => (b.totalPoints || 0) - (a.totalPoints || 0))
        .slice(0, 10)
        .map(customer => ({
          id: customer.id,
          name: `Customer ${customer.userId.slice(0, 8)}`,
          points: customer.totalPoints || 0,
          tier: customer.currentTier || 'Bronze'
        }));
      
      // Recent activity (last 30 days)
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const recentDistributions = pointDistributions
        .filter(dist => new Date(dist.createdAt) > thirtyDaysAgo)
        .slice(0, 10);
      
      // Point distribution breakdown
      const pointBreakdown = {
        toLocalAdmins: pointDistributions
          .filter(d => d.distributionType === 'admin_to_admin')
          .reduce((sum, d) => sum + d.points, 0),
        toMerchants: pointDistributions
          .filter(d => d.distributionType === 'admin_to_merchant')
          .reduce((sum, d) => sum + d.points, 0),
        toCustomers: pointDistributions
          .filter(d => d.distributionType === 'merchant_to_customer')
          .reduce((sum, d) => sum + d.points, 0)
      };
      
      // Growth calculations
      const lastMonthMerchants = merchants.filter(m => {
        const created = new Date(m.createdAt);
        return created > thirtyDaysAgo;
      }).length;
      
      const lastMonthCustomers = customers.filter(c => {
        const created = new Date(c.createdAt);
        return created > thirtyDaysAgo;
      }).length;
      
      // Get current admin's points balance
      const currentAdmin = await storage.getAdmin(req.user.userId);
      const adminPointsBalance = currentAdmin?.pointsBalance || 0;

      const dashboardData = {
        overview: {
          totalMerchants: merchants.length,
          totalCustomers: customers.length,
          totalSales: totalSales.toFixed(2),
          totalPointsDistributed,
          activeMerchants: merchants.filter(m => m.isActive).length,
          newMerchantsThisMonth: lastMonthMerchants,
          newCustomersThisMonth: lastMonthCustomers,
          globalPointsBalance: isGlobal ? adminPointsBalance : undefined,
          localPointsBalance: !isGlobal ? adminPointsBalance : undefined
        },
        
        merchantAnalytics: {
          byTier: merchantTiers,
          totalActive: merchants.filter(m => m.isActive).length,
          totalInactive: merchants.filter(m => !m.isActive).length,
          averagePointsBalance: merchants.length > 0 
            ? (merchants.reduce((sum, m) => sum + (m.loyaltyPointsBalance || 0), 0) / merchants.length).toFixed(0)
            : '0'
        },
        
        customerAnalytics: {
          byTier: customersByTier,
          topCustomers,
          totalActivePoints: customers.reduce((sum, c) => sum + (c.totalPoints || 0), 0),
          averagePointsPerCustomer: customers.length > 0
            ? (customers.reduce((sum, c) => sum + (c.totalPoints || 0), 0) / customers.length).toFixed(0)
            : '0'
        },
        
        financialMetrics: {
          totalSales: totalSales.toFixed(2),
          averageOrderValue: orders.length > 0 ? (totalSales / orders.length).toFixed(2) : '0.00',
          totalOrders: orders.length,
          pointsBreakdown: pointBreakdown
        },
        
        recentActivity: {
          recentDistributions: recentDistributions.map(dist => ({
            id: dist.id,
            points: dist.points,
            description: dist.description,
            type: dist.distributionType,
            createdAt: dist.createdAt
          })),
          recentOrdersCount: orders.filter(o => new Date(o.createdAt) > thirtyDaysAgo).length
        },
        
        countrySpecific: isGlobal ? null : {
          country: user?.country,
          localMerchants: merchants.length,
          localCustomers: customers.length,
          localSales: totalSales.toFixed(2)
        }
      };
      
      res.json(dashboardData);
      
    } catch (error) {
      console.error('Dashboard error:', error);
      res.status(500).json({ message: 'Failed to load dashboard data' });
    }
  });

  // Enhanced point distribution with proper hierarchy
  app.post('/api/admin/distribute-points', authenticateToken, authorizeRole(['global_admin', 'local_admin']), async (req, res) => {
    try {
      const { toUserId, points, description } = req.body;
      
      if (!toUserId || !points || points <= 0) {
        return res.status(400).json({ message: 'Invalid distribution data' });
      }
      
      const distributorRole = req.user.role;
      const distributorId = req.user.userId;
      
      // Determine distribution type and validate hierarchy
      let distributionType: string;
      let toUserType: string;
      
      if (distributorRole === 'global_admin') {
        // Global admin can distribute to local admins
        console.log('Distribution attempt - toUserId:', toUserId);
        const toUser = await storage.getUser(toUserId);
        console.log('Found user:', toUser ? `${toUser.email} (${toUser.role})` : 'null');
        
        if (!toUser) {
          return res.status(400).json({ message: 'Target user not found' });
        }
        
        // Check if user has local_admin role OR is in our test local admin users
        const isLocalAdmin = toUser.role === 'local_admin' || 
                           ['local-bd-user', 'local-my-user', 'local-ae-user', 'local-ph-user'].includes(toUserId);
        
        if (!isLocalAdmin) {
          return res.status(400).json({ message: 'Global admin can only distribute to local admins' });
        }
        
        distributionType = 'admin_to_admin';
        toUserType = 'local_admin';
      } else if (distributorRole === 'local_admin') {
        // Local admin can distribute to merchants in their country
        const distributorUser = await storage.getUser(distributorId);
        const toUser = await storage.getUser(toUserId);
        
        if (!toUser || toUser.role !== 'merchant') {
          return res.status(400).json({ message: 'Local admin can only distribute to merchants' });
        }
        
        if (distributorUser?.country !== toUser.country) {
          return res.status(400).json({ message: 'Can only distribute to merchants in your country' });
        }
        
        distributionType = 'admin_to_merchant';
        toUserType = 'merchant';
      } else {
        return res.status(403).json({ message: 'Unauthorized distribution' });
      }
      
      // Check distributor's point balance
      const distributorAdmin = await storage.getAdmin(distributorId);
      if (!distributorAdmin || (distributorAdmin.pointsBalance || 0) < points) {
        return res.status(400).json({ message: 'Insufficient points balance' });
      }
      
      // Create distribution record
      const distributionData = {
        fromUserId: distributorId,
        toUserId,
        points,
        description,
        distributionType,
        toUserType,
        status: 'completed'
      };
      
      const distribution = await storage.createPointDistribution(distributionData);
      
      // Update distributor's balance
      await storage.updateAdmin(distributorId, {
        pointsBalance: (distributorAdmin.pointsBalance || 0) - points,
        totalPointsDistributed: (distributorAdmin.totalPointsDistributed || 0) + points
      });
      
      // Update recipient's balance
      if (toUserType === 'local_admin') {
        let receiverAdmin = await storage.getAdmin(toUserId);
        if (!receiverAdmin) {
          // Create local admin record if it doesn't exist
          const toUser = await storage.getUser(toUserId);
          receiverAdmin = await storage.createAdmin({
            userId: toUserId,
            adminType: 'local',
            country: toUser?.country || 'Unknown',
            pointsBalance: 0,
            totalPointsReceived: 0,
            totalPointsDistributed: 0,
            isActive: true
          });
        }
        
        await storage.updateAdmin(toUserId, {
          pointsBalance: (receiverAdmin.pointsBalance || 0) + points,
          totalPointsReceived: (receiverAdmin.totalPointsReceived || 0) + points
        });
      } else if (toUserType === 'merchant') {
        const merchant = await storage.getMerchantByUserId(toUserId);
        if (merchant) {
          await storage.updateMerchant(toUserId, {
            loyaltyPointsBalance: (merchant.loyaltyPointsBalance || 0) + points
          });
        }
      }
      
      res.json({
        message: 'Points distributed successfully',
        distribution,
        remainingBalance: (distributorAdmin.pointsBalance || 0) - points
      });
      
    } catch (error) {
      console.error('Point distribution error:', error);
      res.status(500).json({ message: 'Failed to distribute points' });
    }
  });

  // Enhanced chat system with message history
  app.get('/api/admin/chat-messages', authenticateToken, authorizeRole(['global_admin', 'local_admin']), async (req, res) => {
    try {
      const { partnerId } = req.query;
      const userId = req.user.userId;
      
      if (partnerId) {
        // Get messages between two specific users
        const messages = await storage.getChatMessages(userId, partnerId as string);
        res.json(messages);
      } else {
        // Get all messages for the current user
        const messages = await storage.getAllChatMessages(userId);
        res.json(messages);
      }
    } catch (error) {
      console.error('Get chat messages error:', error);
      res.status(500).json({ message: 'Failed to fetch messages' });
    }
  });

  // Send message endpoint
  app.post('/api/admin/send-message', authenticateToken, authorizeRole(['global_admin', 'local_admin']), async (req, res) => {
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
      console.error('Send message error:', error);
      res.status(500).json({ message: 'Failed to send message' });
    }
  });

  // Get chat users (potential message recipients)
  app.get('/api/admin/chat-users', authenticateToken, authorizeRole(['global_admin', 'local_admin']), async (req, res) => {
    try {
      const currentUserId = req.user.userId;
      const currentUser = await storage.getUser(currentUserId);
      
      let availableUsers: any[] = [];
      
      if (req.user.role === 'global_admin') {
        // Global admin can chat with local admins
        const localAdmins = await storage.getAdminsByType('local');
        availableUsers = await Promise.all(localAdmins.map(async (admin) => {
          const user = await storage.getUser(admin.userId);
          return user ? { ...user, adminType: 'local_admin' } : null;
        }));
        availableUsers = availableUsers.filter(Boolean);
      } else if (req.user.role === 'local_admin') {
        // Local admin can chat with global admins and merchants in their country
        const globalAdmins = await storage.getAdminsByType('global');
        const globalUsers = await Promise.all(globalAdmins.map(async (admin) => {
          const user = await storage.getUser(admin.userId);
          return user ? { ...user, adminType: 'global_admin' } : null;
        }));
        
        const merchants = await storage.getMerchants(currentUser?.country);
        const merchantUsers = await Promise.all(merchants.map(async (merchant) => {
          const user = await storage.getUser(merchant.userId);
          return user ? { ...user, businessName: merchant.businessName } : null;
        }));
        
        availableUsers = [
          ...globalUsers.filter(Boolean),
          ...merchantUsers.filter(Boolean)
        ];
      }
      
      // Remove current user from the list
      availableUsers = availableUsers.filter(user => user.id !== currentUserId);
      
      res.json(availableUsers);
      
    } catch (error) {
      console.error('Get chat users error:', error);
      res.status(500).json({ message: 'Failed to fetch chat users' });
    }
  });

  // Get admins list (for global admin)
  app.get('/api/admin/admins', authenticateToken, authorizeRole(['global_admin']), async (req, res) => {
    try {
      // Get local admin users directly from users table since admin records may not exist yet
      const localAdminUsers = await storage.getUsersByRole('local_admin');
      
      const adminsData = localAdminUsers.map(user => ({
        id: user.id,
        userId: user.id, // Use user.id as userId for consistency
        user: {
          firstName: user.firstName,
          lastName: user.lastName,
          email: user.email,
          country: user.country,
          isActive: user.isActive
        },
        adminType: 'local',
        country: user.country,
        role: user.role
      }));
      
      console.log('Returning local admins:', adminsData.map(a => `${a.id} - ${a.user.email}`));
      res.json(adminsData);
    } catch (error) {
      console.error('Get admins error:', error);
      res.status(500).json({ message: 'Failed to fetch admins' });
    }
  });

  // Get merchants list
  app.get('/api/admin/merchants', authenticateToken, authorizeRole(['global_admin', 'local_admin']), async (req, res) => {
    try {
      const currentUser = await storage.getUser(req.user.userId);
      const merchants = await storage.getMerchants(
        req.user.role === 'local_admin' ? currentUser?.country : undefined
      );
      
      // Enhance with user details
      const enhancedMerchants = await Promise.all(merchants.map(async (merchant) => {
        const user = await storage.getUser(merchant.userId);
        return {
          ...merchant,
          user: user ? { 
            firstName: user.firstName, 
            lastName: user.lastName, 
            email: user.email,
            country: user.country,
            isActive: user.isActive 
          } : null
        };
      }));
      
      res.json(enhancedMerchants);
    } catch (error) {
      console.error('Get merchants error:', error);
      res.status(500).json({ message: 'Failed to fetch merchants' });
    }
  });

  // Get point distributions with enhanced details
  app.get('/api/admin/point-distributions', authenticateToken, authorizeRole(['global_admin', 'local_admin']), async (req, res) => {
    try {
      const distributions = await storage.getPointDistributions(req.user.userId);
      
      // Enhance with user details
      const enhancedDistributions = await Promise.all(distributions.map(async (dist) => {
        const fromUser = await storage.getUser(dist.fromUserId);
        const toUser = await storage.getUser(dist.toUserId);
        
        return {
          ...dist,
          fromUserName: fromUser ? `${fromUser.firstName} ${fromUser.lastName}` : 'Unknown',
          toUserName: toUser ? `${toUser.firstName} ${toUser.lastName}` : 'Unknown',
          fromUserEmail: fromUser?.email,
          toUserEmail: toUser?.email
        };
      }));
      
      res.json(enhancedDistributions);
    } catch (error) {
      console.error('Get point distributions error:', error);
      res.status(500).json({ message: 'Failed to fetch point distributions' });
    }
  });

  // Get transaction history for admin
  app.get('/api/admin/transactions', authenticateToken, authorizeRole(['global_admin', 'local_admin']), async (req, res) => {
    try {
      const userId = req.user.userId;
      
      // Get admin data for balance info
      const adminData = await storage.getAdmin(userId);
      
      // For now, return empty transactions until we implement getPointDistributionsByUser
      const transactionHistory: any[] = [];
      
      res.json({
        transactions: transactionHistory,
        currentBalance: adminData?.pointsBalance || 0,
        totalReceived: adminData?.totalPointsReceived || 0,
        totalDistributed: adminData?.totalPointsDistributed || 0
      });
      
    } catch (error) {
      console.error('Transaction history error:', error);
      res.status(500).json({ message: 'Failed to load transaction history' });
    }
  });

  // Get real-time admin balance
  app.get('/api/admin/balance', authenticateToken, authorizeRole(['global_admin', 'local_admin']), async (req, res) => {
    try {
      const userId = req.user.userId;
      const adminData = await storage.getAdmin(userId);
      
      if (!adminData) {
        // Create admin record if it doesn't exist
        const user = await storage.getUser(userId);
        const newAdmin = await storage.createAdmin({
          userId,
          adminType: req.user.role === 'global_admin' ? 'global' : 'local',
          country: user?.country || 'Global',
          pointsBalance: 0,
          totalPointsReceived: 0,
          totalPointsDistributed: 0,
          isActive: true
        });
        
        return res.json({
          balance: 0,
          totalReceived: 0,
          totalDistributed: 0
        });
      }
      
      res.json({
        balance: adminData.pointsBalance || 0,
        totalReceived: adminData.totalPointsReceived || 0,
        totalDistributed: adminData.totalPointsDistributed || 0
      });
      
    } catch (error) {
      console.error('Balance error:', error);
      res.status(500).json({ message: 'Failed to load balance' });
    }
  });
}