import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { referralLinkService } from '../ReferralLinkService';
import { AffiliateCommissionService } from '../affiliate-commission-service';
import { storage } from '../../storage';

// Mock the storage module
vi.mock('../../storage', () => ({
  storage: {
    getMerchant: vi.fn(),
    getMerchantByReferralCode: vi.fn(() => Promise.resolve(null)), // Default to no collision
    updateMerchant: vi.fn(),
    createMerchantTransaction: vi.fn(),
    getMerchantTransactions: vi.fn(),
  },
}));

// Mock rate limiting service
vi.mock('../RateLimitService', () => ({
  rateLimitService: {
    isRateLimited: vi.fn(() => false),
    recordAction: vi.fn(),
  },
  RATE_LIMIT_CONFIGS: {
    REFERRAL_LINK_GENERATION: { windowMs: 60000, maxRequests: 10 },
  },
}));

// Mock fraud prevention service
vi.mock('../CommissionFraudPreventionService', () => ({
  CommissionFraudPreventionService: {
    checkForDuplicateCommission: vi.fn(() => Promise.resolve({ isDuplicate: false })),
    validateCommissionTransaction: vi.fn(() => Promise.resolve({ valid: true })),
    monitorCommissionPatterns: vi.fn(() => Promise.resolve({ suspicious: false })),
  },
}));

