import { storage } from '../storage';

export interface FraudDetectionResult {
  isSuspicious: boolean;
  riskLevel: 'low' | 'medium' | 'high';
  reasons: string[];
  allowTransaction: boolean;
}

export interface CommissionAuditEntry {
  id: string;
  timestamp: Date;
  referringMerchantId: string;
  referredMerchantId: string;
  originalTransactionId: string;
  commissionAmount: number;
  baseAmount: number;
  commissionRate: number;
  fraudCheckResult: FraudDetectionResult;
  ipAddress?: string;
  userAgent?: string;
  status: 'pending' | 'approved' | 'rejected' | 'flagged';
}

export interface DuplicateCommissionCheck {
  isDuplicate: boolean;
  existingTransactionId?: string;
  reason?: string;
}

export interface UnusualPatternDetection {
  hasUnusualPattern: boolean;
  patterns: string[];
  riskScore: number;
}

export class CommissionFraudPreventionService {
  private static instance: CommissionFraudPreventionService;
  private auditTrail: Map<string, CommissionAuditEntry> = new Map();
  private duplicatePreventionCache: Map<string, string> = new Map(); // transactionId -> commissionId
  
  // Fraud detection thresholds
  private static readonly MAX_COMMISSION_PER_HOUR = 10;
  private static readonly MAX_COMMISSION_AMOUNT_PER_DAY = 1000;
  private static readonly SUSPICIOUS_VELOCITY_THRESHOLD = 5; // commissions per 10 minutes
  private static readonly HIGH_AMOUNT_THRESHOLD = 100; // Single commission amount

  private constructor() {
    // Clean up old cache entries every hour
    setInterval(() => {
      this.cleanupOldEntries();
    }, 60 * 60 * 1000);
  }

  public static getInstance(): CommissionFraudPreventionService {
    if (!CommissionFraudPreventionService.instance) {
      CommissionFraudPreventionService.instance = new CommissionFraudPreventionService();
    }
    return CommissionFraudPreventionService.instance;
  }

  /**
   * Check for duplicate commission payments
   */
  public async checkDuplicateCommission(
    originalTransactionId: string,
    referringMerchantId: string,
    referredMerchantId: string
  ): Promise<DuplicateCommissionCheck> {
    try {
      // Check in-memory cache first
      const existingCommissionId = this.duplicatePreventionCache.get(originalTransactionId);
      if (existingCommissionId) {
        console.warn(`🚨 Duplicate commission attempt detected for transaction ${originalTransactionId}`);
        return {
          isDuplicate: true,
          existingTransactionId: existingCommissionId,
          reason: 'Commission already processed for this transaction'
        };
      }

      // Check in database for existing commission transactions
      const existingTransactions = await storage.getMerchantTransactions(referringMerchantId);
      const duplicateTransaction = existingTransactions.find(tx => 
        tx.transactionType === 'referral_commission' &&
        tx.referredMerchantId === referredMerchantId &&
        tx.originalTransactionId === originalTransactionId
      );

      if (duplicateTransaction) {
        console.warn(`🚨 Duplicate commission found in database for transaction ${originalTransactionId}`);
        return {
          isDuplicate: true,
          existingTransactionId: duplicateTransaction.id,
          reason: 'Commission already exists in database'
        };
      }

      return { isDuplicate: false };
    } catch (error) {
      console.error('Error checking duplicate commission:', error);
      // In case of error, err on the side of caution
      return {
        isDuplicate: true,
        reason: 'Error during duplicate check - blocking for safety'
      };
    }
  }

