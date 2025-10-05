import { storage } from '../storage';
import { commissionFraudPreventionService, type FraudDetectionResult } from './CommissionFraudPreventionService';

export interface CommissionCalculationResult {
  commissionAmount: number;
  commissionRate: number;
  eligibleForCommission: boolean;
  referringMerchantId: string | null;
  referredMerchantId: string;
  pointsTransferred: number;
  fraudCheckResult?: FraudDetectionResult;
  auditId?: string;
}

export interface CommissionTransactionRecord {
  id: string;
  referringMerchantId: string;
  referredMerchantId: string;
  transactionType: 'affiliate_commission';
  originalTransactionId: string;
  baseAmount: number;
  commissionAmount: number;
  commissionRate: number;
  createdAt: Date;
}

export class AffiliateCommissionService {
  private static readonly COMMISSION_RATE = 0.02; // 2%

  /**
   * Calculate 2% commission on points transferred by referred merchants
   */
  static calculateCommission(pointsTransferred: number): number {
    if (pointsTransferred <= 0) {
      return 0;
    }
    return Math.round(pointsTransferred * this.COMMISSION_RATE * 100) / 100; // Round to 2 decimal places
  }

  /**
   * Validate if a merchant is eligible for commission
   */
  static async validateCommissionEligibility(
    referredMerchantId: string,
    pointsTransferred: number
  ): Promise<{ eligible: boolean; referringMerchantId: string | null; reason?: string }> {
    try {
      console.log(`🔍 COMMISSION ELIGIBILITY CHECK:`);
      console.log(`   - Referred Merchant ID: ${referredMerchantId}`);
      console.log(`   - Points Transferred: ${pointsTransferred}`);

      // Check if points transferred is valid
      if (pointsTransferred <= 0) {
        console.log(`❌ Invalid points amount: ${pointsTransferred}`);
        return { eligible: false, referringMerchantId: null, reason: 'Invalid points amount' };
      }

      // Get the referred merchant - try both by userId and by id
      let referredMerchant = await storage.getMerchantByUserId(referredMerchantId);
      if (!referredMerchant) {
        // Try by merchant ID as fallback
        referredMerchant = await storage.getMerchant(referredMerchantId);
      }
      
      console.log(`📊 Referred Merchant:`, referredMerchant ? {
        id: referredMerchant.id,
        userId: referredMerchant.userId,
        businessName: referredMerchant.businessName,
        referredByMerchant: referredMerchant.referredByMerchant,
        isActive: referredMerchant.isActive
      } : 'NOT FOUND');

      if (!referredMerchant) {
        console.log(`❌ Referred merchant not found with ID/userId: ${referredMerchantId}`);
        return { eligible: false, referringMerchantId: null, reason: 'Referred merchant not found' };
      }

      // Check if merchant was referred by another merchant
      if (!referredMerchant.referredByMerchant) {
        console.log(`❌ Merchant was not referred (referredByMerchant is null/empty)`);
        return { eligible: false, referringMerchantId: null, reason: 'Merchant was not referred' };
      }

      console.log(`✅ Merchant was referred by: ${referredMerchant.referredByMerchant}`);

      // Get the referring merchant - try both by userId and by id
      let referringMerchant = await storage.getMerchantByUserId(referredMerchant.referredByMerchant);
      if (!referringMerchant) {
        // Try by merchant ID as fallback
        referringMerchant = await storage.getMerchant(referredMerchant.referredByMerchant);
      }
      
      console.log(`📊 Referring Merchant:`, referringMerchant ? {
        id: referringMerchant.id,
        userId: referringMerchant.userId,
        businessName: referringMerchant.businessName,
        isActive: referringMerchant.isActive,
        affiliateCashback: referringMerchant.affiliateCashback
      } : 'NOT FOUND');

      if (!referringMerchant) {
        console.log(`❌ Referring merchant not found with ID/userId: ${referredMerchant.referredByMerchant}`);
        return { eligible: false, referringMerchantId: null, reason: 'Referring merchant not found' };
      }

      // Check if referring merchant is active
      if (!referringMerchant.isActive) {
        console.log(`❌ Referring merchant is inactive: ${referredMerchant.referredByMerchant}`);
        return { eligible: false, referringMerchantId: referredMerchant.referredByMerchant, reason: 'Referring merchant is inactive' };
      }

      // Prevent self-referral (additional safety check)
      if (referredMerchantId === referredMerchant.referredByMerchant) {
        console.log(`❌ Self-referral detected: ${referredMerchantId}`);
        return { eligible: false, referringMerchantId: null, reason: 'Self-referral not allowed' };
      }

      console.log(`✅ Commission eligibility validated successfully!`);
      return { eligible: true, referringMerchantId: referredMerchant.referredByMerchant };
    } catch (error) {
      console.error('❌ Error validating commission eligibility:', error);
      return { eligible: false, referringMerchantId: null, reason: 'Validation error' };
    }
  }

