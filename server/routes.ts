import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertUserSchema, insertProductSchema, insertOrderSchema, insertRewardTransactionSchema } from "@shared/schema";
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
  // Authentication routes
  app.post("/api/auth/register", async (req, res) => {
    try {
      const userData = insertUserSchema.parse(req.body);
      
      // Check if user already exists
      const existingUser = await storage.getUserByEmail(userData.email);
      if (existingUser) {
        return res.status(400).json({ message: "User already exists" });
      }

      // Hash password
      userData.password = await bcrypt.hash(userData.password, 10);
      
      // Create user
      const user = await storage.createUser(userData);

      // Create customer or merchant profile based on role
      if (user.role === 'customer') {
        await storage.createCustomer({
          userId: user.id,
          totalPoints: 0,
          accumulatedPoints: 0
        });
      } else if (user.role === 'merchant') {
        await storage.createMerchant({
          userId: user.id,
          businessName: req.body.businessName || `${user.firstName}'s Store`,
          tier: "merchant"
        });
      }

      // Generate token
      const token = jwt.sign(
        { id: user.id, email: user.email, role: user.role }, 
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
        { id: user.id, email: user.email, role: user.role }, 
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
      const user = await storage.getUser(req.user.id);
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

  // Products
  app.get("/api/products", async (req, res) => {
    try {
      const { categoryId, brandId, merchantId, search } = req.query;
      const products = await storage.getProducts({
        categoryId: categoryId as string,
        brandId: brandId as string,
        merchantId: merchantId as string,
        search: search as string
      });

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
        const merchant = await storage.getMerchantByUserId(req.user.id);
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
        const merchant = await storage.getMerchantByUserId(req.user.id);
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
      const merchant = await storage.getMerchantByUserId(req.user.id);
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

  // Merchant Rewards Management
  app.post("/api/merchant/rewards/send", authenticateToken, authorizeRole(['merchant']), async (req, res) => {
    try {
      const merchant = await storage.getMerchantByUserId(req.user.id);
      if (!merchant) {
        return res.status(404).json({ message: "Merchant profile not found" });
      }

      const { customerEmail, points, description } = req.body;
      
      // Find customer by email
      const customerUser = await storage.getUserByEmail(customerEmail);
      if (!customerUser || customerUser.role !== 'customer') {
        return res.status(404).json({ message: "Customer not found" });
      }

      const customer = await storage.getCustomerByUserId(customerUser.id);
      if (!customer) {
        return res.status(404).json({ message: "Customer profile not found" });
      }

      // Check if merchant has enough points
      if (merchant.availablePoints < points) {
        return res.status(400).json({ message: "Insufficient points balance" });
      }

      // Create reward transaction
      const transaction = await storage.createRewardTransaction({
        fromUserId: req.user.id,
        toUserId: customerUser.id,
        points: parseInt(points),
        type: "transfer",
        description: description || `Points transfer from ${merchant.businessName}`,
        status: "completed"
      });

      // Update merchant points
      await storage.updateMerchant(req.user.id, {
        availablePoints: merchant.availablePoints - points,
        totalPointsDistributed: (merchant.totalPointsDistributed || 0) + points
      });

      // Update customer points
      await storage.updateCustomer(customerUser.id, {
        totalPoints: customer.totalPoints + points,
        accumulatedPoints: customer.accumulatedPoints + points
      });

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
      const merchant = await storage.getMerchantByUserId(req.user.id);
      if (!merchant) {
        return res.status(404).json({ message: "Merchant profile not found" });
      }

      const { points, amount, paymentMethod } = req.body;
      
      // Create purchase transaction
      const transaction = await storage.createRewardTransaction({
        fromUserId: req.user.id,
        toUserId: req.user.id,
        points: parseInt(points),
        type: "purchase",
        description: `Points purchase - ${points} points for $${amount}`,
        status: "completed"
      });

      // Update merchant points
      await storage.updateMerchant(req.user.id, {
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
  app.get("/api/merchant/wallets", authenticateToken, authorizeRole(['merchant']), async (req, res) => {
    try {
      const merchant = await storage.getMerchantByUserId(req.user.id);
      if (!merchant) {
        return res.status(404).json({ message: "Merchant profile not found" });
      }

      res.json({
        rewardPointWallet: {
          availablePoints: merchant.availablePoints || 0,
          totalPurchased: merchant.totalPointsPurchased || 0,
          totalDistributed: merchant.totalPointsDistributed || 0
        },
        incomeWallet: {
          instantCashback: merchant.instantCashback || 0,
          referralCommission: merchant.referralCommission || 0,
          royaltyBonus: merchant.royaltyBonus || 0,
          totalIncome: (merchant.instantCashback || 0) + (merchant.referralCommission || 0) + (merchant.royaltyBonus || 0)
        },
        komarceWallet: {
          balance: merchant.komarceBalance || 500,
          totalReceived: merchant.totalReceived || 0,
          totalWithdrawn: merchant.totalWithdrawn || 0
        }
      });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/merchant/wallet/transfer", authenticateToken, authorizeRole(['merchant']), async (req, res) => {
    try {
      const merchant = await storage.getMerchantByUserId(req.user.id);
      if (!merchant) {
        return res.status(404).json({ message: "Merchant profile not found" });
      }

      const { fromWallet, toWallet, amount } = req.body;
      
      // Apply 12.5% VAT & service charge when transferring from income wallet
      const finalAmount = fromWallet === 'income' ? amount * 0.875 : amount;

      // Create transaction record
      const transaction = await storage.createRewardTransaction({
        fromUserId: req.user.id,
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
      const merchant = await storage.getMerchantByUserId(req.user.id);
      if (!merchant) {
        return res.status(404).json({ message: "Merchant profile not found" });
      }

      const { amount, paymentMethod, accountDetails } = req.body;
      
      if ((merchant.komarceBalance || 0) < amount) {
        return res.status(400).json({ message: "Insufficient balance" });
      }

      // Create withdrawal transaction
      const transaction = await storage.createRewardTransaction({
        fromUserId: req.user.id,
        toUserId: req.user.id,
        points: 0,
        type: "withdrawal",
        description: `Withdrawal to ${paymentMethod} - Amount: $${amount}`,
        status: "pending"
      });

      // Update merchant balance
      await storage.updateMerchant(req.user.id, {
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
      const merchant = await storage.getMerchantByUserId(req.user.id);
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
            mobile: user?.mobile,
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
          name: "KOMARCE Loyalty Program",
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
        fromUserId: req.user.id,
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
      const user = await storage.getUser(req.user.id);
      const merchant = await storage.getMerchantByUserId(req.user.id);
      
      if (!user || !merchant) {
        return res.status(404).json({ message: "Profile not found" });
      }

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

  const httpServer = createServer(app);
  return httpServer;
}
