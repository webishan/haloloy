import { 
  users, merchants, admins, pointGenerationRequests, pointDistributions, customerPointTransactions, globalNumbers, customers, customerProfiles, customerWallets, customerSerialNumbers, customerOTPs, merchantCustomers, type User, type InsertUser, type Customer, type InsertCustomer,
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
  type MerchantCustomer, type InsertMerchantCustomer,
  type CustomerAffiliateLink, type InsertCustomerAffiliateLink, type CustomerReferral, type InsertCustomerReferral,
  type CustomerDailyLogin, type InsertCustomerDailyLogin, type CustomerBirthdayPoint, type InsertCustomerBirthdayPoint,
  type ShoppingVoucher, type InsertShoppingVoucher, type SerialActivationQueue, type InsertSerialActivationQueue,
  type CustomerWalletTransaction, type InsertCustomerWalletTransaction, type CustomerWalletTransfer, type InsertCustomerWalletTransfer,
  type CustomerReferralCommission, type InsertCustomerReferralCommission, type CompanyReferrer, type InsertCompanyReferrer,
  type WasteManagementReward, type InsertWasteManagementReward, type MedicalFacilityBenefit, type InsertMedicalFacilityBenefit,
  type BlockedCustomer, type InsertBlockedCustomer,
  type ShoppingVoucherDistribution, type InsertShoppingVoucherDistribution,
  type MerchantRankHistory, type InsertMerchantRankHistory,
  type MerchantRankCondition, type InsertMerchantRankCondition,
  type VoucherCashOutRequest, type InsertVoucherCashOutRequest,
  type GlobalNumber, type InsertGlobalNumber, type GlobalNumberConfig, type InsertGlobalNumberConfig
} from "@shared/schema";
import { randomUUID } from "crypto";
import bcrypt from "bcryptjs";
import { db } from "./db";
import { eq, and, or, desc, max, asc, sql, gt } from "drizzle-orm";
import { IStorage } from "./storage";

export class DatabaseStorage implements IStorage {
  // User methods
  async getAllUsers(): Promise<User[]> {
    try {
      const result = await db.select().from(users);
      return result;
    } catch (error) {
      console.error(`❌ Error getting all users from database:`, error);
      return [];
    }
  }

  async getUser(id: string): Promise<User | undefined> {
    try {
      const result = await db.select().from(users).where(eq(users.id, id)).limit(1);
      return result[0];
    } catch (error) {
      console.error(`❌ Error getting user from database:`, error);
      return undefined;
    }
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    try {
      const result = await db.select().from(users).where(eq(users.email, email)).limit(1);
      return result[0];
    } catch (error) {
      console.error(`❌ Error getting user by email from database:`, error);
      return undefined;
    }
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    try {
      const result = await db.select().from(users).where(eq(users.username, username)).limit(1);
      return result[0];
    } catch (error) {
      console.error(`❌ Error getting user by username from database:`, error);
      return undefined;
    }
  }

  async getUsersByRole(role: string): Promise<User[]> {
    try {
      const result = await db.select().from(users).where(eq(users.role, role));
      return result;
    } catch (error) {
      console.error(`❌ Error getting users by role from database:`, error);
      return [];
    }
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    try {
      const id = randomUUID();
      const userData = {
        id,
        ...insertUser,
        createdAt: new Date(),
        updatedAt: new Date()
      };
      await db.insert(users).values(userData);
      return userData;
    } catch (error) {
      console.error(`❌ Error creating user in database:`, error);
      throw error;
    }
  }

  async updateUser(id: string, userUpdate: Partial<User>): Promise<User> {
    try {
      const updateData = {
        ...userUpdate,
        updatedAt: new Date()
      };
      await db.update(users).set(updateData).where(eq(users.id, id));
      const updatedUser = await db.select().from(users).where(eq(users.id, id)).limit(1);
      return updatedUser[0];
    } catch (error) {
      console.error(`❌ Error updating user in database:`, error);
      throw error;
    }
  }

  async deleteUser(id: string): Promise<void> {
    try {
      const result = await db.delete(users).where(eq(users.id, id));
      console.log(`✅ Deleted user ${id} from database`);
    } catch (error) {
      console.error(`❌ Error deleting user from database:`, error);
      throw error;
    }
  }

  // Customer methods
  async getCustomer(userId: string): Promise<Customer | undefined> {
    try {
      const result = await db.select().from(customers).where(eq(customers.userId, userId)).limit(1);
      return result[0];
    } catch (error) {
      console.error(`❌ Error getting customer from database:`, error);
      return undefined;
    }
  }

  async getCustomerByUserId(userId: string): Promise<Customer | undefined> {
    try {
      const result = await db.select().from(customers).where(eq(customers.userId, userId)).limit(1);
      return result[0];
    } catch (error) {
      console.error(`❌ Error getting customer by user ID from database:`, error);
      return undefined;
    }
  }

  async getCustomerByMobile(mobileNumber: string): Promise<CustomerProfile | undefined> {
    try {
      const result = await db.select().from(customerProfiles).where(eq(customerProfiles.mobileNumber, mobileNumber)).limit(1);
      return result[0];
    } catch (error) {
      console.error(`❌ Error getting customer by mobile from database:`, error);
      return undefined;
    }
  }

  async createCustomer(insertCustomer: InsertCustomer): Promise<Customer> {
    try {
      const id = randomUUID();
      const customerData = {
        id,
        ...insertCustomer,
        createdAt: new Date(),
        updatedAt: new Date()
      };
      await db.insert(customers).values(customerData);
      return customerData;
    } catch (error) {
      console.error(`❌ Error creating customer in database:`, error);
      throw error;
    }
  }

  async updateCustomer(userId: string, customerUpdate: Partial<Customer>): Promise<Customer> {
    try {
      const updateData = {
        ...customerUpdate,
        updatedAt: new Date()
      };
      await db.update(customers).set(updateData).where(eq(customers.userId, userId));
      const updatedCustomer = await db.select().from(customers).where(eq(customers.userId, userId)).limit(1);
      return updatedCustomer[0];
    } catch (error) {
      console.error(`❌ Error updating customer in database:`, error);
      throw error;
    }
  }

