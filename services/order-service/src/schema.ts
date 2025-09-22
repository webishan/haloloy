import { sql } from "drizzle-orm";
import { pgTable, text, varchar, integer, decimal, boolean, timestamp, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Orders table
export const orders = pgTable("orders", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  customerId: varchar("customer_id").notNull(),
  merchantId: varchar("merchant_id").notNull(),
  orderNumber: text("order_number").notNull().unique(),
  status: text("status").notNull().default("pending"), // pending, confirmed, shipped, delivered, cancelled, refunded
  totalAmount: decimal("total_amount", { precision: 10, scale: 2 }).notNull(),
  subtotal: decimal("subtotal", { precision: 10, scale: 2 }).notNull(),
  taxAmount: decimal("tax_amount", { precision: 10, scale: 2 }).notNull().default("0.00"),
  shippingAmount: decimal("shipping_amount", { precision: 10, scale: 2 }).notNull().default("0.00"),
  discountAmount: decimal("discount_amount", { precision: 10, scale: 2 }).notNull().default("0.00"),
  pointsEarned: integer("points_earned").notNull().default(0),
  pointsUsed: integer("points_used").notNull().default(0),
  paymentMethod: text("payment_method"),
  paymentStatus: text("payment_status").default("pending"), // pending, paid, failed, refunded
  paymentId: varchar("payment_id"),
  shippingAddress: jsonb("shipping_address").notNull(),
  billingAddress: jsonb("billing_address"),
  items: jsonb("items").notNull(),
  notes: text("notes"),
  trackingNumber: text("tracking_number"),
  estimatedDelivery: timestamp("estimated_delivery"),
  deliveredAt: timestamp("delivered_at"),
  cancelledAt: timestamp("cancelled_at"),
  cancelledReason: text("cancelled_reason"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Order items
export const orderItems = pgTable("order_items", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  orderId: varchar("order_id").notNull(),
  productId: varchar("product_id").notNull(),
  productName: text("product_name").notNull(),
  productSku: text("product_sku").notNull(),
  quantity: integer("quantity").notNull(),
  unitPrice: decimal("unit_price", { precision: 10, scale: 2 }).notNull(),
  totalPrice: decimal("total_price", { precision: 10, scale: 2 }).notNull(),
  pointsReward: integer("points_reward").notNull().default(0),
  createdAt: timestamp("created_at").defaultNow(),
});

// Cart items
export const cartItems = pgTable("cart_items", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  customerId: varchar("customer_id").notNull(),
  productId: varchar("product_id").notNull(),
  quantity: integer("quantity").notNull().default(1),
  addedAt: timestamp("added_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Wishlist items
export const wishlistItems = pgTable("wishlist_items", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  customerId: varchar("customer_id").notNull(),
  productId: varchar("product_id").notNull(),
  addedAt: timestamp("added_at").defaultNow(),
});

// Order status history
export const orderStatusHistory = pgTable("order_status_history", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  orderId: varchar("order_id").notNull(),
  status: text("status").notNull(),
  previousStatus: text("previous_status"),
  changedBy: varchar("changed_by"), // User ID who changed the status
  reason: text("reason"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Order tracking
export const orderTracking = pgTable("order_tracking", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  orderId: varchar("order_id").notNull(),
  trackingNumber: text("tracking_number").notNull(),
  carrier: text("carrier").notNull(),
  status: text("status").notNull(),
  location: text("location"),
  description: text("description"),
  timestamp: timestamp("timestamp").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

// Order returns
export const orderReturns = pgTable("order_returns", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  orderId: varchar("order_id").notNull(),
  returnNumber: text("return_number").notNull().unique(),
  reason: text("reason").notNull(),
  status: text("status").notNull().default("pending"), // pending, approved, rejected, processed
  items: jsonb("items").notNull(),
  refundAmount: decimal("refund_amount", { precision: 10, scale: 2 }).notNull().default("0.00"),
  refundMethod: text("refund_method"),
  notes: text("notes"),
  requestedAt: timestamp("requested_at").defaultNow(),
  processedAt: timestamp("processed_at"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Order analytics
export const orderAnalytics = pgTable("order_analytics", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  date: timestamp("date").notNull(),
  totalOrders: integer("total_orders").notNull().default(0),
  totalRevenue: decimal("total_revenue", { precision: 15, scale: 2 }).notNull().default("0.00"),
  averageOrderValue: decimal("average_order_value", { precision: 10, scale: 2 }).notNull().default("0.00"),
  totalItemsSold: integer("total_items_sold").notNull().default(0),
  conversionRate: decimal("conversion_rate", { precision: 5, scale: 2 }).notNull().default("0.00"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Insert schemas
export const insertOrderSchema = createInsertSchema(orders).omit({ id: true, createdAt: true, updatedAt: true });
export const insertOrderItemSchema = createInsertSchema(orderItems).omit({ id: true, createdAt: true });
export const insertCartItemSchema = createInsertSchema(cartItems).omit({ id: true, addedAt: true, updatedAt: true });
export const insertWishlistItemSchema = createInsertSchema(wishlistItems).omit({ id: true, addedAt: true });
export const insertOrderStatusHistorySchema = createInsertSchema(orderStatusHistory).omit({ id: true, createdAt: true });
export const insertOrderTrackingSchema = createInsertSchema(orderTracking).omit({ id: true, createdAt: true });
export const insertOrderReturnSchema = createInsertSchema(orderReturns).omit({ id: true, createdAt: true, requestedAt: true });
export const insertOrderAnalyticsSchema = createInsertSchema(orderAnalytics).omit({ id: true, createdAt: true });

// Types
export type Order = typeof orders.$inferSelect;
export type InsertOrder = z.infer<typeof insertOrderSchema>;
export type OrderItem = typeof orderItems.$inferSelect;
export type InsertOrderItem = z.infer<typeof insertOrderItemSchema>;
export type CartItem = typeof cartItems.$inferSelect;
export type InsertCartItem = z.infer<typeof insertCartItemSchema>;
export type WishlistItem = typeof wishlistItems.$inferSelect;
export type InsertWishlistItem = z.infer<typeof insertWishlistItemSchema>;
export type OrderStatusHistory = typeof orderStatusHistory.$inferSelect;
export type InsertOrderStatusHistory = z.infer<typeof insertOrderStatusHistorySchema>;
export type OrderTracking = typeof orderTracking.$inferSelect;
export type InsertOrderTracking = z.infer<typeof insertOrderTrackingSchema>;
export type OrderReturn = typeof orderReturns.$inferSelect;
export type InsertOrderReturn = z.infer<typeof insertOrderReturnSchema>;
export type OrderAnalytics = typeof orderAnalytics.$inferSelect;
export type InsertOrderAnalytics = z.infer<typeof insertOrderAnalyticsSchema>;
