import { storage } from '../storage';

export interface ShoppingVoucherDistribution {
  id: string;
  customerId: string;
  merchantId: string;
  merchantName: string;
  pointsAllocated: number;
  pointsUsed: number;
  pointsRemaining: number;
  voucherCode: string;
  createdAt: Date;
  expiresAt: Date;
  isActive: boolean;
}

export interface ShoppingVoucherNotification {
  id: string;
  customerId: string;
  merchantId: string;
  merchantName: string;
  pointsReceived: number;
  message: string;
  isRead: boolean;
  createdAt: Date;
}

export class ShoppingVoucherSystem {
  // Shopping Voucher configuration
  private readonly SHOPPING_VOUCHER_THRESHOLD = 30000; // 4th step threshold
  private readonly SHOPPING_VOUCHER_AMOUNT = 6000; // 6,000 points from 30,000
  private readonly VOUCHER_EXPIRY_DAYS = 365; // 1 year expiry
  
  /**
   * Check if customer has reached 30,000 points and create Shopping Vouchers
   */
  async checkAndCreateShoppingVouchers(customerId: string, pointsEarned: number): Promise<{
    shoppingVouchersCreated: boolean;
    vouchers?: ShoppingVoucherDistribution[];
    totalPoints?: number;
  }> {
    try {
      // Get customer profile and current StepUp rewards
      const profile = await storage.getCustomerProfileById(customerId);
      if (!profile) {
        throw new Error('Customer profile not found');
      }

      // Get customer's StepUp rewards to check if they've reached 30,000 points
      const stepUpRewards = await storage.getCustomerStepUpRewards(customerId);
      const totalStepUpPoints = stepUpRewards
        .filter(reward => reward.isAwarded)
        .reduce((sum, reward) => sum + reward.rewardPoints, 0);

      console.log(`🔍 Checking Shopping Vouchers for customer ${profile.fullName}: ${totalStepUpPoints} StepUp points`);

      // Check if customer has reached 30,000 points threshold
      if (totalStepUpPoints >= this.SHOPPING_VOUCHER_THRESHOLD) {
        // Check if Shopping Vouchers have already been created
        const existingVouchers = await this.getCustomerShoppingVouchers(customerId);
        const hasShoppingVouchers = existingVouchers.some(voucher => voucher.isActive);

        if (!hasShoppingVouchers) {
          console.log(`🎯 SHOPPING VOUCHERS TRIGGERED! Customer ${profile.fullName} reached 30,000 points`);
          
          // Get merchants where customer has earned points
          const merchantTransactions = await this.getCustomerMerchantTransactions(customerId);
          const merchants = await this.getUniqueMerchantsFromTransactions(merchantTransactions);
          
          if (merchants.length === 0) {
            console.log(`⚠️ No merchants found for customer ${profile.fullName}`);
            return { shoppingVouchersCreated: false };
          }

          // Calculate proportional distribution
          const totalMerchantPoints = merchants.reduce((sum, merchant) => sum + merchant.totalPoints, 0);
          const vouchers: ShoppingVoucherDistribution[] = [];

          for (const merchant of merchants) {
            const proportionalPoints = Math.round((merchant.totalPoints / totalMerchantPoints) * this.SHOPPING_VOUCHER_AMOUNT);
            
            if (proportionalPoints > 0) {
              const voucher = await this.createShoppingVoucher({
                customerId,
                merchantId: merchant.merchantId,
                merchantName: merchant.merchantName,
                pointsAllocated: proportionalPoints,
                pointsUsed: 0,
                pointsRemaining: proportionalPoints,
                voucherCode: await this.generateVoucherCode(),
                isActive: true
              });

              vouchers.push(voucher);

              // Create notification
              await this.createShoppingVoucherNotification({
                customerId,
                merchantId: merchant.merchantId,
                merchantName: merchant.merchantName,
                pointsReceived: proportionalPoints,
                message: `You received ${proportionalPoints} shopping voucher points from ${merchant.merchantName}!`,
                isRead: false
              });

              console.log(`✅ Shopping Voucher created: ${proportionalPoints} points for ${merchant.merchantName}`);
            }
          }

          console.log(`✅ Shopping Vouchers created: ${vouchers.length} vouchers totaling ${this.SHOPPING_VOUCHER_AMOUNT} points`);

          return {
            shoppingVouchersCreated: true,
            vouchers,
            totalPoints: this.SHOPPING_VOUCHER_AMOUNT
          };
        } else {
          console.log(`⚠️ Shopping Vouchers already created for customer ${profile.fullName}`);
        }
      }

      return {
        shoppingVouchersCreated: false
      };

    } catch (error) {
      console.error('Error checking Shopping Vouchers:', error);
      return {
        shoppingVouchersCreated: false
      };
    }
  }

