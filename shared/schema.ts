import { sql } from "drizzle-orm";
import { pgTable, text, varchar, integer, decimal, boolean, timestamp, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Users table for all user types (admin, merchant, customer)
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  email: text("email").notNull().unique(),
  password: text("password").notNull(),
  firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull(),
  role: text("role", { enum: ["customer", "merchant", "admin", "global_admin", "local_admin"] }).notNull().default("customer"),
  country: text("country").notNull().default("BD"), // KE, MU, RW, UG, BH, BD, IN, ID, MY, PK, PH, QA, SG, LK, TH, TR, AE
  phone: text("phone"),
  address: text("address"),
  dateOfBirth: text("date_of_birth"),
  bloodGroup: text("blood_group"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

// Categories table
export const categories = pgTable("categories", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  description: text("description"),
  icon: text("icon"),
  parentId: varchar("parent_id"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

// Brands table
export const brands = pgTable("brands", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  description: text("description"),
  logo: text("logo"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

// Products table
export const products = pgTable("products", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  description: text("description"),
  price: decimal("price", { precision: 10, scale: 2 }).notNull(),
  originalPrice: decimal("original_price", { precision: 10, scale: 2 }),
  sku: text("sku").notNull().unique(),
  stock: integer("stock").notNull().default(0),
  images: jsonb("images").default([]),
  categoryId: varchar("category_id").notNull(),
  brandId: varchar("brand_id"),
  merchantId: varchar("merchant_id").notNull(),
  pointsReward: integer("points_reward").notNull().default(0),
  isActive: boolean("is_active").notNull().default(true),
  rating: decimal("rating", { precision: 3, scale: 2 }).default("0.00"),
  reviewCount: integer("review_count").notNull().default(0),
  createdAt: timestamp("created_at").defaultNow(),
});

// Merchant profiles
export const merchants = pgTable("merchants", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().unique(),
  businessName: text("business_name").notNull(),
  businessType: text("business_type"),
  accountType: text("account_type", { enum: ["merchant", "e_merchant"] }).notNull().default("merchant"),
  tier: text("tier").notNull().default("merchant"), // merchant, star, double_star, triple_star, executive
  referralId: text("referral_id").notNull().unique(), // Unique merchant referral ID
  // Withdrawal requirements
  fathersName: text("fathers_name"),
  mothersName: text("mothers_name"),
  nidNumber: text("nid_number"), // Voter ID or Passport
  nomineeDetails: jsonb("nominee_details"), // JSON object with nominee info
  // Wallet balances
  loyaltyPointsBalance: integer("loyalty_points_balance").notNull().default(0),
  totalCashback: decimal("total_cashback", { precision: 10, scale: 2 }).notNull().default("0.00"),
  totalSales: decimal("total_sales", { precision: 10, scale: 2 }).notNull().default("0.00"),
  totalOrders: integer("total_orders").notNull().default(0),
  productCount: integer("product_count").notNull().default(0),
  availablePoints: integer("available_points").notNull().default(0),
  totalPointsPurchased: integer("total_points_purchased").notNull().default(0),
  totalPointsDistributed: integer("total_points_distributed").notNull().default(0),
  instantCashback: decimal("instant_cashback", { precision: 10, scale: 2 }).notNull().default("0.00"),
  referralCommission: decimal("referral_commission", { precision: 10, scale: 2 }).notNull().default("0.00"),
  royaltyBonus: decimal("royalty_bonus", { precision: 10, scale: 2 }).notNull().default("0.00"),
  // New Cashback System wallets
  affiliateCashback: decimal("affiliate_cashback", { precision: 10, scale: 2 }).notNull().default("0.00"), // 2% commission from referred merchants
  monthlyCashback: decimal("monthly_cashback", { precision: 10, scale: 2 }).notNull().default("0.00"), // 1% monthly proportional distribution
  shoppingVoucherBalance: decimal("shopping_voucher_balance", { precision: 10, scale: 2 }).notNull().default("0.00"), // Revenue share from customer vouchers
  incentiveClubBonus: decimal("incentive_club_bonus", { precision: 10, scale: 2 }).notNull().default("0.00"), // Rank-based rewards
  // Referral system
  merchantReferralCode: text("merchant_referral_code").unique(), // For referring other merchants
  referredByMerchant: varchar("referred_by_merchant"), // ID of referring merchant
  // Incentive Club Rank System
  currentRank: text("current_rank").default("none"), // none, bronze, silver, gold, platinum, diamond
  rankAchievedAt: timestamp("rank_achieved_at"),
  totalRankBonus: decimal("total_rank_bonus", { precision: 10, scale: 2 }).notNull().default("0.00"),
  komarceBalance: decimal("komarce_balance", { precision: 10, scale: 2 }).notNull().default("500.00"),
  totalReceived: decimal("total_received", { precision: 10, scale: 2 }).notNull().default("0.00"),
  totalWithdrawn: decimal("total_withdrawn", { precision: 10, scale: 2 }).notNull().default("0.00"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

// Customer profiles - Enhanced for comprehensive reward system
export const customers = pgTable("customers", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().unique(),
  totalPoints: integer("total_points").notNull().default(0),
  accumulatedPoints: integer("accumulated_points").notNull().default(0), // Points accumulating towards 1500
  currentPointsBalance: integer("current_points_balance").notNull().default(0), // Current available points
  totalPointsEarned: integer("total_points_earned").notNull().default(0), // Lifetime points earned
  globalRewardNumbers: integer("global_reward_numbers").notNull().default(0), // Count of global numbers
  globalSerialNumber: integer("global_serial_number"), // Latest global serial number assigned
  currentTier: text("current_tier").default("tier_1"),
  // StepUp system tracking
  stepUpCompleted: boolean("step_up_completed").notNull().default(false), // Completed first StepUp journey (reached 1500 points)
  stepUpCompletedAt: timestamp("step_up_completed_at"),
  // Infinity system tracking
  infinityEligible: boolean("infinity_eligible").notNull().default(false), // Eligible for Infinity rewards (StepUp completed + 30,000+ points)
  infinityCyclesCompleted: integer("infinity_cycles_completed").notNull().default(0),
  lastInfinityCycleAt: timestamp("last_infinity_cycle_at"),
  // Affiliate system tracking
  totalReferrals: integer("total_referrals").notNull().default(0),
  totalAffiliateCommission: decimal("total_affiliate_commission", { precision: 15, scale: 2 }).notNull().default("0.00"),
  isAffiliateActive: boolean("is_affiliate_active").notNull().default(true),
  // General tracking
  totalOrders: integer("total_orders").notNull().default(0),
  totalSpent: decimal("total_spent", { precision: 10, scale: 2 }).notNull().default("0.00"),
  referralCode: text("referral_code").unique(),
  referredBy: varchar("referred_by"),
  dailyLoginCount: integer("daily_login_count").notNull().default(0),
  lastLoginDate: timestamp("last_login_date"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Orders table
export const orders = pgTable("orders", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  customerId: varchar("customer_id").notNull(),
  merchantId: varchar("merchant_id").notNull(),
  orderNumber: text("order_number").notNull().unique(),
  status: text("status").notNull().default("pending"), // pending, confirmed, shipped, delivered, cancelled
  totalAmount: decimal("total_amount", { precision: 10, scale: 2 }).notNull(),
  pointsEarned: integer("points_earned").notNull().default(0),
  paymentMethod: text("payment_method"),
  paymentStatus: text("payment_status").default("pending"),
  shippingAddress: jsonb("shipping_address"),
  items: jsonb("items").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

// Reward transactions
export const rewardTransactions = pgTable("reward_transactions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  fromUserId: varchar("from_user_id").notNull(),
  toUserId: varchar("to_user_id").notNull(),
  points: integer("points").notNull(),
  type: text("type").notNull(), // earn, redeem, transfer, purchase, withdrawal, wallet_transfer, template_download
  description: text("description"),
  status: text("status").notNull().default("completed"), // pending, completed, failed
  orderId: varchar("order_id"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Global numbers for customers (supports multiple numbers per customer)
export const customerGlobalNumbers = pgTable("customer_global_numbers", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  customerId: varchar("customer_id").notNull(),
  globalNumber: integer("global_number").notNull().unique(), // Sequential global number 1, 2, 3...
  pointsAtAchievement: integer("points_at_achievement").notNull().default(1500),
  isStepUpNumber: boolean("is_step_up_number").notNull().default(true),
  isInfinityNumber: boolean("is_infinity_number").notNull().default(false),
  infinityCycleId: varchar("infinity_cycle_id"), // Reference to infinity cycle if applicable
  createdAt: timestamp("created_at").defaultNow(),
});

// StepUp milestone achievements (5th customer gets 500 points, 25th gets 1500, etc.)
export const stepUpMilestones = pgTable("step_up_milestones", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  milestoneGlobalNumber: integer("milestone_global_number").notNull().unique(), // 5, 25, 125, 500, 2500
  bonusPoints: integer("bonus_points").notNull(), // 500, 1500, 3000, 30000, 160000
  customerId: varchar("customer_id").notNull(), // Customer who achieved this milestone
  awardedAt: timestamp("awarded_at").defaultNow(),
  createdAt: timestamp("created_at").defaultNow(),
});

// Infinity reward cycles for customers with 30,000+ points who completed StepUp
export const infinityRewardCycles = pgTable("infinity_reward_cycles", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  customerId: varchar("customer_id").notNull(),
  cycleNumber: integer("cycle_number").notNull(), // 1st infinity cycle, 2nd infinity cycle, etc.
  pointsAtStart: integer("points_at_start").notNull(), // Should be 30,000+
  merchantDistributionAmount: integer("merchant_distribution_amount").notNull().default(6000),
  newGlobalNumbersGenerated: integer("new_global_numbers_generated").notNull().default(4),
  totalPointsDeducted: integer("total_points_deducted").notNull().default(12000),
  distributionCompleted: boolean("distribution_completed").notNull().default(false),
  globalNumbersAssigned: boolean("global_numbers_assigned").notNull().default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

// Merchant point distributions from infinity rewards
export const infinityMerchantDistributions = pgTable("infinity_merchant_distributions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  infinityCycleId: varchar("infinity_cycle_id").notNull(),
  customerId: varchar("customer_id").notNull(),
  merchantId: varchar("merchant_id").notNull(),
  pointsDistributed: integer("points_distributed").notNull(),
  originalRatio: decimal("original_ratio", { precision: 10, scale: 6 }), // Proportion based on historical transactions
  distributionReason: text("distribution_reason").default("infinity_reward_cycle"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Legacy reward numbers tracking (keeping for backward compatibility)
export const rewardNumbers = pgTable("reward_numbers", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  customerId: varchar("customer_id").notNull(),
  rewardNumber: integer("reward_number").notNull(),
  type: text("type").notNull(), // global, local
  tier1Completed: boolean("tier1_completed").notNull().default(false),
  tier2Completed: boolean("tier2_completed").notNull().default(false),
  tier3Completed: boolean("tier3_completed").notNull().default(false),
  tier4Completed: boolean("tier4_completed").notNull().default(false),
  tier1Amount: integer("tier1_amount").default(800),
  tier2Amount: integer("tier2_amount").default(1500),
  tier3Amount: integer("tier3_amount").default(3500),
  tier4Amount: integer("tier4_amount").default(32200),
  createdAt: timestamp("created_at").defaultNow(),
});

// Cart items
export const cartItems = pgTable("cart_items", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  customerId: varchar("customer_id").notNull(),
  productId: varchar("product_id").notNull(),
  quantity: integer("quantity").notNull().default(1),
  createdAt: timestamp("created_at").defaultNow(),
});

// Wishlist
export const wishlistItems = pgTable("wishlist_items", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  customerId: varchar("customer_id").notNull(),
  productId: varchar("product_id").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

// Reviews
export const reviews = pgTable("reviews", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  productId: varchar("product_id").notNull(),
  customerId: varchar("customer_id").notNull(),
  orderId: varchar("order_id"),
  rating: integer("rating").notNull(),
  comment: text("comment"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Admin profiles for global and local admins
export const admins = pgTable("admins", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().unique(),
  adminType: text("admin_type", { enum: ["global", "local"] }).notNull(),
  country: text("country"), // Only for local admins
  pointsBalance: integer("points_balance").notNull().default(0),
  totalPointsReceived: integer("total_points_received").notNull().default(0),
  totalPointsDistributed: integer("total_points_distributed").notNull().default(0),
  permissions: jsonb("permissions").default([]),
  isActive: boolean("is_active").notNull().default(true),
  mustResetPassword: boolean("must_reset_password").notNull().default(false),
  lastPasswordReset: timestamp("last_password_reset"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Secure chat messages table with role-based access
export const chatMessages = pgTable("chat_messages", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  conversationId: varchar("conversation_id").notNull(),
  senderId: varchar("sender_id").notNull(),
  senderRole: text("sender_role", { enum: ["global_admin", "local_admin", "merchant", "customer"] }).notNull(),
  receiverId: varchar("receiver_id").notNull(),
  receiverRole: text("receiver_role", { enum: ["global_admin", "local_admin", "merchant", "customer"] }).notNull(),
  message: text("message").notNull(),
  messageType: text("message_type", { enum: ["text", "image", "file"] }).default("text"),
  fileUrl: text("file_url"),
  fileName: text("file_name"),
  isRead: boolean("is_read").notNull().default(false),
  isEncrypted: boolean("is_encrypted").notNull().default(true),
  isEdited: boolean("is_edited").notNull().default(false),
  editedAt: timestamp("edited_at"),
  replyTo: varchar("reply_to"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Conversations table to track secure one-to-one chats
export const conversations = pgTable("conversations", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  participant1Id: varchar("participant1_id").notNull(),
  participant1Role: text("participant1_role", { enum: ["global_admin", "local_admin", "merchant", "customer"] }).notNull(),
  participant2Id: varchar("participant2_id").notNull(),
  participant2Role: text("participant2_role", { enum: ["global_admin", "local_admin", "merchant", "customer"] }).notNull(),
  lastMessageId: varchar("last_message_id"),
  lastMessageAt: timestamp("last_message_at"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Chat rooms for group conversations
export const chatRooms = pgTable("chat_rooms", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  description: text("description"),
  roomType: text("room_type", { enum: ["direct", "group", "support"] }).default("direct"),
  participants: jsonb("participants").notNull(), // Array of user IDs
  createdBy: varchar("created_by").notNull(),
  isActive: boolean("is_active").notNull().default(true),
  lastMessageAt: timestamp("last_message_at"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Point distribution tracking
export const pointDistributions = pgTable("point_distributions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  fromUserId: varchar("from_user_id").notNull(),
  toUserId: varchar("to_user_id").notNull(),
  points: integer("points").notNull(),
  distributionType: text("distribution_type", { enum: ["admin_to_admin", "admin_to_merchant", "merchant_to_customer", "point_generation", "manual_addition"] }).notNull(),
  description: text("description"),
  status: text("status", { enum: ["pending", "completed", "failed"] }).default("pending"),
  approvedBy: varchar("approved_by"),
  approvedAt: timestamp("approved_at"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Three-wallet system for users (Reward Points, Income, Commerce)
export const userWallets = pgTable("user_wallets", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull(),
  walletType: text("wallet_type", { enum: ["reward_points", "income", "commerce"] }).notNull(),
  balance: decimal("balance", { precision: 15, scale: 2 }).notNull().default("0.00"),
  totalReceived: decimal("total_received", { precision: 15, scale: 2 }).notNull().default("0.00"),
  totalSpent: decimal("total_spent", { precision: 15, scale: 2 }).notNull().default("0.00"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Point transactions with comprehensive tracking
export const pointTransactions = pgTable("point_transactions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull(),
  points: integer("points").notNull(),
  transactionType: text("transaction_type", { 
    enum: ["purchase", "referral_commission", "ripple_reward", "cashback", "admin_manual", "transfer_in", "transfer_out", "wallet_conversion", "withdrawal", "qr_transfer"]
  }).notNull(),
  fromUserId: varchar("from_user_id"),
  toUserId: varchar("to_user_id"), 
  fromWalletType: text("from_wallet_type", { enum: ["reward_points", "income", "commerce"] }),
  toWalletType: text("to_wallet_type", { enum: ["reward_points", "income", "commerce"] }),
  orderId: varchar("order_id"),
  merchantId: varchar("merchant_id"),
  description: text("description"),
  metadata: jsonb("metadata").default({}),
  balanceBefore: integer("balance_before").notNull(),
  balanceAfter: integer("balance_after").notNull(),
  commissionRate: decimal("commission_rate", { precision: 5, scale: 4 }),
  vatAmount: decimal("vat_amount", { precision: 10, scale: 2 }),
  serviceCharge: decimal("service_charge", { precision: 10, scale: 2 }),
  finalAmount: decimal("final_amount", { precision: 10, scale: 2 }),
  status: text("status", { enum: ["pending", "completed", "failed", "cancelled"] }).default("completed"),
  auditTrail: jsonb("audit_trail").default([]),
  createdAt: timestamp("created_at").defaultNow(),
});


// Referral system tracking
export const referrals = pgTable("referrals", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  referrerId: varchar("referrer_id").notNull(),
  refereeId: varchar("referee_id").notNull().unique(),
  referralCode: text("referral_code").notNull(),
  referralType: text("referral_type", { enum: ["customer", "merchant"] }).notNull(),
  lifetimeCommissionEarned: decimal("lifetime_commission_earned", { precision: 15, scale: 2 }).notNull().default("0.00"),
  totalRippleRewards: integer("total_ripple_rewards").notNull().default(0),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

// Commission tracking for affiliates
export const commissionTransactions = pgTable("commission_transactions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  referrerId: varchar("referrer_id").notNull(),
  refereeId: varchar("referee_id").notNull(),
  transactionType: text("transaction_type", { enum: ["affiliate_commission", "ripple_reward", "merchant_referral"] }).notNull(),
  originalTransactionId: varchar("original_transaction_id").notNull(),
  baseAmount: integer("base_amount").notNull(), // Original points earned by referee
  commissionAmount: decimal("commission_amount", { precision: 15, scale: 2 }).notNull(), // 5% or fixed ripple amount
  commissionRate: decimal("commission_rate", { precision: 5, scale: 4 }), // 0.05 for 5%
  rippleLevel: integer("ripple_level"), // For ripple rewards: 1, 2, 3, 4
  rippleAmount: integer("ripple_amount"), // Fixed amounts: 50, 100, 150, 700
  createdAt: timestamp("created_at").defaultNow(),
});

// Merchant commission and cashback tracking  
export const merchantTransactions = pgTable("merchant_transactions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  merchantId: varchar("merchant_id").notNull(),
  transactionType: text("transaction_type", { 
    enum: ["instant_cashback", "referral_commission", "royalty_pool_distribution", "point_purchase", "point_distribution"] 
  }).notNull(),
  amount: decimal("amount", { precision: 15, scale: 2 }).notNull(),
  pointsInvolved: integer("points_involved"),
  customerId: varchar("customer_id"), // For point distribution tracking
  referredMerchantId: varchar("referred_merchant_id"), // For merchant referral commissions
  cashbackRate: decimal("cashback_rate", { precision: 5, scale: 4 }), // 15% = 0.15
  commissionRate: decimal("commission_rate", { precision: 5, scale: 4 }), // 2% = 0.02
  royaltyPoolContribution: decimal("royalty_pool_contribution", { precision: 15, scale: 2 }), // 1%
  monthlyDistribution: boolean("monthly_distribution").default(false),
  distributionMonth: text("distribution_month"), // YYYY-MM format
  // Fraud prevention and audit fields
  originalTransactionId: varchar("original_transaction_id"), // Reference to the original transaction that triggered this commission
  auditId: varchar("audit_id"), // Reference to fraud prevention audit entry
  fraudCheckStatus: text("fraud_check_status", { enum: ["pending", "approved", "rejected", "flagged"] }).default("approved"),
  riskLevel: text("risk_level", { enum: ["low", "medium", "high"] }).default("low"),
  ipAddress: text("ip_address"), // IP address for security tracking
  userAgent: text("user_agent"), // User agent for security tracking
  description: text("description"), // Human readable description
  createdAt: timestamp("created_at").defaultNow(),
});

// QR code point transfers
export const qrTransfers = pgTable("qr_transfers", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  qrCode: varchar("qr_code").notNull().unique(),
  senderId: varchar("sender_id").notNull(),
  receiverId: varchar("receiver_id"),
  points: integer("points").notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  isUsed: boolean("is_used").notNull().default(false),
  usedAt: timestamp("used_at"),
  transferType: text("transfer_type", { enum: ["direct", "anonymous"] }).default("direct"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Admin configuration settings
export const adminSettings = pgTable("admin_settings", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  settingKey: text("setting_key").notNull().unique(),
  settingValue: jsonb("setting_value").notNull(),
  settingType: text("setting_type", { enum: ["number", "boolean", "string", "object"] }).notNull(),
  description: text("description"),
  category: text("category"), // thresholds, rates, percentages, limits
  isActive: boolean("is_active").notNull().default(true),
  lastUpdatedBy: varchar("last_updated_by"),
  updatedAt: timestamp("updated_at").defaultNow(),
  createdAt: timestamp("created_at").defaultNow(),
});

// System leaderboards
export const leaderboards = pgTable("leaderboards", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull(),
  userType: text("user_type", { enum: ["customer", "merchant"] }).notNull(),
  country: text("country").notNull(),
  totalPoints: integer("total_points").notNull().default(0),
  rewardNumbersCount: integer("reward_numbers_count").notNull().default(0),
  completedTiers: integer("completed_tiers").notNull().default(0),
  rank: integer("rank"),
  leaderboardType: text("leaderboard_type", { enum: ["global", "local"] }).notNull(),
  calculatedAt: timestamp("calculated_at").defaultNow(),
  createdAt: timestamp("created_at").defaultNow(),
});

// Insert schemas
export const insertUserSchema = createInsertSchema(users).omit({ id: true, createdAt: true });
export const insertAdminSchema = createInsertSchema(admins).omit({ id: true, createdAt: true });
export const insertChatMessageSchema = createInsertSchema(chatMessages).omit({ id: true, createdAt: true });
export const insertChatRoomSchema = createInsertSchema(chatRooms).omit({ id: true, createdAt: true });
export const insertConversationSchema = createInsertSchema(conversations).omit({ id: true, createdAt: true, updatedAt: true });
export const insertPointDistributionSchema = createInsertSchema(pointDistributions).omit({ id: true, createdAt: true });
export const insertCategorySchema = createInsertSchema(categories).omit({ id: true, createdAt: true });
export const insertBrandSchema = createInsertSchema(brands).omit({ id: true, createdAt: true });
export const insertProductSchema = createInsertSchema(products).omit({ id: true, createdAt: true });
export const insertMerchantSchema = createInsertSchema(merchants).omit({ id: true, createdAt: true });
export const insertCustomerSchema = createInsertSchema(customers).omit({ id: true, createdAt: true });
export const insertOrderSchema = createInsertSchema(orders).omit({ id: true, createdAt: true });
export const insertRewardTransactionSchema = createInsertSchema(rewardTransactions).omit({ id: true, createdAt: true });
export const insertRewardNumberSchema = createInsertSchema(rewardNumbers).omit({ id: true, createdAt: true });
export const insertCartItemSchema = createInsertSchema(cartItems).omit({ id: true, createdAt: true });
export const insertWishlistItemSchema = createInsertSchema(wishlistItems).omit({ id: true, createdAt: true });
export const insertReviewSchema = createInsertSchema(reviews).omit({ id: true, createdAt: true });


// New loyalty system insert schemas
export const insertUserWalletSchema = createInsertSchema(userWallets).omit({ id: true, createdAt: true, updatedAt: true });
export const insertPointTransactionSchema = createInsertSchema(pointTransactions).omit({ id: true, createdAt: true });
export const insertReferralSchema = createInsertSchema(referrals).omit({ id: true, createdAt: true });
export const insertCommissionTransactionSchema = createInsertSchema(commissionTransactions).omit({ id: true, createdAt: true });
export const insertMerchantTransactionSchema = createInsertSchema(merchantTransactions).omit({ id: true, createdAt: true });
export const insertQRTransferSchema = createInsertSchema(qrTransfers).omit({ id: true, createdAt: true });
export const insertAdminSettingSchema = createInsertSchema(adminSettings).omit({ id: true, createdAt: true, updatedAt: true });
export const insertLeaderboardSchema = createInsertSchema(leaderboards).omit({ id: true, createdAt: true });

// Enhanced reward system insert schemas
export const insertCustomerGlobalNumberSchema = createInsertSchema(customerGlobalNumbers).omit({ id: true, createdAt: true });
export const insertStepUpMilestoneSchema = createInsertSchema(stepUpMilestones).omit({ id: true, createdAt: true, awardedAt: true });
export const insertInfinityRewardCycleSchema = createInsertSchema(infinityRewardCycles).omit({ id: true, createdAt: true });
export const insertInfinityMerchantDistributionSchema = createInsertSchema(infinityMerchantDistributions).omit({ id: true, createdAt: true });

// Point generation requests (Local admin -> Global admin)
export const pointGenerationRequests = pgTable("point_generation_requests", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  requesterId: varchar("requester_id").notNull(), // local admin userId
  requesterCountry: text("requester_country"),
  pointsRequested: integer("points_requested").notNull(),
  reason: text("reason"),
  status: text("status", { enum: ["pending", "approved", "rejected"] }).notNull().default("pending"),
  reviewedBy: varchar("reviewed_by"), // global admin userId
  reviewedAt: timestamp("reviewed_at"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Types
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type Category = typeof categories.$inferSelect;
export type InsertCategory = z.infer<typeof insertCategorySchema>;
export type Brand = typeof brands.$inferSelect;
export type InsertBrand = z.infer<typeof insertBrandSchema>;
export type Product = typeof products.$inferSelect;
export type InsertProduct = z.infer<typeof insertProductSchema>;
export type Merchant = typeof merchants.$inferSelect;
export type InsertMerchant = z.infer<typeof insertMerchantSchema>;
export type Customer = typeof customers.$inferSelect;
export type InsertCustomer = z.infer<typeof insertCustomerSchema>;
export type Order = typeof orders.$inferSelect;
export type InsertOrder = z.infer<typeof insertOrderSchema>;
export type RewardTransaction = typeof rewardTransactions.$inferSelect;
export type InsertRewardTransaction = z.infer<typeof insertRewardTransactionSchema>;
export type RewardNumber = typeof rewardNumbers.$inferSelect;
export type InsertRewardNumber = z.infer<typeof insertRewardNumberSchema>;
export type CartItem = typeof cartItems.$inferSelect;
export type InsertCartItem = z.infer<typeof insertCartItemSchema>;
export type WishlistItem = typeof wishlistItems.$inferSelect;
export type InsertWishlistItem = z.infer<typeof insertWishlistItemSchema>;
export type Review = typeof reviews.$inferSelect;
export type InsertReview = z.infer<typeof insertReviewSchema>;
export type Admin = typeof admins.$inferSelect;
export type InsertAdmin = z.infer<typeof insertAdminSchema>;
export type ChatMessage = typeof chatMessages.$inferSelect;
export type InsertChatMessage = z.infer<typeof insertChatMessageSchema>;
export type ChatRoom = typeof chatRooms.$inferSelect;
export type InsertChatRoom = z.infer<typeof insertChatRoomSchema>;
export type Conversation = typeof conversations.$inferSelect;
export type InsertConversation = z.infer<typeof insertConversationSchema>;
export type PointDistribution = typeof pointDistributions.$inferSelect;
export type InsertPointDistribution = z.infer<typeof insertPointDistributionSchema>;

// New loyalty system types
export type UserWallet = typeof userWallets.$inferSelect;
export type InsertUserWallet = z.infer<typeof insertUserWalletSchema>;
export type PointTransaction = typeof pointTransactions.$inferSelect;
export type InsertPointTransaction = z.infer<typeof insertPointTransactionSchema>;
export type Referral = typeof referrals.$inferSelect;
export type InsertReferral = z.infer<typeof insertReferralSchema>;
export type CommissionTransaction = typeof commissionTransactions.$inferSelect;
export type InsertCommissionTransaction = z.infer<typeof insertCommissionTransactionSchema>;
export type MerchantTransaction = typeof merchantTransactions.$inferSelect;
export type InsertMerchantTransaction = z.infer<typeof insertMerchantTransactionSchema>;
export type QRTransfer = typeof qrTransfers.$inferSelect;
export type InsertQRTransfer = z.infer<typeof insertQRTransferSchema>;

// Enhanced reward system types
export type CustomerGlobalNumber = typeof customerGlobalNumbers.$inferSelect;
export type InsertCustomerGlobalNumber = z.infer<typeof insertCustomerGlobalNumberSchema>;
export type StepUpMilestone = typeof stepUpMilestones.$inferSelect;
export type InsertStepUpMilestone = z.infer<typeof insertStepUpMilestoneSchema>;
export type InfinityRewardCycle = typeof infinityRewardCycles.$inferSelect;
export type InsertInfinityRewardCycle = z.infer<typeof insertInfinityRewardCycleSchema>;
export type InfinityMerchantDistribution = typeof infinityMerchantDistributions.$inferSelect;
export type InsertInfinityMerchantDistribution = z.infer<typeof insertInfinityMerchantDistributionSchema>;
// Merchant Wallet System - Three comprehensive wallets
export const merchantWallets = pgTable("merchant_wallets", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  merchantId: varchar("merchant_id").notNull().unique(),
  // Reward Point Wallet - for issuing points to customers
  rewardPointBalance: integer("reward_point_balance").notNull().default(0),
  totalPointsIssued: integer("total_points_issued").notNull().default(0),
  // Income Wallet - three types of income
  incomeWalletBalance: decimal("income_wallet_balance", { precision: 10, scale: 2 }).notNull().default("0.00"),
  cashbackIncome: decimal("cashback_income", { precision: 10, scale: 2 }).notNull().default("0.00"), // 15% cashback on 1500 Taka discount
  referralIncome: decimal("referral_income", { precision: 10, scale: 2 }).notNull().default("0.00"), // 2% cashback per 1000 Taka referral
  royaltyIncome: decimal("royalty_income", { precision: 10, scale: 2 }).notNull().default("0.00"), // 1% of total sales distributed monthly
  // Commerce Wallet - full MFS functionality
  commerceWalletBalance: decimal("commerce_wallet_balance", { precision: 10, scale: 2 }).notNull().default("0.00"),
  totalDeposited: decimal("total_deposited", { precision: 10, scale: 2 }).notNull().default("0.00"),
  totalWithdrawn: decimal("total_withdrawn", { precision: 10, scale: 2 }).notNull().default("0.00"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Wallet Transactions - detailed transaction history
export const walletTransactions = pgTable("wallet_transactions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  merchantId: varchar("merchant_id").notNull(),
  walletType: text("wallet_type", { enum: ["reward_point", "income", "commerce"] }).notNull(),
  transactionType: text("transaction_type", { enum: ["deposit", "withdrawal", "transfer", "income", "expense", "vat_service_charge"] }).notNull(),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  points: integer("points").default(0),
  description: text("description"),
  referenceId: varchar("reference_id"), // Reference to related transaction
  vatAmount: decimal("vat_amount", { precision: 10, scale: 2 }).default("0.00"), // 12.5% VAT and service charge
  balanceAfter: decimal("balance_after", { precision: 10, scale: 2 }).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

// Merchant Income Types - detailed income tracking
export const merchantIncome = pgTable("merchant_income", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  merchantId: varchar("merchant_id").notNull(),
  incomeType: text("income_type", { enum: ["cashback_15_percent", "referral_2_percent", "royalty_1_percent"] }).notNull(),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  sourceAmount: decimal("source_amount", { precision: 10, scale: 2 }).notNull(), // Original amount that generated this income
  description: text("description"),
  referenceId: varchar("reference_id"), // Reference to sale, referral, etc.
  createdAt: timestamp("created_at").defaultNow(),
});

// Merchant Referral System
export const merchantReferrals = pgTable("merchant_referrals", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  referrerMerchantId: varchar("referrer_merchant_id").notNull(),
  referredMerchantId: varchar("referred_merchant_id").notNull(),
  referralCode: text("referral_code").notNull(),
  commissionEarned: decimal("commission_earned", { precision: 10, scale: 2 }).notNull().default("0.00"),
  totalSales: decimal("total_sales", { precision: 10, scale: 2 }).notNull().default("0.00"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

// ==================== COMPREHENSIVE MERCHANT CASHBACK SYSTEM ====================

// Merchant Cashback Transactions - unified tracking for all 5 cashback types
export const merchantCashbackTransactions = pgTable("merchant_cashback_transactions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  merchantId: varchar("merchant_id").notNull(),
  cashbackType: text("cashback_type", { 
    enum: ["instant_10_percent", "affiliate_2_percent", "monthly_1_percent", "shopping_voucher", "incentive_club_rank"] 
  }).notNull(),
  amount: decimal("amount", { precision: 15, scale: 2 }).notNull(),
  points: integer("points").default(0), // For point-based cashback
  sourceTransactionId: varchar("source_transaction_id"), // Original transaction that triggered cashback
  sourceAmount: decimal("source_amount", { precision: 15, scale: 2 }), // Original amount that generated cashback
  description: text("description"),
  metadata: jsonb("metadata"), // Additional data (e.g., rank details, referral info)
  status: text("status", { enum: ["pending", "completed", "failed", "cancelled"] }).notNull().default("completed"),
  processedAt: timestamp("processed_at").defaultNow(),
  createdAt: timestamp("created_at").defaultNow(),
});

// Monthly Cashback Distributions - 1% of platform total distributed proportionally
export const monthlyCashbackDistributions = pgTable("monthly_cashback_distributions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  month: text("month").notNull(), // YYYY-MM format
  year: integer("year").notNull(),
  totalPlatformPoints: integer("total_platform_points").notNull(), // Total points distributed platform-wide
  distributionAmount: decimal("distribution_amount", { precision: 15, scale: 2 }).notNull(), // 1% of total
  eligibleMerchants: integer("eligible_merchants").notNull(), // Count of active merchants
  totalDistributed: decimal("total_distributed", { precision: 15, scale: 2 }).notNull(),
  status: text("status", { enum: ["pending", "processing", "completed", "failed"] }).notNull().default("pending"),
  distributedAt: timestamp("distributed_at"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Monthly Cashback Distribution Details - per-merchant breakdown
export const monthlyCashbackDistributionDetails = pgTable("monthly_cashback_distribution_details", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  distributionId: varchar("distribution_id").notNull(), // FK to monthlyCashbackDistributions
  merchantId: varchar("merchant_id").notNull(),
  pointsDistributed: integer("points_distributed").notNull(), // Points this merchant distributed in the month
  activityRatio: decimal("activity_ratio", { precision: 10, scale: 8 }).notNull(), // Merchant's share as decimal (e.g., 0.05 for 5%)
  cashbackAmount: decimal("cashback_amount", { precision: 15, scale: 2 }).notNull(), // Proportional share
  status: text("status", { enum: ["pending", "completed", "failed"] }).notNull().default("pending"),
  processedAt: timestamp("processed_at"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Shopping Voucher Distributions - 6000 points from customer 30k rewards shared with merchants
export const shoppingVoucherDistributions = pgTable("shopping_voucher_distributions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  customerId: varchar("customer_id").notNull(), // Customer who reached 30k points
  customerInfinityCycleId: varchar("customer_infinity_cycle_id"), // Reference to infinity cycle
  totalVoucherValue: integer("total_voucher_value").notNull().default(6000), // 6000 points total
  merchantSharePoints: integer("merchant_share_points").notNull(), // Points allocated for merchant revenue sharing
  cashOutStatus: text("cash_out_status", { enum: ["pending", "requested", "approved", "rejected", "paid"] }).notNull().default("pending"),
  requestedAmount: decimal("requested_amount", { precision: 10, scale: 2 }),
  approvedAmount: decimal("approved_amount", { precision: 10, scale: 2 }),
  merchantId: varchar("merchant_id"), // Merchant who requests cash-out
  requestedAt: timestamp("requested_at"),
  approvedAt: timestamp("approved_at"),
  approvedBy: varchar("approved_by"), // Admin ID who approved
  paidAt: timestamp("paid_at"),
  rejectionReason: text("rejection_reason"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Merchant Rank History - track rank changes and achievements
export const merchantRankHistory = pgTable("merchant_rank_history", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  merchantId: varchar("merchant_id").notNull(),
  previousRank: text("previous_rank"),
  newRank: text("new_rank").notNull(), // bronze, silver, gold, platinum, diamond
  rankUpgraded: boolean("rank_upgraded").notNull().default(true), // True if upgrade, false if downgrade
  achievementData: jsonb("achievement_data"), // Snapshot of conditions met (points, sales, referrals, etc.)
  bonusAwarded: decimal("bonus_awarded", { precision: 15, scale: 2 }).default("0.00"), // Bonus given for rank
  evaluationDate: timestamp("evaluation_date").defaultNow(),
  createdAt: timestamp("created_at").defaultNow(),
});

// Merchant Rank Conditions - dynamic configuration by global admin
export const merchantRankConditions = pgTable("merchant_rank_conditions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  rank: text("rank").notNull().unique(), // bronze, silver, gold, platinum, diamond
  displayName: text("display_name").notNull(),
  minPointsDistributed: integer("min_points_distributed").notNull(), // Minimum points distributed requirement
  minTotalSales: decimal("min_total_sales", { precision: 15, scale: 2 }).notNull(), // Minimum sales requirement
  minReferrals: integer("min_referrals").default(0), // Minimum referred merchants
  minMonthsActive: integer("min_months_active").default(0), // Minimum months of active participation
  globalSalesBonusPercent: decimal("global_sales_bonus_percent", { precision: 5, scale: 2 }).notNull(), // % of global sales as bonus
  description: text("description"),
  benefits: jsonb("benefits"), // Array of benefit descriptions
  isActive: boolean("is_active").notNull().default(true),
  updatedBy: varchar("updated_by"), // Admin ID who last updated
  updatedAt: timestamp("updated_at").defaultNow(),
  createdAt: timestamp("created_at").defaultNow(),
});

// Shopping Voucher Cash-Out Requests - merchant requests to cash out voucher revenue share
export const voucherCashOutRequests = pgTable("voucher_cash_out_requests", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  merchantId: varchar("merchant_id").notNull(),
  requestedAmount: decimal("requested_amount", { precision: 10, scale: 2 }).notNull(),
  availableBalance: decimal("available_balance", { precision: 10, scale: 2 }).notNull(), // Balance at time of request
  status: text("status", { enum: ["pending", "approved", "rejected", "paid"] }).notNull().default("pending"),
  paymentMethod: text("payment_method"), // bank_transfer, mobile_money, etc.
  paymentDetails: jsonb("payment_details"), // Account details
  approvedAmount: decimal("approved_amount", { precision: 10, scale: 2 }),
  approvedBy: varchar("approved_by"), // Admin ID
  approvedAt: timestamp("approved_at"),
  rejectionReason: text("rejection_reason"),
  paidAt: timestamp("paid_at"),
  paymentReference: text("payment_reference"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Monthly Royalty Distribution
export const royaltyDistributions = pgTable("royalty_distributions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  month: text("month").notNull(), // YYYY-MM format
  year: integer("year").notNull(),
  totalSales: decimal("total_sales", { precision: 15, scale: 2 }).notNull(),
  totalMerchants: integer("total_merchants").notNull(),
  royaltyPerMerchant: decimal("royalty_per_merchant", { precision: 10, scale: 2 }).notNull(),
  totalDistributed: decimal("total_distributed", { precision: 15, scale: 2 }).notNull(),
  isDistributed: boolean("is_distributed").notNull().default(false),
  distributedAt: timestamp("distributed_at"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Merchant Shop/Marketplace
export const merchantShops = pgTable("merchant_shops", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  merchantId: varchar("merchant_id").notNull().unique(),
  shopName: text("shop_name").notNull(),
  shopUrl: text("shop_url").notNull().unique(),
  bannerImage: text("banner_image"),
  description: text("description"),
  isActive: boolean("is_active").notNull().default(true),
  platformFee: decimal("platform_fee", { precision: 5, scale: 2 }).notNull().default("0.00"), // 0% for KOMARCE
  marketingPromotion: boolean("marketing_promotion").notNull().default(false),
  rewardPointsOffered: integer("reward_points_offered").notNull().default(0),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Point Recharge Methods
export const pointRecharges = pgTable("point_recharges", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  merchantId: varchar("merchant_id").notNull(),
  rechargeMethod: text("recharge_method", { enum: ["direct_cash", "bank_transfer", "mobile_transfer", "automatic_payment_gateway"] }).notNull(),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  points: integer("points").notNull(),
  status: text("status", { enum: ["pending", "completed", "failed", "cancelled"] }).notNull().default("pending"),
  paymentReference: text("payment_reference"), // Bank reference, mobile transaction ID, etc.
  paymentGatewayResponse: jsonb("payment_gateway_response"), // For automatic payments
  description: text("description"),
  processedAt: timestamp("processed_at"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Product Sales with Mandatory Discounts
export const productSales = pgTable("product_sales", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  merchantId: varchar("merchant_id").notNull(),
  customerId: varchar("customer_id").notNull(),
  productId: varchar("product_id").notNull(),
  quantity: integer("quantity").notNull(),
  unitPrice: decimal("unit_price", { precision: 10, scale: 2 }).notNull(),
  totalAmount: decimal("total_amount", { precision: 10, scale: 2 }).notNull(),
  // Mandatory discount fields
  rewardPointsGiven: integer("reward_points_given").notNull().default(0),
  cashDiscount: decimal("cash_discount", { precision: 10, scale: 2 }).notNull().default("0.00"),
  finalAmount: decimal("final_amount", { precision: 10, scale: 2 }).notNull(),
  // Distribution method
  distributionMethod: text("distribution_method", { enum: ["manual", "automatic_percentage", "automatic_fixed"] }).notNull(),
  distributionValue: decimal("distribution_value", { precision: 10, scale: 2 }), // Percentage or fixed amount
  createdAt: timestamp("created_at").defaultNow(),
});

// Merchant Activity Tracking
export const merchantActivity = pgTable("merchant_activity", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  merchantId: varchar("merchant_id").notNull(),
  month: text("month").notNull(), // YYYY-MM format
  year: integer("year").notNull(),
  pointsDistributed: integer("points_distributed").notNull().default(0),
  requiredPoints: integer("required_points").notNull().default(1000), // 1000, 2000, or 5000
  isActive: boolean("is_active").notNull().default(true),
  activityStatus: text("activity_status", { enum: ["active", "warning", "inactive"] }).notNull().default("active"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// E-Merchant Product Pricing
export const emerchantProducts = pgTable("emerchant_products", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  merchantId: varchar("merchant_id").notNull(),
  productId: varchar("product_id").notNull(),
  dealerPrice: decimal("dealer_price", { precision: 10, scale: 2 }).notNull(), // DP
  tradePrice: decimal("trade_price", { precision: 10, scale: 2 }).notNull(), // TP
  mrp: decimal("mrp", { precision: 10, scale: 2 }).notNull(), // Maximum Retail Price
  profitMargin: decimal("profit_margin", { precision: 5, scale: 2 }).notNull().default("0.00"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Product Review Settings
export const productReviewSettings = pgTable("product_review_settings", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  merchantId: varchar("merchant_id").notNull(),
  productId: varchar("product_id").notNull(),
  reviewsEnabled: boolean("reviews_enabled").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Point Distribution Reports
export const pointDistributionReports = pgTable("point_distribution_reports", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  merchantId: varchar("merchant_id").notNull(),
  reportType: text("report_type", { enum: ["product_wise", "supplier_wise", "customer_wise", "monthly_summary"] }).notNull(),
  period: text("period").notNull(), // YYYY-MM or date range
  totalPointsDistributed: integer("total_points_distributed").notNull().default(0),
  totalSales: decimal("total_sales", { precision: 10, scale: 2 }).notNull().default("0.00"),
  reportData: jsonb("report_data").notNull(), // Detailed breakdown
  generatedAt: timestamp("generated_at").defaultNow(),
});

export type AdminSetting = typeof adminSettings.$inferSelect;
export type InsertAdminSetting = z.infer<typeof insertAdminSettingSchema>;
export type Leaderboard = typeof leaderboards.$inferSelect;
export type InsertLeaderboard = z.infer<typeof insertLeaderboardSchema>;

// Point generation request types
export type PointGenerationRequest = typeof pointGenerationRequests.$inferSelect;
export const insertPointGenerationRequestSchema = createInsertSchema(pointGenerationRequests).omit({ id: true, createdAt: true });
export type InsertPointGenerationRequest = z.infer<typeof insertPointGenerationRequestSchema>;

// Merchant wallet system types
export type MerchantWallet = typeof merchantWallets.$inferSelect;
export const insertMerchantWalletSchema = createInsertSchema(merchantWallets).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertMerchantWallet = z.infer<typeof insertMerchantWalletSchema>;

export type WalletTransaction = typeof walletTransactions.$inferSelect;
export const insertWalletTransactionSchema = createInsertSchema(walletTransactions).omit({ id: true, createdAt: true });
export type InsertWalletTransaction = z.infer<typeof insertWalletTransactionSchema>;

export type MerchantIncome = typeof merchantIncome.$inferSelect;
export const insertMerchantIncomeSchema = createInsertSchema(merchantIncome).omit({ id: true, createdAt: true });
export type InsertMerchantIncome = z.infer<typeof insertMerchantIncomeSchema>;

export type MerchantReferral = typeof merchantReferrals.$inferSelect;
export const insertMerchantReferralSchema = createInsertSchema(merchantReferrals).omit({ id: true, createdAt: true });
export type InsertMerchantReferral = z.infer<typeof insertMerchantReferralSchema>;

export type RoyaltyDistribution = typeof royaltyDistributions.$inferSelect;
export const insertRoyaltyDistributionSchema = createInsertSchema(royaltyDistributions).omit({ id: true, createdAt: true });
export type InsertRoyaltyDistribution = z.infer<typeof insertRoyaltyDistributionSchema>;

export type MerchantShop = typeof merchantShops.$inferSelect;
export const insertMerchantShopSchema = createInsertSchema(merchantShops).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertMerchantShop = z.infer<typeof insertMerchantShopSchema>;

// New table types
export type PointRecharge = typeof pointRecharges.$inferSelect;
export const insertPointRechargeSchema = createInsertSchema(pointRecharges).omit({ id: true, createdAt: true });
export type InsertPointRecharge = z.infer<typeof insertPointRechargeSchema>;

export type ProductSale = typeof productSales.$inferSelect;
export const insertProductSaleSchema = createInsertSchema(productSales).omit({ id: true, createdAt: true });
export type InsertProductSale = z.infer<typeof insertProductSaleSchema>;

export type MerchantActivity = typeof merchantActivity.$inferSelect;
export const insertMerchantActivitySchema = createInsertSchema(merchantActivity).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertMerchantActivity = z.infer<typeof insertMerchantActivitySchema>;

export type EMerchantProduct = typeof emerchantProducts.$inferSelect;
export const insertEMerchantProductSchema = createInsertSchema(emerchantProducts).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertEMerchantProduct = z.infer<typeof insertEMerchantProductSchema>;

export type ProductReviewSetting = typeof productReviewSettings.$inferSelect;
export const insertProductReviewSettingSchema = createInsertSchema(productReviewSettings).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertProductReviewSetting = z.infer<typeof insertProductReviewSettingSchema>;

export type PointDistributionReport = typeof pointDistributionReports.$inferSelect;
export const insertPointDistributionReportSchema = createInsertSchema(pointDistributionReports).omit({ id: true, generatedAt: true });
export type InsertPointDistributionReport = z.infer<typeof insertPointDistributionReportSchema>;

// Customer Portal Features
export const customerProfiles = pgTable("customer_profiles", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().unique(),
  uniqueAccountNumber: varchar("unique_account_number").notNull().unique(),
  mobileNumber: varchar("mobile_number").notNull().unique(),
  email: varchar("email").notNull(),
  fullName: text("full_name").notNull(),
  fathersName: text("fathers_name"),
  mothersName: text("mothers_name"),
  nidNumber: varchar("nid_number"),
  passportNumber: varchar("passport_number"),
  bloodGroup: varchar("blood_group"),
  nomineeDetails: jsonb("nominee_details"), // JSON object with nominee information
  profileComplete: boolean("profile_complete").notNull().default(false),
  qrCode: text("qr_code"), // QR code data for point transfers
  globalSerialNumber: integer("global_serial_number"),
  localSerialNumber: integer("local_serial_number"),
  totalPointsEarned: integer("total_points_earned").notNull().default(0),
  currentPointsBalance: integer("current_points_balance").notNull().default(0),
  accumulatedPoints: integer("accumulated_points").notNull().default(0), // Points accumulating towards Global Number
  globalRewardNumbers: integer("global_reward_numbers").notNull().default(0), // Count of global numbers earned
  tier: text("tier", { enum: ["bronze", "silver", "gold", "platinum"] }).notNull().default("bronze"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Customer Point Transactions
export const customerPointTransactions = pgTable("customer_point_transactions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  customerId: varchar("customer_id").notNull(),
  merchantId: varchar("merchant_id").notNull(),
  transactionType: text("transaction_type", { enum: ["earned", "spent", "transferred_in", "transferred_out", "reward"] }).notNull(),
  points: integer("points").notNull(),
  balanceBefore: integer("balance_before").notNull(),
  balanceAfter: integer("balance_after").notNull(),
  description: text("description").notNull(),
  referenceId: varchar("reference_id"), // Reference to purchase, transfer, etc.
  metadata: jsonb("metadata"), // Additional transaction data
  createdAt: timestamp("created_at").defaultNow(),
});

// Customer Serial Number Tracking
export const customerSerialNumbers = pgTable("customer_serial_numbers", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  customerId: varchar("customer_id").notNull().unique(),
  globalSerialNumber: integer("global_serial_number").notNull().unique(),
  localSerialNumber: integer("local_serial_number"),
  totalSerialCount: integer("total_serial_count").notNull(),
  pointsAtSerial: integer("points_at_serial").notNull().default(1500),
  isActive: boolean("is_active").notNull().default(true),
  assignedAt: timestamp("assigned_at").defaultNow(),
});

// Customer OTP Verification
export const customerOTPs = pgTable("customer_otps", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  customerId: varchar("customer_id").notNull(),
  otpCode: varchar("otp_code").notNull(),
  otpType: text("otp_type", { enum: ["password_recovery", "email_verification", "mobile_verification"] }).notNull(),
  deliveryMethod: text("delivery_method", { enum: ["mobile", "email"] }).notNull(),
  isUsed: boolean("is_used").notNull().default(false),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

// Customer Point Transfers
export const customerPointTransfers = pgTable("customer_point_transfers", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  fromCustomerId: varchar("from_customer_id").notNull(),
  toCustomerId: varchar("to_customer_id").notNull(),
  points: integer("points").notNull(),
  transferMethod: text("transfer_method", { enum: ["qr_scan", "mobile_number", "account_number"] }).notNull(),
  status: text("status", { enum: ["pending", "completed", "failed", "cancelled"] }).notNull().default("pending"),
  description: text("description"),
  createdAt: timestamp("created_at").defaultNow(),
  completedAt: timestamp("completed_at"),
});

// Customer Purchase History
export const customerPurchases = pgTable("customer_purchases", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  customerId: varchar("customer_id").notNull(),
  merchantId: varchar("merchant_id").notNull(),
  productId: varchar("product_id").notNull(),
  quantity: integer("quantity").notNull(),
  unitPrice: decimal("unit_price", { precision: 10, scale: 2 }).notNull(),
  totalAmount: decimal("total_amount", { precision: 10, scale: 2 }).notNull(),
  pointsEarned: integer("points_earned").notNull().default(0),
  cashDiscount: decimal("cash_discount", { precision: 10, scale: 2 }).notNull().default("0.00"),
  finalAmount: decimal("final_amount", { precision: 10, scale: 2 }).notNull(),
  purchaseDate: timestamp("purchase_date").defaultNow(),
});

// Customer Wallets - Three Wallet System
export const customerWallets = pgTable("customer_wallets", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  customerId: varchar("customer_id").notNull().unique(),
  
  // Reward Point Wallet
  rewardPointBalance: integer("reward_point_balance").notNull().default(0),
  totalRewardPointsEarned: integer("total_reward_points_earned").notNull().default(0),
  totalRewardPointsSpent: integer("total_reward_points_spent").notNull().default(0),
  totalRewardPointsTransferred: integer("total_reward_points_transferred").notNull().default(0),
  
  // Income Wallet
  incomeBalance: decimal("income_balance", { precision: 10, scale: 2 }).notNull().default("0.00"),
  totalIncomeEarned: decimal("total_income_earned", { precision: 10, scale: 2 }).notNull().default("0.00"),
  totalIncomeSpent: decimal("total_income_spent", { precision: 10, scale: 2 }).notNull().default("0.00"),
  totalIncomeTransferred: decimal("total_income_transferred", { precision: 10, scale: 2 }).notNull().default("0.00"),
  
  // Commerce Wallet (MFS)
  commerceBalance: decimal("commerce_balance", { precision: 10, scale: 2 }).notNull().default("0.00"),
  totalCommerceAdded: decimal("total_commerce_added", { precision: 10, scale: 2 }).notNull().default("0.00"),
  totalCommerceSpent: decimal("total_commerce_spent", { precision: 10, scale: 2 }).notNull().default("0.00"),
  totalCommerceWithdrawn: decimal("total_commerce_withdrawn", { precision: 10, scale: 2 }).notNull().default("0.00"),
  
  lastTransactionAt: timestamp("last_transaction_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Customer types
export type CustomerProfile = typeof customerProfiles.$inferSelect;
export const insertCustomerProfileSchema = createInsertSchema(customerProfiles).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertCustomerProfile = z.infer<typeof insertCustomerProfileSchema>;

export type CustomerPointTransaction = typeof customerPointTransactions.$inferSelect;
export const insertCustomerPointTransactionSchema = createInsertSchema(customerPointTransactions).omit({ id: true, createdAt: true });
export type InsertCustomerPointTransaction = z.infer<typeof insertCustomerPointTransactionSchema>;

export type CustomerSerialNumber = typeof customerSerialNumbers.$inferSelect;
export const insertCustomerSerialNumberSchema = createInsertSchema(customerSerialNumbers).omit({ id: true, assignedAt: true });
export type InsertCustomerSerialNumber = z.infer<typeof insertCustomerSerialNumberSchema>;

export type CustomerOTP = typeof customerOTPs.$inferSelect;
export const insertCustomerOTPSchema = createInsertSchema(customerOTPs).omit({ id: true, createdAt: true });
export type InsertCustomerOTP = z.infer<typeof insertCustomerOTPSchema>;

export type CustomerPointTransfer = typeof customerPointTransfers.$inferSelect;
export const insertCustomerPointTransferSchema = createInsertSchema(customerPointTransfers).omit({ id: true, createdAt: true });
export type InsertCustomerPointTransfer = z.infer<typeof insertCustomerPointTransferSchema>;

// Merchant Customers table (for merchant-specific customer management)
export const merchantCustomers = pgTable("merchant_customers", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  merchantId: varchar("merchant_id").notNull(),
  customerId: varchar("customer_id").notNull(),
  customerName: text("customer_name").notNull(),
  customerEmail: text("customer_email").notNull(),
  customerMobile: text("customer_mobile").notNull(),
  accountNumber: text("account_number").notNull(),
  totalPointsEarned: integer("total_points_earned").notNull().default(0),
  currentPointsBalance: integer("current_points_balance").notNull().default(0),
  tier: text("tier", { enum: ["bronze", "silver", "gold", "platinum"] }).notNull().default("bronze"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export type MerchantCustomer = typeof merchantCustomers.$inferSelect;
export const insertMerchantCustomerSchema = createInsertSchema(merchantCustomers).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertMerchantCustomer = z.infer<typeof insertMerchantCustomerSchema>;

// Blocked Customers table (for tracking customers blocked by merchants)
export const blockedCustomers = pgTable("blocked_customers", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  merchantId: varchar("merchant_id").notNull(),
  customerId: varchar("customer_id").notNull(),
  customerName: text("customer_name").notNull(),
  customerEmail: text("customer_email"),
  customerMobile: text("customer_mobile").notNull(),
  accountNumber: text("account_number").notNull(),
  reason: text("reason").default("Deleted by merchant"),
  blockedAt: timestamp("blocked_at").defaultNow(),
  createdAt: timestamp("created_at").defaultNow(),
});

export type BlockedCustomer = typeof blockedCustomers.$inferSelect;
export const insertBlockedCustomerSchema = createInsertSchema(blockedCustomers).omit({ id: true, createdAt: true, blockedAt: true });
export type InsertBlockedCustomer = z.infer<typeof insertBlockedCustomerSchema>;

export type CustomerPurchase = typeof customerPurchases.$inferSelect;
export const insertCustomerPurchaseSchema = createInsertSchema(customerPurchases).omit({ id: true, purchaseDate: true });
export type InsertCustomerPurchase = z.infer<typeof insertCustomerPurchaseSchema>;

export type CustomerWallet = typeof customerWallets.$inferSelect;
export const insertCustomerWalletSchema = createInsertSchema(customerWallets).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertCustomerWallet = z.infer<typeof insertCustomerWalletSchema>;

// Advanced Customer Reward System
export const customerRewards = pgTable("customer_rewards", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  customerId: varchar("customer_id").notNull(),
  rewardType: text("reward_type", { enum: ["global_serial", "local_serial", "birthday", "daily_login", "referral_commission"] }).notNull(),
  rewardStep: integer("reward_step"), // 1, 2, 3, 4 for serial rewards
  pointsAwarded: integer("points_awarded").notNull(),
  cashValue: decimal("cash_value", { precision: 10, scale: 2 }), // BDT value
  multiplier: integer("multiplier"), // 6x, 30x, 120x, 480x for global; 5x, 20x, 60x, 180x for local
  serialNumber: integer("serial_number"), // Global or local serial number
  status: text("status", { enum: ["pending", "awarded", "distributed", "cancelled"] }).notNull().default("pending"),
  distributionDetails: jsonb("distribution_details"), // Details of how reward was distributed
  createdAt: timestamp("created_at").defaultNow(),
  awardedAt: timestamp("awarded_at"),
  distributedAt: timestamp("distributed_at"),
});

// Customer Affiliate Links
export const customerAffiliateLinks = pgTable("customer_affiliate_links", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  customerId: varchar("customer_id").notNull().unique(),
  affiliateCode: varchar("affiliate_code").notNull().unique(),
  affiliateUrl: text("affiliate_url").notNull(),
  totalClicks: integer("total_clicks").notNull().default(0),
  totalRegistrations: integer("total_registrations").notNull().default(0),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Customer Referrals
export const customerReferrals = pgTable("customer_referrals", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  referrerId: varchar("referrer_id").notNull(),
  referredId: varchar("referred_id").notNull(),
  referralCode: varchar("referral_code").notNull(),
  commissionRate: decimal("commission_rate", { precision: 5, scale: 2 }).notNull().default("5.00"), // 5%
  totalCommissionEarned: decimal("total_commission_earned", { precision: 10, scale: 2 }).notNull().default("0.00"),
  totalPointsEarned: integer("total_points_earned").notNull().default(0),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Customer Daily Login Points
export const customerDailyLogins = pgTable("customer_daily_logins", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  customerId: varchar("customer_id").notNull(),
  loginDate: timestamp("login_date").notNull(),
  pointsAwarded: integer("points_awarded").notNull(),
  streakCount: integer("streak_count").notNull().default(1),
  isBonusDay: boolean("is_bonus_day").notNull().default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

// Customer Birthday Points
export const customerBirthdayPoints = pgTable("customer_birthday_points", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  customerId: varchar("customer_id").notNull(),
  birthYear: integer("birth_year").notNull(),
  pointsAwarded: integer("points_awarded").notNull(),
  awardedAt: timestamp("awarded_at").defaultNow(),
  createdAt: timestamp("created_at").defaultNow(),
});

// Shopping Vouchers (for merchant distribution)
export const shoppingVouchers = pgTable("shopping_vouchers", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  customerId: varchar("customer_id").notNull(),
  merchantId: varchar("merchant_id").notNull(),
  voucherCode: varchar("voucher_code").notNull().unique(),
  voucherValue: decimal("voucher_value", { precision: 10, scale: 2 }).notNull(),
  originalRewardId: varchar("original_reward_id").notNull(), // Reference to customer_rewards
  status: text("status", { enum: ["active", "used", "expired"] }).notNull().default("active"),
  expiresAt: timestamp("expires_at").notNull(),
  usedAt: timestamp("used_at"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Serial Number Activation Queue
export const serialActivationQueue = pgTable("serial_activation_queue", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  customerId: varchar("customer_id").notNull(),
  serialType: text("serial_type", { enum: ["global", "local"] }).notNull(),
  pointsUsed: integer("points_used").notNull().default(6000), // 6000 discount points
  status: text("status", { enum: ["pending", "activated", "failed"] }).notNull().default("pending"),
  activatedAt: timestamp("activated_at"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Customer Wallet Transactions (for all three wallets)
export const customerWalletTransactions = pgTable("customer_wallet_transactions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  customerId: varchar("customer_id").notNull(),
  walletType: text("wallet_type", { enum: ["reward_point", "income", "commerce"] }).notNull(),
  transactionType: text("transaction_type", { enum: ["credit", "debit", "transfer_in", "transfer_out"] }).notNull(),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  balanceAfter: decimal("balance_after", { precision: 10, scale: 2 }).notNull(),
  description: text("description").notNull(),
  referenceId: varchar("reference_id"), // Reference to source transaction
  metadata: jsonb("metadata"), // Additional transaction details
  createdAt: timestamp("created_at").defaultNow(),
});

// Customer Wallet Transfers (between wallets)
export const customerWalletTransfers = pgTable("customer_wallet_transfers", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  customerId: varchar("customer_id").notNull(),
  fromWallet: text("from_wallet", { enum: ["reward_point", "income", "commerce"] }).notNull(),
  toWallet: text("to_wallet", { enum: ["reward_point", "income", "commerce"] }).notNull(),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  vatServiceCharge: decimal("vat_service_charge", { precision: 10, scale: 2 }).notNull().default("0.00"),
  netAmount: decimal("net_amount", { precision: 10, scale: 2 }).notNull(),
  status: text("status", { enum: ["pending", "completed", "failed", "cancelled"] }).notNull().default("pending"),
  description: text("description"),
  createdAt: timestamp("created_at").defaultNow(),
  completedAt: timestamp("completed_at"),
});

// Enhanced Referral Commission Structure
export const customerReferralCommissions = pgTable("customer_referral_commissions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  referrerId: varchar("referrer_id").notNull(),
  referredId: varchar("referred_id").notNull(),
  commissionStep: integer("commission_step").notNull(), // 1, 2, 3, 4
  commissionAmount: decimal("commission_amount", { precision: 10, scale: 2 }).notNull(), // 50, 100, 150, 700
  commissionType: text("commission_type", { enum: ["serial_reward", "affiliation", "other"] }).notNull(),
  originalRewardId: varchar("original_reward_id"), // Reference to the original reward
  status: text("status", { enum: ["pending", "awarded", "cancelled"] }).notNull().default("pending"),
  awardedAt: timestamp("awarded_at"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Company as Default Referrer
export const companyReferrer = pgTable("company_referrer", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  customerId: varchar("customer_id").notNull().unique(),
  isCompanyReferrer: boolean("is_company_referrer").notNull().default(true),
  assignedAt: timestamp("assigned_at").defaultNow(),
  createdAt: timestamp("created_at").defaultNow(),
});

// Waste Management Rewards
export const wasteManagementRewards = pgTable("waste_management_rewards", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  customerId: varchar("customer_id").notNull(),
  wasteType: text("waste_type").notNull(),
  quantity: decimal("quantity", { precision: 10, scale: 2 }).notNull(),
  pointsAwarded: integer("points_awarded").notNull(),
  rewardRate: decimal("reward_rate", { precision: 10, scale: 2 }).notNull(), // Points per unit
  status: text("status", { enum: ["pending", "awarded", "cancelled"] }).notNull().default("pending"),
  awardedAt: timestamp("awarded_at"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Medical Facility Benefits
export const medicalFacilityBenefits = pgTable("medical_facility_benefits", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  customerId: varchar("customer_id").notNull(),
  benefitType: text("benefit_type").notNull(), // consultation, medicine, treatment, etc.
  benefitAmount: decimal("benefit_amount", { precision: 10, scale: 2 }).notNull(),
  facilityName: text("facility_name").notNull(),
  facilityType: text("facility_type").notNull(), // hospital, clinic, pharmacy, etc.
  status: text("status", { enum: ["available", "used", "expired"] }).notNull().default("available"),
  usedAt: timestamp("used_at"),
  expiresAt: timestamp("expires_at"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Customer Reward types
export type CustomerReward = typeof customerRewards.$inferSelect;
export const insertCustomerRewardSchema = createInsertSchema(customerRewards).omit({ id: true, createdAt: true, awardedAt: true, distributedAt: true });
export type InsertCustomerReward = z.infer<typeof insertCustomerRewardSchema>;

export type CustomerAffiliateLink = typeof customerAffiliateLinks.$inferSelect;
export const insertCustomerAffiliateLinkSchema = createInsertSchema(customerAffiliateLinks).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertCustomerAffiliateLink = z.infer<typeof insertCustomerAffiliateLinkSchema>;

export type CustomerReferral = typeof customerReferrals.$inferSelect;
export const insertCustomerReferralSchema = createInsertSchema(customerReferrals).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertCustomerReferral = z.infer<typeof insertCustomerReferralSchema>;

export type CustomerDailyLogin = typeof customerDailyLogins.$inferSelect;
export const insertCustomerDailyLoginSchema = createInsertSchema(customerDailyLogins).omit({ id: true, createdAt: true, loginDate: true });
export type InsertCustomerDailyLogin = z.infer<typeof insertCustomerDailyLoginSchema>;

export type CustomerBirthdayPoint = typeof customerBirthdayPoints.$inferSelect;
export const insertCustomerBirthdayPointSchema = createInsertSchema(customerBirthdayPoints).omit({ id: true, createdAt: true, awardedAt: true });
export type InsertCustomerBirthdayPoint = z.infer<typeof insertCustomerBirthdayPointSchema>;

export type ShoppingVoucher = typeof shoppingVouchers.$inferSelect;
export const insertShoppingVoucherSchema = createInsertSchema(shoppingVouchers).omit({ id: true, createdAt: true, usedAt: true });
export type InsertShoppingVoucher = z.infer<typeof insertShoppingVoucherSchema>;

export type SerialActivationQueue = typeof serialActivationQueue.$inferSelect;
export const insertSerialActivationQueueSchema = createInsertSchema(serialActivationQueue).omit({ id: true, createdAt: true, activatedAt: true });
export type InsertSerialActivationQueue = z.infer<typeof insertSerialActivationQueueSchema>;

export type CustomerWalletTransaction = typeof customerWalletTransactions.$inferSelect;
export const insertCustomerWalletTransactionSchema = createInsertSchema(customerWalletTransactions).omit({ id: true, createdAt: true });
export type InsertCustomerWalletTransaction = z.infer<typeof insertCustomerWalletTransactionSchema>;

export type CustomerWalletTransfer = typeof customerWalletTransfers.$inferSelect;
export const insertCustomerWalletTransferSchema = createInsertSchema(customerWalletTransfers).omit({ id: true, createdAt: true, completedAt: true });
export type InsertCustomerWalletTransfer = z.infer<typeof insertCustomerWalletTransferSchema>;

export type CustomerReferralCommission = typeof customerReferralCommissions.$inferSelect;
export const insertCustomerReferralCommissionSchema = createInsertSchema(customerReferralCommissions).omit({ id: true, createdAt: true, awardedAt: true });
export type InsertCustomerReferralCommission = z.infer<typeof insertCustomerReferralCommissionSchema>;

export type CompanyReferrer = typeof companyReferrer.$inferSelect;
export const insertCompanyReferrerSchema = createInsertSchema(companyReferrer).omit({ id: true, createdAt: true, assignedAt: true });
export type InsertCompanyReferrer = z.infer<typeof insertCompanyReferrerSchema>;

export type WasteManagementReward = typeof wasteManagementRewards.$inferSelect;
export const insertWasteManagementRewardSchema = createInsertSchema(wasteManagementRewards).omit({ id: true, createdAt: true, awardedAt: true });
export type InsertWasteManagementReward = z.infer<typeof insertWasteManagementRewardSchema>;

export type MedicalFacilityBenefit = typeof medicalFacilityBenefits.$inferSelect;
export const insertMedicalFacilityBenefitSchema = createInsertSchema(medicalFacilityBenefits).omit({ id: true, createdAt: true, usedAt: true });
export type InsertMedicalFacilityBenefit = z.infer<typeof insertMedicalFacilityBenefitSchema>;

// Global Number System Tables
export const globalNumbers = pgTable("global_numbers", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  globalNumber: integer("global_number").notNull().unique(), // Sequential: 1, 2, 3, ...
  customerId: varchar("customer_id").notNull(),
  pointsAccumulated: integer("points_accumulated").notNull().default(1500), // Points that triggered this Global Number
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

// StepUp Multiplier Configuration
export const stepUpConfig = pgTable("stepup_config", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  multiplier: integer("multiplier").notNull().unique(), // 5, 25, 125, 500, 2500
  rewardPoints: integer("reward_points").notNull(), // 500, 1500, 3000, 30000, 160000
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

// StepUp Rewards Tracking (idempotent rewards)
export const stepUpRewards = pgTable("stepup_rewards", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  recipientCustomerId: varchar("recipient_customer_id").notNull(), // Customer receiving the reward
  recipientGlobalNumber: integer("recipient_global_number").notNull(), // Their Global Number (G)
  triggerGlobalNumber: integer("trigger_global_number").notNull(), // New Global Number (N) that triggered reward
  multiplier: integer("multiplier").notNull(), // The multiplier used (G × multiplier = N)
  rewardPoints: integer("reward_points").notNull(), // Points awarded
  isAwarded: boolean("is_awarded").notNull().default(false),
  awardedAt: timestamp("awarded_at"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Global Number System Configuration
export const globalNumberConfig = pgTable("global_number_config", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  pointsThreshold: integer("points_threshold").notNull().default(1500), // Points needed for Global Number
  rewardPointsCountTowardThreshold: boolean("reward_points_count_toward_threshold").notNull().default(false), // Policy choice
  isActive: boolean("is_active").notNull().default(true),
  updatedAt: timestamp("updated_at").defaultNow(),
  createdAt: timestamp("created_at").defaultNow(),
});

// Global Number System Types
export type GlobalNumber = typeof globalNumbers.$inferSelect;
export const insertGlobalNumberSchema = createInsertSchema(globalNumbers).omit({ id: true, createdAt: true });
export type InsertGlobalNumber = z.infer<typeof insertGlobalNumberSchema>;

export type StepUpConfig = typeof stepUpConfig.$inferSelect;
export const insertStepUpConfigSchema = createInsertSchema(stepUpConfig).omit({ id: true, createdAt: true });
export type InsertStepUpConfig = z.infer<typeof insertStepUpConfigSchema>;

export type StepUpReward = typeof stepUpRewards.$inferSelect;
export const insertStepUpRewardSchema = createInsertSchema(stepUpRewards).omit({ id: true, createdAt: true, awardedAt: true });
export type InsertStepUpReward = z.infer<typeof insertStepUpRewardSchema>;

export type GlobalNumberConfig = typeof globalNumberConfig.$inferSelect;
export const insertGlobalNumberConfigSchema = createInsertSchema(globalNumberConfig).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertGlobalNumberConfig = z.infer<typeof insertGlobalNumberConfigSchema>;

// Merchant Cashback System Types
export type MerchantCashbackTransaction = typeof merchantCashbackTransactions.$inferSelect;
export const insertMerchantCashbackTransactionSchema = createInsertSchema(merchantCashbackTransactions).omit({ id: true, createdAt: true, processedAt: true });
export type InsertMerchantCashbackTransaction = z.infer<typeof insertMerchantCashbackTransactionSchema>;

export type MonthlyCashbackDistribution = typeof monthlyCashbackDistributions.$inferSelect;
export const insertMonthlyCashbackDistributionSchema = createInsertSchema(monthlyCashbackDistributions).omit({ id: true, createdAt: true, distributedAt: true });
export type InsertMonthlyCashbackDistribution = z.infer<typeof insertMonthlyCashbackDistributionSchema>;

export type MonthlyCashbackDistributionDetail = typeof monthlyCashbackDistributionDetails.$inferSelect;
export const insertMonthlyCashbackDistributionDetailSchema = createInsertSchema(monthlyCashbackDistributionDetails).omit({ id: true, createdAt: true, processedAt: true });
export type InsertMonthlyCashbackDistributionDetail = z.infer<typeof insertMonthlyCashbackDistributionDetailSchema>;

export type ShoppingVoucherDistribution = typeof shoppingVoucherDistributions.$inferSelect;
export const insertShoppingVoucherDistributionSchema = createInsertSchema(shoppingVoucherDistributions).omit({ id: true, createdAt: true, requestedAt: true, approvedAt: true, paidAt: true });
export type InsertShoppingVoucherDistribution = z.infer<typeof insertShoppingVoucherDistributionSchema>;

export type MerchantRankHistory = typeof merchantRankHistory.$inferSelect;
export const insertMerchantRankHistorySchema = createInsertSchema(merchantRankHistory).omit({ id: true, createdAt: true, evaluationDate: true });
export type InsertMerchantRankHistory = z.infer<typeof insertMerchantRankHistorySchema>;

export type MerchantRankCondition = typeof merchantRankConditions.$inferSelect;
export const insertMerchantRankConditionSchema = createInsertSchema(merchantRankConditions).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertMerchantRankCondition = z.infer<typeof insertMerchantRankConditionSchema>;

export type VoucherCashOutRequest = typeof voucherCashOutRequests.$inferSelect;
export const insertVoucherCashOutRequestSchema = createInsertSchema(voucherCashOutRequests).omit({ id: true, createdAt: true, approvedAt: true, paidAt: true });
export type InsertVoucherCashOutRequest = z.infer<typeof insertVoucherCashOutRequestSchema>;
