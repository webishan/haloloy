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
  country: text("country").notNull().default("BD"), // BD, MY, AE, PH
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
  tier: text("tier").notNull().default("merchant"), // merchant, star, double_star, triple_star, executive
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

// Customer profiles
export const customers = pgTable("customers", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().unique(),
  totalPoints: integer("total_points").notNull().default(0),
  accumulatedPoints: integer("accumulated_points").notNull().default(0), // Points accumulating towards 1500
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

// Reward numbers tracking
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
  createdAt: timestamp("created_at").defaultNow(),
});

// Chat messages table
export const chatMessages = pgTable("chat_messages", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  senderId: varchar("sender_id").notNull(),
  receiverId: varchar("receiver_id").notNull(),
  message: text("message").notNull(),
  messageType: text("message_type", { enum: ["text", "image", "file"] }).default("text"),
  fileUrl: text("file_url"),
  fileName: text("file_name"),
  isRead: boolean("is_read").notNull().default(false),
  isEdited: boolean("is_edited").notNull().default(false),
  editedAt: timestamp("edited_at"),
  replyTo: varchar("reply_to"),
  createdAt: timestamp("created_at").defaultNow(),
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
  distributionType: text("distribution_type", { enum: ["admin_to_admin", "admin_to_merchant", "merchant_to_customer"] }).notNull(),
  description: text("description"),
  status: text("status", { enum: ["pending", "completed", "failed"] }).default("pending"),
  approvedBy: varchar("approved_by"),
  approvedAt: timestamp("approved_at"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Insert schemas
export const insertUserSchema = createInsertSchema(users).omit({ id: true, createdAt: true });
export const insertAdminSchema = createInsertSchema(admins).omit({ id: true, createdAt: true });
export const insertChatMessageSchema = createInsertSchema(chatMessages).omit({ id: true, createdAt: true });
export const insertChatRoomSchema = createInsertSchema(chatRooms).omit({ id: true, createdAt: true });
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
export type PointDistribution = typeof pointDistributions.$inferSelect;
export type InsertPointDistribution = z.infer<typeof insertPointDistributionSchema>;
