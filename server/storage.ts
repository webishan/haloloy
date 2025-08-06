import { 
  type User, type InsertUser, type Customer, type InsertCustomer,
  type Merchant, type InsertMerchant, type Product, type InsertProduct,
  type Category, type InsertCategory, type Brand, type InsertBrand,
  type Order, type InsertOrder, type RewardTransaction, type InsertRewardTransaction,
  type RewardNumber, type InsertRewardNumber, type CartItem, type InsertCartItem,
  type WishlistItem, type InsertWishlistItem, type Review, type InsertReview
} from "@shared/schema";
import { randomUUID } from "crypto";
import bcrypt from "bcryptjs";

export interface IStorage {
  // User management
  getUser(id: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: string, user: Partial<User>): Promise<User>;
  
  // Customer management
  getCustomer(userId: string): Promise<Customer | undefined>;
  getCustomerByUserId(userId: string): Promise<Customer | undefined>;
  createCustomer(customer: InsertCustomer): Promise<Customer>;
  updateCustomer(userId: string, customer: Partial<Customer>): Promise<Customer>;
  getCustomers(country?: string): Promise<Customer[]>;
  
  // Merchant management  
  getMerchant(userId: string): Promise<Merchant | undefined>;
  getMerchantByUserId(userId: string): Promise<Merchant | undefined>;
  createMerchant(merchant: InsertMerchant): Promise<Merchant>;
  updateMerchant(userId: string, merchant: Partial<Merchant>): Promise<Merchant>;
  getMerchants(country?: string): Promise<Merchant[]>;
  
  // Category management
  getCategories(): Promise<Category[]>;
  getCategory(id: string): Promise<Category | undefined>;
  createCategory(category: InsertCategory): Promise<Category>;
  updateCategory(id: string, category: Partial<Category>): Promise<Category>;
  
  // Brand management
  getBrands(): Promise<Brand[]>;
  getBrand(id: string): Promise<Brand | undefined>;
  createBrand(brand: InsertBrand): Promise<Brand>;
  
  // Product management
  getProducts(filters?: { categoryId?: string; brandId?: string; merchantId?: string; search?: string }): Promise<Product[]>;
  getProduct(id: string): Promise<Product | undefined>;
  getProductBySlug(slug: string): Promise<Product | undefined>;
  createProduct(product: InsertProduct): Promise<Product>;
  updateProduct(id: string, product: Partial<Product>): Promise<Product>;
  deleteProduct(id: string): Promise<void>;
  
  // Order management
  getOrders(customerId?: string, merchantId?: string): Promise<Order[]>;
  getOrder(id: string): Promise<Order | undefined>;
  createOrder(order: InsertOrder): Promise<Order>;
  updateOrder(id: string, order: Partial<Order>): Promise<Order>;
  
  // Reward system
  getRewardTransactions(userId: string): Promise<RewardTransaction[]>;
  createRewardTransaction(transaction: InsertRewardTransaction): Promise<RewardTransaction>;
  getRewardNumbers(customerId: string): Promise<RewardNumber[]>;
  createRewardNumber(rewardNumber: InsertRewardNumber): Promise<RewardNumber>;
  updateRewardNumber(id: string, rewardNumber: Partial<RewardNumber>): Promise<RewardNumber>;
  
  // Cart management
  getCartItems(customerId: string): Promise<CartItem[]>;
  addToCart(cartItem: InsertCartItem): Promise<CartItem>;
  updateCartItem(id: string, quantity: number): Promise<CartItem>;
  removeFromCart(id: string): Promise<void>;
  clearCart(customerId: string): Promise<void>;
  
  // Wishlist management
  getWishlistItems(customerId: string): Promise<WishlistItem[]>;
  addToWishlist(wishlistItem: InsertWishlistItem): Promise<WishlistItem>;
  removeFromWishlist(id: string): Promise<void>;
  