  /**
   * Process affiliate commission for a point transfer with fraud prevention
   */
  static async processCommission(
    referredMerchantId: string,
    pointsTransferred: number,
    originalTransactionId: string,
    ipAddress?: string,
    userAgent?: string
  ): Promise<CommissionCalculationResult> {
    try {
      console.log(`🚀 STARTING AFFILIATE COMMISSION PROCESSING:`);
      console.log(`   - Referred Merchant ID: ${referredMerchantId}`);
      console.log(`   - Points Transferred: ${pointsTransferred}`);
      console.log(`   - Transaction ID: ${originalTransactionId}`);

      // Validate eligibility
      const eligibility = await this.validateCommissionEligibility(referredMerchantId, pointsTransferred);
      
      if (!eligibility.eligible) {
        console.log(`❌ COMMISSION NOT ELIGIBLE: ${eligibility.reason}`);
        return {
          commissionAmount: 0,
          commissionRate: this.COMMISSION_RATE,
          eligibleForCommission: false,
          referringMerchantId: eligibility.referringMerchantId,
          referredMerchantId,
          pointsTransferred
        };
      }

      console.log(`✅ COMMISSION ELIGIBLE! Referring merchant: ${eligibility.referringMerchantId}`);

      // Calculate commission
      const commissionAmount = this.calculateCommission(pointsTransferred);
      
      if (commissionAmount <= 0) {
        console.log(`❌ Commission amount is zero or negative: ${commissionAmount}`);
        return {
          commissionAmount: 0,
          commissionRate: this.COMMISSION_RATE,
          eligibleForCommission: false,
          referringMerchantId: eligibility.referringMerchantId,
          referredMerchantId,
          pointsTransferred
        };
      }

      console.log(`💰 COMMISSION CALCULATED: ${commissionAmount} (${this.COMMISSION_RATE * 100}% of ${pointsTransferred} points)`);

      // Perform comprehensive fraud check
      const fraudCheckResult = await commissionFraudPreventionService.performFraudCheck(
        eligibility.referringMerchantId!,
        referredMerchantId,
        originalTransactionId,
        commissionAmount,
        ipAddress,
        userAgent
      );

      console.log(`🔒 FRAUD CHECK RESULT: Allow=${fraudCheckResult.allowTransaction}, Suspicious=${fraudCheckResult.isSuspicious}, Risk=${fraudCheckResult.riskLevel}`);

      // Record audit trail regardless of outcome
      const auditId = await commissionFraudPreventionService.recordCommissionAudit(
        eligibility.referringMerchantId!,
        referredMerchantId,
        originalTransactionId,
        commissionAmount,
        pointsTransferred,
        this.COMMISSION_RATE,
        fraudCheckResult,
        ipAddress,
        userAgent
      );

      console.log(`📝 AUDIT RECORDED: ${auditId}`);

      // Check if transaction should be blocked due to fraud detection
      if (!fraudCheckResult.allowTransaction) {
        console.warn(`🚨 COMMISSION BLOCKED due to fraud detection: ${fraudCheckResult.reasons.join(', ')}`);
        return {
          commissionAmount: 0,
          commissionRate: this.COMMISSION_RATE,
          eligibleForCommission: false,
          referringMerchantId: eligibility.referringMerchantId,
          referredMerchantId,
          pointsTransferred,
          fraudCheckResult,
          auditId
        };
      }

      // Log fraud check results for monitoring
      if (fraudCheckResult.isSuspicious) {
        console.warn(`⚠️ Suspicious commission detected but allowed (${fraudCheckResult.riskLevel} risk): ${fraudCheckResult.reasons.join(', ')}`);
      }

      console.log(`💾 RECORDING COMMISSION TRANSACTION...`);
      // Record commission transaction
      await this.recordCommissionTransaction(
        eligibility.referringMerchantId!,
        referredMerchantId,
        originalTransactionId,
        pointsTransferred,
        commissionAmount,
        auditId
      );

      console.log(`💰 UPDATING AFFILIATE CASHBACK...`);
      // Update referring merchant's affiliate cashback balance
      await this.updateAffiliateCashback(eligibility.referringMerchantId!, commissionAmount);

      console.log(`✅ AFFILIATE COMMISSION PROCESSED SUCCESSFULLY!`);
      console.log(`   - Commission Amount: ${commissionAmount}`);
      console.log(`   - Referring Merchant: ${eligibility.referringMerchantId}`);
      console.log(`   - Fraud Risk Level: ${fraudCheckResult.riskLevel}`);

      return {
        commissionAmount,
        commissionRate: this.COMMISSION_RATE,
        eligibleForCommission: true,
        referringMerchantId: eligibility.referringMerchantId,
        referredMerchantId,
        pointsTransferred,
        fraudCheckResult,
        auditId
      };

    } catch (error) {
      console.error('❌ ERROR PROCESSING AFFILIATE COMMISSION:', error);
      console.error('Stack trace:', error.stack);
      return {
        commissionAmount: 0,
        commissionRate: this.COMMISSION_RATE,
        eligibleForCommission: false,
        referringMerchantId: null,
        referredMerchantId,
        pointsTransferred
      };
    }
  }

