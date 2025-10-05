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
    validateMerchantReferralCode: vi.fn(),
    establishMerchantReferralRelationship: vi.fn(),
    getMerchantReferrals: vi.fn(),
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

describe('Referral Integration Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.BASE_URL = 'http://localhost:5006';
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Complete referral process from link generation to commission', () => {
    const mockReferringMerchant = {
      id: 'referring-merchant-id',
      businessName: 'Referring Business',
      isActive: true,
      isBlocked: false,
      merchantReferralCode: null,
      affiliateCashback: '100.00',
      totalCashback: '500.00',
    };

    const mockReferredMerchant = {
      id: 'referred-merchant-id',
      businessName: 'Referred Business',
      isActive: true,
      referredByMerchant: 'referring-merchant-id',
    };

    it('should complete full referral flow: generate link → validate → register → earn commission', async () => {
      // Step 1: Generate referral link
      vi.mocked(storage.getMerchant).mockResolvedValueOnce(mockReferringMerchant as any);
      vi.mocked(storage.getMerchantByReferralCode).mockResolvedValue(null); // No collision for all attempts
      vi.mocked(storage.updateMerchant).mockResolvedValueOnce(mockReferringMerchant as any);

      const referralLink = await referralLinkService.generateReferralLink('referring-merchant-id');
      
      expect(referralLink).toMatch(/http:\/\/localhost:5006\/merchant\/register\?ref=MERCH_[A-F0-9]+/);
      expect(storage.updateMerchant).toHaveBeenCalledWith('referring-merchant-id', {
        merchantReferralCode: expect.stringMatching(/^MERCH_[A-F0-9]+$/)
      });

      // Extract referral code from link
      const referralCode = referralLink.split('ref=')[1];

      // Step 2: Validate referral code
      const updatedReferringMerchant = {
        ...mockReferringMerchant,
        merchantReferralCode: referralCode,
      };
      vi.mocked(storage.getMerchantByReferralCode).mockResolvedValueOnce(updatedReferringMerchant as any);

      const validationResult = await referralLinkService.validateReferralCode(referralCode);
      
      expect(validationResult).toEqual({
        id: 'referring-merchant-id',
        businessName: 'Referring Business',
        referralCode: referralCode,
        isActive: true,
      });

      // Step 3: Simulate merchant registration with referral
      vi.mocked(storage.validateMerchantReferralCode).mockResolvedValueOnce({
        isValid: true,
        referringMerchant: updatedReferringMerchant,
      } as any);

      const referralValidation = await storage.validateMerchantReferralCode(referralCode, 'referred-merchant-id');
      expect(referralValidation.isValid).toBe(true);
      expect(referralValidation.referringMerchant.id).toBe('referring-merchant-id');

      // Step 4: Process commission when referred merchant transfers points
      vi.mocked(storage.getMerchant).mockImplementation((id: string) => {
        if (id === 'referred-merchant-id') {
          return Promise.resolve(mockReferredMerchant as any);
        }
        if (id === 'referring-merchant-id') {
          return Promise.resolve(updatedReferringMerchant as any);
        }
        return Promise.resolve(null);
      });

      vi.mocked(storage.createMerchantTransaction).mockResolvedValueOnce({
        id: 'commission-transaction-id',
        merchantId: 'referring-merchant-id',
        transactionType: 'referral_commission',
        amount: '20.00',
        createdAt: new Date(),
      } as any);

      const commissionResult = await AffiliateCommissionService.processCommission(
        'referred-merchant-id',
        1000,
        'original-transaction-id'
      );

      expect(commissionResult.eligibleForCommission).toBe(true);
      expect(commissionResult.commissionAmount).toBe(20.00);
      expect(commissionResult.referringMerchantId).toBe('referring-merchant-id');

      // Verify commission transaction was recorded
      expect(storage.createMerchantTransaction).toHaveBeenCalledWith({
        merchantId: 'referring-merchant-id',
        transactionType: 'referral_commission',
        amount: '20',
        pointsInvolved: 1000,
        referredMerchantId: 'referred-merchant-id',
        commissionRate: 0.02,
        description: '2% affiliate commission from referred merchant point transfer',
      });

      // Verify affiliate cashback was updated
      expect(storage.updateMerchant).toHaveBeenCalledWith('referring-merchant-id', {
        affiliateCashback: '120',
        totalCashback: '520',
      });
    });

    it('should handle referral flow with existing referral code', async () => {
      // Merchant already has a referral code
      const merchantWithCode = {
        ...mockReferringMerchant,
        merchantReferralCode: 'MERCH_EXISTING123',
      };

      vi.mocked(storage.getMerchant).mockResolvedValueOnce(merchantWithCode as any);

      const referralLink = await referralLinkService.generateReferralLink('referring-merchant-id');
      
      expect(referralLink).toBe('http://localhost:5006/merchant/register?ref=MERCH_EXISTING123');
      // Should not call updateMerchant since code already exists
      expect(storage.updateMerchant).not.toHaveBeenCalled();
    });

    it('should handle referral flow with insecure existing code', async () => {
      // Merchant has an insecure referral code that needs regeneration
      const merchantWithInsecureCode = {
        ...mockReferringMerchant,
        merchantReferralCode: 'INSECURE123', // Doesn't meet security requirements
      };

      vi.mocked(storage.getMerchant).mockResolvedValueOnce(merchantWithInsecureCode as any);
      vi.mocked(storage.getMerchantByReferralCode).mockResolvedValue(null); // No collision for all attempts
      vi.mocked(storage.updateMerchant).mockResolvedValueOnce(merchantWithInsecureCode as any);

      const referralLink = await referralLinkService.generateReferralLink('referring-merchant-id');
      
      expect(referralLink).toMatch(/http:\/\/localhost:5006\/merchant\/register\?ref=MERCH_[A-F0-9]+/);
      expect(storage.updateMerchant).toHaveBeenCalledWith('referring-merchant-id', {
        merchantReferralCode: expect.stringMatching(/^MERCH_[A-F0-9]+$/)
      });
    });
  });

  describe('Real-time UI updates during commission earning', () => {
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

    it('should update affiliate cashback balance in real-time', async () => {
      const initialBalance = parseFloat(mockReferringMerchant.affiliateCashback);
      const pointsTransferred = 1000;
      const expectedCommission = 20.00;
      const expectedNewBalance = initialBalance + expectedCommission;

      const result = await AffiliateCommissionService.processCommission(
        'referred-merchant-id',
        pointsTransferred,
        'transaction-id'
      );

      expect(result.eligibleForCommission).toBe(true);
      expect(result.commissionAmount).toBe(expectedCommission);

      // Verify real-time balance update
      expect(storage.updateMerchant).toHaveBeenCalledWith('referring-merchant-id', {
        affiliateCashback: expectedNewBalance.toString(),
        totalCashback: (parseFloat(mockReferringMerchant.totalCashback) + expectedCommission).toString(),
      });
    });

    it('should handle multiple rapid commission updates', async () => {
      const transactions = [
        { id: 'tx1', points: 500 },
        { id: 'tx2', points: 750 },
        { id: 'tx3', points: 1000 },
      ];

      const results = await Promise.all(
        transactions.map(tx => 
          AffiliateCommissionService.processCommission(
            'referred-merchant-id',
            tx.points,
            tx.id
          )
        )
      );

      // All should succeed
      results.forEach((result, index) => {
        expect(result.eligibleForCommission).toBe(true);
        expect(result.commissionAmount).toBe(transactions[index].points * 0.02);
      });

      // Verify all transactions were recorded
      expect(storage.createMerchantTransaction).toHaveBeenCalledTimes(3);
      expect(storage.updateMerchant).toHaveBeenCalledTimes(3);
    });

    it('should maintain data consistency during concurrent updates', async () => {
      // Simulate concurrent commission processing
      const concurrentPromises = Array.from({ length: 5 }, (_, i) =>
        AffiliateCommissionService.processCommission(
          'referred-merchant-id',
          1000,
          `concurrent-tx-${i}`
        )
      );

      const results = await Promise.all(concurrentPromises);

      // All should succeed in this mock scenario
      results.forEach(result => {
        expect(result.eligibleForCommission).toBe(true);
        expect(result.commissionAmount).toBe(20.00);
      });

      // Verify all attempted to update
      expect(storage.createMerchantTransaction).toHaveBeenCalledTimes(5);
      expect(storage.updateMerchant).toHaveBeenCalledTimes(5);
    });
  });

  describe('Database transaction integrity', () => {
    it('should handle database transaction failures gracefully', async () => {
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

      // Simulate database transaction failure
      vi.mocked(storage.createMerchantTransaction).mockRejectedValueOnce(new Error('Database transaction failed'));

      const result = await AffiliateCommissionService.processCommission(
        'referred-merchant-id',
        1000,
        'failed-transaction-id'
      );

      expect(result.eligibleForCommission).toBe(false);
      expect(result.commissionAmount).toBe(0);

      // Verify no partial updates occurred
      expect(storage.updateMerchant).not.toHaveBeenCalled();
    });

    it('should handle merchant update failures after transaction creation', async () => {
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

      vi.mocked(storage.createMerchantTransaction).mockResolvedValueOnce({
        id: 'transaction-id',
        merchantId: 'referring-merchant-id',
        transactionType: 'referral_commission',
        amount: '20.00',
        createdAt: new Date(),
      } as any);

      // Simulate merchant update failure
      vi.mocked(storage.updateMerchant).mockRejectedValueOnce(new Error('Merchant update failed'));

      const result = await AffiliateCommissionService.processCommission(
        'referred-merchant-id',
        1000,
        'update-failed-transaction-id'
      );

      // Should still fail gracefully
      expect(result.eligibleForCommission).toBe(false);
      expect(result.commissionAmount).toBe(0);
    });

    it('should validate referral relationships before processing', async () => {
      const mockReferredMerchant = {
        id: 'referred-merchant-id',
        referredByMerchant: 'different-merchant-id', // Wrong referrer
        isActive: true,
      };

      vi.mocked(storage.getMerchant).mockResolvedValueOnce(mockReferredMerchant as any);

      const result = await AffiliateCommissionService.processCommission(
        'referred-merchant-id',
        1000,
        'invalid-relationship-tx'
      );

      expect(result.eligibleForCommission).toBe(false);
      expect(result.commissionAmount).toBe(0);

      // Verify no transactions were created
      expect(storage.createMerchantTransaction).not.toHaveBeenCalled();
      expect(storage.updateMerchant).not.toHaveBeenCalled();
    });
  });

  describe('Error handling and edge cases', () => {
    it('should handle network timeouts gracefully', async () => {
      vi.mocked(storage.getMerchant).mockImplementation(() => 
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Network timeout')), 100)
        )
      );

      const result = await AffiliateCommissionService.processCommission(
        'referred-merchant-id',
        1000,
        'timeout-transaction-id'
      );

      expect(result.eligibleForCommission).toBe(false);
      expect(result.commissionAmount).toBe(0);
    });

    it('should handle invalid merchant IDs', async () => {
      vi.mocked(storage.getMerchant).mockResolvedValueOnce(null);

      const result = await AffiliateCommissionService.processCommission(
        'non-existent-merchant',
        1000,
        'invalid-merchant-tx'
      );

      expect(result.eligibleForCommission).toBe(false);
      expect(result.commissionAmount).toBe(0);
    });

    it('should handle zero and negative point amounts', async () => {
      const mockReferredMerchant = {
        id: 'referred-merchant-id',
        referredByMerchant: 'referring-merchant-id',
        isActive: true,
      };

      vi.mocked(storage.getMerchant).mockResolvedValueOnce(mockReferredMerchant as any);

      // Test zero points
      const zeroResult = await AffiliateCommissionService.processCommission(
        'referred-merchant-id',
        0,
        'zero-points-tx'
      );

      expect(zeroResult.eligibleForCommission).toBe(false);
      expect(zeroResult.commissionAmount).toBe(0);

      // Test negative points
      const negativeResult = await AffiliateCommissionService.processCommission(
        'referred-merchant-id',
        -100,
        'negative-points-tx'
      );

      expect(negativeResult.eligibleForCommission).toBe(false);
      expect(negativeResult.commissionAmount).toBe(0);
    });
  });
});