  /**
   * Detect unusual commission patterns
   */
  public async detectUnusualPatterns(
    referringMerchantId: string,
    commissionAmount: number
  ): Promise<UnusualPatternDetection> {
    const patterns: string[] = [];
    let riskScore = 0;

    try {
      // Get recent commission history
      const recentTransactions = await this.getRecentCommissions(referringMerchantId, 24); // Last 24 hours
      const veryRecentTransactions = await this.getRecentCommissions(referringMerchantId, 1); // Last hour

      // Pattern 1: High frequency in short time
      if (veryRecentTransactions.length >= CommissionFraudPreventionService.MAX_COMMISSION_PER_HOUR) {
        patterns.push(`High frequency: ${veryRecentTransactions.length} commissions in last hour`);
        riskScore += 30;
      }

      // Pattern 2: High velocity (many commissions in 10 minutes)
      const last10MinTransactions = await this.getRecentCommissions(referringMerchantId, 0.167); // 10 minutes
      if (last10MinTransactions.length >= CommissionFraudPreventionService.SUSPICIOUS_VELOCITY_THRESHOLD) {
        patterns.push(`Suspicious velocity: ${last10MinTransactions.length} commissions in 10 minutes`);
        riskScore += 40;
      }

      // Pattern 3: High daily amount
      const dailyTotal = recentTransactions.reduce((sum, tx) => sum + parseFloat(tx.amount || '0'), 0);
      if (dailyTotal >= CommissionFraudPreventionService.MAX_COMMISSION_AMOUNT_PER_DAY) {
        patterns.push(`High daily amount: $${dailyTotal} in commissions today`);
        riskScore += 25;
      }

      // Pattern 4: Single high amount commission
      if (commissionAmount >= CommissionFraudPreventionService.HIGH_AMOUNT_THRESHOLD) {
        patterns.push(`High single commission: $${commissionAmount}`);
        riskScore += 20;
      }

      // Pattern 5: Round number amounts (potential manipulation)
      if (commissionAmount % 10 === 0 && commissionAmount >= 50) {
        patterns.push(`Round number commission: $${commissionAmount}`);
        riskScore += 10;
      }

      // Pattern 6: Same referred merchant multiple times in short period
      const sameReferredCount = recentTransactions.filter(tx => 
        tx.referredMerchantId && 
        recentTransactions.some(otherTx => otherTx.referredMerchantId === tx.referredMerchantId)
      ).length;
      
      if (sameReferredCount >= 3) {
        patterns.push(`Multiple commissions from same referred merchant: ${sameReferredCount} times`);
        riskScore += 15;
      }

      return {
        hasUnusualPattern: patterns.length > 0,
        patterns,
        riskScore
      };

    } catch (error) {
      console.error('Error detecting unusual patterns:', error);
      return {
        hasUnusualPattern: true,
        patterns: ['Error during pattern detection'],
        riskScore: 50
      };
    }
  }

  /**
   * Comprehensive fraud detection check
   */
  public async performFraudCheck(
    referringMerchantId: string,
    referredMerchantId: string,
    originalTransactionId: string,
    commissionAmount: number,
    ipAddress?: string,
    userAgent?: string
  ): Promise<FraudDetectionResult> {
    const reasons: string[] = [];
    let riskLevel: 'low' | 'medium' | 'high' = 'low';
    let allowTransaction = true;

    try {
      // Check 1: Duplicate commission prevention
      const duplicateCheck = await this.checkDuplicateCommission(
        originalTransactionId,
        referringMerchantId,
        referredMerchantId
      );

      if (duplicateCheck.isDuplicate) {
        reasons.push(`Duplicate commission: ${duplicateCheck.reason}`);
        riskLevel = 'high';
        allowTransaction = false;
      }

      // Check 2: Unusual pattern detection
      const patternCheck = await this.detectUnusualPatterns(referringMerchantId, commissionAmount);
      if (patternCheck.hasUnusualPattern) {
        reasons.push(...patternCheck.patterns);
        
        if (patternCheck.riskScore >= 50) {
          riskLevel = 'high';
          allowTransaction = false;
        } else if (patternCheck.riskScore >= 25) {
          riskLevel = 'medium';
          // Allow but flag for review
        }
      }

      // Check 3: Merchant validation
      const merchantCheck = await this.validateMerchants(referringMerchantId, referredMerchantId);
      if (!merchantCheck.valid) {
        reasons.push(merchantCheck.reason || 'Invalid merchant configuration');
        riskLevel = 'high';
        allowTransaction = false;
      }

      // Check 4: Amount validation
      if (commissionAmount <= 0 || commissionAmount > 1000) {
        reasons.push(`Invalid commission amount: $${commissionAmount}`);
        riskLevel = 'high';
        allowTransaction = false;
      }

      // Check 5: IP-based checks (if available)
      if (ipAddress) {
        const ipCheck = await this.performIPBasedChecks(ipAddress, referringMerchantId);
        if (ipCheck.suspicious) {
          reasons.push(...ipCheck.reasons);
          if (ipCheck.riskLevel === 'high') {
            riskLevel = 'high';
            allowTransaction = false;
          } else if (riskLevel === 'low') {
            riskLevel = 'medium';
          }
        }
      }

      const result: FraudDetectionResult = {
        isSuspicious: reasons.length > 0,
        riskLevel,
        reasons,
        allowTransaction
      };

      // Log the fraud check result
      console.log(`🔍 Fraud check completed for commission ${originalTransactionId}:`, {
        riskLevel,
        allowTransaction,
        reasonCount: reasons.length
      });

      return result;

    } catch (error) {
      console.error('Error performing fraud check:', error);
      return {
        isSuspicious: true,
        riskLevel: 'high',
        reasons: ['Error during fraud detection - blocking for safety'],
        allowTransaction: false
      };
    }
  }

