import { storage } from "../storage";
import crypto from "crypto";
import { rateLimitService, RATE_LIMIT_CONFIGS } from "./RateLimitService";

export interface ReferralLinkService {
  generateReferralLink(merchantId: string): Promise<string>;
  validateReferralCode(referralCode: string): Promise<any | null>;
  trackReferralClick(referralCode: string, ipAddress: string): Promise<void>;
  isReferralCodeSecure(referralCode: string): boolean;
  generateSecureReferralCode(): Promise<string>;
}

export class ReferralLinkServiceImpl implements ReferralLinkService {
  private readonly baseUrl: string;

  constructor() {
    this.baseUrl = process.env.BASE_URL || "http://localhost:5006";
  }

  /**
   * Generate a unique referral link for a merchant with rate limiting
   */
  async generateReferralLink(merchantId: string): Promise<string> {
    try {
      // Check rate limiting for referral link generation
      if (rateLimitService.isRateLimited(merchantId, 'referral_link_generation', RATE_LIMIT_CONFIGS.REFERRAL_LINK_GENERATION)) {
        throw new Error("Rate limit exceeded for referral link generation. Please try again later.");
      }

      // Get merchant to ensure they exist and are active (merchantId is actually userId)
      const merchant = await storage.getMerchant(merchantId);
      if (!merchant) {
        throw new Error("Merchant not found");
      }

      if (!merchant.isActive) {
        throw new Error("Inactive merchants cannot generate referral links");
      }

      // Fix missing referral code for existing merchants
      if (!merchant.merchantReferralCode) {
        console.log(`🔧 Fixing missing referral code for merchant ${merchant.businessName}`);
        const newReferralCode = await storage.generateMerchantReferralCode(merchantId);
        await storage.updateMerchant(merchantId, {
          merchantReferralCode: newReferralCode
        });
        merchant.merchantReferralCode = newReferralCode;
        console.log(`✅ Generated referral code: ${newReferralCode}`);
      }

      // Check if merchant already has a referral code
      if (merchant.merchantReferralCode) {
        // Validate existing code security
        if (!this.isReferralCodeSecure(merchant.merchantReferralCode)) {
          console.warn(`Insecure referral code detected for merchant ${merchantId}, regenerating...`);
          // Generate new secure code
          const newReferralCode = await this.generateSecureReferralCode();
          await storage.updateMerchant(merchantId, {
            merchantReferralCode: newReferralCode
          });
          
          // Record the action for rate limiting
          rateLimitService.recordAction(merchantId, 'referral_link_generation', RATE_LIMIT_CONFIGS.REFERRAL_LINK_GENERATION);
          
          return `${this.baseUrl}/merchant/register?ref=${newReferralCode}`;
        }
        
        return `${this.baseUrl}/merchant/register?ref=${merchant.merchantReferralCode}`;
      }

      // Generate secure unique referral code
      const referralCode = await this.generateSecureReferralCode();
      
      // Update merchant with referral code
      await storage.updateMerchant(merchantId, {
        merchantReferralCode: referralCode
      });

      // Record the action for rate limiting
      rateLimitService.recordAction(merchantId, 'referral_link_generation', RATE_LIMIT_CONFIGS.REFERRAL_LINK_GENERATION);

      console.log(`✅ Secure referral link generated for merchant ${merchantId}: ${referralCode}`);
      
      return `${this.baseUrl}/merchant/register?ref=${referralCode}`;
    } catch (error) {
      console.error("Error generating referral link:", error);
      throw error;
    }
  }

  /**
   * Validate a referral code with enhanced security checks
   */
  async validateReferralCode(referralCode: string): Promise<any | null> {
    try {
      // Input validation
      if (!referralCode || referralCode.trim() === "") {
        console.warn("Empty referral code validation attempt");
        return null;
      }

      // Sanitize input to prevent injection attacks
      const sanitizedCode = referralCode.trim().replace(/[^A-Z0-9_]/g, '');
      if (sanitizedCode !== referralCode.trim()) {
        console.warn(`Potentially malicious referral code detected: ${referralCode}`);
        return null;
      }

      // Check if referral code format is secure
      if (!this.isReferralCodeSecure(sanitizedCode)) {
        console.warn(`Insecure referral code format detected: ${sanitizedCode}`);
        return null;
      }

      // Find merchant by referral code
      const merchant = await storage.getMerchantByReferralCode(sanitizedCode);
      if (!merchant) {
        console.log(`Referral code not found: ${sanitizedCode}`);
        return null;
      }

      // Check if merchant is active
      if (!merchant.isActive) {
        console.log(`Referral code belongs to inactive merchant: ${sanitizedCode}`);
        return null;
      }

      // Additional security check: ensure merchant account is in good standing
      if (merchant.isBlocked) {
        console.warn(`Referral code belongs to blocked merchant: ${sanitizedCode}`);
        return null;
      }

      console.log(`✅ Valid referral code validated: ${sanitizedCode} for merchant ${merchant.businessName}`);

      return {
        id: merchant.id,
        businessName: merchant.businessName,
        referralCode: merchant.merchantReferralCode,
        isActive: merchant.isActive
      };
    } catch (error) {
      console.error("Error validating referral code:", error);
      return null;
    }
  }

