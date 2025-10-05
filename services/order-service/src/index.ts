import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import { body, query, validationResult } from 'express-validator';
import winston from 'winston';
import dotenv from 'dotenv';
import { v4 as uuidv4 } from 'uuid';
import { db } from './database';
import { 
  orders, 
  orderItems, 
  cartItems, 
  wishlistItems, 
  orderStatusHistory,
  orderTracking,
  orderReturns,
  orderAnalytics
} from './schema';
import { eq, and, desc, like, or, gte, lte, sql, count } from 'drizzle-orm';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3004;

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
    service: 'order-service',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// Utility functions
const generateOrderNumber = () => {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substr(2, 5);
  return `ORD-${timestamp}-${random}`.toUpperCase();
};

const updateOrderStatus = async (orderId: string, newStatus: string, changedBy: string, reason?: string) => {
  try {
    // Get current order
    const [order] = await db.select().from(orders).where(eq(orders.id, orderId)).limit(1);
    if (!order) return false;

    // Update order status
    await db.update(orders)
      .set({ 
        status: newStatus, 
        updatedAt: new Date(),
        ...(newStatus === 'cancelled' && { cancelledAt: new Date(), cancelledReason: reason }),
        ...(newStatus === 'delivered' && { deliveredAt: new Date() })
      })
      .where(eq(orders.id, orderId));

    // Add status history
    await db.insert(orderStatusHistory).values({
      orderId,
      status: newStatus,
      previousStatus: order.status,
      changedBy,
      reason
    });

    return true;
  } catch (error) {
    logger.error('Update order status error:', error);
    return false;
  }
};

// Routes

