import { Request, Response } from "express";

interface RateLimitEntry {
  count: number;
  resetTime: number;
}

interface RateLimitConfig {
  windowMs: number; // Time window in milliseconds
  maxRequests: number; // Maximum requests per window
  message?: string;
}

export class RateLimitService {
  private static instance: RateLimitService;
  private rateLimitStore: Map<string, RateLimitEntry> = new Map();
  private cleanupInterval: NodeJS.Timeout;

  private constructor() {
    // Clean up expired entries every 5 minutes
    this.cleanupInterval = setInterval(() => {
      this.cleanup();
    }, 5 * 60 * 1000);
  }

  public static getInstance(): RateLimitService {
    if (!RateLimitService.instance) {
      RateLimitService.instance = new RateLimitService();
    }
    return RateLimitService.instance;
  }

  /**
   * Create rate limiting middleware for specific endpoints
   */
  public createRateLimit(config: RateLimitConfig) {
    return (req: Request, res: Response, next: Function) => {
      const key = this.generateKey(req);
      const now = Date.now();
      
      const entry = this.rateLimitStore.get(key);
      
      if (!entry || now > entry.resetTime) {
        // First request or window expired, create new entry
        this.rateLimitStore.set(key, {
          count: 1,
          resetTime: now + config.windowMs
        });
        return next();
      }
      
      if (entry.count >= config.maxRequests) {
        // Rate limit exceeded
        const remainingTime = Math.ceil((entry.resetTime - now) / 1000);
        return res.status(429).json({
          success: false,
          message: config.message || "Too many requests. Please try again later.",
          retryAfter: remainingTime
        });
      }
      
      // Increment counter
      entry.count++;
      this.rateLimitStore.set(key, entry);
      
      next();
    };
  }

  /**
   * Check if a specific action is rate limited for a user
   */
  public isRateLimited(userId: string, action: string, config: RateLimitConfig): boolean {
    const key = `${userId}:${action}`;
    const now = Date.now();
    
    const entry = this.rateLimitStore.get(key);
    
    if (!entry || now > entry.resetTime) {
      return false;
    }
    
    return entry.count >= config.maxRequests;
  }

  /**
   * Record an action for rate limiting
   */
  public recordAction(userId: string, action: string, config: RateLimitConfig): void {
    const key = `${userId}:${action}`;
    const now = Date.now();
    
    const entry = this.rateLimitStore.get(key);
    
    if (!entry || now > entry.resetTime) {
      this.rateLimitStore.set(key, {
        count: 1,
        resetTime: now + config.windowMs
      });
    } else {
      entry.count++;
      this.rateLimitStore.set(key, entry);
    }
  }

  /**
   * Generate a unique key for rate limiting based on request
   */
  private generateKey(req: Request): string {
    // Use user ID if authenticated, otherwise use IP address
    const userId = req.user?.userId || req.user?.id;
    const ip = req.ip || req.connection.remoteAddress || 'unknown';
    
    return userId ? `user:${userId}` : `ip:${ip}`;
  }

  /**
   * Clean up expired entries from memory
   */
  private cleanup(): void {
    const now = Date.now();
    const expiredKeys: string[] = [];
    
    for (const [key, entry] of this.rateLimitStore.entries()) {
      if (now > entry.resetTime) {
        expiredKeys.push(key);
      }
    }
    
    expiredKeys.forEach(key => {
      this.rateLimitStore.delete(key);
    });
    
    console.log(`Rate limit cleanup: Removed ${expiredKeys.length} expired entries`);
  }

  /**
   * Get current rate limit status for debugging
   */
  public getRateLimitStatus(userId: string, action: string): { count: number; resetTime: number; isLimited: boolean } | null {
    const key = `${userId}:${action}`;
    const entry = this.rateLimitStore.get(key);
    
    if (!entry) {
      return null;
    }
    
    const now = Date.now();
    return {
      count: entry.count,
      resetTime: entry.resetTime,
      isLimited: now <= entry.resetTime
    };
  }

  /**
   * Clear rate limit for a specific user/action (for testing or admin purposes)
   */
  public clearRateLimit(userId: string, action: string): void {
    const key = `${userId}:${action}`;
    this.rateLimitStore.delete(key);
  }

  /**
   * Cleanup on service shutdown
   */
  public shutdown(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
    this.rateLimitStore.clear();
  }
}

// Export singleton instance
export const rateLimitService = RateLimitService.getInstance();

// Predefined rate limit configurations
export const RATE_LIMIT_CONFIGS = {
  REFERRAL_LINK_GENERATION: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    maxRequests: 5, // 5 requests per 15 minutes
    message: "Too many referral link generation attempts. Please wait before trying again."
  },
  REFERRAL_CODE_VALIDATION: {
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 20, // 20 validations per minute
    message: "Too many referral code validation attempts. Please slow down."
  },
  AFFILIATE_API_GENERAL: {
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 30, // 30 requests per minute
    message: "Too many API requests. Please slow down."
  }
};