  async getCustomers(country?: string): Promise<Customer[]> {
    try {
      let query = db.select().from(customers);
      if (country) {
        query = query.where(eq(customers.country, country));
      }
      const result = await query;
      return result;
    } catch (error) {
      console.error(`❌ Error getting customers from database:`, error);
      return [];
    }
  }

  // Customer Profile methods
  async getCustomerProfile(userId: string): Promise<CustomerProfile | undefined> {
    try {
      const result = await db.select().from(customerProfiles).where(eq(customerProfiles.userId, userId)).limit(1);
      return result[0];
    } catch (error) {
      console.error(`❌ Error getting customer profile from database:`, error);
      return undefined;
    }
  }

  async getCustomerProfileById(customerId: string): Promise<CustomerProfile | undefined> {
    try {
      let profile = await db.select().from(customerProfiles).where(eq(customerProfiles.id, customerId)).limit(1).then(res => res[0]);

      if (!profile) {
        // If profile not found by customerId, try to find by userId (legacy or mismatch)
        const user = await db.select().from(users).where(eq(users.id, customerId)).limit(1).then(res => res[0]);
        if (user) {
          console.log(`⚠️ Customer profile not found for customerId: ${customerId}, but user found. Attempting to find by userId.`);
          profile = await db.select().from(customerProfiles).where(eq(customerProfiles.userId, user.id)).limit(1).then(res => res[0]);
        }
      }

      // If still no profile, and a merchant-customer relationship exists, attempt to auto-create
      if (!profile) {
        const merchantCustomer = await db.select().from(merchantCustomers).where(eq(merchantCustomers.customerId, customerId)).limit(1).then(res => res[0]);
        if (merchantCustomer) {
          console.log(`⚠️ Customer profile not found for customerId: ${customerId}, but merchant-customer relationship exists. Attempting to auto-create profile.`);
          const user = await db.select().from(users).where(eq(users.id, merchantCustomer.userId)).limit(1).then(res => res[0]);
          if (user) {
            console.log(`🔧 Auto-creating customer profile for user: ${user.email}`);
            const newProfile = await this.createCustomerProfile({
              userId: user.id,
              uniqueAccountNumber: merchantCustomer.accountNumber || `CUST${Date.now()}`,
              mobileNumber: user.phone || `+880${Math.floor(Math.random() * 1000000000)}`,
              email: user.email,
              fullName: user.firstName + ' ' + user.lastName,
              profileComplete: true,
              totalPointsEarned: merchantCustomer.totalPointsEarned || 0,
              currentPointsBalance: merchantCustomer.currentPointsBalance || 0,
              accumulatedPoints: merchantCustomer.accumulatedPoints || 0,
              globalSerialNumber: merchantCustomer.globalSerialNumber || 0,
              localSerialNumber: merchantCustomer.localSerialNumber || 0,
              tier: merchantCustomer.tier || 'bronze',
              isActive: merchantCustomer.isActive
            });
            await this.createCustomerWallet({
              customerId: newProfile.id,
              rewardPointBalance: newProfile.currentPointsBalance,
              totalRewardPointsEarned: newProfile.totalPointsEarned,
              totalRewardPointsSpent: 0,
              totalRewardPointsTransferred: 0,
              incomeBalance: "0.00",
              totalIncomeEarned: "0.00",
              totalIncomeSpent: "0.00",
              totalIncomeTransferred: "0.00",
              commerceBalance: "0.00",
              totalCommerceAdded: "0.00",
              totalCommerceSpent: "0.00",
              totalCommerceWithdrawn: "0.00"
            });
            profile = newProfile;
            console.log(`✅ Auto-created customer profile and wallet for ${newProfile.fullName} with ID: ${newProfile.id}`);
          }
        }
      }

      if (profile && profile.accumulatedPoints === undefined) {
        profile.accumulatedPoints = 0;
      }

      console.log(`🔍 getCustomerProfileById from DATABASE for customerId: ${customerId}:`, profile ? {
        id: profile.id,
        userId: profile.userId,
        fullName: profile.fullName
      } : 'Not found');

      return profile;
    } catch (error) {
      console.error(`❌ Error getting customer profile by ID from database:`, error);
      return undefined;
    }
  }

  async createCustomerProfile(profile: InsertCustomerProfile): Promise<CustomerProfile> {
    try {
      const id = randomUUID();
      const newProfile: CustomerProfile = {
        id,
        ...profile,
        createdAt: new Date(),
        updatedAt: new Date()
      };
      // Insert into database
      await db.insert(customerProfiles).values(newProfile);
      return newProfile;
    } catch (error) {
      console.error(`❌ Error creating customer profile in database:`, error);
      throw error;
    }
  }

  async updateCustomerProfile(customerId: string, profileUpdate: Partial<CustomerProfile>): Promise<CustomerProfile> {
    try {
      const updateData = {
        ...profileUpdate,
        updatedAt: new Date()
      };
      await db.update(customerProfiles).set(updateData).where(eq(customerProfiles.id, customerId));
      const updatedProfile = await db.select().from(customerProfiles).where(eq(customerProfiles.id, customerId)).limit(1);
      return updatedProfile[0];
    } catch (error) {
      console.error(`❌ Error updating customer profile in database:`, error);
      throw error;
    }
  }

  // Customer Wallet methods
  async getCustomerWallet(customerId: string): Promise<CustomerWallet | undefined> {
    try {
      const result = await db.select().from(customerWallets).where(eq(customerWallets.customerId, customerId)).limit(1);
      return result[0];
    } catch (error) {
      console.error(`❌ Error getting customer wallet from database:`, error);
      return undefined;
    }
  }

  async createCustomerWallet(wallet: InsertCustomerWallet): Promise<CustomerWallet> {
    try {
      const id = randomUUID();
      const newWallet: CustomerWallet = {
        id,
        ...wallet,
        createdAt: new Date(),
        updatedAt: new Date()
      };
      // Insert into database
      await db.insert(customerWallets).values(newWallet);
      return newWallet;
    } catch (error) {
      console.error(`❌ Error creating customer wallet in database:`, error);
      throw error;
    }
  }

