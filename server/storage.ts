import { 
  type User, type InsertUser, type Customer, type InsertCustomer,
  type Merchant, type InsertMerchant, type Product, type InsertProduct,
  type Category, type InsertCategory, type Brand, type InsertBrand,
  type Order, type InsertOrder, type RewardTransaction, type InsertRewardTransaction,
  type RewardNumber, type InsertRewardNumber, type CartItem, type InsertCartItem,
  type WishlistItem, type InsertWishlistItem, type Review, type InsertReview,
  type Admin, type InsertAdmin, type ChatMessage, type InsertChatMessage, 
  type ChatRoom, type InsertChatRoom, type Conversation, type InsertConversation,
  type PointDistribution, type InsertPointDistribution, type UserWallet,
  type InsertUserWallet, type PointTransaction, type InsertPointTransaction,
  type StepUpRewardNumber, type InsertStepUpRewardNumber, type Referral,
  type InsertReferral, type CommissionTransaction, type InsertCommissionTransaction,
  type MerchantTransaction, type InsertMerchantTransaction, type QRTransfer,
  type InsertQRTransfer, type AdminSetting, type InsertAdminSetting,
  type Leaderboard, type InsertLeaderboard,
  type PointGenerationRequest, type InsertPointGenerationRequest,
  type MerchantWallet, type InsertMerchantWallet, type WalletTransaction, type InsertWalletTransaction,
  type MerchantIncome, type InsertMerchantIncome, type MerchantReferral, type InsertMerchantReferral,
  type RoyaltyDistribution, type InsertRoyaltyDistribution, type MerchantShop, type InsertMerchantShop,
  type PointRecharge, type InsertPointRecharge, type ProductSale, type InsertProductSale,
  type MerchantActivity, type InsertMerchantActivity, type EMerchantProduct, type InsertEMerchantProduct,
  type ProductReviewSetting, type InsertProductReviewSetting, type PointDistributionReport, type InsertPointDistributionReport,
  type CustomerProfile, type InsertCustomerProfile, type CustomerPointTransaction, type InsertCustomerPointTransaction,
  type CustomerSerialNumber, type InsertCustomerSerialNumber, type CustomerOTP, type InsertCustomerOTP,
  type CustomerPointTransfer, type InsertCustomerPointTransfer, type CustomerPurchase, type InsertCustomerPurchase,
  type CustomerWallet, type InsertCustomerWallet, type CustomerReward, type InsertCustomerReward,
  type CustomerAffiliateLink, type InsertCustomerAffiliateLink, type CustomerReferral, type InsertCustomerReferral,
  type CustomerDailyLogin, type InsertCustomerDailyLogin, type CustomerBirthdayPoint, type InsertCustomerBirthdayPoint,
  type ShoppingVoucher, type InsertShoppingVoucher, type SerialActivationQueue, type InsertSerialActivationQueue,
  type CustomerWalletTransaction, type InsertCustomerWalletTransaction, type CustomerWalletTransfer, type InsertCustomerWalletTransfer,
  type CustomerReferralCommission, type InsertCustomerReferralCommission, type CompanyReferrer, type InsertCompanyReferrer,
  type WasteManagementReward, type InsertWasteManagementReward, type MedicalFacilityBenefit, type InsertMedicalFacilityBenefit,
  type MerchantCustomer, type InsertMerchantCustomer
} from "@shared/schema";
import { randomUUID } from "crypto";
import bcrypt from "bcryptjs";