  /**
   * Get customer's merchant transactions
   */
  private async getCustomerMerchantTransactions(customerId: string): Promise<any[]> {
    try {
      // Get customer wallet transactions related to merchants
      const walletTransactions = await storage.getAllCustomerWalletTransactions();
      return walletTransactions.filter(transaction => 
        transaction.customerId === customerId &&
        transaction.metadata?.merchantId
      );
    } catch (error) {
      console.error('Error getting customer merchant transactions:', error);
      return [];
    }
  }

  /**
   * Get unique merchants from transactions with their total points
   */
  private async getUniqueMerchantsFromTransactions(transactions: any[]): Promise<Array<{
    merchantId: string;
    merchantName: string;
    totalPoints: number;
  }>> {
    const merchantMap = new Map<string, { merchantName: string; totalPoints: number }>();

    for (const transaction of transactions) {
      const merchantId = transaction.metadata?.merchantId;
      const points = parseFloat(transaction.amount || '0');

      if (merchantId && points > 0) {
        if (merchantMap.has(merchantId)) {
          const existing = merchantMap.get(merchantId)!;
          existing.totalPoints += points;
        } else {
          // Get merchant name
          const merchant = await storage.getMerchant(merchantId);
          merchantMap.set(merchantId, {
            merchantName: merchant?.businessName || 'Unknown Merchant',
            totalPoints: points
          });
        }
      }
    }

    return Array.from(merchantMap.entries()).map(([merchantId, data]) => ({
      merchantId,
      merchantName: data.merchantName,
      totalPoints: data.totalPoints
    }));
  }

  /**
   * Create shopping voucher distribution
   */
  private async createShoppingVoucher(voucherData: {
    customerId: string;
    merchantId: string;
    merchantName: string;
    pointsAllocated: number;
    pointsUsed: number;
    pointsRemaining: number;
    voucherCode: string;
    isActive: boolean;
  }): Promise<ShoppingVoucherDistribution> {
    const id = crypto.randomUUID();
    const now = new Date();
    const expiresAt = new Date(now.getTime() + (this.VOUCHER_EXPIRY_DAYS * 24 * 60 * 60 * 1000));

    const voucher: ShoppingVoucherDistribution = {
      id,
      customerId: voucherData.customerId,
      merchantId: voucherData.merchantId,
      merchantName: voucherData.merchantName,
      pointsAllocated: voucherData.pointsAllocated,
      pointsUsed: voucherData.pointsUsed,
      pointsRemaining: voucherData.pointsRemaining,
      voucherCode: voucherData.voucherCode,
      createdAt: now,
      expiresAt,
      isActive: voucherData.isActive
    };

    // Store in a simple Map for now (in production, this would be in database)
    const shoppingVoucherDistributions = (storage as any).shoppingVoucherDistributions || new Map();
    shoppingVoucherDistributions.set(id, voucher);
    (storage as any).shoppingVoucherDistributions = shoppingVoucherDistributions;

    return voucher;
  }

  /**
   * Create shopping voucher notification
   */
  private async createShoppingVoucherNotification(notificationData: {
    customerId: string;
    merchantId: string;
    merchantName: string;
    pointsReceived: number;
    message: string;
    isRead: boolean;
  }): Promise<ShoppingVoucherNotification> {
    const id = crypto.randomUUID();
    const now = new Date();

    const notification: ShoppingVoucherNotification = {
      id,
      customerId: notificationData.customerId,
      merchantId: notificationData.merchantId,
      merchantName: notificationData.merchantName,
      pointsReceived: notificationData.pointsReceived,
      message: notificationData.message,
      isRead: notificationData.isRead,
      createdAt: now
    };

    // Store in a simple Map for now (in production, this would be in database)
    const shoppingVoucherNotifications = (storage as any).shoppingVoucherNotifications || new Map();
    shoppingVoucherNotifications.set(id, notification);
    (storage as any).shoppingVoucherNotifications = shoppingVoucherNotifications;

    return notification;
  }

  /**
   * Generate unique voucher code
   */
  private async generateVoucherCode(): Promise<string> {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substring(2, 8);
    return `SV-${timestamp}-${random}`.toUpperCase();
  }