  // Review management
  getReviews(productId: string): Promise<Review[]>;
  createReview(review: InsertReview): Promise<Review>;
  
  // Analytics
  getGlobalStats(): Promise<any>;
  getCountryStats(country: string): Promise<any>;
}

export class MemStorage implements IStorage {
  private users: Map<string, User> = new Map();
  private customers: Map<string, Customer> = new Map();
  private merchants: Map<string, Merchant> = new Map();
  private categories: Map<string, Category> = new Map();
  private brands: Map<string, Brand> = new Map();
  private products: Map<string, Product> = new Map();
  private orders: Map<string, Order> = new Map();
  private rewardTransactions: Map<string, RewardTransaction> = new Map();
  private rewardNumbers: Map<string, RewardNumber> = new Map();
  private cartItems: Map<string, CartItem> = new Map();
  private wishlistItems: Map<string, WishlistItem> = new Map();
  private reviews: Map<string, Review> = new Map();

  constructor() {
    this.initializeData();
  }

  private async initializeData() {
    // Create sample categories
    const categories = [
      { name: "Electronics", slug: "electronics", icon: "smartphone" },
      { name: "Fashion", slug: "fashion", icon: "shirt" },
      { name: "Home & Living", slug: "home-living", icon: "home" },
      { name: "Food & Drink", slug: "food-drink", icon: "utensils" },
      { name: "Health & Beauty", slug: "health-beauty", icon: "heart" },
      { name: "Sports & Toys", slug: "sports-toys", icon: "gamepad-2" },
      { name: "Automotive", slug: "automotive", icon: "car" }
    ];

    for (const cat of categories) {
      await this.createCategory({ ...cat, description: `${cat.name} products`, isActive: true });
    }

    // Create sample brands
    const brands = [
      { name: "Samsung", slug: "samsung" },
      { name: "Apple", slug: "apple" },
      { name: "Nike", slug: "nike" },
      { name: "Uniqlo", slug: "uniqlo" },
      { name: "L'Oréal", slug: "loreal" },
      { name: "Sony", slug: "sony" }
    ];

    for (const brand of brands) {
      await this.createBrand({ ...brand, description: `${brand.name} products`, isActive: true });
    }

    // Create admin user
    const adminUser = await this.createUser({
      username: "admin",
      email: "admin@komarce.com",
      password: await bcrypt.hash("admin123", 10),
      firstName: "Admin",
      lastName: "User",
      role: "admin",
      country: "BD",
      isActive: true
    });

    // Create sample merchant users
    const merchant1 = await this.createUser({
      username: "techstore",
      email: "merchant@techstore.com",
      password: await bcrypt.hash("merchant123", 10),
      firstName: "Tech",
      lastName: "Store",
      role: "merchant",
      country: "BD",
      isActive: true
    });

    const merchant2 = await this.createUser({
      username: "fashionhub",
      email: "merchant@fashionhub.com",
      password: await bcrypt.hash("merchant123", 10),
      firstName: "Fashion",
      lastName: "Hub",
      role: "merchant",
      country: "MY",
      isActive: true
    });

    // Create merchant profiles
    await this.createMerchant({
      userId: merchant1.id,
      businessName: "TechStore Electronics",
      businessType: "Electronics Retailer",
      tier: "Double Star"
    });

    await this.createMerchant({
      userId: merchant2.id,
      businessName: "Fashion Hub Malaysia",
      businessType: "Fashion Retailer", 
      tier: "Star"
    });

    // Create sample products
    const electronicsCategory = await this.getCategories();
    const fashionCategory = electronicsCategory.find(c => c.slug === 'fashion');
    const electronicsCat = electronicsCategory.find(c => c.slug === 'electronics');
    const samsungBrand = await this.getBrands();
    const appleBrand = samsungBrand.find(b => b.slug === 'apple');
    const samsung = samsungBrand.find(b => b.slug === 'samsung');
    const nike = samsungBrand.find(b => b.slug === 'nike');

    const sampleProducts = [
      {
        name: "Samsung Galaxy S24 Ultra",
        description: "Latest flagship smartphone with AI features and S Pen",
        price: "1299.00",
        originalPrice: "1499.00",
        sku: "SGS24U-512",
        stock: 25,
        categoryId: electronicsCat?.id || "",
        brandId: samsung?.id || "",
        merchantId: merchant1.id,
        pointsReward: 130,
        images: ["https://images.unsplash.com/photo-1511707171634-5f897ff02aa9"],
        isActive: true
      },
      {
        name: "iPhone 15 Pro Max",
        description: "Apple's most advanced iPhone with titanium design",
        price: "1199.00", 
        originalPrice: "1299.00",
        sku: "IP15PM-256",
        stock: 15,
        categoryId: electronicsCat?.id || "",
        brandId: appleBrand?.id || "",
        merchantId: merchant1.id,
        pointsReward: 120,
        images: ["https://images.unsplash.com/photo-1592750475338-74b7b21085ab"],
        isActive: true
      },
      {
        name: "Nike Air Max 90",
        description: "Classic Nike sneakers with comfortable cushioning",
        price: "120.00",
        originalPrice: "150.00", 
        sku: "NAM90-10",
        stock: 50,
        categoryId: fashionCategory?.id || "",
        brandId: nike?.id || "",
        merchantId: merchant2.id,
        pointsReward: 12,
        images: ["https://images.unsplash.com/photo-1542291026-7eec264c27ff"],
        isActive: true
      },
      {
        name: "Samsung 4K Smart TV 65\"",
        description: "Crystal UHD 4K Smart TV with Tizen OS",
        price: "799.00",
        originalPrice: "999.00",
        sku: "SST65-4K",
        stock: 10,
        categoryId: electronicsCat?.id || "",
        brandId: samsung?.id || "",
        merchantId: merchant1.id,
        pointsReward: 80,
        images: ["https://images.unsplash.com/photo-1593359677879-a4bb92f829d1"],
        isActive: true
      }
    ];

    for (const product of sampleProducts) {
      await this.createProduct({
        ...product,
        slug: product.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
      });
    }
  }