export interface IStorage {
  // User management
  getUser(id: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getUsersByRole(role: string): Promise<User[]>;
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
  
  // User utility methods
  getAllUsers(): Promise<User[]>;
  
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
  
  // Admin management
  getAdmin(userId: string): Promise<Admin | undefined>;
  createAdmin(admin: InsertAdmin): Promise<Admin>;
  updateAdmin(userId: string, admin: Partial<Admin>): Promise<Admin>;
  getAdminsByType(adminType: 'global' | 'local'): Promise<Admin[]>;
  getAdminsByCountry(country: string): Promise<Admin[]>;
  
  // Point distribution
  getPointDistributions(userId?: string): Promise<PointDistribution[]>;
  createPointDistribution(distribution: InsertPointDistribution): Promise<PointDistribution>;
  updatePointDistribution(id: string, distribution: Partial<PointDistribution>): Promise<PointDistribution>;

  // Point generation requests
  createPointGenerationRequest(data: InsertPointGenerationRequest): Promise<PointGenerationRequest>;
  getPointGenerationRequests(filter?: { requesterId?: string; status?: string }): Promise<PointGenerationRequest[]>;
  getPointGenerationRequest(id: string): Promise<PointGenerationRequest | undefined>;
  updatePointGenerationRequest(id: string, data: Partial<PointGenerationRequest>): Promise<PointGenerationRequest>;
  
  // Enhanced secure chat functionality
  getConversation(participant1Id: string, participant2Id: string): Promise<Conversation | undefined>;
  createConversation(conversation: InsertConversation): Promise<Conversation>;
  getUserConversations(userId: string, userRole: string): Promise<Conversation[]>;
  getChatMessages(conversationId: string): Promise<ChatMessage[]>;
  getAvailableChatUsers(currentUserId: string, currentUserRole: string): Promise<any[]>;
  createSecureChatMessage(message: InsertChatMessage): Promise<ChatMessage>;
  markMessageAsRead(messageId: string): Promise<void>;
  markConversationMessagesAsRead(conversationId: string, userId: string): Promise<void>;
  getChatRooms(userId: string): Promise<ChatRoom[]>;
  createChatRoom(room: InsertChatRoom): Promise<ChatRoom>;
  getOrdersByMerchant(merchantId: string): Promise<Order[]>;
  getProductsByMerchant(merchantId: string): Promise<Product[]>;
  
  // Loyalty system methods
  // Wallet management
  getUserWallet(userId: string, walletType: 'reward_points' | 'income' | 'commerce'): Promise<UserWallet | undefined>;
  createUserWallet(wallet: InsertUserWallet): Promise<UserWallet>;
  updateUserWallet(walletId: string, wallet: Partial<UserWallet>): Promise<UserWallet>;
  
  // Point transactions
  getPointTransactions(userId: string): Promise<PointTransaction[]>;
  createPointTransaction(transaction: InsertPointTransaction): Promise<PointTransaction>;
  
  // StepUp reward numbers
  getActiveRewardNumbers(userId: string): Promise<StepUpRewardNumber[]>;
  createStepUpRewardNumber(rewardNumber: InsertStepUpRewardNumber): Promise<StepUpRewardNumber>;
  updateStepUpRewardNumber(id: string, rewardNumber: Partial<StepUpRewardNumber>): Promise<StepUpRewardNumber>;
  
  // Referral system
  getReferralByReferee(refereeId: string): Promise<Referral | undefined>;
  createReferral(referral: InsertReferral): Promise<Referral>;
  updateReferral(id: string, referral: Partial<Referral>): Promise<Referral>;
  
  // Commission transactions
  createCommissionTransaction(commission: InsertCommissionTransaction): Promise<CommissionTransaction>;
  
  // Merchant transactions
  getMerchantTransactions(merchantId: string): Promise<MerchantTransaction[]>;
  createMerchantTransaction(transaction: InsertMerchantTransaction): Promise<MerchantTransaction>;
  
  // QR transfers
  getQRTransfer(qrCode: string): Promise<QRTransfer | undefined>;
  createQRTransfer(transfer: InsertQRTransfer): Promise<QRTransfer>;
  updateQRTransfer(id: string, transfer: Partial<QRTransfer>): Promise<QRTransfer>;
  
  // Admin settings
  getAdminSetting(settingKey: string): Promise<AdminSetting | undefined>;
  createAdminSetting(setting: InsertAdminSetting): Promise<AdminSetting>;
  updateAdminSetting(id: string, setting: Partial<AdminSetting>): Promise<AdminSetting>;
  
  // Leaderboards
  getLeaderboard(type: 'global' | 'local', country?: string): Promise<Leaderboard[]>;
  createLeaderboard(leaderboard: InsertLeaderboard): Promise<Leaderboard>;

  // Merchant Wallet System
  getMerchantWallet(merchantId: string): Promise<MerchantWallet | undefined>;
  createMerchantWallet(wallet: InsertMerchantWallet): Promise<MerchantWallet>;
  updateMerchantWallet(merchantId: string, wallet: Partial<MerchantWallet>): Promise<MerchantWallet>;
  
  // Wallet Transactions
  createWalletTransaction(transaction: InsertWalletTransaction): Promise<WalletTransaction>;
  getWalletTransactions(merchantId: string, walletType?: string): Promise<WalletTransaction[]>;
  
  // Merchant Income
  createMerchantIncome(income: InsertMerchantIncome): Promise<MerchantIncome>;
  getMerchantIncome(merchantId: string, incomeType?: string): Promise<MerchantIncome[]>;
  
  // Merchant Referrals
  createMerchantReferral(referral: InsertMerchantReferral): Promise<MerchantReferral>;
  getMerchantReferrals(merchantId: string): Promise<MerchantReferral[]>;
  getMerchantReferralByCode(referralCode: string): Promise<MerchantReferral | undefined>;
  
  // Royalty Distribution
  createRoyaltyDistribution(distribution: InsertRoyaltyDistribution): Promise<RoyaltyDistribution>;
  getRoyaltyDistributions(): Promise<RoyaltyDistribution[]>;
  getRoyaltyDistributionByMonth(month: string): Promise<RoyaltyDistribution | undefined>;
  
  // Merchant Shop/Marketplace
  getMerchantShop(merchantId: string): Promise<MerchantShop | undefined>;
  createMerchantShop(shop: InsertMerchantShop): Promise<MerchantShop>;
  updateMerchantShop(merchantId: string, shop: Partial<MerchantShop>): Promise<MerchantShop>;
  getMerchantShops(): Promise<MerchantShop[]>;

  // Point Recharge System
  createPointRecharge(recharge: InsertPointRecharge): Promise<PointRecharge>;
  getPointRecharges(merchantId: string): Promise<PointRecharge[]>;
  updatePointRecharge(id: string, recharge: Partial<PointRecharge>): Promise<PointRecharge>;

  // Product Sales with Mandatory Discounts
  createProductSale(sale: InsertProductSale): Promise<ProductSale>;
  getProductSales(merchantId: string): Promise<ProductSale[]>;
  getProductSalesByPeriod(merchantId: string, startDate: Date, endDate: Date): Promise<ProductSale[]>;

  // Merchant Activity Tracking
  getMerchantActivity(merchantId: string, month?: string): Promise<MerchantActivity | undefined>;
  createMerchantActivity(activity: InsertMerchantActivity): Promise<MerchantActivity>;
  updateMerchantActivity(merchantId: string, month: string, activity: Partial<MerchantActivity>): Promise<MerchantActivity>;
  getMerchantActivityStatus(merchantId: string): Promise<MerchantActivity[]>;

  // E-Merchant Product Pricing
  getEMerchantProducts(merchantId: string): Promise<EMerchantProduct[]>;
  createEMerchantProduct(product: InsertEMerchantProduct): Promise<EMerchantProduct>;
  updateEMerchantProduct(id: string, product: Partial<EMerchantProduct>): Promise<EMerchantProduct>;

  // Product Review Settings
  getProductReviewSettings(merchantId: string): Promise<ProductReviewSetting[]>;
  createProductReviewSetting(setting: InsertProductReviewSetting): Promise<ProductReviewSetting>;
  updateProductReviewSetting(merchantId: string, productId: string, setting: Partial<ProductReviewSetting>): Promise<ProductReviewSetting>;

  // Point Distribution Reports
  createPointDistributionReport(report: InsertPointDistributionReport): Promise<PointDistributionReport>;
  getPointDistributionReports(merchantId: string, reportType?: string): Promise<PointDistributionReport[]>;
  generatePointDistributionReport(merchantId: string, reportType: string, period: string): Promise<PointDistributionReport>;

  // Customer Portal Features
  // Customer Profiles
  createCustomerProfile(profile: InsertCustomerProfile): Promise<CustomerProfile>;
  getCustomerProfile(userId: string): Promise<CustomerProfile | undefined>;
  getCustomerProfileById(customerId: string): Promise<CustomerProfile | undefined>;
  getCustomerProfileByMobile(mobileNumber: string): Promise<CustomerProfile | undefined>;
  getCustomerProfileByAccountNumber(accountNumber: string): Promise<CustomerProfile | undefined>;
  updateCustomerProfile(userId: string, profile: Partial<CustomerProfile>): Promise<CustomerProfile>;
  generateUniqueAccountNumber(): Promise<string>;

  // Customer Wallets
  createCustomerWallet(wallet: InsertCustomerWallet): Promise<CustomerWallet>;
  getCustomerWallet(customerId: string): Promise<CustomerWallet | undefined>;
  updateCustomerWallet(customerId: string, wallet: Partial<CustomerWallet>): Promise<CustomerWallet>;

  // Customer Point Transactions
  createCustomerPointTransaction(transaction: InsertCustomerPointTransaction): Promise<CustomerPointTransaction>;
  getCustomerPointTransactions(customerId: string): Promise<CustomerPointTransaction[]>;
  getCustomerPointTransactionsByMerchant(customerId: string, merchantId: string): Promise<CustomerPointTransaction[]>;

  // Customer Serial Numbers
  createCustomerSerialNumber(serial: InsertCustomerSerialNumber): Promise<CustomerSerialNumber>;
  getCustomerSerialNumber(customerId: string): Promise<CustomerSerialNumber | undefined>;
  getNextGlobalSerialNumber(): Promise<number>;
  assignSerialNumberToCustomer(customerId: string): Promise<CustomerSerialNumber>;

  // Customer OTP
  createCustomerOTP(otp: InsertCustomerOTP): Promise<CustomerOTP>;
  getCustomerOTP(customerId: string, otpType: string): Promise<CustomerOTP | undefined>;
  verifyCustomerOTP(customerId: string, otpCode: string, otpType: string): Promise<boolean>;
  markOTPAsUsed(otpId: string): Promise<void>;

  // Customer Point Transfers
  createCustomerPointTransfer(transfer: InsertCustomerPointTransfer): Promise<CustomerPointTransfer>;
  getCustomerPointTransfers(customerId: string): Promise<CustomerPointTransfer[]>;
  updateCustomerPointTransfer(transferId: string, transfer: Partial<CustomerPointTransfer>): Promise<CustomerPointTransfer>;

  // Customer Purchases
  createCustomerPurchase(purchase: InsertCustomerPurchase): Promise<CustomerPurchase>;
  getCustomerPurchases(customerId: string): Promise<CustomerPurchase[]>;
  getCustomerPurchasesByMerchant(customerId: string, merchantId: string): Promise<CustomerPurchase[]>;

  // Customer QR Code
  generateCustomerQRCode(customerId: string): Promise<string>;
  getCustomerByQRCode(qrCode: string): Promise<CustomerProfile | undefined>;

  // Merchant Customer Management
  createMerchantCustomer(customer: InsertMerchantCustomer): Promise<MerchantCustomer>;
  getMerchantCustomer(merchantId: string, customerId: string): Promise<MerchantCustomer | undefined>;
  getMerchantCustomers(merchantId: string): Promise<MerchantCustomer[]>;
  updateMerchantCustomer(merchantId: string, customerId: string, customer: Partial<MerchantCustomer>): Promise<MerchantCustomer>;

  // Advanced Customer Reward System
  // Customer Rewards
  createCustomerReward(reward: InsertCustomerReward): Promise<CustomerReward>;
  getCustomerRewards(customerId: string): Promise<CustomerReward[]>;
  getCustomerRewardsByType(customerId: string, rewardType: string): Promise<CustomerReward[]>;
  updateCustomerReward(rewardId: string, reward: Partial<CustomerReward>): Promise<CustomerReward>;
  processSerialReward(customerId: string, serialType: 'global' | 'local', step: number): Promise<CustomerReward>;

  // Customer Affiliate Links
  createCustomerAffiliateLink(link: InsertCustomerAffiliateLink): Promise<CustomerAffiliateLink>;
  getCustomerAffiliateLink(customerId: string): Promise<CustomerAffiliateLink | undefined>;
  getAffiliateLinkByCode(affiliateCode: string): Promise<CustomerAffiliateLink | undefined>;
  updateAffiliateLinkStats(affiliateCode: string, type: 'click' | 'registration'): Promise<void>;
  generateAffiliateCode(customerId: string): Promise<string>;

  // Customer Referrals
  createCustomerReferral(referral: InsertCustomerReferral): Promise<CustomerReferral>;
  getCustomerReferrals(referrerId: string): Promise<CustomerReferral[]>;
  getCustomerReferralByReferred(referredId: string): Promise<CustomerReferral | undefined>;
  updateReferralCommission(referralId: string, pointsEarned: number): Promise<void>;
  calculateReferralCommission(referredId: string, pointsEarned: number): Promise<void>;

  // Daily Login Points
  createCustomerDailyLogin(login: InsertCustomerDailyLogin): Promise<CustomerDailyLogin>;
  getCustomerDailyLogins(customerId: string): Promise<CustomerDailyLogin[]>;
  getCustomerDailyLogin(customerId: string, date: string): Promise<CustomerDailyLogin | undefined>;
  processDailyLogin(customerId: string): Promise<CustomerDailyLogin>;

  // Birthday Points
  createCustomerBirthdayPoint(birthday: InsertCustomerBirthdayPoint): Promise<CustomerBirthdayPoint>;
  getCustomerBirthdayPoints(customerId: string): Promise<CustomerBirthdayPoint[]>;
  processBirthdayPoints(customerId: string, birthYear: number): Promise<CustomerBirthdayPoint>;

  // Shopping Vouchers
  createShoppingVoucher(voucher: InsertShoppingVoucher): Promise<ShoppingVoucher>;
  getCustomerShoppingVouchers(customerId: string): Promise<ShoppingVoucher[]>;
  getShoppingVoucherByCode(voucherCode: string): Promise<ShoppingVoucher | undefined>;
  useShoppingVoucher(voucherCode: string): Promise<ShoppingVoucher>;
  generateMerchantVouchers(customerId: string, totalValue: number, rewardId: string): Promise<ShoppingVoucher[]>;

  // Serial Activation Queue
  createSerialActivationQueue(queue: InsertSerialActivationQueue): Promise<SerialActivationQueue>;
  getSerialActivationQueue(customerId: string): Promise<SerialActivationQueue[]>;
  processSerialActivation(customerId: string, serialType: 'global' | 'local'): Promise<SerialActivationQueue>;

  // Reward Distribution Logic
  distributeFourthStepReward(customerId: string, rewardId: string): Promise<{
    serialActivation: number;
    merchantVouchers: number;
    directPayment: number;
  }>;

  // Three Wallet System
  // Customer Wallet Management
  createCustomerWallet(wallet: InsertCustomerWallet): Promise<CustomerWallet>;
  getCustomerWallet(customerId: string): Promise<CustomerWallet | undefined>;
  updateCustomerWallet(customerId: string, wallet: Partial<CustomerWallet>): Promise<CustomerWallet>;

  // Wallet Transactions
  createCustomerWalletTransaction(transaction: InsertCustomerWalletTransaction): Promise<CustomerWalletTransaction>;
  getCustomerWalletTransactions(customerId: string, walletType?: string): Promise<CustomerWalletTransaction[]>;

  // Wallet Transfers
  createCustomerWalletTransfer(transfer: InsertCustomerWalletTransfer): Promise<CustomerWalletTransfer>;
  getCustomerWalletTransfers(customerId: string): Promise<CustomerWalletTransfer[]>;
  processWalletTransfer(transferId: string): Promise<CustomerWalletTransfer>;
  transferBetweenWallets(customerId: string, fromWallet: string, toWallet: string, amount: number): Promise<CustomerWalletTransfer>;

  // Enhanced Referral Commission System
  createCustomerReferralCommission(commission: InsertCustomerReferralCommission): Promise<CustomerReferralCommission>;
  getCustomerReferralCommissions(referrerId: string): Promise<CustomerReferralCommission[]>;
  processReferralCommission(referredId: string, rewardStep: number, rewardType: string, originalRewardId: string): Promise<void>;

  // Company as Default Referrer
  createCompanyReferrer(referrer: InsertCompanyReferrer): Promise<CompanyReferrer>;
  getCompanyReferrer(customerId: string): Promise<CompanyReferrer | undefined>;
  assignCompanyAsReferrer(customerId: string): Promise<CompanyReferrer>;

  // Waste Management Rewards
  createWasteManagementReward(reward: InsertWasteManagementReward): Promise<WasteManagementReward>;
  getWasteManagementRewards(customerId: string): Promise<WasteManagementReward[]>;
  processWasteManagementReward(customerId: string, wasteType: string, quantity: number): Promise<WasteManagementReward>;

  // Medical Facility Benefits
  createMedicalFacilityBenefit(benefit: InsertMedicalFacilityBenefit): Promise<MedicalFacilityBenefit>;
  getMedicalFacilityBenefits(customerId: string): Promise<MedicalFacilityBenefit[]>;
  useMedicalFacilityBenefit(benefitId: string): Promise<MedicalFacilityBenefit>;

  // Commerce Wallet Operations (MFS)
  addCommerceBalance(customerId: string, amount: number, method: string): Promise<CustomerWalletTransaction>;
  withdrawCommerceBalance(customerId: string, amount: number, method: string): Promise<CustomerWalletTransaction>;
  spendCommerceBalance(customerId: string, amount: number, description: string): Promise<CustomerWalletTransaction>;

  // Income Wallet Operations
  addIncomeBalance(customerId: string, amount: number, source: string): Promise<CustomerWalletTransaction>;
  spendIncomeBalance(customerId: string, amount: number, description: string): Promise<CustomerWalletTransaction>;

  // Reward Point Wallet Operations
  addRewardPoints(customerId: string, points: number, source: string): Promise<CustomerWalletTransaction>;
  spendRewardPoints(customerId: string, points: number, description: string): Promise<CustomerWalletTransaction>;
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
  
  // New loyalty system storage
  private userWallets: Map<string, UserWallet> = new Map();
  private pointTransactions: Map<string, PointTransaction> = new Map();
  private stepUpRewardNumbers: Map<string, StepUpRewardNumber> = new Map();
  private referrals: Map<string, Referral> = new Map();
  private commissionTransactions: Map<string, CommissionTransaction> = new Map();
  private merchantTransactions: Map<string, MerchantTransaction> = new Map();
  private qrTransfers: Map<string, QRTransfer> = new Map();
  private adminSettings: Map<string, AdminSetting> = new Map();
  private leaderboards: Map<string, Leaderboard> = new Map();
  private cartItems: Map<string, CartItem> = new Map();
  private wishlistItems: Map<string, WishlistItem> = new Map();
  private reviews: Map<string, Review> = new Map();
  private admins: Map<string, Admin> = new Map();
  private pointDistributions: Map<string, PointDistribution> = new Map();
  private conversations: Map<string, Conversation> = new Map();
  private merchantCustomers: Map<string, MerchantCustomer> = new Map();
  private chatMessages: Map<string, ChatMessage> = new Map();
  private chatRooms: Map<string, ChatRoom> = new Map();
  private pointGenerationRequests: Map<string, PointGenerationRequest> = new Map();

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

    // Create global admin user
    const globalAdminUser = await this.createUser({
      username: "globaladmin",
      email: "global@komarce.com",
      password: await bcrypt.hash("global123", 10),
      firstName: "Global",
      lastName: "Admin",
      role: "global_admin",
      country: "BD",
      isActive: true
    });

    // Create global admin profile
    await this.createAdmin({
      userId: globalAdminUser.id,
      adminType: "global",
      pointsBalance: 1000000,
      totalPointsReceived: 1000000,
      totalPointsDistributed: 0,
      permissions: ["all"],
      isActive: true
    });

    // Create local admin users for different countries
    const countries = ["BD", "MY", "AE", "PH"];
    for (const country of countries) {
      const localAdminUser = await this.createUser({
        username: `local${country.toLowerCase()}`,
        email: `local.${country.toLowerCase()}@komarce.com`,
        password: await bcrypt.hash("local123", 10),
        firstName: `Local ${country}`,
        lastName: "Admin",
        role: "local_admin",
        country: country,
        isActive: true
      });

      // Create local admin profile
      await this.createAdmin({
        userId: localAdminUser.id,
        adminType: "local",
        country: country,
        pointsBalance: 50000,
        totalPointsReceived: 50000,
        totalPointsDistributed: 0,
        permissions: ["manage_merchants", "distribute_points", "view_analytics"],
        isActive: true
      });
    }

    // Create legacy admin user for backward compatibility
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

    // Create sample customers
    const customer1 = await this.createUser({
      username: "customer1",
      email: "customer@komarce.com",
      password: await bcrypt.hash("customer123", 10),
      firstName: "John",
      lastName: "Customer",
      role: "customer",
      country: "BD",
      isActive: true
    });

    const customer2 = await this.createUser({
      username: "customer2",
      email: "sarah@customer.com",
      password: await bcrypt.hash("customer123", 10),
      firstName: "Sarah",
      lastName: "Wilson",
      role: "customer",
      country: "MY",
      isActive: true
    });

    // Create merchant profiles
    const techStoreMerchant = await this.createMerchant({
      userId: merchant1.id,
      businessName: "TechStore Electronics",
      businessType: "Electronics Retailer",
      tier: "Double Star"
    });

    const fashionHubMerchant = await this.createMerchant({
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
        merchantId: techStoreMerchant.id,
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
        merchantId: techStoreMerchant.id,
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
        merchantId: fashionHubMerchant.id,
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
        merchantId: techStoreMerchant.id,
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
  async getAllUsers(): Promise<User[]> {
    return Array.from(this.users.values());
  }

  async getUser(id: string): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(user => user.email === email);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(user => user.username === username);
  }

  async getUsersByRole(role: string): Promise<User[]> {
    return Array.from(this.users.values()).filter(user => user.role === role);
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

  // Admin management methods
  async getAdmin(userId: string): Promise<Admin | undefined> {
    return Array.from(this.admins.values()).find(admin => admin.userId === userId);
  }

  async createAdmin(admin: InsertAdmin): Promise<Admin> {
    const id = crypto.randomUUID();
    const newAdmin: Admin = {
      id,
      createdAt: new Date(),
      ...admin
    };
    this.admins.set(id, newAdmin);
    return newAdmin;
  }

  async updateAdmin(userId: string, admin: Partial<Admin>): Promise<Admin> {
    const existingAdmin = await this.getAdmin(userId);
    if (!existingAdmin) {
      throw new Error("Admin not found");
    }
    const updated = { ...existingAdmin, ...admin };
    this.admins.set(existingAdmin.id, updated);
    return updated;
  }

  async getAdminsByType(adminType: 'global' | 'local'): Promise<Admin[]> {
    return Array.from(this.admins.values()).filter(admin => admin.adminType === adminType);
  }

  async getAdminsByCountry(country: string): Promise<Admin[]> {
    return Array.from(this.admins.values()).filter(admin => admin.country === country);
  }

  // Point distribution methods
  async getPointDistributions(userId?: string): Promise<PointDistribution[]> {
    const distributions = Array.from(this.pointDistributions.values());
    if (userId) {
      return distributions.filter(d => d.fromUserId === userId || d.toUserId === userId);
    }
    return distributions;
  }

  async createPointDistribution(distribution: InsertPointDistribution): Promise<PointDistribution> {
    const id = crypto.randomUUID();
    const newDistribution: PointDistribution = {
      id,
      createdAt: new Date(),
      ...distribution
    };
    this.pointDistributions.set(id, newDistribution);
    return newDistribution;
  }

  async updatePointDistribution(id: string, distribution: Partial<PointDistribution>): Promise<PointDistribution> {
    const existing = this.pointDistributions.get(id);
    if (!existing) {
      throw new Error("Point distribution not found");
    }
    const updated = { ...existing, ...distribution };
    this.pointDistributions.set(id, updated);
    return updated;
  }

  // Point generation request methods
  async createPointGenerationRequest(data: InsertPointGenerationRequest): Promise<PointGenerationRequest> {
    const id = crypto.randomUUID();
    const request: PointGenerationRequest = {
      id,
      createdAt: new Date(),
      reviewedAt: null,
      reviewedBy: null,
      requesterCountry: null,
      reason: null,
      ...data
    } as any;
    this.pointGenerationRequests.set(id, request);
    return request;
  }

  async getPointGenerationRequests(filter?: { requesterId?: string; status?: string }): Promise<PointGenerationRequest[]> {
    let list = Array.from(this.pointGenerationRequests.values());
    if (filter?.requesterId) list = list.filter(r => r.requesterId === filter.requesterId);
    if (filter?.status) list = list.filter(r => r.status === filter.status);
    return list.sort((a, b) => new Date(b.createdAt!).getTime() - new Date(a.createdAt!).getTime());
  }

  async getPointGenerationRequest(id: string): Promise<PointGenerationRequest | undefined> {
    return this.pointGenerationRequests.get(id);
  }

  async updatePointGenerationRequest(id: string, data: Partial<PointGenerationRequest>): Promise<PointGenerationRequest> {
    const existing = this.pointGenerationRequests.get(id);
    if (!existing) throw new Error("Point generation request not found");
    const updated = { ...existing, ...data } as PointGenerationRequest;
    this.pointGenerationRequests.set(id, updated);
    return updated;
  }

  // Enhanced secure chat functionality methods
  async getConversation(participant1Id: string, participant2Id: string): Promise<Conversation | undefined> {
    return Array.from(this.conversations.values()).find(conv => 
      (conv.participant1Id === participant1Id && conv.participant2Id === participant2Id) ||
      (conv.participant1Id === participant2Id && conv.participant2Id === participant1Id)
    );
  }

  async createConversation(conversation: InsertConversation): Promise<Conversation> {
    const id = crypto.randomUUID();
    const newConversation: Conversation = {
      id,
      createdAt: new Date(),
      updatedAt: new Date(),
      lastMessageAt: null,
      lastMessageId: null,
      ...conversation
    };
    this.conversations.set(id, newConversation);
    return newConversation;
  }

  async getUserConversations(userId: string, userRole: string): Promise<Conversation[]> {
    return Array.from(this.conversations.values())
      .filter(conv => 
        (conv.participant1Id === userId && conv.participant1Role === userRole) ||
        (conv.participant2Id === userId && conv.participant2Role === userRole)
      )
      .sort((a, b) => new Date(b.lastMessageAt || b.createdAt).getTime() - new Date(a.lastMessageAt || a.createdAt).getTime());
  }

  async getChatMessages(conversationId: string): Promise<ChatMessage[]> {
    return Array.from(this.chatMessages.values())
      .filter(msg => msg.conversationId === conversationId)
      .sort((a, b) => new Date(a.createdAt!).getTime() - new Date(b.createdAt!).getTime());
  }

  async getAvailableChatUsers(currentUserId: string, currentUserRole: string): Promise<any[]> {
    const users: any[] = [];

    if (currentUserRole === 'global_admin') {
      // Global admin can chat with local admins
      const localAdmins = Array.from(this.users.values())
        .filter(user => user.role === 'local_admin' && user.id !== currentUserId);
      users.push(...localAdmins.map(user => ({
        id: user.id,
        name: `${user.firstName} ${user.lastName}`,
        role: user.role,
        country: user.country,
        email: user.email,
        isOnline: false
      })));
    } else if (currentUserRole === 'local_admin') {
      // Local admin can chat with global admins and merchants in their country
      const currentUser = this.users.get(currentUserId);
      const globalAdmins = Array.from(this.users.values())
        .filter(user => user.role === 'global_admin');
      const merchants = Array.from(this.users.values())
        .filter(user => user.role === 'merchant' && user.country === currentUser?.country);
      
      users.push(...globalAdmins.map(user => ({
        id: user.id,
        name: `${user.firstName} ${user.lastName}`,
        role: user.role,
        country: user.country,
        email: user.email,
        isOnline: false
      })));
      
      users.push(...merchants.map(user => ({
        id: user.id,
        name: `${user.firstName} ${user.lastName}`,
        role: user.role,
        country: user.country,
        email: user.email,
        isOnline: false
      })));
    } else if (currentUserRole === 'merchant') {
      // Merchant can chat with local admins in their country and customers who have bought from them
      const currentUser = this.users.get(currentUserId);
      const localAdmins = Array.from(this.users.values())
        .filter(user => user.role === 'local_admin' && user.country === currentUser?.country);
      
      // Get customers who have bought from this merchant (via orders or point transactions)
      const merchantProfile = Array.from(this.merchants.values())
        .find(merchant => merchant.userId === currentUserId);
      
      let customerIds = new Set<string>();
      
      if (merchantProfile) {
        // Get customers from orders
        const merchantOrders = Array.from(this.orders.values())
          .filter(order => order.merchantId === merchantProfile.id);
        merchantOrders.forEach(order => {
          if (order.customerId) customerIds.add(order.customerId);
        });
        
        // Get customers from point transactions
        const pointTransactions = Array.from(this.pointTransactions.values())
          .filter(transaction => 
            transaction.fromUserId === currentUserId || 
            transaction.toUserId === currentUserId
          );
        pointTransactions.forEach(transaction => {
          const otherUserId = transaction.fromUserId === currentUserId 
            ? transaction.toUserId 
            : transaction.fromUserId;
          const otherUser = this.users.get(otherUserId);
          if (otherUser && otherUser.role === 'customer') {
            customerIds.add(otherUserId);
          }
        });
      }
      
      const customers = Array.from(this.users.values())
        .filter(user => user.role === 'customer' && customerIds.has(user.id));
      
      users.push(...localAdmins.map(user => ({
        id: user.id,
        name: `${user.firstName} ${user.lastName}`,
        role: user.role,
        country: user.country,
        email: user.email,
        isOnline: false
      })));
      
      users.push(...customers.map(user => ({
        id: user.id,
        name: `${user.firstName} ${user.lastName}`,
        role: user.role,
        country: user.country,
        email: user.email,
        isOnline: false
      })));
    } else if (currentUserRole === 'customer') {
      // Customer can chat with merchants they have interacted with (purchased from or received points from)
      const currentUser = this.users.get(currentUserId);
      const customerProfile = Array.from(this.customers.values())
        .find(customer => customer.userId === currentUserId);
      
      let merchantIds = new Set<string>();
      
      if (customerProfile) {
        // Get merchants from orders
        const customerOrders = Array.from(this.orders.values())
          .filter(order => order.customerId === customerProfile.id);
        
        for (const order of customerOrders) {
          const merchant = this.merchants.get(order.merchantId);
          if (merchant) {
            merchantIds.add(merchant.userId);
          }
        }
        
        // Get merchants from point transactions
        const pointTransactions = Array.from(this.pointTransactions.values())
          .filter(transaction => 
            transaction.fromUserId === currentUserId || 
            transaction.toUserId === currentUserId
          );
        
        for (const transaction of pointTransactions) {
          const otherUserId = transaction.fromUserId === currentUserId 
            ? transaction.toUserId 
            : transaction.fromUserId;
          const otherUser = this.users.get(otherUserId);
          if (otherUser && otherUser.role === 'merchant') {
            merchantIds.add(otherUserId);
          }
        }
      }
      
      const merchants = Array.from(this.users.values())
        .filter(user => user.role === 'merchant' && merchantIds.has(user.id));
      
      users.push(...merchants.map(user => ({
        id: user.id,
        name: `${user.firstName} ${user.lastName}`,
        role: user.role,
        country: user.country,
        email: user.email,
        isOnline: false
      })));
    }

    return users;
  }

  async createSecureChatMessage(message: InsertChatMessage): Promise<ChatMessage> {
    const id = crypto.randomUUID();
    const newMessage: ChatMessage = {
      id,
      createdAt: new Date(),
      isRead: false,
      isEncrypted: true,
      isEdited: false,
      messageType: 'text',
      editedAt: null,
      fileUrl: null,
      fileName: null,
      replyTo: null,
      ...message
    };
    this.chatMessages.set(id, newMessage);

    // Update conversation last message
    const conversation = this.conversations.get(message.conversationId);
    if (conversation) {
      const updatedConversation = {
        ...conversation,
        lastMessageId: id,
        lastMessageAt: newMessage.createdAt,
        updatedAt: new Date()
      };
      this.conversations.set(conversation.id, updatedConversation);
    }

    return newMessage;
  }

  async markMessageAsRead(messageId: string): Promise<void> {
    const message = this.chatMessages.get(messageId);
    if (message) {
      const updatedMessage = { ...message, isRead: true };
      this.chatMessages.set(messageId, updatedMessage);
    }
  }

  async markConversationMessagesAsRead(conversationId: string, userId: string): Promise<void> {
    const messages = Array.from(this.chatMessages.values())
      .filter(msg => msg.conversationId === conversationId && msg.receiverId === userId && !msg.isRead);
    
    for (const message of messages) {
      const updatedMessage = { ...message, isRead: true };
      this.chatMessages.set(message.id, updatedMessage);
    }
  }

  // Legacy method for backward compatibility
  async getChatUsers(currentUserId: string): Promise<User[]> {
    const currentUser = this.users.get(currentUserId);
    if (!currentUser) return [];

    const users = await this.getAvailableChatUsers(currentUserId, currentUser.role);
    return users.map(user => ({
      id: user.id,
      username: user.email,
      email: user.email,
      firstName: user.name.split(' ')[0] || 'Unknown',
      lastName: user.name.split(' ')[1] || 'User',
      role: user.role as any,
      country: user.country,
      phone: null,
      address: null,
      dateOfBirth: null,
      bloodGroup: null,
      isActive: true,
      createdAt: new Date(),
      password: ''
    }));
  }

  async getOrdersByMerchant(merchantId: string): Promise<Order[]> {
    return Array.from(this.orders.values()).filter(order => order.merchantId === merchantId);
  }

  async getProductsByMerchant(merchantId: string): Promise<Product[]> {
    return Array.from(this.products.values()).filter(product => product.merchantId === merchantId);
  }

  async getChatRooms(userId: string): Promise<ChatRoom[]> {
    return Array.from(this.chatRooms.values()).filter(room => 
      Array.isArray(room.participants) && room.participants.includes(userId)
    );
  }

  async createChatRoom(room: InsertChatRoom): Promise<ChatRoom> {
    const id = crypto.randomUUID();
    const newRoom: ChatRoom = {
      id,
      createdAt: new Date(),
      lastMessageAt: null,
      ...room
    };
    this.chatRooms.set(id, newRoom);
    return newRoom;
  }

  // Legacy methods for backward compatibility
  async createChatMessage(message: any): Promise<ChatMessage> {
    return this.createSecureChatMessage({
      conversationId: crypto.randomUUID(),
      senderId: message.senderId,
      senderRole: 'customer', // default fallback
      receiverId: message.receiverId,
      receiverRole: 'merchant', // default fallback
      message: message.message,
      messageType: message.messageType || 'text'
    });
  }

  async updateChatMessage(id: string, message: Partial<ChatMessage>): Promise<ChatMessage> {
    const existing = this.chatMessages.get(id);
    if (!existing) {
      throw new Error("Chat message not found");
    }
    const updated = { ...existing, ...message };
    this.chatMessages.set(id, updated);
    return updated;
  }

  async getChatMessage(id: string): Promise<ChatMessage | undefined> {
    return this.chatMessages.get(id);
  }

  // =================== LOYALTY SYSTEM METHODS ===================

  // Wallet management
  async getUserWallet(userId: string, walletType: 'reward_points' | 'income' | 'commerce'): Promise<UserWallet | undefined> {
    return Array.from(this.userWallets.values())
      .find(wallet => wallet.userId === userId && wallet.walletType === walletType);
  }

  async createUserWallet(wallet: InsertUserWallet): Promise<UserWallet> {
    const id = randomUUID();
    const newWallet: UserWallet = {
      id,
      createdAt: new Date(),
      updatedAt: new Date(),
      isActive: true,
      balance: '0.00',
      totalReceived: '0.00',
      totalSpent: '0.00',
      ...wallet
    };
    this.userWallets.set(id, newWallet);
    return newWallet;
  }

  async updateUserWallet(walletId: string, wallet: Partial<UserWallet>): Promise<UserWallet> {
    const existing = this.userWallets.get(walletId);
    if (!existing) throw new Error("Wallet not found");
    
    const updated: UserWallet = {
      ...existing,
      ...wallet,
      updatedAt: new Date()
    };
    this.userWallets.set(walletId, updated);
    return updated;
  }

  // Point transactions
  async getPointTransactions(userId: string): Promise<PointTransaction[]> {
    return Array.from(this.pointTransactions.values())
      .filter(transaction => transaction.userId === userId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  async createPointTransaction(transaction: InsertPointTransaction): Promise<PointTransaction> {
    const id = randomUUID();
    const newTransaction: PointTransaction = {
      id,
      createdAt: new Date(),
      status: 'completed',
      metadata: {},
      auditTrail: [],
      fromUserId: null,
      toUserId: null,
      fromWalletType: null,
      toWalletType: null,
      orderId: null,
      merchantId: null,
      description: null,
      commissionRate: null,
      vatAmount: null,
      serviceCharge: null,
      finalAmount: null,
      ...transaction
    };
    this.pointTransactions.set(id, newTransaction);
    return newTransaction;
  }

  // StepUp reward numbers
  async getActiveRewardNumbers(userId: string): Promise<StepUpRewardNumber[]> {
    return Array.from(this.stepUpRewardNumbers.values())
      .filter(rn => rn.userId === userId && !rn.isCompleted);
  }

  async createStepUpRewardNumber(rewardNumber: InsertStepUpRewardNumber): Promise<StepUpRewardNumber> {
    const id = randomUUID();
    const newRewardNumber: StepUpRewardNumber = {
      id,
      createdAt: new Date(),
      updatedAt: new Date(),
      tier1Status: 'active',
      tier1Amount: 800,
      tier1CompletedAt: null,
      tier2Status: 'locked',
      tier2Amount: 1500,
      tier2CompletedAt: null,
      tier3Status: 'locked',
      tier3Amount: 3500,
      tier3CompletedAt: null,
      tier4Status: 'locked',
      tier4Amount: 32200,
      tier4VoucherReserve: 6000,
      tier4RedeemableAmount: 20200,
      tier4CompletedAt: null,
      currentPoints: 0,
      totalPointsRequired: 37000,
      isCompleted: false,
      completedAt: null,
      ...rewardNumber
    };
    this.stepUpRewardNumbers.set(id, newRewardNumber);
    return newRewardNumber;
  }

  async updateStepUpRewardNumber(id: string, rewardNumber: Partial<StepUpRewardNumber>): Promise<StepUpRewardNumber> {
    const existing = this.stepUpRewardNumbers.get(id);
    if (!existing) throw new Error("Reward number not found");
    
    const updated: StepUpRewardNumber = {
      ...existing,
      ...rewardNumber,
      updatedAt: new Date()
    };
    this.stepUpRewardNumbers.set(id, updated);
    return updated;
  }

  // Referral system
  async getReferralByReferee(refereeId: string): Promise<Referral | undefined> {
    return Array.from(this.referrals.values())
      .find(referral => referral.refereeId === refereeId);
  }

  async createReferral(referral: InsertReferral): Promise<Referral> {
    const id = randomUUID();
    const newReferral: Referral = {
      id,
      createdAt: new Date(),
      lifetimeCommissionEarned: '0.00',
      totalRippleRewards: 0,
      isActive: true,
      ...referral
    };
    this.referrals.set(id, newReferral);
    return newReferral;
  }

  async updateReferral(id: string, referral: Partial<Referral>): Promise<Referral> {
    const existing = this.referrals.get(id);
    if (!existing) throw new Error("Referral not found");
    
    const updated: Referral = { ...existing, ...referral };
    this.referrals.set(id, updated);
    return updated;
  }

  // Commission transactions
  async createCommissionTransaction(commission: InsertCommissionTransaction): Promise<CommissionTransaction> {
    const id = randomUUID();
    const newCommission: CommissionTransaction = {
      id,
      createdAt: new Date(),
      commissionRate: null,
      rippleLevel: null,
      rippleAmount: null,
      ...commission
    };
    this.commissionTransactions.set(id, newCommission);
    return newCommission;
  }

  // Merchant transactions
  async getMerchantTransactions(merchantId: string): Promise<MerchantTransaction[]> {
    return Array.from(this.merchantTransactions.values())
      .filter(transaction => transaction.merchantId === merchantId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  async createMerchantTransaction(transaction: InsertMerchantTransaction): Promise<MerchantTransaction> {
    const id = randomUUID();
    const newTransaction: MerchantTransaction = {
      id,
      createdAt: new Date(),
      pointsInvolved: null,
      customerId: null,
      referredMerchantId: null,
      cashbackRate: null,
      commissionRate: null,
      royaltyPoolContribution: null,
      monthlyDistribution: false,
      distributionMonth: null,
      ...transaction
    };
    this.merchantTransactions.set(id, newTransaction);
    return newTransaction;
  }

  // QR transfers
  async getQRTransfer(qrCode: string): Promise<QRTransfer | undefined> {
    return Array.from(this.qrTransfers.values())
      .find(transfer => transfer.qrCode === qrCode);
  }

  async createQRTransfer(transfer: InsertQRTransfer): Promise<QRTransfer> {
    const id = randomUUID();
    const newTransfer: QRTransfer = {
      id,
      createdAt: new Date(),
      receiverId: null,
      isUsed: false,
      usedAt: null,
      transferType: 'direct',
      ...transfer
    };
    this.qrTransfers.set(id, newTransfer);
    return newTransfer;
  }

  async updateQRTransfer(id: string, transfer: Partial<QRTransfer>): Promise<QRTransfer> {
    const existing = this.qrTransfers.get(id);
    if (!existing) throw new Error("QR transfer not found");
    
    const updated: QRTransfer = { ...existing, ...transfer };
    this.qrTransfers.set(id, updated);
    return updated;
  }

  // Admin settings
  async getAdminSetting(settingKey: string): Promise<AdminSetting | undefined> {
    return Array.from(this.adminSettings.values())
      .find(setting => setting.settingKey === settingKey);
  }

  async createAdminSetting(setting: InsertAdminSetting): Promise<AdminSetting> {
    const id = randomUUID();
    const newSetting: AdminSetting = {
      id,
      createdAt: new Date(),
      updatedAt: new Date(),
      description: null,
      category: null,
      isActive: true,
      lastUpdatedBy: null,
      ...setting
    };
    this.adminSettings.set(id, newSetting);
    return newSetting;
  }

  async updateAdminSetting(id: string, setting: Partial<AdminSetting>): Promise<AdminSetting> {
    const existing = this.adminSettings.get(id);
    if (!existing) throw new Error("Admin setting not found");
    
    const updated: AdminSetting = {
      ...existing,
      ...setting,
      updatedAt: new Date()
    };
    this.adminSettings.set(id, updated);
    return updated;
  }

  // Leaderboards
  async getLeaderboard(type: 'global' | 'local', country?: string): Promise<Leaderboard[]> {
    return Array.from(this.leaderboards.values())
      .filter(entry => {
        if (entry.leaderboardType !== type) return false;
        if (type === 'local' && country && entry.country !== country) return false;
        return true;
      })
      .sort((a, b) => (a.rank || 0) - (b.rank || 0));
  }

  async createLeaderboard(leaderboard: InsertLeaderboard): Promise<Leaderboard> {
    const id = randomUUID();
    const newLeaderboard: Leaderboard = {
      id,
      createdAt: new Date(),
      calculatedAt: new Date(),
      totalPoints: 0,
      rewardNumbersCount: 0,
      completedTiers: 0,
      rank: null,
      ...leaderboard
    };
    this.leaderboards.set(id, newLeaderboard);
    return newLeaderboard;
  }

  async createChatRoom(room: InsertChatRoom): Promise<ChatRoom> {
    const id = crypto.randomUUID();
    const newRoom: ChatRoom = {
      id,
      createdAt: new Date(),
      ...room
    };
    this.chatRooms.set(id, newRoom);
    return newRoom;
  }

  // Merchant Wallet System Implementation
  private merchantWallets: Map<string, MerchantWallet> = new Map();
  private walletTransactions: Map<string, WalletTransaction> = new Map();
  private merchantIncome: Map<string, MerchantIncome> = new Map();
  private merchantReferrals: Map<string, MerchantReferral> = new Map();
  private royaltyDistributions: Map<string, RoyaltyDistribution> = new Map();
  private merchantShops: Map<string, MerchantShop> = new Map();

  async getMerchantWallet(merchantId: string): Promise<MerchantWallet | undefined> {
    return this.merchantWallets.get(merchantId);
  }

  async createMerchantWallet(wallet: InsertMerchantWallet): Promise<MerchantWallet> {
    const id = randomUUID();
    const newWallet: MerchantWallet = {
      id,
      ...wallet,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    this.merchantWallets.set(merchantId, newWallet);
    return newWallet;
  }

  async updateMerchantWallet(merchantId: string, wallet: Partial<MerchantWallet>): Promise<MerchantWallet> {
    const existing = this.merchantWallets.get(merchantId);
    if (!existing) {
      throw new Error('Merchant wallet not found');
    }
    const updated = { ...existing, ...wallet, updatedAt: new Date() };
    this.merchantWallets.set(merchantId, updated);
    return updated;
  }

  async createWalletTransaction(transaction: InsertWalletTransaction): Promise<WalletTransaction> {
    const id = randomUUID();
    const newTransaction: WalletTransaction = {
      id,
      ...transaction,
      createdAt: new Date()
    };
    this.walletTransactions.set(id, newTransaction);
    return newTransaction;
  }

  async getWalletTransactions(merchantId: string, walletType?: string): Promise<WalletTransaction[]> {
    return Array.from(this.walletTransactions.values())
      .filter(t => t.merchantId === merchantId && (!walletType || t.walletType === walletType))
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  async createMerchantIncome(income: InsertMerchantIncome): Promise<MerchantIncome> {
    const id = randomUUID();
    const newIncome: MerchantIncome = {
      id,
      ...income,
      createdAt: new Date()
    };
    this.merchantIncome.set(id, newIncome);
    return newIncome;
  }

  async getMerchantIncome(merchantId: string, incomeType?: string): Promise<MerchantIncome[]> {
    return Array.from(this.merchantIncome.values())
      .filter(i => i.merchantId === merchantId && (!incomeType || i.incomeType === incomeType))
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  async createMerchantReferral(referral: InsertMerchantReferral): Promise<MerchantReferral> {
    const id = randomUUID();
    const newReferral: MerchantReferral = {
      id,
      ...referral,
      createdAt: new Date()
    };
    this.merchantReferrals.set(id, newReferral);
    return newReferral;
  }

  async getMerchantReferrals(merchantId: string): Promise<MerchantReferral[]> {
    return Array.from(this.merchantReferrals.values())
      .filter(r => r.referrerMerchantId === merchantId || r.referredMerchantId === merchantId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  async getMerchantReferralByCode(referralCode: string): Promise<MerchantReferral | undefined> {
    return Array.from(this.merchantReferrals.values())
      .find(r => r.referralCode === referralCode);
  }

  async createRoyaltyDistribution(distribution: InsertRoyaltyDistribution): Promise<RoyaltyDistribution> {
    const id = randomUUID();
    const newDistribution: RoyaltyDistribution = {
      id,
      ...distribution,
      createdAt: new Date()
    };
    this.royaltyDistributions.set(id, newDistribution);
    return newDistribution;
  }

  async getRoyaltyDistributions(): Promise<RoyaltyDistribution[]> {
    return Array.from(this.royaltyDistributions.values())
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  async getRoyaltyDistributionByMonth(month: string): Promise<RoyaltyDistribution | undefined> {
    return Array.from(this.royaltyDistributions.values())
      .find(d => d.month === month);
  }

  async getMerchantShop(merchantId: string): Promise<MerchantShop | undefined> {
    return this.merchantShops.get(merchantId);
  }

  async createMerchantShop(shop: InsertMerchantShop): Promise<MerchantShop> {
    const id = randomUUID();
    const newShop: MerchantShop = {
      id,
      ...shop,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    this.merchantShops.set(merchantId, newShop);
    return newShop;
  }

  async updateMerchantShop(merchantId: string, shop: Partial<MerchantShop>): Promise<MerchantShop> {
    const existing = this.merchantShops.get(merchantId);
    if (!existing) {
      throw new Error('Merchant shop not found');
    }
    const updated = { ...existing, ...shop, updatedAt: new Date() };
    this.merchantShops.set(merchantId, updated);
    return updated;
  }

  async getMerchantShops(): Promise<MerchantShop[]> {
    return Array.from(this.merchantShops.values())
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  // Point Recharge System Implementation
  private pointRecharges: Map<string, PointRecharge> = new Map();
  private productSales: Map<string, ProductSale> = new Map();
  private merchantActivity: Map<string, MerchantActivity> = new Map();
  private emerchantProducts: Map<string, EMerchantProduct> = new Map();
  private productReviewSettings: Map<string, ProductReviewSetting> = new Map();
  private pointDistributionReports: Map<string, PointDistributionReport> = new Map();

  async createPointRecharge(recharge: InsertPointRecharge): Promise<PointRecharge> {
    const id = randomUUID();
    const newRecharge: PointRecharge = {
      id,
      ...recharge,
      createdAt: new Date()
    };
    this.pointRecharges.set(id, newRecharge);
    return newRecharge;
  }

  async getPointRecharges(merchantId: string): Promise<PointRecharge[]> {
    return Array.from(this.pointRecharges.values())
      .filter(r => r.merchantId === merchantId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  async updatePointRecharge(id: string, recharge: Partial<PointRecharge>): Promise<PointRecharge> {
    const existing = this.pointRecharges.get(id);
    if (!existing) {
      throw new Error('Point recharge not found');
    }
    const updated = { ...existing, ...recharge };
    this.pointRecharges.set(id, updated);
    return updated;
  }

  // Product Sales Implementation
  async createProductSale(sale: InsertProductSale): Promise<ProductSale> {
    const id = randomUUID();
    const newSale: ProductSale = {
      id,
      ...sale,
      createdAt: new Date()
    };
    this.productSales.set(id, newSale);
    return newSale;
  }

  async getProductSales(merchantId: string): Promise<ProductSale[]> {
    return Array.from(this.productSales.values())
      .filter(s => s.merchantId === merchantId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  async getProductSalesByPeriod(merchantId: string, startDate: Date, endDate: Date): Promise<ProductSale[]> {
    return Array.from(this.productSales.values())
      .filter(s => s.merchantId === merchantId && s.createdAt >= startDate && s.createdAt <= endDate)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  // Merchant Activity Implementation
  async getMerchantActivity(merchantId: string, month?: string): Promise<MerchantActivity | undefined> {
    const key = month ? `${merchantId}-${month}` : merchantId;
    return this.merchantActivity.get(key);
  }

  async createMerchantActivity(activity: InsertMerchantActivity): Promise<MerchantActivity> {
    const id = randomUUID();
    const key = `${activity.merchantId}-${activity.month}`;
    const newActivity: MerchantActivity = {
      id,
      ...activity,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    this.merchantActivity.set(key, newActivity);
    return newActivity;
  }

  async updateMerchantActivity(merchantId: string, month: string, activity: Partial<MerchantActivity>): Promise<MerchantActivity> {
    const key = `${merchantId}-${month}`;
    const existing = this.merchantActivity.get(key);
    if (!existing) {
      throw new Error('Merchant activity not found');
    }
    const updated = { ...existing, ...activity, updatedAt: new Date() };
    this.merchantActivity.set(key, updated);
    return updated;
  }

  async getMerchantActivityStatus(merchantId: string): Promise<MerchantActivity[]> {
    return Array.from(this.merchantActivity.values())
      .filter(a => a.merchantId === merchantId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  // E-Merchant Products Implementation
  async getEMerchantProducts(merchantId: string): Promise<EMerchantProduct[]> {
    return Array.from(this.emerchantProducts.values())
      .filter(p => p.merchantId === merchantId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  async createEMerchantProduct(product: InsertEMerchantProduct): Promise<EMerchantProduct> {
    const id = randomUUID();
    const newProduct: EMerchantProduct = {
      id,
      ...product,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    this.emerchantProducts.set(id, newProduct);
    return newProduct;
  }

  async updateEMerchantProduct(id: string, product: Partial<EMerchantProduct>): Promise<EMerchantProduct> {
    const existing = this.emerchantProducts.get(id);
    if (!existing) {
      throw new Error('E-merchant product not found');
    }
    const updated = { ...existing, ...product, updatedAt: new Date() };
    this.emerchantProducts.set(id, updated);
    return updated;
  }

  // Product Review Settings Implementation
  async getProductReviewSettings(merchantId: string): Promise<ProductReviewSetting[]> {
    return Array.from(this.productReviewSettings.values())
      .filter(s => s.merchantId === merchantId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  async createProductReviewSetting(setting: InsertProductReviewSetting): Promise<ProductReviewSetting> {
    const id = randomUUID();
    const newSetting: ProductReviewSetting = {
      id,
      ...setting,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    this.productReviewSettings.set(id, newSetting);
    return newSetting;
  }

  async updateProductReviewSetting(merchantId: string, productId: string, setting: Partial<ProductReviewSetting>): Promise<ProductReviewSetting> {
    const key = `${merchantId}-${productId}`;
    const existing = Array.from(this.productReviewSettings.values())
      .find(s => s.merchantId === merchantId && s.productId === productId);
    
    if (!existing) {
      throw new Error('Product review setting not found');
    }
    const updated = { ...existing, ...setting, updatedAt: new Date() };
    this.productReviewSettings.set(existing.id, updated);
    return updated;
  }

  // Point Distribution Reports Implementation
  async createPointDistributionReport(report: InsertPointDistributionReport): Promise<PointDistributionReport> {
    const id = randomUUID();
    const newReport: PointDistributionReport = {
      id,
      ...report,
      generatedAt: new Date()
    };
    this.pointDistributionReports.set(id, newReport);
    return newReport;
  }

  async getPointDistributionReports(merchantId: string, reportType?: string): Promise<PointDistributionReport[]> {
    return Array.from(this.pointDistributionReports.values())
      .filter(r => r.merchantId === merchantId && (!reportType || r.reportType === reportType))
      .sort((a, b) => b.generatedAt.getTime() - a.generatedAt.getTime());
  }

  async generatePointDistributionReport(merchantId: string, reportType: string, period: string): Promise<PointDistributionReport> {
    // Generate report data based on type
    let reportData: any = {};
    let totalPointsDistributed = 0;
    let totalSales = 0;

    if (reportType === 'product_wise') {
      const sales = await this.getProductSales(merchantId);
      reportData = sales.reduce((acc, sale) => {
        if (!acc[sale.productId]) {
          acc[sale.productId] = { points: 0, sales: 0, count: 0 };
        }
        acc[sale.productId].points += sale.rewardPointsGiven;
        acc[sale.productId].sales += parseFloat(sale.totalAmount);
        acc[sale.productId].count += sale.quantity;
        totalPointsDistributed += sale.rewardPointsGiven;
        totalSales += parseFloat(sale.totalAmount);
        return acc;
      }, {} as any);
    } else if (reportType === 'monthly_summary') {
      const sales = await this.getProductSales(merchantId);
      reportData = sales.reduce((acc, sale) => {
        const month = sale.createdAt.toISOString().substring(0, 7);
        if (!acc[month]) {
          acc[month] = { points: 0, sales: 0, count: 0 };
        }
        acc[month].points += sale.rewardPointsGiven;
        acc[month].sales += parseFloat(sale.totalAmount);
        acc[month].count += sale.quantity;
        totalPointsDistributed += sale.rewardPointsGiven;
        totalSales += parseFloat(sale.totalAmount);
        return acc;
      }, {} as any);
    }

    const report = await this.createPointDistributionReport({
      merchantId,
      reportType,
      period,
      totalPointsDistributed,
      totalSales: totalSales.toString(),
      reportData
    });

    return report;
  }

  // Customer Portal Implementation
  private customerProfiles: Map<string, CustomerProfile> = new Map();
  private customerWallets: Map<string, CustomerWallet> = new Map();
  private customerPointTransactions: Map<string, CustomerPointTransaction> = new Map();
  private customerSerialNumbers: Map<string, CustomerSerialNumber> = new Map();
  private customerOTPs: Map<string, CustomerOTP> = new Map();
  private customerPointTransfers: Map<string, CustomerPointTransfer> = new Map();
  private customerPurchases: Map<string, CustomerPurchase> = new Map();
  private globalSerialCounter = 0;

  // Customer Profiles
  async createCustomerProfile(profile: InsertCustomerProfile): Promise<CustomerProfile> {
    const id = randomUUID();
    const newProfile: CustomerProfile = {
      id,
      ...profile,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    this.customerProfiles.set(id, newProfile);
    return newProfile;
  }

  async getCustomerProfile(userId: string): Promise<CustomerProfile | undefined> {
    return Array.from(this.customerProfiles.values())
      .find(p => p.userId === userId);
  }

  async getCustomerProfileById(customerId: string): Promise<CustomerProfile | undefined> {
    return this.customerProfiles.get(customerId);
  }

  async getCustomerProfileByMobile(mobileNumber: string): Promise<CustomerProfile | undefined> {
    return Array.from(this.customerProfiles.values())
      .find(p => p.mobileNumber === mobileNumber);
  }

  async getCustomerProfileByAccountNumber(accountNumber: string): Promise<CustomerProfile | undefined> {
    return Array.from(this.customerProfiles.values())
      .find(p => p.uniqueAccountNumber === accountNumber);
  }

  async updateCustomerProfile(userId: string, profile: Partial<CustomerProfile>): Promise<CustomerProfile> {
    const existing = await this.getCustomerProfile(userId);
    if (!existing) {
      throw new Error('Customer profile not found');
    }
    const updated = { ...existing, ...profile, updatedAt: new Date() };
    this.customerProfiles.set(existing.id, updated);
    return updated;
  }

  async generateUniqueAccountNumber(): Promise<string> {
    const count = this.customerProfiles.size + 1;
    return `KOM${count.toString().padStart(8, '0')}`;
  }

  // Customer Wallets
  async createCustomerWallet(wallet: InsertCustomerWallet): Promise<CustomerWallet> {
    const id = randomUUID();
    const newWallet: CustomerWallet = {
      id,
      ...wallet,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    this.customerWallets.set(id, newWallet);
    return newWallet;
  }

  async getCustomerWallet(customerId: string): Promise<CustomerWallet | undefined> {
    return Array.from(this.customerWallets.values())
      .find(w => w.customerId === customerId);
  }

  async updateCustomerWallet(customerId: string, wallet: Partial<CustomerWallet>): Promise<CustomerWallet> {
    const existing = await this.getCustomerWallet(customerId);
    if (!existing) {
      throw new Error('Customer wallet not found');
    }
    const updated = { ...existing, ...wallet, updatedAt: new Date() };
    this.customerWallets.set(existing.id, updated);
    return updated;
  }

  // Customer Point Transactions
  async createCustomerPointTransaction(transaction: InsertCustomerPointTransaction): Promise<CustomerPointTransaction> {
    const id = randomUUID();
    const newTransaction: CustomerPointTransaction = {
      id,
      ...transaction,
      createdAt: new Date()
    };
    this.customerPointTransactions.set(id, newTransaction);
    return newTransaction;
  }

  async getCustomerPointTransactions(customerId: string): Promise<CustomerPointTransaction[]> {
    return Array.from(this.customerPointTransactions.values())
      .filter(t => t.customerId === customerId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  async getCustomerPointTransactionsByMerchant(customerId: string, merchantId: string): Promise<CustomerPointTransaction[]> {
    return Array.from(this.customerPointTransactions.values())
      .filter(t => t.customerId === customerId && t.merchantId === merchantId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  // Customer Serial Numbers
  async createCustomerSerialNumber(serial: InsertCustomerSerialNumber): Promise<CustomerSerialNumber> {
    const id = randomUUID();
    const newSerial: CustomerSerialNumber = {
      id,
      ...serial,
      assignedAt: new Date()
    };
    this.customerSerialNumbers.set(id, newSerial);
    return newSerial;
  }

  async getCustomerSerialNumber(customerId: string): Promise<CustomerSerialNumber | undefined> {
    return Array.from(this.customerSerialNumbers.values())
      .find(s => s.customerId === customerId);
  }

  async getNextGlobalSerialNumber(): Promise<number> {
    this.globalSerialCounter++;
    return this.globalSerialCounter;
  }

  async assignSerialNumberToCustomer(customerId: string): Promise<CustomerSerialNumber> {
    const globalSerialNumber = await this.getNextGlobalSerialNumber();
    const totalSerialCount = this.customerSerialNumbers.size + 1;
    
    const serial = await this.createCustomerSerialNumber({
      customerId,
      globalSerialNumber,
      totalSerialCount,
      pointsAtSerial: 1500,
      isActive: true
    });

    // Update customer profile with serial numbers
    const profile = await this.getCustomerProfile(customerId);
    if (profile) {
      await this.updateCustomerProfile(profile.userId, {
        globalSerialNumber,
        localSerialNumber: totalSerialCount
      });
    }

    return serial;
  }

  // Customer OTP
  async createCustomerOTP(otp: InsertCustomerOTP): Promise<CustomerOTP> {
    const id = randomUUID();
    const newOTP: CustomerOTP = {
      id,
      ...otp,
      createdAt: new Date()
    };
    this.customerOTPs.set(id, newOTP);
    return newOTP;
  }

  async getCustomerOTP(customerId: string, otpType: string): Promise<CustomerOTP | undefined> {
    return Array.from(this.customerOTPs.values())
      .find(o => o.customerId === customerId && o.otpType === otpType && !o.isUsed && o.expiresAt > new Date())
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())[0];
  }

  async verifyCustomerOTP(customerId: string, otpCode: string, otpType: string): Promise<boolean> {
    const otp = await this.getCustomerOTP(customerId, otpType);
    if (!otp || otp.otpCode !== otpCode) {
      return false;
    }
    await this.markOTPAsUsed(otp.id);
    return true;
  }

  async markOTPAsUsed(otpId: string): Promise<void> {
    const otp = this.customerOTPs.get(otpId);
    if (otp) {
      otp.isUsed = true;
      this.customerOTPs.set(otpId, otp);
    }
  }

  // Customer Point Transfers
  async createCustomerPointTransfer(transfer: InsertCustomerPointTransfer): Promise<CustomerPointTransfer> {
    const id = randomUUID();
    const newTransfer: CustomerPointTransfer = {
      id,
      ...transfer,
      createdAt: new Date()
    };
    this.customerPointTransfers.set(id, newTransfer);
    return newTransfer;
  }

  async getCustomerPointTransfers(customerId: string): Promise<CustomerPointTransfer[]> {
    return Array.from(this.customerPointTransfers.values())
      .filter(t => t.fromCustomerId === customerId || t.toCustomerId === customerId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  async updateCustomerPointTransfer(transferId: string, transfer: Partial<CustomerPointTransfer>): Promise<CustomerPointTransfer> {
    const existing = this.customerPointTransfers.get(transferId);
    if (!existing) {
      throw new Error('Customer point transfer not found');
    }
    const updated = { ...existing, ...transfer };
    this.customerPointTransfers.set(transferId, updated);
    return updated;
  }

  // Customer Purchases
  async createCustomerPurchase(purchase: InsertCustomerPurchase): Promise<CustomerPurchase> {
    const id = randomUUID();
    const newPurchase: CustomerPurchase = {
      id,
      ...purchase,
      purchaseDate: new Date()
    };
    this.customerPurchases.set(id, newPurchase);
    return newPurchase;
  }

  async getCustomerPurchases(customerId: string): Promise<CustomerPurchase[]> {
    return Array.from(this.customerPurchases.values())
      .filter(p => p.customerId === customerId)
      .sort((a, b) => b.purchaseDate.getTime() - a.purchaseDate.getTime());
  }

  async getCustomerPurchasesByMerchant(customerId: string, merchantId: string): Promise<CustomerPurchase[]> {
    return Array.from(this.customerPurchases.values())
      .filter(p => p.customerId === customerId && p.merchantId === merchantId)
      .sort((a, b) => b.purchaseDate.getTime() - a.purchaseDate.getTime());
  }

  // Customer QR Code
  async generateCustomerQRCode(userId: string): Promise<string> {
    const profile = await this.getCustomerProfile(userId);
    if (!profile) {
      throw new Error('Customer profile not found');
    }
    
    // Create a simpler QR code format that's more scannable
    // Format: KOMARCE:CUSTOMER:customerId:accountNumber
    const qrData = `KOMARCE:CUSTOMER:${profile.id}:${profile.uniqueAccountNumber}`;
    
    // Update profile with QR code
    await this.updateCustomerProfile(profile.userId, { qrCode: qrData });
    
    return qrData;
  }

  async getCustomerByQRCode(qrCode: string): Promise<CustomerProfile | undefined> {
    // Handle both old JSON format and new simple format
    if (qrCode.startsWith('KOMARCE:CUSTOMER:')) {
      // New format: KOMARCE:CUSTOMER:customerId:accountNumber
      const parts = qrCode.split(':');
      if (parts.length >= 4) {
        const customerId = parts[2];
        return Array.from(this.customerProfiles.values())
          .find(p => p.id === customerId);
      }
    } else {
      // Old JSON format - try to parse and find by customerId
      try {
        const qrData = JSON.parse(qrCode);
        if (qrData.customerId) {
          return Array.from(this.customerProfiles.values())
            .find(p => p.id === qrData.customerId);
        }
      } catch (e) {
        // If JSON parsing fails, try direct match
        return Array.from(this.customerProfiles.values())
          .find(p => p.qrCode === qrCode);
      }
    }
    
    return undefined;
  }

  // Advanced Customer Reward System Implementation
  private customerRewards: Map<string, CustomerReward> = new Map();
  private customerAffiliateLinks: Map<string, CustomerAffiliateLink> = new Map();
  private customerReferrals: Map<string, CustomerReferral> = new Map();
  private customerDailyLogins: Map<string, CustomerDailyLogin> = new Map();
  private customerBirthdayPoints: Map<string, CustomerBirthdayPoint> = new Map();
  private shoppingVouchers: Map<string, ShoppingVoucher> = new Map();
  private serialActivationQueue: Map<string, SerialActivationQueue> = new Map();

  // Three Wallet System Implementation
  private customerWalletTransactions: Map<string, CustomerWalletTransaction> = new Map();
  private customerWalletTransfers: Map<string, CustomerWalletTransfer> = new Map();
  private customerReferralCommissions: Map<string, CustomerReferralCommission> = new Map();
  private companyReferrers: Map<string, CompanyReferrer> = new Map();
  private wasteManagementRewards: Map<string, WasteManagementReward> = new Map();
  private medicalFacilityBenefits: Map<string, MedicalFacilityBenefit> = new Map();

  // Customer Rewards
  async createCustomerReward(reward: InsertCustomerReward): Promise<CustomerReward> {
    const id = randomUUID();
    const newReward: CustomerReward = {
      id,
      ...reward,
      createdAt: new Date()
    };
    this.customerRewards.set(id, newReward);
    return newReward;
  }

  async getCustomerRewards(customerId: string): Promise<CustomerReward[]> {
    return Array.from(this.customerRewards.values())
      .filter(r => r.customerId === customerId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  async getCustomerRewardsByType(customerId: string, rewardType: string): Promise<CustomerReward[]> {
    return Array.from(this.customerRewards.values())
      .filter(r => r.customerId === customerId && r.rewardType === rewardType)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  async updateCustomerReward(rewardId: string, reward: Partial<CustomerReward>): Promise<CustomerReward> {
    const existing = this.customerRewards.get(rewardId);
    if (!existing) {
      throw new Error('Customer reward not found');
    }
    const updated = { ...existing, ...reward };
    this.customerRewards.set(rewardId, updated);
    return updated;
  }

  async processSerialReward(customerId: string, serialType: 'global' | 'local', step: number): Promise<CustomerReward> {
    // Define reward structures based on the document
    const globalRewards = {
      1: { multiplier: 6, points: 800, cashValue: 800 },
      2: { multiplier: 30, points: 1500, cashValue: 1500 },
      3: { multiplier: 120, points: 3500, cashValue: 3500 },
      4: { multiplier: 480, points: 32200, cashValue: 32200 }
    };

    const localRewards = {
      1: { multiplier: 5, points: 300, cashValue: 300 },
      2: { multiplier: 20, points: 500, cashValue: 500 },
      3: { multiplier: 60, points: 1200, cashValue: 1200 },
      4: { multiplier: 180, points: 3000, cashValue: 3000 }
    };

    const rewardStructure = serialType === 'global' ? globalRewards : localRewards;
    const rewardData = rewardStructure[step as keyof typeof rewardStructure];

    if (!rewardData) {
      throw new Error('Invalid reward step');
    }

    const reward = await this.createCustomerReward({
      customerId,
      rewardType: serialType === 'global' ? 'global_serial' : 'local_serial',
      rewardStep: step,
      pointsAwarded: rewardData.points,
      cashValue: rewardData.cashValue.toString(),
      multiplier: rewardData.multiplier,
      status: 'awarded'
    });

    // Update customer wallet
    const wallet = await this.getCustomerWallet(customerId);
    if (wallet) {
      await this.updateCustomerWallet(customerId, {
        pointsBalance: wallet.pointsBalance + rewardData.points,
        totalPointsEarned: wallet.totalPointsEarned + rewardData.points,
        lastTransactionAt: new Date()
      });

      // Create transaction record
      await this.createCustomerPointTransaction({
        customerId,
        merchantId: 'system',
        transactionType: 'earned',
        points: rewardData.points,
        balanceAfter: wallet.pointsBalance + rewardData.points,
        description: `Serial ${serialType} reward - Step ${step} (${rewardData.multiplier}x)`,
        referenceId: reward.id
      });
    }

    // Special handling for 4th step global reward (32,200 BDT)
    if (serialType === 'global' && step === 4) {
      await this.distributeFourthStepReward(customerId, reward.id);
    }

    return reward;
  }

  // Customer Affiliate Links
  async createCustomerAffiliateLink(link: InsertCustomerAffiliateLink): Promise<CustomerAffiliateLink> {
    const id = randomUUID();
    const newLink: CustomerAffiliateLink = {
      id,
      ...link,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    this.customerAffiliateLinks.set(id, newLink);
    return newLink;
  }

  async getCustomerAffiliateLink(customerId: string): Promise<CustomerAffiliateLink | undefined> {
    return Array.from(this.customerAffiliateLinks.values())
      .find(l => l.customerId === customerId);
  }

  async getAffiliateLinkByCode(affiliateCode: string): Promise<CustomerAffiliateLink | undefined> {
    return Array.from(this.customerAffiliateLinks.values())
      .find(l => l.affiliateCode === affiliateCode);
  }

  async updateAffiliateLinkStats(affiliateCode: string, type: 'click' | 'registration'): Promise<void> {
    const link = await this.getAffiliateLinkByCode(affiliateCode);
    if (link) {
      const updated = {
        ...link,
        totalClicks: type === 'click' ? link.totalClicks + 1 : link.totalClicks,
        totalRegistrations: type === 'registration' ? link.totalRegistrations + 1 : link.totalRegistrations,
        updatedAt: new Date()
      };
      this.customerAffiliateLinks.set(link.id, updated);
    }
  }

  async generateAffiliateCode(customerId: string): Promise<string> {
    const profile = await this.getCustomerProfile(customerId);
    if (!profile) {
      throw new Error('Customer profile not found');
    }
    
    const code = `AFF${profile.uniqueAccountNumber.slice(-6)}${Math.random().toString(36).substr(2, 4).toUpperCase()}`;
    const affiliateUrl = `https://komarce.com/register?ref=${code}`;
    
    await this.createCustomerAffiliateLink({
      customerId,
      affiliateCode: code,
      affiliateUrl
    });
    
    return code;
  }

  // Customer Referrals
  async createCustomerReferral(referral: InsertCustomerReferral): Promise<CustomerReferral> {
    const id = randomUUID();
    const newReferral: CustomerReferral = {
      id,
      ...referral,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    this.customerReferrals.set(id, newReferral);
    return newReferral;
  }

  async getCustomerReferrals(referrerId: string): Promise<CustomerReferral[]> {
    return Array.from(this.customerReferrals.values())
      .filter(r => r.referrerId === referrerId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  async getCustomerReferralByReferred(referredId: string): Promise<CustomerReferral | undefined> {
    return Array.from(this.customerReferrals.values())
      .find(r => r.referredId === referredId);
  }

  async updateReferralCommission(referralId: string, pointsEarned: number): Promise<void> {
    const referral = this.customerReferrals.get(referralId);
    if (referral) {
      const commissionRate = parseFloat(referral.commissionRate.toString());
      const commissionPoints = Math.floor(pointsEarned * (commissionRate / 100));
      const commissionValue = commissionPoints * 0.01; // Assuming 1 point = 0.01 BDT
      
      const updated = {
        ...referral,
        totalPointsEarned: referral.totalPointsEarned + commissionPoints,
        totalCommissionEarned: (parseFloat(referral.totalCommissionEarned.toString()) + commissionValue).toString(),
        updatedAt: new Date()
      };
      this.customerReferrals.set(referralId, updated);

      // Award commission to referrer
      const referrerWallet = await this.getCustomerWallet(referral.referrerId);
      if (referrerWallet) {
        await this.updateCustomerWallet(referral.referrerId, {
          pointsBalance: referrerWallet.pointsBalance + commissionPoints,
          totalPointsEarned: referrerWallet.totalPointsEarned + commissionPoints,
          lastTransactionAt: new Date()
        });

        await this.createCustomerPointTransaction({
          customerId: referral.referrerId,
          merchantId: 'system',
          transactionType: 'earned',
          points: commissionPoints,
          balanceAfter: referrerWallet.pointsBalance + commissionPoints,
          description: `Referral commission (${commissionRate}%) from customer`,
          referenceId: referral.id
        });
      }
    }
  }

  async calculateReferralCommission(referredId: string, pointsEarned: number): Promise<void> {
    const referral = await this.getCustomerReferralByReferred(referredId);
    if (referral) {
      await this.updateReferralCommission(referral.id, pointsEarned);
    }
  }

  // Daily Login Points
  async createCustomerDailyLogin(login: InsertCustomerDailyLogin): Promise<CustomerDailyLogin> {
    const id = randomUUID();
    const newLogin: CustomerDailyLogin = {
      id,
      ...login,
      createdAt: new Date()
    };
    this.customerDailyLogins.set(id, newLogin);
    return newLogin;
  }

  async getCustomerDailyLogins(customerId: string): Promise<CustomerDailyLogin[]> {
    return Array.from(this.customerDailyLogins.values())
      .filter(l => l.customerId === customerId)
      .sort((a, b) => b.loginDate.getTime() - a.loginDate.getTime());
  }

  async getCustomerDailyLogin(customerId: string, date: string): Promise<CustomerDailyLogin | undefined> {
    return Array.from(this.customerDailyLogins.values())
      .find(l => l.customerId === customerId && l.loginDate.toISOString().split('T')[0] === date);
  }

  async processDailyLogin(customerId: string): Promise<CustomerDailyLogin> {
    const today = new Date().toISOString().split('T')[0];
    const existingLogin = await this.getCustomerDailyLogin(customerId, today);
    
    if (existingLogin) {
      return existingLogin; // Already logged in today
    }

    // Calculate streak and points
    const recentLogins = await this.getCustomerDailyLogins(customerId);
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split('T')[0];
    
    const yesterdayLogin = recentLogins.find(l => l.loginDate.toISOString().split('T')[0] === yesterdayStr);
    const streakCount = yesterdayLogin ? yesterdayLogin.streakCount + 1 : 1;
    
    // Base points: 10, bonus for streaks
    let pointsAwarded = 10;
    if (streakCount >= 7) pointsAwarded = 50; // Weekly bonus
    else if (streakCount >= 3) pointsAwarded = 25; // 3-day streak bonus
    
    const isBonusDay = streakCount % 7 === 0; // Every 7th day is bonus

    const login = await this.createCustomerDailyLogin({
      customerId,
      loginDate: new Date(),
      pointsAwarded,
      streakCount,
      isBonusDay
    });

    // Update customer wallet
    const wallet = await this.getCustomerWallet(customerId);
    if (wallet) {
      await this.updateCustomerWallet(customerId, {
        pointsBalance: wallet.pointsBalance + pointsAwarded,
        totalPointsEarned: wallet.totalPointsEarned + pointsAwarded,
        lastTransactionAt: new Date()
      });

      await this.createCustomerPointTransaction({
        customerId,
        merchantId: 'system',
        transactionType: 'earned',
        points: pointsAwarded,
        balanceAfter: wallet.pointsBalance + pointsAwarded,
        description: `Daily login reward (${streakCount} day streak)`,
        referenceId: login.id
      });
    }

    return login;
  }

  // Birthday Points
  async createCustomerBirthdayPoint(birthday: InsertCustomerBirthdayPoint): Promise<CustomerBirthdayPoint> {
    const id = randomUUID();
    const newBirthday: CustomerBirthdayPoint = {
      id,
      ...birthday,
      createdAt: new Date(),
      awardedAt: new Date()
    };
    this.customerBirthdayPoints.set(id, newBirthday);
    return newBirthday;
  }

  async getCustomerBirthdayPoints(customerId: string): Promise<CustomerBirthdayPoint[]> {
    return Array.from(this.customerBirthdayPoints.values())
      .filter(b => b.customerId === customerId)
      .sort((a, b) => b.awardedAt.getTime() - a.awardedAt.getTime());
  }

  async processBirthdayPoints(customerId: string, birthYear: number): Promise<CustomerBirthdayPoint> {
    const currentYear = new Date().getFullYear();
    const age = currentYear - birthYear;
    
    // Award points based on age: 100 points for under 18, 200 points for 18+
    const pointsAwarded = age < 18 ? 100 : 200;

    const birthday = await this.createCustomerBirthdayPoint({
      customerId,
      birthYear,
      pointsAwarded
    });

    // Update customer wallet
    const wallet = await this.getCustomerWallet(customerId);
    if (wallet) {
      await this.updateCustomerWallet(customerId, {
        pointsBalance: wallet.pointsBalance + pointsAwarded,
        totalPointsEarned: wallet.totalPointsEarned + pointsAwarded,
        lastTransactionAt: new Date()
      });

      await this.createCustomerPointTransaction({
        customerId,
        merchantId: 'system',
        transactionType: 'earned',
        points: pointsAwarded,
        balanceAfter: wallet.pointsBalance + pointsAwarded,
        description: `Birthday gift (${age} years old)`,
        referenceId: birthday.id
      });
    }

    return birthday;
  }

  // Shopping Vouchers
  async createShoppingVoucher(voucher: InsertShoppingVoucher): Promise<ShoppingVoucher> {
    const id = randomUUID();
    const newVoucher: ShoppingVoucher = {
      id,
      ...voucher,
      createdAt: new Date()
    };
    this.shoppingVouchers.set(id, newVoucher);
    return newVoucher;
  }

  async getCustomerShoppingVouchers(customerId: string): Promise<ShoppingVoucher[]> {
    return Array.from(this.shoppingVouchers.values())
      .filter(v => v.customerId === customerId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  async getShoppingVoucherByCode(voucherCode: string): Promise<ShoppingVoucher | undefined> {
    return Array.from(this.shoppingVouchers.values())
      .find(v => v.voucherCode === voucherCode);
  }

  async useShoppingVoucher(voucherCode: string): Promise<ShoppingVoucher> {
    const voucher = await this.getShoppingVoucherByCode(voucherCode);
    if (!voucher) {
      throw new Error('Voucher not found');
    }
    if (voucher.status !== 'active') {
      throw new Error('Voucher is not active');
    }
    if (voucher.expiresAt < new Date()) {
      throw new Error('Voucher has expired');
    }

    const updated = {
      ...voucher,
      status: 'used' as const,
      usedAt: new Date()
    };
    this.shoppingVouchers.set(voucher.id, updated);
    return updated;
  }

  async generateMerchantVouchers(customerId: string, totalValue: number, rewardId: string): Promise<ShoppingVoucher[]> {
    // Get customer's purchase history to determine merchant distribution
    const purchases = await this.getCustomerPurchases(customerId);
    const merchantTotals = new Map<string, number>();
    
    // Calculate total spent per merchant
    purchases.forEach(purchase => {
      const current = merchantTotals.get(purchase.merchantId) || 0;
      merchantTotals.set(purchase.merchantId, current + parseFloat(purchase.totalAmount.toString()));
    });

    const totalSpent = Array.from(merchantTotals.values()).reduce((sum, amount) => sum + amount, 0);
    const vouchers: ShoppingVoucher[] = [];

    // Distribute vouchers proportionally
    for (const [merchantId, spent] of merchantTotals) {
      const proportion = spent / totalSpent;
      const voucherValue = totalValue * proportion;
      
      if (voucherValue > 0) {
        const voucherCode = `VOUCHER${Math.random().toString(36).substr(2, 8).toUpperCase()}`;
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + 30); // 30 days expiry

        const voucher = await this.createShoppingVoucher({
          customerId,
          merchantId,
          voucherCode,
          voucherValue: voucherValue.toString(),
          originalRewardId: rewardId,
          expiresAt
        });
        
        vouchers.push(voucher);
      }
    }

    return vouchers;
  }

  // Serial Activation Queue
  async createSerialActivationQueue(queue: InsertSerialActivationQueue): Promise<SerialActivationQueue> {
    const id = randomUUID();
    const newQueue: SerialActivationQueue = {
      id,
      ...queue,
      createdAt: new Date()
    };
    this.serialActivationQueue.set(id, newQueue);
    return newQueue;
  }

  async getSerialActivationQueue(customerId: string): Promise<SerialActivationQueue[]> {
    return Array.from(this.serialActivationQueue.values())
      .filter(q => q.customerId === customerId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  async processSerialActivation(customerId: string, serialType: 'global' | 'local'): Promise<SerialActivationQueue> {
    const wallet = await this.getCustomerWallet(customerId);
    if (!wallet || wallet.pointsBalance < 6000) {
      throw new Error('Insufficient points for serial activation (6000 points required)');
    }

    const queue = await this.createSerialActivationQueue({
      customerId,
      serialType,
      pointsUsed: 6000,
      status: 'activated'
    });

    // Deduct points
    await this.updateCustomerWallet(customerId, {
      pointsBalance: wallet.pointsBalance - 6000,
      lastTransactionAt: new Date()
    });

    // Create transaction record
    await this.createCustomerPointTransaction({
      customerId,
      merchantId: 'system',
      transactionType: 'spent',
      points: -6000,
      balanceAfter: wallet.pointsBalance - 6000,
      description: `Serial activation (${serialType})`,
      referenceId: queue.id
    });

    return queue;
  }

  // Reward Distribution Logic
  async distributeFourthStepReward(customerId: string, rewardId: string): Promise<{
    serialActivation: number;
    merchantVouchers: number;
    directPayment: number;
  }> {
    const totalReward = 32200; // BDT
    const serialActivationAmount = 6000; // BDT for 4 global serial activations
    const merchantVoucherAmount = 6000; // BDT for merchant vouchers
    const directPaymentAmount = 20200; // BDT direct to customer

    // 1. Activate 4 global serial numbers (6000 BDT worth of discount points)
    for (let i = 0; i < 4; i++) {
      await this.processSerialActivation(customerId, 'global');
    }

    // 2. Generate merchant vouchers (6000 BDT)
    await this.generateMerchantVouchers(customerId, merchantVoucherAmount, rewardId);

    // 3. Direct payment (20,200 BDT) - in real system, this would be processed through payment gateway
    // For now, we'll create a reward record for tracking
    await this.createCustomerReward({
      customerId,
      rewardType: 'global_serial',
      rewardStep: 4,
      pointsAwarded: 0,
      cashValue: directPaymentAmount.toString(),
      status: 'distributed',
      distributionDetails: {
        type: 'direct_payment',
        amount: directPaymentAmount,
        method: 'bank_transfer'
      }
    });

    // Update the original reward
    await this.updateCustomerReward(rewardId, {
      status: 'distributed',
      distributionDetails: {
        serialActivation: serialActivationAmount,
        merchantVouchers: merchantVoucherAmount,
        directPayment: directPaymentAmount,
        distributedAt: new Date()
      }
    });

    return {
      serialActivation: serialActivationAmount,
      merchantVouchers: merchantVoucherAmount,
      directPayment: directPaymentAmount
    };
  }

  // ==================== THREE WALLET SYSTEM IMPLEMENTATION ====================

  // Customer Wallet Management
  async createCustomerWallet(wallet: InsertCustomerWallet): Promise<CustomerWallet> {
    const id = randomUUID();
    const newWallet: CustomerWallet = {
      id,
      ...wallet,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    this.customerWallets.set(id, newWallet);
    return newWallet;
  }

  async getCustomerWallet(customerId: string): Promise<CustomerWallet | undefined> {
    return Array.from(this.customerWallets.values())
      .find(w => w.customerId === customerId);
  }

  async updateCustomerWallet(customerId: string, wallet: Partial<CustomerWallet>): Promise<CustomerWallet> {
    const existing = await this.getCustomerWallet(customerId);
    if (!existing) {
      throw new Error('Customer wallet not found');
    }
    const updated = { ...existing, ...wallet, updatedAt: new Date() };
    this.customerWallets.set(existing.id, updated);
    return updated;
  }

  // Wallet Transactions
  async createCustomerWalletTransaction(transaction: InsertCustomerWalletTransaction): Promise<CustomerWalletTransaction> {
    const id = randomUUID();
    const newTransaction: CustomerWalletTransaction = {
      id,
      ...transaction,
      createdAt: new Date()
    };
    this.customerWalletTransactions.set(id, newTransaction);
    return newTransaction;
  }

  async getCustomerWalletTransactions(customerId: string, walletType?: string): Promise<CustomerWalletTransaction[]> {
    return Array.from(this.customerWalletTransactions.values())
      .filter(t => t.customerId === customerId && (!walletType || t.walletType === walletType))
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  // Wallet Transfers
  async createCustomerWalletTransfer(transfer: InsertCustomerWalletTransfer): Promise<CustomerWalletTransfer> {
    const id = randomUUID();
    const newTransfer: CustomerWalletTransfer = {
      id,
      ...transfer,
      createdAt: new Date()
    };
    this.customerWalletTransfers.set(id, newTransfer);
    return newTransfer;
  }

  async getCustomerWalletTransfers(customerId: string): Promise<CustomerWalletTransfer[]> {
    return Array.from(this.customerWalletTransfers.values())
      .filter(t => t.customerId === customerId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  async processWalletTransfer(transferId: string): Promise<CustomerWalletTransfer> {
    const transfer = this.customerWalletTransfers.get(transferId);
    if (!transfer) {
      throw new Error('Wallet transfer not found');
    }

    const wallet = await this.getCustomerWallet(transfer.customerId);
    if (!wallet) {
      throw new Error('Customer wallet not found');
    }

    // Process the transfer based on wallet types
    let updatedWallet = { ...wallet };

    // Deduct from source wallet
    if (transfer.fromWallet === 'reward_point') {
      updatedWallet.rewardPointBalance = Math.max(0, updatedWallet.rewardPointBalance - parseInt(transfer.amount.toString()));
    } else if (transfer.fromWallet === 'income') {
      updatedWallet.incomeBalance = (parseFloat(updatedWallet.incomeBalance.toString()) - parseFloat(transfer.amount.toString())).toString();
    } else if (transfer.fromWallet === 'commerce') {
      updatedWallet.commerceBalance = (parseFloat(updatedWallet.commerceBalance.toString()) - parseFloat(transfer.amount.toString())).toString();
    }

    // Add to destination wallet
    if (transfer.toWallet === 'reward_point') {
      updatedWallet.rewardPointBalance += parseInt(transfer.netAmount.toString());
    } else if (transfer.toWallet === 'income') {
      updatedWallet.incomeBalance = (parseFloat(updatedWallet.incomeBalance.toString()) + parseFloat(transfer.netAmount.toString())).toString();
    } else if (transfer.toWallet === 'commerce') {
      updatedWallet.commerceBalance = (parseFloat(updatedWallet.commerceBalance.toString()) + parseFloat(transfer.netAmount.toString())).toString();
    }

    await this.updateCustomerWallet(transfer.customerId, updatedWallet);

    // Update transfer status
    const updatedTransfer = {
      ...transfer,
      status: 'completed' as const,
      completedAt: new Date()
    };
    this.customerWalletTransfers.set(transferId, updatedTransfer);

    return updatedTransfer;
  }

  async transferBetweenWallets(customerId: string, fromWallet: string, toWallet: string, amount: number): Promise<CustomerWalletTransfer> {
    const wallet = await this.getCustomerWallet(customerId);
    if (!wallet) {
      throw new Error('Customer wallet not found');
    }

    // Check sufficient balance
    let currentBalance = 0;
    if (fromWallet === 'reward_point') {
      currentBalance = wallet.rewardPointBalance;
    } else if (fromWallet === 'income') {
      currentBalance = parseFloat(wallet.incomeBalance.toString());
    } else if (fromWallet === 'commerce') {
      currentBalance = parseFloat(wallet.commerceBalance.toString());
    }

    if (currentBalance < amount) {
      throw new Error('Insufficient balance');
    }

    // Calculate VAT and service charge (12.5%) for Income to Commerce transfers
    let vatServiceCharge = 0;
    let netAmount = amount;
    
    if (fromWallet === 'income' && toWallet === 'commerce') {
      vatServiceCharge = amount * 0.125; // 12.5%
      netAmount = amount - vatServiceCharge;
    }

    const transfer = await this.createCustomerWalletTransfer({
      customerId,
      fromWallet: fromWallet as any,
      toWallet: toWallet as any,
      amount: amount.toString(),
      vatServiceCharge: vatServiceCharge.toString(),
      netAmount: netAmount.toString(),
      status: 'pending'
    });

    // Process the transfer
    return await this.processWalletTransfer(transfer.id);
  }

  // Enhanced Referral Commission System
  async createCustomerReferralCommission(commission: InsertCustomerReferralCommission): Promise<CustomerReferralCommission> {
    const id = randomUUID();
    const newCommission: CustomerReferralCommission = {
      id,
      ...commission,
      createdAt: new Date()
    };
    this.customerReferralCommissions.set(id, newCommission);
    return newCommission;
  }

  async getCustomerReferralCommissions(referrerId: string): Promise<CustomerReferralCommission[]> {
    return Array.from(this.customerReferralCommissions.values())
      .filter(c => c.referrerId === referrerId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  async processReferralCommission(referredId: string, rewardStep: number, rewardType: string, originalRewardId: string): Promise<void> {
    // Find the referrer
    const referral = await this.getCustomerReferralByReferred(referredId);
    if (!referral) {
      // Assign company as referrer if no referrer exists
      await this.assignCompanyAsReferrer(referredId);
      return;
    }

    // Define commission amounts based on the document (50, 100, 150, 700)
    const commissionAmounts = {
      1: 50,
      2: 100,
      3: 150,
      4: 700
    };

    const commissionAmount = commissionAmounts[rewardStep as keyof typeof commissionAmounts];
    if (!commissionAmount) {
      return; // No commission for this step
    }

    // Create commission record
    await this.createCustomerReferralCommission({
      referrerId: referral.referrerId,
      referredId,
      commissionStep: rewardStep,
      commissionAmount: commissionAmount.toString(),
      commissionType: rewardType as any,
      originalRewardId,
      status: 'awarded'
    });

    // Add commission to referrer's income wallet
    await this.addIncomeBalance(referral.referrerId, commissionAmount, `Referral commission - Step ${rewardStep}`);
  }

  // Company as Default Referrer
  async createCompanyReferrer(referrer: InsertCompanyReferrer): Promise<CompanyReferrer> {
    const id = randomUUID();
    const newReferrer: CompanyReferrer = {
      id,
      ...referrer,
      createdAt: new Date(),
      assignedAt: new Date()
    };
    this.companyReferrers.set(id, newReferrer);
    return newReferrer;
  }

  async getCompanyReferrer(customerId: string): Promise<CompanyReferrer | undefined> {
    return Array.from(this.companyReferrers.values())
      .find(r => r.customerId === customerId);
  }

  async assignCompanyAsReferrer(customerId: string): Promise<CompanyReferrer> {
    return await this.createCompanyReferrer({
      customerId,
      isCompanyReferrer: true
    });
  }

  // Waste Management Rewards
  async createWasteManagementReward(reward: InsertWasteManagementReward): Promise<WasteManagementReward> {
    const id = randomUUID();
    const newReward: WasteManagementReward = {
      id,
      ...reward,
      createdAt: new Date()
    };
    this.wasteManagementRewards.set(id, newReward);
    return newReward;
  }

  async getWasteManagementRewards(customerId: string): Promise<WasteManagementReward[]> {
    return Array.from(this.wasteManagementRewards.values())
      .filter(r => r.customerId === customerId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  async processWasteManagementReward(customerId: string, wasteType: string, quantity: number): Promise<WasteManagementReward> {
    // Define reward rates for different waste types
    const rewardRates = {
      'plastic': 5,    // 5 points per kg
      'paper': 3,      // 3 points per kg
      'metal': 8,      // 8 points per kg
      'organic': 2,    // 2 points per kg
      'electronic': 15 // 15 points per kg
    };

    const rewardRate = rewardRates[wasteType as keyof typeof rewardRates] || 1;
    const pointsAwarded = Math.floor(quantity * rewardRate);

    const reward = await this.createWasteManagementReward({
      customerId,
      wasteType,
      quantity: quantity.toString(),
      pointsAwarded,
      rewardRate: rewardRate.toString(),
      status: 'awarded'
    });

    // Add points to reward point wallet
    await this.addRewardPoints(customerId, pointsAwarded, `Waste management - ${wasteType}`);

    return reward;
  }

  // Medical Facility Benefits
  async createMedicalFacilityBenefit(benefit: InsertMedicalFacilityBenefit): Promise<MedicalFacilityBenefit> {
    const id = randomUUID();
    const newBenefit: MedicalFacilityBenefit = {
      id,
      ...benefit,
      createdAt: new Date()
    };
    this.medicalFacilityBenefits.set(id, newBenefit);
    return newBenefit;
  }

  async getMedicalFacilityBenefits(customerId: string): Promise<MedicalFacilityBenefit[]> {
    return Array.from(this.medicalFacilityBenefits.values())
      .filter(b => b.customerId === customerId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  async useMedicalFacilityBenefit(benefitId: string): Promise<MedicalFacilityBenefit> {
    const benefit = this.medicalFacilityBenefits.get(benefitId);
    if (!benefit) {
      throw new Error('Medical facility benefit not found');
    }
    if (benefit.status !== 'available') {
      throw new Error('Benefit is not available');
    }
    if (benefit.expiresAt && benefit.expiresAt < new Date()) {
      throw new Error('Benefit has expired');
    }

    const updated = {
      ...benefit,
      status: 'used' as const,
      usedAt: new Date()
    };
    this.medicalFacilityBenefits.set(benefitId, updated);
    return updated;
  }

  // Commerce Wallet Operations (MFS)
  async addCommerceBalance(customerId: string, amount: number, method: string): Promise<CustomerWalletTransaction> {
    const wallet = await this.getCustomerWallet(customerId);
    if (!wallet) {
      throw new Error('Customer wallet not found');
    }

    const newBalance = parseFloat(wallet.commerceBalance.toString()) + amount;
    await this.updateCustomerWallet(customerId, {
      commerceBalance: newBalance.toString(),
      totalCommerceAdded: (parseFloat(wallet.totalCommerceAdded.toString()) + amount).toString(),
      lastTransactionAt: new Date()
    });

    return await this.createCustomerWalletTransaction({
      customerId,
      walletType: 'commerce',
      transactionType: 'credit',
      amount: amount.toString(),
      balanceAfter: newBalance.toString(),
      description: `Balance added via ${method}`,
      metadata: { method }
    });
  }

  async withdrawCommerceBalance(customerId: string, amount: number, method: string): Promise<CustomerWalletTransaction> {
    const wallet = await this.getCustomerWallet(customerId);
    if (!wallet) {
      throw new Error('Customer wallet not found');
    }

    const currentBalance = parseFloat(wallet.commerceBalance.toString());
    if (currentBalance < amount) {
      throw new Error('Insufficient balance');
    }

    const newBalance = currentBalance - amount;
    await this.updateCustomerWallet(customerId, {
      commerceBalance: newBalance.toString(),
      totalCommerceWithdrawn: (parseFloat(wallet.totalCommerceWithdrawn.toString()) + amount).toString(),
      lastTransactionAt: new Date()
    });

    return await this.createCustomerWalletTransaction({
      customerId,
      walletType: 'commerce',
      transactionType: 'debit',
      amount: (-amount).toString(),
      balanceAfter: newBalance.toString(),
      description: `Balance withdrawn via ${method}`,
      metadata: { method }
    });
  }

  async spendCommerceBalance(customerId: string, amount: number, description: string): Promise<CustomerWalletTransaction> {
    const wallet = await this.getCustomerWallet(customerId);
    if (!wallet) {
      throw new Error('Customer wallet not found');
    }

    const currentBalance = parseFloat(wallet.commerceBalance.toString());
    if (currentBalance < amount) {
      throw new Error('Insufficient balance');
    }

    const newBalance = currentBalance - amount;
    await this.updateCustomerWallet(customerId, {
      commerceBalance: newBalance.toString(),
      totalCommerceSpent: (parseFloat(wallet.totalCommerceSpent.toString()) + amount).toString(),
      lastTransactionAt: new Date()
    });

    return await this.createCustomerWalletTransaction({
      customerId,
      walletType: 'commerce',
      transactionType: 'debit',
      amount: (-amount).toString(),
      balanceAfter: newBalance.toString(),
      description
    });
  }

  // Income Wallet Operations
  async addIncomeBalance(customerId: string, amount: number, source: string): Promise<CustomerWalletTransaction> {
    const wallet = await this.getCustomerWallet(customerId);
    if (!wallet) {
      throw new Error('Customer wallet not found');
    }

    const newBalance = parseFloat(wallet.incomeBalance.toString()) + amount;
    await this.updateCustomerWallet(customerId, {
      incomeBalance: newBalance.toString(),
      totalIncomeEarned: (parseFloat(wallet.totalIncomeEarned.toString()) + amount).toString(),
      lastTransactionAt: new Date()
    });

    return await this.createCustomerWalletTransaction({
      customerId,
      walletType: 'income',
      transactionType: 'credit',
      amount: amount.toString(),
      balanceAfter: newBalance.toString(),
      description: `Income from ${source}`,
      metadata: { source }
    });
  }

  async spendIncomeBalance(customerId: string, amount: number, description: string): Promise<CustomerWalletTransaction> {
    const wallet = await this.getCustomerWallet(customerId);
    if (!wallet) {
      throw new Error('Customer wallet not found');
    }

    const currentBalance = parseFloat(wallet.incomeBalance.toString());
    if (currentBalance < amount) {
      throw new Error('Insufficient balance');
    }

    const newBalance = currentBalance - amount;
    await this.updateCustomerWallet(customerId, {
      incomeBalance: newBalance.toString(),
      totalIncomeSpent: (parseFloat(wallet.totalIncomeSpent.toString()) + amount).toString(),
      lastTransactionAt: new Date()
    });

    return await this.createCustomerWalletTransaction({
      customerId,
      walletType: 'income',
      transactionType: 'debit',
      amount: (-amount).toString(),
      balanceAfter: newBalance.toString(),
      description
    });
  }

  // Reward Point Wallet Operations
  async addRewardPoints(customerId: string, points: number, source: string): Promise<CustomerWalletTransaction> {
    const wallet = await this.getCustomerWallet(customerId);
    if (!wallet) {
      throw new Error('Customer wallet not found');
    }

    const newBalance = wallet.rewardPointBalance + points;
    await this.updateCustomerWallet(customerId, {
      rewardPointBalance: newBalance,
      totalRewardPointsEarned: wallet.totalRewardPointsEarned + points,
      lastTransactionAt: new Date()
    });

    return await this.createCustomerWalletTransaction({
      customerId,
      walletType: 'reward_point',
      transactionType: 'credit',
      amount: points.toString(),
      balanceAfter: newBalance.toString(),
      description: `Reward points from ${source}`,
      metadata: { source }
    });
  }

  async spendRewardPoints(customerId: string, points: number, description: string): Promise<CustomerWalletTransaction> {
    const wallet = await this.getCustomerWallet(customerId);
    if (!wallet) {
      throw new Error('Customer wallet not found');
    }

    if (wallet.rewardPointBalance < points) {
      throw new Error('Insufficient reward points');
    }

    const newBalance = wallet.rewardPointBalance - points;
    await this.updateCustomerWallet(customerId, {
      rewardPointBalance: newBalance,
      totalRewardPointsSpent: wallet.totalRewardPointsSpent + points,
      lastTransactionAt: new Date()
    });

    return await this.createCustomerWalletTransaction({
      customerId,
      walletType: 'reward_point',
      transactionType: 'debit',
      amount: (-points).toString(),
      balanceAfter: newBalance.toString(),
      description
    });
  }

  // ==================== MERCHANT CUSTOMER MANAGEMENT ====================
  
  async createMerchantCustomer(customer: InsertMerchantCustomer): Promise<MerchantCustomer> {
    const id = crypto.randomUUID();
    const now = new Date();
    
    const merchantCustomer: MerchantCustomer = {
      id,
      merchantId: customer.merchantId,
      customerId: customer.customerId,
      customerName: customer.customerName,
      customerEmail: customer.customerEmail,
      customerMobile: customer.customerMobile,
      accountNumber: customer.accountNumber,
      totalPointsEarned: customer.totalPointsEarned || 0,
      currentPointsBalance: customer.currentPointsBalance || 0,
      tier: customer.tier || 'bronze',
      isActive: customer.isActive !== undefined ? customer.isActive : true,
      createdAt: now,
      updatedAt: now
    };
    
    this.merchantCustomers.set(id, merchantCustomer);
    return merchantCustomer;
  }

  async getMerchantCustomer(merchantId: string, customerId: string): Promise<MerchantCustomer | undefined> {
    return Array.from(this.merchantCustomers.values())
      .find(mc => mc.merchantId === merchantId && mc.customerId === customerId);
  }

  async getMerchantCustomers(merchantId: string): Promise<MerchantCustomer[]> {
    return Array.from(this.merchantCustomers.values())
      .filter(mc => mc.merchantId === merchantId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  async updateMerchantCustomer(merchantId: string, customerId: string, updates: Partial<MerchantCustomer>): Promise<MerchantCustomer> {
    const existing = await this.getMerchantCustomer(merchantId, customerId);
    if (!existing) {
      throw new Error('Merchant customer not found');
    }

    const updated: MerchantCustomer = {
      ...existing,
      ...updates,
      updatedAt: new Date()
    };

    this.merchantCustomers.set(existing.id, updated);
    return updated;
  }
}

export const storage = new MemStorage();
