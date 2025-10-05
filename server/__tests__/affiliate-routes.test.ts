import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import request from 'supertest';
import express from 'express';
import jwt from 'jsonwebtoken';
import { setupAffiliateRoutes } from '../affiliate-routes';

// Mock dependencies
vi.mock('../services/ReferralLinkService', () => ({
  referralLinkService: {
    generateReferralLink: vi.fn(),
    validateReferralCode: vi.fn(),
    trackReferralClick: vi.fn(),
  },
}));

vi.mock('../storage', () => ({
  storage: {
    getMerchant: vi.fn(),
    getMerchantReferrals: vi.fn(),
  },
}));

vi.mock('../services/RateLimitService', () => ({
  rateLimitService: {
    createRateLimit: vi.fn(() => (req: any, res: any, next: any) => next()),
  },
  RATE_LIMIT_CONFIGS: {
    REFERRAL_LINK_GENERATION: { windowMs: 60000, maxRequests: 10 },
    AFFILIATE_API_GENERAL: { windowMs: 60000, maxRequests: 100 },
    REFERRAL_CODE_VALIDATION: { windowMs: 60000, maxRequests: 50 },
  },
}));

vi.mock('../services/affiliate-commission-service', () => ({
  AffiliateCommissionService: {
    getCommissionHistory: vi.fn(),
    getCommissionAuditTrail: vi.fn(),
    checkForDuplicateCommission: vi.fn(),
    monitorCommissionPatterns: vi.fn(),
    getFraudPreventionStats: vi.fn(),
    getSuspiciousCommissions: vi.fn(),
  },
}));

const JWT_SECRET = 'komarce-secret-key';

