import type { Express, Request, Response } from "express";
import { storage } from "./storage";
import { insertPointDistributionSchema, insertChatMessageSchema, insertPointGenerationRequestSchema } from "@shared/schema";
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

export function setupAdminRoutes(app: Express) {
  // Clear all customer data
  app.post('/api/admin/clear-all-customers', authenticateToken, async (req, res) => {
    try {
      // Check if user is admin
      if (req.user.role !== 'admin' && req.user.role !== 'global_admin') {
        return res.status(403).json({ error: 'Admin access required' });
      }

      console.log('🗑️ Clearing all customer data...');
      
      // Clear all customer data
      await storage.clearAllCustomerData();
      
      console.log('✅ All customer data cleared successfully');
      
      res.json({
        success: true,
        message: 'All customer data has been cleared successfully'
      });
    } catch (error) {
      console.error('Error clearing customer data:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // Force clear database (alternative method)
  app.post('/api/admin/force-clear-database', authenticateToken, async (req, res) => {
    try {
      // Check if user is admin
      if (req.user.role !== 'admin' && req.user.role !== 'global_admin') {
        return res.status(403).json({ error: 'Admin access required' });
      }

      console.log('🗑️ FORCE clearing database...');
      
      // Force clear all data
      await storage.forceClearAllData();
      
      console.log('✅ Database force cleared successfully');
      
      res.json({
        success: true,
        message: 'Database has been force cleared successfully'
      });
    } catch (error) {
      console.error('Error force clearing database:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // Nuclear reset - complete wipe
  app.post('/api/admin/nuclear-reset', authenticateToken, async (req, res) => {
    try {
      // Check if user is admin
      if (req.user.role !== 'admin' && req.user.role !== 'global_admin') {
        return res.status(403).json({ error: 'Admin access required' });
      }

      console.log('💥 NUCLEAR RESET - Complete wipe...');
      
      // Nuclear clear all data
      await storage.nuclearClearAllData();
      
      console.log('✅ Nuclear reset completed successfully');
      
      res.json({
        success: true,
        message: 'Nuclear reset completed - all data wiped'
      });
    } catch (error) {
      console.error('Error nuclear reset:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // ========== Test Data Management ==========
  
  // Remove test customers only (for development)
  app.post('/api/admin/remove-test-customers', authenticateToken, authorizeRole(['global_admin']), async (req, res) => {
    try {
      await storage.removeTestCustomers();
      res.json({ success: true, message: "Test customers removed successfully" });
    } catch (error: any) {
      console.error("Error removing test customers:", error);
      res.status(500).json({ error: "Failed to remove test customers" });
    }
  });

  // ========== Global Admin Dashboard Analytics ==========
  
  // Global Admin Dashboard - Total Global Merchants
  app.get('/api/admin/global/merchants', authenticateToken, authorizeRole(['global_admin']), async (req, res) => {
    try {
      const { period = 'all' } = req.query;
      const merchants = await storage.getGlobalMerchants(period as string);
      res.json(merchants);
    } catch (error: any) {
      res.status(500).json({ message: error.message || 'Failed to fetch global merchants' });
    }
  });

  // Global Admin Dashboard - Total Global Customers
  app.get('/api/admin/global/customers', authenticateToken, authorizeRole(['global_admin']), async (req, res) => {
    try {
      const { period = 'all' } = req.query;
      const customers = await storage.getGlobalCustomers(period as string);
      res.json(customers);
    } catch (error: any) {
      res.status(500).json({ message: error.message || 'Failed to fetch global customers' });
    }
  });

  // Global Admin Dashboard - Reward Points Analytics
  app.get('/api/admin/global/reward-points', authenticateToken, authorizeRole(['global_admin']), async (req, res) => {
    try {
      const { period = 'all' } = req.query;
      const rewardPoints = await storage.getGlobalRewardPoints(period as string);
      res.json(rewardPoints);
    } catch (error: any) {
      res.status(500).json({ message: error.message || 'Failed to fetch reward points analytics' });
    }
  });

  // Global Admin Dashboard - Serial Numbers
  app.get('/api/admin/global/serial-numbers', authenticateToken, authorizeRole(['global_admin']), async (req, res) => {
    try {
      const { period = 'all' } = req.query;
      const serialNumbers = await storage.getGlobalSerialNumbers(period as string);
      res.json(serialNumbers);
    } catch (error: any) {
      res.status(500).json({ message: error.message || 'Failed to fetch serial numbers' });
    }
  });

  // Global Admin Dashboard - Withdrawal Analytics
  app.get('/api/admin/global/withdrawals', authenticateToken, authorizeRole(['global_admin']), async (req, res) => {
    try {
      const { period = 'all' } = req.query;
      const withdrawals = await storage.getGlobalWithdrawals(period as string);
      res.json(withdrawals);
    } catch (error: any) {
      res.status(500).json({ message: error.message || 'Failed to fetch withdrawal analytics' });
    }
  });

  // Global Admin Dashboard - VAT & Service Charge
  app.get('/api/admin/global/vat-service-charge', authenticateToken, authorizeRole(['global_admin']), async (req, res) => {
    try {
      const { period = 'all' } = req.query;
      const vatServiceCharge = await storage.getGlobalVATServiceCharge(period as string);
      res.json(vatServiceCharge);
    } catch (error: any) {
      res.status(500).json({ message: error.message || 'Failed to fetch VAT & service charge analytics' });
    }
  });

  // Global Admin - Commission & Percentage Settings
  app.get('/api/admin/global/commission-settings', authenticateToken, authorizeRole(['global_admin']), async (req, res) => {
    try {
      const settings = await storage.getCommissionSettings();
      res.json(settings);
    } catch (error: any) {
      res.status(500).json({ message: error.message || 'Failed to fetch commission settings' });
    }
  });

  app.post('/api/admin/global/commission-settings', authenticateToken, authorizeRole(['global_admin']), async (req, res) => {
    try {
      const { confirmPassword, ...settings } = req.body;
      
      // Verify password before saving
      const admin = await storage.getAdmin(req.user.userId);
      if (!admin || admin.password !== confirmPassword) {
        return res.status(400).json({ message: 'Invalid confirmation password' });
      }

      const updatedSettings = await storage.updateCommissionSettings(settings);
      res.json(updatedSettings);
    } catch (error: any) {
      res.status(500).json({ message: error.message || 'Failed to update commission settings' });
    }
  });

  // Global Admin - Direct Point Distribution to Local Admins
  app.post('/api/admin/global/distribute-points', authenticateToken, authorizeRole(['global_admin']), async (req, res) => {
    try {
      const { localAdminId, points, description, confirmPassword } = req.body;
      
      // Verify password
      const admin = await storage.getAdmin(req.user.userId);
      if (!admin || admin.password !== confirmPassword) {
        return res.status(400).json({ message: 'Invalid confirmation password' });
      }

      // Check if global admin has enough points
      if (admin.pointsBalance < points) {
        return res.status(400).json({ message: 'Insufficient points balance' });
      }

      // Distribute points
      const distribution = await storage.distributePointsToLocalAdmin({
        distributorId: req.user.userId,
        receiverId: localAdminId,
        points,
        description,
        type: 'global_to_local'
      });

      res.json(distribution);
    } catch (error: any) {
      res.status(500).json({ message: error.message || 'Failed to distribute points' });
    }
  });

  // ========== Local Admin Dashboard Analytics ==========
  
  // Local Admin Dashboard - Country-specific data
  app.get('/api/admin/local/dashboard', authenticateToken, authorizeRole(['local_admin']), async (req, res) => {
    try {
      const admin = await storage.getAdmin(req.user.userId);
      if (!admin) {
        return res.status(404).json({ message: 'Admin not found' });
      }

      const { period = 'all' } = req.query;
      const dashboardData = await storage.getLocalAdminDashboard(admin.country, period as string);
      res.json(dashboardData);
    } catch (error: any) {
      res.status(500).json({ message: error.message || 'Failed to fetch local admin dashboard' });
    }
  });

  // Local Admin Dashboard with country parameter (for dynamic country selection)
  app.get('/api/admin/local-dashboard/:country', authenticateToken, authorizeRole(['local_admin']), async (req, res) => {
    try {
      const { country } = req.params;
      const { period = 'all' } = req.query;
      
      // Get merchants and customers for this country
      const merchants = await storage.getMerchants(country);
      const customers = await storage.getCustomers(country);
      
      // Calculate active merchants and total customers
      const activeMerchants = merchants.filter(m => m.isActive).length;
      const totalCustomers = customers.length;
      
      // Basic dashboard data for the local admin
      const dashboardData = {
        country,
        merchants: {
          total: merchants.length,
          active: activeMerchants,
          regular: merchants.filter(m => !m.isEMerchant).length,
          eMerchant: merchants.filter(m => m.isEMerchant).length,
        },
        customers: {
          total: totalCustomers,
          active: customers.filter(c => c.isActive).length,
        },
        overview: {
          activeMerchants,
          totalCustomers,
          totalMerchants: merchants.length
        }
      };
      
      res.json(dashboardData);
    } catch (error: any) {
      res.status(500).json({ message: error.message || 'Failed to fetch local admin dashboard' });
    }
  });

  // Local Admin - Distribute Points to Merchants
  app.post('/api/admin/local/distribute-to-merchants', authenticateToken, authorizeRole(['local_admin']), async (req, res) => {
    try {
      const { merchantIds, points, description, confirmPassword } = req.body;
      
      // Verify password
      const admin = await storage.getAdmin(req.user.userId);
      const user = await storage.getUser(req.user.userId);
      if (!admin || !user) {
        return res.status(400).json({ message: 'Admin profile not found' });
      }
      
      // Verify password against user's password
      const passwordMatch = await bcrypt.compare(confirmPassword, user.password);
      if (!passwordMatch) {
        return res.status(400).json({ message: 'Invalid confirmation password' });
      }

      // Check if local admin has enough points
      if (admin.pointsBalance < points * merchantIds.length) {
        return res.status(400).json({ message: 'Insufficient points balance' });
      }

      // Distribute points to multiple merchants
      const distributions = await storage.distributePointsToMerchants({
        distributorId: req.user.userId,
        merchantIds,
        points,
        description,
        type: 'local_to_merchant'
      });

      res.json(distributions);
    } catch (error: any) {
      res.status(500).json({ message: error.message || 'Failed to distribute points to merchants' });
    }
  });

  // ========== Point Generation Requests (Local -> Global) ==========
  // Create a new request (Local Admin)
  app.post('/api/admin/point-generation-request', authenticateToken, authorizeRole(['local_admin']), async (req, res) => {
    try {
      const requester = await storage.getUser(req.user.userId);
      const data = insertPointGenerationRequestSchema.parse({
        requesterId: req.user.userId,
        requesterCountry: requester?.country,
        pointsRequested: req.body.pointsRequested,
        reason: req.body.reason,
        status: 'pending'
      });
      const request = await storage.createPointGenerationRequest(data);
      res.json(request);
    } catch (error: any) {
      res.status(400).json({ message: error.message || 'Failed to create request' });
    }
  });

  // List own requests (Local Admin)
  app.get('/api/admin/point-generation-requests', authenticateToken, authorizeRole(['local_admin']), async (req, res) => {
    try {
      const list = await storage.getPointGenerationRequests({ requesterId: req.user.userId });
      res.json(list);
    } catch (error: any) {
      res.status(500).json({ message: error.message || 'Failed to fetch requests' });
    }
  });

  // Pending requests (Global Admin)
  app.get('/api/admin/pending-point-requests', authenticateToken, authorizeRole(['global_admin']), async (_req, res) => {
    try {
      const list = await storage.getPointGenerationRequests({ status: 'pending' });
      res.json(list);
    } catch (error: any) {
      res.status(500).json({ message: error.message || 'Failed to fetch pending requests' });
    }
  });

  // All requests (Global Admin)
  app.get('/api/admin/all-point-requests', authenticateToken, authorizeRole(['global_admin']), async (_req, res) => {
    try {
      const list = await storage.getPointGenerationRequests();
      res.json(list);
    } catch (error: any) {
      res.status(500).json({ message: error.message || 'Failed to fetch requests' });
    }
  });

  // Approve request (Global Admin)
  app.post('/api/admin/approve-point-request/:id', authenticateToken, authorizeRole(['global_admin']), async (req, res) => {
    try {
      const request = await storage.getPointGenerationRequest(req.params.id);
      if (!request || request.status !== 'pending') {
        return res.status(400).json({ message: 'Invalid request' });
      }
      // Ensure the global admin has enough balance to fulfill the request
      const globalAdmin = await storage.getAdmin(req.user.userId);
      if (!globalAdmin || (globalAdmin.pointsBalance || 0) < request.pointsRequested) {
        return res.status(400).json({ message: 'Insufficient global admin balance' });
      }
      // Update request
      const updated = await storage.updatePointGenerationRequest(request.id, {
        status: 'approved',
        reviewedBy: req.user.userId,
        reviewedAt: new Date()
      });
      // Debit global admin balance and increment distribution stats
      const debited = await storage.updateAdmin(req.user.userId, {
        pointsBalance: (globalAdmin.pointsBalance || 0) - request.pointsRequested,
        totalPointsDistributed: (globalAdmin.totalPointsDistributed || 0) + request.pointsRequested
      });
      const newGlobalBalance = (debited.pointsBalance || ((globalAdmin.pointsBalance || 0) - request.pointsRequested));

      // Credit local admin
      const receiver = await storage.getAdmin(request.requesterId);
      if (!receiver) {
        await storage.createAdmin({ userId: request.requesterId, adminType: 'local', country: request.requesterCountry || 'Unknown', pointsBalance: 0, totalPointsReceived: 0, totalPointsDistributed: 0, isActive: true });
      }
      const receiverAdmin = await storage.getAdmin(request.requesterId);
      await storage.updateAdmin(request.requesterId, {
        pointsBalance: (receiverAdmin?.pointsBalance || 0) + request.pointsRequested,
        totalPointsReceived: (receiverAdmin?.totalPointsReceived || 0) + request.pointsRequested
      });
      // Log distribution from global to local
      await storage.createPointDistribution({
        fromUserId: req.user.userId,
        toUserId: request.requesterId,
        points: request.pointsRequested,
        description: request.reason || 'Approved point generation request',
        distributionType: 'admin_to_admin',
        status: 'completed'
      });

      // Real-time Socket.IO updates
      const io = (global as any).socketIO;
      if (io) {
        // Emit balance update to global admin
        io.to(req.user.userId).emit('balanceUpdate', {
          type: 'global_admin_balance',
          newBalance: newGlobalBalance,
          change: -request.pointsRequested,
          reason: 'Point request approved',
          timestamp: new Date().toISOString()
        });

        // Emit balance update to local admin
        io.to(request.requesterId).emit('balanceUpdate', {
          type: 'local_admin_balance',
          newBalance: (receiverAdmin?.pointsBalance || 0) + request.pointsRequested,
          change: request.pointsRequested,
          reason: 'Point request approved',
          timestamp: new Date().toISOString()
        });

        // Emit request status update to local admin
        io.to(request.requesterId).emit('requestStatusUpdate', {
          requestId: request.id,
          status: 'approved',
          points: request.pointsRequested,
          approvedBy: req.user.userId,
          timestamp: new Date().toISOString()
        });

        // Emit notification to local admin
        io.to(request.requesterId).emit('notification', {
          type: 'success',
          title: 'Point Request Approved',
          message: `Your request for ${request.pointsRequested.toLocaleString()} points has been approved!`,
          timestamp: new Date().toISOString()
        });
      }

      res.json({ ...updated, newGlobalBalance });
    } catch (error: any) {
      res.status(500).json({ message: error.message || 'Failed to approve request' });
    }
  });

  // Reject request (Global Admin)
  app.post('/api/admin/reject-point-request/:id', authenticateToken, authorizeRole(['global_admin']), async (req, res) => {
    try {
      const request = await storage.getPointGenerationRequest(req.params.id);
      if (!request || request.status !== 'pending') {
        return res.status(400).json({ message: 'Invalid request' });
      }
      const updated = await storage.updatePointGenerationRequest(request.id, {
        status: 'rejected',
        reviewedBy: req.user.userId,
        reviewedAt: new Date()
      });

      // Real-time Socket.IO updates
      const io = (global as any).socketIO;
      if (io) {
        // Emit request status update to local admin
        io.to(request.requesterId).emit('requestStatusUpdate', {
          requestId: request.id,
          status: 'rejected',
          points: request.pointsRequested,
          rejectedBy: req.user.userId,
          timestamp: new Date().toISOString()
        });

        // Emit notification to local admin
        io.to(request.requesterId).emit('notification', {
          type: 'error',
          title: 'Point Request Rejected',
          message: `Your request for ${request.pointsRequested.toLocaleString()} points has been rejected.`,
          timestamp: new Date().toISOString()
        });
      }

      res.json(updated);
    } catch (error: any) {
      res.status(500).json({ message: error.message || 'Failed to reject request' });
    }
  });
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
        console.log(`🔍 Found merchant for userId ${toUserId}:`, merchant ? `ID: ${merchant.id}, Current balance: ${merchant.loyaltyPointsBalance || 0}` : 'NOT FOUND');
        
        if (merchant) {
          const newLoyaltyBalance = (merchant.loyaltyPointsBalance || 0) + points;
          const newAvailablePoints = (merchant.availablePoints || 0) + points;
          
          console.log(`💰 Updating merchant ${toUserId}:`);
          console.log(`   - Previous loyalty balance: ${merchant.loyaltyPointsBalance || 0}`);
          console.log(`   - Adding points: ${points}`);
          console.log(`   - New loyalty balance: ${newLoyaltyBalance}`);
          console.log(`   - New available points: ${newAvailablePoints}`);
          
          // Update merchant profile
          await storage.updateMerchant(toUserId, {
            // Keep both fields in sync so all endpoints/UIS reflect correctly
            loyaltyPointsBalance: newLoyaltyBalance,
            availablePoints: newAvailablePoints,
            totalPointsPurchased: (merchant.totalPointsPurchased || 0) + points
          });
          
          // CRITICAL FIX: Also update merchant wallet rewardPointBalance
          const wallet = await storage.getMerchantWallet(merchant.id);
          if (wallet) {
            const newWalletBalance = wallet.rewardPointBalance + points;
            await storage.updateMerchantWallet(merchant.id, {
              rewardPointBalance: newWalletBalance
            });
            console.log(`✅ Updated merchant wallet: ${wallet.rewardPointBalance} → ${newWalletBalance}`);
          } else {
            console.log(`⚠️ Warning: Merchant wallet not found for ${merchant.id}`);
          }
          
          // Verify the update worked
          const updatedMerchant = await storage.getMerchantByUserId(toUserId);
          console.log(`✅ Verification - Updated merchant balance: ${updatedMerchant?.loyaltyPointsBalance || 0}`);
        } else {
          console.log(`❌ ERROR: Merchant not found for userId: ${toUserId}`);
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
        const messages = await storage.getChatMessages(userId);
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
      // Prevent caching to ensure fresh data
      res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');
      res.setHeader('ETag', `admins-${Date.now()}`);
      
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

  // Get merchants by country (for local admin)
  app.get('/api/admin/merchants/:country', async (req, res) => {
    try {
      const { country } = req.params;
      const authHeader = req.headers.authorization;
      
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ message: 'No token provided' });
      }

      const token = authHeader.substring(7);
      const decoded = jwt.verify(token, JWT_SECRET) as any;
      
      console.log(`Fetching merchants for country: ${country}, requested by: ${decoded.email}`);
      
      // Get all merchant users for this country
      const merchantUsers = await storage.getUsersByRole('merchant');
      const countryMerchants = merchantUsers.filter(user => user.country === country);
      
      console.log(`Found ${countryMerchants.length} merchant users in ${country}:`, countryMerchants.map(u => u.email));
      
      // Get merchant profiles for these users, create if missing
      const merchantsData = await Promise.all(countryMerchants.map(async (user) => {
        let merchant = await storage.getMerchantByUserId(user.id);
        
        // Create merchant profile if it doesn't exist
        if (!merchant) {
          console.log(`Creating merchant profile for user: ${user.email}`);
          merchant = await storage.createMerchant({
            userId: user.id,
            businessName: `${user.firstName}'s Store`,
            businessType: 'retail',
            tier: 'bronze',
            isActive: true
          });
        }
        
        return {
          ...merchant,
          user: {
            firstName: user.firstName,
            lastName: user.lastName,
            email: user.email,
            country: user.country,
            isActive: user.isActive
          }
        };
      }));
      
      console.log(`Returning ${merchantsData.length} merchants for ${country}`);
      res.json(merchantsData);
    } catch (error) {
      console.error('Get merchants by country error:', error);
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
      const userId = req.user.userId || req.user.id;
      
      // Get admin data for balance info
      const adminData = await storage.getAdmin(userId);
      
      // Get point distributions where this admin is involved
      const distributions = await storage.getPointDistributions();
      const userDistributions = distributions.filter(d => 
        d.fromUserId === userId || d.toUserId === userId || d.fromUserId === 'system'
      );
      
      // Convert distributions to transaction format
      const transactionHistory = userDistributions.map(dist => ({
        id: dist.id,
        type: dist.fromUserId === 'system' ? 'credit' : dist.toUserId === userId ? 'credit' : 'debit',
        amount: dist.points,
        description: dist.description,
        createdAt: dist.createdAt,
        status: dist.status,
        distributionType: dist.distributionType,
        balanceAfter: dist.toUserId === userId ? adminData?.pointsBalance : undefined
      })).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      
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
      // Prevent any HTTP caching so balances always reflect latest state
      res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');
      // Bust conditional requests by changing ETag each response
      res.setHeader('ETag', `bal-${Date.now()}`);
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

  // Clear all customer profiles (Global Admin only - for development/testing)
  app.post('/api/admin/clear-customers', authenticateToken, authorizeRole(['global_admin']), async (req, res) => {
    try {
      console.log('🗑️ Global admin requested to clear all customer profiles');
      await storage.clearAllCustomers();
      
      res.json({
        success: true,
        message: 'All customer profiles and related data have been cleared successfully'
      });
    } catch (error) {
      console.error('Clear customers error:', error);
      res.status(500).json({ 
        success: false,
        message: 'Failed to clear customer profiles',
        error: error.message 
      });
    }
  });

  // ========== GLOBAL ADMIN REWARDS (from Infinity Cycles) ==========
  
  // Get Global Admin rewards from Infinity cycles
  app.get('/api/admin/global/infinity-rewards', authenticateToken, authorizeRole(['global_admin']), async (req, res) => {
    try {
      const rewards = await storage.getGlobalAdminRewards();
      const totalRewards = await storage.getGlobalAdminRewardTotal();
      
      res.json({
        rewards,
        totalRewards,
        count: rewards.length
      });
    } catch (error: any) {
      console.error('Error fetching Global Admin rewards:', error);
      res.status(500).json({ 
        success: false,
        message: 'Failed to fetch Global Admin rewards',
        error: error.message 
      });
    }
  });

  // Get Global Admin reward total
  app.get('/api/admin/global/infinity-rewards/total', authenticateToken, authorizeRole(['global_admin']), async (req, res) => {
    try {
      const totalRewards = await storage.getGlobalAdminRewardTotal();
      
      res.json({
        totalRewards
      });
    } catch (error: any) {
      console.error('Error fetching Global Admin reward total:', error);
      res.status(500).json({ 
        success: false,
        message: 'Failed to fetch Global Admin reward total',
        error: error.message 
      });
    }
  });

  // Get all shopping vouchers (Global Admin view)
  app.get('/api/admin/global/shopping-vouchers', authenticateToken, authorizeRole(['global_admin']), async (req, res) => {
    try {
      // Get all customers and their vouchers
      const customers = await storage.getCustomers();
      const vouchersByCustomer = await Promise.all(
        customers.map(async (customer) => ({
          customerId: customer.id,
          customerName: customer.userId,
          vouchers: await storage.getCustomerShoppingVouchers(customer.id)
        }))
      );
      
      const allVouchers = vouchersByCustomer.flatMap(c => c.vouchers.map(v => ({
        ...v,
        customerName: c.customerName
      })));
      
      const totalVoucherValue = allVouchers
        .filter(v => v.status === 'active')
        .reduce((sum, v) => sum + v.voucherValue, 0);
      
      res.json({
        vouchers: allVouchers,
        totalVoucherValue,
        totalVouchers: allVouchers.length,
        activeVouchers: allVouchers.filter(v => v.status === 'active').length,
        usedVouchers: allVouchers.filter(v => v.status === 'used').length,
        expiredVouchers: allVouchers.filter(v => v.status === 'expired').length
      });
    } catch (error: any) {
      console.error('Error fetching shopping vouchers:', error);
      res.status(500).json({ 
        success: false,
        message: 'Failed to fetch shopping vouchers',
        error: error.message 
      });
    }
  });
}