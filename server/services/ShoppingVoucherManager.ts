import type { IStorage } from "../storage";
import type { 
  InsertShoppingVoucherDistribution,
  InsertVoucherCashOutRequest,
  InsertMerchantCashbackTransaction 
} from "../../shared/schema.js";

/**
 * ShoppingVoucherManager Service
 * 
 * Manages 6000-point shopping voucher revenue sharing with merchants
 * When customers reach 30,000 points (Infinity reward), 6000 points become shopping vouchers
 * Merchants can request cash-out of their voucher revenue share
 * Admin approval required for all cash-out requests
 */
export class ShoppingVoucherManager {
  private storage: IStorage;
  private VOUCHER_POINTS = 6000; // 6000 points from 30k customer reward
  private POINTS_TO_TAKA_RATE = 1; // 1 point = 1 Taka

  constructor(storage: IStorage) {
    this.storage = storage;
  }

  /**
   * Create voucher distribution when customer reaches 30k Infinity reward
   * Called automatically by Infinity reward system
   */
  async createVoucherDistribution(
    customerId: string,
    customerInfinityCycleId: string,
    merchantSharePoints: number = 6000
  ): Promise<{ success: boolean; distributionId?: string; error?: string }> {
    try {
      // Validate customer exists
      const customer = await this.storage.getCustomer(customerId);
      if (!customer) {
        return { success: false, error: "Customer not found" };
      }

      // Create voucher distribution record
      const voucherDistribution: InsertShoppingVoucherDistribution = {
        customerId,
        customerInfinityCycleId,
        totalVoucherValue: this.VOUCHER_POINTS,
        merchantSharePoints,
        cashOutStatus: "pending",
      };

      const distribution = await this.storage.createShoppingVoucherDistribution(voucherDistribution);

      return {
        success: true,
        distributionId: distribution.id,
      };
    } catch (error) {
      console.error("Error creating voucher distribution:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error occurred",
      };
    }
  }

  /**
   * Merchant requests cash-out of voucher revenue share
   */
  async requestVoucherCashOut(
    merchantId: string,
    requestedAmount: number,
    paymentMethod: string,
    paymentDetails: any
  ): Promise<{ success: boolean; requestId?: string; error?: string }> {
    try {
      // Validate merchant
      const merchant = await this.storage.getMerchant(merchantId);
      if (!merchant || !merchant.isActive) {
        return { success: false, error: "Merchant not found or inactive" };
      }

      // Check available balance
      const availableBalance = parseFloat(merchant.shoppingVoucherBalance || "0");
      
      if (availableBalance <= 0) {
        return { success: false, error: "No voucher balance available" };
      }

      if (requestedAmount > availableBalance) {
        return { 
          success: false, 
          error: `Requested amount (${requestedAmount}) exceeds available balance (${availableBalance})` 
        };
      }

      if (requestedAmount <= 0) {
        return { success: false, error: "Invalid request amount" };
      }

      // Check for pending requests
      const pendingRequests = await this.storage.getPendingVoucherCashOutRequests(merchantId);
      if (pendingRequests && pendingRequests.length > 0) {
        return { 
          success: false, 
          error: "You already have a pending cash-out request. Please wait for it to be processed." 
        };
      }

      // Create cash-out request
      const cashOutRequest: InsertVoucherCashOutRequest = {
        merchantId,
        requestedAmount: requestedAmount.toString(),
        availableBalance: availableBalance.toString(),
        status: "pending",
        paymentMethod,
        paymentDetails,
      };

      const request = await this.storage.createVoucherCashOutRequest(cashOutRequest);

      return {
        success: true,
        requestId: request.id,
      };
    } catch (error) {
      console.error("Error requesting voucher cash-out:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error occurred",
      };
    }
  }

