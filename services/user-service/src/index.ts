import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import { body, validationResult } from 'express-validator';
import winston from 'winston';
import dotenv from 'dotenv';
import multer from 'multer';
import { db } from './database';
import { 
  customers, 
  merchants, 
  admins, 
  customerProfiles, 
  customerWallets, 
  merchantWallets, 
  userPreferences, 
  userActivity 
} from './schema';
import { eq, and, desc, like, or } from 'drizzle-orm';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3002;

// Logger configuration
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({ filename: 'logs/error.log', level: 'error' }),
    new winston.transports.File({ filename: 'logs/combined.log' })
  ]
});

// Multer configuration for file uploads
const storage = multer.memoryStorage();
const upload = multer({ 
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'));
    }
  }
});

// Middleware
app.use(helmet());
app.use(compression());
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Request logging middleware
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    logger.info({
      method: req.method,
      url: req.url,
      status: res.statusCode,
      duration: `${duration}ms`,
      ip: req.ip
    });
  });
  next();
});

// Authentication middleware
const authenticateToken = (req: any, res: any, next: any) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ message: 'Access token required' });
  }

  try {
    const jwt = require('jsonwebtoken');
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'komarce-secret-key');
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(403).json({ message: 'Invalid or expired token' });
  }
};

// Role-based authorization middleware
const authorizeRole = (roles: string[]) => {
  return (req: any, res: any, next: any) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ message: 'Insufficient permissions' });
    }
    next();
  };
};

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'user-service',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// Utility function to log user activity
const logUserActivity = async (userId: string, activityType: string, activityData: any, req: any) => {
  try {
    await db.insert(userActivity).values({
      userId,
      activityType,
      activityData,
      ipAddress: req.ip,
      userAgent: req.get('User-Agent')
    });
  } catch (error) {
    logger.error('Failed to log user activity:', error);
  }
};

// Routes