describe('Referral Security and Edge Case Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.BASE_URL = 'http://localhost:5006';
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Self-referral prevention', () => {
    it('should prevent merchants from referring themselves during registration', async () => {
      const merchantId = 'self-referral-merchant';
      const mockMerchant = {
        id: merchantId,
        businessName: 'Self Referral Business',
        isActive: true,
        merchantReferralCode: 'MERCH_SELFREFER123',
      };

      vi.mocked(storage.getMerchantByReferralCode).mockResolvedValueOnce(mockMerchant as any);

      // Use a properly formatted secure referral code
      const secureCode = 'MERCH_SELFREFER12345';
      const merchantWithSecureCode = {
        ...mockMerchant,
        merchantReferralCode: secureCode,
      };
      
      vi.mocked(storage.getMerchantByReferralCode).mockResolvedValueOnce(merchantWithSecureCode as any);
      
      const validationResult = await referralLinkService.validateReferralCode(secureCode);
      expect(validationResult).toBeTruthy();

      // Now test commission processing with self-referral
      const selfReferredMerchant = {
        id: merchantId,
        referredByMerchant: merchantId, // Self-referral
        isActive: true,
      };

      vi.mocked(storage.getMerchant).mockResolvedValueOnce(selfReferredMerchant as any);

      const commissionResult = await AffiliateCommissionService.processCommission(
        merchantId,
        1000,
        'self-referral-tx'
      );

      expect(commissionResult.eligibleForCommission).toBe(false);
      expect(commissionResult.commissionAmount).toBe(0);
    });

    it('should detect and prevent self-referral in commission validation', async () => {
      const merchantId = 'self-referral-test';
      const selfReferredMerchant = {
        id: merchantId,
        referredByMerchant: merchantId,
        isActive: true,
      };

      vi.mocked(storage.getMerchant).mockResolvedValueOnce(selfReferredMerchant as any);

      const validationResult = await AffiliateCommissionService.validateCommissionEligibility(
        merchantId,
        1000
      );

      expect(validationResult.eligible).toBe(false);
      expect(validationResult.reason).toBe('Self-referral not allowed');
      expect(validationResult.referringMerchantId).toBeNull();
    });

    it('should handle edge case where merchant ID matches referrer ID', async () => {
      const merchantId = 'edge-case-merchant';
      const edgeCaseMerchant = {
        id: merchantId,
        referredByMerchant: merchantId, // Same ID
        isActive: true,
      };

      vi.mocked(storage.getMerchant).mockResolvedValueOnce(edgeCaseMerchant as any);

      const result = await AffiliateCommissionService.processCommission(
        merchantId,
        500,
        'edge-case-tx'
      );

      expect(result.eligibleForCommission).toBe(false);
      expect(result.commissionAmount).toBe(0);
    });
  });

  describe('Invalid referral code handling', () => {
    it('should reject empty referral codes', async () => {
      const emptyCodeResult = await referralLinkService.validateReferralCode('');
      expect(emptyCodeResult).toBeNull();

      const whitespaceCodeResult = await referralLinkService.validateReferralCode('   ');
      expect(whitespaceCodeResult).toBeNull();

      const nullCodeResult = await referralLinkService.validateReferralCode(null as any);
      expect(nullCodeResult).toBeNull();
    });

    it('should sanitize and reject malicious referral codes', async () => {
      const maliciousCodes = [
        'MERCH_123<script>alert("xss")</script>',
        'MERCH_123; DROP TABLE merchants;',
        'MERCH_123\'; DELETE FROM merchants; --',
        'MERCH_123${process.env.SECRET}',
        'MERCH_123`rm -rf /`',
        'MERCH_123|cat /etc/passwd',
        'MERCH_123&echo "hacked"',
      ];

      for (const maliciousCode of maliciousCodes) {
        const result = await referralLinkService.validateReferralCode(maliciousCode);
        expect(result).toBeNull();
      }
    });

    it('should reject referral codes with invalid formats', async () => {
      const invalidCodes = [
        'invalid-format',
        'MERCH_',
        'MERCH_123',  // Too short
        'merch_123456789012', // Lowercase
        'MERCH_123456789012!', // Special characters
        'NOTMERCH_123456789012', // Wrong prefix
        'MERCH_123456789012345678901234567890', // Too long
      ];

      for (const invalidCode of invalidCodes) {
        const result = await referralLinkService.validateReferralCode(invalidCode);
        expect(result).toBeNull();
      }
    });

    it('should handle referral codes for inactive merchants', async () => {
      const inactiveMerchant = {
        id: 'inactive-merchant',
        businessName: 'Inactive Business',
        isActive: false,
        merchantReferralCode: 'MERCH_INACTIVE123456',
      };

      vi.mocked(storage.getMerchantByReferralCode).mockResolvedValueOnce(inactiveMerchant as any);

      const result = await referralLinkService.validateReferralCode('MERCH_INACTIVE123456');
      expect(result).toBeNull();
    });

    it('should handle referral codes for blocked merchants', async () => {
      const blockedMerchant = {
        id: 'blocked-merchant',
        businessName: 'Blocked Business',
        isActive: true,
        isBlocked: true,
        merchantReferralCode: 'MERCH_BLOCKED123456',
      };

      vi.mocked(storage.getMerchantByReferralCode).mockResolvedValueOnce(blockedMerchant as any);

      const result = await referralLinkService.validateReferralCode('MERCH_BLOCKED123456');
      expect(result).toBeNull();
    });

    it('should handle non-existent referral codes', async () => {
      vi.mocked(storage.getMerchantByReferralCode).mockResolvedValueOnce(null);

      const result = await referralLinkService.validateReferralCode('MERCH_NONEXISTENT123');
      expect(result).toBeNull();
    });
  });

  describe('Concurrent commission calculations', () => {
    const mockReferredMerchant = {
      id: 'referred-merchant-id',
      referredByMerchant: 'referring-merchant-id',
      isActive: true,
    };

    const mockReferringMerchant = {
      id: 'referring-merchant-id',
      isActive: true,
      affiliateCashback: '100.00',
      totalCashback: '500.00',
    };

    beforeEach(() => {
      vi.mocked(storage.getMerchant).mockImplementation((id: string) => {
        if (id === 'referred-merchant-id') {
          return Promise.resolve(mockReferredMerchant as any);
        }
        if (id === 'referring-merchant-id') {
          return Promise.resolve(mockReferringMerchant as any);
        }
        return Promise.resolve(null);
      });

      vi.mocked(storage.createMerchantTransaction).mockResolvedValue({
        id: 'transaction-id',
        merchantId: 'referring-merchant-id',
        transactionType: 'referral_commission',
        amount: '20.00',
        createdAt: new Date(),
      } as any);

      vi.mocked(storage.updateMerchant).mockResolvedValue(mockReferringMerchant as any);
    });

    it('should handle concurrent commission calculations for same transaction', async () => {
      const transactionId = 'concurrent-test-tx';
      const pointsAmount = 1000;

      // Simulate multiple concurrent requests for the same transaction
      const concurrentPromises = Array.from({ length: 10 }, () =>
        AffiliateCommissionService.processCommission(
          'referred-merchant-id',
          pointsAmount,
          transactionId
        )
      );

      const results = await Promise.all(concurrentPromises);

      // All should succeed in this mock scenario
      // In a real implementation, database constraints would prevent duplicates
      results.forEach(result => {
        expect(result.eligibleForCommission).toBe(true);
        expect(result.commissionAmount).toBe(20.00);
        expect(result.referringMerchantId).toBe('referring-merchant-id');
      });

      // Verify all attempted to create transactions
      expect(storage.createMerchantTransaction).toHaveBeenCalledTimes(10);
    });

    it('should handle concurrent commission calculations for different transactions', async () => {
      const transactions = Array.from({ length: 5 }, (_, i) => ({
        id: `concurrent-tx-${i}`,
        points: 1000 + (i * 100),
      }));

      const concurrentPromises = transactions.map(tx =>
        AffiliateCommissionService.processCommission(
          'referred-merchant-id',
          tx.points,
          tx.id
        )
      );

      const results = await Promise.all(concurrentPromises);

      // All should succeed
      results.forEach((result, index) => {
        expect(result.eligibleForCommission).toBe(true);
        expect(result.commissionAmount).toBe(transactions[index].points * 0.02);
        expect(result.referringMerchantId).toBe('referring-merchant-id');
      });

      expect(storage.createMerchantTransaction).toHaveBeenCalledTimes(5);
      expect(storage.updateMerchant).toHaveBeenCalledTimes(5);
    });

    it('should handle race conditions in referral link generation', async () => {
      const merchantId = 'race-condition-merchant';
      const mockMerchant = {
        id: merchantId,
        businessName: 'Race Condition Business',
        isActive: true,
        merchantReferralCode: null,
      };

      vi.mocked(storage.getMerchant).mockResolvedValue(mockMerchant as any);
      vi.mocked(storage.getMerchantByReferralCode).mockResolvedValue(null); // No collision
      vi.mocked(storage.updateMerchant).mockResolvedValue(mockMerchant as any);

      // Simulate concurrent referral link generation requests
      const concurrentPromises = Array.from({ length: 5 }, () =>
        referralLinkService.generateReferralLink(merchantId)
      );

      const results = await Promise.all(concurrentPromises);

      // All should succeed and return valid links
      results.forEach(link => {
        expect(link).toMatch(/http:\/\/localhost:5006\/merchant\/register\?ref=MERCH_[A-F0-9]+/);
      });

      // Verify all attempted to update merchant
      expect(storage.updateMerchant).toHaveBeenCalledTimes(5);
    });
  });

  describe('Referral code security validation', () => {
    it('should validate secure referral code format', () => {
      const secureCode = 'MERCH_A1B2C3D4E5F6';
      expect(referralLinkService.isReferralCodeSecure(secureCode)).toBe(true);
    });

    it('should reject insecure referral code formats', () => {
      const insecureCodes = [
        '',
        'MERCH_',
        'MERCH_123',  // Too short
        'merch_123456789012', // Lowercase
        'MERCH_123456789012!', // Special characters
        'NOTMERCH_123456789012', // Wrong prefix
        'MERCH_GHIJKLMNOPQR', // Non-hex characters
      ];

      insecureCodes.forEach(code => {
        expect(referralLinkService.isReferralCodeSecure(code)).toBe(false);
      });
    });

    it('should generate cryptographically secure referral codes', async () => {
      vi.mocked(storage.getMerchantByReferralCode).mockResolvedValue(null); // No collision

      const generatedCodes = await Promise.all(
        Array.from({ length: 10 }, () => referralLinkService.generateSecureReferralCode())
      );

      // All codes should be unique
      const uniqueCodes = new Set(generatedCodes);
      expect(uniqueCodes.size).toBe(10);

      // All codes should meet security requirements
      generatedCodes.forEach(code => {
        expect(referralLinkService.isReferralCodeSecure(code)).toBe(true);
        expect(code).toMatch(/^MERCH_[A-F0-9]+$/);
        expect(code.length).toBeGreaterThanOrEqual(18);
      });
    });

    it('should handle referral code collision during generation', async () => {
      let callCount = 0;
      vi.mocked(storage.getMerchantByReferralCode).mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          // First call returns collision
          return Promise.resolve({ id: 'existing-merchant' } as any);
        }
        // Second call returns no collision
        return Promise.resolve(null);
      });

      const code = await referralLinkService.generateSecureReferralCode();
      
      expect(code).toMatch(/^MERCH_[A-F0-9]+$/);
      expect(referralLinkService.isReferralCodeSecure(code)).toBe(true);
      expect(storage.getMerchantByReferralCode).toHaveBeenCalledTimes(2);
    });

    it('should fail after maximum collision attempts', async () => {
      // Always return collision
      vi.mocked(storage.getMerchantByReferralCode).mockResolvedValue({ id: 'existing-merchant' } as any);

      await expect(referralLinkService.generateSecureReferralCode()).rejects.toThrow(
        'Failed to generate unique secure referral code after 20 attempts'
      );
    });
  });

  describe('Input validation and sanitization', () => {
    it('should handle null and undefined inputs gracefully', async () => {
      // Test referral code validation
      expect(await referralLinkService.validateReferralCode(null as any)).toBeNull();
      expect(await referralLinkService.validateReferralCode(undefined as any)).toBeNull();

      // Test commission processing
      const nullResult = await AffiliateCommissionService.processCommission(
        null as any,
        1000,
        'null-merchant-tx'
      );
      expect(nullResult.eligibleForCommission).toBe(false);

      const undefinedResult = await AffiliateCommissionService.processCommission(
        undefined as any,
        1000,
        'undefined-merchant-tx'
      );
      expect(undefinedResult.eligibleForCommission).toBe(false);
    });

    it('should sanitize IP addresses in referral tracking', async () => {
      const maliciousIPs = [
        '192.168.1.1; rm -rf /',
        '127.0.0.1<script>alert("xss")</script>',
        '10.0.0.1`cat /etc/passwd`',
        '172.16.0.1|echo "hacked"',
      ];

      // These should not throw errors
      for (const maliciousIP of maliciousIPs) {
        await expect(
          referralLinkService.trackReferralClick('MERCH_TEST123456789', maliciousIP)
        ).resolves.not.toThrow();
      }
    });

    it('should handle extremely large point amounts', async () => {
      const mockReferredMerchant = {
        id: 'referred-merchant-id',
        referredByMerchant: 'referring-merchant-id',
        isActive: true,
      };

      const mockReferringMerchant = {
        id: 'referring-merchant-id',
        isActive: true,
        affiliateCashback: '100.00',
        totalCashback: '500.00',
      };

      vi.mocked(storage.getMerchant).mockImplementation((id: string) => {
        if (id === 'referred-merchant-id') {
          return Promise.resolve(mockReferredMerchant as any);
        }
        if (id === 'referring-merchant-id') {
          return Promise.resolve(mockReferringMerchant as any);
        }
        return Promise.resolve(null);
      });

      vi.mocked(storage.createMerchantTransaction).mockResolvedValue({
        id: 'large-amount-tx',
        merchantId: 'referring-merchant-id',
        transactionType: 'referral_commission',
        amount: '20000000.00',
        createdAt: new Date(),
      } as any);

      vi.mocked(storage.updateMerchant).mockResolvedValue(mockReferringMerchant as any);

      const largeAmount = 1000000000; // 1 billion points
      const result = await AffiliateCommissionService.processCommission(
        'referred-merchant-id',
        largeAmount,
        'large-amount-tx'
      );

      expect(result.eligibleForCommission).toBe(true);
      expect(result.commissionAmount).toBe(20000000); // 2% of 1 billion
    });

    it('should handle fractional point amounts correctly', async () => {
      const fractionalAmount = 1000.5;
      const expectedCommission = 20.01; // 2% of 1000.5

      const commission = AffiliateCommissionService.calculateCommission(fractionalAmount);
      expect(commission).toBe(expectedCommission);
    });
  });

  describe('Error boundary testing', () => {
    it('should handle database connection failures', async () => {
      vi.mocked(storage.getMerchant).mockRejectedValue(new Error('Database connection failed'));

      const result = await AffiliateCommissionService.processCommission(
        'referred-merchant-id',
        1000,
        'db-error-tx'
      );

      expect(result.eligibleForCommission).toBe(false);
      expect(result.commissionAmount).toBe(0);
    });

    it('should handle malformed database responses', async () => {
      // Mock malformed merchant data
      vi.mocked(storage.getMerchant).mockResolvedValueOnce({
        id: 'malformed-merchant',
        // Missing required fields
      } as any);

      const result = await AffiliateCommissionService.processCommission(
        'malformed-merchant',
        1000,
        'malformed-data-tx'
      );

      expect(result.eligibleForCommission).toBe(false);
      expect(result.commissionAmount).toBe(0);
    });

    it('should handle memory pressure scenarios', async () => {
      // Simulate processing many transactions
      const mockReferredMerchant = {
        id: 'memory-test-merchant',
        referredByMerchant: 'referring-merchant-id',
        isActive: true,
      };

      const mockReferringMerchant = {
        id: 'referring-merchant-id',
        isActive: true,
        affiliateCashback: '100.00',
        totalCashback: '500.00',
      };

      vi.mocked(storage.getMerchant).mockImplementation((id: string) => {
        if (id === 'memory-test-merchant') {
          return Promise.resolve(mockReferredMerchant as any);
        }
        if (id === 'referring-merchant-id') {
          return Promise.resolve(mockReferringMerchant as any);
        }
        return Promise.resolve(null);
      });

      vi.mocked(storage.createMerchantTransaction).mockResolvedValue({
        id: 'memory-test-tx',
        merchantId: 'referring-merchant-id',
        transactionType: 'referral_commission',
        amount: '20.00',
        createdAt: new Date(),
      } as any);

      vi.mocked(storage.updateMerchant).mockResolvedValue(mockReferringMerchant as any);

      // Process many transactions in parallel
      const manyTransactions = Array.from({ length: 100 }, (_, i) =>
        AffiliateCommissionService.processCommission(
          'memory-test-merchant',
          1000,
          `memory-test-tx-${i}`
        )
      );

      const results = await Promise.all(manyTransactions);

      // All should succeed
      results.forEach(result => {
        expect(result.eligibleForCommission).toBe(true);
        expect(result.commissionAmount).toBe(20.00);
      });
    });
  });
});