  /**
   * Record commission transaction in merchant transactions with audit trail
   */
  private static async recordCommissionTransaction(
    referringMerchantId: string,
    referredMerchantId: string,
    originalTransactionId: string,
    baseAmount: number,
    commissionAmount: number,
    auditId?: string
  ): Promise<void> {
    try {
      // Create merchant transaction record for the commission with audit reference
      await storage.createMerchantTransaction({
        merchantId: referringMerchantId,
        type: 'referral_commission',
        amount: commissionAmount.toString(),
        pointsInvolved: baseAmount,
        referredMerchantId: referredMerchantId,
        commissionRate: this.COMMISSION_RATE,
        originalTransactionId: originalTransactionId,
        auditId: auditId,
        description: `2% affiliate commission from referred merchant point transfer (Audit: ${auditId || 'N/A'})`
      });

      console.log(`📝 Commission transaction recorded: ${commissionAmount} for merchant ${referringMerchantId} (Audit: ${auditId})`);
    } catch (error) {
      console.error('Error recording commission transaction:', error);
      throw error;
    }
  }

  /**
   * Update referring merchant's affiliate cashback balance
   */
  private static async updateAffiliateCashback(
    referringMerchantId: string,
    commissionAmount: number
  ): Promise<void> {
    try {
      // Try to get merchant by userId first, then by id
      let merchant = await storage.getMerchantByUserId(referringMerchantId);
      if (!merchant) {
        merchant = await storage.getMerchant(referringMerchantId);
      }
      
      if (!merchant) {
        throw new Error(`Referring merchant not found with ID/userId: ${referringMerchantId}`);
      }

      const currentAffiliateCashback = parseFloat(merchant.affiliateCashback?.toString() || '0');
      const newAffiliateCashback = currentAffiliateCashback + commissionAmount;

      console.log(`💰 UPDATING AFFILIATE CASHBACK:`);
      console.log(`   - Merchant: ${merchant.businessName} (${merchant.userId})`);
      console.log(`   - Current: ${currentAffiliateCashback}`);
      console.log(`   - Commission: ${commissionAmount}`);
      console.log(`   - New Total: ${newAffiliateCashback}`);

      // Update merchant's affiliate cashback and total cashback using userId
      await storage.updateMerchant(merchant.userId, {
        affiliateCashback: newAffiliateCashback.toString(),
        totalCashback: (parseFloat(merchant.totalCashback?.toString() || '0') + commissionAmount).toString()
      });

      // Also update the merchant wallet's referralIncome field
      const wallet = await storage.getMerchantWallet(merchant.id);
      if (wallet) {
        const currentReferralIncome = parseFloat(wallet.referralIncome?.toString() || '0');
        const newReferralIncome = currentReferralIncome + commissionAmount;
        
        await storage.updateMerchantWallet(merchant.id, {
          referralIncome: newReferralIncome.toString(),
          incomeWalletBalance: (parseFloat(wallet.incomeWalletBalance?.toString() || '0') + commissionAmount).toString()
        });
        
        console.log(`💰 Merchant wallet updated: referralIncome ${currentReferralIncome} → ${newReferralIncome}`);
      }

      console.log(`✅ Affiliate cashback updated: ${currentAffiliateCashback} → ${newAffiliateCashback} for merchant ${merchant.businessName}`);
    } catch (error) {
      console.error('❌ Error updating affiliate cashback:', error);
      throw error;
    }
  }