  async updateCustomerWallet(customerId: string, walletUpdate: Partial<CustomerWallet>): Promise<CustomerWallet> {
    try {
      const updateData = {
        ...walletUpdate,
        updatedAt: new Date()
      };
      await db.update(customerWallets).set(updateData).where(eq(customerWallets.customerId, customerId));
      const updatedWallet = await db.select().from(customerWallets).where(eq(customerWallets.customerId, customerId)).limit(1);
      return updatedWallet[0];
    } catch (error) {
      console.error(`❌ Error updating customer wallet in database:`, error);
      throw error;
    }
  }

  // Merchant methods
  async getMerchant(userId: string): Promise<Merchant | undefined> {
    try {
      const result = await db.select().from(merchants).where(eq(merchants.userId, userId)).limit(1);
      return result[0];
    } catch (error) {
      console.error(`❌ Error getting merchant from database:`, error);
      return undefined;
    }
  }

  async getMerchantByUserId(userId: string): Promise<Merchant | undefined> {
    try {
      const result = await db.select().from(merchants).where(eq(merchants.userId, userId)).limit(1);
      console.log(`🔍 getMerchantByUserId result:`, result[0] ? {
        id: result[0].id,
        userId: result[0].userId,
        businessName: result[0].businessName,
        loyaltyPointsBalance: result[0].loyaltyPointsBalance,
        availablePoints: result[0].availablePoints
      } : 'Not found');
      return result[0];
    } catch (error) {
      console.error(`❌ Error getting merchant by user ID from database:`, error);
      return undefined;
    }
  }

  async createMerchant(insertMerchant: InsertMerchant): Promise<Merchant> {
    try {
      const id = randomUUID();
      const merchantData = {
        id,
        ...insertMerchant,
        createdAt: new Date(),
        updatedAt: new Date()
      };
      await db.insert(merchants).values(merchantData);
      return merchantData;
    } catch (error) {
      console.error(`❌ Error creating merchant in database:`, error);
      throw error;
    }
  }

  async updateMerchant(userId: string, merchantUpdate: Partial<Merchant>): Promise<Merchant> {
    try {
      const updateData = {
        ...merchantUpdate,
        updatedAt: new Date()
      };
      await db.update(merchants).set(updateData).where(eq(merchants.userId, userId));
      const updatedMerchant = await db.select().from(merchants).where(eq(merchants.userId, userId)).limit(1);
      return updatedMerchant[0];
    } catch (error) {
      console.error(`❌ Error updating merchant in database:`, error);
      throw error;
    }
  }

  // Merchant Customer methods
  async getMerchantCustomers(merchantId: string): Promise<MerchantCustomer[]> {
    try {
      const result = await db.select().from(merchantCustomers).where(eq(merchantCustomers.merchantId, merchantId));
      return result;
    } catch (error) {
      console.error(`❌ Error getting merchant customers from database:`, error);
      return [];
    }
  }

  async createMerchantCustomer(merchantCustomer: InsertMerchantCustomer): Promise<MerchantCustomer> {
    try {
      const id = randomUUID();
      const newMerchantCustomer: MerchantCustomer = {
        id,
        ...merchantCustomer,
        createdAt: new Date(),
        updatedAt: new Date()
      };
      await db.insert(merchantCustomers).values(newMerchantCustomer);
      return newMerchantCustomer;
    } catch (error) {
      console.error(`❌ Error creating merchant customer in database:`, error);
      throw error;
    }
  }

  // Placeholder methods for other required interface methods
  // These will be implemented as needed
  async removeTestCustomers(): Promise<void> {
    // Implementation for removing test customers
  }

  async clearAllCustomers(): Promise<void> {
    // Implementation for clearing all customers
  }

  async getActiveMerchants(): Promise<any[]> {
    try {
      const result = await db.select().from(merchants).where(eq(merchants.isActive, true));
      return result;
    } catch (error) {
      console.error(`❌ Error getting active merchants from database:`, error);
      return [];
    }
  }

  // Add other required methods as needed...
  // For now, I'll add placeholder implementations for the interface
  async getAllActiveMerchants(): Promise<Merchant[]> {
    return this.getActiveMerchants();
  }

  async getMerchantsByRank(rank: string): Promise<Merchant[]> {
    try {
      const result = await db.select().from(merchants).where(eq(merchants.rank, rank));
      return result;
    } catch (error) {
      console.error(`❌ Error getting merchants by rank from database:`, error);
      return [];
    }
  }

