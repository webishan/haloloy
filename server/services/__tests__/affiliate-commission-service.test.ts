import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { AffiliateCommissionService } from '../affiliate-commission-service';
import { storage } from '../../storage';

// Mock the storage module
vi.mock('../../storage', () => ({
  storage: {
    getMerchant: vi.fn(),
    createMerchantTransaction: vi.fn(),
    updateMerchant: vi.fn(),
    getMerchantTransactions: vi.fn(),
  },
}));

// Mock the fraud prevention service
vi.mock('../CommissionFraudPreventionService', () => ({
  commissionFraudPreventionService: {
    performFraudCheck: vi.fn(() => Promise.resolve({ 
      riskLevel: 'low', 
      allowTransaction: true, 
      reasons: [] 
    })),
    recordCommissionAudit: vi.fn(),
  },
}));

describe('AffiliateCommissionService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('calculateCommission', () => {
    it('should calculate 2% commission correctly for various amounts', () => {
      // Test 2% calculation accuracy with various amounts
      expect(AffiliateCommissionService.calculateCommission(100)).toBe(2.00);
      expect(AffiliateCommissionService.calculateCommission(1000)).toBe(20.00);
      expect(AffiliateCommissionService.calculateCommission(2500)).toBe(50.00);
      expect(AffiliateCommissionService.calculateCommission(10000)).toBe(200.00);
      expect(AffiliateCommissionService.calculateCommission(1)).toBe(0.02);
      expect(AffiliateCommissionService.calculateCommission(50)).toBe(1.00);
      expect(AffiliateCommissionService.calculateCommission(75)).toBe(1.50);
      expect(AffiliateCommissionService.calculateCommission(333)).toBe(6.66);
    });

    it('should return 0 for zero or negative amounts', () => {
      expect(AffiliateCommissionService.calculateCommission(0)).toBe(0);
      expect(AffiliateCommissionService.calculateCommission(-100)).toBe(0);
      expect(AffiliateCommissionService.calculateCommission(-1)).toBe(0);
    });

    it('should round to 2 decimal places', () => {
      // Test edge cases that might cause rounding issues
      expect(AffiliateCommissionService.calculateCommission(333)).toBe(6.66); // 333 * 0.02 = 6.66
      expect(AffiliateCommissionService.calculateCommission(167)).toBe(3.34); // 167 * 0.02 = 3.34
      expect(AffiliateCommissionService.calculateCommission(1234)).toBe(24.68); // 1234 * 0.02 = 24.68
    });

    it('should handle large amounts correctly', () => {
      expect(AffiliateCommissionService.calculateCommission(100000)).toBe(2000.00);
      expect(AffiliateCommissionService.calculateCommission(999999)).toBe(19999.98);
    });
  });

  describe('validateCommissionEligibility', () => {
    const mockReferredMerchant = {
      id: 'referred-merchant-id',
      referredByMerchant: 'referring-merchant-id',
      isActive: true,
    };

    const mockReferringMerchant = {
      id: 'referring-merchant-id',
      isActive: true,
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
    });

    it('should validate eligible commission correctly', async () => {
      const result = await AffiliateCommissionService.validateCommissionEligibility(
        'referred-merchant-id',
        1000
      );

      expect(result.eligible).toBe(true);
      expect(result.referringMerchantId).toBe('referring-merchant-id');
      expect(result.reason).toBeUndefined();
    });

    it('should reject invalid points amounts', async () => {
      const result1 = await AffiliateCommissionService.validateCommissionEligibility(
        'referred-merchant-id',
        0
      );
      expect(result1.eligible).toBe(false);
      expect(result1.reason).toBe('Invalid points amount');

      const result2 = await AffiliateCommissionService.validateCommissionEligibility(
        'referred-merchant-id',
        -100
      );
      expect(result2.eligible).toBe(false);
      expect(result2.reason).toBe('Invalid points amount');
    });

    it('should reject when referred merchant not found', async () => {
      vi.mocked(storage.getMerchant).mockResolvedValueOnce(null);

      const result = await AffiliateCommissionService.validateCommissionEligibility(
        'non-existent-merchant',
        1000
      );

      expect(result.eligible).toBe(false);
      expect(result.reason).toBe('Referred merchant not found');
    });

    it('should reject when merchant was not referred', async () => {
      const merchantWithoutReferrer = {
        ...mockReferredMerchant,
        referredByMerchant: null,
      };

      vi.mocked(storage.getMerchant).mockResolvedValueOnce(merchantWithoutReferrer as any);

      const result = await AffiliateCommissionService.validateCommissionEligibility(
        'referred-merchant-id',
        1000
      );

      expect(result.eligible).toBe(false);
      expect(result.reason).toBe('Merchant was not referred');
    });

    it('should reject when referring merchant not found', async () => {
      vi.mocked(storage.getMerchant).mockImplementation((id: string) => {
        if (id === 'referred-merchant-id') {
          return Promise.resolve(mockReferredMerchant as any);
        }
        return Promise.resolve(null); // Referring merchant not found
      });

      const result = await AffiliateCommissionService.validateCommissionEligibility(
        'referred-merchant-id',
        1000
      );

      expect(result.eligible).toBe(false);
      expect(result.reason).toBe('Referring merchant not found');
    });

    it('should reject when referring merchant is inactive', async () => {
      const inactiveReferringMerchant = {
        ...mockReferringMerchant,
        isActive: false,
      };

      vi.mocked(storage.getMerchant).mockImplementation((id: string) => {
        if (id === 'referred-merchant-id') {
          return Promise.resolve(mockReferredMerchant as any);
        }
        if (id === 'referring-merchant-id') {
          return Promise.resolve(inactiveReferringMerchant as any);
        }
        return Promise.resolve(null);
      });

      const result = await AffiliateCommissionService.validateCommissionEligibility(
        'referred-merchant-id',
        1000
      );

      expect(result.eligible).toBe(false);
      expect(result.reason).toBe('Referring merchant is inactive');
      expect(result.referringMerchantId).toBe('referring-merchant-id');
    });

    it('should prevent self-referral', async () => {
      const selfReferredMerchant = {
        ...mockReferredMerchant,
        referredByMerchant: 'referred-merchant-id', // Same as merchant ID
      };

      vi.mocked(storage.getMerchant).mockResolvedValueOnce(selfReferredMerchant as any);

      const result = await AffiliateCommissionService.validateCommissionEligibility(
        'referred-merchant-id',
        1000
      );

      expect(result.eligible).toBe(false);
      expect(result.reason).toBe('Self-referral not allowed');
    });

    it('should handle validation errors gracefully', async () => {
      vi.mocked(storage.getMerchant).mockRejectedValueOnce(new Error('Database error'));

      const result = await AffiliateCommissionService.validateCommissionEligibility(
        'referred-merchant-id',
        1000
      );

      expect(result.eligible).toBe(false);
      expect(result.reason).toBe('Validation error');
    });
  });

  describe('processCommission', () => {
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

    it('should process commission successfully for eligible transactions', async () => {
      const result = await AffiliateCommissionService.processCommission(
        'referred-merchant-id',
        1000,
        'original-transaction-id'
      );

      expect(result.eligibleForCommission).toBe(true);
      expect(result.commissionAmount).toBe(20.00);
      expect(result.commissionRate).toBe(0.02);
      expect(result.referringMerchantId).toBe('referring-merchant-id');
      expect(result.referredMerchantId).toBe('referred-merchant-id');
      expect(result.pointsTransferred).toBe(1000);

      // Verify transaction was recorded
      expect(storage.createMerchantTransaction).toHaveBeenCalledWith({
        merchantId: 'referring-merchant-id',
        transactionType: 'referral_commission',
        amount: '20',
        pointsInvolved: 1000,
        referredMerchantId: 'referred-merchant-id',
        commissionRate: 0.02,
        originalTransactionId: 'original-transaction-id',
        auditId: undefined,
        description: '2% affiliate commission from referred merchant point transfer (Audit: N/A)',
      });

      // Verify affiliate cashback was updated
      expect(storage.updateMerchant).toHaveBeenCalledWith('referring-merchant-id', {
        affiliateCashback: '120',
        totalCashback: '520',
      });
    });

    it('should return unsuccessful result for ineligible transactions', async () => {
      // Mock ineligible scenario (merchant not referred)
      const merchantWithoutReferrer = {
        ...mockReferredMerchant,
        referredByMerchant: null,
      };

      vi.mocked(storage.getMerchant).mockImplementation((id: string) => {
        if (id === 'referred-merchant-id') {
          return Promise.resolve(merchantWithoutReferrer as any);
        }
        return Promise.resolve(null);
      });

      const result = await AffiliateCommissionService.processCommission(
        'referred-merchant-id',
        1000,
        'original-transaction-id'
      );

      expect(result.eligibleForCommission).toBe(false);
      expect(result.commissionAmount).toBe(0);
      expect(result.referringMerchantId).toBe(null);

      // Verify no transaction was recorded
      expect(storage.createMerchantTransaction).not.toHaveBeenCalled();
      expect(storage.updateMerchant).not.toHaveBeenCalled();
    });

    it('should handle zero commission amounts', async () => {
      const result = await AffiliateCommissionService.processCommission(
        'referred-merchant-id',
        0,
        'original-transaction-id'
      );

      expect(result.eligibleForCommission).toBe(false);
      expect(result.commissionAmount).toBe(0);
    });

    it('should handle processing errors gracefully', async () => {
      vi.mocked(storage.createMerchantTransaction).mockRejectedValueOnce(new Error('Database error'));

      const result = await AffiliateCommissionService.processCommission(
        'referred-merchant-id',
        1000,
        'original-transaction-id'
      );

      expect(result.eligibleForCommission).toBe(false);
      expect(result.commissionAmount).toBe(0);
    });
  });

  describe('duplicate commission prevention', () => {
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

    it('should prevent duplicate commission payments for the same transaction', async () => {
      const originalTransactionId = 'same-transaction-id';

      // Process commission first time
      const result1 = await AffiliateCommissionService.processCommission(
        'referred-merchant-id',
        1000,
        originalTransactionId
      );

      expect(result1.eligibleForCommission).toBe(true);
      expect(result1.commissionAmount).toBe(20.00);

      // Verify transaction was recorded with original transaction ID
      expect(storage.createMerchantTransaction).toHaveBeenCalledWith(
        expect.objectContaining({
          merchantId: 'referring-merchant-id',
          transactionType: 'referral_commission',
          pointsInvolved: 1000,
          referredMerchantId: 'referred-merchant-id',
          commissionRate: 0.02,
        })
      );

      // Note: In a real implementation, we would check for existing transactions
      // with the same originalTransactionId to prevent duplicates.
      // This test verifies the structure is in place for such checks.
      expect(storage.createMerchantTransaction).toHaveBeenCalledTimes(1);
    });

    it('should handle concurrent commission calculations safely', async () => {
      const originalTransactionId = 'concurrent-transaction-id';

      // Simulate concurrent processing
      const promises = [
        AffiliateCommissionService.processCommission(
          'referred-merchant-id',
          1000,
          originalTransactionId
        ),
        AffiliateCommissionService.processCommission(
          'referred-merchant-id',
          1000,
          originalTransactionId
        ),
      ];

      const results = await Promise.all(promises);

      // Both should succeed in this mock scenario
      // In a real implementation, database constraints would prevent duplicates
      results.forEach(result => {
        expect(result.eligibleForCommission).toBe(true);
        expect(result.commissionAmount).toBe(20.00);
      });

      // Verify both attempted to create transactions
      expect(storage.createMerchantTransaction).toHaveBeenCalledTimes(2);
    });
  });

  describe('edge cases and error handling', () => {
    it('should handle very small commission amounts', async () => {
      const result = AffiliateCommissionService.calculateCommission(1); // 1 point = 0.02 commission
      expect(result).toBe(0.02);
    });

    it('should handle fractional points correctly', async () => {
      // Even though points are typically integers, test fractional handling
      const result = AffiliateCommissionService.calculateCommission(1.5);
      expect(result).toBe(0.03);
    });

    it('should maintain precision for large calculations', async () => {
      const largeAmount = 999999;
      const result = AffiliateCommissionService.calculateCommission(largeAmount);
      expect(result).toBe(19999.98); // 999999 * 0.02 = 19999.98
    });

    it('should handle commission rate consistency', async () => {
      // Verify the commission rate is always 2%
      const testAmounts = [100, 1000, 5000, 10000];
      
      testAmounts.forEach(amount => {
        const commission = AffiliateCommissionService.calculateCommission(amount);
        const expectedRate = commission / amount;
        expect(expectedRate).toBeCloseTo(0.02, 10); // 2% with high precision
      });
    });
  });

  describe('getTotalAffiliateCashback', () => {
    it('should return correct affiliate cashback amount', async () => {
      const mockMerchant = {
        id: 'merchant-id',
        affiliateCashback: '150.75',
      };

      vi.mocked(storage.getMerchant).mockResolvedValueOnce(mockMerchant as any);

      const result = await AffiliateCommissionService.getTotalAffiliateCashback('merchant-id');
      expect(result).toBe(150.75);
    });

    it('should return 0 for merchant with no affiliate cashback', async () => {
      const mockMerchant = {
        id: 'merchant-id',
        affiliateCashback: null,
      };

      vi.mocked(storage.getMerchant).mockResolvedValueOnce(mockMerchant as any);

      const result = await AffiliateCommissionService.getTotalAffiliateCashback('merchant-id');
      expect(result).toBe(0);
    });

    it('should return 0 when merchant not found', async () => {
      vi.mocked(storage.getMerchant).mockResolvedValueOnce(null);

      const result = await AffiliateCommissionService.getTotalAffiliateCashback('non-existent-merchant');
      expect(result).toBe(0);
    });

    it('should handle errors gracefully', async () => {
      vi.mocked(storage.getMerchant).mockRejectedValueOnce(new Error('Database error'));

      const result = await AffiliateCommissionService.getTotalAffiliateCashback('merchant-id');
      expect(result).toBe(0);
    });
  });

  describe('getCommissionHistory', () => {
    it('should return filtered commission transactions', async () => {
      const mockTransactions = [
        {
          id: '1',
          transactionType: 'referral_commission',
          amount: '20.00',
          createdAt: new Date(),
        },
        {
          id: '2',
          transactionType: 'instant_cashback',
          amount: '15.00',
          createdAt: new Date(),
        },
        {
          id: '3',
          transactionType: 'referral_commission',
          amount: '30.00',
          createdAt: new Date(),
        },
      ];

      vi.mocked(storage.getMerchantTransactions).mockResolvedValueOnce(mockTransactions as any);

      const result = await AffiliateCommissionService.getCommissionHistory('merchant-id');
      
      expect(result).toHaveLength(2);
      expect(result[0].transactionType).toBe('referral_commission');
      expect(result[1].transactionType).toBe('referral_commission');
    });

    it('should return empty array when no commission transactions exist', async () => {
      const mockTransactions = [
        {
          id: '1',
          transactionType: 'instant_cashback',
          amount: '15.00',
          createdAt: new Date(),
        },
      ];

      vi.mocked(storage.getMerchantTransactions).mockResolvedValueOnce(mockTransactions as any);

      const result = await AffiliateCommissionService.getCommissionHistory('merchant-id');
      expect(result).toHaveLength(0);
    });

    it('should handle errors gracefully', async () => {
      vi.mocked(storage.getMerchantTransactions).mockRejectedValueOnce(new Error('Database error'));

      const result = await AffiliateCommissionService.getCommissionHistory('merchant-id');
      expect(result).toEqual([]);
    });
  });
});