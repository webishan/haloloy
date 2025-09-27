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
  type MerchantCustomer, type InsertMerchantCustomer,
  type BlockedCustomer, type InsertBlockedCustomer
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
  getCustomerByMobile(mobileNumber: string): Promise<CustomerProfile | undefined>;
  createCustomer(customer: InsertCustomer): Promise<Customer>;
  updateCustomer(userId: string, customer: Partial<Customer>): Promise<Customer>;
  deleteUser(userId: string): Promise<void>;
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
  
  // Global Admin Analytics
  getGlobalMerchants(period: string): Promise<any>;
  getGlobalCustomers(period: string): Promise<any>;
  getGlobalRewardPoints(period: string): Promise<any>;
  getGlobalSerialNumbers(period: string): Promise<any>;
  getGlobalWithdrawals(period: string): Promise<any>;
  getGlobalVATServiceCharge(period: string): Promise<any>;
  getCommissionSettings(): Promise<any>;
  updateCommissionSettings(settings: any): Promise<any>;
  distributePointsToLocalAdmin(data: any): Promise<any>;
  distributePointsToMerchants(data: any): Promise<any>;
  
  // Local Admin Analytics
  getLocalAdminDashboard(country: string, period: string): Promise<any>;
  
  // StepUp Reward Number Methods
  createStepUpRewardNumber(data: InsertStepUpRewardNumber): Promise<StepUpRewardNumber>;
  getStepUpRewardNumber(id: string): Promise<StepUpRewardNumber | undefined>;
  updateStepUpRewardNumber(id: string, updates: Partial<StepUpRewardNumber>): Promise<StepUpRewardNumber>;
  getActiveRewardNumbers(userId: string): Promise<StepUpRewardNumber[]>;
  getRewardNumbersByUser(userId: string): Promise<StepUpRewardNumber[]>;
  generateSerialNumber(): Promise<string>;
  getNextGlobalRewardNumber(): Promise<number>;
  getNextLocalRewardNumber(): Promise<number>;
  
  // Merchant Income Methods
  getMerchantIncomes(merchantId: string, fromDate?: Date): Promise<any[]>;
  createMerchantIncome(data: any): Promise<any>;
  updateMerchantIncome(id: string, data: any): Promise<any>;
  
  // Withdrawal Methods
  createWithdrawalRequest(data: any): Promise<any>;
  getWithdrawalRequest(id: string): Promise<any>;
  updateWithdrawalRequest(id: string, data: any): Promise<any>;
  getWithdrawalRequests(merchantId: string): Promise<any[]>;
  getWithdrawalHistory(merchantId: string, fromDate?: Date): Promise<any[]>;
  
  // Customer Withdrawal Methods
  createCustomerWithdrawalRequest(data: any): Promise<any>;
  getCustomerWithdrawalRequest(id: string): Promise<any>;
  updateCustomerWithdrawalRequest(id: string, data: any): Promise<any>;
  getCustomerWithdrawalRequests(customerId: string): Promise<any[]>;
  getCustomerWithdrawalHistory(customerId: string, fromDate?: Date): Promise<any[]>;
  
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
  getUnreadMessageCount(conversationId: string, userId: string): Promise<number>;
  getRecentUnreadMessages(userId: string, limit?: number): Promise<ChatMessage[]>;
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
  getAllCustomerProfiles(): Promise<CustomerProfile[]>;
  updateCustomerProfile(userId: string, profile: Partial<CustomerProfile>): Promise<CustomerProfile>;
  deleteCustomerProfile(customerId: string): Promise<void>;
  generateUniqueAccountNumber(): Promise<string>;
  
  // Global Reward Number management
  getGlobalRewardNumberById(id: string): Promise<any | undefined>;
  getGlobalRewardNumbersByCustomer(customerId: string): Promise<any[]>;
  getAllGlobalRewardNumbers(): Promise<any[]>;
  saveGlobalRewardNumber(globalRewardNumber: any): Promise<void>;
  updateGlobalRewardNumber(globalRewardNumber: any): Promise<void>;
  deleteGlobalRewardNumber(id: string): Promise<void>;
  
  // Shopping Voucher management
  saveShoppingVoucher(voucher: any): Promise<void>;
  getShoppingVouchersByCustomer(customerId: string): Promise<any[]>;
  updateShoppingVoucher(voucher: any): Promise<void>;
  deleteShoppingVoucher(id: string): Promise<void>;

  // Customer Wallets
  createCustomerWallet(wallet: InsertCustomerWallet): Promise<CustomerWallet>;
  getCustomerWallet(customerId: string): Promise<CustomerWallet | undefined>;
  updateCustomerWallet(customerId: string, wallet: Partial<CustomerWallet>): Promise<CustomerWallet>;
  deleteCustomerWallet(customerId: string): Promise<void>;
  deleteCustomerTransactions(customerId: string): Promise<void>;

  // Customer Point Transactions
  createCustomerPointTransaction(transaction: InsertCustomerPointTransaction): Promise<CustomerPointTransaction>;
  getCustomerPointTransactions(customerId: string): Promise<CustomerPointTransaction[]>;
  getCustomerPointTransactionsByMerchant(customerId: string, merchantId: string): Promise<CustomerPointTransaction[]>;

  // Customer Serial Numbers
  createCustomerSerialNumber(serial: InsertCustomerSerialNumber): Promise<CustomerSerialNumber>;
  getCustomerSerialNumber(customerId: string): Promise<CustomerSerialNumber | undefined>;
  getNextGlobalSerialNumber(): Promise<number>;
  assignSerialNumberToCustomer(customerId: string): Promise<CustomerSerialNumber>;

  // Global Reward System
  createGlobalRewardNumber(rewardNumber: any): Promise<any>;
  getGlobalRewardNumber(id: string): Promise<any>;
  updateGlobalRewardNumber(id: string, updates: any): Promise<any>;
  getGlobalRewardNumbersByCustomer(customerId: string): Promise<any[]>;
  createCustomerPointTransaction(transaction: any): Promise<any>;
  getAllCustomerSerialNumbers(): Promise<any[]>;

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
  deleteMerchantCustomer(merchantId: string, customerId: string): Promise<void>;
  
  // Blocked customers management
  createBlockedCustomer(blockedCustomer: InsertBlockedCustomer): Promise<BlockedCustomer>;
  getBlockedCustomer(merchantId: string, customerId: string): Promise<BlockedCustomer | undefined>;
  getBlockedCustomers(merchantId: string): Promise<BlockedCustomer[]>;
  removeBlockedCustomer(merchantId: string, customerId: string): Promise<void>;
  
  // Merchant Reports and Transactions
  getMerchantPointTransfers(merchantId: string): Promise<any[]>;
  getMerchantPointsReceived(merchantId: string): Promise<any[]>;
  getMerchantTransactions(merchantId: string): Promise<any[]>;

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
  private blockedCustomers: Map<string, BlockedCustomer> = new Map();
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

    // Skip creating local admin users - will be created manually

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

    // Skip creating merchants - will be created manually
    // Skip creating customers - will be created manually

    // Skip creating sample products - no merchants to assign them to
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

  async deleteUser(id: string): Promise<void> {
    if (!this.users.has(id)) {
      throw new Error("User not found");
    }
    this.users.delete(id);
  }

  // Customer methods
  async getCustomer(userId: string): Promise<Customer | undefined> {
    return Array.from(this.customers.values()).find(customer => customer.userId === userId);
  }

  async getCustomerByUserId(userId: string): Promise<Customer | undefined> {
    return Array.from(this.customers.values()).find(customer => customer.userId === userId);
  }

  async getCustomerByMobile(mobileNumber: string): Promise<CustomerProfile | undefined> {
    return Array.from(this.customerProfiles.values())
      .find(p => p.mobileNumber === mobileNumber);
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

    // Add points to accumulated points (max 1499, convert to reward number at 1500)
    const newAccumulatedPoints = customer.accumulatedPoints + order.pointsEarned;
    let updates: Partial<Customer> = {
      totalPoints: customer.totalPoints + order.pointsEarned
    };

    // Implement Bengali document logic: accumulated points max 1499, convert at 1500
    if (newAccumulatedPoints >= 1500) {
      // Create global reward number when reaching 1500 points
      const globalRewardNumber = await this.getNextGlobalRewardNumber();
      const serialNumber = await this.generateSerialNumber();
      
      // Create StepUp reward number with 4-tier system (800/1500/3500/32200)
      await this.createStepUpRewardNumber({
        userId: customer.userId,
        rewardNumber: globalRewardNumber,
        serialNumber: serialNumber,
        type: "global",
        tier1Status: "active",
        tier1Amount: 800,    // First tier: 800 points
        tier2Status: "locked",
        tier2Amount: 1500,   // Second tier: 1500 points  
        tier3Status: "locked",
        tier3Amount: 3500,   // Third tier: 3500 points
        tier4Status: "locked",
        tier4Amount: 32200,  // Final tier: 32200 points
        tier4VoucherReserve: 6000,    // Voucher reserve: 6000
        tier4RedeemableAmount: 20200, // Redeemable: 20200 (32200 - 6000)
        currentPoints: 0,
        totalPointsRequired: 38000,   // Total: 800+1500+3500+32200 = 38000
        isCompleted: false,
        country: customer.country || 'BD'
      });

      // Reset accumulated points to 0 after creating reward number
      updates.accumulatedPoints = 0;
      updates.currentPointsBalance = 0;
      updates.purchasePoints = 0;
      updates.wasteManagementPoints = 0;
      updates.dailyLoginPoints = 0;
      updates.referralPoints = 0;
      updates.birthdayPoints = 0;
      updates.otherActivityPoints = 0;
      updates.globalRewardNumbers = (customer.globalRewardNumbers || 0) + 1;
    } else {
      // Keep accumulated points under 1500
      updates.accumulatedPoints = newAccumulatedPoints;
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

  // Global Admin Analytics Methods
  async getGlobalMerchants(period: string): Promise<any> {
    const merchants = Array.from(this.merchants.values());
    const now = new Date();
    let filteredMerchants = merchants;

    if (period !== 'all') {
      const periodDate = this.getPeriodDate(now, period);
      filteredMerchants = merchants.filter(m => m.createdAt >= periodDate);
    }

    const merchantTypes = {
      regular: filteredMerchants.filter(m => !m.isEMerchant).length,
      eMerchant: filteredMerchants.filter(m => m.isEMerchant).length,
      star: filteredMerchants.filter(m => m.rank === 'star').length,
      doubleStar: filteredMerchants.filter(m => m.rank === 'double_star').length,
      tripleStar: filteredMerchants.filter(m => m.rank === 'triple_star').length,
      executive: filteredMerchants.filter(m => m.rank === 'executive').length,
      total: filteredMerchants.length
    };

    return {
      period,
      merchantTypes,
      merchants: filteredMerchants.map(m => ({
        id: m.id,
        businessName: m.businessName,
        country: m.country,
        rank: m.rank,
        isEMerchant: m.isEMerchant,
        createdAt: m.createdAt
      }))
    };
  }

  async getGlobalCustomers(period: string): Promise<any> {
    const customers = Array.from(this.customers.values());
    const now = new Date();
    let filteredCustomers = customers;

    if (period !== 'all') {
      const periodDate = this.getPeriodDate(now, period);
      filteredCustomers = customers.filter(c => c.createdAt >= periodDate);
    }

    // Get top customers by serial number and referral
    const topBySerial = filteredCustomers
      .sort((a, b) => (b.totalSerialNumbers || 0) - (a.totalSerialNumbers || 0))
      .slice(0, 10);

    const topByReferral = filteredCustomers
      .sort((a, b) => (b.totalReferrals || 0) - (a.totalReferrals || 0))
      .slice(0, 10);

    return {
      period,
      total: filteredCustomers.length,
      topBySerial: topBySerial.map(c => ({
        id: c.id,
        firstName: c.firstName,
        lastName: c.lastName,
        totalSerialNumbers: c.totalSerialNumbers || 0,
        country: c.country
      })),
      topByReferral: topByReferral.map(c => ({
        id: c.id,
        firstName: c.firstName,
        lastName: c.lastName,
        totalReferrals: c.totalReferrals || 0,
        country: c.country
      }))
    };
  }

  async getGlobalRewardPoints(period: string): Promise<any> {
    const now = new Date();
    let periodDate = new Date(0);
    
    if (period !== 'all') {
      periodDate = this.getPeriodDate(now, period);
    }

    // Calculate total sales and distributions
    const pointTransactions = Array.from(this.pointTransactions.values())
      .filter(pt => pt.createdAt >= periodDate);

    const totalSales = pointTransactions
      .filter(pt => pt.transactionType === 'purchase')
      .reduce((sum, pt) => sum + pt.points, 0);

    const totalDistributed = pointTransactions
      .filter(pt => pt.transactionType === 'reward' || pt.transactionType === 'bonus')
      .reduce((sum, pt) => sum + pt.points, 0);

    // Group by country
    const countryStats = new Map();
    pointTransactions.forEach(pt => {
      const country = pt.country || 'Unknown';
      if (!countryStats.has(country)) {
        countryStats.set(country, { sales: 0, distributed: 0 });
      }
      const stats = countryStats.get(country);
      if (pt.transactionType === 'purchase') {
        stats.sales += pt.points;
      } else if (pt.transactionType === 'reward' || pt.transactionType === 'bonus') {
        stats.distributed += pt.points;
      }
    });

    return {
      period,
      totalSales,
      totalDistributed,
      countryBreakdown: Array.from(countryStats.entries()).map(([country, stats]) => ({
        country,
        sales: stats.sales,
        distributed: stats.distributed
      }))
    };
  }

  async getGlobalSerialNumbers(period: string): Promise<any> {
    const now = new Date();
    let periodDate = new Date(0);
    
    if (period !== 'all') {
      periodDate = this.getPeriodDate(now, period);
    }

    const serialNumbers = Array.from(this.stepUpRewardNumbers.values())
      .filter(sn => sn.createdAt >= periodDate);

    const globalSerials = serialNumbers.filter(sn => sn.type === 'global');
    const localSerials = serialNumbers.filter(sn => sn.type === 'local');

    return {
      period,
      global: {
        total: globalSerials.length,
        completed: globalSerials.filter(sn => sn.isCompleted).length,
        active: globalSerials.filter(sn => !sn.isCompleted).length
      },
      local: {
        total: localSerials.length,
        completed: localSerials.filter(sn => sn.isCompleted).length,
        active: localSerials.filter(sn => !sn.isCompleted).length
      },
      countryBreakdown: this.getSerialNumbersByCountry(serialNumbers)
    };
  }

  async getGlobalWithdrawals(period: string): Promise<any> {
    const now = new Date();
    let periodDate = new Date(0);
    
    if (period !== 'all') {
      periodDate = this.getPeriodDate(now, period);
    }

    const withdrawals = Array.from(this.pointTransactions.values())
      .filter(pt => pt.transactionType === 'withdrawal' && pt.createdAt >= periodDate);

    const merchantWithdrawals = withdrawals.filter(pt => pt.userType === 'merchant');
    const customerWithdrawals = withdrawals.filter(pt => pt.userType === 'customer');

    const totalWithdrawn = withdrawals.reduce((sum, pt) => sum + Math.abs(pt.points), 0);
    const totalVAT = withdrawals.reduce((sum, pt) => sum + parseFloat(pt.vatAmount || '0'), 0);
    const totalServiceCharge = withdrawals.reduce((sum, pt) => sum + parseFloat(pt.serviceCharge || '0'), 0);

    return {
      period,
      totalWithdrawn,
      totalVAT,
      totalServiceCharge,
      merchant: {
        count: merchantWithdrawals.length,
        amount: merchantWithdrawals.reduce((sum, pt) => sum + Math.abs(pt.points), 0)
      },
      customer: {
        count: customerWithdrawals.length,
        amount: customerWithdrawals.reduce((sum, pt) => sum + Math.abs(pt.points), 0)
      }
    };
  }

  async getGlobalVATServiceCharge(period: string): Promise<any> {
    const now = new Date();
    let periodDate = new Date(0);
    
    if (period !== 'all') {
      periodDate = this.getPeriodDate(now, period);
    }

    const transactions = Array.from(this.pointTransactions.values())
      .filter(pt => pt.createdAt >= periodDate);

    const totalVAT = transactions.reduce((sum, pt) => sum + parseFloat(pt.vatAmount || '0'), 0);
    const totalServiceCharge = transactions.reduce((sum, pt) => sum + parseFloat(pt.serviceCharge || '0'), 0);

    // Group by country
    const countryStats = new Map();
    transactions.forEach(pt => {
      const country = pt.country || 'Unknown';
      if (!countryStats.has(country)) {
        countryStats.set(country, { vat: 0, serviceCharge: 0 });
      }
      const stats = countryStats.get(country);
      stats.vat += parseFloat(pt.vatAmount || '0');
      stats.serviceCharge += parseFloat(pt.serviceCharge || '0');
    });

    return {
      period,
      totalVAT,
      totalServiceCharge,
      countryBreakdown: Array.from(countryStats.entries()).map(([country, stats]) => ({
        country,
        vat: stats.vat,
        serviceCharge: stats.serviceCharge
      }))
    };
  }

  async getCommissionSettings(): Promise<any> {
    const settings = Array.from(this.adminSettings.values());
    const commissionSettings = settings.filter(s => s.category === 'commission');
    
    const result: any = {};
    commissionSettings.forEach(setting => {
      result[setting.settingKey] = {
        value: setting.settingValue,
        description: setting.description,
        isActive: setting.isActive
      };
    });

    return result;
  }

  async updateCommissionSettings(settings: any): Promise<any> {
    const updatedSettings = [];
    
    for (const [key, value] of Object.entries(settings)) {
      if (key === 'confirmPassword') continue;
      
      const existing = Array.from(this.adminSettings.values())
        .find(s => s.settingKey === key);
      
      if (existing) {
        const updated = await this.updateAdminSetting(existing.id, {
          settingValue: value as string,
          updatedAt: new Date()
        });
        updatedSettings.push(updated);
      } else {
        const newSetting = await this.createAdminSetting({
          settingKey: key,
          settingValue: value as string,
          category: 'commission',
          description: `Commission setting for ${key}`,
          isActive: true
        });
        updatedSettings.push(newSetting);
      }
    }

    return updatedSettings;
  }

  async distributePointsToLocalAdmin(data: any): Promise<any> {
    const { distributorId, receiverId, points, description, type } = data;
    
    // Update distributor balance
    const distributor = await this.getAdmin(distributorId);
    if (!distributor || distributor.pointsBalance < points) {
      throw new Error('Insufficient points balance');
    }

    await this.updateAdmin(distributorId, {
      pointsBalance: distributor.pointsBalance - points,
      totalPointsDistributed: distributor.totalPointsDistributed + points
    });

    // Update receiver balance
    const receiver = await this.getAdmin(receiverId);
    if (!receiver) {
      throw new Error('Receiver not found');
    }

    await this.updateAdmin(receiverId, {
      pointsBalance: receiver.pointsBalance + points,
      totalPointsReceived: receiver.totalPointsReceived + points
    });

    // Create distribution record
    const distribution = await this.createPointDistribution({
      fromUserId: distributorId,
      toUserId: receiverId,
      points,
      description,
      type,
      status: 'completed'
    });

    return distribution;
  }

  async distributePointsToMerchants(data: any): Promise<any> {
    const { distributorId, merchantIds, points, description, type } = data;
    
    const distributor = await this.getAdmin(distributorId);
    if (!distributor || distributor.pointsBalance < points * merchantIds.length) {
      throw new Error('Insufficient points balance');
    }

    const distributions = [];
    
    for (const merchantId of merchantIds) {
      const merchant = await this.getMerchant(merchantId);
      if (!merchant) continue;

      // Update merchant wallet
      const wallet = await this.getMerchantWallet(merchantId);
      if (wallet) {
        await this.updateMerchantWallet(merchantId, {
          rewardPointBalance: wallet.rewardPointBalance + points
        });
      }

      // FIXED: Update merchant main balance fields
      const newLoyaltyBalance = (merchant.loyaltyPointsBalance || 0) + points;
      const newAvailablePoints = (merchant.availablePoints || 0) + points;
      const newTotalReceived = (merchant.totalPointsReceived || 0) + points;

      await this.updateMerchant(merchant.userId, {
        loyaltyPointsBalance: newLoyaltyBalance,
        availablePoints: newAvailablePoints,
        totalPointsReceived: newTotalReceived
      });

      console.log(`✅ Distributed ${points} points to merchant ${merchantId}`);
      console.log(`   - Previous balance: ${merchant.loyaltyPointsBalance || 0}`);
      console.log(`   - New balance: ${newLoyaltyBalance}`);
      console.log(`   - Available points: ${newAvailablePoints}`);

      // Verify the update worked
      const updatedMerchant = await this.getMerchant(merchant.userId);
      console.log(`   - Verified balance: ${updatedMerchant?.loyaltyPointsBalance || 0}`);

      // Create distribution record
      const distribution = await this.createPointDistribution({
        fromUserId: distributorId,
        toUserId: merchantId,
        points,
        description,
        type,
        status: 'completed'
      });

      distributions.push(distribution);
    }

    // Update distributor balance
    await this.updateAdmin(distributorId, {
      pointsBalance: distributor.pointsBalance - (points * merchantIds.length),
      totalPointsDistributed: distributor.totalPointsDistributed + (points * merchantIds.length)
    });

    console.log(`🎯 Admin ${distributorId} distributed ${points * merchantIds.length} points to ${merchantIds.length} merchants`);

    return distributions;
  }

  async getLocalAdminDashboard(country: string, period: string): Promise<any> {
    const now = new Date();
    let periodDate = new Date(0);
    
    if (period !== 'all') {
      periodDate = this.getPeriodDate(now, period);
    }

    // Get country-specific data
    const merchants = Array.from(this.merchants.values())
      .filter(m => m.country === country && m.createdAt >= periodDate);

    const customers = Array.from(this.customers.values())
      .filter(c => c.country === country && c.createdAt >= periodDate);

    const pointTransactions = Array.from(this.pointTransactions.values())
      .filter(pt => pt.country === country && pt.createdAt >= periodDate);

    const serialNumbers = Array.from(this.stepUpRewardNumbers.values())
      .filter(sn => sn.country === country && sn.createdAt >= periodDate);

    return {
      period,
      country,
      merchants: {
        total: merchants.length,
        regular: merchants.filter(m => !m.isEMerchant).length,
        eMerchant: merchants.filter(m => m.isEMerchant).length,
        star: merchants.filter(m => m.rank === 'star').length,
        doubleStar: merchants.filter(m => m.rank === 'double_star').length,
        tripleStar: merchants.filter(m => m.rank === 'triple_star').length,
        executive: merchants.filter(m => m.rank === 'executive').length
      },
      customers: {
        total: customers.length,
        topBySerial: customers
          .sort((a, b) => (b.totalSerialNumbers || 0) - (a.totalSerialNumbers || 0))
          .slice(0, 10),
        topByReferral: customers
          .sort((a, b) => (b.totalReferrals || 0) - (a.totalReferrals || 0))
          .slice(0, 10)
      },
      rewardPoints: {
        totalSales: pointTransactions
          .filter(pt => pt.transactionType === 'purchase')
          .reduce((sum, pt) => sum + pt.points, 0),
        totalDistributed: pointTransactions
          .filter(pt => pt.transactionType === 'reward' || pt.transactionType === 'bonus')
          .reduce((sum, pt) => sum + pt.points, 0)
      },
      serialNumbers: {
        global: serialNumbers.filter(sn => sn.type === 'global').length,
        local: serialNumbers.filter(sn => sn.type === 'local').length,
        completed: serialNumbers.filter(sn => sn.isCompleted).length,
        active: serialNumbers.filter(sn => !sn.isCompleted).length
      },
      withdrawals: {
        total: pointTransactions
          .filter(pt => pt.transactionType === 'withdrawal')
          .reduce((sum, pt) => sum + Math.abs(pt.points), 0),
        merchant: pointTransactions
          .filter(pt => pt.transactionType === 'withdrawal' && pt.userType === 'merchant')
          .reduce((sum, pt) => sum + Math.abs(pt.points), 0),
        customer: pointTransactions
          .filter(pt => pt.transactionType === 'withdrawal' && pt.userType === 'customer')
          .reduce((sum, pt) => sum + Math.abs(pt.points), 0)
      }
    };
  }

  // StepUp Reward Number Methods
  async createStepUpRewardNumber(data: InsertStepUpRewardNumber): Promise<StepUpRewardNumber> {
    const id = randomUUID();
    const rewardNumber: StepUpRewardNumber = {
      id,
      createdAt: new Date(),
      updatedAt: new Date(),
      ...data
    };
    this.stepUpRewardNumbers.set(id, rewardNumber);
    return rewardNumber;
  }

  async getStepUpRewardNumber(id: string): Promise<StepUpRewardNumber | undefined> {
    return this.stepUpRewardNumbers.get(id);
  }

  async updateStepUpRewardNumber(id: string, updates: Partial<StepUpRewardNumber>): Promise<StepUpRewardNumber> {
    const existing = this.stepUpRewardNumbers.get(id);
    if (!existing) {
      throw new Error("StepUp reward number not found");
    }
    const updated = { ...existing, ...updates, updatedAt: new Date() };
    this.stepUpRewardNumbers.set(id, updated);
    return updated;
  }

  async getActiveRewardNumbers(userId: string): Promise<StepUpRewardNumber[]> {
    return Array.from(this.stepUpRewardNumbers.values())
      .filter(rn => rn.userId === userId && !rn.isCompleted);
  }

  async getRewardNumbersByUser(userId: string): Promise<StepUpRewardNumber[]> {
    return Array.from(this.stepUpRewardNumbers.values())
      .filter(rn => rn.userId === userId);
  }

  async generateSerialNumber(): Promise<string> {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substring(2, 8);
    return `SN${timestamp}${random}`.toUpperCase();
  }

  async getNextGlobalRewardNumber(): Promise<number> {
    const existing = Array.from(this.stepUpRewardNumbers.values())
      .filter(rn => rn.type === 'global')
      .map(rn => rn.rewardNumber);
    
    if (existing.length === 0) return 1;
    return Math.max(...existing) + 1;
  }

  async getNextLocalRewardNumber(): Promise<number> {
    const existing = Array.from(this.stepUpRewardNumbers.values())
      .filter(rn => rn.type === 'local')
      .map(rn => rn.rewardNumber);
    
    if (existing.length === 0) return 1;
    return Math.max(...existing) + 1;
  }

  // Withdrawal Methods
  async createWithdrawalRequest(data: any): Promise<any> {
    const id = randomUUID();
    const request = {
      id,
      createdAt: new Date(),
      ...data
    };
    this.withdrawalRequests.set(id, request);
    return request;
  }

  async getWithdrawalRequest(id: string): Promise<any> {
    return this.withdrawalRequests.get(id);
  }

  async updateWithdrawalRequest(id: string, data: any): Promise<any> {
    const existing = this.withdrawalRequests.get(id);
    if (!existing) {
      throw new Error("Withdrawal request not found");
    }
    const updated = { ...existing, ...data };
    this.withdrawalRequests.set(id, updated);
    return updated;
  }

  async getWithdrawalRequests(merchantId: string): Promise<any[]> {
    return Array.from(this.withdrawalRequests.values())
      .filter(request => request.merchantId === merchantId);
  }

  async getWithdrawalHistory(merchantId: string, fromDate?: Date): Promise<any[]> {
    let requests = Array.from(this.withdrawalRequests.values())
      .filter(request => request.merchantId === merchantId);
    
    if (fromDate) {
      requests = requests.filter(request => request.createdAt >= fromDate);
    }
    
    return requests;
  }

  // Customer Withdrawal Methods
  async createCustomerWithdrawalRequest(data: any): Promise<any> {
    const id = randomUUID();
    const request = {
      id,
      createdAt: new Date(),
      ...data
    };
    this.customerWithdrawalRequests.set(id, request);
    return request;
  }

  async getCustomerWithdrawalRequest(id: string): Promise<any> {
    return this.customerWithdrawalRequests.get(id);
  }

  async updateCustomerWithdrawalRequest(id: string, data: any): Promise<any> {
    const existing = this.customerWithdrawalRequests.get(id);
    if (!existing) {
      throw new Error("Customer withdrawal request not found");
    }
    const updated = { ...existing, ...data };
    this.customerWithdrawalRequests.set(id, updated);
    return updated;
  }

  async getCustomerWithdrawalRequests(customerId: string): Promise<any[]> {
    return Array.from(this.customerWithdrawalRequests.values())
      .filter(request => request.customerId === customerId);
  }

  async getCustomerWithdrawalHistory(customerId: string, fromDate?: Date): Promise<any[]> {
    let requests = Array.from(this.customerWithdrawalRequests.values())
      .filter(request => request.customerId === customerId);
    
    if (fromDate) {
      requests = requests.filter(request => request.createdAt >= fromDate);
    }
    
    return requests;
  }

  // Merchant Income Methods
  async getMerchantIncomes(merchantId: string, fromDate?: Date): Promise<any[]> {
    let incomes = Array.from(this.merchantIncomes.values())
      .filter(income => income.merchantId === merchantId);
    
    if (fromDate) {
      incomes = incomes.filter(income => income.createdAt >= fromDate);
    }
    
    return incomes;
  }

  async createMerchantIncome(data: any): Promise<any> {
    const id = randomUUID();
    const income = {
      id,
      createdAt: new Date(),
      ...data
    };
    this.merchantIncomes.set(id, income);
    return income;
  }

  async updateMerchantIncome(id: string, data: any): Promise<any> {
    const existing = this.merchantIncomes.get(id);
    if (!existing) {
      throw new Error("Merchant income not found");
    }
    const updated = { ...existing, ...data };
    this.merchantIncomes.set(id, updated);
    return updated;
  }

  // Helper methods
  private getPeriodDate(now: Date, period: string): Date {
    const date = new Date(now);
    switch (period) {
      case 'daily':
        date.setDate(date.getDate() - 1);
        break;
      case 'weekly':
        date.setDate(date.getDate() - 7);
        break;
      case 'monthly':
        date.setMonth(date.getMonth() - 1);
        break;
      case 'yearly':
        date.setFullYear(date.getFullYear() - 1);
        break;
      default:
        return new Date(0);
    }
    return date;
  }

  private getSerialNumbersByCountry(serialNumbers: any[]): any[] {
    const countryStats = new Map();
    serialNumbers.forEach(sn => {
      const country = sn.country || 'Unknown';
      if (!countryStats.has(country)) {
        countryStats.set(country, { global: 0, local: 0, completed: 0, active: 0 });
      }
      const stats = countryStats.get(country);
      if (sn.type === 'global') stats.global++;
      if (sn.type === 'local') stats.local++;
      if (sn.isCompleted) stats.completed++;
      else stats.active++;
    });

    return Array.from(countryStats.entries()).map(([country, stats]) => ({
      country,
      ...stats
    }));
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

  async getUnreadMessageCount(conversationId: string, userId: string): Promise<number> {
    const unreadMessages = Array.from(this.chatMessages.values())
      .filter(msg => 
        msg.conversationId === conversationId && 
        msg.receiverId === userId && 
        !msg.isRead
      );
    
    return unreadMessages.length;
  }

  async getRecentUnreadMessages(userId: string, limit: number = 10): Promise<ChatMessage[]> {
    const unreadMessages = Array.from(this.chatMessages.values())
      .filter(msg => msg.receiverId === userId && !msg.isRead)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, limit);
    
    // Add sender names to messages
    const messagesWithSenderNames = await Promise.all(
      unreadMessages.map(async (msg) => {
        const sender = this.users.get(msg.senderId);
        return {
          ...msg,
          senderName: sender ? `${sender.firstName} ${sender.lastName}` : 'Unknown User'
        };
      })
    );
    
    return messagesWithSenderNames;
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
  private globalRewardNumbers: Map<string, any> = new Map();
  private shoppingVouchers: Map<string, any> = new Map();
  private customerPointTransactions: Map<string, any> = new Map();
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
    const profile = Array.from(this.customerProfiles.values())
      .find(p => p.userId === userId);
    
    // Ensure accumulatedPoints field exists (for backward compatibility)
    if (profile && profile.accumulatedPoints === undefined) {
      profile.accumulatedPoints = 0;
    }
    
    return profile;
  }

  async getCustomerProfileById(customerId: string): Promise<CustomerProfile | undefined> {
    const profile = this.customerProfiles.get(customerId);
    
    // Ensure accumulatedPoints field exists (for backward compatibility)
    if (profile && profile.accumulatedPoints === undefined) {
      profile.accumulatedPoints = 0;
    }
    
    return profile;
  }

  async getCustomerProfileByMobile(mobileNumber: string): Promise<CustomerProfile | undefined> {
    return Array.from(this.customerProfiles.values())
      .find(p => p.mobileNumber === mobileNumber);
  }

  async getCustomerProfileByAccountNumber(accountNumber: string): Promise<CustomerProfile | undefined> {
    return Array.from(this.customerProfiles.values())
      .find(p => p.uniqueAccountNumber === accountNumber);
  }

  async getAllCustomerProfiles(): Promise<CustomerProfile[]> {
    return Array.from(this.customerProfiles.values());
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

  async deleteCustomerProfile(customerId: string): Promise<void> {
    if (!this.customerProfiles.has(customerId)) {
      throw new Error("Customer profile not found");
    }
    this.customerProfiles.delete(customerId);
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

    // Process Global Number eligibility if points are being added
    if (transaction.points > 0 && transaction.transactionType === 'earned') {
      const isRewardPoints = transaction.transactionType === 'reward' || transaction.description?.includes('reward');
      
      try {
        const result = await this.processGlobalNumberEligibility(
          transaction.customerId,
          transaction.points,
          isRewardPoints
        );

        if (result.globalNumberAwarded) {
          console.log(`🎉 Global Number ${result.globalNumber} awarded to customer ${transaction.customerId}`);
          
          // Log StepUp rewards
          for (const reward of result.stepUpRewards) {
            console.log(`💰 StepUp reward: ${reward.rewardPoints} points awarded to Global Number ${reward.globalNumber}`);
          }
        }
      } catch (error) {
        console.error('Error processing Global Number eligibility:', error);
        // Don't fail the transaction if Global Number processing fails
      }
    }

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
    // Get the highest existing global serial number and increment by 1
    // This ensures sequential assignment starting from 1
    const existingSerials = Array.from(this.customerSerialNumbers.values());
    const maxGlobalNumber = existingSerials.length > 0 
      ? Math.max(...existingSerials.map(s => s.globalSerialNumber))
      : 0;
    
    const nextGlobalNumber = maxGlobalNumber + 1;
    console.log(`🎯 Next Global Number to assign: ${nextGlobalNumber}`);
    return nextGlobalNumber;
  }

  async assignSerialNumberToCustomer(customerId: string): Promise<CustomerSerialNumber> {
    // Get the next sequential global serial number based on achievement order
    const globalSerialNumber = await this.getNextGlobalSerialNumber();
    const totalSerialCount = this.customerSerialNumbers.size + 1;
    
    // Create the serial number record
    const serial = await this.createCustomerSerialNumber({
      customerId,
      globalSerialNumber,
      totalSerialCount,
      pointsAtSerial: 1500, // Points at time of serial assignment
      isActive: true
    });

    // Update customer profile with serial numbers
    const profile = await this.getCustomerProfileById(customerId);
    if (profile) {
      // Update total points earned to include the 1500 points that triggered the global number
      const currentTotalEarned = profile.totalPointsEarned || 0;
      const newTotalEarned = currentTotalEarned + 1500;
      console.log(`🔍 Storage: Updating totalPointsEarned: ${currentTotalEarned} + 1500 = ${newTotalEarned}`);
      
      await this.updateCustomerProfile(profile.userId, {
        globalSerialNumber,
        localSerialNumber: totalSerialCount,
        // Update total points earned to include the 1500 points
        totalPointsEarned: newTotalEarned,
        // Reset accumulated points to 0 when Global Number is assigned
        accumulatedPoints: 0,
        currentPointsBalance: 0,
        purchasePoints: 0,
        wasteManagementPoints: 0,
        dailyLoginPoints: 0,
        referralPoints: 0,
        birthdayPoints: 0,
        otherActivityPoints: 0
      });
      
      console.log(`🎯 Customer ${profile.userId} assigned global serial #${globalSerialNumber} (achievement order)`);
    }

    // Log the reward tier assignment
    const rewardTier = this.getRewardTierBySerial(globalSerialNumber);
    console.log(`🏆 Customer assigned to ${rewardTier.name} tier (Serial #${globalSerialNumber}, Reward: ${rewardTier.reward} points)`);

    return serial;
  }

  // Get reward tier based on global serial number (matching the Bengali logic)
  private getRewardTierBySerial(serialNumber: number): { name: string; range: string; reward: number } {
    if (serialNumber === 1) {
      return { name: 'Champion', range: '1', reward: 38000 };
    } else if (serialNumber >= 2 && serialNumber <= 5) {
      return { name: 'Elite', range: '2-5', reward: 15000 };
    } else if (serialNumber >= 6 && serialNumber <= 15) {
      return { name: 'Premium', range: '6-15', reward: 8000 };
    } else if (serialNumber >= 16 && serialNumber <= 37) {
      return { name: 'Gold', range: '16-37', reward: 3500 };
    } else if (serialNumber >= 38 && serialNumber <= 65) {
      return { name: 'Silver', range: '38-65', reward: 1500 };
    } else {
      return { name: 'Bronze', range: '66+', reward: 800 };
    }
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
    
    // Create a more scannable QR code format
    // Format: KOMARCE:CUSTOMER:customerId:accountNumber
    const qrData = `KOMARCE:CUSTOMER:${profile.id}:${profile.uniqueAccountNumber}`;
    
    console.log(`🔍 Generated QR code for customer ${profile.id}: ${qrData}`);
    
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

  // Global Number System Implementation
  private globalNumbers: Map<string, GlobalNumber> = new Map();
  private stepUpConfigs: Map<string, StepUpConfig> = new Map();
  private stepUpRewards: Map<string, StepUpReward> = new Map();
  private globalNumberConfigs: Map<string, GlobalNumberConfig> = new Map();
  private globalNumberCounter = 0;

  // Initialize default StepUp configuration
  async initializeStepUpConfig(): Promise<void> {
    const defaultConfigs = [
      { multiplier: 5, rewardPoints: 500 },
      { multiplier: 25, rewardPoints: 1500 },
      { multiplier: 125, rewardPoints: 3000 },
      { multiplier: 500, rewardPoints: 30000 },
      { multiplier: 2500, rewardPoints: 160000 }
    ];

    for (const config of defaultConfigs) {
      const existing = Array.from(this.stepUpConfigs.values())
        .find(c => c.multiplier === config.multiplier);
      
      if (!existing) {
        await this.createStepUpConfig(config);
      }
    }

    // Initialize global number config if not exists
    const globalConfig = Array.from(this.globalNumberConfigs.values())[0];
    if (!globalConfig) {
      await this.createGlobalNumberConfig({
        pointsThreshold: 1500,
        rewardPointsCountTowardThreshold: false,
        isActive: true
      });
    }
  }

  // Global Number Management
  async createGlobalNumber(globalNumber: InsertGlobalNumber): Promise<GlobalNumber> {
    const id = randomUUID();
    const newGlobalNumber: GlobalNumber = {
      id,
      ...globalNumber,
      createdAt: new Date()
    };
    this.globalNumbers.set(id, newGlobalNumber);
    return newGlobalNumber;
  }

  async getGlobalNumber(globalNumberValue: number): Promise<GlobalNumber | undefined> {
    return Array.from(this.globalNumbers.values())
      .find(gn => gn.globalNumber === globalNumberValue);
  }

  async getCustomerGlobalNumbers(customerId: string): Promise<GlobalNumber[]> {
    return Array.from(this.globalNumbers.values())
      .filter(gn => gn.customerId === customerId)
      .sort((a, b) => a.globalNumber - b.globalNumber);
  }

  async getNextGlobalNumber(): Promise<number> {
    const existingNumbers = Array.from(this.globalNumbers.values())
      .map(gn => gn.globalNumber)
      .sort((a, b) => b - a);
    
    return existingNumbers.length > 0 ? existingNumbers[0] + 1 : 1;
  }

  // StepUp Configuration Management
  async createStepUpConfig(config: InsertStepUpConfig): Promise<StepUpConfig> {
    const id = randomUUID();
    const newConfig: StepUpConfig = {
      id,
      ...config,
      createdAt: new Date()
    };
    this.stepUpConfigs.set(id, newConfig);
    return newConfig;
  }

  async getStepUpConfigs(): Promise<StepUpConfig[]> {
    return Array.from(this.stepUpConfigs.values())
      .filter(c => c.isActive)
      .sort((a, b) => a.multiplier - b.multiplier);
  }

  // StepUp Rewards Management
  async createStepUpReward(reward: InsertStepUpReward): Promise<StepUpReward> {
    const id = randomUUID();
    const newReward: StepUpReward = {
      id,
      ...reward,
      createdAt: new Date()
    };
    this.stepUpRewards.set(id, newReward);
    return newReward;
  }

  async getStepUpReward(recipientGlobalNumber: number, triggerGlobalNumber: number, multiplier: number): Promise<StepUpReward | undefined> {
    return Array.from(this.stepUpRewards.values())
      .find(r => 
        r.recipientGlobalNumber === recipientGlobalNumber && 
        r.triggerGlobalNumber === triggerGlobalNumber && 
        r.multiplier === multiplier
      );
  }

  async markStepUpRewardAsAwarded(rewardId: string): Promise<StepUpReward> {
    const reward = this.stepUpRewards.get(rewardId);
    if (!reward) {
      throw new Error('StepUp reward not found');
    }
    const updated = { ...reward, isAwarded: true, awardedAt: new Date() };
    this.stepUpRewards.set(rewardId, updated);
    return updated;
  }

  // Global Number Configuration
  async createGlobalNumberConfig(config: InsertGlobalNumberConfig): Promise<GlobalNumberConfig> {
    const id = randomUUID();
    const newConfig: GlobalNumberConfig = {
      id,
      ...config,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    this.globalNumberConfigs.set(id, newConfig);
    return newConfig;
  }

  async getGlobalNumberConfig(): Promise<GlobalNumberConfig | undefined> {
    return Array.from(this.globalNumberConfigs.values())
      .find(c => c.isActive);
  }

  // Core Global Number System Logic
  async processGlobalNumberEligibility(customerId: string, pointsToAdd: number, isRewardPoints: boolean = false): Promise<{
    globalNumberAwarded: boolean;
    globalNumber?: number;
    stepUpRewards: Array<{ recipientCustomerId: string; rewardPoints: number; globalNumber: number }>;
  }> {
    console.log(`🔍 Processing Global Number eligibility for customer ${customerId}, adding ${pointsToAdd} points`);
    
    const config = await this.getGlobalNumberConfig();
    console.log(`🔍 Global Number config:`, config);
    if (!config) {
      throw new Error('Global Number configuration not found');
    }

    const customer = await this.getCustomerProfileById(customerId);
    console.log(`🔍 Customer profile:`, {
      id: customer?.id,
      userId: customer?.userId,
      accumulatedPoints: customer?.accumulatedPoints,
      globalSerialNumber: customer?.globalSerialNumber,
      currentPointsBalance: customer?.currentPointsBalance
    });
    if (!customer) {
      throw new Error('Customer not found');
    }

    // Check policy: do reward points count toward threshold?
    if (isRewardPoints && !config.rewardPointsCountTowardThreshold) {
      // Reward points don't count toward Global Number threshold
      // Just add to balance without triggering Global Number
      await this.updateCustomerProfile(customer.userId, {
        currentPointsBalance: customer.currentPointsBalance + pointsToAdd
      });
      return { globalNumberAwarded: false, stepUpRewards: [] };
    }

    // Calculate new accumulated points
    const currentAccumulated = customer.accumulatedPoints || 0;
    const newAccumulatedPoints = currentAccumulated + pointsToAdd;
    console.log(`🔍 Points calculation: ${currentAccumulated} + ${pointsToAdd} = ${newAccumulatedPoints}, threshold: ${config.pointsThreshold}`);
    
    if (newAccumulatedPoints >= config.pointsThreshold) {
      // Customer qualifies for a Global Number!
      const nextGlobalNumber = await this.getNextGlobalNumber();
      
      // Create the Global Number
      await this.createGlobalNumber({
        globalNumber: nextGlobalNumber,
        customerId: customerId,
        pointsAccumulated: newAccumulatedPoints,
        isActive: true
      });

      // Reset accumulated points and loyalty points to 0 after Global Number
      await this.updateCustomerProfile(customer.userId, {
        accumulatedPoints: 0, // Reset to 0 after Global Number
        currentPointsBalance: 0, // Reset loyalty points to 0 as per requirement
        globalSerialNumber: nextGlobalNumber,
        totalPointsEarned: (customer.totalPointsEarned || 0) + pointsToAdd
      });

      console.log(`🎉 Global Number ${nextGlobalNumber} awarded to customer ${customerId}!`);

      // Update customer wallet to reflect the reset
      const wallet = await this.getCustomerWallet(customerId);
      if (wallet) {
        await this.updateCustomerWallet(customerId, {
          pointsBalance: 0, // Reset to 0 as per requirement
          totalPointsEarned: wallet.totalPointsEarned + pointsToAdd,
          lastTransactionAt: new Date()
        });
      }

      // Process StepUp rewards for existing Global Number holders
      const stepUpRewards = await this.processStepUpRewards(nextGlobalNumber);

      return {
        globalNumberAwarded: true,
        globalNumber: nextGlobalNumber,
        stepUpRewards
      };
    } else {
      // Not enough points yet, just accumulate
      await this.updateCustomerProfile(customer.userId, {
        accumulatedPoints: newAccumulatedPoints,
        currentPointsBalance: (customer.currentPointsBalance || 0) + pointsToAdd,
        totalPointsEarned: (customer.totalPointsEarned || 0) + pointsToAdd
      });

      // Update customer wallet
      const wallet = await this.getCustomerWallet(customerId);
      if (wallet) {
        await this.updateCustomerWallet(customerId, {
          pointsBalance: wallet.pointsBalance + pointsToAdd,
          totalPointsEarned: wallet.totalPointsEarned + pointsToAdd,
          lastTransactionAt: new Date()
        });
      }

      console.log(`📈 Customer ${customerId} accumulated ${newAccumulatedPoints}/${config.pointsThreshold} points`);
      return { globalNumberAwarded: false, stepUpRewards: [] };
    }
  }

  // Process StepUp rewards when a new Global Number is created
  async processStepUpRewards(newGlobalNumber: number): Promise<Array<{ recipientCustomerId: string; rewardPoints: number; globalNumber: number }>> {
    const stepUpConfigs = await this.getStepUpConfigs();
    const rewards: Array<{ recipientCustomerId: string; rewardPoints: number; globalNumber: number }> = [];

    for (const config of stepUpConfigs) {
      // Check if newGlobalNumber is divisible by any existing Global Number × multiplier
      // G × multiplier = N, so G = N / multiplier
      if (newGlobalNumber % config.multiplier === 0) {
        const recipientGlobalNumber = newGlobalNumber / config.multiplier;
        
        // Find the customer with this Global Number
        const recipientGlobalNumberRecord = await this.getGlobalNumber(recipientGlobalNumber);
        if (recipientGlobalNumberRecord) {
          // Check if reward already awarded (idempotent)
          const existingReward = await this.getStepUpReward(
            recipientGlobalNumber,
            newGlobalNumber,
            config.multiplier
          );

          if (!existingReward) {
            // Create and award the reward
            const reward = await this.createStepUpReward({
              recipientCustomerId: recipientGlobalNumberRecord.customerId,
              recipientGlobalNumber: recipientGlobalNumber,
              triggerGlobalNumber: newGlobalNumber,
              multiplier: config.multiplier,
              rewardPoints: config.rewardPoints,
              isAwarded: false
            });

            // Award the points to the recipient (as reward points)
            await this.processGlobalNumberEligibility(
              recipientGlobalNumberRecord.customerId,
              config.rewardPoints,
              true // These are reward points
            );

            // Mark as awarded
            await this.markStepUpRewardAsAwarded(reward.id);

            rewards.push({
              recipientCustomerId: recipientGlobalNumberRecord.customerId,
              rewardPoints: config.rewardPoints,
              globalNumber: recipientGlobalNumber
            });
          }
        }
      }
    }

    return rewards;
  }

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

  async deleteCustomerWallet(customerId: string): Promise<void> {
    const wallet = Array.from(this.customerWallets.values()).find(w => w.customerId === customerId);
    if (wallet) {
      this.customerWallets.delete(wallet.id);
    }
  }

  async deleteCustomerTransactions(customerId: string): Promise<void> {
    // Delete all transactions related to this customer
    const transactionsToDelete = Array.from(this.customerPointTransactions.values())
      .filter(t => t.customerId === customerId);
    
    for (const transaction of transactionsToDelete) {
      this.customerPointTransactions.delete(transaction.id);
    }
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

  async deleteMerchantCustomer(merchantId: string, customerId: string): Promise<void> {
    console.log(`🔍 Looking for merchant customer: merchantId=${merchantId}, customerId=${customerId}`);
    
    const existing = await this.getMerchantCustomer(merchantId, customerId);
    if (!existing) {
      console.log('❌ Merchant customer relationship not found');
      throw new Error('Customer not found in merchant list');
    }
    
    console.log(`✅ Found merchant customer: ${existing.customerName}, deleting and blocking...`);
    
    // Add customer to blocked list before deleting
    await this.createBlockedCustomer({
      merchantId,
      customerId,
      customerName: existing.customerName,
      customerEmail: existing.customerEmail,
      customerMobile: existing.customerMobile,
      accountNumber: existing.accountNumber,
      reason: "Deleted by merchant"
    });
    
    const deleted = this.merchantCustomers.delete(existing.id);
    
    if (deleted) {
      console.log('✅ Merchant customer relationship deleted and blocked successfully');
    } else {
      console.log('❌ Failed to delete merchant customer relationship');
      throw new Error('Failed to delete customer from merchant list');
    }
  }

  // ==================== BLOCKED CUSTOMERS MANAGEMENT ====================

  async createBlockedCustomer(blockedCustomer: InsertBlockedCustomer): Promise<BlockedCustomer> {
    const id = randomUUID();
    const newBlockedCustomer: BlockedCustomer = {
      id,
      merchantId: blockedCustomer.merchantId,
      customerId: blockedCustomer.customerId,
      customerName: blockedCustomer.customerName,
      customerEmail: blockedCustomer.customerEmail || null,
      customerMobile: blockedCustomer.customerMobile,
      accountNumber: blockedCustomer.accountNumber,
      reason: blockedCustomer.reason || "Deleted by merchant",
      blockedAt: new Date(),
      createdAt: new Date()
    };
    
    this.blockedCustomers.set(id, newBlockedCustomer);
    console.log(`🚫 Customer ${blockedCustomer.customerName} blocked for merchant ${blockedCustomer.merchantId}`);
    return newBlockedCustomer;
  }

  async getBlockedCustomer(merchantId: string, customerId: string): Promise<BlockedCustomer | undefined> {
    return Array.from(this.blockedCustomers.values())
      .find(bc => bc.merchantId === merchantId && bc.customerId === customerId);
  }

  async getBlockedCustomers(merchantId: string): Promise<BlockedCustomer[]> {
    return Array.from(this.blockedCustomers.values())
      .filter(bc => bc.merchantId === merchantId)
      .sort((a, b) => {
        const aTime = a.blockedAt ? new Date(a.blockedAt).getTime() : 0;
        const bTime = b.blockedAt ? new Date(b.blockedAt).getTime() : 0;
        return bTime - aTime;
      });
  }

  async removeBlockedCustomer(merchantId: string, customerId: string): Promise<void> {
    const blocked = await this.getBlockedCustomer(merchantId, customerId);
    if (blocked) {
      this.blockedCustomers.delete(blocked.id);
      console.log(`✅ Customer ${customerId} unblocked for merchant ${merchantId}`);
    }
  }

  // ==================== MERCHANT REPORTS AND TRANSACTIONS ====================

  async getMerchantPointTransfers(merchantId: string): Promise<any[]> {
    // Get all point transfers made by this merchant to customers
    const transfers = Array.from(this.customerPointTransactions.values())
      .filter(t => t.merchantId === merchantId && t.transactionType === 'earned')
      .map(t => ({
        id: t.id,
        createdAt: t.createdAt,
        customerName: t.customerName || 'Unknown Customer',
        customerAccountNumber: t.customerAccountNumber || 'N/A',
        points: t.points,
        description: t.description,
        status: 'completed'
      }))
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    return transfers;
  }

  async getMerchantPointsReceived(merchantId: string): Promise<any[]> {
    // Get all points received by this merchant from local admin
    const merchant = await this.getMerchantByUserId(merchantId);
    if (!merchant) return [];

    // For now, create sample data based on merchant's current points
    // In a real system, this would come from actual transaction records
    const pointsReceived = [];
    
    // If merchant has points, assume they received them from local admin
    if (merchant.loyaltyPointsBalance > 0) {
      pointsReceived.push({
        id: randomUUID(),
        date: new Date().toISOString(),
        createdAt: new Date(),
        source: 'Local Admin',
        points: merchant.loyaltyPointsBalance,
        description: 'Points allocation from local admin'
      });
    }

    return pointsReceived.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  async getMerchantTransactions(merchantId: string): Promise<any[]> {
    // Get all transactions for this merchant (both received and distributed)
    const pointTransfers = await this.getMerchantPointTransfers(merchantId);
    const pointsReceived = await this.getMerchantPointsReceived(merchantId);

    // Combine and sort all transactions
    const allTransactions = [
      ...pointTransfers.map(t => ({ ...t, type: 'distributed' })),
      ...pointsReceived.map(t => ({ ...t, type: 'received' }))
    ].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    return allTransactions;
  }

  // Global Reward System Implementation
  async createGlobalRewardNumber(rewardNumber: any): Promise<any> {
    this.globalRewardNumbers.set(rewardNumber.id, rewardNumber);
    return rewardNumber;
  }

  async getGlobalRewardNumber(id: string): Promise<any> {
    return this.globalRewardNumbers.get(id);
  }

  async updateGlobalRewardNumber(id: string, updates: any): Promise<any> {
    const existing = this.globalRewardNumbers.get(id);
    if (!existing) {
      throw new Error('Global reward number not found');
    }
    const updated = { ...existing, ...updates };
    this.globalRewardNumbers.set(id, updated);
    return updated;
  }

  async getGlobalRewardNumbersByCustomer(customerId: string): Promise<any[]> {
    return Array.from(this.globalRewardNumbers.values())
      .filter(rn => rn.customerId === customerId)
      .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
  }

  async createCustomerPointTransaction(transaction: any): Promise<any> {
    const id = randomUUID();
    const newTransaction = {
      id,
      ...transaction,
      createdAt: new Date()
    };
    this.customerPointTransactions.set(id, newTransaction);
    return newTransaction;
  }

  async getAllCustomerSerialNumbers(): Promise<any[]> {
    return Array.from(this.customerSerialNumbers.values());
  }

  async getAllCustomerProfiles(): Promise<CustomerProfile[]> {
    return Array.from(this.customerProfiles.values());
  }

  // Global Reward Number methods
  async getGlobalRewardNumberById(id: string): Promise<any | undefined> {
    return this.globalRewardNumbers.get(id);
  }

  async getGlobalRewardNumbersByCustomer(customerId: string): Promise<any[]> {
    return Array.from(this.globalRewardNumbers.values())
      .filter(grn => grn.customerId === customerId);
  }

  async getAllGlobalRewardNumbers(): Promise<any[]> {
    return Array.from(this.globalRewardNumbers.values());
  }

  async saveGlobalRewardNumber(globalRewardNumber: any): Promise<void> {
    this.globalRewardNumbers.set(globalRewardNumber.id, globalRewardNumber);
  }

  async updateGlobalRewardNumber(globalRewardNumber: any): Promise<void> {
    this.globalRewardNumbers.set(globalRewardNumber.id, globalRewardNumber);
  }

  async deleteGlobalRewardNumber(id: string): Promise<void> {
    this.globalRewardNumbers.delete(id);
  }

  // Shopping Voucher methods
  async saveShoppingVoucher(voucher: any): Promise<void> {
    this.shoppingVouchers.set(voucher.id, voucher);
  }

  async getShoppingVouchersByCustomer(customerId: string): Promise<any[]> {
    return Array.from(this.shoppingVouchers.values())
      .filter(voucher => voucher.customerId === customerId);
  }

  async updateShoppingVoucher(voucher: any): Promise<void> {
    this.shoppingVouchers.set(voucher.id, voucher);
  }

  async deleteShoppingVoucher(id: string): Promise<void> {
    this.shoppingVouchers.delete(id);
  }
}

export const storage = new MemStorage();