  // User methods
  async getUser(id: string): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(user => user.email === email);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(user => user.username === username);
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = randomUUID();
    const user: User = { 
      ...insertUser, 
      id, 
      createdAt: new Date(),
      isActive: insertUser.isActive ?? true 
    };
    this.users.set(id, user);
    return user;
  }

  async updateUser(id: string, userUpdate: Partial<User>): Promise<User> {
    const user = this.users.get(id);
    if (!user) throw new Error("User not found");
    
    const updatedUser = { ...user, ...userUpdate };
    this.users.set(id, updatedUser);
    return updatedUser;
  }

  // Customer methods
  async getCustomer(userId: string): Promise<Customer | undefined> {
    return Array.from(this.customers.values()).find(customer => customer.userId === userId);
  }

  async getCustomerByUserId(userId: string): Promise<Customer | undefined> {
    return Array.from(this.customers.values()).find(customer => customer.userId === userId);
  }

  async createCustomer(insertCustomer: InsertCustomer): Promise<Customer> {
    const id = randomUUID();
    const customer: Customer = { 
      id, 
      createdAt: new Date(),
      userId: insertCustomer.userId,
      totalPoints: insertCustomer.totalPoints || 0,
      accumulatedPoints: insertCustomer.accumulatedPoints || 0,
      currentTier: insertCustomer.currentTier || null,
      globalRewardNumbers: insertCustomer.globalRewardNumbers || 0,
      localRewardNumbers: insertCustomer.localRewardNumbers || 0,
      tierProgress: insertCustomer.tierProgress || 0,
      pointsBalance: insertCustomer.pointsBalance || 0,
      lastTransactionDate: insertCustomer.lastTransactionDate || null,
      preferredCategories: insertCustomer.preferredCategories || null,
      loyaltyLevel: insertCustomer.loyaltyLevel || null,
      lastLoginDate: insertCustomer.lastLoginDate || null,
      referralCode: `KC${Math.random().toString(36).substr(2, 8).toUpperCase()}`
    };
    this.customers.set(id, customer);
    return customer;
  }

  async updateCustomer(userId: string, customerUpdate: Partial<Customer>): Promise<Customer> {
    const customer = Array.from(this.customers.values()).find(c => c.userId === userId);
    if (!customer) throw new Error("Customer not found");
    
    const updatedCustomer = { ...customer, ...customerUpdate };
    this.customers.set(customer.id, updatedCustomer);
    return updatedCustomer;
  }

  async getCustomers(country?: string): Promise<Customer[]> {
    let customers = Array.from(this.customers.values());
    if (country) {
      const userIds = Array.from(this.users.values())
        .filter(user => user.country === country && user.role === 'customer')
        .map(user => user.id);
      customers = customers.filter(customer => userIds.includes(customer.userId));
    }
    return customers;
  }

  // Merchant methods
  async getMerchant(userId: string): Promise<Merchant | undefined> {
    return Array.from(this.merchants.values()).find(merchant => merchant.userId === userId);
  }

  async getMerchantByUserId(userId: string): Promise<Merchant | undefined> {
    return Array.from(this.merchants.values()).find(merchant => merchant.userId === userId);
  }

  async createMerchant(insertMerchant: InsertMerchant): Promise<Merchant> {
    const id = randomUUID();
    const merchant: Merchant = { 
      id, 
      createdAt: new Date(),
      userId: insertMerchant.userId,
      businessName: insertMerchant.businessName,
      businessType: insertMerchant.businessType || null,
      tier: insertMerchant.tier || 'Star',
      isActive: insertMerchant.isActive !== undefined ? insertMerchant.isActive : true,
      totalOrders: insertMerchant.totalOrders || 0,
      totalSales: insertMerchant.totalSales || '0.00',
      totalCashback: insertMerchant.totalCashback || '0.00',
      loyaltyPointsBalance: insertMerchant.loyaltyPointsBalance || 0,
      productCount: insertMerchant.productCount || 0
    };
    this.merchants.set(id, merchant);
    return merchant;
  }

  async updateMerchant(userId: string, merchantUpdate: Partial<Merchant>): Promise<Merchant> {
    const merchant = Array.from(this.merchants.values()).find(m => m.userId === userId);
    if (!merchant) throw new Error("Merchant not found");
    
    const updatedMerchant = { ...merchant, ...merchantUpdate };
    this.merchants.set(merchant.id, updatedMerchant);
    return updatedMerchant;
  }

  async getMerchants(country?: string): Promise<Merchant[]> {
    let merchants = Array.from(this.merchants.values());
    if (country) {
      const userIds = Array.from(this.users.values())
        .filter(user => user.country === country && user.role === 'merchant')
        .map(user => user.id);
      merchants = merchants.filter(merchant => userIds.includes(merchant.userId));
    }
    return merchants;
  }

  // Category methods
  async getCategories(): Promise<Category[]> {
    return Array.from(this.categories.values()).filter(cat => cat.isActive);
  }

  async getCategory(id: string): Promise<Category | undefined> {
    return this.categories.get(id);
  }

  async createCategory(insertCategory: InsertCategory): Promise<Category> {
    const id = randomUUID();
    const category: Category = { 
      ...insertCategory, 
      id, 
      createdAt: new Date()
    };
    this.categories.set(id, category);
    return category;
  }

  async updateCategory(id: string, categoryUpdate: Partial<Category>): Promise<Category> {
    const category = this.categories.get(id);
    if (!category) throw new Error("Category not found");
    
    const updatedCategory = { ...category, ...categoryUpdate };
    this.categories.set(id, updatedCategory);
    return updatedCategory;
  }

  // Brand methods
  async getBrands(): Promise<Brand[]> {
    return Array.from(this.brands.values()).filter(brand => brand.isActive);
  }

  async getBrand(id: string): Promise<Brand | undefined> {
    return this.brands.get(id);
  }

  async createBrand(insertBrand: InsertBrand): Promise<Brand> {
    const id = randomUUID();
    const brand: Brand = { 
      ...insertBrand, 
      id, 
      createdAt: new Date()
    };
    this.brands.set(id, brand);
    return brand;
  }

  // Product methods
  async getProducts(filters?: { categoryId?: string; brandId?: string; merchantId?: string; search?: string }): Promise<Product[]> {
    let products = Array.from(this.products.values()).filter(product => product.isActive);
    
    if (filters?.categoryId) {
      products = products.filter(product => product.categoryId === filters.categoryId);
    }
    if (filters?.brandId) {
      products = products.filter(product => product.brandId === filters.brandId);
    }
    if (filters?.merchantId) {
      products = products.filter(product => product.merchantId === filters.merchantId);
    }
    if (filters?.search) {
      const search = filters.search.toLowerCase();
      products = products.filter(product => 
        product.name.toLowerCase().includes(search) || 
        product.description?.toLowerCase().includes(search)
      );
    }
    
    return products;
  }

  async getProduct(id: string): Promise<Product | undefined> {
    return this.products.get(id);
  }

  async getProductBySlug(slug: string): Promise<Product | undefined> {
    return Array.from(this.products.values()).find(product => product.slug === slug);
  }

  async createProduct(insertProduct: InsertProduct): Promise<Product> {
    const id = randomUUID();
    const product: Product = { 
      ...insertProduct, 
      id, 
      createdAt: new Date()
    };
    this.products.set(id, product);
    return product;
  }

  async updateProduct(id: string, productUpdate: Partial<Product>): Promise<Product> {
    const product = this.products.get(id);
    if (!product) throw new Error("Product not found");
    
    const updatedProduct = { ...product, ...productUpdate };
    this.products.set(id, updatedProduct);
    return updatedProduct;
  }

  async deleteProduct(id: string): Promise<void> {
    this.products.delete(id);
  }

  // Order methods
  async getOrders(customerId?: string, merchantId?: string): Promise<Order[]> {
    let orders = Array.from(this.orders.values());
    
    if (customerId) {
      orders = orders.filter(order => order.customerId === customerId);
    }
    if (merchantId) {
      orders = orders.filter(order => order.merchantId === merchantId);
    }
    
    return orders.sort((a, b) => new Date(b.createdAt!).getTime() - new Date(a.createdAt!).getTime());
  }

  async getOrder(id: string): Promise<Order | undefined> {
    return this.orders.get(id);
  }

  async createOrder(insertOrder: InsertOrder): Promise<Order> {
    const id = randomUUID();
    const order: Order = { 
      ...insertOrder, 
      id, 
      createdAt: new Date()
    };
    this.orders.set(id, order);

    // Process rewards
    await this.processOrderRewards(order);
    
    return order;
  }

  async updateOrder(id: string, orderUpdate: Partial<Order>): Promise<Order> {
    const order = this.orders.get(id);
    if (!order) throw new Error("Order not found");
    
    const updatedOrder = { ...order, ...orderUpdate };
    this.orders.set(id, updatedOrder);
    return updatedOrder;
  }

  // Reward system methods
  async getRewardTransactions(userId: string): Promise<RewardTransaction[]> {
    return Array.from(this.rewardTransactions.values())
      .filter(transaction => transaction.userId === userId)
      .sort((a, b) => new Date(b.createdAt!).getTime() - new Date(a.createdAt!).getTime());
  }

  async createRewardTransaction(insertTransaction: InsertRewardTransaction): Promise<RewardTransaction> {
    const id = randomUUID();
    const transaction: RewardTransaction = { 
      ...insertTransaction, 
      id, 
      createdAt: new Date()
    };
    this.rewardTransactions.set(id, transaction);
    return transaction;
  }

  async getRewardNumbers(customerId: string): Promise<RewardNumber[]> {
    return Array.from(this.rewardNumbers.values())
      .filter(rewardNumber => rewardNumber.customerId === customerId);
  }

  async createRewardNumber(insertRewardNumber: InsertRewardNumber): Promise<RewardNumber> {
    const id = randomUUID();
    const rewardNumber: RewardNumber = { 
      ...insertRewardNumber, 
      id, 
      createdAt: new Date()
    };
    this.rewardNumbers.set(id, rewardNumber);
    return rewardNumber;
  }

  async updateRewardNumber(id: string, rewardNumberUpdate: Partial<RewardNumber>): Promise<RewardNumber> {
    const rewardNumber = this.rewardNumbers.get(id);
    if (!rewardNumber) throw new Error("Reward number not found");
    
    const updatedRewardNumber = { ...rewardNumber, ...rewardNumberUpdate };
    this.rewardNumbers.set(id, updatedRewardNumber);
    return updatedRewardNumber;
  }

  // Cart methods
  async getCartItems(customerId: string): Promise<CartItem[]> {
    return Array.from(this.cartItems.values())
      .filter(item => item.customerId === customerId);
  }

  async addToCart(insertCartItem: InsertCartItem): Promise<CartItem> {
    // Check if item already exists
    const existingItem = Array.from(this.cartItems.values())
      .find(item => item.customerId === insertCartItem.customerId && item.productId === insertCartItem.productId);
    
    if (existingItem) {
      return this.updateCartItem(existingItem.id, existingItem.quantity + insertCartItem.quantity);
    }

    const id = randomUUID();
    const cartItem: CartItem = { 
      ...insertCartItem, 
      id, 
      createdAt: new Date()
    };
    this.cartItems.set(id, cartItem);
    return cartItem;
  }

  async updateCartItem(id: string, quantity: number): Promise<CartItem> {
    const cartItem = this.cartItems.get(id);
    if (!cartItem) throw new Error("Cart item not found");
    
    const updatedCartItem = { ...cartItem, quantity };
    this.cartItems.set(id, updatedCartItem);
    return updatedCartItem;
  }

  async removeFromCart(id: string): Promise<void> {
    this.cartItems.delete(id);
  }

  async clearCart(customerId: string): Promise<void> {
    Array.from(this.cartItems.entries()).forEach(([id, item]) => {
      if (item.customerId === customerId) {
        this.cartItems.delete(id);
      }
    });
  }

  // Wishlist methods
  async getWishlistItems(customerId: string): Promise<WishlistItem[]> {
    return Array.from(this.wishlistItems.values())
      .filter(item => item.customerId === customerId);
  }

  async addToWishlist(insertWishlistItem: InsertWishlistItem): Promise<WishlistItem> {
    const id = randomUUID();
    const wishlistItem: WishlistItem = { 
      ...insertWishlistItem, 
      id, 
      createdAt: new Date()
    };
    this.wishlistItems.set(id, wishlistItem);
    return wishlistItem;
  }

  async removeFromWishlist(id: string): Promise<void> {
    this.wishlistItems.delete(id);
  }

  // Review methods
  async getReviews(productId: string): Promise<Review[]> {
    return Array.from(this.reviews.values())
      .filter(review => review.productId === productId)
      .sort((a, b) => new Date(b.createdAt!).getTime() - new Date(a.createdAt!).getTime());
  }

  async createReview(insertReview: InsertReview): Promise<Review> {
    const id = randomUUID();
    const review: Review = { 
      ...insertReview, 
      id, 
      createdAt: new Date()
    };
    this.reviews.set(id, review);

    // Update product rating
    await this.updateProductRating(insertReview.productId);
    
    return review;
  }

  // Helper methods
  private async processOrderRewards(order: Order): Promise<void> {
    const customer = await this.getCustomerByUserId(order.customerId);
    if (!customer) return;

    // Add points to accumulated points
    const newAccumulatedPoints = customer.accumulatedPoints + order.pointsEarned;
    let updates: Partial<Customer> = {
      accumulatedPoints: newAccumulatedPoints,
      totalPoints: customer.totalPoints + order.pointsEarned
    };

    // Check if we need to create a reward number (every 1500 points)
    if (newAccumulatedPoints >= 1500) {
      const rewardNumbersToCreate = Math.floor(newAccumulatedPoints / 1500);
      const remainingPoints = newAccumulatedPoints % 1500;

      // Create reward numbers
      for (let i = 0; i < rewardNumbersToCreate; i++) {
        const globalRewardNumber = await this.getNextGlobalRewardNumber();
        await this.createRewardNumber({
          customerId: customer.id,
          rewardNumber: globalRewardNumber,
          type: "global"
        });
      }

      updates.accumulatedPoints = remainingPoints;
      updates.globalRewardNumbers = customer.globalRewardNumbers + rewardNumbersToCreate;
    }

    await this.updateCustomer(customer.userId, updates);

    // Create reward transaction
    await this.createRewardTransaction({
      userId: customer.userId,
      type: "earn",
      category: "shopping",
      amount: order.pointsEarned,
      description: `Points earned from order ${order.orderNumber}`,
      orderId: order.id
    });
  }

  private async getNextGlobalRewardNumber(): Promise<number> {
    const allRewardNumbers = Array.from(this.rewardNumbers.values())
      .filter(rn => rn.type === "global")
      .map(rn => rn.rewardNumber);
    
    return allRewardNumbers.length > 0 ? Math.max(...allRewardNumbers) + 1 : 1;
  }

  private async updateProductRating(productId: string): Promise<void> {
    const product = this.products.get(productId);
    if (!product) return;

    const reviews = Array.from(this.reviews.values()).filter(r => r.productId === productId);
    const averageRating = reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length;
    
    const updatedProduct = { 
      ...product, 
      rating: averageRating.toFixed(2),
      reviewCount: reviews.length 
    };
    this.products.set(productId, updatedProduct);
  }

  // Analytics methods
  async getGlobalStats(): Promise<any> {
    const totalMerchants = this.merchants.size;
    const totalCustomers = this.customers.size;
    const totalSales = Array.from(this.orders.values())
      .reduce((sum, order) => sum + parseFloat(order.totalAmount), 0);
    const totalPointsDistributed = Array.from(this.rewardTransactions.values())
      .filter(t => t.type === 'earn')
      .reduce((sum, transaction) => sum + transaction.amount, 0);

    return {
      totalMerchants,
      totalCustomers,
      totalSales: totalSales.toFixed(2),
      totalPointsDistributed
    };
  }

  async getCountryStats(country: string): Promise<any> {
    const countryUsers = Array.from(this.users.values()).filter(u => u.country === country);
    const merchantUsers = countryUsers.filter(u => u.role === 'merchant');
    const customerUsers = countryUsers.filter(u => u.role === 'customer');
    
    const countryOrders = Array.from(this.orders.values())
      .filter(order => {
        const customer = Array.from(this.customers.values()).find(c => c.id === order.customerId);
        if (!customer) return false;
        const user = this.users.get(customer.userId);
        return user?.country === country;
      });

    const totalSales = countryOrders.reduce((sum, order) => sum + parseFloat(order.totalAmount), 0);

    return {
      totalMerchants: merchantUsers.length,
      totalCustomers: customerUsers.length,
      totalSales: totalSales.toFixed(2),
      totalOrders: countryOrders.length
    };
  }
}

export const storage = new MemStorage();
