import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import { body, query, validationResult } from 'express-validator';
import winston from 'winston';
import dotenv from 'dotenv';
import multer from 'multer';
import sharp from 'sharp';
import { db } from './database';
import { 
  products, 
  categories, 
  brands, 
  productVariants, 
  reviews, 
  wishlistItems, 
  searchHistory, 
  productAnalytics,
  productDiscounts,
  inventoryTransactions
} from './schema';
import { eq, and, desc, like, or, gte, lte, sql, count } from 'drizzle-orm';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3003;

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
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
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
    service: 'product-service',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// Utility function to track product views
const trackProductView = async (productId: string, customerId?: string, req?: any) => {
  try {
    // Update product view count
    await db.update(products)
      .set({ viewCount: sql`${products.viewCount} + 1` })
      .where(eq(products.id, productId));

    // Log search history if customer is logged in
    if (customerId) {
      await db.insert(searchHistory).values({
        customerId,
        searchTerm: `product_view_${productId}`,
        resultsCount: 1,
        ipAddress: req?.ip,
        userAgent: req?.get('User-Agent')
      });
    }
  } catch (error) {
    logger.error('Failed to track product view:', error);
  }
};

// Routes

// Get all categories
app.get('/api/categories', async (req, res) => {
  try {
    const { parentId, active } = req.query;
    
    let whereConditions = [];
    
    if (parentId) {
      whereConditions.push(eq(categories.parentId, parentId as string));
    } else if (parentId === 'null') {
      whereConditions.push(sql`${categories.parentId} IS NULL`);
    }
    
    if (active === 'true') {
      whereConditions.push(eq(categories.isActive, true));
    }

    const whereClause = whereConditions.length > 0 ? and(...whereConditions) : undefined;

    const categoriesList = await db.select()
      .from(categories)
      .where(whereClause)
      .orderBy(categories.sortOrder, categories.name);

    res.json(categoriesList);

  } catch (error) {
    logger.error('Get categories error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Get category by ID
app.get('/api/categories/:id', async (req, res) => {
  try {
    const [category] = await db.select()
      .from(categories)
      .where(eq(categories.id, req.params.id))
      .limit(1);

    if (!category) {
      return res.status(404).json({ message: 'Category not found' });
    }

    res.json(category);

  } catch (error) {
    logger.error('Get category error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Get all brands
app.get('/api/brands', async (req, res) => {
  try {
    const { active } = req.query;
    
    let whereConditions = [];
    
    if (active === 'true') {
      whereConditions.push(eq(brands.isActive, true));
    }

    const whereClause = whereConditions.length > 0 ? and(...whereConditions) : undefined;

    const brandsList = await db.select()
      .from(brands)
      .where(whereClause)
      .orderBy(brands.sortOrder, brands.name);

    res.json(brandsList);

  } catch (error) {
    logger.error('Get brands error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Get brand by ID
app.get('/api/brands/:id', async (req, res) => {
  try {
    const [brand] = await db.select()
      .from(brands)
      .where(eq(brands.id, req.params.id))
      .limit(1);

    if (!brand) {
      return res.status(404).json({ message: 'Brand not found' });
    }

    res.json(brand);

  } catch (error) {
    logger.error('Get brand error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Get all products with filtering and pagination
app.get('/api/products', [
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 100 }),
  query('categoryId').optional().isUUID(),
  query('brandId').optional().isUUID(),
  query('merchantId').optional().isUUID(),
  query('search').optional().isLength({ min: 1, max: 100 }),
  query('minPrice').optional().isFloat({ min: 0 }),
  query('maxPrice').optional().isFloat({ min: 0 }),
  query('sortBy').optional().isIn(['name', 'price', 'rating', 'createdAt', 'popularity']),
  query('sortOrder').optional().isIn(['asc', 'desc']),
  query('featured').optional().isBoolean()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const {
      page = 1,
      limit = 20,
      categoryId,
      brandId,
      merchantId,
      search,
      minPrice,
      maxPrice,
      sortBy = 'createdAt',
      sortOrder = 'desc',
      featured
    } = req.query;

    const offset = (Number(page) - 1) * Number(limit);

    let whereConditions = [eq(products.isActive, true)];

    if (categoryId) {
      whereConditions.push(eq(products.categoryId, categoryId as string));
    }

    if (brandId) {
      whereConditions.push(eq(products.brandId, brandId as string));
    }

    if (merchantId) {
      whereConditions.push(eq(products.merchantId, merchantId as string));
    }

    if (search) {
      whereConditions.push(
        or(
          like(products.name, `%${search}%`),
          like(products.description, `%${search}%`),
          like(products.sku, `%${search}%`)
        )
      );
    }

    if (minPrice) {
      whereConditions.push(gte(products.price, minPrice as string));
    }

    if (maxPrice) {
      whereConditions.push(lte(products.price, maxPrice as string));
    }

    if (featured === 'true') {
      whereConditions.push(eq(products.isFeatured, true));
    }

    const whereClause = and(...whereConditions);

    // Get products with pagination
    const productsList = await db.select()
      .from(products)
      .where(whereClause)
      .limit(Number(limit))
      .offset(offset)
      .orderBy(
        sortOrder === 'asc' 
          ? products[sortBy as keyof typeof products] 
          : desc(products[sortBy as keyof typeof products])
      );

    // Get total count
    const [totalResult] = await db.select({ count: count() })
      .from(products)
      .where(whereClause);

    // Enrich products with category and brand info
    const enrichedProducts = await Promise.all(
      productsList.map(async (product) => {
        const [category] = await db.select().from(categories).where(eq(categories.id, product.categoryId)).limit(1);
        const [brand] = product.brandId ? await db.select().from(brands).where(eq(brands.id, product.brandId)).limit(1) : [null];
        
        return {
          ...product,
          category: category?.name,
          brand: brand?.name
        };
      })
    );

    res.json({
      products: enrichedProducts,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total: totalResult.count,
        pages: Math.ceil(totalResult.count / Number(limit))
      }
    });

  } catch (error) {
    logger.error('Get products error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Get product by ID
app.get('/api/products/:id', async (req, res) => {
  try {
    const [product] = await db.select()
      .from(products)
      .where(eq(products.id, req.params.id))
      .limit(1);

    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }

    // Track product view
    await trackProductView(req.params.id, req.user?.userId, req);

    // Get category and brand info
    const [category] = await db.select().from(categories).where(eq(categories.id, product.categoryId)).limit(1);
    const [brand] = product.brandId ? await db.select().from(brands).where(eq(brands.id, product.brandId)).limit(1) : [null];

    // Get product variants
    const variants = await db.select()
      .from(productVariants)
      .where(and(
        eq(productVariants.productId, product.id),
        eq(productVariants.isActive, true)
      ));

    // Get recent reviews
    const recentReviews = await db.select()
      .from(reviews)
      .where(and(
        eq(reviews.productId, product.id),
        eq(reviews.isApproved, true)
      ))
      .orderBy(desc(reviews.createdAt))
      .limit(5);

    res.json({
      ...product,
      category: category?.name,
      brand: brand?.name,
      variants,
      recentReviews
    });

  } catch (error) {
    logger.error('Get product error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Create product (merchant only)
app.post('/api/products', authenticateToken, authorizeRole(['merchant']), [
  body('name').trim().isLength({ min: 2, max: 200 }),
  body('description').optional().trim().isLength({ max: 2000 }),
  body('price').isFloat({ min: 0 }),
  body('sku').trim().isLength({ min: 1, max: 50 }),
  body('categoryId').isUUID(),
  body('stock').isInt({ min: 0 }),
  body('pointsReward').optional().isInt({ min: 0 })
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const productData = {
      ...req.body,
      merchantId: req.user.userId,
      slug: req.body.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
    };

    const [newProduct] = await db.insert(products).values(productData).returning();

    // Log inventory transaction
    await db.insert(inventoryTransactions).values({
      productId: newProduct.id,
      transactionType: 'in',
      quantity: newProduct.stock,
      previousStock: 0,
      newStock: newProduct.stock,
      reason: 'Initial stock'
    });

    res.status(201).json(newProduct);

  } catch (error) {
    logger.error('Create product error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Update product (merchant only)
app.put('/api/products/:id', authenticateToken, authorizeRole(['merchant']), [
  body('name').optional().trim().isLength({ min: 2, max: 200 }),
  body('description').optional().trim().isLength({ max: 2000 }),
  body('price').optional().isFloat({ min: 0 }),
  body('stock').optional().isInt({ min: 0 }),
  body('pointsReward').optional().isInt({ min: 0 })
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    // Check if product exists and belongs to merchant
    const [existingProduct] = await db.select()
      .from(products)
      .where(and(
        eq(products.id, req.params.id),
        eq(products.merchantId, req.user.userId)
      ))
      .limit(1);

    if (!existingProduct) {
      return res.status(404).json({ message: 'Product not found or unauthorized' });
    }

    const updateData = {
      ...req.body,
      updatedAt: new Date()
    };

    // Track stock changes
    if (req.body.stock !== undefined && req.body.stock !== existingProduct.stock) {
      const stockDifference = req.body.stock - existingProduct.stock;
      const transactionType = stockDifference > 0 ? 'in' : 'out';
      
      await db.insert(inventoryTransactions).values({
        productId: req.params.id,
        transactionType,
        quantity: Math.abs(stockDifference),
        previousStock: existingProduct.stock,
        newStock: req.body.stock,
        reason: 'Stock adjustment'
      });
    }

    const [updatedProduct] = await db.update(products)
      .set(updateData)
      .where(eq(products.id, req.params.id))
      .returning();

    res.json(updatedProduct);

  } catch (error) {
    logger.error('Update product error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Delete product (merchant only)
app.delete('/api/products/:id', authenticateToken, authorizeRole(['merchant']), async (req, res) => {
  try {
    // Check if product exists and belongs to merchant
    const [existingProduct] = await db.select()
      .from(products)
      .where(and(
        eq(products.id, req.params.id),
        eq(products.merchantId, req.user.userId)
      ))
      .limit(1);

    if (!existingProduct) {
      return res.status(404).json({ message: 'Product not found or unauthorized' });
    }

    // Soft delete by setting isActive to false
    await db.update(products)
      .set({ isActive: false, updatedAt: new Date() })
      .where(eq(products.id, req.params.id));

    res.json({ message: 'Product deleted successfully' });

  } catch (error) {
    logger.error('Delete product error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Add product to wishlist
app.post('/api/products/:id/wishlist', authenticateToken, authorizeRole(['customer']), async (req, res) => {
  try {
    const productId = req.params.id;
    const customerId = req.user.userId;

    // Check if product exists
    const [product] = await db.select()
      .from(products)
      .where(eq(products.id, productId))
      .limit(1);

    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }

    // Check if already in wishlist
    const [existingWishlistItem] = await db.select()
      .from(wishlistItems)
      .where(and(
        eq(wishlistItems.customerId, customerId),
        eq(wishlistItems.productId, productId)
      ))
      .limit(1);

    if (existingWishlistItem) {
      return res.status(400).json({ message: 'Product already in wishlist' });
    }

    const [newWishlistItem] = await db.insert(wishlistItems).values({
      customerId,
      productId
    }).returning();

    res.status(201).json(newWishlistItem);

  } catch (error) {
    logger.error('Add to wishlist error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Remove product from wishlist
app.delete('/api/products/:id/wishlist', authenticateToken, authorizeRole(['customer']), async (req, res) => {
  try {
    const productId = req.params.id;
    const customerId = req.user.userId;

    await db.delete(wishlistItems)
      .where(and(
        eq(wishlistItems.customerId, customerId),
        eq(wishlistItems.productId, productId)
      ));

    res.json({ message: 'Product removed from wishlist' });

  } catch (error) {
    logger.error('Remove from wishlist error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Get product reviews
app.get('/api/products/:id/reviews', [
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 50 }),
  query('rating').optional().isInt({ min: 1, max: 5 })
], async (req, res) => {
  try {
    const { page = 1, limit = 10, rating } = req.query;
    const offset = (Number(page) - 1) * Number(limit);

    let whereConditions = [
      eq(reviews.productId, req.params.id),
      eq(reviews.isApproved, true)
    ];

    if (rating) {
      whereConditions.push(eq(reviews.rating, Number(rating)));
    }

    const whereClause = and(...whereConditions);

    const reviewsList = await db.select()
      .from(reviews)
      .where(whereClause)
      .limit(Number(limit))
      .offset(offset)
      .orderBy(desc(reviews.createdAt));

    const [totalResult] = await db.select({ count: count() })
      .from(reviews)
      .where(whereClause);

    res.json({
      reviews: reviewsList,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total: totalResult.count,
        pages: Math.ceil(totalResult.count / Number(limit))
      }
    });

  } catch (error) {
    logger.error('Get product reviews error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Add product review
app.post('/api/products/:id/reviews', authenticateToken, authorizeRole(['customer']), [
  body('rating').isInt({ min: 1, max: 5 }),
  body('title').optional().trim().isLength({ max: 200 }),
  body('comment').optional().trim().isLength({ max: 1000 })
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { rating, title, comment } = req.body;
    const productId = req.params.id;
    const customerId = req.user.userId;

    // Check if product exists
    const [product] = await db.select()
      .from(products)
      .where(eq(products.id, productId))
      .limit(1);

    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }

    // Check if customer already reviewed this product
    const [existingReview] = await db.select()
      .from(reviews)
      .where(and(
        eq(reviews.productId, productId),
        eq(reviews.customerId, customerId)
      ))
      .limit(1);

    if (existingReview) {
      return res.status(400).json({ message: 'You have already reviewed this product' });
    }

    const [newReview] = await db.insert(reviews).values({
      productId,
      customerId,
      rating,
      title,
      comment
    }).returning();

    // Update product rating and review count
    const [updatedProduct] = await db.update(products)
      .set({
        reviewCount: sql`${products.reviewCount} + 1`,
        rating: sql`((${products.rating} * ${products.reviewCount}) + ${rating}) / (${products.reviewCount} + 1)`
      })
      .where(eq(products.id, productId))
      .returning();

    res.status(201).json(newReview);

  } catch (error) {
    logger.error('Add product review error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Upload product images
app.post('/api/products/:id/images', authenticateToken, authorizeRole(['merchant']), upload.array('images', 10), async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ message: 'No images uploaded' });
    }

    const productId = req.params.id;

    // Check if product exists and belongs to merchant
    const [product] = await db.select()
      .from(products)
      .where(and(
        eq(products.id, productId),
        eq(products.merchantId, req.user.userId)
      ))
      .limit(1);

    if (!product) {
      return res.status(404).json({ message: 'Product not found or unauthorized' });
    }

    const uploadedImages = [];

    // Process and upload images
    for (const file of req.files as Express.Multer.File[]) {
      try {
        // Resize and optimize image
        const optimizedImage = await sharp(file.buffer)
          .resize(800, 800, { fit: 'inside', withoutEnlargement: true })
          .jpeg({ quality: 85 })
          .toBuffer();

        // TODO: Upload to cloud storage (AWS S3, Google Cloud Storage, etc.)
        const imageUrl = `/uploads/products/${productId}/${Date.now()}-${file.originalname}`;
        
        uploadedImages.push({
          url: imageUrl,
          alt: file.originalname,
          size: optimizedImage.length
        });
      } catch (error) {
        logger.error('Image processing error:', error);
      }
    }

    // Update product with new images
    const currentImages = product.images as any[] || [];
    const updatedImages = [...currentImages, ...uploadedImages];

    await db.update(products)
      .set({ images: updatedImages })
      .where(eq(products.id, productId));

    res.json({
      message: 'Images uploaded successfully',
      images: uploadedImages
    });

  } catch (error) {
    logger.error('Upload product images error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Search products
app.get('/api/products/search', [
  query('q').trim().isLength({ min: 1, max: 100 }),
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 100 })
], async (req, res) => {
  try {
    const { q, page = 1, limit = 20 } = req.query;
    const offset = (Number(page) - 1) * Number(limit);

    // Log search query
    await db.insert(searchHistory).values({
      customerId: req.user?.userId,
      searchTerm: q as string,
      resultsCount: 0, // Will be updated after getting results
      ipAddress: req.ip,
      userAgent: req.get('User-Agent')
    });

    const searchTerm = `%${q}%`;
    const whereClause = and(
      eq(products.isActive, true),
      or(
        like(products.name, searchTerm),
        like(products.description, searchTerm),
        like(products.sku, searchTerm),
        like(products.tags, searchTerm)
      )
    );

    const searchResults = await db.select()
      .from(products)
      .where(whereClause)
      .limit(Number(limit))
      .offset(offset)
      .orderBy(desc(products.rating), desc(products.reviewCount));

    const [totalResult] = await db.select({ count: count() })
      .from(products)
      .where(whereClause);

    res.json({
      products: searchResults,
      query: q,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total: totalResult.count,
        pages: Math.ceil(totalResult.count / Number(limit))
      }
    });

  } catch (error) {
    logger.error('Search products error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Get featured products
app.get('/api/products/featured', async (req, res) => {
  try {
    const { limit = 10 } = req.query;

    const featuredProducts = await db.select()
      .from(products)
      .where(and(
        eq(products.isActive, true),
        eq(products.isFeatured, true)
      ))
      .limit(Number(limit))
      .orderBy(desc(products.rating), desc(products.reviewCount));

    res.json(featuredProducts);

  } catch (error) {
    logger.error('Get featured products error:', error);
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
  logger.info(`Product service running on port ${PORT}`);
  logger.info(`Environment: ${process.env.NODE_ENV || 'development'}`);
});

export default app;