// Get cart items
app.get('/api/cart', authenticateToken, authorizeRole(['customer']), async (req, res) => {
  try {
    const customerId = req.user.userId;

    const cartItemsList = await db.select()
      .from(cartItems)
      .where(eq(cartItems.customerId, customerId))
      .orderBy(desc(cartItems.addedAt));

    res.json(cartItemsList);

  } catch (error) {
    logger.error('Get cart error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Add item to cart
app.post('/api/cart', authenticateToken, authorizeRole(['customer']), [
  body('productId').isUUID(),
  body('quantity').isInt({ min: 1 })
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { productId, quantity } = req.body;
    const customerId = req.user.userId;

    // Check if item already exists in cart
    const [existingItem] = await db.select()
      .from(cartItems)
      .where(and(
        eq(cartItems.customerId, customerId),
        eq(cartItems.productId, productId)
      ))
      .limit(1);

    if (existingItem) {
      // Update quantity
      const [updatedItem] = await db.update(cartItems)
        .set({ 
          quantity: existingItem.quantity + quantity,
          updatedAt: new Date()
        })
        .where(eq(cartItems.id, existingItem.id))
        .returning();

      res.json(updatedItem);
    } else {
      // Add new item
      const [newItem] = await db.insert(cartItems).values({
        customerId,
        productId,
        quantity
      }).returning();

      res.status(201).json(newItem);
    }

  } catch (error) {
    logger.error('Add to cart error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Update cart item quantity
app.put('/api/cart/:id', authenticateToken, authorizeRole(['customer']), [
  body('quantity').isInt({ min: 1 })
], async (req, res) => {
  try {
    const { quantity } = req.body;
    const cartItemId = req.params.id;
    const customerId = req.user.userId;

    // Check if cart item belongs to customer
    const [existingItem] = await db.select()
      .from(cartItems)
      .where(and(
        eq(cartItems.id, cartItemId),
        eq(cartItems.customerId, customerId)
      ))
      .limit(1);

    if (!existingItem) {
      return res.status(404).json({ message: 'Cart item not found' });
    }

    const [updatedItem] = await db.update(cartItems)
      .set({ 
        quantity,
        updatedAt: new Date()
      })
      .where(eq(cartItems.id, cartItemId))
      .returning();

    res.json(updatedItem);

  } catch (error) {
    logger.error('Update cart item error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Remove item from cart
app.delete('/api/cart/:id', authenticateToken, authorizeRole(['customer']), async (req, res) => {
  try {
    const cartItemId = req.params.id;
    const customerId = req.user.userId;

    // Check if cart item belongs to customer
    const [existingItem] = await db.select()
      .from(cartItems)
      .where(and(
        eq(cartItems.id, cartItemId),
        eq(cartItems.customerId, customerId)
      ))
      .limit(1);

    if (!existingItem) {
      return res.status(404).json({ message: 'Cart item not found' });
    }

    await db.delete(cartItems).where(eq(cartItems.id, cartItemId));

    res.json({ message: 'Item removed from cart' });

  } catch (error) {
    logger.error('Remove from cart error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Clear cart
app.delete('/api/cart', authenticateToken, authorizeRole(['customer']), async (req, res) => {
  try {
    const customerId = req.user.userId;

    await db.delete(cartItems).where(eq(cartItems.customerId, customerId));

    res.json({ message: 'Cart cleared' });

  } catch (error) {
    logger.error('Clear cart error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Get wishlist items
app.get('/api/wishlist', authenticateToken, authorizeRole(['customer']), async (req, res) => {
  try {
    const customerId = req.user.userId;

    const wishlistItemsList = await db.select()
      .from(wishlistItems)
      .where(eq(wishlistItems.customerId, customerId))
      .orderBy(desc(wishlistItems.addedAt));

    res.json(wishlistItemsList);

  } catch (error) {
    logger.error('Get wishlist error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Add item to wishlist
app.post('/api/wishlist', authenticateToken, authorizeRole(['customer']), [
  body('productId').isUUID()
], async (req, res) => {
  try {
    const { productId } = req.body;
    const customerId = req.user.userId;

    // Check if item already exists in wishlist
    const [existingItem] = await db.select()
      .from(wishlistItems)
      .where(and(
        eq(wishlistItems.customerId, customerId),
        eq(wishlistItems.productId, productId)
      ))
      .limit(1);

    if (existingItem) {
      return res.status(400).json({ message: 'Item already in wishlist' });
    }

    const [newItem] = await db.insert(wishlistItems).values({
      customerId,
      productId
    }).returning();

    res.status(201).json(newItem);

  } catch (error) {
    logger.error('Add to wishlist error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Remove item from wishlist
app.delete('/api/wishlist/:id', authenticateToken, authorizeRole(['customer']), async (req, res) => {
  try {
    const wishlistItemId = req.params.id;
    const customerId = req.user.userId;

    // Check if wishlist item belongs to customer
    const [existingItem] = await db.select()
      .from(wishlistItems)
      .where(and(
        eq(wishlistItems.id, wishlistItemId),
        eq(wishlistItems.customerId, customerId)
      ))
      .limit(1);

    if (!existingItem) {
      return res.status(404).json({ message: 'Wishlist item not found' });
    }

    await db.delete(wishlistItems).where(eq(wishlistItems.id, wishlistItemId));

    res.json({ message: 'Item removed from wishlist' });

  } catch (error) {
    logger.error('Remove from wishlist error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Get orders
app.get('/api/orders', authenticateToken, [
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 100 }),
  query('status').optional().isIn(['pending', 'confirmed', 'shipped', 'delivered', 'cancelled', 'refunded'])
], async (req, res) => {
  try {
    const { page = 1, limit = 20, status } = req.query;
    const offset = (Number(page) - 1) * Number(limit);
    const userId = req.user.userId;
    const userRole = req.user.role;

    let whereConditions = [];

    if (userRole === 'customer') {
      whereConditions.push(eq(orders.customerId, userId));
    } else if (userRole === 'merchant') {
      whereConditions.push(eq(orders.merchantId, userId));
    }

    if (status) {
      whereConditions.push(eq(orders.status, status as string));
    }

    const whereClause = whereConditions.length > 0 ? and(...whereConditions) : undefined;

    const ordersList = await db.select()
      .from(orders)
      .where(whereClause)
      .limit(Number(limit))
      .offset(offset)
      .orderBy(desc(orders.createdAt));

    const [totalResult] = await db.select({ count: count() })
      .from(orders)
      .where(whereClause);

    res.json({
      orders: ordersList,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total: totalResult.count,
        pages: Math.ceil(totalResult.count / Number(limit))
      }
    });

  } catch (error) {
    logger.error('Get orders error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Get order by ID
app.get('/api/orders/:id', authenticateToken, async (req, res) => {
  try {
    const orderId = req.params.id;
    const userId = req.user.userId;
    const userRole = req.user.role;

    let whereConditions = [eq(orders.id, orderId)];

    if (userRole === 'customer') {
      whereConditions.push(eq(orders.customerId, userId));
    } else if (userRole === 'merchant') {
      whereConditions.push(eq(orders.merchantId, userId));
    }

    const [order] = await db.select()
      .from(orders)
      .where(and(...whereConditions))
      .limit(1);

    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    // Get order items
    const orderItemsList = await db.select()
      .from(orderItems)
      .where(eq(orderItems.orderId, orderId));

    // Get order status history
    const statusHistory = await db.select()
      .from(orderStatusHistory)
      .where(eq(orderStatusHistory.orderId, orderId))
      .orderBy(desc(orderStatusHistory.createdAt));

    res.json({
      ...order,
      items: orderItemsList,
      statusHistory
    });

  } catch (error) {
    logger.error('Get order error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Create order
app.post('/api/orders', authenticateToken, authorizeRole(['customer']), [
  body('items').isArray({ min: 1 }),
  body('shippingAddress').isObject(),
  body('paymentMethod').notEmpty(),
  body('notes').optional().isString()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { items, shippingAddress, paymentMethod, notes } = req.body;
    const customerId = req.user.userId;

    // Calculate totals
    let subtotal = 0;
    let totalPointsEarned = 0;

    // Validate items and calculate totals
    for (const item of items) {
      // TODO: Validate product exists and get current price
      // For now, use provided price
      subtotal += parseFloat(item.price) * item.quantity;
      totalPointsEarned += (item.pointsReward || 0) * item.quantity;
    }

    const taxAmount = subtotal * 0.1; // 10% tax
    const shippingAmount = subtotal > 100 ? 0 : 10; // Free shipping over $100
    const totalAmount = subtotal + taxAmount + shippingAmount;

    // Create order
    const orderNumber = generateOrderNumber();
    const [newOrder] = await db.insert(orders).values({
      customerId,
      merchantId: items[0].merchantId, // Assuming all items from same merchant
      orderNumber,
      status: 'pending',
      totalAmount: totalAmount.toString(),
      subtotal: subtotal.toString(),
      taxAmount: taxAmount.toString(),
      shippingAmount: shippingAmount.toString(),
      pointsEarned: totalPointsEarned,
      paymentMethod,
      shippingAddress,
      items,
      notes
    }).returning();

    // Create order items
    for (const item of items) {
      await db.insert(orderItems).values({
        orderId: newOrder.id,
        productId: item.productId,
        productName: item.name,
        productSku: item.sku,
        quantity: item.quantity,
        unitPrice: item.price,
        totalPrice: (parseFloat(item.price) * item.quantity).toString(),
        pointsReward: item.pointsReward || 0
      });
    }

    // Add initial status history
    await db.insert(orderStatusHistory).values({
      orderId: newOrder.id,
      status: 'pending',
      changedBy: customerId,
      reason: 'Order created'
    });

    // Clear cart
    await db.delete(cartItems).where(eq(cartItems.customerId, customerId));

    res.status(201).json(newOrder);

  } catch (error) {
    logger.error('Create order error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Update order status
app.put('/api/orders/:id/status', authenticateToken, authorizeRole(['merchant', 'admin']), [
  body('status').isIn(['pending', 'confirmed', 'shipped', 'delivered', 'cancelled', 'refunded']),
  body('reason').optional().isString(),
  body('trackingNumber').optional().isString()
], async (req, res) => {
  try {
    const { status, reason, trackingNumber } = req.body;
    const orderId = req.params.id;
    const userId = req.user.userId;

    // Check if order exists and user has permission
    const [order] = await db.select()
      .from(orders)
      .where(and(
        eq(orders.id, orderId),
        or(
          eq(orders.merchantId, userId),
          eq(orders.customerId, userId)
        )
      ))
      .limit(1);

    if (!order) {
      return res.status(404).json({ message: 'Order not found or unauthorized' });
    }

    // Update order status
    const success = await updateOrderStatus(orderId, status, userId, reason);

    if (!success) {
      return res.status(500).json({ message: 'Failed to update order status' });
    }

    // Add tracking number if provided
    if (trackingNumber) {
      await db.update(orders)
        .set({ trackingNumber })
        .where(eq(orders.id, orderId));
    }

    res.json({ message: 'Order status updated successfully' });

  } catch (error) {
    logger.error('Update order status error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Cancel order
app.post('/api/orders/:id/cancel', authenticateToken, [
  body('reason').notEmpty()
], async (req, res) => {
  try {
    const { reason } = req.body;
    const orderId = req.params.id;
    const userId = req.user.userId;
    const userRole = req.user.role;

    // Check if order exists and user has permission
    let whereConditions = [eq(orders.id, orderId)];

    if (userRole === 'customer') {
      whereConditions.push(eq(orders.customerId, userId));
    } else if (userRole === 'merchant') {
      whereConditions.push(eq(orders.merchantId, userId));
    }

    const [order] = await db.select()
      .from(orders)
      .where(and(...whereConditions))
      .limit(1);

    if (!order) {
      return res.status(404).json({ message: 'Order not found or unauthorized' });
    }

    // Check if order can be cancelled
    if (['cancelled', 'delivered', 'refunded'].includes(order.status)) {
      return res.status(400).json({ message: 'Order cannot be cancelled' });
    }

    // Update order status
    const success = await updateOrderStatus(orderId, 'cancelled', userId, reason);

    if (!success) {
      return res.status(500).json({ message: 'Failed to cancel order' });
    }

    res.json({ message: 'Order cancelled successfully' });

  } catch (error) {
    logger.error('Cancel order error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Get order analytics (admin/merchant only)
app.get('/api/orders/analytics', authenticateToken, authorizeRole(['merchant', 'admin']), [
  query('startDate').optional().isISO8601(),
  query('endDate').optional().isISO8601(),
  query('period').optional().isIn(['day', 'week', 'month', 'year'])
], async (req, res) => {
  try {
    const { startDate, endDate, period = 'month' } = req.query;
    const userId = req.user.userId;
    const userRole = req.user.role;

    let whereConditions = [];

    if (userRole === 'merchant') {
      whereConditions.push(eq(orders.merchantId, userId));
    }

    if (startDate) {
      whereConditions.push(gte(orders.createdAt, new Date(startDate as string)));
    }

    if (endDate) {
      whereConditions.push(lte(orders.createdAt, new Date(endDate as string)));
    }

    const whereClause = whereConditions.length > 0 ? and(...whereConditions) : undefined;

    // Get order statistics
    const [stats] = await db.select({
      totalOrders: count(),
      totalRevenue: sql<number>`SUM(${orders.totalAmount})`,
      averageOrderValue: sql<number>`AVG(${orders.totalAmount})`
    })
    .from(orders)
    .where(whereClause);

    // Get orders by status
    const ordersByStatus = await db.select({
      status: orders.status,
      count: count()
    })
    .from(orders)
    .where(whereClause)
    .groupBy(orders.status);

    res.json({
      statistics: {
        totalOrders: stats.totalOrders || 0,
        totalRevenue: stats.totalRevenue || 0,
        averageOrderValue: stats.averageOrderValue || 0
      },
      ordersByStatus
    });

  } catch (error) {
    logger.error('Get order analytics error:', error);
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
  logger.info(`Order service running on port ${PORT}`);
  logger.info(`Environment: ${process.env.NODE_ENV || 'development'}`);
});

export default app;
