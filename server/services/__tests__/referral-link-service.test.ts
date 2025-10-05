import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { referralLinkService } from '../ReferralLinkService';
import { storage } from '../../storage';

// Mock the storage module
vi.mock('../../storage', () => ({
  storage: {
    getMerchant: vi.fn(),
    getMerchantByReferralCode: vi.fn(() => Promise.resolve(null)), // Default to no collision
    updateMerchant: vi.fn(),
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

describe('ReferralLinkService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.BASE_URL = 'http://localhost:5006';
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('generateReferralLink', () => {
    const mockMerchant = {
      id: 'test-merchant-id',
      businessName: 'Test Business',
      isActive: true,
      merchantReferralCode: null,
    };

    it('should generate a new referral link for merchant without existing code', async () => {
      vi.mocked(storage.getMerchant).mockResolvedValueOnce(mockMerchant as any);
      vi.mocked(storage.getMerchantByReferralCode).mockResolvedValueOnce(null); // No collision
      vi.mocked(storage.updateMerchant).mockResolvedValueOnce(mockMerchant as any);

      const referralLink = await referralLinkService.generateReferralLink('test-merchant-id');

      expect(referralLink).toMatch(/^http:\/\/localhost:5006\/merchant\/register\?ref=MERCH_[A-F0-9]+$/);
      expect(storage.updateMerchant).toHaveBeenCalledWith('test-merchant-id', {
        merchantReferralCode: expect.stringMatching(/^MERCH_[A-F0-9]+$/)
      });
    });

    it('should return existing referral link if merchant already has secure code', async () => {
      const merchantWithCode = {
        ...mockMerchant,
        merchantReferralCode: 'MERCH_EXISTING123456',
      };

      vi.mocked(storage.getMerchant).mockResolvedValueOnce(merchantWithCode as any);

      const referralLink = await referralLinkService.generateReferralLink('test-merchant-id');

      expect(referralLink).toBe('http://localhost:5006/merchant/register?ref=MERCH_EXISTING123456');
      expect(storage.updateMerchant).not.toHaveBeenCalled();
    });

    it('should regenerate insecure existing referral code', async () => {
      const merchantWithInsecureCode = {
        ...mockMerchant,
        merchantReferralCode: 'INSECURE123', // Doesn't meet security requirements
      };

      vi.mocked(storage.getMerchant).mockResolvedValueOnce(merchantWithInsecureCode as any);
      vi.mocked(storage.getMerchantByReferralCode).mockResolvedValueOnce(null); // No collision
      vi.mocked(storage.updateMerchant).mockResolvedValueOnce(merchantWithInsecureCode as any);

      const referralLink = await referralLinkService.generateReferralLink('test-merchant-id');

      expect(referralLink).toMatch(/^http:\/\/localhost:5006\/merchant\/register\?ref=MERCH_[A-F0-9]+$/);
      expect(storage.updateMerchant).toHaveBeenCalledWith('test-merchant-id', {
        merchantReferralCode: expect.stringMatching(/^MERCH_[A-F0-9]+$/)
      });
    });

    it('should throw error for non-existent merchant', async () => {
      vi.mocked(storage.getMerchant).mockResolvedValueOnce(null);

      await expect(referralLinkService.generateReferralLink('non-existent-merchant'))
        .rejects.toThrow('Merchant not found');
    });

    it('should throw error for inactive merchant', async () => {
      const inactiveMerchant = {
        ...mockMerchant,
        isActive: false,
      };

      vi.mocked(storage.getMerchant).mockResolvedValueOnce(inactiveMerchant as any);

      await expect(referralLinkService.generateReferralLink('test-merchant-id'))
        .rejects.toThrow('Inactive merchants cannot generate referral links');
    });

    it('should handle rate limiting', async () => {
      const { rateLimitService } = await import('../RateLimitService');
      vi.mocked(rateLimitService.isRateLimited).mockReturnValueOnce(true);

      await expect(referralLinkService.generateReferralLink('test-merchant-id'))
        .rejects.toThrow('Rate limit exceeded for referral link generation');
    });
  });

  describe('validateReferralCode', () => {
    const mockMerchant = {
      id: 'test-merchant-id',
      businessName: 'Test Business',
      isActive: true,
      isBlocked: false,
      merchantReferralCode: 'MERCH_VALID123456789',
    };

    it('should validate correct referral code', async () => {
      // Use a properly formatted secure referral code
      const secureCode = 'MERCH_ABCDEF123456789A';
      const merchantWithSecureCode = {
        ...mockMerchant,
        merchantReferralCode: secureCode,
      };
      
      vi.mocked(storage.getMerchantByReferralCode).mockResolvedValueOnce(merchantWithSecureCode as any);

      const result = await referralLinkService.validateReferralCode(secureCode);

      expect(result).toEqual({
        id: 'test-merchant-id',
        businessName: 'Test Business',
        referralCode: secureCode,
        isActive: true,
      });
    });

    it('should return null for empty or invalid input', async () => {
      expect(await referralLinkService.validateReferralCode('')).toBeNull();
      expect(await referralLinkService.validateReferralCode('   ')).toBeNull();
      expect(await referralLinkService.validateReferralCode(null as any)).toBeNull();
      expect(await referralLinkService.validateReferralCode(undefined as any)).toBeNull();
    });

    it('should sanitize and reject malicious codes', async () => {
      const maliciousCode = 'MERCH_123<script>alert("xss")</script>';
      const result = await referralLinkService.validateReferralCode(maliciousCode);
      expect(result).toBeNull();
    });

    it('should reject insecure referral code formats', async () => {
      const insecureCodes = [
        'INVALID_FORMAT',
        'MERCH_',
        'MERCH_123', // Too short
        'merch_123456789012', // Lowercase
      ];

      for (const code of insecureCodes) {
        const result = await referralLinkService.validateReferralCode(code);
        expect(result).toBeNull();
      }
    });

    it('should return null for non-existent referral code', async () => {
      vi.mocked(storage.getMerchantByReferralCode).mockResolvedValueOnce(null);

      const result = await referralLinkService.validateReferralCode('MERCH_NONEXISTENT123');
      expect(result).toBeNull();
    });

    it('should return null for inactive merchant', async () => {
      const inactiveMerchant = {
        ...mockMerchant,
        isActive: false,
      };

      vi.mocked(storage.getMerchantByReferralCode).mockResolvedValueOnce(inactiveMerchant as any);

      const result = await referralLinkService.validateReferralCode('MERCH_INACTIVE123456');
      expect(result).toBeNull();
    });

    it('should return null for blocked merchant', async () => {
      const blockedMerchant = {
        ...mockMerchant,
        isBlocked: true,
      };

      vi.mocked(storage.getMerchantByReferralCode).mockResolvedValueOnce(blockedMerchant as any);

      const result = await referralLinkService.validateReferralCode('MERCH_BLOCKED123456');
      expect(result).toBeNull();
    });

    it('should handle database errors gracefully', async () => {
      vi.mocked(storage.getMerchantByReferralCode).mockRejectedValueOnce(new Error('Database error'));

      const result = await referralLinkService.validateReferralCode('MERCH_ERROR123456789');
      expect(result).toBeNull();
    });
  });

  describe('trackReferralClick', () => {
    it('should track referral clicks without throwing errors', async () => {
      await expect(
        referralLinkService.trackReferralClick('MERCH_TRACK123456789', '192.168.1.1')
      ).resolves.not.toThrow();
    });

    it('should sanitize malicious inputs', async () => {
      const maliciousCode = 'MERCH_123<script>alert("xss")</script>';
      const maliciousIP = '192.168.1.1; rm -rf /';

      await expect(
        referralLinkService.trackReferralClick(maliciousCode, maliciousIP)
      ).resolves.not.toThrow();
    });

    it('should handle null and undefined inputs', async () => {
      await expect(
        referralLinkService.trackReferralClick(null as any, null as any)
      ).resolves.not.toThrow();

      await expect(
        referralLinkService.trackReferralClick(undefined as any, undefined as any)
      ).resolves.not.toThrow();
    });
  });

  describe('isReferralCodeSecure', () => {
    it('should validate secure referral codes', () => {
      const secureCodes = [
        'MERCH_A1B2C3D4E5F6',
        'MERCH_123456789012',
        'MERCH_ABCDEF123456',
        'MERCH_1234567890ABCDEF',
      ];

      secureCodes.forEach(code => {
        expect(referralLinkService.isReferralCodeSecure(code)).toBe(true);
      });
    });

    it('should reject insecure referral codes', () => {
      const insecureCodes = [
        '',
        'MERCH_',
        'MERCH_123', // Too short
        'merch_123456789012', // Lowercase
        'MERCH_123456789012!', // Special characters
        'NOTMERCH_123456789012', // Wrong prefix
        'MERCH_GHIJKLMNOPQR', // Non-hex characters
        null,
        undefined,
      ];

      insecureCodes.forEach(code => {
        expect(referralLinkService.isReferralCodeSecure(code as any)).toBe(false);
      });
    });
  });

  describe('generateSecureReferralCode', () => {
    it('should generate unique secure referral codes', async () => {
      vi.mocked(storage.getMerchantByReferralCode).mockResolvedValue(null); // No collision

      const codes = await Promise.all(
        Array.from({ length: 10 }, () => referralLinkService.generateSecureReferralCode())
      );

      // All codes should be unique
      const uniqueCodes = new Set(codes);
      expect(uniqueCodes.size).toBe(10);

      // All codes should be secure
      codes.forEach(code => {
        expect(referralLinkService.isReferralCodeSecure(code)).toBe(true);
        expect(code).toMatch(/^MERCH_[A-F0-9]+$/);
        expect(code.length).toBeGreaterThanOrEqual(18);
      });
    });

    it('should handle code collisions and retry', async () => {
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

    it('should handle database errors during collision check', async () => {
      vi.mocked(storage.getMerchantByReferralCode).mockRejectedValue(new Error('Database error'));

      await expect(referralLinkService.generateSecureReferralCode()).rejects.toThrow(
        'Failed to generate unique secure referral code after 20 attempts'
      );
    });
  });

  describe('Environment configuration', () => {
    it('should use custom BASE_URL when provided', async () => {
      process.env.BASE_URL = 'https://custom-domain.com';
      
      const mockMerchant = {
        id: 'test-merchant-id',
        businessName: 'Test Business',
        isActive: true,
        merchantReferralCode: 'MERCH_CUSTOM123456789',
      };

      vi.mocked(storage.getMerchant).mockResolvedValueOnce(mockMerchant as any);

      const referralLink = await referralLinkService.generateReferralLink('test-merchant-id');

      expect(referralLink).toBe('https://custom-domain.com/merchant/register?ref=MERCH_CUSTOM123456789');
    });

    it('should fallback to default BASE_URL when not provided', async () => {
      delete process.env.BASE_URL;
      
      const mockMerchant = {
        id: 'test-merchant-id',
        businessName: 'Test Business',
        isActive: true,
        merchantReferralCode: 'MERCH_DEFAULT123456789',
      };

      vi.mocked(storage.getMerchant).mockResolvedValueOnce(mockMerchant as any);

      const referralLink = await referralLinkService.generateReferralLink('test-merchant-id');

      expect(referralLink).toBe('http://localhost:5006/merchant/register?ref=MERCH_DEFAULT123456789');
    });
  });
});