// Get user profile
app.get('/api/users/profile', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const userRole = req.user.role;

    let profile = null;
    let wallet = null;

    if (userRole === 'customer') {
      // Get customer profile
      const [customer] = await db.select().from(customers).where(eq(customers.userId, userId)).limit(1);
      if (customer) {
        profile = customer;
        
        // Get customer wallet
        const [customerWallet] = await db.select().from(customerWallets).where(eq(customerWallets.customerId, customer.id)).limit(1);
        wallet = customerWallet;
      }
    } else if (userRole === 'merchant') {
      // Get merchant profile
      const [merchant] = await db.select().from(merchants).where(eq(merchants.userId, userId)).limit(1);
      if (merchant) {
        profile = merchant;
        
        // Get merchant wallet
        const [merchantWallet] = await db.select().from(merchantWallets).where(eq(merchantWallets.merchantId, merchant.id)).limit(1);
        wallet = merchantWallet;
      }
    } else if (userRole === 'admin' || userRole === 'global_admin' || userRole === 'local_admin') {
      // Get admin profile
      const [admin] = await db.select().from(admins).where(eq(admins.userId, userId)).limit(1);
      profile = admin;
    }

    // Get user preferences
    const [preferences] = await db.select().from(userPreferences).where(eq(userPreferences.userId, userId)).limit(1);

    res.json({
      profile,
      wallet,
      preferences
    });

  } catch (error) {
    logger.error('Get user profile error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Update user profile
app.put('/api/users/profile', authenticateToken, [
  body('firstName').optional().trim().isLength({ min: 2, max: 50 }),
  body('lastName').optional().trim().isLength({ min: 2, max: 50 }),
  body('phone').optional().isMobilePhone(),
  body('address').optional().trim().isLength({ max: 500 }),
  body('dateOfBirth').optional().isISO8601(),
  body('bloodGroup').optional().isIn(['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'])
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const userId = req.user.userId;
    const userRole = req.user.role;
    const updateData = req.body;

    // Log activity
    await logUserActivity(userId, 'profile_update', updateData, req);

    if (userRole === 'customer') {
      // Update customer profile
      const [customer] = await db.select().from(customers).where(eq(customers.userId, userId)).limit(1);
      if (customer) {
        await db.update(customers).set(updateData).where(eq(customers.id, customer.id));
      }
    } else if (userRole === 'merchant') {
      // Update merchant profile
      const [merchant] = await db.select().from(merchants).where(eq(merchants.userId, userId)).limit(1);
      if (merchant) {
        await db.update(merchants).set(updateData).where(eq(merchants.id, merchant.id));
      }
    }

    res.json({ message: 'Profile updated successfully' });

  } catch (error) {
    logger.error('Update profile error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Create customer profile
app.post('/api/users/customer', authenticateToken, authorizeRole(['customer']), [
  body('businessName').optional().trim().isLength({ min: 2, max: 100 }),
  body('businessType').optional().trim().isLength({ max: 50 }),
  body('fathersName').optional().trim().isLength({ max: 100 }),
  body('mothersName').optional().trim().isLength({ max: 100 }),
  body('nidNumber').optional().trim().isLength({ max: 20 })
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const userId = req.user.userId;
    const profileData = req.body;

    // Check if customer profile already exists
    const [existingCustomer] = await db.select().from(customers).where(eq(customers.userId, userId)).limit(1);
    if (existingCustomer) {
      return res.status(400).json({ message: 'Customer profile already exists' });
    }

    // Create customer profile
    const [newCustomer] = await db.insert(customers).values({
      userId,
      ...profileData
    }).returning();

    // Create customer wallet
    await db.insert(customerWallets).values({
      customerId: newCustomer.id
    });

    // Create user preferences
    await db.insert(userPreferences).values({
      userId
    });

    // Log activity
    await logUserActivity(userId, 'customer_profile_created', newCustomer, req);

    res.status(201).json({
      message: 'Customer profile created successfully',
      customer: newCustomer
    });

  } catch (error) {
    logger.error('Create customer profile error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Create merchant profile
app.post('/api/users/merchant', authenticateToken, authorizeRole(['merchant']), [
  body('businessName').trim().isLength({ min: 2, max: 100 }),
  body('businessType').optional().trim().isLength({ max: 50 }),
  body('accountType').optional().isIn(['merchant', 'e_merchant']),
  body('fathersName').optional().trim().isLength({ max: 100 }),
  body('mothersName').optional().trim().isLength({ max: 100 }),
  body('nidNumber').optional().trim().isLength({ max: 20 })
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const userId = req.user.userId;
    const profileData = req.body;

    // Check if merchant profile already exists
    const [existingMerchant] = await db.select().from(merchants).where(eq(merchants.userId, userId)).limit(1);
    if (existingMerchant) {
      return res.status(400).json({ message: 'Merchant profile already exists' });
    }

    // Generate unique referral ID
    const referralId = `M${Date.now()}${Math.random().toString(36).substr(2, 4).toUpperCase()}`;

    // Create merchant profile
    const [newMerchant] = await db.insert(merchants).values({
      userId,
      referralId,
      ...profileData
    }).returning();

    // Create merchant wallet
    await db.insert(merchantWallets).values({
      merchantId: newMerchant.id
    });

    // Create user preferences
    await db.insert(userPreferences).values({
      userId
    });

    // Log activity
    await logUserActivity(userId, 'merchant_profile_created', newMerchant, req);

    res.status(201).json({
      message: 'Merchant profile created successfully',
      merchant: newMerchant
    });

  } catch (error) {
    logger.error('Create merchant profile error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Get all customers (admin only)
app.get('/api/users/customers', authenticateToken, authorizeRole(['admin', 'global_admin', 'local_admin']), async (req, res) => {
  try {
    const { page = 1, limit = 20, search, country } = req.query;
    const offset = (Number(page) - 1) * Number(limit);

    let whereConditions = [];
    
    if (search) {
      whereConditions.push(like(customers.referralCode, `%${search}%`));
    }

    const whereClause = whereConditions.length > 0 ? and(...whereConditions) : undefined;

    const customersList = await db.select()
      .from(customers)
      .where(whereClause)
      .limit(Number(limit))
      .offset(offset)
      .orderBy(desc(customers.createdAt));

    const totalCount = await db.select().from(customers).where(whereClause);

    res.json({
      customers: customersList,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total: totalCount.length,
        pages: Math.ceil(totalCount.length / Number(limit))
      }
    });

  } catch (error) {
    logger.error('Get customers error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Get all merchants (admin only)
app.get('/api/users/merchants', authenticateToken, authorizeRole(['admin', 'global_admin', 'local_admin']), async (req, res) => {
  try {
    const { page = 1, limit = 20, search, country } = req.query;
    const offset = (Number(page) - 1) * Number(limit);

    let whereConditions = [];
    
    if (search) {
      whereConditions.push(like(merchants.businessName, `%${search}%`));
    }

    const whereClause = whereConditions.length > 0 ? and(...whereConditions) : undefined;

    const merchantsList = await db.select()
      .from(merchants)
      .where(whereClause)
      .limit(Number(limit))
      .offset(offset)
      .orderBy(desc(merchants.createdAt));

    const totalCount = await db.select().from(merchants).where(whereClause);

    res.json({
      merchants: merchantsList,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total: totalCount.length,
        pages: Math.ceil(totalCount.length / Number(limit))
      }
    });

  } catch (error) {
    logger.error('Get merchants error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Get user activity
app.get('/api/users/activity', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const { page = 1, limit = 50 } = req.query;
    const offset = (Number(page) - 1) * Number(limit);

    const activities = await db.select()
      .from(userActivity)
      .where(eq(userActivity.userId, userId))
      .limit(Number(limit))
      .offset(offset)
      .orderBy(desc(userActivity.createdAt));

    res.json({
      activities,
      pagination: {
        page: Number(page),
        limit: Number(limit)
      }
    });

  } catch (error) {
    logger.error('Get user activity error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Update user preferences
app.put('/api/users/preferences', authenticateToken, [
  body('language').optional().isIn(['en', 'bn', 'ar', 'ms']),
  body('timezone').optional().isLength({ max: 50 }),
  body('currency').optional().isIn(['BDT', 'MYR', 'AED', 'PHP']),
  body('notifications').optional().isObject(),
  body('privacy').optional().isObject()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const userId = req.user.userId;
    const preferencesData = req.body;

    // Check if preferences exist
    const [existingPreferences] = await db.select()
      .from(userPreferences)
      .where(eq(userPreferences.userId, userId))
      .limit(1);

    if (existingPreferences) {
      // Update existing preferences
      await db.update(userPreferences)
        .set({ ...preferencesData, updatedAt: new Date() })
        .where(eq(userPreferences.userId, userId));
    } else {
      // Create new preferences
      await db.insert(userPreferences).values({
        userId,
        ...preferencesData
      });
    }

    // Log activity
    await logUserActivity(userId, 'preferences_updated', preferencesData, req);

    res.json({ message: 'Preferences updated successfully' });

  } catch (error) {
    logger.error('Update preferences error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Upload profile picture
app.post('/api/users/profile-picture', authenticateToken, upload.single('profilePicture'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }

    const userId = req.user.userId;
    
    // TODO: Upload file to cloud storage (AWS S3, Google Cloud Storage, etc.)
    // For now, just return success
    const fileUrl = `/uploads/profile-pictures/${userId}-${Date.now()}.jpg`;

    // Log activity
    await logUserActivity(userId, 'profile_picture_uploaded', { fileUrl }, req);

    res.json({
      message: 'Profile picture uploaded successfully',
      fileUrl
    });

  } catch (error) {
    logger.error('Upload profile picture error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Get user statistics (admin only)
app.get('/api/users/statistics', authenticateToken, authorizeRole(['admin', 'global_admin', 'local_admin']), async (req, res) => {
  try {
    const { period = '30d' } = req.query;
    
    // Calculate date range
    const now = new Date();
    const days = period === '7d' ? 7 : period === '30d' ? 30 : 90;
    const startDate = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);

    // Get customer count
    const customerCount = await db.select().from(customers);
    
    // Get merchant count
    const merchantCount = await db.select().from(merchants);
    
    // Get admin count
    const adminCount = await db.select().from(admins);

    // Get recent registrations
    const recentCustomers = await db.select()
      .from(customers)
      .where(eq(customers.createdAt, startDate))
      .orderBy(desc(customers.createdAt));

    const recentMerchants = await db.select()
      .from(merchants)
      .where(eq(merchants.createdAt, startDate))
      .orderBy(desc(merchants.createdAt));

    res.json({
      statistics: {
        totalCustomers: customerCount.length,
        totalMerchants: merchantCount.length,
        totalAdmins: adminCount.length,
        recentRegistrations: {
          customers: recentCustomers.length,
          merchants: recentMerchants.length
        }
      }
    });

  } catch (error) {
    logger.error('Get user statistics error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Error handling middleware
app.use((err: any, req: any, res: any, next: any) => {
  logger.error('Unhandled error:', err);
  res.status(500).json({
    error: 'Internal Server Error',
    message: process.env.NODE_ENV === 'production' ? 'Something went wrong' : err.message
  });
});

// Start server
app.listen(PORT, () => {
  logger.info(`User service running on port ${PORT}`);
  logger.info(`Environment: ${process.env.NODE_ENV || 'development'}`);
});

export default app;
