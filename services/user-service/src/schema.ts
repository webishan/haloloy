import { sql } from "drizzle-orm";
import { pgTable, text, varchar, integer, decimal, boolean, timestamp, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Customer profiles
export const customers = pgTable("customers", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().unique(),
  totalPoints: integer("total_points").notNull().default(0),
  accumulatedPoints: integer("accumulated_points").notNull().default(0),
  currentTier: text("current_tier").default("tier_1"),
  globalRewardNumbers: integer("global_reward_numbers").notNull().default(0),
  localRewardNumbers: integer("local_reward_numbers").notNull().default(0),
  totalRewardBalance: decimal("total_reward_balance", { precision: 10, scale: 2 }).notNull().default("0.00"),
  availableBalance: decimal("available_balance", { precision: 10, scale: 2 }).notNull().default("0.00"),
  totalOrders: integer("total_orders").notNull().default(0),
  totalSpent: decimal("total_spent", { precision: 10, scale: 2 }).notNull().default("0.00"),
  referralCode: text("referral_code").unique(),
  referredBy: varchar("referred_by"),
  dailyLoginCount: integer("daily_login_count").notNull().default(0),
  lastLoginDate: timestamp("last_login_date"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Merchant profiles
export const merchants = pgTable("merchants", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().unique(),
  businessName: text("business_name").notNull(),
  businessType: text("business_type"),
  accountType: text("account_type", { enum: ["merchant", "e_merchant"] }).notNull().default("merchant"),
  tier: text("tier").notNull().default("merchant"),
  referralId: text("referral_id").notNull().unique(),
  fathersName: text("fathers_name"),
  mothersName: text("mothers_name"),
  nidNumber: text("nid_number"),
  nomineeDetails: jsonb("nominee_details"),
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
  komarceBalance: decimal("komarce_balance", { precision: 10, scale: 2 }).notNull().default("500.00"),
  totalReceived: decimal("total_received", { precision: 10, scale: 2 }).notNull().default("0.00"),
  totalWithdrawn: decimal("total_withdrawn", { precision: 10, scale: 2 }).notNull().default("0.00"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

// Admin profiles for global and local admins
export const admins = pgTable("admins", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().unique(),
  adminType: text("admin_type", { enum: ["global", "local"] }).notNull(),
  country: text("country"),
  pointsBalance: integer("points_balance").notNull().default(0),
  totalPointsReceived: integer("total_points_received").notNull().default(0),
  totalPointsDistributed: integer("total_points_distributed").notNull().default(0),
  permissions: jsonb("permissions").default([]),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

// Customer profiles (enhanced)
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
  nomineeDetails: jsonb("nominee_details"),
  profileComplete: boolean("profile_complete").notNull().default(false),
  qrCode: text("qr_code"),
  globalSerialNumber: integer("global_serial_number"),
  localSerialNumber: integer("local_serial_number"),
  totalPointsEarned: integer("total_points_earned").notNull().default(0),
  currentPointsBalance: integer("current_points_balance").notNull().default(0),
  tier: text("tier", { enum: ["bronze", "silver", "gold", "platinum"] }).notNull().default("bronze"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Customer Wallets - Three Wallet System
export const customerWallets = pgTable("customer_wallets", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  customerId: varchar("customer_id").notNull().unique(),
  rewardPointBalance: integer("reward_point_balance").notNull().default(0),
  totalRewardPointsEarned: integer("total_reward_points_earned").notNull().default(0),
  totalRewardPointsSpent: integer("total_reward_points_spent").notNull().default(0),
  totalRewardPointsTransferred: integer("total_reward_points_transferred").notNull().default(0),
  incomeBalance: decimal("income_balance", { precision: 10, scale: 2 }).notNull().default("0.00"),
  totalIncomeEarned: decimal("total_income_earned", { precision: 10, scale: 2 }).notNull().default("0.00"),
  totalIncomeSpent: decimal("total_income_spent", { precision: 10, scale: 2 }).notNull().default("0.00"),
  totalIncomeTransferred: decimal("total_income_transferred", { precision: 10, scale: 2 }).notNull().default("0.00"),
  commerceBalance: decimal("commerce_balance", { precision: 10, scale: 2 }).notNull().default("0.00"),
  totalCommerceAdded: decimal("total_commerce_added", { precision: 10, scale: 2 }).notNull().default("0.00"),
  totalCommerceSpent: decimal("total_commerce_spent", { precision: 10, scale: 2 }).notNull().default("0.00"),
  totalCommerceWithdrawn: decimal("total_commerce_withdrawn", { precision: 10, scale: 2 }).notNull().default("0.00"),
  lastTransactionAt: timestamp("last_transaction_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Merchant Wallets - Three comprehensive wallets
export const merchantWallets = pgTable("merchant_wallets", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  merchantId: varchar("merchant_id").notNull().unique(),
  rewardPointBalance: integer("reward_point_balance").notNull().default(0),
  totalPointsIssued: integer("total_points_issued").notNull().default(0),
  incomeWalletBalance: decimal("income_wallet_balance", { precision: 10, scale: 2 }).notNull().default("0.00"),
  cashbackIncome: decimal("cashback_income", { precision: 10, scale: 2 }).notNull().default("0.00"),
  referralIncome: decimal("referral_income", { precision: 10, scale: 2 }).notNull().default("0.00"),
  royaltyIncome: decimal("royalty_income", { precision: 10, scale: 2 }).notNull().default("0.00"),
  commerceWalletBalance: decimal("commerce_wallet_balance", { precision: 10, scale: 2 }).notNull().default("0.00"),
  totalDeposited: decimal("total_deposited", { precision: 10, scale: 2 }).notNull().default("0.00"),
  totalWithdrawn: decimal("total_withdrawn", { precision: 10, scale: 2 }).notNull().default("0.00"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// User preferences and settings
export const userPreferences = pgTable("user_preferences", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().unique(),
  language: text("language").notNull().default("en"),
  timezone: text("timezone").notNull().default("UTC"),
  currency: text("currency").notNull().default("BDT"),
  notifications: jsonb("notifications").default({
    email: true,
    sms: true,
    push: true,
    marketing: false
  }),
  privacy: jsonb("privacy").default({
    profileVisibility: "public",
    showEmail: false,
    showPhone: false
  }),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// User activity tracking
export const userActivity = pgTable("user_activity", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull(),
  activityType: text("activity_type").notNull(),
  activityData: jsonb("activity_data"),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Insert schemas
export const insertCustomerSchema = createInsertSchema(customers).omit({ id: true, createdAt: true });
export const insertMerchantSchema = createInsertSchema(merchants).omit({ id: true, createdAt: true });
export const insertAdminSchema = createInsertSchema(admins).omit({ id: true, createdAt: true });
export const insertCustomerProfileSchema = createInsertSchema(customerProfiles).omit({ id: true, createdAt: true, updatedAt: true });
export const insertCustomerWalletSchema = createInsertSchema(customerWallets).omit({ id: true, createdAt: true, updatedAt: true });
export const insertMerchantWalletSchema = createInsertSchema(merchantWallets).omit({ id: true, createdAt: true, updatedAt: true });
export const insertUserPreferencesSchema = createInsertSchema(userPreferences).omit({ id: true, createdAt: true, updatedAt: true });
export const insertUserActivitySchema = createInsertSchema(userActivity).omit({ id: true, createdAt: true });

// Types
export type Customer = typeof customers.$inferSelect;
export type InsertCustomer = z.infer<typeof insertCustomerSchema>;
export type Merchant = typeof merchants.$inferSelect;
export type InsertMerchant = z.infer<typeof insertMerchantSchema>;
export type Admin = typeof admins.$inferSelect;
export type InsertAdmin = z.infer<typeof insertAdminSchema>;
export type CustomerProfile = typeof customerProfiles.$inferSelect;
export type InsertCustomerProfile = z.infer<typeof insertCustomerProfileSchema>;
export type CustomerWallet = typeof customerWallets.$inferSelect;
export type InsertCustomerWallet = z.infer<typeof insertCustomerWalletSchema>;
export type MerchantWallet = typeof merchantWallets.$inferSelect;
export type InsertMerchantWallet = z.infer<typeof insertMerchantWalletSchema>;
export type UserPreferences = typeof userPreferences.$inferSelect;
export type InsertUserPreferences = z.infer<typeof insertUserPreferencesSchema>;
export type UserActivity = typeof userActivity.$inferSelect;
export type InsertUserActivity = z.infer<typeof insertUserActivitySchema>;