  /**
   * Admin approves voucher cash-out request
   */
  async approveVoucherCashOut(
    requestId: string,
    adminId: string,
    approvedAmount?: number
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const request = await this.storage.getVoucherCashOutRequest(requestId);
      
      if (!request) {
        return { success: false, error: "Request not found" };
      }

      if (request.status !== "pending") {
        return { success: false, error: `Request is ${request.status}, cannot approve` };
      }

      const finalAmount = approvedAmount || parseFloat(request.requestedAmount || "0");

      // Update merchant balance
      const merchant = await this.storage.getMerchant(request.merchantId);
      if (!merchant) {
        return { success: false, error: "Merchant not found" };
      }

      const currentBalance = parseFloat(merchant.shoppingVoucherBalance || "0");
      const newBalance = currentBalance - finalAmount;

      if (newBalance < 0) {
        return { success: false, error: "Insufficient balance" };
      }

      // Create cashback transaction record
      const cashbackTransaction: InsertMerchantCashbackTransaction = {
        merchantId: request.merchantId,
        cashbackType: "shopping_voucher",
        amount: `-${finalAmount.toFixed(2)}`, // Negative for withdrawal
        description: `Shopping voucher cash-out approved (Request: ${requestId})`,
        status: "completed",
        metadata: {
          requestId,
          approvedBy: adminId,
          requestedAmount: parseFloat(request.requestedAmount || "0"),
          approvedAmount: finalAmount,
          approvedAt: new Date().toISOString(),
        },
      };

      await this.storage.createMerchantCashbackTransaction(cashbackTransaction);

      // Update merchant balance
      await this.storage.updateMerchant(request.merchantId, {
        shoppingVoucherBalance: newBalance.toFixed(2),
      });

      // Update request status
      await this.storage.updateVoucherCashOutRequest(requestId, {
        status: "approved",
        approvedAmount: finalAmount.toString(),
        approvedBy: adminId,
      });

      return { success: true };
    } catch (error) {
      console.error("Error approving voucher cash-out:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error occurred",
      };
    }
  }

  /**
   * Admin rejects voucher cash-out request
   */
  async rejectVoucherCashOut(
    requestId: string,
    adminId: string,
    rejectionReason: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const request = await this.storage.getVoucherCashOutRequest(requestId);
      
      if (!request) {
        return { success: false, error: "Request not found" };
      }

      if (request.status !== "pending") {
        return { success: false, error: `Request is ${request.status}, cannot reject` };
      }

      // Update request status
      await this.storage.updateVoucherCashOutRequest(requestId, {
        status: "rejected",
        rejectionReason,
        approvedBy: adminId, // Track who rejected it
      });

      return { success: true };
    } catch (error) {
      console.error("Error rejecting voucher cash-out:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error occurred",
      };
    }
  }

  /**
   * Mark cash-out as paid
   */
  async markCashOutAsPaid(
    requestId: string,
    paymentReference: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const request = await this.storage.getVoucherCashOutRequest(requestId);
      
      if (!request) {
        return { success: false, error: "Request not found" };
      }

      if (request.status !== "approved") {
        return { success: false, error: "Request must be approved before marking as paid" };
      }

      await this.storage.updateVoucherCashOutRequest(requestId, {
        status: "paid",
        paymentReference,
      });

      return { success: true };
    } catch (error) {
      console.error("Error marking cash-out as paid:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error occurred",
      };
    }
  }

  /**
   * Credit voucher revenue to merchant's balance (when customer uses voucher at their store)
   */
  async creditVoucherRevenue(
    merchantId: string,
    voucherPoints: number,
    customerId: string,
    voucherId: string
  ): Promise<{ success: boolean; amount?: number; transactionId?: string; error?: string }> {
    try {
      const merchant = await this.storage.getMerchant(merchantId);
      if (!merchant) {
        return { success: false, error: "Merchant not found" };
      }

      // Convert points to Taka (1:1)
      const amount = voucherPoints * this.POINTS_TO_TAKA_RATE;

      // Create cashback transaction
      const cashbackTransaction: InsertMerchantCashbackTransaction = {
        merchantId,
        cashbackType: "shopping_voucher",
        amount: amount.toString(),
        points: voucherPoints,
        description: `Shopping voucher redeemed by customer (${voucherPoints} points)`,
        status: "completed",
        metadata: {
          customerId,
          voucherId,
          voucherPoints,
          conversionRate: this.POINTS_TO_TAKA_RATE,
        },
      };

      const transaction = await this.storage.createMerchantCashbackTransaction(cashbackTransaction);

      // Update merchant's voucher balance
      const currentBalance = parseFloat(merchant.shoppingVoucherBalance || "0");
      const newBalance = currentBalance + amount;

      await this.storage.updateMerchant(merchantId, {
        shoppingVoucherBalance: newBalance.toFixed(2),
      });

      return {
        success: true,
        amount,
        transactionId: transaction.id,
      };
    } catch (error) {
      console.error("Error crediting voucher revenue:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error occurred",
      };
    }
  }

  /**
   * Get merchant's voucher statistics
   */
  async getMerchantVoucherStats(merchantId: string): Promise<{
    currentBalance: number;
    totalEarned: number;
    totalWithdrawn: number;
    pendingRequests: number;
    vouchersRedeemed: number;
  }> {
    try {
      const merchant = await this.storage.getMerchant(merchantId);
      const transactions = await this.storage.getMerchantCashbackTransactionsByType(
        merchantId,
        "shopping_voucher"
      );

      const pendingRequests = await this.storage.getPendingVoucherCashOutRequests(merchantId);

      let totalEarned = 0;
      let totalWithdrawn = 0;
      let vouchersRedeemed = 0;

      for (const tx of transactions || []) {
        const amount = parseFloat(tx.amount || "0");
        if (amount > 0) {
          totalEarned += amount;
          vouchersRedeemed++;
        } else {
          totalWithdrawn += Math.abs(amount);
        }
      }

      return {
        currentBalance: parseFloat(merchant?.shoppingVoucherBalance || "0"),
        totalEarned,
        totalWithdrawn,
        pendingRequests: pendingRequests?.length || 0,
        vouchersRedeemed,
      };
    } catch (error) {
      console.error("Error getting voucher stats:", error);
      return {
        currentBalance: 0,
        totalEarned: 0,
        totalWithdrawn: 0,
        pendingRequests: 0,
        vouchersRedeemed: 0,
      };
    }
  }

  /**
   * Get all pending cash-out requests for admin review
   */
  async getAllPendingCashOutRequests(): Promise<Array<{
    requestId: string;
    merchantId: string;
    businessName: string;
    requestedAmount: number;
    availableBalance: number;
    paymentMethod: string;
    requestDate: Date;
  }>> {
    try {
      const requests = await this.storage.getAllVoucherCashOutRequests("pending");

      return await Promise.all(
        requests.map(async (req) => {
          const merchant = await this.storage.getMerchant(req.merchantId);
          return {
            requestId: req.id,
            merchantId: req.merchantId,
            businessName: merchant?.businessName || "Unknown",
            requestedAmount: parseFloat(req.requestedAmount || "0"),
            availableBalance: parseFloat(req.availableBalance || "0"),
            paymentMethod: req.paymentMethod || "",
            requestDate: new Date(req.createdAt || ""),
          };
        })
      );
    } catch (error) {
      console.error("Error getting pending cash-out requests:", error);
      return [];
    }
  }
}

// Export singleton instance
import { storage } from '../storage';
export const shoppingVoucherManager = new ShoppingVoucherManager(storage);
