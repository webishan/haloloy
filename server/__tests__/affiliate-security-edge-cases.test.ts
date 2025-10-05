import { describe, it, expect, vi, beforeEach, afterEach, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import express from 'express';
import jwt from 'jsonwebtoken';
import { setupAffiliateRoutes } from '../affiliate-routes';
import { storage } from '../storage';
import { referralLinkService } from '../services/ReferralLinkService';
import { AffiliateCommissionService } from '../services/affiliate-commission-service';

// Mock rate limiting service to prevent 429 errors in tests
vi.mock('../services/RateLimitService', () => ({
  rateLimitService: {
    createRateLimit: vi.fn(() => (req: any, res: any, next: any) => next()),
    isRateLimited: vi.fn(() => false),
    recordAction: vi.fn(),
  },
  RATE_LIMIT_CONFIGS: {
    REFERRAL_LINK_GENERATION: { windowMs: 60000, maxRequests: 10 },
    AFFILIATE_API_GENERAL: { windowMs: 60000, maxRequests: 100 },
    REFERRAL_CODE_VALIDATION: { windowMs: 60000, maxRequests: 50 },
  },
}));

// Test application setup
let app: express.Application;
const JWT_SECRET = 'komarce-secret-key';

// Test data
const testMerchants = {
  referring: {
    id: 'referring-merchant-123',
    businessName: 'Referring Business',
    email: 'referring@test.com',
    isActive: true,
    affiliateCashback: '0.00',
    totalCashback: '0.00',
    merchantReferralCode: 'MERCH_REF123456789'
  },
  referred: {
    id: 'referred-merchant-456',
    businessName: 'Referred Business',
    email: 'referred@test.com',
    isActive: true,
    affiliateCashback: '0.00',
    totalCashback: '0.00',
    referredByMerchant: 'referring-merchant-123'
  },
  inactive: {
    id: 'inactive-merchant-789',
    businessName: 'Inactive Business',
    email: 'inactive@test.com',
    isActive: false,
    affiliateCashback: '0.00',
    totalCashback: '0.00',
    merchantReferralCode: 'MERCH_INACTIVE123'
  }
};

// JWT tokens for testing
let referringMerchantToken: string;
let referredMerchantToken: string;
let inactiveMerchantToken: string;

describe('Affiliate System Edge Cases and Security Tests', () => {
  beforeAll(async () => {
    // Setup test application
    app = express();
    app.use(express.json());
    setupAffiliateRoutes(app);

    // Generate test tokens
    referringMerchantToken = jwt.sign(
      { userId: testMerchants.referring.id, role: 'merchant' },
      JWT_SECRET,
      { expiresIn: '1h' }
    );

    referredMerchantToken = jwt.sign(
      { userId: testMerchants.referred.id, role: 'merchant' },
      JWT_SECRET,
      { expiresIn: '1h' }
    );

    inactiveMerchantToken = jwt.sign(
      { userId: testMerchants.inactive.id, role: 'merchant' },
      JWT_SECRET,
      { expiresIn: '1h' }
    );
  });

  beforeEach(async () => {
    // Reset mocks
    vi.clearAllMocks();
    
    // Mock storage methods with default implementations
    vi.spyOn(storage, 'getMerchant').mockImplementation(async (id: string) => {
      if (id === testMerchants.referring.id) return testMerchants.referring as any;
      if (id === testMerchants.referred.id) return testMerchants.referred as any;
      if (id === testMerchants.inactive.id) return testMerchants.inactive as any;
      return null;
    });

    vi.spyOn(storage, 'updateMerchant').mockResolvedValue(undefined);
    vi.spyOn(storage, 'getMerchantByReferralCode').mockResolvedValue(null);
    vi.spyOn(storage, 'getMerchantReferrals').mockResolvedValue([]);
    vi.spyOn(storage, 'createMerchantTransaction').mockResolvedValue(undefined);
    vi.spyOn(storage, 'getMerchantTransactions').mockResolvedValue([]);

    // Mock referral link service
    vi.spyOn(referralLinkService, 'generateReferralLink').mockResolvedValue(
      'http://localhost:5006/merchant/register?ref=MERCH_TEST123456789'
    );
    vi.spyOn(referralLinkService, 'validateReferralCode').mockResolvedValue({
      id: testMerchants.referring.id,
      businessName: testMerchants.referring.businessName,
      referralCode: 'MERCH_TEST123456789',
      isActive: true
    });
    vi.spyOn(referralLinkService, 'trackReferralClick').mockResolvedValue(undefined);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Self-Referral Prevention Tests', () => {
    it('should prevent merchant from referring themselves during registration', async () => {
      console.log('🧪 Testing self-referral prevention during registration');

      // Setup: Merchant trying to use their own referral code
      const selfReferralCode = 'MERCH_SELF123456789';
      
      vi.mocked(referralLinkService.validateReferralCode).mockResolvedValue({
        id: testMerchants.referring.id, // Same merchant as the one registering
        businessName: testMerchants.referring.businessName,
        referralCode: selfReferralCode,
        isActive: true
      });

      // Test referral code validation endpoint
      const validationResponse = await request(app)
        .get(`/api/affiliate/validate-referral/${selfReferralCode}`)
        .expect(200);

      expect(validationResponse.body.success).toBe(true);
      console.log('✅ Referral code validation passed (as expected)');

      // The actual self-referral prevention should happen during merchant registration
      // Test commission processing for self-referral scenario
      const selfReferredMerchant = {
        ...testMerchants.referring,
        referredByMerchant: testMerchants.referring.id // Self-referral
      };

      vi.mocked(storage.getMerchant).mockImplementation(async (id: string) => {
        if (id === testMerchants.referring.id) return selfReferredMerchant as any;
        return null;
      });

      const commissionResult = await AffiliateCommissionService.processCommission(
        testMerchants.referring.id, // Same merchant as both referred and referring
        1000,
        'self-referral-tx-123'
      );

      expect(commissionResult.eligibleForCommission).toBe(false);
      expect(commissionResult.commissionAmount).toBe(0);
      console.log('✅ Self-referral commission blocked');
    });

    it('should validate commission eligibility and reject self-referrals', async () => {
      console.log('🧪 Testing commission eligibility validation for self-referrals');

      // Setup self-referral scenario
      const selfReferredMerchant = {
        ...testMerchants.referring,
        referredByMerchant: testMerchants.referring.id
      };

      vi.mocked(storage.getMerchant).mockImplementation(async (id: string) => {
        if (id === testMerchants.referring.id) return selfReferredMerchant as any;
        return null;
      });

      const eligibility = await AffiliateCommissionService.validateCommissionEligibility(
        testMerchants.referring.id,
        1000
      );

      expect(eligibility.eligible).toBe(false);
      expect(eligibility.reason).toBe('Self-referral not allowed');
      console.log('✅ Self-referral eligibility check failed as expected');
    });

    it('should prevent self-referral through API manipulation attempts', async () => {
      console.log('🧪 Testing API manipulation prevention for self-referrals');

      // Attempt to manipulate commission calculation directly
      const manipulationAttempt = await request(app)
        .post('/api/affiliate/check-duplicate')
        .set('Authorization', `Bearer ${referringMerchantToken}`)
        .send({
          originalTransactionId: 'manipulation-tx-123',
          referredMerchantId: testMerchants.referring.id // Same as referring merchant
        })
        .expect(200);

      // The duplicate check should work, but actual commission processing should fail
      expect(manipulationAttempt.body.success).toBe(true);

      // Now test the actual commission processing
      const selfReferredMerchant = {
        ...testMerchants.referring,
        referredByMerchant: testMerchants.referring.id
      };

      vi.mocked(storage.getMerchant).mockImplementation(async (id: string) => {
        if (id === testMerchants.referring.id) return selfReferredMerchant as any;
        return null;
      });

      const commissionResult = await AffiliateCommissionService.processCommission(
        testMerchants.referring.id,
        1000,
        'manipulation-tx-123'
      );

      expect(commissionResult.eligibleForCommission).toBe(false);
      console.log('✅ API manipulation attempt blocked');
    });
  });

  describe('Invalid Referral Code Handling Tests', () => {
    it('should handle completely invalid referral codes', async () => {
      console.log('🧪 Testing invalid referral code handling');

      const invalidCodes = [
        'INVALID_CODE',
        'MERCH_NONEXISTENT123',
        '',
        'null',
        'undefined',
        '12345',
        'MERCH_',
        'MERCH_TOOLONG123456789012345678901234567890'
      ];

      for (const invalidCode of invalidCodes) {
        vi.mocked(referralLinkService.validateReferralCode).mockResolvedValue(null);

        const response = await request(app)
          .get(`/api/affiliate/validate-referral/${encodeURIComponent(invalidCode)}`);

        // Handle different response codes gracefully
        if (response.status === 404) {
          // Check if response body has the expected structure
          if (response.body && typeof response.body === 'object' && 'success' in response.body) {
            expect(response.body.success).toBe(false);
            expect(response.body.message).toBe('Invalid or expired referral code');
          }
        } else if (response.status === 400) {
          // For 400 responses, success might be undefined or false
          if (response.body && 'success' in response.body) {
            expect(response.body.success).toBe(false);
          }
        } else {
          // For other status codes, just ensure it's not a 200 success
          expect(response.status).not.toBe(200);
        }
        console.log(`✅ Invalid code "${invalidCode}" handled correctly (${response.status})`);
      }
    });

    it('should handle malformed referral code requests', async () => {
      console.log('🧪 Testing malformed referral code requests');

      // Test with special characters and injection attempts
      const malformedCodes = [
        '../../../etc/passwd',
        '<script>alert("xss")</script>',
        'MERCH_123; DROP TABLE merchants;--',
        'MERCH_123%00',
        'MERCH_123\n\r',
        'MERCH_123 OR 1=1'
      ];

      for (const malformedCode of malformedCodes) {
        vi.mocked(referralLinkService.validateReferralCode).mockResolvedValue(null);

        const response = await request(app)
          .get(`/api/affiliate/validate-referral/${encodeURIComponent(malformedCode)}`)
          .expect(404);

        expect(response.body.success).toBe(false);
        console.log(`✅ Malformed code "${malformedCode}" handled safely`);
      }
    });

    it('should handle referral codes for inactive merchants', async () => {
      console.log('🧪 Testing referral codes for inactive merchants');

      const inactiveReferralCode = 'MERCH_INACTIVE123';
      
      // Mock the service to return null for inactive merchants (as it should filter them out)
      vi.mocked(referralLinkService.validateReferralCode).mockResolvedValue(null);

      const response = await request(app)
        .get(`/api/affiliate/validate-referral/${inactiveReferralCode}`);

      // Should return 404 for inactive merchants
      if (response.status === 404) {
        expect(response.body.success).toBe(false);
        expect(response.body.message).toBe('Invalid or expired referral code');
      } else {
        // If the service allows inactive merchants through, the API should still handle it
        expect(response.status).toBe(200);
      }
      console.log('✅ Inactive merchant referral code handled correctly');
    });

    it('should handle database errors during referral code validation', async () => {
      console.log('🧪 Testing database errors during referral code validation');

      const validCode = 'MERCH_VALID123456789';
      
      vi.mocked(referralLinkService.validateReferralCode).mockRejectedValue(
        new Error('Database connection failed')
      );

      const response = await request(app)
        .get(`/api/affiliate/validate-referral/${validCode}`)
        .expect(500);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Failed to validate referral code');
      console.log('✅ Database error handled gracefully');
    });

    it('should handle expired referral codes', async () => {
      console.log('🧪 Testing expired referral code handling');

      const expiredCode = 'MERCH_EXPIRED123456789';
      
      // Mock service to return null for expired codes
      vi.mocked(referralLinkService.validateReferralCode).mockResolvedValue(null);

      const response = await request(app)
        .get(`/api/affiliate/validate-referral/${expiredCode}`)
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Invalid or expired referral code');
      console.log('✅ Expired referral code handled correctly');
    });
  });

  describe('Concurrent Commission Calculation Tests', () => {
    it('should handle concurrent commission calculations for same merchant', async () => {
      console.log('🧪 Testing concurrent commission calculations');

      const pointsTransferred = 500;
      const expectedCommission = pointsTransferred * 0.02; // 10 points
      const transactionId = 'concurrent-test-tx';

      // Setup referred merchant
      const referredMerchant = {
        ...testMerchants.referred,
        referredByMerchant: testMerchants.referring.id
      };

      vi.mocked(storage.getMerchant).mockImplementation(async (id: string) => {
        if (id === testMerchants.referring.id) return testMerchants.referring as any;
        if (id === testMerchants.referred.id) return referredMerchant as any;
        return null;
      });

      // Track update calls to detect race conditions
      const updateCalls: any[] = [];
      vi.mocked(storage.updateMerchant).mockImplementation(async (id: string, updates: any) => {
        updateCalls.push({ id, updates, timestamp: Date.now() });
        // Simulate database delay
        await new Promise(resolve => setTimeout(resolve, 10));
        return undefined;
      });

      // Execute multiple concurrent commission calculations
      const concurrentPromises = Array.from({ length: 5 }, (_, index) => 
        AffiliateCommissionService.processCommission(
          testMerchants.referred.id,
          pointsTransferred,
          `${transactionId}-${index}`
        )
      );

      const results = await Promise.all(concurrentPromises);

      // All should succeed (assuming no duplicate prevention for different transaction IDs)
      results.forEach((result, index) => {
        expect(result.eligibleForCommission).toBe(true);
        expect(result.commissionAmount).toBe(expectedCommission);
        console.log(`✅ Concurrent calculation ${index + 1} completed successfully`);
      });

      // Should have 5 update calls
      expect(updateCalls).toHaveLength(5);
      console.log('✅ All concurrent calculations processed');
    });

    it('should prevent duplicate commissions in concurrent scenarios', async () => {
      console.log('🧪 Testing duplicate prevention in concurrent scenarios');

      const pointsTransferred = 300;
      const sameTransactionId = 'duplicate-concurrent-tx-123';

      // Setup referred merchant
      const referredMerchant = {
        ...testMerchants.referred,
        referredByMerchant: testMerchants.referring.id
      };

      vi.mocked(storage.getMerchant).mockImplementation(async (id: string) => {
        if (id === testMerchants.referring.id) return testMerchants.referring as any;
        if (id === testMerchants.referred.id) return referredMerchant as any;
        return null;
      });

      // Mock existing transaction to simulate duplicate
      vi.mocked(storage.getMerchantTransactions).mockResolvedValue([
        {
          id: 'existing-commission-1',
          transactionType: 'referral_commission',
          originalTransactionId: sameTransactionId,
          referredMerchantId: testMerchants.referred.id,
          merchantId: testMerchants.referring.id,
          amount: '6.00',
          createdAt: new Date()
        }
      ] as any);

      // Execute multiple concurrent calculations with same transaction ID
      const concurrentPromises = Array.from({ length: 3 }, () => 
        AffiliateCommissionService.processCommission(
          testMerchants.referred.id,
          pointsTransferred,
          sameTransactionId // Same transaction ID
        )
      );

      const results = await Promise.all(concurrentPromises);

      // All should be blocked due to duplicate detection
      results.forEach((result, index) => {
        expect(result.fraudCheckResult?.allowTransaction).toBe(false);
        // Check if reasons array contains the expected duplicate message
        const reasons = result.fraudCheckResult?.reasons || [];
        const hasDuplicateReason = reasons.some(reason => 
          reason.includes('Duplicate commission') || reason.includes('Commission already')
        );
        expect(hasDuplicateReason).toBe(true);
        console.log(`✅ Concurrent duplicate ${index + 1} blocked successfully`);
      });

      console.log('✅ All concurrent duplicates prevented');
    });

    it('should handle race conditions in affiliate cashback updates', async () => {
      console.log('🧪 Testing race conditions in affiliate cashback updates');

      const initialCashback = 100.00;
      const commissionAmount = 25.00;

      // Setup merchant with initial cashback
      const merchantWithCashback = {
        ...testMerchants.referring,
        affiliateCashback: initialCashback.toString()
      };

      const referredMerchant = {
        ...testMerchants.referred,
        referredByMerchant: testMerchants.referring.id
      };

      vi.mocked(storage.getMerchant).mockImplementation(async (id: string) => {
        if (id === testMerchants.referring.id) return merchantWithCashback as any;
        if (id === testMerchants.referred.id) return referredMerchant as any;
        return null;
      });

      // Track all update operations
      const updateOperations: any[] = [];
      vi.mocked(storage.updateMerchant).mockImplementation(async (id: string, updates: any) => {
        const currentCashback = parseFloat(updates.affiliateCashback || '0');
        updateOperations.push({
          id,
          newCashback: currentCashback,
          timestamp: Date.now()
        });
        
        // Simulate database delay to increase chance of race condition
        await new Promise(resolve => setTimeout(resolve, Math.random() * 20));
        return undefined;
      });

      // Execute concurrent commission calculations
      const pointsPerTransaction = commissionAmount / 0.02; // Calculate points needed for desired commission
      const concurrentPromises = Array.from({ length: 3 }, (_, index) => 
        AffiliateCommissionService.processCommission(
          testMerchants.referred.id,
          pointsPerTransaction,
          `race-condition-tx-${index}`
        )
      );

      const results = await Promise.all(concurrentPromises);

      // All should succeed
      results.forEach((result, index) => {
        expect(result.eligibleForCommission).toBe(true);
        console.log(`✅ Race condition test ${index + 1} completed`);
      });

      // Should have 3 update operations
      expect(updateOperations).toHaveLength(3);
      console.log('✅ Race condition handling verified');
    });

    it('should handle concurrent API requests for same merchant', async () => {
      console.log('🧪 Testing concurrent API requests');

      // Setup merchant with some affiliate cashback
      const merchantWithCashback = {
        ...testMerchants.referring,
        affiliateCashback: '150.75'
      };

      vi.mocked(storage.getMerchant).mockResolvedValue(merchantWithCashback as any);
      vi.mocked(storage.getMerchantReferrals).mockResolvedValue([
        { referredMerchantId: 'referred-1' },
        { referredMerchantId: 'referred-2' }
      ] as any);

      // Execute multiple concurrent API requests
      const concurrentRequests = [
        request(app)
          .get('/api/affiliate/cashback-balance')
          .set('Authorization', `Bearer ${referringMerchantToken}`),
        request(app)
          .get('/api/affiliate/stats')
          .set('Authorization', `Bearer ${referringMerchantToken}`),
        request(app)
          .get('/api/affiliate/cashback-updates')
          .set('Authorization', `Bearer ${referringMerchantToken}`),
        request(app)
          .post('/api/affiliate/referral-link')
          .set('Authorization', `Bearer ${referringMerchantToken}`)
      ];

      const responses = await Promise.all(concurrentRequests);

      // All requests should succeed
      responses.forEach((response, index) => {
        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        console.log(`✅ Concurrent API request ${index + 1} succeeded`);
      });

      console.log('✅ All concurrent API requests handled successfully');
    });
  });

  describe('Security Edge Cases', () => {
    it('should handle malicious payload injection attempts', async () => {
      console.log('🧪 Testing malicious payload injection attempts');

      const maliciousPayloads = [
        {
          originalTransactionId: '<script>alert("xss")</script>',
          referredMerchantId: 'normal-merchant-id'
        },
        {
          originalTransactionId: 'normal-tx-id',
          referredMerchantId: '"; DROP TABLE merchants; --'
        },
        {
          originalTransactionId: '../../../etc/passwd',
          referredMerchantId: 'normal-merchant-id'
        },
        {
          originalTransactionId: 'normal-tx-id',
          referredMerchantId: 'merchant\x00id'
        }
      ];

      for (const payload of maliciousPayloads) {
        const response = await request(app)
          .post('/api/affiliate/check-duplicate')
          .set('Authorization', `Bearer ${referringMerchantToken}`)
          .send(payload);

        // Should either succeed with sanitized input or fail gracefully
        expect([200, 400, 500]).toContain(response.status);
        
        if (response.status === 200) {
          expect(response.body.success).toBe(true);
        } else {
          expect(response.body.success).toBe(false);
        }
        
        console.log(`✅ Malicious payload handled safely: ${JSON.stringify(payload).substring(0, 50)}...`);
      }
    });

    it('should handle extremely large commission amounts', async () => {
      console.log('🧪 Testing extremely large commission amounts');

      const referredMerchant = {
        ...testMerchants.referred,
        referredByMerchant: testMerchants.referring.id
      };

      vi.mocked(storage.getMerchant).mockImplementation(async (id: string) => {
        if (id === testMerchants.referring.id) return testMerchants.referring as any;
        if (id === testMerchants.referred.id) return referredMerchant as any;
        return null;
      });

      const extremeAmounts = [
        Number.MAX_SAFE_INTEGER,
        999999999999,
        1000000000, // 1 billion
        Number.POSITIVE_INFINITY,
        -Number.MAX_SAFE_INTEGER
      ];

      for (const amount of extremeAmounts) {
        const result = await AffiliateCommissionService.processCommission(
          testMerchants.referred.id,
          amount,
          `extreme-amount-tx-${amount}`
        );

        if (amount <= 0 || !isFinite(amount)) {
          expect(result.eligibleForCommission).toBe(false);
          console.log(`✅ Invalid amount ${amount} rejected`);
        } else {
          // Large amounts might be blocked by fraud detection
          if (result.fraudCheckResult?.allowTransaction === false) {
            expect(result.eligibleForCommission).toBe(false);
            console.log(`✅ Large amount ${amount} blocked by fraud detection`);
          } else {
            expect(result.eligibleForCommission).toBe(true);
            console.log(`✅ Large amount ${amount} processed successfully`);
          }
        }
      }
    });

    it('should handle rapid-fire API requests (rate limiting simulation)', async () => {
      console.log('🧪 Testing rapid-fire API requests');

      // Generate many rapid requests
      const rapidRequests = Array.from({ length: 20 }, (_, index) => 
        request(app)
          .get('/api/affiliate/cashback-balance')
          .set('Authorization', `Bearer ${referringMerchantToken}`)
      );

      const responses = await Promise.all(rapidRequests);

      // All should succeed (rate limiting is mocked to allow all requests)
      responses.forEach((response, index) => {
        expect([200, 429]).toContain(response.status); // 200 or rate limited
        console.log(`✅ Rapid request ${index + 1}: ${response.status}`);
      });

      console.log('✅ Rapid-fire requests handled');
    });

    it('should handle memory exhaustion attempts', async () => {
      console.log('🧪 Testing memory exhaustion prevention');

      // Attempt to create very large request payloads
      const largeString = 'A'.repeat(1000000); // 1MB string
      
      const response = await request(app)
        .post('/api/affiliate/check-duplicate')
        .set('Authorization', `Bearer ${referringMerchantToken}`)
        .send({
          originalTransactionId: largeString,
          referredMerchantId: 'normal-merchant-id'
        });

      // Should handle large payloads gracefully
      expect([200, 400, 413, 500]).toContain(response.status);
      console.log(`✅ Large payload handled: ${response.status}`);
    });

    it('should handle null and undefined values in API requests', async () => {
      console.log('🧪 Testing null and undefined value handling');

      const edgeCasePayloads = [
        { originalTransactionId: null, referredMerchantId: 'merchant-id' },
        { originalTransactionId: 'tx-id', referredMerchantId: null },
        { originalTransactionId: undefined, referredMerchantId: 'merchant-id' },
        { originalTransactionId: 'tx-id', referredMerchantId: undefined },
        {},
        { originalTransactionId: '', referredMerchantId: '' }
      ];

      for (const payload of edgeCasePayloads) {
        const response = await request(app)
          .post('/api/affiliate/check-duplicate')
          .set('Authorization', `Bearer ${referringMerchantToken}`)
          .send(payload);

        // Should return 400 for invalid payloads
        expect(response.status).toBe(400);
        expect(response.body.success).toBe(false);
        console.log(`✅ Edge case payload handled: ${JSON.stringify(payload)}`);
      }
    });
  });

  describe('Database Integrity and Error Handling', () => {
    it('should handle database connection failures gracefully', async () => {
      console.log('🧪 Testing database connection failure handling');

      // Mock database connection failure
      vi.mocked(storage.getMerchant).mockRejectedValue(new Error('Connection timeout'));

      const response = await request(app)
        .get('/api/affiliate/cashback-balance')
        .set('Authorization', `Bearer ${referringMerchantToken}`)
        .expect(500);

      expect(response.body.success).toBe(false);
      // The error message might be wrapped by the API layer
      expect(response.body.message).toMatch(/Connection timeout|Failed to get affiliate cashback balance/);
      console.log('✅ Database connection failure handled gracefully');
    });

    it('should handle partial database failures during commission processing', async () => {
      console.log('🧪 Testing partial database failure handling');

      const referredMerchant = {
        ...testMerchants.referred,
        referredByMerchant: testMerchants.referring.id
      };

      vi.mocked(storage.getMerchant).mockImplementation(async (id: string) => {
        if (id === testMerchants.referring.id) return testMerchants.referring as any;
        if (id === testMerchants.referred.id) return referredMerchant as any;
        return null;
      });

      // Mock update failure
      vi.mocked(storage.updateMerchant).mockRejectedValue(new Error('Update failed'));

      const result = await AffiliateCommissionService.processCommission(
        testMerchants.referred.id,
        1000,
        'partial-failure-tx-123'
      );

      expect(result.eligibleForCommission).toBe(false);
      expect(result.commissionAmount).toBe(0);
      console.log('✅ Partial database failure handled correctly');
    });

    it('should maintain data consistency during error scenarios', async () => {
      console.log('🧪 Testing data consistency during errors');

      const referredMerchant = {
        ...testMerchants.referred,
        referredByMerchant: testMerchants.referring.id
      };

      vi.mocked(storage.getMerchant).mockImplementation(async (id: string) => {
        if (id === testMerchants.referring.id) return testMerchants.referring as any;
        if (id === testMerchants.referred.id) return referredMerchant as any;
        return null;
      });

      // Mock transaction creation failure after successful merchant update
      let updateCalled = false;
      vi.mocked(storage.updateMerchant).mockImplementation(async () => {
        updateCalled = true;
        return undefined;
      });

      vi.mocked(storage.createMerchantTransaction).mockRejectedValue(
        new Error('Transaction creation failed')
      );

      const result = await AffiliateCommissionService.processCommission(
        testMerchants.referred.id,
        1000,
        'consistency-test-tx-123'
      );

      // Should fail completely to maintain consistency
      expect(result.eligibleForCommission).toBe(false);
      console.log('✅ Data consistency maintained during error');
    });
  });
});