  // Add all other required interface methods as placeholders
  // They can be implemented as needed
  async getCategories(): Promise<Category[]> { return []; }
  async createCategory(category: InsertCategory): Promise<Category> { throw new Error('Not implemented'); }
  async updateCategory(id: string, category: Partial<Category>): Promise<Category> { throw new Error('Not implemented'); }
  async deleteCategory(id: string): Promise<void> { throw new Error('Not implemented'); }
  async getBrands(): Promise<Brand[]> { return []; }
  async createBrand(brand: InsertBrand): Promise<Brand> { throw new Error('Not implemented'); }
  async updateBrand(id: string, brand: Partial<Brand>): Promise<Brand> { throw new Error('Not implemented'); }
  async deleteBrand(id: string): Promise<void> { throw new Error('Not implemented'); }
  async getProducts(filters?: any): Promise<Product[]> { return []; }
  async getProduct(id: string): Promise<Product | undefined> { return undefined; }
  async getProductBySlug(slug: string): Promise<Product | undefined> { return undefined; }
  async createProduct(product: InsertProduct): Promise<Product> { throw new Error('Not implemented'); }
  async updateProduct(id: string, product: Partial<Product>): Promise<Product> { throw new Error('Not implemented'); }
  async deleteProduct(id: string): Promise<void> { throw new Error('Not implemented'); }
  async getOrders(customerId?: string, merchantId?: string): Promise<Order[]> { return []; }
  async getOrder(id: string): Promise<Order | undefined> { return undefined; }
  async createOrder(order: InsertOrder): Promise<Order> { throw new Error('Not implemented'); }
  async updateOrder(id: string, order: Partial<Order>): Promise<Order> { throw new Error('Not implemented'); }
  async deleteOrder(id: string): Promise<void> { throw new Error('Not implemented'); }
  async getRewardTransactions(userId: string): Promise<RewardTransaction[]> { return []; }
  async createRewardTransaction(transaction: InsertRewardTransaction): Promise<RewardTransaction> { throw new Error('Not implemented'); }
  async getRewardNumbers(customerId: string): Promise<RewardNumber[]> { return []; }
  async createRewardNumber(rewardNumber: InsertRewardNumber): Promise<RewardNumber> { throw new Error('Not implemented'); }
  async getCartItems(customerId: string): Promise<CartItem[]> { return []; }
  async addToCart(insertCartItem: InsertCartItem): Promise<CartItem> { throw new Error('Not implemented'); }
  async updateCartItem(id: string, cartItem: Partial<CartItem>): Promise<CartItem> { throw new Error('Not implemented'); }
  async removeFromCart(id: string): Promise<void> { throw new Error('Not implemented'); }
  async clearCart(customerId: string): Promise<void> { throw new Error('Not implemented'); }
  async getWishlistItems(customerId: string): Promise<WishlistItem[]> { return []; }
  async addToWishlist(insertWishlistItem: InsertWishlistItem): Promise<WishlistItem> { throw new Error('Not implemented'); }
  async removeFromWishlist(id: string): Promise<void> { throw new Error('Not implemented'); }
  async getReviews(productId: string): Promise<Review[]> { return []; }
  async createReview(review: InsertReview): Promise<Review> { throw new Error('Not implemented'); }
  async updateReview(id: string, review: Partial<Review>): Promise<Review> { throw new Error('Not implemented'); }
  async deleteReview(id: string): Promise<void> { throw new Error('Not implemented'); }
  async getAdmins(): Promise<Admin[]> { return []; }
  async getAdmin(id: string): Promise<Admin | undefined> { return undefined; }
  async createAdmin(admin: InsertAdmin): Promise<Admin> { throw new Error('Not implemented'); }
  async updateAdmin(id: string, admin: Partial<Admin>): Promise<Admin> { throw new Error('Not implemented'); }
  async deleteAdmin(id: string): Promise<void> { throw new Error('Not implemented'); }
  async getPointDistributions(): Promise<PointDistribution[]> { return []; }
  async createPointDistribution(distribution: InsertPointDistribution): Promise<PointDistribution> { throw new Error('Not implemented'); }
  async updatePointDistribution(id: string, distribution: Partial<PointDistribution>): Promise<PointDistribution> { throw new Error('Not implemented'); }
  async deletePointDistribution(id: string): Promise<void> { throw new Error('Not implemented'); }
  async getConversations(customerId: string): Promise<Conversation[]> { return []; }
  async createConversation(conversation: InsertConversation): Promise<Conversation> { throw new Error('Not implemented'); }
  async updateConversation(id: string, conversation: Partial<Conversation>): Promise<Conversation> { throw new Error('Not implemented'); }
  async deleteConversation(id: string): Promise<void> { throw new Error('Not implemented'); }
  async getChatMessages(conversationId: string): Promise<ChatMessage[]> { return []; }
  async createChatMessage(message: InsertChatMessage): Promise<ChatMessage> { throw new Error('Not implemented'); }
  async updateChatMessage(id: string, message: Partial<ChatMessage>): Promise<ChatMessage> { throw new Error('Not implemented'); }
  async deleteChatMessage(id: string): Promise<void> { throw new Error('Not implemented'); }
  async getChatRooms(): Promise<ChatRoom[]> { return []; }
  async getChatRoom(id: string): Promise<ChatRoom | undefined> { return undefined; }
  async createChatRoom(chatRoom: InsertChatRoom): Promise<ChatRoom> { throw new Error('Not implemented'); }
  async updateChatRoom(id: string, chatRoom: Partial<ChatRoom>): Promise<ChatRoom> { throw new Error('Not implemented'); }
  async deleteChatRoom(id: string): Promise<void> { throw new Error('Not implemented'); }
  async getPointGenerationRequests(): Promise<PointGenerationRequest[]> { return []; }
  async createPointGenerationRequest(request: InsertPointGenerationRequest): Promise<PointGenerationRequest> { throw new Error('Not implemented'); }
  async updatePointGenerationRequest(id: string, request: Partial<PointGenerationRequest>): Promise<PointGenerationRequest> { throw new Error('Not implemented'); }
  async deletePointGenerationRequest(id: string): Promise<void> { throw new Error('Not implemented'); }
  async getGlobalNumbers(): Promise<GlobalNumber[]> { return []; }
  async createGlobalNumber(globalNumber: InsertGlobalNumber): Promise<GlobalNumber> { throw new Error('Not implemented'); }
  async updateGlobalNumber(id: string, globalNumber: Partial<GlobalNumber>): Promise<GlobalNumber> { throw new Error('Not implemented'); }
  async deleteGlobalNumber(id: string): Promise<void> { throw new Error('Not implemented'); }
  async getGlobalNumberConfigs(): Promise<GlobalNumberConfig[]> { return []; }
  async createGlobalNumberConfig(config: InsertGlobalNumberConfig): Promise<GlobalNumberConfig> { throw new Error('Not implemented'); }
  async updateGlobalNumberConfig(id: string, config: Partial<GlobalNumberConfig>): Promise<GlobalNumberConfig> { throw new Error('Not implemented'); }
  async deleteGlobalNumberConfig(id: string): Promise<void> { throw new Error('Not implemented'); }
  async getCustomerSerialNumbers(): Promise<CustomerSerialNumber[]> { return []; }
  async createCustomerSerialNumber(serialNumber: InsertCustomerSerialNumber): Promise<CustomerSerialNumber> { throw new Error('Not implemented'); }
  async updateCustomerSerialNumber(id: string, serialNumber: Partial<CustomerSerialNumber>): Promise<CustomerSerialNumber> { throw new Error('Not implemented'); }
  async deleteCustomerSerialNumber(id: string): Promise<void> { throw new Error('Not implemented'); }
  async getCustomerOTPs(): Promise<CustomerOTP[]> { return []; }
  async createCustomerOTP(otp: InsertCustomerOTP): Promise<CustomerOTP> { throw new Error('Not implemented'); }
  async updateCustomerOTP(id: string, otp: Partial<CustomerOTP>): Promise<CustomerOTP> { throw new Error('Not implemented'); }
  async deleteCustomerOTP(id: string): Promise<void> { throw new Error('Not implemented'); }
  async getCustomerPointTransactions(): Promise<CustomerPointTransaction[]> { return []; }
  async createCustomerPointTransaction(transaction: InsertCustomerPointTransaction): Promise<CustomerPointTransaction> { throw new Error('Not implemented'); }
  async updateCustomerPointTransaction(id: string, transaction: Partial<CustomerPointTransaction>): Promise<CustomerPointTransaction> { throw new Error('Not implemented'); }
  async deleteCustomerPointTransaction(id: string): Promise<void> { throw new Error('Not implemented'); }
  async getBlockedCustomers(): Promise<BlockedCustomer[]> { return []; }
  async createBlockedCustomer(blockedCustomer: InsertBlockedCustomer): Promise<BlockedCustomer> { throw new Error('Not implemented'); }
  async updateBlockedCustomer(id: string, blockedCustomer: Partial<BlockedCustomer>): Promise<BlockedCustomer> { throw new Error('Not implemented'); }
  async deleteBlockedCustomer(id: string): Promise<void> { throw new Error('Not implemented'); }
  async getShoppingVouchers(): Promise<ShoppingVoucher[]> { return []; }
  async createShoppingVoucher(voucher: InsertShoppingVoucher): Promise<ShoppingVoucher> { throw new Error('Not implemented'); }
  async updateShoppingVoucher(id: string, voucher: Partial<ShoppingVoucher>): Promise<ShoppingVoucher> { throw new Error('Not implemented'); }
  async deleteShoppingVoucher(id: string): Promise<void> { throw new Error('Not implemented'); }
  async getSerialActivationQueues(): Promise<SerialActivationQueue[]> { return []; }
  async createSerialActivationQueue(queue: InsertSerialActivationQueue): Promise<SerialActivationQueue> { throw new Error('Not implemented'); }
  async updateSerialActivationQueue(id: string, queue: Partial<SerialActivationQueue>): Promise<SerialActivationQueue> { throw new Error('Not implemented'); }
  async deleteSerialActivationQueue(id: string): Promise<void> { throw new Error('Not implemented'); }
  async getCustomerWalletTransactions(): Promise<CustomerWalletTransaction[]> { return []; }
  async createCustomerWalletTransaction(transaction: InsertCustomerWalletTransaction): Promise<CustomerWalletTransaction> { throw new Error('Not implemented'); }
  async updateCustomerWalletTransaction(id: string, transaction: Partial<CustomerWalletTransaction>): Promise<CustomerWalletTransaction> { throw new Error('Not implemented'); }
  async deleteCustomerWalletTransaction(id: string): Promise<void> { throw new Error('Not implemented'); }
  async getCustomerWalletTransfers(): Promise<CustomerWalletTransfer[]> { return []; }
  async createCustomerWalletTransfer(transfer: InsertCustomerWalletTransfer): Promise<CustomerWalletTransfer> { throw new Error('Not implemented'); }
  async updateCustomerWalletTransfer(id: string, transfer: Partial<CustomerWalletTransfer>): Promise<CustomerWalletTransfer> { throw new Error('Not implemented'); }
  async deleteCustomerWalletTransfer(id: string): Promise<void> { throw new Error('Not implemented'); }
  async getCustomerReferralCommissions(): Promise<CustomerReferralCommission[]> { return []; }
  async createCustomerReferralCommission(commission: InsertCustomerReferralCommission): Promise<CustomerReferralCommission> { throw new Error('Not implemented'); }
  async updateCustomerReferralCommission(id: string, commission: Partial<CustomerReferralCommission>): Promise<CustomerReferralCommission> { throw new Error('Not implemented'); }
  async deleteCustomerReferralCommission(id: string): Promise<void> { throw new Error('Not implemented'); }
  async getCompanyReferrers(): Promise<CompanyReferrer[]> { return []; }
  async createCompanyReferrer(referrer: InsertCompanyReferrer): Promise<CompanyReferrer> { throw new Error('Not implemented'); }
  async updateCompanyReferrer(id: string, referrer: Partial<CompanyReferrer>): Promise<CompanyReferrer> { throw new Error('Not implemented'); }
  async deleteCompanyReferrer(id: string): Promise<void> { throw new Error('Not implemented'); }
  async getWasteManagementRewards(): Promise<WasteManagementReward[]> { return []; }
  async createWasteManagementReward(reward: InsertWasteManagementReward): Promise<WasteManagementReward> { throw new Error('Not implemented'); }
  async updateWasteManagementReward(id: string, reward: Partial<WasteManagementReward>): Promise<WasteManagementReward> { throw new Error('Not implemented'); }
  async deleteWasteManagementReward(id: string): Promise<void> { throw new Error('Not implemented'); }
  async getMedicalFacilityBenefits(): Promise<MedicalFacilityBenefit[]> { return []; }
  async createMedicalFacilityBenefit(benefit: InsertMedicalFacilityBenefit): Promise<MedicalFacilityBenefit> { throw new Error('Not implemented'); }
  async updateMedicalFacilityBenefit(id: string, benefit: Partial<MedicalFacilityBenefit>): Promise<MedicalFacilityBenefit> { throw new Error('Not implemented'); }
  async deleteMedicalFacilityBenefit(id: string): Promise<void> { throw new Error('Not implemented'); }
  async getShoppingVoucherDistributions(): Promise<ShoppingVoucherDistribution[]> { return []; }
  async createShoppingVoucherDistribution(distribution: InsertShoppingVoucherDistribution): Promise<ShoppingVoucherDistribution> { throw new Error('Not implemented'); }
  async updateShoppingVoucherDistribution(id: string, distribution: Partial<ShoppingVoucherDistribution>): Promise<ShoppingVoucherDistribution> { throw new Error('Not implemented'); }
  async deleteShoppingVoucherDistribution(id: string): Promise<void> { throw new Error('Not implemented'); }
  async getMerchantRankHistories(): Promise<MerchantRankHistory[]> { return []; }
  async createMerchantRankHistory(history: InsertMerchantRankHistory): Promise<MerchantRankHistory> { throw new Error('Not implemented'); }
  async updateMerchantRankHistory(id: string, history: Partial<MerchantRankHistory>): Promise<MerchantRankHistory> { throw new Error('Not implemented'); }
  async deleteMerchantRankHistory(id: string): Promise<void> { throw new Error('Not implemented'); }
  async getMerchantRankConditions(): Promise<MerchantRankCondition[]> { return []; }
  async createMerchantRankCondition(condition: InsertMerchantRankCondition): Promise<MerchantRankCondition> { throw new Error('Not implemented'); }
  async updateMerchantRankCondition(id: string, condition: Partial<MerchantRankCondition>): Promise<MerchantRankCondition> { throw new Error('Not implemented'); }
  async deleteMerchantRankCondition(id: string): Promise<void> { throw new Error('Not implemented'); }
  async getVoucherCashOutRequests(): Promise<VoucherCashOutRequest[]> { return []; }
  async createVoucherCashOutRequest(request: InsertVoucherCashOutRequest): Promise<VoucherCashOutRequest> { throw new Error('Not implemented'); }
  async updateVoucherCashOutRequest(id: string, request: Partial<VoucherCashOutRequest>): Promise<VoucherCashOutRequest> { throw new Error('Not implemented'); }
  async deleteVoucherCashOutRequest(id: string): Promise<void> { throw new Error('Not implemented'); }
  async getAdminSettings(): Promise<AdminSetting[]> { return []; }
  async getAdminSetting(settingKey: string): Promise<AdminSetting | undefined> { return undefined; }
  async createAdminSetting(setting: InsertAdminSetting): Promise<AdminSetting> { throw new Error('Not implemented'); }
  async updateAdminSetting(id: string, setting: Partial<AdminSetting>): Promise<AdminSetting> { throw new Error('Not implemented'); }
  async deleteAdminSetting(id: string): Promise<void> { throw new Error('Not implemented'); }
  async getLeaderboards(): Promise<Leaderboard[]> { return []; }
  async getLeaderboard(id: string): Promise<Leaderboard | undefined> { return undefined; }
  async createLeaderboard(leaderboard: InsertLeaderboard): Promise<Leaderboard> { throw new Error('Not implemented'); }
  async updateLeaderboard(id: string, leaderboard: Partial<Leaderboard>): Promise<Leaderboard> { throw new Error('Not implemented'); }
  async deleteLeaderboard(id: string): Promise<void> { throw new Error('Not implemented'); }
  async getQRTransfers(): Promise<QRTransfer[]> { return []; }
  async getQRTransfer(id: string): Promise<QRTransfer | undefined> { return undefined; }
  async createQRTransfer(transfer: InsertQRTransfer): Promise<QRTransfer> { throw new Error('Not implemented'); }
  async updateQRTransfer(id: string, transfer: Partial<QRTransfer>): Promise<QRTransfer> { throw new Error('Not implemented'); }
  async deleteQRTransfer(id: string): Promise<void> { throw new Error('Not implemented'); }
  async getMerchantTransactions(): Promise<MerchantTransaction[]> { return []; }
  async getMerchantTransaction(id: string): Promise<MerchantTransaction | undefined> { return undefined; }
  async createMerchantTransaction(transaction: InsertMerchantTransaction): Promise<MerchantTransaction> { throw new Error('Not implemented'); }
  async updateMerchantTransaction(id: string, transaction: Partial<MerchantTransaction>): Promise<MerchantTransaction> { throw new Error('Not implemented'); }
  async deleteMerchantTransaction(id: string): Promise<void> { throw new Error('Not implemented'); }
  async getCommissionTransactions(): Promise<CommissionTransaction[]> { return []; }
  async getCommissionTransaction(id: string): Promise<CommissionTransaction | undefined> { return undefined; }
  async createCommissionTransaction(transaction: InsertCommissionTransaction): Promise<CommissionTransaction> { throw new Error('Not implemented'); }
  async updateCommissionTransaction(id: string, transaction: Partial<CommissionTransaction>): Promise<CommissionTransaction> { throw new Error('Not implemented'); }
  async deleteCommissionTransaction(id: string): Promise<void> { throw new Error('Not implemented'); }
  async getReferrals(): Promise<Referral[]> { return []; }
  async getReferral(id: string): Promise<Referral | undefined> { return undefined; }
  async createReferral(referral: InsertReferral): Promise<Referral> { throw new Error('Not implemented'); }
  async updateReferral(id: string, referral: Partial<Referral>): Promise<Referral> { throw new Error('Not implemented'); }
  async deleteReferral(id: string): Promise<void> { throw new Error('Not implemented'); }
  async getStepUpRewardNumbers(): Promise<StepUpRewardNumber[]> { return []; }
  async getStepUpRewardNumber(id: string): Promise<StepUpRewardNumber | undefined> { return undefined; }
  async createStepUpRewardNumber(rewardNumber: InsertStepUpRewardNumber): Promise<StepUpRewardNumber> { throw new Error('Not implemented'); }
  async updateStepUpRewardNumber(id: string, rewardNumber: Partial<StepUpRewardNumber>): Promise<StepUpRewardNumber> { throw new Error('Not implemented'); }
  async deleteStepUpRewardNumber(id: string): Promise<void> { throw new Error('Not implemented'); }
  async getPointTransactions(): Promise<PointTransaction[]> { return []; }
  async getPointTransaction(id: string): Promise<PointTransaction | undefined> { return undefined; }
  async createPointTransaction(transaction: InsertPointTransaction): Promise<PointTransaction> { throw new Error('Not implemented'); }
  async updatePointTransaction(id: string, transaction: Partial<PointTransaction>): Promise<PointTransaction> { throw new Error('Not implemented'); }
  async deletePointTransaction(id: string): Promise<void> { throw new Error('Not implemented'); }
  async getUserWallets(): Promise<UserWallet[]> { return []; }
  async getUserWallet(id: string): Promise<UserWallet | undefined> { return undefined; }
  async createUserWallet(wallet: InsertUserWallet): Promise<UserWallet> { throw new Error('Not implemented'); }
  async updateUserWallet(id: string, wallet: Partial<UserWallet>): Promise<UserWallet> { throw new Error('Not implemented'); }
  async deleteUserWallet(id: string): Promise<void> { throw new Error('Not implemented'); }
  async getMerchantWallets(): Promise<MerchantWallet[]> { return []; }
  async getMerchantWallet(id: string): Promise<MerchantWallet | undefined> { return undefined; }
  async createMerchantWallet(wallet: InsertMerchantWallet): Promise<MerchantWallet> { throw new Error('Not implemented'); }
  async updateMerchantWallet(id: string, wallet: Partial<MerchantWallet>): Promise<MerchantWallet> { throw new Error('Not implemented'); }
  async deleteMerchantWallet(id: string): Promise<void> { throw new Error('Not implemented'); }
  async getWalletTransactions(): Promise<WalletTransaction[]> { return []; }
  async getWalletTransaction(id: string): Promise<WalletTransaction | undefined> { return undefined; }
  async createWalletTransaction(transaction: InsertWalletTransaction): Promise<WalletTransaction> { throw new Error('Not implemented'); }
  async updateWalletTransaction(id: string, transaction: Partial<WalletTransaction>): Promise<WalletTransaction> { throw new Error('Not implemented'); }
  async deleteWalletTransaction(id: string): Promise<void> { throw new Error('Not implemented'); }
  async getMerchantIncomes(): Promise<MerchantIncome[]> { return []; }
  async getMerchantIncome(id: string): Promise<MerchantIncome | undefined> { return undefined; }
  async createMerchantIncome(income: InsertMerchantIncome): Promise<MerchantIncome> { throw new Error('Not implemented'); }
  async updateMerchantIncome(id: string, income: Partial<MerchantIncome>): Promise<MerchantIncome> { throw new Error('Not implemented'); }
  async deleteMerchantIncome(id: string): Promise<void> { throw new Error('Not implemented'); }
  async getMerchantReferrals(): Promise<MerchantReferral[]> { return []; }
  async getMerchantReferral(id: string): Promise<MerchantReferral | undefined> { return undefined; }
  async createMerchantReferral(referral: InsertMerchantReferral): Promise<MerchantReferral> { throw new Error('Not implemented'); }
  async updateMerchantReferral(id: string, referral: Partial<MerchantReferral>): Promise<MerchantReferral> { throw new Error('Not implemented'); }
  async deleteMerchantReferral(id: string): Promise<void> { throw new Error('Not implemented'); }
  async getRoyaltyDistributions(): Promise<RoyaltyDistribution[]> { return []; }
  async getRoyaltyDistribution(id: string): Promise<RoyaltyDistribution | undefined> { return undefined; }
  async createRoyaltyDistribution(distribution: InsertRoyaltyDistribution): Promise<RoyaltyDistribution> { throw new Error('Not implemented'); }
  async updateRoyaltyDistribution(id: string, distribution: Partial<RoyaltyDistribution>): Promise<RoyaltyDistribution> { throw new Error('Not implemented'); }
  async deleteRoyaltyDistribution(id: string): Promise<void> { throw new Error('Not implemented'); }
  async getMerchantShops(): Promise<MerchantShop[]> { return []; }
  async getMerchantShop(id: string): Promise<MerchantShop | undefined> { return undefined; }
  async createMerchantShop(shop: InsertMerchantShop): Promise<MerchantShop> { throw new Error('Not implemented'); }
  async updateMerchantShop(id: string, shop: Partial<MerchantShop>): Promise<MerchantShop> { throw new Error('Not implemented'); }
  async deleteMerchantShop(id: string): Promise<void> { throw new Error('Not implemented'); }
  async getPointRecharges(): Promise<PointRecharge[]> { return []; }
  async getPointRecharge(id: string): Promise<PointRecharge | undefined> { return undefined; }
  async createPointRecharge(recharge: InsertPointRecharge): Promise<PointRecharge> { throw new Error('Not implemented'); }
  async updatePointRecharge(id: string, recharge: Partial<PointRecharge>): Promise<PointRecharge> { throw new Error('Not implemented'); }
  async deletePointRecharge(id: string): Promise<void> { throw new Error('Not implemented'); }
  async getProductSales(): Promise<ProductSale[]> { return []; }
  async getProductSale(id: string): Promise<ProductSale | undefined> { return undefined; }
  async createProductSale(sale: InsertProductSale): Promise<ProductSale> { throw new Error('Not implemented'); }
  async updateProductSale(id: string, sale: Partial<ProductSale>): Promise<ProductSale> { throw new Error('Not implemented'); }
  async deleteProductSale(id: string): Promise<void> { throw new Error('Not implemented'); }
  async getMerchantActivities(): Promise<MerchantActivity[]> { return []; }
  async getMerchantActivity(id: string): Promise<MerchantActivity | undefined> { return undefined; }
  async createMerchantActivity(activity: InsertMerchantActivity): Promise<MerchantActivity> { throw new Error('Not implemented'); }
  async updateMerchantActivity(id: string, activity: Partial<MerchantActivity>): Promise<MerchantActivity> { throw new Error('Not implemented'); }
  async deleteMerchantActivity(id: string): Promise<void> { throw new Error('Not implemented'); }
  async getEMerchantProducts(): Promise<EMerchantProduct[]> { return []; }
  async getEMerchantProduct(id: string): Promise<EMerchantProduct | undefined> { return undefined; }
  async createEMerchantProduct(product: InsertEMerchantProduct): Promise<EMerchantProduct> { throw new Error('Not implemented'); }
  async updateEMerchantProduct(id: string, product: Partial<EMerchantProduct>): Promise<EMerchantProduct> { throw new Error('Not implemented'); }
  async deleteEMerchantProduct(id: string): Promise<void> { throw new Error('Not implemented'); }
  async getProductReviewSettings(merchantId: string): Promise<ProductReviewSetting[]> { return []; }
  async createProductReviewSetting(setting: InsertProductReviewSetting): Promise<ProductReviewSetting> { throw new Error('Not implemented'); }
  async updateProductReviewSetting(merchantId: string, productId: string, setting: Partial<ProductReviewSetting>): Promise<ProductReviewSetting> { throw new Error('Not implemented'); }
  async deleteProductReviewSetting(id: string): Promise<void> { throw new Error('Not implemented'); }
  async getPointDistributionReports(): Promise<PointDistributionReport[]> { return []; }
  async getPointDistributionReport(id: string): Promise<PointDistributionReport | undefined> { return undefined; }
  async createPointDistributionReport(report: InsertPointDistributionReport): Promise<PointDistributionReport> { throw new Error('Not implemented'); }
  async updatePointDistributionReport(id: string, report: Partial<PointDistributionReport>): Promise<PointDistributionReport> { throw new Error('Not implemented'); }
  async deletePointDistributionReport(id: string): Promise<void> { throw new Error('Not implemented'); }
  async getCustomerPointTransfers(): Promise<CustomerPointTransfer[]> { return []; }
  async getCustomerPointTransfer(id: string): Promise<CustomerPointTransfer | undefined> { return undefined; }
  async createCustomerPointTransfer(transfer: InsertCustomerPointTransfer): Promise<CustomerPointTransfer> { throw new Error('Not implemented'); }
  async updateCustomerPointTransfer(id: string, transfer: Partial<CustomerPointTransfer>): Promise<CustomerPointTransfer> { throw new Error('Not implemented'); }
  async deleteCustomerPointTransfer(id: string): Promise<void> { throw new Error('Not implemented'); }
  async getCustomerPurchases(): Promise<CustomerPurchase[]> { return []; }
  async getCustomerPurchase(id: string): Promise<CustomerPurchase | undefined> { return undefined; }
  async createCustomerPurchase(purchase: InsertCustomerPurchase): Promise<CustomerPurchase> { throw new Error('Not implemented'); }
  async updateCustomerPurchase(id: string, purchase: Partial<CustomerPurchase>): Promise<CustomerPurchase> { throw new Error('Not implemented'); }
  async deleteCustomerPurchase(id: string): Promise<void> { throw new Error('Not implemented'); }
  async getCustomerRewards(): Promise<CustomerReward[]> { return []; }
  async getCustomerReward(id: string): Promise<CustomerReward | undefined> { return undefined; }
  async createCustomerReward(reward: InsertCustomerReward): Promise<CustomerReward> { throw new Error('Not implemented'); }
  async updateCustomerReward(id: string, reward: Partial<CustomerReward>): Promise<CustomerReward> { throw new Error('Not implemented'); }
  async deleteCustomerReward(id: string): Promise<void> { throw new Error('Not implemented'); }
  async getCustomerAffiliateLinks(): Promise<CustomerAffiliateLink[]> { return []; }
  async getCustomerAffiliateLink(id: string): Promise<CustomerAffiliateLink | undefined> { return undefined; }
  async createCustomerAffiliateLink(link: InsertCustomerAffiliateLink): Promise<CustomerAffiliateLink> { throw new Error('Not implemented'); }
  async updateCustomerAffiliateLink(id: string, link: Partial<CustomerAffiliateLink>): Promise<CustomerAffiliateLink> { throw new Error('Not implemented'); }
  async deleteCustomerAffiliateLink(id: string): Promise<void> { throw new Error('Not implemented'); }
  async getCustomerReferrals(): Promise<CustomerReferral[]> { return []; }
  async getCustomerReferral(id: string): Promise<CustomerReferral | undefined> { return undefined; }
  async createCustomerReferral(referral: InsertCustomerReferral): Promise<CustomerReferral> { throw new Error('Not implemented'); }
  async updateCustomerReferral(id: string, referral: Partial<CustomerReferral>): Promise<CustomerReferral> { throw new Error('Not implemented'); }
  async deleteCustomerReferral(id: string): Promise<void> { throw new Error('Not implemented'); }
  async getCustomerDailyLogins(): Promise<CustomerDailyLogin[]> { return []; }
  async getCustomerDailyLogin(id: string): Promise<CustomerDailyLogin | undefined> { return undefined; }
  async createCustomerDailyLogin(login: InsertCustomerDailyLogin): Promise<CustomerDailyLogin> { throw new Error('Not implemented'); }
  async updateCustomerDailyLogin(id: string, login: Partial<CustomerDailyLogin>): Promise<CustomerDailyLogin> { throw new Error('Not implemented'); }
  async deleteCustomerDailyLogin(id: string): Promise<void> { throw new Error('Not implemented'); }
  async getCustomerBirthdayPoints(): Promise<CustomerBirthdayPoint[]> { return []; }
  async getCustomerBirthdayPoint(id: string): Promise<CustomerBirthdayPoint | undefined> { return undefined; }
  async createCustomerBirthdayPoint(point: InsertCustomerBirthdayPoint): Promise<CustomerBirthdayPoint> { throw new Error('Not implemented'); }
  async updateCustomerBirthdayPoint(id: string, point: Partial<CustomerBirthdayPoint>): Promise<CustomerBirthdayPoint> { throw new Error('Not implemented'); }
  async deleteCustomerBirthdayPoint(id: string): Promise<void> { throw new Error('Not implemented'); }
  async getCommissionSettings(): Promise<any> { return {}; }
  async updateCommissionSettings(settings: any): Promise<any> { throw new Error('Not implemented'); }
  async distributePointsToLocalAdmin(data: any): Promise<any> { throw new Error('Not implemented'); }
  async distributePointsToMerchants(data: any): Promise<any> { throw new Error('Not implemented'); }
  async getGlobalWithdrawals(period: string): Promise<any> { return {}; }
  async getGlobalVATServiceCharge(period: string): Promise<any> { return {}; }
}
