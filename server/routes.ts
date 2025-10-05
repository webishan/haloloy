import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { Server as SocketIOServer, Socket as SocketIOSocket } from "socket.io";
import { storage } from "./storage";
import { setupAdminRoutes } from "./admin-routes";
import { setupMerchantRoutes } from "./merchant-routes";
import { setupChatRoutes } from "./chat-routes";
import { setupAffiliateRoutes } from "./affiliate-routes";
import merchantWalletRoutes from "./merchant-wallet-routes";
import merchantAdvancedRoutes from "./merchant-advanced-routes";
import customerRoutes from "./customer-routes";
import customerWalletRoutes from "./customer-wallet-routes";
// registerAdminCashbackRoutes removed - will be rebuilt from scratch
import customerRewardRoutes from "./customer-reward-routes";
import { 
  insertUserSchema, 
  insertProductSchema, 
  insertOrderSchema, 
  insertRewardTransactionSchema,
  insertPointDistributionSchema,
  insertChatMessageSchema,
  insertAdminSchema
} from "../shared/schema.js";
import bcrypt from "bcryptjs";
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

declare global {
  namespace Express {
    interface Request {
      user?: any;
    }
  }
}

export async function registerRoutes(app: Express): Promise<Server> {
  console.log('🚀 Routes are being registered...');
  
  // Authentication routes
  app.post("/api/auth/register", async (req, res) => {
    try {
      const userData = insertUserSchema.parse(req.body);
      
      // Check if user already exists
      const existingUser = await storage.getUserByEmail(userData.email);
      if (existingUser) {
        return res.status(400).json({ message: `User already exists with email: ${userData.email}. Please use a different email address or try logging in instead.` });
      }

      // Check if username already exists
      const existingUserByUsername = await storage.getUserByUsername(userData.username);
      if (existingUserByUsername) {
        return res.status(400).json({ message: `Username "${userData.username}" is already taken. Please choose a different username.` });
      }

      // Hash password
      userData.password = await bcrypt.hash(userData.password, 10);
      
      // Create user
      const user = await storage.createUser(userData);

      // Create customer or merchant profile based on role
      if (user.role === 'customer') {
        // Generate unique account number
        const uniqueAccountNumber = await storage.generateUniqueAccountNumber();
        
        // Create customer profile
        const profile = await storage.createCustomerProfile({
          userId: user.id,
          uniqueAccountNumber,
          mobileNumber: userData.mobileNumber || `+880${Math.floor(Math.random() * 1000000000)}`,
          email: user.email,
          fullName: `${user.firstName} ${user.lastName}`,
          profileComplete: false,
          totalPointsEarned: 0,
          currentPointsBalance: 0,
          accumulatedPoints: 0,
          globalSerialNumber: 0, // Start with 0 (not assigned yet)
          localSerialNumber: 0,  // Start with 0 (not assigned yet)
          tier: 'bronze',
          isActive: true
        });

        // Create customer wallet
        await storage.createCustomerWallet({
          customerId: profile.id,
          pointsBalance: 0,
          totalPointsEarned: 0,
          totalPointsSpent: 0,
          totalPointsTransferred: 0
        });

        // Generate QR code
        await storage.generateCustomerQRCode(user.id);
      } else if (user.role === 'merchant') {
        // Handle referral code if provided
        const { referralCode } = req.body;
        let referredByMerchant = null;
        
        if (referralCode) {
          // Validate referral code using the new validation method
          const validation = await storage.validateMerchantReferralCode(referralCode, user.id);
          if (validation.isValid && validation.referringMerchant) {
            referredByMerchant = validation.referringMerchant.userId; // Use userId, not id
            console.log(`✅ Valid referral code: ${referralCode} from merchant ${validation.referringMerchant.businessName} (userId: ${validation.referringMerchant.userId})`);
          } else {
            console.log(`⚠️ Referral code validation failed: ${validation.error}`);
          }
        }

        // Generate unique merchant referral code
        const merchantReferralCode = await storage.generateMerchantReferralCode(user.id);

        const merchant = await storage.createMerchant({
          userId: user.id,
          businessName: req.body.businessName || `${user.firstName}'s Store`,
          businessType: req.body.businessType || 'retail',
          tier: 'bronze',
          merchantReferralCode,
          referredByMerchant,
          isActive: true,
          // Ensure referred merchants start with 0 loyalty points
          loyaltyPointsBalance: 0,
          availablePoints: 0
        });
        
        // Log merchant creation details
        console.log(`🏪 MERCHANT CREATED:`, {
          businessName: merchant.businessName,
          userId: merchant.userId,
          referredByMerchant: merchant.referredByMerchant || 'None (direct signup)',
          loyaltyPointsBalance: merchant.loyaltyPointsBalance,
          availablePoints: merchant.availablePoints,
          isReferred: !!merchant.referredByMerchant
        });

        // Ensure referral code is properly set (fix for existing merchants)
        const createdMerchant = await storage.getMerchantByUserId(user.id);
        if (createdMerchant && !createdMerchant.merchantReferralCode) {
          console.log(`🔧 Fixing missing referral code for merchant ${createdMerchant.businessName}`);
          await storage.updateMerchant(user.id, {
            merchantReferralCode: merchantReferralCode
          });
        }

        // Create merchant wallet for instant cashback system
        console.log(`🔧 Creating merchant wallet for new merchant ${merchant.businessName}`);
        await storage.createMerchantWallet({
          merchantId: merchant.id,
          rewardPointBalance: 0, // Start with 0 points
          totalPointsIssued: 0,
          incomeWalletBalance: "0.00",
          cashbackIncome: "0.00",
          referralIncome: "0.00",
          royaltyIncome: "0.00",
          commerceWalletBalance: "0.00",
          totalDeposited: "0.00",
          totalWithdrawn: "0.00"
        });
        console.log(`✅ Merchant wallet created successfully`);

        // If this merchant was referred, establish the referral relationship
        if (referredByMerchant) {
          await storage.establishMerchantReferralRelationship(referredByMerchant, user.id);
          console.log(`🔗 Referral relationship established: referring merchant userId ${referredByMerchant} -> new merchant userId ${user.id}`);
        }
      }

      // Generate token
      const token = jwt.sign(
        { userId: user.id, id: user.id, email: user.email, role: user.role }, 
        JWT_SECRET,
        { expiresIn: '7d' }
      );

      res.json({ 
        token, 
        user: { ...user, password: undefined }
      });
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.post("/api/auth/login", async (req, res) => {
    try {
      const { email, password } = req.body;

      const user = await storage.getUserByEmail(email);
      if (!user) {
        return res.status(400).json({ message: "Invalid credentials" });
      }

      const validPassword = await bcrypt.compare(password, user.password);
      if (!validPassword) {
        return res.status(400).json({ message: "Invalid credentials" });
      }

      const token = jwt.sign(
        { userId: user.id, id: user.id, email: user.email, role: user.role }, 
        JWT_SECRET,
        { expiresIn: '7d' }
      );

      res.json({ 
        token, 
        user: { ...user, password: undefined }
      });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/auth/me", authenticateToken, async (req, res) => {
    try {
      // Handle both userId and id fields from JWT token
      const userId = req.user.userId || req.user.id;
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      let profile = null;
      if (user.role === 'customer') {
        profile = await storage.getCustomerByUserId(user.id);
      } else if (user.role === 'merchant') {
        profile = await storage.getMerchantByUserId(user.id);
      }

      res.json({ 
        user: { ...user, password: undefined },
        profile
      });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Categories
  app.get("/api/categories", async (req, res) => {
    try {
      const categories = await storage.getCategories();
      res.json(categories);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Brands
  app.get("/api/brands", async (req, res) => {
    try {
      const brands = await storage.getBrands();
      res.json(brands);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Debug endpoint to check storage
  app.get("/api/debug/products", async (req, res) => {
    try {
      const allProducts = Array.from((storage as any).products.values());
      const activeProducts = allProducts.filter((p: any) => p.isActive);
      res.json({
        total: allProducts.length,
        active: activeProducts.length,
        all: allProducts,
        active: activeProducts
      });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Debug endpoint to check merchants
  app.get("/api/debug/merchants", async (req, res) => {
    try {
      const allMerchants = Array.from((storage as any).merchants.values());
      res.json({
        total: allMerchants.length,
        merchants: allMerchants.map(m => ({
          id: m.id,
          userId: m.userId,
          businessName: m.businessName,
          merchantReferralCode: m.merchantReferralCode,
          isActive: m.isActive
        }))
      });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Fix endpoint to generate missing referral codes
  app.post("/api/debug/fix-referral-codes", async (req, res) => {
    try {
      console.log('🔧 Fixing referral codes for all merchants...');
      
      const allMerchants = Array.from((storage as any).merchants.values());
      const fixedMerchants = [];
      
      for (const merchant of allMerchants) {
        if (!merchant.merchantReferralCode) {
          const newReferralCode = await storage.generateMerchantReferralCode(merchant.userId);
          await storage.updateMerchant(merchant.userId, {
            merchantReferralCode: newReferralCode
          });
          
          console.log(`✅ Generated referral code for ${merchant.businessName}: ${newReferralCode}`);
          fixedMerchants.push({
            businessName: merchant.businessName,
            userId: merchant.userId,
            newReferralCode
          });
        }
      }
      
      res.json({
        success: true,
        message: `Fixed ${fixedMerchants.length} merchants`,
        fixedMerchants,
        totalMerchants: allMerchants.length
      });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Quick fix for Ishan's referral code
  app.post("/api/debug/fix-ishan-referral", async (req, res) => {
    try {
      console.log('🔧 Fixing Ishan\'s referral code...');
      
      // Find Ishan's merchant by userId
      const ishanUserId = '01a896ff-1180-42c4-8548-37e4f4b2bab2';
      const merchant = await storage.getMerchantByUserId(ishanUserId);
      
      if (!merchant) {
        return res.status(404).json({ message: 'Ishan merchant not found' });
      }
      
      console.log(`Found Ishan: ${merchant.businessName}`);
      console.log(`Current referral code: ${merchant.merchantReferralCode || 'None'}`);
      
      // Generate the expected referral code
      const expectedReferralCode = `MERCH_${ishanUserId.substring(0, 8).toUpperCase()}`;
      console.log(`Expected referral code: ${expectedReferralCode}`);
      
      // Update the merchant with the referral code
      await storage.updateMerchant(ishanUserId, {
        merchantReferralCode: expectedReferralCode
      });
      
      console.log(`✅ Updated Ishan's referral code to: ${expectedReferralCode}`);
      
      // Test the validation
      const validation = await storage.validateMerchantReferralCode(expectedReferralCode, 'test-user-id');
      console.log('Validation result:', validation);
      
      res.json({
        success: true,
        message: `Fixed Ishan's referral code to ${expectedReferralCode}`,
        merchant: {
          businessName: merchant.businessName,
          userId: merchant.userId,
          oldReferralCode: merchant.merchantReferralCode,
          newReferralCode: expectedReferralCode
        },
        validation: validation
      });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Products
  app.get("/api/products", async (req, res) => {
    try {
      const { categoryId, brandId, merchantId, search } = req.query;
      console.log("🔍 Products API called with filters:", { categoryId, brandId, merchantId, search });
      
      const products = await storage.getProducts({
        categoryId: categoryId as string,
        brandId: brandId as string,
        merchantId: merchantId as string,
        search: search as string
      });
      
      console.log(`📦 Found ${products.length} products`);

      // Enrich products with category and brand info
      const enrichedProducts = await Promise.all(
        products.map(async (product) => {
          const category = await storage.getCategory(product.categoryId);
          const brand = product.brandId ? await storage.getBrand(product.brandId) : null;
          return {
            ...product,
            category: category?.name,
            brand: brand?.name
          };
        })
      );

      res.json(enrichedProducts);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/products/:id", async (req, res) => {
    try {
      const product = await storage.getProduct(req.params.id);
      if (!product) {
        return res.status(404).json({ message: "Product not found" });
      }

      const category = await storage.getCategory(product.categoryId);
      const brand = product.brandId ? await storage.getBrand(product.brandId) : null;
      const reviews = await storage.getReviews(product.id);

      res.json({
        ...product,
        category: category?.name,
        brand: brand?.name,
        reviews
      });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/products", authenticateToken, authorizeRole(['merchant']), async (req, res) => {
    try {
      const productData = insertProductSchema.parse(req.body);
      productData.merchantId = req.user.id;
      
      const product = await storage.createProduct(productData);
      res.status(201).json(product);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.put("/api/products/:id", authenticateToken, authorizeRole(['merchant']), async (req, res) => {
    try {
      const product = await storage.getProduct(req.params.id);
      if (!product || product.merchantId !== req.user.id) {
        return res.status(404).json({ message: "Product not found or unauthorized" });
      }

      const updatedProduct = await storage.updateProduct(req.params.id, req.body);
      res.json(updatedProduct);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.delete("/api/products/:id", authenticateToken, authorizeRole(['merchant']), async (req, res) => {
    try {
      const product = await storage.getProduct(req.params.id);
      if (!product || product.merchantId !== req.user.id) {
        return res.status(404).json({ message: "Product not found or unauthorized" });
      }

      await storage.deleteProduct(req.params.id);
      res.json({ message: "Product deleted successfully" });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Cart
  app.get("/api/cart", authenticateToken, authorizeRole(['customer']), async (req, res) => {
    try {
      const customer = await storage.getCustomerByUserId(req.user.id);
      if (!customer) {
        return res.status(404).json({ message: "Customer profile not found" });
      }

      const cartItems = await storage.getCartItems(customer.id);
      
      // Enrich cart items with product details
      const enrichedCartItems = await Promise.all(
        cartItems.map(async (item) => {
          const product = await storage.getProduct(item.productId);
          return {
            ...item,
            product
          };
        })
      );

      res.json(enrichedCartItems);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/cart", authenticateToken, authorizeRole(['customer']), async (req, res) => {
    try {
      const customer = await storage.getCustomerByUserId(req.user.id);
      if (!customer) {
        return res.status(404).json({ message: "Customer profile not found" });
      }

      const { productId, quantity } = req.body;
      const cartItem = await storage.addToCart({
        customerId: customer.id,
        productId,
        quantity: quantity || 1
      });

      res.status(201).json(cartItem);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.put("/api/cart/:id", authenticateToken, authorizeRole(['customer']), async (req, res) => {
    try {
      const { quantity } = req.body;
      const cartItem = await storage.updateCartItem(req.params.id, quantity);
      res.json(cartItem);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.delete("/api/cart/:id", authenticateToken, authorizeRole(['customer']), async (req, res) => {
    try {
      await storage.removeFromCart(req.params.id);
      res.json({ message: "Item removed from cart" });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Orders
  app.get("/api/orders", authenticateToken, async (req, res) => {
    try {
      let orders: any[] = [];
      
      if (req.user.role === 'customer') {
        const customer = await storage.getCustomerByUserId(req.user.id);
        if (customer) {
          orders = await storage.getOrders(customer.id);
        }
      } else if (req.user.role === 'merchant') {
        const merchant = await storage.getMerchantByUserId(req.user.userId);
        if (merchant) {
          orders = await storage.getOrders(undefined, merchant.id);
        }
      } else if (req.user.role === 'admin') {
        orders = await storage.getOrders();
      }

      res.json(orders);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/orders", authenticateToken, authorizeRole(['customer']), async (req, res) => {
    try {
      const customer = await storage.getCustomerByUserId(req.user.id);
      if (!customer) {
        return res.status(404).json({ message: "Customer profile not found" });
      }

      // Get the first available merchant if merchantId is missing
      if (!req.body.merchantId) {
        const merchants = await storage.getMerchants();
        if (merchants.length > 0) {
          req.body.merchantId = merchants[0].id;
        } else {
          return res.status(400).json({ message: "No merchants available for order processing" });
        }
      }

      const orderData = insertOrderSchema.parse(req.body);
      orderData.customerId = customer.id;
      orderData.orderNumber = `ORD-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`;

      // Calculate points earned (example: 1 point per $10 spent)
      const pointsEarned = Math.floor(parseFloat(orderData.totalAmount) / 10);
      orderData.pointsEarned = pointsEarned;

      const order = await storage.createOrder(orderData);

      // Clear cart after successful order
      await storage.clearCart(customer.id);

      res.status(201).json(order);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.put("/api/orders/:id", authenticateToken, async (req, res) => {
    try {
      const order = await storage.getOrder(req.params.id);
      if (!order) {
        return res.status(404).json({ message: "Order not found" });
      }

      // Check authorization
      if (req.user.role === 'customer') {
        const customer = await storage.getCustomerByUserId(req.user.id);
        if (!customer || order.customerId !== customer.id) {
          return res.status(403).json({ message: "Unauthorized" });
        }
      } else if (req.user.role === 'merchant') {
        const merchant = await storage.getMerchantByUserId(req.user.userId);
        if (!merchant || order.merchantId !== merchant.id) {
          return res.status(403).json({ message: "Unauthorized" });
        }
      }

      const updatedOrder = await storage.updateOrder(req.params.id, req.body);
      res.json(updatedOrder);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  // Wishlist
  app.get("/api/wishlist", authenticateToken, authorizeRole(['customer']), async (req, res) => {
    try {
      const customer = await storage.getCustomerByUserId(req.user.id);
      if (!customer) {
        return res.status(404).json({ message: "Customer profile not found" });
      }

      const wishlistItems = await storage.getWishlistItems(customer.id);
      
      // Enrich wishlist items with product details
      const enrichedWishlistItems = await Promise.all(
        wishlistItems.map(async (item) => {
          const product = await storage.getProduct(item.productId);
          return {
            ...item,
            product
          };
        })
      );

      res.json(enrichedWishlistItems);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/wishlist", authenticateToken, authorizeRole(['customer']), async (req, res) => {
    try {
      const customer = await storage.getCustomerByUserId(req.user.id);
      if (!customer) {
        return res.status(404).json({ message: "Customer profile not found" });
      }

      const { productId } = req.body;
      const wishlistItem = await storage.addToWishlist({
        customerId: customer.id,
        productId
      });

      res.status(201).json(wishlistItem);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.delete("/api/wishlist/:id", authenticateToken, authorizeRole(['customer']), async (req, res) => {
    try {
      await storage.removeFromWishlist(req.params.id);
      res.json({ message: "Item removed from wishlist" });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Rewards
  app.get("/api/rewards/transactions", authenticateToken, async (req, res) => {
    try {
      const transactions = await storage.getRewardTransactions(req.user.id);
      res.json(transactions);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/rewards/numbers", authenticateToken, authorizeRole(['customer']), async (req, res) => {
    try {
      const customer = await storage.getCustomerByUserId(req.user.id);
      if (!customer) {
        return res.status(404).json({ message: "Customer profile not found" });
      }

      const rewardNumbers = await storage.getRewardNumbers(customer.id);
      res.json(rewardNumbers);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Reviews
  app.get("/api/products/:productId/reviews", async (req, res) => {
    try {
      const reviews = await storage.getReviews(req.params.productId);
      res.json(reviews);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/products/:productId/reviews", authenticateToken, authorizeRole(['customer']), async (req, res) => {
    try {
      const customer = await storage.getCustomerByUserId(req.user.id);
      if (!customer) {
        return res.status(404).json({ message: "Customer profile not found" });
      }

      const { rating, comment } = req.body;
      const review = await storage.createReview({
        productId: req.params.productId,
        customerId: customer.id,
        rating: parseInt(rating),
        comment
      });

      res.status(201).json(review);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  // Analytics and Dashboard
  app.get("/api/analytics/global", authenticateToken, authorizeRole(['admin']), async (req, res) => {
    try {
      const stats = await storage.getGlobalStats();
      res.json(stats);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/analytics/country/:country", authenticateToken, authorizeRole(['admin']), async (req, res) => {
    try {
      const stats = await storage.getCountryStats(req.params.country);
      res.json(stats);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/dashboard/customer", authenticateToken, authorizeRole(['customer']), async (req, res) => {
    try {
      const customer = await storage.getCustomerByUserId(req.user.id);
      if (!customer) {
        return res.status(404).json({ message: "Customer profile not found" });
      }

      const orders = await storage.getOrders(customer.id);
      const recentOrders = orders.slice(0, 5);
      const rewardNumbers = await storage.getRewardNumbers(customer.id);

      res.json({
        customer,
        recentOrders,
        rewardNumbers,
        totalOrders: orders.length
      });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/dashboard/merchant", authenticateToken, authorizeRole(['merchant']), async (req, res) => {
    try {
      const merchant = await storage.getMerchantByUserId(req.user.userId);
      if (!merchant) {
        return res.status(404).json({ message: "Merchant profile not found" });
      }

      const products = await storage.getProducts({ merchantId: merchant.id });
      const orders = await storage.getOrders(undefined, merchant.id);

      res.json({
        merchant,
        products,
        recentOrders: orders.slice(0, 10),
        totalProducts: products.length,
        totalOrders: orders.length
      });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });


  // Merchant Points Transfer (to customers)
  app.post("/api/merchant/rewards/send", authenticateToken, authorizeRole(['merchant']), async (req, res) => {
    try {
      const merchant = await storage.getMerchantByUserId(req.user.userId);
      if (!merchant) {
        return res.status(404).json({ message: "Merchant profile not found" });
      }

      const { customerId, points, description } = req.body;
      
      // Find customer in merchant's scanned customers list
      const merchantCustomer = await storage.getMerchantCustomer(req.user.userId, customerId);
      if (!merchantCustomer) {
        return res.status(404).json({ message: "Customer not found in your scanned customers list" });
      }

      // Get the main customer profile using the user ID from merchant customer relationship
      console.log(`🔍 Looking for customer profile with user ID: ${merchantCustomer.customerId}`);
      const customer = await storage.getCustomerProfile(merchantCustomer.customerId);
      if (!customer) {
        console.log(`❌ Customer profile not found for user ID: ${merchantCustomer.customerId}`);
        return res.status(404).json({ message: "Customer profile not found" });
      }
      console.log(`✅ Found customer profile: ${customer.fullName}`);

      // Customer profile found, proceed with point transfer

      // Check if merchant has enough points
      if (merchant.availablePoints < points) {
        return res.status(400).json({ message: "Insufficient points balance" });
      }

      // Create reward transaction
      const transaction = await storage.createRewardTransaction({
        userId: customer.userId,
        type: "transfer",
        amount: parseInt(points),
        description: description || `Points transfer from ${merchant.businessName}`,
        status: "completed"
      });

      // Update merchant points
      console.log(`💰 DEDUCTING POINTS FROM MERCHANT (rewards/send):`, {
        merchantId: req.user.userId,
        businessName: merchant.businessName,
        referredByMerchant: merchant.referredByMerchant || 'None (direct signup)',
        isReferred: !!merchant.referredByMerchant,
        currentLoyaltyPoints: merchant.loyaltyPointsBalance,
        currentAvailablePoints: merchant.availablePoints,
        pointsToDeduct: points,
        newLoyaltyPoints: (merchant.loyaltyPointsBalance || 0) - points,
        newAvailablePoints: merchant.availablePoints - points
      });
      
      await storage.updateMerchant(req.user.userId, {
        loyaltyPointsBalance: (merchant.loyaltyPointsBalance || 0) - points,
        availablePoints: merchant.availablePoints - points,
        totalPointsDistributed: (merchant.totalPointsDistributed || 0) + points
      });
      
      // Verify the update worked
      const updatedMerchant = await storage.getMerchantByUserId(req.user.userId);
      console.log(`✅ MERCHANT POINTS UPDATED (rewards/send):`, {
        businessName: updatedMerchant?.businessName,
        newLoyaltyPoints: updatedMerchant?.loyaltyPointsBalance,
        newAvailablePoints: updatedMerchant?.availablePoints
      });

      // Process affiliate commission if this merchant was referred
      try {
        console.log(`🔍 Processing affiliate commission for merchant rewards transfer...`);
        const { AffiliateCommissionService } = await import('./services/affiliate-commission-service');
        
        const clientIP = req.ip || req.connection.remoteAddress || 'unknown';
        const userAgent = req.get('User-Agent') || 'unknown';
        
        const commissionResult = await AffiliateCommissionService.processCommission(
          req.user.userId,
          parseInt(points),
          transaction.id,
          clientIP,
          userAgent
        );

        if (commissionResult.eligibleForCommission && commissionResult.commissionAmount > 0) {
          console.log(`💰 Affiliate commission processed: ${commissionResult.commissionAmount} awarded to merchant ${commissionResult.referringMerchantId}`);
        } else {
          console.log(`ℹ️ No affiliate commission applicable for this rewards transfer`);
        }
      } catch (commissionError) {
        console.error('⚠️ Error processing affiliate commission for rewards transfer:', commissionError);
        // Continue even if commission processing fails - the main point transfer succeeded
      }

      // Process 10% instant cashback
      const { InstantCashbackService } = await import('./services/InstantCashbackService');
      const cashbackService = new InstantCashbackService(storage);
      const cashbackResult = await cashbackService.processInstantCashback(
        merchant.id,
        customer.id,
        parseInt(points),
        transaction.id
      );

      if (cashbackResult.success) {
        console.log(`💰 Instant Cashback: ${cashbackResult.cashbackAmount} points awarded to merchant`);
      } else {
        console.error(`❌ Cashback Error: ${cashbackResult.error}`);
      }

      // Use the new Global Number system (this will handle all profile updates)
      console.log(`🔍 Calling GlobalNumberSystem with ${points} points`);
      const { globalNumberSystem } = await import('./services/GlobalNumberSystem');
      const result = await globalNumberSystem.checkAndAssignGlobalNumber(
        customer.userId, 
        parseInt(points), 
        false // These are earned points, not reward points
      );

      if (result.globalNumberAssigned) {
        console.log(`🎯 Global Number #${result.globalNumber} assigned to customer ${customer.fullName}`);
        
        // Award StepUp rewards if any
        for (const reward of result.stepUpRewards) {
          console.log(`🎁 StepUp Reward awarded: ${reward.rewardPoints} points to customer with Global #${reward.globalNumber}`);
        }
      }

      // Process all customer rewards (Infinity, Shopping Vouchers, Affiliate, Ripple)
      console.log(`🎁 Processing customer rewards for ${customer.fullName}`);
      const { CustomerRewardService } = await import('./services/CustomerRewardService');
      const rewardService = new CustomerRewardService(storage);
      
      try {
        // Process rewards based on customer's current status
        const rewardsResult = await rewardService.processPointsEarned(
          customer.userId,
          customer.id,
          parseInt(points),
          merchant.id
        );
        
        if (rewardsResult.infinityReward) {
          console.log(`💎 Infinity Reward: Cycle ${rewardsResult.infinityReward.cycle}, ${rewardsResult.infinityReward.points} points`);
        }
        if (rewardsResult.shoppingVouchers && rewardsResult.shoppingVouchers.length > 0) {
          console.log(`🎫 Shopping Vouchers distributed to ${rewardsResult.shoppingVouchers.length} merchants`);
        }
        if (rewardsResult.affiliateCommission) {
          console.log(`💰 Affiliate Commission: ${rewardsResult.affiliateCommission.amount} points`);
        }
        if (rewardsResult.rippleReward) {
          console.log(`🌊 Ripple Reward: ${rewardsResult.rippleReward.amount} points`);
        }
      } catch (rewardError) {
        console.error('⚠️ Error processing customer rewards:', rewardError);
        // Continue even if rewards fail - the main point transfer succeeded
      }

      res.json({ 
        message: "Points sent successfully", 
        transaction,
        newBalance: merchant.availablePoints - points
      });
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.post("/api/merchant/points/purchase", authenticateToken, authorizeRole(['merchant']), async (req, res) => {
    try {
      const merchant = await storage.getMerchantByUserId(req.user.userId);
      if (!merchant) {
        return res.status(404).json({ message: "Merchant profile not found" });
      }

      const { points, amount, paymentMethod } = req.body;
      
      // Create purchase transaction
      const transaction = await storage.createRewardTransaction({
        fromUserId: req.user.userId,
        toUserId: req.user.id,
        points: parseInt(points),
        type: "purchase",
        description: `Points purchase - ${points} points for $${amount}`,
        status: "completed"
      });

      // Update merchant points - keep both fields in sync
      await storage.updateMerchant(req.user.userId, {
        loyaltyPointsBalance: (merchant.loyaltyPointsBalance || 0) + points,
        availablePoints: (merchant.availablePoints || 0) + points,
        totalPointsPurchased: (merchant.totalPointsPurchased || 0) + points
      });

      res.json({ 
        message: "Points purchased successfully", 
        transaction,
        newBalance: (merchant.availablePoints || 0) + points
      });
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  // Merchant Wallet Management
  // Note: /api/merchant/wallet endpoint is handled by merchant-wallet-routes.ts
  // which uses the proper merchantWallets storage for instant cashback system

  app.post("/api/merchant/wallet/transfer", authenticateToken, authorizeRole(['merchant']), async (req, res) => {
    try {
      const merchant = await storage.getMerchantByUserId(req.user.userId);
      if (!merchant) {
        return res.status(404).json({ message: "Merchant profile not found" });
      }

      const { fromWallet, toWallet, amount } = req.body;
      
      // Apply 12.5% VAT & service charge when transferring from income wallet
      const finalAmount = fromWallet === 'income' ? amount * 0.875 : amount;

      // Create transaction record
      const transaction = await storage.createRewardTransaction({
        fromUserId: req.user.userId,
        toUserId: req.user.id,
        points: 0,
        type: "wallet_transfer",
        description: `Transfer from ${fromWallet} to ${toWallet} wallet - Amount: $${amount}`,
        status: "completed"
      });

      res.json({ 
        message: "Transfer completed successfully", 
        transaction,
        finalAmount,
        vatDeducted: fromWallet === 'income' ? amount * 0.125 : 0
      });
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.post("/api/merchant/wallet/withdraw", authenticateToken, authorizeRole(['merchant']), async (req, res) => {
    try {
      const merchant = await storage.getMerchantByUserId(req.user.userId);
      if (!merchant) {
        return res.status(404).json({ message: "Merchant profile not found" });
      }

      const { amount, paymentMethod, accountDetails } = req.body;
      
      if ((merchant.komarceBalance || 0) < amount) {
        return res.status(400).json({ message: "Insufficient balance" });
      }

      // Create withdrawal transaction
      const transaction = await storage.createRewardTransaction({
        fromUserId: req.user.userId,
        toUserId: req.user.id,
        points: 0,
        type: "withdrawal",
        description: `Withdrawal to ${paymentMethod} - Amount: $${amount}`,
        status: "pending"
      });

      // Update merchant balance
      await storage.updateMerchant(req.user.userId, {
        komarceBalance: (merchant.komarceBalance || 0) - amount,
        totalWithdrawn: (merchant.totalWithdrawn || 0) + amount
      });

      res.json({ 
        message: "Withdrawal request submitted successfully", 
        transaction,
        newBalance: (merchant.komarceBalance || 0) - amount
      });
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  // Merchant Customer Management
  app.get("/api/merchant/customers", authenticateToken, authorizeRole(['merchant']), async (req, res) => {
    try {
      const merchant = await storage.getMerchantByUserId(req.user.userId);
      if (!merchant) {
        return res.status(404).json({ message: "Merchant profile not found" });
      }

      // Get customers who have received points from this merchant
      const transactions = await storage.getRewardTransactions(req.user.id);
      const customerTransactions = transactions.filter(t => t.type === 'transfer' && t.fromUserId === req.user.id);
      
      // Get unique customer IDs
      const customerIds = [...new Set(customerTransactions.map(t => t.toUserId))];
      
      // Get customer details
      const customers = await Promise.all(
        customerIds.map(async (customerId) => {
          const user = await storage.getUser(customerId);
          const customer = await storage.getCustomerByUserId(customerId);
          const customerTrans = customerTransactions.filter(t => t.toUserId === customerId);
          const totalPoints = customerTrans.reduce((sum, t) => sum + t.points, 0);
          
          return {
            id: customer?.id,
            userId: customerId,
            name: `${user?.firstName} ${user?.lastName}`,
            email: user?.email,
            mobile: user?.phone,
            totalPoints: customer?.totalPoints || 0,
            pointsFromMerchant: totalPoints,
            hasRewardNumber: (customer?.accumulatedPoints || 0) >= 1500,
            registeredDate: user?.createdAt,
            status: 'active'
          };
        })
      );

      res.json(customers);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Merchant Marketing Tools
  app.get("/api/merchant/marketing/templates", authenticateToken, authorizeRole(['merchant']), async (req, res) => {
    try {
      const templates = [
        {
          id: "1",
          name: "Holyloy Loyalty Program",
          type: "banner",
          category: "loyalty",
          downloads: 3245,
          status: "active",
          thumbnailUrl: "/images/template1.jpg"
        },
        {
          id: "2", 
          name: "Point Rewards Available",
          type: "social",
          category: "rewards",
          downloads: 1749,
          status: "active",
          thumbnailUrl: "/images/template2.jpg"
        },
        {
          id: "3",
          name: "Cashback Offer",
          type: "flyer",
          category: "cashback", 
          downloads: 890,
          status: "new",
          thumbnailUrl: "/images/template3.jpg"
        }
      ];

      res.json(templates);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/merchant/marketing/download", authenticateToken, authorizeRole(['merchant']), async (req, res) => {
    try {
      const { templateId } = req.body;
      
      // Track download
      const transaction = await storage.createRewardTransaction({
        fromUserId: req.user.userId,
        toUserId: req.user.id,
        points: 0,
        type: "template_download",
        description: `Downloaded marketing template ${templateId}`,
        status: "completed"
      });

      res.json({ 
        message: "Template downloaded successfully",
        downloadUrl: `/api/merchant/marketing/templates/${templateId}/download`,
        transaction
      });
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  // Merchant Leaderboard
  app.get("/api/merchant/leaderboard", authenticateToken, authorizeRole(['merchant']), async (req, res) => {
    try {
      const { period = "this-month", metric = "points" } = req.query;
      
      // Get all merchants with their stats
      const merchants = await storage.getMerchants();
      
      const leaderboard = merchants.map((merchant, index) => ({
        rank: index + 1,
        merchantId: merchant.id,
        name: merchant.businessName,
        code: `M${String(index + 1).padStart(3, '0')}`,
        points: merchant.totalPointsDistributed || Math.floor(Math.random() * 20000),
        customers: Math.floor(Math.random() * 300) + 50,
        revenue: Math.floor(Math.random() * 50000) + 10000,
        tier: ["Co Founder", "Regional Manager", "Business Manager", "Super Star Merchant"][Math.floor(Math.random() * 4)]
      })).sort((a, b) => b.points - a.points);

      res.json(leaderboard);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Merchant Profile Management
  app.get("/api/merchant/profile", authenticateToken, authorizeRole(['merchant']), async (req, res) => {
    try {
      // Handle both userId and id fields from JWT token
      const userId = req.user.userId || req.user.id;
      console.log('🔍 Merchant profile debug:');
      console.log('  - req.user.userId:', req.user.userId);
      console.log('  - req.user.id:', req.user.id);
      console.log('  - Final userId:', userId);
      
      const user = await storage.getUser(userId);
      const merchant = await storage.getMerchantByUserId(userId);
      
      console.log('  - User found:', !!user);
      console.log('  - Merchant found:', !!merchant);
      if (merchant) {
        console.log('  - Merchant userId:', merchant.userId);
      }
      
      if (!user || !merchant) {
        return res.status(404).json({ message: "Profile not found" });
      }

      // Force fresh data by disabling caching
      res.set({
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      });

      res.json({
        user: { ...user, password: undefined },
        merchant,
        stats: {
          joinedDate: user.createdAt,
          totalPointsDistributed: merchant.totalPointsDistributed || 0,
          totalCustomers: 1, // This would be calculated from actual data
          currentTier: merchant.tier
        }
      });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.put("/api/merchant/profile", authenticateToken, authorizeRole(['merchant']), async (req, res) => {
    try {
      const { userInfo, merchantInfo } = req.body;
      
      let updatedUser, updatedMerchant;
      
      if (userInfo) {
        updatedUser = await storage.updateUser(req.user.id, userInfo);
      }
      
      if (merchantInfo) {
        updatedMerchant = await storage.updateMerchant(req.user.id, merchantInfo);
      }

      res.json({
        message: "Profile updated successfully",
        user: updatedUser ? { ...updatedUser, password: undefined } : undefined,
        merchant: updatedMerchant
      });
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  // Customer login route is handled in customer-routes.ts

  // Set up specialized route modules
  setupAdminRoutes(app);
  setupMerchantRoutes(app);
  setupChatRoutes(app);
  setupAffiliateRoutes(app);
  
  // Merchant wallet system routes
  app.use('/api/merchant', merchantWalletRoutes);
  
  // Merchant advanced features routes
  app.use('/api/merchant', merchantAdvancedRoutes);
  
  // Customer portal routes
  app.use('/api/customer', customerRoutes);
  
  // Customer wallet system routes
  app.use('/api/customer', customerWalletRoutes);
  
  // Customer reward system routes (StepUp, Infinity, Shopping Vouchers, Affiliate, Ripple)
  app.use('/api', customerRewardRoutes);
  
  // Customer infinity rewards routes
  app.use('/api/customer', (await import('./customer-infinity-routes')).default);
  
  // Customer shopping voucher routes
  app.use('/api/customer', (await import('./customer-shopping-voucher-routes')).default);
  
  // Customer affiliate rewards routes
  app.use('/api/customer', (await import('./customer-affiliate-routes')).default);
  
  // Customer ripple rewards routes
  app.use('/api/customer', (await import('./customer-ripple-routes')).default);
  

  
  // Merchant instant cashback routes
  app.use('/api/merchant', (await import('./merchant-cashback-api')).default);
  
  // Seed data route for development
  app.post('/api/admin/seed-data', async (req, res) => {
    try {
      const { seedTestData } = await import("./seed-data");
      const result = await seedTestData();
      res.json({ 
        message: "Test data seeded successfully", 
        data: result 
      });
    } catch (error: any) {
      console.error('Seed data error:', error);
      res.status(500).json({ message: error.message });
    }
  });

  // Route to remove KOMARCE users
  app.post('/api/admin/remove-komarce-users', async (req, res) => {
    try {
      const { removeKomarceUsers } = await import("./seed-data");
      await removeKomarceUsers();
      res.json({ 
        message: "KOMARCE users removed successfully"
      });
    } catch (error: any) {
      console.error('Remove KOMARCE users error:', error);
      res.status(500).json({ message: error.message });
    }
  });

  // Admin Portal API Routes
  
  // Admin login
  app.post('/api/admin/login', async (req, res) => {
    try {
      const { email, password, adminType } = req.body;
      
      const user = await storage.getUserByEmail(email);
      if (!user || !await bcrypt.compare(password, user.password)) {
        return res.status(401).json({ message: 'Invalid credentials' });
      }
      
      if (adminType === 'global' && user.role !== 'global_admin') {
        return res.status(403).json({ message: 'Not authorized as global admin' });
      }
      
      if (adminType === 'local' && user.role !== 'local_admin') {
        return res.status(403).json({ message: 'Not authorized as local admin' });
      }
      
      const token = jwt.sign(
        { userId: user.id, email: user.email, role: user.role },
        JWT_SECRET,
        { expiresIn: '24h' }
      );
      
      res.json({ user, token });
    } catch (error) {
      console.error('Admin login error:', error);
      res.status(500).json({ message: 'Login failed' });
    }
  });

  // Get admin profile
  app.get('/api/admin/profile', authenticateToken, authorizeRole(['global_admin', 'local_admin']), async (req, res) => {
    try {
      const admin = await storage.getAdmin(req.user.userId);
      if (!admin) {
        return res.status(404).json({ message: 'Admin profile not found' });
      }
      res.json(admin);
    } catch (error) {
      console.error('Get admin profile error:', error);
      res.status(500).json({ message: 'Failed to fetch admin profile' });
    }
  });

  // Get point distributions
  app.get('/api/admin/point-distributions', authenticateToken, authorizeRole(['global_admin', 'local_admin']), async (req, res) => {
    try {
      const distributions = await storage.getPointDistributions(req.user.userId);
      
      // Enhance with user details
      const enhancedDistributions = await Promise.all(distributions.map(async (dist) => {
        const fromUser = await storage.getUser(dist.fromUserId);
        const toUser = await storage.getUser(dist.toUserId);
        return {
          ...dist,
          fromUser: fromUser ? { firstName: fromUser.firstName, lastName: fromUser.lastName, email: fromUser.email } : null,
          toUser: toUser ? { firstName: toUser.firstName, lastName: toUser.lastName, email: toUser.email } : null
        };
      }));
      
      res.json(enhancedDistributions);
    } catch (error) {
      console.error('Get point distributions error:', error);
      res.status(500).json({ message: 'Failed to fetch point distributions' });
    }
  });

  // Generate points (Global Admin only)
  app.post('/api/admin/generate-points', authenticateToken, authorizeRole(['global_admin']), async (req, res) => {
    try {
      const { points, description } = req.body;
      
      if (!points || points <= 0) {
        return res.status(400).json({ message: 'Valid point amount required' });
      }

      // Find or create global admin profile
      let admin = await storage.getAdmin(req.user.userId);
      if (!admin) {
        // Create admin profile if it doesn't exist
        admin = await storage.createAdmin({
          userId: req.user.userId,
          adminType: 'global',
          country: 'GLOBAL',
          pointsBalance: 0,
          totalPointsReceived: 0,
          totalPointsDistributed: 0,
          isActive: true
        });
      }

      const newBalance = (admin.pointsBalance || 0) + points;
      await storage.updateAdmin(req.user.userId, {
        pointsBalance: newBalance,
        totalPointsReceived: (admin.totalPointsReceived || 0) + points
      });

      // Log the point generation transaction
      const transaction = await storage.createPointDistribution({
        fromUserId: req.user.userId,
        toUserId: req.user.userId, // Self-generation
        points: points,
        description: description || 'Points generated by Global Admin',
        distributionType: 'point_generation',
        status: 'completed'
      });

      res.json({ 
        message: 'Points generated successfully',
        newBalance: newBalance,
        pointsGenerated: points,
        transaction: transaction
      });
    } catch (error) {
      console.error('Generate points error:', error);
      res.status(500).json({ message: 'Failed to generate points' });
    }
  });

  // Get admin profile
  app.get('/api/admin/profile', authenticateToken, authorizeRole(['global_admin', 'local_admin']), async (req, res) => {
    try {
      let admin = await storage.getAdmin(req.user.userId);
      
      if (!admin && req.user.role === 'global_admin') {
        // Create admin profile if it doesn't exist for global admin
        admin = await storage.createAdmin({
          userId: req.user.userId,
          adminType: 'global',
          country: 'GLOBAL',
          pointsBalance: 0,
          totalPointsReceived: 0,
          totalPointsDistributed: 0,
          isActive: true
        });
      }
      
      res.json(admin || { pointsBalance: 0 });
    } catch (error) {
      console.error('Admin profile fetch error:', error);
      res.status(500).json({ message: 'Failed to fetch admin profile' });
    }
  });

  // Distribute points
  app.post('/api/admin/distribute-points', authenticateToken, authorizeRole(['global_admin', 'local_admin']), async (req, res) => {
    try {
      const { toUserId, points, description } = req.body;
      const pts = Number(points);
      const distributionData = insertPointDistributionSchema.parse({
        fromUserId: req.user.userId,
        toUserId,
        points,
        description,
        distributionType: req.user.role === 'global_admin' ? 'admin_to_admin' : 'admin_to_merchant',
        status: 'completed'
      });

      // Update sender points balance
      const senderAdmin = await storage.getAdmin(req.user.userId);
      if (!senderAdmin || senderAdmin.pointsBalance < pts) {
        return res.status(400).json({ message: 'Insufficient points balance' });
      }

      await storage.updateAdmin(req.user.userId, {
        pointsBalance: senderAdmin.pointsBalance - pts,
        totalPointsDistributed: (senderAdmin.totalPointsDistributed || 0) + pts
      });

      // Update receiver points balance
      if (req.user.role === 'global_admin') {
        // Distributing to local admin
        const receiverAdmin = await storage.getAdmin(toUserId);
        if (receiverAdmin) {
          await storage.updateAdmin(toUserId, {
            pointsBalance: (receiverAdmin.pointsBalance || 0) + pts,
            totalPointsReceived: (receiverAdmin.totalPointsReceived || 0) + pts
          });
        }
      } else {
        // Distributing to merchant
        const merchant = await storage.getMerchantByUserId(toUserId);
        if (merchant) {
          // updateMerchant expects a userId, not the merchant.id
          await storage.updateMerchant(toUserId, {
            // Keep both fields in sync so all endpoints/UIs reflect correctly
            loyaltyPointsBalance: (merchant.loyaltyPointsBalance || 0) + pts,
            availablePoints: (merchant.availablePoints || 0) + pts,
            totalPointsPurchased: (merchant.totalPointsPurchased || 0) + pts
          });
        }
      }

      const distribution = await storage.createPointDistribution({
        ...distributionData,
        points: pts
      });
      res.json(distribution);
    } catch (error) {
      console.error('Distribute points error:', error);
      res.status(500).json({ message: 'Failed to distribute points' });
    }
  });

  // Get admins list (global admin only)
  app.get('/api/admin/admins', authenticateToken, authorizeRole(['global_admin']), async (req, res) => {
    try {
      const localAdmins = await storage.getAdminsByType('local');
      
      // Enhance with user details
      const enhancedAdmins = await Promise.all(localAdmins.map(async (admin) => {
        const user = await storage.getUser(admin.userId);
        return {
          ...admin,
          user: user ? { firstName: user.firstName, lastName: user.lastName, email: user.email } : null
        };
      }));
      
      res.json(enhancedAdmins);
    } catch (error) {
      console.error('Get admins error:', error);
      res.status(500).json({ message: 'Failed to fetch admins' });
    }
  });

  // Get merchants list
  app.get('/api/admin/merchants', authenticateToken, authorizeRole(['global_admin', 'local_admin']), async (req, res) => {
    try {
      const merchants = await storage.getMerchants();
      
      // Filter by country for local admin
      let filteredMerchants = merchants;
      if (req.user.role === 'local_admin') {
        const currentUser = await storage.getUser(req.user.userId);
        filteredMerchants = [];
        for (const merchant of merchants) {
          const user = await storage.getUser(merchant.userId);
          if (user?.country === currentUser?.country) {
            filteredMerchants.push(merchant);
          }
        }
      }
      
      // Enhance with user details
      const enhancedMerchants = [];
      for (const merchant of filteredMerchants) {
        const user = await storage.getUser(merchant.userId);
        enhancedMerchants.push({
          ...merchant,
          user: user ? { firstName: user.firstName, lastName: user.lastName, email: user.email, country: user.country } : null
        });
      }
      
      res.json(enhancedMerchants);
    } catch (error) {
      console.error('Get merchants error:', error);
      res.status(500).json({ message: 'Failed to fetch merchants' });
    }
  });

  // Get chat users
  app.get('/api/admin/chat-users', authenticateToken, async (req, res) => {
    try {
      const users = await storage.getChatUsers(req.user.userId);
      res.json(users);
    } catch (error) {
      console.error('Get chat users error:', error);
      res.status(500).json({ message: 'Failed to fetch chat users' });
    }
  });

  // Send message
  app.post('/api/admin/send-message', authenticateToken, async (req, res) => {
    try {
      const { receiverId, message } = req.body;
      const messageData = insertChatMessageSchema.parse({
        senderId: req.user.userId,
        receiverId,
        message,
        messageType: 'text'
      });

      const newMessage = await storage.createChatMessage(messageData);
      
      // Note: WebSocket will be handled by the socket.io server
      
      res.json(newMessage);
    } catch (error) {
      console.error('Send message error:', error);
      res.status(500).json({ message: 'Failed to send message' });
    }
  });

  // Get chat messages
  app.get('/api/admin/chat-messages/:receiverId', authenticateToken, async (req, res) => {
    try {
      const { receiverId } = req.params;
      const messages = await storage.getChatMessages(req.user.userId, receiverId);
      res.json(messages);
    } catch (error) {
      console.error('Get chat messages error:', error);
      res.status(500).json({ message: 'Failed to fetch chat messages' });
    }
  });

  // Create HTTP server and WebSocket server
  const httpServer = createServer(app);
  
  // Initialize Socket.IO with the correct path
  const io = new SocketIOServer(httpServer, {
    path: '/ws',
    cors: {
      origin: "*",
      methods: ["GET", "POST"]
    }
  });

  // Enhanced WebSocket connection handling with proper typing
  const connectedUsers = new Map<string, string>();
  
  interface AuthenticatedSocket extends SocketIOSocket {
    userId?: string;
    userRole?: string;
  }
  
  io.on('connection', (socket: AuthenticatedSocket) => {
    console.log('User connected:', socket.id);
    
    // Handle user authentication
    socket.on('authenticate', async (data: { userId?: string; token?: string }) => {
      try {
        const { userId, token } = data;
        
        if (token) {
          const decoded = jwt.verify(token, JWT_SECRET) as any;
          socket.userId = decoded.userId;
          socket.userRole = decoded.role;
        } else if (userId) {
          socket.userId = userId;
        }
        
        if (socket.userId) {
          socket.join(socket.userId);
          connectedUsers.set(socket.userId, socket.id);
          console.log(`User ${socket.userId} authenticated and joined room`);
          socket.emit('authenticated', { userId: socket.userId, role: socket.userRole });
        }
      } catch (error) {
        console.error('Socket authentication error:', error);
        socket.emit('authError', { error: 'Authentication failed' });
      }
    });

    // Handle sending messages with enhanced features
    socket.on('sendMessage', async (data: { receiverId: string; message: string; conversationId?: string }) => {
      try {
        const { receiverId, message, conversationId } = data;
        
        if (!socket.userId) {
          socket.emit('messageError', { error: 'Not authenticated' });
          return;
        }
        
        if (!receiverId || !message?.trim()) {
          socket.emit('messageError', { error: 'Invalid message data' });
          return;
        }
        
        const messageData = {
          senderId: socket.userId,
          receiverId,
          message: message.trim(),
          messageType: 'text' as const,
          isRead: false
        };

        const newMessage = await storage.createChatMessage(messageData);
        
        // Get sender info for enhanced message display
        const sender = await storage.getUser(socket.userId);
        const enhancedMessage = {
          ...newMessage,
          senderName: sender ? `${sender.firstName} ${sender.lastName}` : 'Unknown User',
          senderRole: sender?.role
        };
        
        // Send to receiver if online
        io.to(receiverId).emit('newMessage', enhancedMessage);
        
        // Confirm to sender
        socket.emit('messageConfirmed', enhancedMessage);
        
        console.log(`Message sent: ${socket.userId} -> ${receiverId}`);
        
      } catch (error) {
        console.error('Socket message error:', error);
        socket.emit('messageError', { error: 'Failed to send message' });
      }
    });

    // Handle typing indicators
    socket.on('typing', (data: { receiverId: string; isTyping: boolean }) => {
      const { receiverId, isTyping } = data;
      if (socket.userId && receiverId) {
        io.to(receiverId).emit('userTyping', {
          senderId: socket.userId,
          isTyping: isTyping || false
        });
      }
    });

    // Handle message read status
    socket.on('markAsRead', async (data: { messageId: string }) => {
      try {
        const { messageId } = data;
        if (messageId && socket.userId) {
          await storage.updateChatMessage(messageId, { isRead: true });
          
          const message = await storage.getChatMessage(messageId);
          if (message) {
            io.to(message.senderId).emit('messageRead', { 
              messageId, 
              readBy: socket.userId 
            });
          }
        }
      } catch (error) {
        console.error('Mark as read error:', error);
      }
    });

    // Get online users
    socket.on('getOnlineUsers', () => {
      const onlineUsers = Array.from(connectedUsers.keys());
      socket.emit('onlineUsers', onlineUsers);
    });

    // Handle disconnect
    socket.on('disconnect', () => {
      console.log('User disconnected:', socket.id);
      if (socket.userId) {
        connectedUsers.delete(socket.userId);
        socket.broadcast.emit('userOffline', socket.userId);
      }
    });
  });

  // Make io available globally for admin routes
  (global as any).socketIO = io;

  return httpServer;
}

// Export Socket.IO instance for external use
export let io: SocketIOServer;