  /**
   * Track referral link clicks with enhanced security logging
   */
  async trackReferralClick(referralCode: string, ipAddress: string): Promise<void> {
    try {
      // Sanitize inputs
      const sanitizedCode = referralCode?.trim().replace(/[^A-Z0-9_]/g, '') || 'unknown';
      const sanitizedIP = ipAddress?.replace(/[^0-9a-fA-F:.]/g, '') || 'unknown';
      
      // Enhanced logging with timestamp and security context
      const timestamp = new Date().toISOString();
      console.log(`🔍 Referral click tracked: ${sanitizedCode} from ${sanitizedIP} at ${timestamp}`);
      
      // Log potential security issues
      if (sanitizedCode !== referralCode?.trim()) {
        console.warn(`⚠️ Potentially malicious referral code in click tracking: original="${referralCode}", sanitized="${sanitizedCode}"`);
      }
      
      // Future enhancement: Store in audit table for security analysis
      // This would include: timestamp, referral_code, ip_address, user_agent, etc.
      
    } catch (error) {
      console.error("Error tracking referral click:", error);
      // Don't throw error for tracking failures to avoid disrupting user flow
    }
  }

  /**
   * Check if a referral code meets security requirements
   */
  public isReferralCodeSecure(referralCode: string): boolean {
    if (!referralCode) return false;
    
    // Must start with MERCH_ prefix
    if (!referralCode.startsWith('MERCH_')) return false;
    
    // Must be at least 14 characters (MERCH_ + 8 hex chars) for backward compatibility
    if (referralCode.length < 14) return false;
    
    // Must contain only uppercase letters, numbers, and underscores
    if (!/^[A-Z0-9_]+$/.test(referralCode)) return false;
    
    // Extract the random part (after MERCH_)
    const randomPart = referralCode.substring(6);
    
    // Random part must be at least 8 characters for security (reduced from 12 for compatibility)
    if (randomPart.length < 8) return false;
    
    // Random part should be hexadecimal
    if (!/^[A-F0-9]+$/.test(randomPart)) return false;
    
    return true;
  }

  /**
   * Generate a cryptographically secure unique referral code
   */
  public async generateSecureReferralCode(): Promise<string> {
    let attempts = 0;
    const maxAttempts = 20; // Increased attempts for better reliability

    while (attempts < maxAttempts) {
      try {
        // Generate 8 bytes (16 hex characters) of cryptographically secure random data
        const randomBytes = crypto.randomBytes(8);
        const randomHex = randomBytes.toString('hex').toUpperCase();
        
        // Add timestamp component for additional uniqueness (last 4 chars of timestamp)
        const timestamp = Date.now().toString(36).toUpperCase().slice(-4);
        
        const referralCode = `MERCH_${randomHex}${timestamp}`;

        // Verify the generated code meets security requirements
        if (!this.isReferralCodeSecure(referralCode)) {
          console.warn(`Generated referral code failed security check: ${referralCode}`);
          attempts++;
          continue;
        }

        // Check if code already exists
        const existingMerchant = await storage.getMerchantByReferralCode(referralCode);
        if (!existingMerchant) {
          console.log(`✅ Secure referral code generated: ${referralCode}`);
          return referralCode;
        }

        console.log(`Referral code collision detected: ${referralCode}, retrying...`);
        attempts++;
      } catch (error) {
        console.error(`Error generating secure referral code (attempt ${attempts + 1}):`, error);
        attempts++;
      }
    }

    throw new Error(`Failed to generate unique secure referral code after ${maxAttempts} attempts`);
  }

  /**
   * Legacy method for backward compatibility - now uses secure generation
   */
  private async generateUniqueReferralCode(): Promise<string> {
    return this.generateSecureReferralCode();
  }
}

// Export singleton instance
export const referralLinkService = new ReferralLinkServiceImpl();