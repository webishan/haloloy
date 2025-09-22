import { sql } from "drizzle-orm";
import { pgTable, text, varchar, integer, decimal, boolean, timestamp, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Categories table
export const categories = pgTable("categories", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  description: text("description"),
  icon: text("icon"),
  parentId: varchar("parent_id"),
  isActive: boolean("is_active").notNull().default(true),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: timestamp("created_at").defaultNow(),
});

// Brands table
export const brands = pgTable("brands", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  description: text("description"),
  logo: text("logo"),
  website: text("website"),
  isActive: boolean("is_active").notNull().default(true),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: timestamp("created_at").defaultNow(),
});

// Products table
export const products = pgTable("products", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  description: text("description"),
  shortDescription: text("short_description"),
  price: decimal("price", { precision: 10, scale: 2 }).notNull(),
  originalPrice: decimal("original_price", { precision: 10, scale: 2 }),
  sku: text("sku").notNull().unique(),
  barcode: text("barcode"),
  stock: integer("stock").notNull().default(0),
  minStock: integer("min_stock").notNull().default(0),
  maxStock: integer("max_stock"),
  images: jsonb("images").default([]),
  specifications: jsonb("specifications").default({}),
  features: jsonb("features").default([]),
  tags: jsonb("tags").default([]),
  categoryId: varchar("category_id").notNull(),
  brandId: varchar("brand_id"),
  merchantId: varchar("merchant_id").notNull(),
  pointsReward: integer("points_reward").notNull().default(0),
  isActive: boolean("is_active").notNull().default(true),
  isFeatured: boolean("is_featured").notNull().default(false),
  isDigital: boolean("is_digital").notNull().default(false),
  weight: decimal("weight", { precision: 8, scale: 2 }),
  dimensions: jsonb("dimensions"), // {length, width, height, unit}
  rating: decimal("rating", { precision: 3, scale: 2 }).default("0.00"),
  reviewCount: integer("review_count").notNull().default(0),
  viewCount: integer("view_count").notNull().default(0),
  purchaseCount: integer("purchase_count").notNull().default(0),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Product variants (for different sizes, colors, etc.)
export const productVariants = pgTable("product_variants", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  productId: varchar("product_id").notNull(),
  name: text("name").notNull(),
  sku: text("sku").notNull().unique(),
  price: decimal("price", { precision: 10, scale: 2 }).notNull(),
  stock: integer("stock").notNull().default(0),
  attributes: jsonb("attributes").default({}), // {color: "red", size: "L"}
  images: jsonb("images").default([]),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

// Product reviews
export const reviews = pgTable("reviews", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  productId: varchar("product_id").notNull(),
  customerId: varchar("customer_id").notNull(),
  orderId: varchar("order_id"),
  rating: integer("rating").notNull(),
  title: text("title"),
  comment: text("comment"),
  images: jsonb("images").default([]),
  isVerified: boolean("is_verified").notNull().default(false),
  isApproved: boolean("is_approved").notNull().default(true),
  helpfulCount: integer("helpful_count").notNull().default(0),
  createdAt: timestamp("created_at").defaultNow(),
});

// Product wishlist
export const wishlistItems = pgTable("wishlist_items", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  customerId: varchar("customer_id").notNull(),
  productId: varchar("product_id").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

// Product search history
export const searchHistory = pgTable("search_history", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  customerId: varchar("customer_id"),
  searchTerm: text("search_term").notNull(),
  resultsCount: integer("results_count").notNull().default(0),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Product analytics
export const productAnalytics = pgTable("product_analytics", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  productId: varchar("product_id").notNull(),
  date: timestamp("date").notNull(),
  views: integer("views").notNull().default(0),
  clicks: integer("clicks").notNull().default(0),
  purchases: integer("purchases").notNull().default(0),
  revenue: decimal("revenue", { precision: 10, scale: 2 }).notNull().default("0.00"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Product discounts and promotions
export const productDiscounts = pgTable("product_discounts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  productId: varchar("product_id").notNull(),
  discountType: text("discount_type", { enum: ["percentage", "fixed", "buy_x_get_y"] }).notNull(),
  discountValue: decimal("discount_value", { precision: 10, scale: 2 }).notNull(),
  minQuantity: integer("min_quantity").default(1),
  maxQuantity: integer("max_quantity"),
  startDate: timestamp("start_date").notNull(),
  endDate: timestamp("end_date").notNull(),
  isActive: boolean("is_active").notNull().default(true),
  usageLimit: integer("usage_limit"),
  usageCount: integer("usage_count").notNull().default(0),
  createdAt: timestamp("created_at").defaultNow(),
});

// Product inventory tracking
export const inventoryTransactions = pgTable("inventory_transactions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  productId: varchar("product_id").notNull(),
  transactionType: text("transaction_type", { enum: ["in", "out", "adjustment", "return"] }).notNull(),
  quantity: integer("quantity").notNull(),
  previousStock: integer("previous_stock").notNull(),
  newStock: integer("new_stock").notNull(),
  reason: text("reason"),
  referenceId: varchar("reference_id"), // Order ID, adjustment ID, etc.
  createdAt: timestamp("created_at").defaultNow(),
});

// Product categories (many-to-many relationship)
export const productCategories = pgTable("product_categories", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  productId: varchar("product_id").notNull(),
  categoryId: varchar("category_id").notNull(),
  isPrimary: boolean("is_primary").notNull().default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

// Insert schemas
export const insertCategorySchema = createInsertSchema(categories).omit({ id: true, createdAt: true });
export const insertBrandSchema = createInsertSchema(brands).omit({ id: true, createdAt: true });
export const insertProductSchema = createInsertSchema(products).omit({ id: true, createdAt: true, updatedAt: true });
export const insertProductVariantSchema = createInsertSchema(productVariants).omit({ id: true, createdAt: true });
export const insertReviewSchema = createInsertSchema(reviews).omit({ id: true, createdAt: true });
export const insertWishlistItemSchema = createInsertSchema(wishlistItems).omit({ id: true, createdAt: true });
export const insertSearchHistorySchema = createInsertSchema(searchHistory).omit({ id: true, createdAt: true });
export const insertProductAnalyticsSchema = createInsertSchema(productAnalytics).omit({ id: true, createdAt: true });
export const insertProductDiscountSchema = createInsertSchema(productDiscounts).omit({ id: true, createdAt: true });
export const insertInventoryTransactionSchema = createInsertSchema(inventoryTransactions).omit({ id: true, createdAt: true });
export const insertProductCategorySchema = createInsertSchema(productCategories).omit({ id: true, createdAt: true });

// Types
export type Category = typeof categories.$inferSelect;
export type InsertCategory = z.infer<typeof insertCategorySchema>;
export type Brand = typeof brands.$inferSelect;
export type InsertBrand = z.infer<typeof insertBrandSchema>;
export type Product = typeof products.$inferSelect;
export type InsertProduct = z.infer<typeof insertProductSchema>;
export type ProductVariant = typeof productVariants.$inferSelect;
export type InsertProductVariant = z.infer<typeof insertProductVariantSchema>;
export type Review = typeof reviews.$inferSelect;
export type InsertReview = z.infer<typeof insertReviewSchema>;
export type WishlistItem = typeof wishlistItems.$inferSelect;
export type InsertWishlistItem = z.infer<typeof insertWishlistItemSchema>;
export type SearchHistory = typeof searchHistory.$inferSelect;
export type InsertSearchHistory = z.infer<typeof insertSearchHistorySchema>;
export type ProductAnalytics = typeof productAnalytics.$inferSelect;
export type InsertProductAnalytics = z.infer<typeof insertProductAnalyticsSchema>;
export type ProductDiscount = typeof productDiscounts.$inferSelect;
export type InsertProductDiscount = z.infer<typeof insertProductDiscountSchema>;
export type InventoryTransaction = typeof inventoryTransactions.$inferSelect;
export type InsertInventoryTransaction = z.infer<typeof insertInventoryTransactionSchema>;
export type ProductCategory = typeof productCategories.$inferSelect;
export type InsertProductCategory = z.infer<typeof insertProductCategorySchema>;