  /**
   * Get customer's shopping vouchers
   */
  async getCustomerShoppingVouchers(customerId: string): Promise<ShoppingVoucherDistribution[]> {
    try {
      const shoppingVoucherDistributions = (storage as any).shoppingVoucherDistributions || new Map();
      return Array.from(shoppingVoucherDistributions.values())
        .filter((voucher: ShoppingVoucherDistribution) => voucher.customerId === customerId)
        .sort((a: ShoppingVoucherDistribution, b: ShoppingVoucherDistribution) => b.createdAt.getTime() - a.createdAt.getTime());
    } catch (error) {
      console.error('Error getting customer shopping vouchers:', error);
      return [];
    }
  }

  /**
   * Get customer's shopping voucher notifications
   */
  async getCustomerShoppingVoucherNotifications(customerId: string): Promise<ShoppingVoucherNotification[]> {
    try {
      const shoppingVoucherNotifications = (storage as any).shoppingVoucherNotifications || new Map();
      return Array.from(shoppingVoucherNotifications.values())
        .filter((notification: ShoppingVoucherNotification) => notification.customerId === customerId)
        .sort((a: ShoppingVoucherNotification, b: ShoppingVoucherNotification) => b.createdAt.getTime() - a.createdAt.getTime());
    } catch (error) {
      console.error('Error getting customer shopping voucher notifications:', error);
      return [];
    }
  }

  /**
   * Use shopping voucher
   */
  async useShoppingVoucher(voucherCode: string, amount: number, customerId: string): Promise<{
    success: boolean;
    message: string;
    remainingPoints?: number;
  }> {
    try {
      const shoppingVoucherDistributions = (storage as any).shoppingVoucherDistributions || new Map();
      const voucher = Array.from(shoppingVoucherDistributions.values())
        .find((v: ShoppingVoucherDistribution) => v.voucherCode === voucherCode && v.customerId === customerId) as ShoppingVoucherDistribution;

      if (!voucher) {
        return {
          success: false,
          message: 'Voucher not found or invalid'
        };
      }

      if (!voucher.isActive) {
        return {
          success: false,
          message: 'Voucher is no longer active'
        };
      }

      if (voucher.expiresAt < new Date()) {
        return {
          success: false,
          message: 'Voucher has expired'
        };
      }

      if (amount > voucher.pointsRemaining) {
        return {
          success: false,
          message: `Insufficient voucher balance. Available: ${voucher.pointsRemaining} points`
        };
      }

      // Update voucher usage
      const newPointsUsed = voucher.pointsUsed + amount;
      const newPointsRemaining = voucher.pointsRemaining - amount;

      const updatedVoucher = {
        ...voucher,
        pointsUsed: newPointsUsed,
        pointsRemaining: newPointsRemaining,
        isActive: newPointsRemaining > 0
      };

      shoppingVoucherDistributions.set(voucher.id, updatedVoucher);
      (storage as any).shoppingVoucherDistributions = shoppingVoucherDistributions;

      return {
        success: true,
        message: `Successfully used ${amount} voucher points`,
        remainingPoints: newPointsRemaining
      };

    } catch (error) {
      console.error('Error using shopping voucher:', error);
      return {
        success: false,
        message: 'Error processing voucher'
      };
    }
  }

  /**
   * Get shopping voucher statistics for global admin
   */
  async getShoppingVoucherStatistics(): Promise<{
    totalVouchersCreated: number;
    totalPointsDistributed: number;
    totalPointsUsed: number;
    activeVouchers: number;
    expiredVouchers: number;
  }> {
    try {
      const shoppingVoucherDistributions = (storage as any).shoppingVoucherDistributions || new Map();
      const allVouchers = Array.from(shoppingVoucherDistributions.values()) as ShoppingVoucherDistribution[];

      const totalVouchersCreated = allVouchers.length;
      const totalPointsDistributed = allVouchers.reduce((sum, voucher) => sum + voucher.pointsAllocated, 0);
      const totalPointsUsed = allVouchers.reduce((sum, voucher) => sum + voucher.pointsUsed, 0);
      const activeVouchers = allVouchers.filter(voucher => voucher.isActive && voucher.expiresAt > new Date()).length;
      const expiredVouchers = allVouchers.filter(voucher => voucher.expiresAt <= new Date()).length;

      return {
        totalVouchersCreated,
        totalPointsDistributed,
        totalPointsUsed,
        activeVouchers,
        expiredVouchers
      };
    } catch (error) {
      console.error('Error getting shopping voucher statistics:', error);
      return {
        totalVouchersCreated: 0,
        totalPointsDistributed: 0,
        totalPointsUsed: 0,
        activeVouchers: 0,
        expiredVouchers: 0
      };
    }
  }
}

// Export singleton instance
export const shoppingVoucherSystem = new ShoppingVoucherSystem();