describe('Affiliate Routes', () => {
  let app: express.Application;
  let merchantToken: string;
  let adminToken: string;

  beforeEach(() => {
    vi.clearAllMocks();
    
    app = express();
    app.use(express.json());
    setupAffiliateRoutes(app);

    // Generate test tokens
    merchantToken = jwt.sign(
      { userId: 'test-merchant-id', role: 'merchant' },
      JWT_SECRET,
      { expiresIn: '1h' }
    );

    adminToken = jwt.sign(
      { userId: 'test-admin-id', role: 'admin' },
      JWT_SECRET,
      { expiresIn: '1h' }
    );
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('POST /api/affiliate/referral-link', () => {
    it('should generate referral link for authenticated merchant', async () => {
      const { referralLinkService } = await import('../services/ReferralLinkService');
      vi.mocked(referralLinkService.generateReferralLink).mockResolvedValueOnce(
        'http://localhost:5006/merchant/register?ref=MERCH_TEST123456789'
      );

      const response = await request(app)
        .post('/api/affiliate/referral-link')
        .set('Authorization', `Bearer ${merchantToken}`)
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        referralLink: 'http://localhost:5006/merchant/register?ref=MERCH_TEST123456789',
        message: 'Referral link generated successfully',
      });

      expect(referralLinkService.generateReferralLink).toHaveBeenCalledWith('test-merchant-id');
    });

    it('should return 401 for unauthenticated requests', async () => {
      const response = await request(app)
        .post('/api/affiliate/referral-link')
        .expect(401);

      expect(response.body).toEqual({
        message: 'Access token required',
      });
    });

    it('should return 403 for non-merchant users', async () => {
      const customerToken = jwt.sign(
        { userId: 'test-customer-id', role: 'customer' },
        JWT_SECRET,
        { expiresIn: '1h' }
      );

      const response = await request(app)
        .post('/api/affiliate/referral-link')
        .set('Authorization', `Bearer ${customerToken}`)
        .expect(403);

      expect(response.body).toEqual({
        message: 'Insufficient permissions',
      });
    });

    it('should handle service errors gracefully', async () => {
      const { referralLinkService } = await import('../services/ReferralLinkService');
      vi.mocked(referralLinkService.generateReferralLink).mockRejectedValueOnce(
        new Error('Service error')
      );

      const response = await request(app)
        .post('/api/affiliate/referral-link')
        .set('Authorization', `Bearer ${merchantToken}`)
        .expect(500);

      expect(response.body).toEqual({
        success: false,
        message: 'Service error',
      });
    });
  });

  describe('GET /api/affiliate/referral-link', () => {
    it('should get existing referral link for merchant', async () => {
      const { referralLinkService } = await import('../services/ReferralLinkService');
      vi.mocked(referralLinkService.generateReferralLink).mockResolvedValueOnce(
        'http://localhost:5006/merchant/register?ref=MERCH_EXISTING123'
      );

      const response = await request(app)
        .get('/api/affiliate/referral-link')
        .set('Authorization', `Bearer ${merchantToken}`)
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        referralLink: 'http://localhost:5006/merchant/register?ref=MERCH_EXISTING123',
      });
    });
  });

  describe('GET /api/affiliate/validate-referral/:code', () => {
    it('should validate correct referral code', async () => {
      const { referralLinkService } = await import('../services/ReferralLinkService');
      vi.mocked(referralLinkService.validateReferralCode).mockResolvedValueOnce({
        id: 'referring-merchant-id',
        businessName: 'Referring Business',
        referralCode: 'MERCH_VALID123456789',
        isActive: true,
      });

      vi.mocked(referralLinkService.trackReferralClick).mockResolvedValueOnce();

      const response = await request(app)
        .get('/api/affiliate/validate-referral/MERCH_VALID123456789')
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        referringMerchant: {
          businessName: 'Referring Business',
          referralCode: 'MERCH_VALID123456789',
        },
        message: 'Valid referral code',
      });

      expect(referralLinkService.trackReferralClick).toHaveBeenCalledWith(
        'MERCH_VALID123456789',
        expect.any(String)
      );
    });

    it('should return 404 for invalid referral code', async () => {
      const { referralLinkService } = await import('../services/ReferralLinkService');
      vi.mocked(referralLinkService.validateReferralCode).mockResolvedValueOnce(null);

      const response = await request(app)
        .get('/api/affiliate/validate-referral/MERCH_INVALID123')
        .expect(404);

      expect(response.body).toEqual({
        success: false,
        message: 'Invalid or expired referral code',
      });
    });

    it('should return 400 for missing referral code', async () => {
      const response = await request(app)
        .get('/api/affiliate/validate-referral/')
        .expect(404); // Express returns 404 for missing route parameters
    });

    it('should handle service errors', async () => {
      const { referralLinkService } = await import('../services/ReferralLinkService');
      vi.mocked(referralLinkService.validateReferralCode).mockRejectedValueOnce(
        new Error('Validation service error')
      );

      const response = await request(app)
        .get('/api/affiliate/validate-referral/MERCH_ERROR123456789')
        .expect(500);

      expect(response.body).toEqual({
        success: false,
        message: 'Failed to validate referral code',
      });
    });
  });

  describe('GET /api/affiliate/stats', () => {
    it('should return referral statistics for merchant', async () => {
      const { storage } = await import('../storage');
      const { AffiliateCommissionService } = await import('../services/affiliate-commission-service');

      const mockMerchant = {
        id: 'test-merchant-id',
        affiliateCashback: '150.75',
      };

      const mockReferrals = [
        { referredMerchantId: 'referred-1' },
        { referredMerchantId: 'referred-2' },
      ];

      const mockCommissionHistory = [
        { amount: '20.00' },
        { amount: '30.50' },
      ];

      vi.mocked(storage.getMerchant).mockImplementation((id: string) => {
        if (id === 'test-merchant-id') return Promise.resolve(mockMerchant as any);
        if (id === 'referred-1') return Promise.resolve({ id: 'referred-1', isActive: true } as any);
        if (id === 'referred-2') return Promise.resolve({ id: 'referred-2', isActive: false } as any);
        return Promise.resolve(null);
      });

      vi.mocked(storage.getMerchantReferrals).mockResolvedValueOnce(mockReferrals as any);
      vi.mocked(AffiliateCommissionService.getCommissionHistory).mockResolvedValueOnce(mockCommissionHistory as any);

      const response = await request(app)
        .get('/api/affiliate/stats')
        .set('Authorization', `Bearer ${merchantToken}`)
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        stats: {
          totalReferrals: 2,
          activeReferrals: 1,
          totalCommissionEarned: 50.50,
          currentAffiliateCashback: 150.75,
        },
        message: 'Referral statistics retrieved successfully',
      });
    });

    it('should return 404 for non-existent merchant', async () => {
      const { storage } = await import('../storage');
      vi.mocked(storage.getMerchant).mockResolvedValueOnce(null);

      const response = await request(app)
        .get('/api/affiliate/stats')
        .set('Authorization', `Bearer ${merchantToken}`)
        .expect(404);

      expect(response.body).toEqual({
        success: false,
        message: 'Merchant not found',
      });
    });
  });

  describe('GET /api/affiliate/cashback-balance', () => {
    it('should return affiliate cashback balance', async () => {
      const { storage } = await import('../storage');
      const mockMerchant = {
        id: 'test-merchant-id',
        affiliateCashback: '125.50',
      };

      vi.mocked(storage.getMerchant).mockResolvedValueOnce(mockMerchant as any);

      const response = await request(app)
        .get('/api/affiliate/cashback-balance')
        .set('Authorization', `Bearer ${merchantToken}`)
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        affiliateCashback: 125.50,
        message: 'Affiliate cashback balance retrieved successfully',
      });
    });

    it('should handle null affiliate cashback', async () => {
      const { storage } = await import('../storage');
      const mockMerchant = {
        id: 'test-merchant-id',
        affiliateCashback: null,
      };

      vi.mocked(storage.getMerchant).mockResolvedValueOnce(mockMerchant as any);

      const response = await request(app)
        .get('/api/affiliate/cashback-balance')
        .set('Authorization', `Bearer ${merchantToken}`)
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        affiliateCashback: 0,
        message: 'Affiliate cashback balance retrieved successfully',
      });
    });
  });

  describe('GET /api/affiliate/commission-history', () => {
    it('should return paginated commission history', async () => {
      const { storage } = await import('../storage');
      const { AffiliateCommissionService } = await import('../services/affiliate-commission-service');

      const mockCommissions = [
        {
          id: '1',
          amount: '20.00',
          referredMerchantId: 'referred-1',
          createdAt: new Date(),
        },
        {
          id: '2',
          amount: '30.00',
          referredMerchantId: 'referred-2',
          createdAt: new Date(),
        },
      ];

      vi.mocked(AffiliateCommissionService.getCommissionHistory).mockResolvedValueOnce(mockCommissions as any);
      vi.mocked(storage.getMerchant).mockImplementation((id: string) => {
        if (id === 'referred-1') return Promise.resolve({ businessName: 'Referred Business 1' } as any);
        if (id === 'referred-2') return Promise.resolve({ businessName: 'Referred Business 2' } as any);
        return Promise.resolve(null);
      });

      const response = await request(app)
        .get('/api/affiliate/commission-history?limit=10&offset=0')
        .set('Authorization', `Bearer ${merchantToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.commissions).toHaveLength(2);
      expect(response.body.commissions[0]).toMatchObject({
        id: '1',
        amount: '20.00',
        referredMerchantName: 'Referred Business 1',
        commissionPercentage: '2%',
      });
      expect(response.body.pagination).toEqual({
        total: 2,
        limit: 10,
        offset: 0,
        hasMore: false,
      });
    });

    it('should handle pagination parameters', async () => {
      const { AffiliateCommissionService } = await import('../services/affiliate-commission-service');

      const mockCommissions = Array.from({ length: 100 }, (_, i) => ({
        id: `${i + 1}`,
        amount: '10.00',
        referredMerchantId: 'referred-1',
        createdAt: new Date(),
      }));

      vi.mocked(AffiliateCommissionService.getCommissionHistory).mockResolvedValueOnce(mockCommissions as any);

      const response = await request(app)
        .get('/api/affiliate/commission-history?limit=20&offset=10')
        .set('Authorization', `Bearer ${merchantToken}`)
        .expect(200);

      expect(response.body.pagination).toEqual({
        total: 100,
        limit: 20,
        offset: 10,
        hasMore: true,
      });
    });
  });

  describe('GET /api/affiliate/cashback-updates', () => {
    it('should return real-time cashback updates', async () => {
      const { storage } = await import('../storage');
      const { AffiliateCommissionService } = await import('../services/affiliate-commission-service');

      const mockMerchant = {
        id: 'test-merchant-id',
        affiliateCashback: '200.00',
      };

      const recentCommissions = [
        {
          id: '1',
          amount: '15.00',
          createdAt: new Date(),
        },
        {
          id: '2',
          amount: '25.00',
          createdAt: new Date(),
        },
      ];

      vi.mocked(storage.getMerchant).mockResolvedValueOnce(mockMerchant as any);
      vi.mocked(AffiliateCommissionService.getCommissionHistory).mockResolvedValueOnce(recentCommissions as any);

      const response = await request(app)
        .get('/api/affiliate/cashback-updates')
        .set('Authorization', `Bearer ${merchantToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.updates.currentBalance).toBe(200.00);
      expect(response.body.updates.recentEarnings).toBe(40.00);
      expect(response.body.updates.recentCommissions).toHaveLength(2);
      expect(response.body.updates.lastUpdated).toBeDefined();
    });
  });

  describe('GET /api/affiliate/audit-trail', () => {
    it('should return audit trail for merchant', async () => {
      const { AffiliateCommissionService } = await import('../services/affiliate-commission-service');

      const mockAuditTrail = [
        {
          id: '1',
          action: 'commission_calculated',
          timestamp: new Date(),
          details: 'Commission calculated for transaction',
        },
      ];

      vi.mocked(AffiliateCommissionService.getCommissionAuditTrail).mockReturnValueOnce(mockAuditTrail as any);

      const response = await request(app)
        .get('/api/affiliate/audit-trail?limit=25')
        .set('Authorization', `Bearer ${merchantToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.auditTrail).toHaveLength(1);
      expect(response.body.message).toBe('Audit trail retrieved successfully');

      expect(AffiliateCommissionService.getCommissionAuditTrail).toHaveBeenCalledWith('test-merchant-id', 25);
    });
  });

  describe('POST /api/affiliate/check-duplicate', () => {
    it('should check for duplicate commission', async () => {
      const { AffiliateCommissionService } = await import('../services/affiliate-commission-service');

      const mockDuplicateCheck = {
        isDuplicate: false,
        existingTransactionId: null,
      };

      vi.mocked(AffiliateCommissionService.checkForDuplicateCommission).mockResolvedValueOnce(mockDuplicateCheck as any);

      const response = await request(app)
        .post('/api/affiliate/check-duplicate')
        .set('Authorization', `Bearer ${merchantToken}`)
        .send({
          originalTransactionId: 'test-tx-123',
          referredMerchantId: 'referred-merchant-id',
        })
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        duplicateCheck: mockDuplicateCheck,
        message: 'Duplicate check completed',
      });

      expect(AffiliateCommissionService.checkForDuplicateCommission).toHaveBeenCalledWith(
        'test-tx-123',
        'test-merchant-id',
        'referred-merchant-id'
      );
    });

    it('should return 400 for missing required fields', async () => {
      const response = await request(app)
        .post('/api/affiliate/check-duplicate')
        .set('Authorization', `Bearer ${merchantToken}`)
        .send({
          originalTransactionId: 'test-tx-123',
          // Missing referredMerchantId
        })
        .expect(400);

      expect(response.body).toEqual({
        success: false,
        message: 'originalTransactionId and referredMerchantId are required',
      });
    });
  });

  describe('GET /api/affiliate/pattern-analysis', () => {
    it('should return pattern analysis for merchant', async () => {
      const { AffiliateCommissionService } = await import('../services/affiliate-commission-service');

      const mockPatternAnalysis = {
        isNormal: true,
        riskScore: 0.1,
        patterns: ['normal_commission_rate'],
      };

      vi.mocked(AffiliateCommissionService.monitorCommissionPatterns).mockResolvedValueOnce(mockPatternAnalysis as any);

      const response = await request(app)
        .get('/api/affiliate/pattern-analysis?commissionAmount=50')
        .set('Authorization', `Bearer ${merchantToken}`)
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        patternAnalysis: mockPatternAnalysis,
        message: 'Pattern analysis completed',
      });

      expect(AffiliateCommissionService.monitorCommissionPatterns).toHaveBeenCalledWith('test-merchant-id', 50);
    });

    it('should use default commission amount when not provided', async () => {
      const { AffiliateCommissionService } = await import('../services/affiliate-commission-service');

      vi.mocked(AffiliateCommissionService.monitorCommissionPatterns).mockResolvedValueOnce({} as any);

      await request(app)
        .get('/api/affiliate/pattern-analysis')
        .set('Authorization', `Bearer ${merchantToken}`)
        .expect(200);

      expect(AffiliateCommissionService.monitorCommissionPatterns).toHaveBeenCalledWith('test-merchant-id', 10);
    });
  });

  describe('GET /api/affiliate/fraud-stats', () => {
    it('should return fraud stats for admin', async () => {
      const { AffiliateCommissionService } = await import('../services/affiliate-commission-service');

      const mockFraudStats = {
        totalTransactions: 1000,
        suspiciousTransactions: 5,
        blockedTransactions: 2,
      };

      const mockSuspiciousTransactions = [
        { id: '1', reason: 'High commission rate' },
        { id: '2', reason: 'Unusual pattern' },
      ];

      vi.mocked(AffiliateCommissionService.getFraudPreventionStats).mockReturnValueOnce(mockFraudStats as any);
      vi.mocked(AffiliateCommissionService.getSuspiciousCommissions).mockReturnValueOnce(mockSuspiciousTransactions as any);

      const response = await request(app)
        .get('/api/affiliate/fraud-stats')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        fraudStats: mockFraudStats,
        suspiciousTransactions: mockSuspiciousTransactions,
        message: 'Fraud prevention statistics retrieved successfully',
      });
    });

    it('should return fraud stats for merchant without suspicious transactions', async () => {
      const { AffiliateCommissionService } = await import('../services/affiliate-commission-service');

      const mockFraudStats = {
        totalTransactions: 100,
        suspiciousTransactions: 0,
        blockedTransactions: 0,
      };

      vi.mocked(AffiliateCommissionService.getFraudPreventionStats).mockReturnValueOnce(mockFraudStats as any);

      const response = await request(app)
        .get('/api/affiliate/fraud-stats')
        .set('Authorization', `Bearer ${merchantToken}`)
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        fraudStats: mockFraudStats,
        suspiciousTransactions: [],
        message: 'Fraud prevention statistics retrieved successfully',
      });

      // Should not call getSuspiciousCommissions for merchant role
      expect(AffiliateCommissionService.getSuspiciousCommissions).not.toHaveBeenCalled();
    });
  });

  describe('Authentication and Authorization', () => {
    it('should reject requests with invalid JWT tokens', async () => {
      const invalidToken = 'invalid.jwt.token';

      const response = await request(app)
        .get('/api/affiliate/stats')
        .set('Authorization', `Bearer ${invalidToken}`)
        .expect(403);

      expect(response.body).toEqual({
        message: 'Invalid or expired token',
      });
    });

    it('should reject requests with expired JWT tokens', async () => {
      const expiredToken = jwt.sign(
        { userId: 'test-merchant-id', role: 'merchant' },
        JWT_SECRET,
        { expiresIn: '-1h' } // Expired 1 hour ago
      );

      const response = await request(app)
        .get('/api/affiliate/stats')
        .set('Authorization', `Bearer ${expiredToken}`)
        .expect(403);

      expect(response.body).toEqual({
        message: 'Invalid or expired token',
      });
    });

    it('should handle malformed Authorization headers', async () => {
      const response = await request(app)
        .get('/api/affiliate/stats')
        .set('Authorization', 'InvalidFormat')
        .expect(401);

      expect(response.body).toEqual({
        message: 'Access token required',
      });
    });
  });
});