  /**
   * Record commission in audit trail
   */
  public async recordCommissionAudit(
    referringMerchantId: string,
    referredMerchantId: string,
    originalTransactionId: string,
    commissionAmount: number,
    baseAmount: number,
    commissionRate: number,
    fraudCheckResult: FraudDetectionResult,
    ipAddress?: string,
    userAgent?: string
  ): Promise<string> {
    const auditId = `audit_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const auditEntry: CommissionAuditEntry = {
      id: auditId,
      timestamp: new Date(),
      referringMerchantId,
      referredMerchantId,
      originalTransactionId,
      commissionAmount,
      baseAmount,
      commissionRate,
      fraudCheckResult,
      ipAddress,
      userAgent,
      status: fraudCheckResult.allowTransaction ? 'approved' : 
              fraudCheckResult.riskLevel === 'high' ? 'rejected' : 'flagged'
    };

    // Store in memory (in production, this would go to a database)
    this.auditTrail.set(auditId, auditEntry);

    // Add to duplicate prevention cache if approved
    if (fraudCheckResult.allowTransaction) {
      this.duplicatePreventionCache.set(originalTransactionId, auditId);
    }

    console.log(`📝 Commission audit recorded: ${auditId} (${auditEntry.status})`);
    
    return auditId;
  }

  /**
   * Get audit trail for a merchant
   */
  public getAuditTrail(merchantId: string, limit: number = 50): CommissionAuditEntry[] {
    const entries = Array.from(this.auditTrail.values())
      .filter(entry => entry.referringMerchantId === merchantId)
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, limit);

    return entries;
  }

  /**
   * Get suspicious transactions for review
   */
  public getSuspiciousTransactions(limit: number = 20): CommissionAuditEntry[] {
    const suspicious = Array.from(this.auditTrail.values())
      .filter(entry => entry.status === 'flagged' || entry.status === 'rejected')
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, limit);

    return suspicious;
  }

  /**
   * Validate merchants involved in commission
   */
  private async validateMerchants(
    referringMerchantId: string,
    referredMerchantId: string
  ): Promise<{ valid: boolean; reason?: string }> {
    try {
      // Check referring merchant
      const referringMerchant = await storage.getMerchant(referringMerchantId);
      if (!referringMerchant) {
        return { valid: false, reason: 'Referring merchant not found' };
      }
      if (!referringMerchant.isActive) {
        return { valid: false, reason: 'Referring merchant is inactive' };
      }
      if (referringMerchant.isBlocked) {
        return { valid: false, reason: 'Referring merchant is blocked' };
      }

      // Check referred merchant
      const referredMerchant = await storage.getMerchant(referredMerchantId);
      if (!referredMerchant) {
        return { valid: false, reason: 'Referred merchant not found' };
      }
      if (!referredMerchant.isActive) {
        return { valid: false, reason: 'Referred merchant is inactive' };
      }

      // Verify referral relationship
      if (referredMerchant.referredByMerchant !== referringMerchantId) {
        return { valid: false, reason: 'Invalid referral relationship' };
      }

      // Prevent self-referral
      if (referringMerchantId === referredMerchantId) {
        return { valid: false, reason: 'Self-referral not allowed' };
      }

      return { valid: true };
    } catch (error) {
      console.error('Error validating merchants:', error);
      return { valid: false, reason: 'Error during merchant validation' };
    }
  }

  /**
   * Perform IP-based fraud checks
   */
  private async performIPBasedChecks(
    ipAddress: string,
    merchantId: string
  ): Promise<{ suspicious: boolean; reasons: string[]; riskLevel: 'low' | 'medium' | 'high' }> {
    const reasons: string[] = [];
    let riskLevel: 'low' | 'medium' | 'high' = 'low';

    try {
      // Check for multiple merchants from same IP (potential fraud)
      const recentAudits = Array.from(this.auditTrail.values())
        .filter(entry => 
          entry.ipAddress === ipAddress && 
          entry.timestamp.getTime() > Date.now() - (24 * 60 * 60 * 1000) // Last 24 hours
        );

      const uniqueMerchants = new Set(recentAudits.map(entry => entry.referringMerchantId));
      
      if (uniqueMerchants.size > 3) {
        reasons.push(`Multiple merchants (${uniqueMerchants.size}) from same IP in 24h`);
        riskLevel = 'high';
      } else if (uniqueMerchants.size > 1) {
        reasons.push(`Multiple merchants (${uniqueMerchants.size}) from same IP`);
        riskLevel = 'medium';
      }

      // Check for high frequency from same IP
      if (recentAudits.length > 10) {
        reasons.push(`High frequency from IP: ${recentAudits.length} transactions in 24h`);
        riskLevel = 'high';
      }

      return {
        suspicious: reasons.length > 0,
        reasons,
        riskLevel
      };
    } catch (error) {
      console.error('Error performing IP-based checks:', error);
      return {
        suspicious: true,
        reasons: ['Error during IP validation'],
        riskLevel: 'medium'
      };
    }
  }

  /**
   * Get recent commissions for a merchant
   */
  private async getRecentCommissions(merchantId: string, hoursBack: number): Promise<any[]> {
    try {
      const transactions = await storage.getMerchantTransactions(merchantId);
      const cutoffTime = new Date(Date.now() - (hoursBack * 60 * 60 * 1000));
      
      return transactions.filter(tx => 
        tx.transactionType === 'referral_commission' &&
        new Date(tx.createdAt) >= cutoffTime
      );
    } catch (error) {
      console.error('Error getting recent commissions:', error);
      return [];
    }
  }

  /**
   * Clean up old entries from memory
   */
  private cleanupOldEntries(): void {
    const cutoffTime = new Date(Date.now() - (7 * 24 * 60 * 60 * 1000)); // 7 days ago
    let cleanedCount = 0;

    // Clean audit trail
    for (const [id, entry] of this.auditTrail.entries()) {
      if (entry.timestamp < cutoffTime) {
        this.auditTrail.delete(id);
        cleanedCount++;
      }
    }

    // Clean duplicate prevention cache (keep for 24 hours)
    const cacheCutoffTime = new Date(Date.now() - (24 * 60 * 60 * 1000));
    const cacheKeysToDelete: string[] = [];
    
    for (const [transactionId, auditId] of this.duplicatePreventionCache.entries()) {
      const auditEntry = this.auditTrail.get(auditId);
      if (!auditEntry || auditEntry.timestamp < cacheCutoffTime) {
        cacheKeysToDelete.push(transactionId);
      }
    }

    cacheKeysToDelete.forEach(key => {
      this.duplicatePreventionCache.delete(key);
    });

    if (cleanedCount > 0) {
      console.log(`🧹 Fraud prevention cleanup: Removed ${cleanedCount} old audit entries and ${cacheKeysToDelete.length} cache entries`);
    }
  }

  /**
   * Get fraud prevention statistics
   */
  public getStatistics(): {
    totalAudits: number;
    approvedTransactions: number;
    rejectedTransactions: number;
    flaggedTransactions: number;
    cacheSize: number;
  } {
    const audits = Array.from(this.auditTrail.values());
    
    return {
      totalAudits: audits.length,
      approvedTransactions: audits.filter(a => a.status === 'approved').length,
      rejectedTransactions: audits.filter(a => a.status === 'rejected').length,
      flaggedTransactions: audits.filter(a => a.status === 'flagged').length,
      cacheSize: this.duplicatePreventionCache.size
    };
  }
}

// Export singleton instance
export const commissionFraudPreventionService = CommissionFraudPreventionService.getInstance();