  /**
   * Get affiliate commission history for a merchant
   */
  static async getCommissionHistory(merchantId: string): Promise<any[]> {
    try {
      const transactions = await storage.getMerchantTransactions(merchantId);
      return transactions.filter(t => t.type === 'referral_commission');
    } catch (error) {
      console.error('Error getting commission history:', error);
      return [];
    }
  }

  /**
   * Get total affiliate cashback earned by a merchant
   */
  static async getTotalAffiliateCashback(merchantId: string): Promise<number> {
    try {
      // Try to get merchant by userId first, then by id
      let merchant = await storage.getMerchantByUserId(merchantId);
      if (!merchant) {
        merchant = await storage.getMerchant(merchantId);
      }
      return parseFloat(merchant?.affiliateCashback?.toString() || '0');
    } catch (error) {
      console.error('Error getting total affiliate cashback:', error);
      return 0;
    }
  }

  /**
   * Get fraud prevention audit trail for a merchant
   */
  static getCommissionAuditTrail(merchantId: string, limit: number = 50) {
    return commissionFraudPreventionService.getAuditTrail(merchantId, limit);
  }

  /**
   * Get suspicious commission transactions for admin review
   */
  static getSuspiciousCommissions(limit: number = 20) {
    return commissionFraudPreventionService.getSuspiciousTransactions(limit);
  }

  /**
   * Get fraud prevention statistics
   */
  static getFraudPreventionStats() {
    return commissionFraudPreventionService.getStatistics();
  }

  /**
   * Check if a specific transaction would be flagged as duplicate
   */
  static async checkForDuplicateCommission(
    originalTransactionId: string,
    referringMerchantId: string,
    referredMerchantId: string
  ) {
    return commissionFraudPreventionService.checkDuplicateCommission(
      originalTransactionId,
      referringMerchantId,
      referredMerchantId
    );
  }

  /**
   * Monitor unusual commission patterns for a merchant
   */
  static async monitorCommissionPatterns(merchantId: string, commissionAmount: number) {
    return commissionFraudPreventionService.detectUnusualPatterns(merchantId, commissionAmount);
  }
}

export default AffiliateCommissionService;