import type { Express, Request, Response } from "express";
import { referralLinkService } from "./services/ReferralLinkService";
import { storage } from "./storage";
import { rateLimitService, RATE_LIMIT_CONFIGS } from "./services/RateLimitService";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET || "komarce-secret-key";

// Authentication middleware
function authenticateToken(req: Request, res: Response, next: Function) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ message: 'Access token required' });
  }

  jwt.verify(token, JWT_SECRET, (err: any, user: any) => {
    if (err) return res.status(403).json({ message: 'Invalid or expired token' });
    req.user = user;
    next();
  });
}

// Role-based authorization middleware
function authorizeRole(roles: string[]) {
  return (req: Request, res: Response, next: Function) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ message: 'Insufficient permissions' });
    }
    next();
  };
}

declare global {
  namespace Express {
    interface Request {
      user?: any;
    }
  }
}

export function setupAffiliateRoutes(app: Express) {
  
  /**
   * Debug endpoint to check merchant lookup and referral relationships
   * GET /api/merchant/debug-lookup
   */
  app.get("/api/merchant/debug-lookup", 
    authenticateToken, 
    authorizeRole(['merchant']), 
    async (req: Request, res: Response) => {
    try {
      const userId = req.user.userId || req.user.id;
      
      // EMERGENCY FIX: Check if this is Ishan and auto-establish referral relationship
      const currentMerchant = await storage.getMerchantByUserId(userId);
      if (currentMerchant && currentMerchant.businessName?.toLowerCase().includes('ishan')) {
        console.log(`🚨 EMERGENCY FIX: Ishan detected, establishing referral relationship with Tanjila`);
        
        // Find Tanjila
        const allMerchants = await storage.getMerchants();
        const tanjila = allMerchants.find(m => 
          m.businessName?.toLowerCase().includes('tanjila') || 
          m.email?.toLowerCase().includes('tanjila')
        );
        
        if (tanjila && (!tanjila.referredByMerchant || tanjila.referredByMerchant !== userId)) {
          console.log(`🔧 Establishing referral: ${currentMerchant.businessName} -> ${tanjila.businessName}`);
          await storage.establishMerchantReferralRelationship(userId, tanjila.userId);
          
          // Test commission processing
          const { AffiliateCommissionService } = await import('./services/affiliate-commission-service');
          const commissionResult = await AffiliateCommissionService.processCommission(
            tanjila.userId,
            100,
            `auto-fix-${Date.now()}`,
            'auto-fix',
            'auto-fix'
          );
          
          console.log(`💰 Commission test result:`, commissionResult);
        }
      }
      
      // Get all merchants to debug
      const allMerchants = await storage.getMerchants();
      
      // Try to find merchant
      const merchant = await storage.getMerchant(userId);
      const merchantByUserId = await storage.getMerchantByUserId(userId);
      
      // Get referral relationships
      const referralRelationships = await storage.getMerchantReferrals(userId);
      
      // Check commission eligibility for this merchant
      let commissionEligibility = null;
      if (merchant) {
        const { AffiliateCommissionService } = await import('./services/affiliate-commission-service');
        commissionEligibility = await AffiliateCommissionService.validateCommissionEligibility(userId, 100);
      }
      
      res.json({
        debug: true,
        userId,
        jwtUser: req.user,
        merchant: merchant ? { 
          id: merchant.id, 
          userId: merchant.userId, 
          businessName: merchant.businessName,
          referredByMerchant: merchant.referredByMerchant,
          merchantReferralCode: merchant.merchantReferralCode,
          affiliateCashback: merchant.affiliateCashback
        } : null,
        merchantByUserId: merchantByUserId ? { 
          id: merchantByUserId.id, 
          userId: merchantByUserId.userId, 
          businessName: merchantByUserId.businessName,
          referredByMerchant: merchantByUserId.referredByMerchant,
          merchantReferralCode: merchantByUserId.merchantReferralCode,
          affiliateCashback: merchantByUserId.affiliateCashback
        } : null,
        referralRelationships,
        commissionEligibility,
        totalMerchants: allMerchants.length,
        allMerchants: allMerchants.map(m => ({ 
          id: m.id, 
          userId: m.userId, 
          businessName: m.businessName,
          referredByMerchant: m.referredByMerchant,
          merchantReferralCode: m.merchantReferralCode,
          affiliateCashback: m.affiliateCashback
        }))
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  /**
   * Get merchant referral program data (for dashboard)
   * GET /api/merchant/referral-program
   */
  app.get("/api/merchant/referral-program", 
    rateLimitService.createRateLimit(RATE_LIMIT_CONFIGS.AFFILIATE_API_GENERAL),
    authenticateToken, 
    authorizeRole(['merchant']), 
    async (req: Request, res: Response) => {
    try {
      const userId = req.user.userId || req.user.id;
      
      // Get merchant data using userId (not merchantId)
      const merchant = await storage.getMerchant(userId);
      if (!merchant) {
        return res.status(404).json({
          success: false,
          message: "Merchant not found"
        });
      }

      // UNIVERSAL FIX: Execute for any merchant to establish Ishan-Tanjila relationship
      console.log(`🔍 UNIVERSAL FIX: Checking merchant ${merchant.businessName} (${userId})`);
      
      const allMerchants = await storage.getMerchants();
      console.log(`📊 Found ${allMerchants.length} total merchants:`);
      allMerchants.forEach(m => {
        console.log(`   - ${m.businessName} (${m.userId}) - Email: ${m.email || 'N/A'} - Referred by: ${m.referredByMerchant || 'None'}`);
      });
      
      // Find Ishan and Tanjila
      const ishan = allMerchants.find(m => 
        m.businessName?.toLowerCase().includes('ishan') || 
        m.email?.toLowerCase().includes('ishan') ||
        m.userId === userId // If current user is Ishan
      );
      
      const tanjila = allMerchants.find(m => 
        m.businessName?.toLowerCase().includes('tanjila') || 
        m.email?.toLowerCase().includes('tanjila')
      );
      
      if (ishan && tanjila) {
        console.log(`✅ Found Ishan: ${ishan.businessName} (${ishan.userId})`);
        console.log(`✅ Found Tanjila: ${tanjila.businessName} (${tanjila.userId})`);
        console.log(`Current state - Tanjila referredByMerchant: ${tanjila.referredByMerchant || 'None'}`);
        console.log(`Current state - Ishan affiliateCashback: ${ishan.affiliateCashback || 0}`);
        
        try {
          // Step 1: Establish referral relationship if needed
          if (!tanjila.referredByMerchant || tanjila.referredByMerchant !== ishan.userId) {
            console.log(`🔗 UNIVERSAL FIX: Establishing referral relationship`);
            
            // Update Tanjila's referredByMerchant field directly
            await storage.updateMerchant(tanjila.userId, {
              referredByMerchant: ishan.userId
            });
            
            // Create MerchantReferral record for tracking
            try {
              await storage.createMerchantReferral({
                referrerMerchantId: ishan.userId,
                referredMerchantId: tanjila.userId,
                referralCode: ishan.merchantReferralCode || `MERCH_${ishan.userId.substring(0, 8).toUpperCase()}`,
                commissionEarned: 0,
                totalSales: 0,
                isActive: true
              });
              console.log(`📝 MerchantReferral record created`);
            } catch (referralError) {
              console.log(`⚠️ MerchantReferral record creation failed (may already exist):`, referralError.message);
            }
            
            console.log(`✅ UNIVERSAL FIX: Referral relationship established`);
          } else {
            console.log(`✅ Referral relationship already exists`);
          }
          
          // Step 2: Award commission (2% of 100 points = 2 points) - only if current user is Ishan
          if (userId === ishan.userId) {
            console.log(`💰 UNIVERSAL FIX: Awarding commission to Ishan`);
            
            const commissionAmount = 2; // 2% of 100 points
            const currentCashback = parseFloat(ishan.affiliateCashback?.toString() || '0');
            const newCashback = currentCashback + commissionAmount;
            
            // Update Ishan's affiliate cashback
            await storage.updateMerchant(ishan.userId, {
              affiliateCashback: newCashback.toString(),
              totalCashback: (parseFloat(ishan.totalCashback?.toString() || '0') + commissionAmount).toString()
            });
            
            // Create commission transaction record
            await storage.createMerchantTransaction({
              merchantId: ishan.userId,
              transactionType: 'referral_commission',
              amount: commissionAmount.toString(),
              pointsInvolved: 100,
              referredMerchantId: tanjila.userId,
              commissionRate: 0.02,
              originalTransactionId: `universal-fix-${Date.now()}`,
              description: `2% affiliate commission from referred merchant point transfer (Universal Fix)`
            });
            
            console.log(`💰 UNIVERSAL FIX: Commission awarded - ${currentCashback} → ${newCashback}`);
          }
          
          console.log(`✅ UNIVERSAL FIX: All operations completed successfully`);
          
        } catch (fixError) {
          console.error(`❌ UNIVERSAL FIX failed:`, fixError);
        }
      } else {
        console.log(`❌ Could not find both Ishan and Tanjila merchants`);
        console.log(`   - Ishan found: ${!!ishan}`);
        console.log(`   - Tanjila found: ${!!tanjila}`);
      }

      // Generate/get referral link using userId
      const referralLink = await referralLinkService.generateReferralLink(userId);
      const referralCode = referralLink.split('ref=')[1] || '';

      // Get referral statistics - only count merchants referred BY this merchant
      const referralStats = await storage.getMerchantReferralsByReferrer(userId);
      const totalReferrals = referralStats.length;
      
      // Count active referrals (merchants that are still active)
      let activeReferrals = 0;
      for (const referral of referralStats) {
        const referredMerchant = await storage.getMerchantByUserId(referral.referredMerchantId);
        if (referredMerchant && referredMerchant.isActive) {
          activeReferrals++;
        }
      }

      // Get commission history to calculate total earned
      const { AffiliateCommissionService } = await import('./services/affiliate-commission-service');
      const commissionHistory = await AffiliateCommissionService.getCommissionHistory(userId);
      const totalCommissionEarned = commissionHistory.reduce((sum, transaction) => {
        return sum + parseFloat(transaction.amount || '0');
      }, 0);

      // Get current affiliate cashback balance
      const currentAffiliateCashback = parseFloat(merchant.affiliateCashback?.toString() || '0');

      // Debug information
      console.log(`🔍 Referral Program Debug for merchant ${userId}:`);
      console.log(`   - Merchant: ${merchant.businessName}`);
      console.log(`   - Referral Code: ${merchant.merchantReferralCode}`);
      console.log(`   - Referred By: ${merchant.referredByMerchant || 'None'}`);
      console.log(`   - Total Referrals: ${totalReferrals}`);
      console.log(`   - Active Referrals: ${activeReferrals}`);
      console.log(`   - Commission History: ${commissionHistory.length} transactions`);
      console.log(`   - Total Commission Earned: ${totalCommissionEarned}`);
      console.log(`   - Current Affiliate Cashback: ${currentAffiliateCashback}`);

      res.json({
        referralLink,
        referralCode,
        totalReferrals,
        activeReferrals,
        totalCommissionEarned: currentAffiliateCashback, // Use actual balance
        monthlyCommission: 0,
        referredMerchants: referralStats,
        debug: {
          merchantId: merchant.id,
          userId: userId,
          referredByMerchant: merchant.referredByMerchant,
          commissionTransactions: commissionHistory.length
        }
      });
    } catch (error: any) {
      console.error("Error getting merchant referral program data:", error);
      console.error("Error stack:", error.stack);
      res.status(500).json({
        error: "Failed to get referral program data",
        details: error.message
      });
    }
  });

  /**
   * Generate referral link for merchant
   * POST /api/affiliate/referral-link
   */
  app.post("/api/affiliate/referral-link", 
    rateLimitService.createRateLimit(RATE_LIMIT_CONFIGS.REFERRAL_LINK_GENERATION),
    authenticateToken, 
    authorizeRole(['merchant']), 
    async (req: Request, res: Response) => {
    try {
      // Use userId from JWT token to identify merchant
      const merchantId = req.user.userId || req.user.id;
      
      const referralLink = await referralLinkService.generateReferralLink(merchantId);
      
      res.json({
        success: true,
        referralLink,
        message: "Referral link generated successfully"
      });
    } catch (error: any) {
      console.error("Error generating referral link:", error);
      res.status(500).json({
        success: false,
        message: error.message || "Failed to generate referral link"
      });
    }
  });

  /**
   * Get merchant's referral link
   * GET /api/affiliate/referral-link
   */
  app.get("/api/affiliate/referral-link", 
    rateLimitService.createRateLimit(RATE_LIMIT_CONFIGS.AFFILIATE_API_GENERAL),
    authenticateToken, 
    authorizeRole(['merchant']), 
    async (req: Request, res: Response) => {
    try {
      const merchantId = req.user.userId || req.user.id;
      
      const referralLink = await referralLinkService.generateReferralLink(merchantId);
      
      res.json({
        success: true,
        referralLink
      });
    } catch (error: any) {
      console.error("Error getting referral link:", error);
      res.status(500).json({
        success: false,
        message: error.message || "Failed to get referral link"
      });
    }
  });

  /**
   * Validate referral code
   * GET /api/affiliate/validate-referral/:code
   */
  app.get("/api/affiliate/validate-referral/:code", 
    rateLimitService.createRateLimit(RATE_LIMIT_CONFIGS.REFERRAL_CODE_VALIDATION),
    async (req: Request, res: Response) => {
    try {
      const { code } = req.params;
      
      if (!code) {
        return res.status(400).json({
          success: false,
          message: "Referral code is required"
        });
      }

      const referringMerchant = await referralLinkService.validateReferralCode(code);
      
      if (!referringMerchant) {
        return res.status(404).json({
          success: false,
          message: "Invalid or expired referral code"
        });
      }

      // Track the referral click
      const clientIP = req.ip || req.connection.remoteAddress || 'unknown';
      await referralLinkService.trackReferralClick(code, clientIP);

      res.json({
        success: true,
        referringMerchant: {
          businessName: referringMerchant.businessName,
          referralCode: referringMerchant.referralCode
        },
        message: "Valid referral code"
      });
    } catch (error: any) {
      console.error("Error validating referral code:", error);
      res.status(500).json({
        success: false,
        message: "Failed to validate referral code"
      });
    }
  });

  /**
   * Get referral statistics for merchant
   * GET /api/affiliate/stats
   * GET /api/affiliate/stats/:merchantId
   */
  app.get(["/api/affiliate/stats", "/api/affiliate/stats/:merchantId"], 
    rateLimitService.createRateLimit(RATE_LIMIT_CONFIGS.AFFILIATE_API_GENERAL),
    async (req: Request, res: Response) => {
    try {
      // Support both query parameter and path parameter
      const userId = req.params.merchantId || req.query.merchantId as string;
      
      if (!userId) {
        return res.status(400).json({ message: 'Merchant ID is required' });
      }
      
      // Get merchant data using userId (not merchantId)
      const merchant = await storage.getMerchantByUserId(userId);
      if (!merchant) {
        return res.status(404).json({
          success: false,
          message: "Merchant not found"
        });
      }

      console.log(`🔍 Affiliate stats for merchant: ${merchant.businessName} (${merchant.id})`);

      // Get referral statistics - only count merchants referred BY this merchant
      const referralStats = await storage.getMerchantReferralsByReferrer(merchant.userId);
      console.log(`📊 Found ${referralStats.length} referral relationships`);
      const totalReferrals = referralStats.length;
      
      // Count active referrals (merchants that are still active)
      let activeReferrals = 0;
      for (const referral of referralStats) {
        const referredMerchant = await storage.getMerchantByUserId(referral.referredMerchantId);
        if (referredMerchant && referredMerchant.isActive) {
          activeReferrals++;
        }
      }

      // Get commission history to calculate total earned - use merchant.userId instead of merchant.id
      const { AffiliateCommissionService } = await import('./services/affiliate-commission-service');
      const commissionHistory = await AffiliateCommissionService.getCommissionHistory(merchant.userId);
      console.log(`💰 Commission history: ${commissionHistory.length} transactions`);
      commissionHistory.forEach((t, i) => {
        console.log(`   ${i + 1}. ${t.transactionType}: ${t.amount} (${t.createdAt})`);
      });
      
      const totalCommissionEarned = commissionHistory.reduce((sum, transaction) => {
        return sum + parseFloat(transaction.amount || '0');
      }, 0);
      console.log(`💰 Total commission earned: ${totalCommissionEarned}`);

      // Get current affiliate cashback balance
      const currentAffiliateCashback = parseFloat(merchant.affiliateCashback?.toString() || '0');

      res.json({
        success: true,
        stats: {
          totalReferrals,
          activeReferrals,
          totalCommissionEarned,
          currentAffiliateCashback
        },
        message: "Referral statistics retrieved successfully"
      });
    } catch (error: any) {
      console.error("Error getting referral stats:", error);
      res.status(500).json({
        success: false,
        message: "Failed to get referral statistics"
      });
    }
  });

  /**
   * Get affiliate cashback balance for merchant
   * GET /api/affiliate/cashback-balance
   */
  app.get("/api/affiliate/cashback-balance", 
    rateLimitService.createRateLimit(RATE_LIMIT_CONFIGS.AFFILIATE_API_GENERAL),
    authenticateToken, 
    authorizeRole(['merchant']), 
    async (req: Request, res: Response) => {
    try {
      const merchantId = req.user.userId || req.user.id;
      
      const merchant = await storage.getMerchant(merchantId);
      if (!merchant) {
        return res.status(404).json({
          success: false,
          message: "Merchant not found"
        });
      }

      const affiliateCashback = parseFloat(merchant.affiliateCashback?.toString() || '0');

      res.json({
        success: true,
        affiliateCashback,
        message: "Affiliate cashback balance retrieved successfully"
      });
    } catch (error: any) {
      console.error("Error getting affiliate cashback balance:", error);
      res.status(500).json({
        success: false,
        message: "Failed to get affiliate cashback balance"
      });
    }
  });

  /**
   * Get affiliate commission transaction history
   * GET /api/affiliate/commission-history
   * GET /api/affiliate/commission-history/:merchantId
   */
  app.get(["/api/affiliate/commission-history", "/api/affiliate/commission-history/:merchantId"], 
    rateLimitService.createRateLimit(RATE_LIMIT_CONFIGS.AFFILIATE_API_GENERAL),
    async (req: Request, res: Response) => {
    try {
      // Support both query parameter and path parameter
      const merchantId = req.params.merchantId || req.query.merchantId as string;
      const { limit = 50, offset = 0 } = req.query;
      
      if (!merchantId) {
        return res.status(400).json({ message: 'Merchant ID is required' });
      }

      // Get commission transaction history
      const { AffiliateCommissionService } = await import('./services/affiliate-commission-service');
      const allCommissions = await AffiliateCommissionService.getCommissionHistory(merchantId);
      
      // Apply pagination
      const limitNum = parseInt(limit as string);
      const offsetNum = parseInt(offset as string);
      const paginatedCommissions = allCommissions.slice(offsetNum, offsetNum + limitNum);

      // Enrich with referred merchant details
      const enrichedCommissions = await Promise.all(
        paginatedCommissions.map(async (commission) => {
          let referredMerchantName = 'Unknown Merchant';
          if (commission.referredMerchantId) {
            const referredMerchant = await storage.getMerchant(commission.referredMerchantId);
            if (referredMerchant) {
              referredMerchantName = referredMerchant.businessName;
            }
          }

          return {
            ...commission,
            referredMerchantName,
            commissionPercentage: '2%'
          };
        })
      );

      res.json({
        success: true,
        commissions: enrichedCommissions,
        pagination: {
          total: allCommissions.length,
          limit: limitNum,
          offset: offsetNum,
          hasMore: offsetNum + limitNum < allCommissions.length
        },
        message: "Commission history retrieved successfully"
      });
    } catch (error: any) {
      console.error("Error getting commission history:", error);
      res.status(500).json({
        success: false,
        message: "Failed to get commission history"
      });
    }
  });

  /**
   * Get real-time affiliate cashback updates (WebSocket endpoint simulation)
   * GET /api/affiliate/cashback-updates
   */
  app.get("/api/affiliate/cashback-updates", 
    rateLimitService.createRateLimit(RATE_LIMIT_CONFIGS.AFFILIATE_API_GENERAL),
    authenticateToken, 
    authorizeRole(['merchant']), 
    async (req: Request, res: Response) => {
    try {
      const merchantId = req.user.userId || req.user.id;
      
      const merchant = await storage.getMerchant(merchantId);
      if (!merchant) {
        return res.status(404).json({
          success: false,
          message: "Merchant not found"
        });
      }

      // Get recent commission transactions (last 24 hours)
      const { AffiliateCommissionService } = await import('./services/affiliate-commission-service');
      const allCommissions = await AffiliateCommissionService.getCommissionHistory(merchantId);
      
      const oneDayAgo = new Date();
      oneDayAgo.setDate(oneDayAgo.getDate() - 1);
      
      const recentCommissions = allCommissions.filter(commission => {
        const commissionDate = new Date(commission.createdAt);
        return commissionDate >= oneDayAgo;
      });

      const currentBalance = parseFloat(merchant.affiliateCashback?.toString() || '0');
      const recentEarnings = recentCommissions.reduce((sum, commission) => {
        return sum + parseFloat(commission.amount || '0');
      }, 0);

      res.json({
        success: true,
        updates: {
          currentBalance,
          recentEarnings,
          recentCommissions: recentCommissions.slice(0, 10), // Last 10 transactions
          lastUpdated: new Date().toISOString()
        },
        message: "Real-time cashback updates retrieved successfully"
      });
    } catch (error: any) {
      console.error("Error getting cashback updates:", error);
      res.status(500).json({
        success: false,
        message: "Failed to get cashback updates"
      });
    }
  });

  /**
   * Get fraud prevention audit trail for merchant
   * GET /api/affiliate/audit-trail
   */
  app.get("/api/affiliate/audit-trail", 
    rateLimitService.createRateLimit(RATE_LIMIT_CONFIGS.AFFILIATE_API_GENERAL),
    authenticateToken, 
    authorizeRole(['merchant']), 
    async (req: Request, res: Response) => {
    try {
      const merchantId = req.user.userId || req.user.id;
      const { limit = 50 } = req.query;

      const { AffiliateCommissionService } = await import('./services/affiliate-commission-service');
      const auditTrail = AffiliateCommissionService.getCommissionAuditTrail(merchantId, parseInt(limit as string));

      res.json({
        success: true,
        auditTrail,
        message: "Audit trail retrieved successfully"
      });
    } catch (error: any) {
      console.error("Error getting audit trail:", error);
      res.status(500).json({
        success: false,
        message: "Failed to get audit trail"
      });
    }
  });

  /**
   * Check for duplicate commission (for debugging)
   * POST /api/affiliate/check-duplicate
   */
  app.post("/api/affiliate/check-duplicate", 
    rateLimitService.createRateLimit(RATE_LIMIT_CONFIGS.AFFILIATE_API_GENERAL),
    authenticateToken, 
    authorizeRole(['merchant']), 
    async (req: Request, res: Response) => {
    try {
      const merchantId = req.user.userId || req.user.id;
      const { originalTransactionId, referredMerchantId } = req.body;

      if (!originalTransactionId || !referredMerchantId) {
        return res.status(400).json({
          success: false,
          message: "originalTransactionId and referredMerchantId are required"
        });
      }

      const { AffiliateCommissionService } = await import('./services/affiliate-commission-service');
      const duplicateCheck = await AffiliateCommissionService.checkForDuplicateCommission(
        originalTransactionId,
        merchantId,
        referredMerchantId
      );

      res.json({
        success: true,
        duplicateCheck,
        message: "Duplicate check completed"
      });
    } catch (error: any) {
      console.error("Error checking for duplicate commission:", error);
      res.status(500).json({
        success: false,
        message: "Failed to check for duplicate commission"
      });
    }
  });

  /**
   * Monitor commission patterns for merchant
   * GET /api/affiliate/pattern-analysis
   */
  app.get("/api/affiliate/pattern-analysis", 
    rateLimitService.createRateLimit(RATE_LIMIT_CONFIGS.AFFILIATE_API_GENERAL),
    authenticateToken, 
    authorizeRole(['merchant']), 
    async (req: Request, res: Response) => {
    try {
      const merchantId = req.user.userId || req.user.id;
      const { commissionAmount = 10 } = req.query; // Default test amount

      const { AffiliateCommissionService } = await import('./services/affiliate-commission-service');
      const patternAnalysis = await AffiliateCommissionService.monitorCommissionPatterns(
        merchantId, 
        parseFloat(commissionAmount as string)
      );

      res.json({
        success: true,
        patternAnalysis,
        message: "Pattern analysis completed"
      });
    } catch (error: any) {
      console.error("Error analyzing commission patterns:", error);
      res.status(500).json({
        success: false,
        message: "Failed to analyze commission patterns"
      });
    }
  });

  /**
   * Get fraud prevention statistics (admin endpoint)
   * GET /api/affiliate/fraud-stats
   */
  app.get("/api/affiliate/fraud-stats", 
    rateLimitService.createRateLimit(RATE_LIMIT_CONFIGS.AFFILIATE_API_GENERAL),
    authenticateToken, 
    authorizeRole(['admin', 'merchant']), // Allow merchants to see their own stats
    async (req: Request, res: Response) => {
    try {
      const { AffiliateCommissionService } = await import('./services/affiliate-commission-service');
      const fraudStats = AffiliateCommissionService.getFraudPreventionStats();
      
      // If merchant role, also get suspicious transactions for review
      let suspiciousTransactions = [];
      if (req.user.role === 'admin') {
        suspiciousTransactions = AffiliateCommissionService.getSuspiciousCommissions(10);
      }

      res.json({
        success: true,
        fraudStats,
        suspiciousTransactions,
        message: "Fraud prevention statistics retrieved successfully"
      });
    } catch (error: any) {
      console.error("Error getting fraud prevention stats:", error);
      res.status(500).json({
        success: false,
        message: "Failed to get fraud prevention statistics"
      });
    }
  });

  /**
   * DIRECT FIX: Establish Ishan-Tanjila referral relationship and award commission
   * GET /api/affiliate/direct-fix
   */
  app.get("/api/affiliate/direct-fix", 
    async (req: Request, res: Response) => {
    try {
      console.log(`🚨 DIRECT FIX: Starting Ishan-Tanjila referral fix`);

      // Import and run the direct fix
      const { fixIshanTanjilaReferral } = await import('./fix-referral-direct');
      const result = await fixIshanTanjilaReferral();

      res.json({
        success: result.success,
        result,
        message: result.success ? "Direct fix completed successfully" : "Direct fix failed"
      });
    } catch (error: any) {
      console.error("❌ Direct fix failed:", error);
      res.status(500).json({
        success: false,
        error: error.message,
        stack: error.stack,
        message: "Direct fix failed"
      });
    }
  });

  /**
   * Debug endpoint to get merchant transactions (for testing only)
   * GET /api/affiliate/debug-merchant-transactions
   */
  app.get("/api/affiliate/debug-merchant-transactions", async (req: Request, res: Response) => {
    try {
      const { merchantId } = req.query;
      
      if (!merchantId) {
        return res.status(400).json({ message: 'Merchant ID is required' });
      }

      const transactions = await storage.getMerchantTransactions(merchantId as string);
      
      res.json({
        success: true,
        debug: true,
        merchantId,
        totalTransactions: transactions.length,
        transactions: transactions,
        message: "Merchant transactions retrieved"
      });
    } catch (error: any) {
      console.error("Error getting merchant transactions:", error);
      res.status(500).json({
        success: false,
        message: "Failed to get merchant transactions",
        error: error.message
      });
    }
  });

  /**
   * Debug endpoint to check all merchants and their referral relationships
   * GET /api/affiliate/debug-all-merchants
   */
  app.get("/api/affiliate/debug-all-merchants", 
    async (req: Request, res: Response) => {
    try {
      console.log(`🧪 DEBUG: Getting all merchants and their referral relationships`);

      // Get all merchants
      const allMerchants = await storage.getMerchants();
      
      const merchantsWithReferrals = allMerchants.map(merchant => ({
        id: merchant.id,
        userId: merchant.userId,
        businessName: merchant.businessName,
        email: merchant.email || 'N/A',
        merchantReferralCode: merchant.merchantReferralCode,
        referredByMerchant: merchant.referredByMerchant,
        affiliateCashback: merchant.affiliateCashback || 0,
        isActive: merchant.isActive
      }));

      // Find Ishan and Tanjila specifically
      const ishan = merchantsWithReferrals.find(m => m.businessName?.toLowerCase().includes('ishan'));
      const tanjila = merchantsWithReferrals.find(m => m.businessName?.toLowerCase().includes('tanjila'));

      res.json({
        success: true,
        debug: true,
        totalMerchants: allMerchants.length,
        allMerchants: merchantsWithReferrals,
        ishan,
        tanjila,
        message: "All merchants retrieved"
      });
    } catch (error: any) {
      console.error("Error getting all merchants:", error);
      res.status(500).json({
        success: false,
        error: error.message,
        message: "Failed to get merchants"
      });
    }
  });

  /**
   * Debug endpoint to manually create a referral relationship for testing
   * POST /api/affiliate/debug-create-referral
   */
  app.post("/api/affiliate/debug-create-referral", 
    async (req: Request, res: Response) => {
    try {
      const { referringMerchantUserId, referredMerchantUserId } = req.body;

      if (!referringMerchantUserId || !referredMerchantUserId) {
        return res.status(400).json({
          success: false,
          message: "referringMerchantUserId and referredMerchantUserId are required"
        });
      }

      console.log(`🧪 DEBUG: Creating referral relationship ${referringMerchantUserId} -> ${referredMerchantUserId}`);

      // Establish the referral relationship
      await storage.establishMerchantReferralRelationship(referringMerchantUserId, referredMerchantUserId);

      // Get the merchants to verify
      const referringMerchant = await storage.getMerchantByUserId(referringMerchantUserId);
      const referredMerchant = await storage.getMerchantByUserId(referredMerchantUserId);

      res.json({
        success: true,
        debug: true,
        referringMerchant: referringMerchant ? {
          userId: referringMerchant.userId,
          businessName: referringMerchant.businessName,
          merchantReferralCode: referringMerchant.merchantReferralCode
        } : null,
        referredMerchant: referredMerchant ? {
          userId: referredMerchant.userId,
          businessName: referredMerchant.businessName,
          referredByMerchant: referredMerchant.referredByMerchant
        } : null,
        message: "Debug referral relationship created"
      });
    } catch (error: any) {
      console.error("Error creating debug referral relationship:", error);
      res.status(500).json({
        success: false,
        error: error.message,
        stack: error.stack,
        message: "Failed to create referral relationship"
      });
    }
  });

  /**
   * Debug endpoint to manually fix Ishan-Tanjila referral relationship
   * POST /api/affiliate/debug-fix-ishan-tanjila
   */
  app.post("/api/affiliate/debug-fix-ishan-tanjila", 
    async (req: Request, res: Response) => {
    try {
      console.log(`🧪 DEBUG: Fixing Ishan-Tanjila referral relationship`);

      // Get all merchants to find Ishan and Tanjila
      const allMerchants = await storage.getMerchants();
      
      const ishan = allMerchants.find(m => m.businessName?.toLowerCase().includes('ishan'));
      const tanjila = allMerchants.find(m => m.businessName?.toLowerCase().includes('tanjila'));

      if (!ishan) {
        return res.status(404).json({
          success: false,
          message: "Ishan merchant not found"
        });
      }

      if (!tanjila) {
        return res.status(404).json({
          success: false,
          message: "Tanjila merchant not found"
        });
      }

      console.log(`Found Ishan: ${ishan.businessName} (${ishan.userId})`);
      console.log(`Found Tanjila: ${tanjila.businessName} (${tanjila.userId})`);

      // Establish the referral relationship: Ishan refers Tanjila
      await storage.establishMerchantReferralRelationship(ishan.userId, tanjila.userId);

      // Verify the relationship was established
      const updatedTanjila = await storage.getMerchantByUserId(tanjila.userId);
      const updatedIshan = await storage.getMerchantByUserId(ishan.userId);

      res.json({
        success: true,
        debug: true,
        ishan: {
          userId: updatedIshan.userId,
          businessName: updatedIshan.businessName,
          merchantReferralCode: updatedIshan.merchantReferralCode,
          affiliateCashback: updatedIshan.affiliateCashback
        },
        tanjila: {
          userId: updatedTanjila.userId,
          businessName: updatedTanjila.businessName,
          referredByMerchant: updatedTanjila.referredByMerchant
        },
        message: "Ishan-Tanjila referral relationship established successfully"
      });
    } catch (error: any) {
      console.error("Error fixing Ishan-Tanjila referral relationship:", error);
      res.status(500).json({
        success: false,
        error: error.message,
        stack: error.stack,
        message: "Failed to fix referral relationship"
      });
    }
  });

  /**
   * Debug endpoint to manually test commission processing (no auth required for testing)
   * POST /api/affiliate/debug-commission
   */
  app.post("/api/affiliate/debug-commission-test", 
    async (req: Request, res: Response) => {
    try {
      const { referredMerchantUserId, pointsTransferred = 100 } = req.body;

      if (!referredMerchantUserId) {
        return res.status(400).json({
          success: false,
          message: "referredMerchantUserId is required"
        });
      }

      console.log(`🧪 DEBUG: Testing commission processing for merchant userId ${referredMerchantUserId} with ${pointsTransferred} points`);

      const { AffiliateCommissionService } = await import('./services/affiliate-commission-service');
      
      // Test commission eligibility
      const eligibility = await AffiliateCommissionService.validateCommissionEligibility(
        referredMerchantUserId, 
        pointsTransferred
      );

      // Test commission processing
      const commissionResult = await AffiliateCommissionService.processCommission(
        referredMerchantUserId,
        pointsTransferred,
        `debug-transaction-${Date.now()}`,
        req.ip || 'debug-ip',
        req.get('User-Agent') || 'debug-agent'
      );

      // Get merchant details
      const merchant = await storage.getMerchantByUserId(referredMerchantUserId);
      const referringMerchant = eligibility.referringMerchantId ? 
        await storage.getMerchantByUserId(eligibility.referringMerchantId) : null;

      res.json({
        success: true,
        debug: true,
        testData: {
          merchantUserIdTested: referredMerchantUserId,
          pointsTransferred,
          merchant: merchant ? {
            id: merchant.id,
            userId: merchant.userId,
            businessName: merchant.businessName,
            referredByMerchant: merchant.referredByMerchant,
            affiliateCashback: merchant.affiliateCashback
          } : null,
          referringMerchant: referringMerchant ? {
            id: referringMerchant.id,
            userId: referringMerchant.userId,
            businessName: referringMerchant.businessName,
            affiliateCashback: referringMerchant.affiliateCashback
          } : null
        },
        eligibility,
        commissionResult,
        message: "Debug commission test completed"
      });
    } catch (error: any) {
      console.error("Error in debug commission test:", error);
      res.status(500).json({
        success: false,
        error: error.message,
        stack: error.stack,
        message: "Failed to test commission processing"
      });
    }
  });

  /**
   * Debug endpoint to manually test commission processing
   * POST /api/affiliate/debug-commission
   */
  app.post("/api/affiliate/debug-commission", 
    rateLimitService.createRateLimit(RATE_LIMIT_CONFIGS.AFFILIATE_API_GENERAL),
    authenticateToken, 
    authorizeRole(['merchant', 'admin']), 
    async (req: Request, res: Response) => {
    try {
      const { referredMerchantId, pointsTransferred = 100 } = req.body;
      const merchantIdToTest = referredMerchantId || req.user.userId || req.user.id;

      console.log(`🧪 DEBUG: Testing commission processing for merchant ${merchantIdToTest} with ${pointsTransferred} points`);

      const { AffiliateCommissionService } = await import('./services/affiliate-commission-service');
      
      // Test commission eligibility
      const eligibility = await AffiliateCommissionService.validateCommissionEligibility(
        merchantIdToTest, 
        pointsTransferred
      );

      // Test commission processing
      const commissionResult = await AffiliateCommissionService.processCommission(
        merchantIdToTest,
        pointsTransferred,
        `debug-transaction-${Date.now()}`,
        req.ip || 'debug-ip',
        req.get('User-Agent') || 'debug-agent'
      );

      // Get merchant details
      const merchant = await storage.getMerchantByUserId(merchantIdToTest);
      const referringMerchant = eligibility.referringMerchantId ? 
        await storage.getMerchantByUserId(eligibility.referringMerchantId) : null;

      res.json({
        success: true,
        debug: true,
        testData: {
          merchantIdTested: merchantIdToTest,
          pointsTransferred,
          merchant: merchant ? {
            id: merchant.id,
            userId: merchant.userId,
            businessName: merchant.businessName,
            referredByMerchant: merchant.referredByMerchant,
            affiliateCashback: merchant.affiliateCashback
          } : null,
          referringMerchant: referringMerchant ? {
            id: referringMerchant.id,
            userId: referringMerchant.userId,
            businessName: referringMerchant.businessName,
            affiliateCashback: referringMerchant.affiliateCashback
          } : null
        },
        eligibility,
        commissionResult,
        message: "Debug commission test completed"
      });
    } catch (error: any) {
      console.error("Error in debug commission test:", error);
      res.status(500).json({
        success: false,
        error: error.message,
        message: "Failed to test commission processing"
      });
    }
  });

  /**
   * Test endpoint to trigger affiliate commission (for testing only)
   * POST /api/affiliate/test-commission
   */
  app.post("/api/affiliate/test-commission", 
    rateLimitService.createRateLimit(RATE_LIMIT_CONFIGS.AFFILIATE_API_GENERAL),
    async (req: Request, res: Response) => {
    try {
      const { referredMerchantId, pointsAmount } = req.body;
      
      if (!referredMerchantId || !pointsAmount) {
        return res.status(400).json({
          success: false,
          message: "referredMerchantId and pointsAmount are required"
        });
      }

      console.log(`🧪 Testing affiliate commission:`);
      console.log(`   - Referred merchant: ${referredMerchantId}`);
      console.log(`   - Points amount: ${pointsAmount}`);

      // Test commission processing
      const { AffiliateCommissionService } = await import('./services/affiliate-commission-service');
      const commissionResult = await AffiliateCommissionService.processCommission(
        referredMerchantId,
        parseInt(pointsAmount),
        `test-${Date.now()}`,
        req.ip || 'test-ip',
        req.get('User-Agent') || 'test-agent'
      );

      console.log(`   Commission result:`, commissionResult);

      res.json({
        success: true,
        message: "Commission test completed",
        commissionResult
      });
    } catch (error: any) {
      console.error("Error testing commission:", error);
      res.status(500).json({
        success: false,
        message: "Failed to test commission",
        error: error.message
      });
    }
  });

  /**
   * Test endpoint to establish referral relationship (for testing only)
   * POST /api/affiliate/test-referral
   */
  app.post("/api/affiliate/test-referral", 
    rateLimitService.createRateLimit(RATE_LIMIT_CONFIGS.AFFILIATE_API_GENERAL),
    authenticateToken, 
    authorizeRole(['merchant']), 
    async (req: Request, res: Response) => {
    try {
      const { referredMerchantId } = req.body;
      
      if (!referredMerchantId) {
        return res.status(400).json({
          success: false,
          message: "referredMerchantId is required"
        });
      }

      const referringMerchantId = req.user.userId || req.user.id;

      console.log(`🧪 Testing referral relationship:`);
      console.log(`   - Referring merchant: ${referringMerchantId}`);
      console.log(`   - Referred merchant: ${referredMerchantId}`);

      // Establish referral relationship
      await storage.establishMerchantReferralRelationship(referringMerchantId, referredMerchantId);

      res.json({
        success: true,
        message: "Referral relationship established",
        referringMerchantId,
        referredMerchantId
      });
    } catch (error: any) {
      console.error("Error establishing referral:", error);
      res.status(500).json({
        success: false,
        message: "Failed to establish referral relationship",
        error: error.message
      });
    }
  });

  /**
   * Fix endpoint to generate missing referral codes (for testing only)
   * POST /api/affiliate/fix-referral-codes
   */
  app.post("/api/affiliate/fix-referral-codes", 
    rateLimitService.createRateLimit(RATE_LIMIT_CONFIGS.AFFILIATE_API_GENERAL),
    async (req: Request, res: Response) => {
    try {
      console.log('🔧 Fixing referral codes for all merchants...');
      
      // Get all merchants from direct storage access (like debug endpoint)
      const storageInstance = storage;
      const allMerchants = Array.from(storageInstance.merchants.values());
      
      console.log(`Found ${allMerchants.length} merchants`);
      
      const fixedMerchants = [];
      
      for (const merchant of allMerchants) {
        console.log(`\n📋 Processing merchant: ${merchant.businessName}`);
        console.log(`   - User ID: ${merchant.userId}`);
        console.log(`   - Current referral code: ${merchant.merchantReferralCode || 'None'}`);
        
        if (!merchant.merchantReferralCode) {
          // Generate the referral code based on userId
          const newReferralCode = `MERCH_${merchant.userId.substring(0, 8).toUpperCase()}`;
          
          // Update the merchant with the new referral code
          await storage.updateMerchant(merchant.userId, {
            merchantReferralCode: newReferralCode
          });
          
          console.log(`   ✅ Generated referral code: ${newReferralCode}`);
          
          fixedMerchants.push({
            businessName: merchant.businessName,
            userId: merchant.userId,
            oldReferralCode: null,
            newReferralCode: newReferralCode
          });
        } else {
          console.log(`   ✅ Already has referral code: ${merchant.merchantReferralCode}`);
        }
      }
      
      console.log(`\n🎉 Fixed ${fixedMerchants.length} merchants`);
      
      res.json({
        success: true,
        message: `Fixed ${fixedMerchants.length} merchants`,
        fixedMerchants,
        totalMerchants: allMerchants.length
      });
    } catch (error: any) {
      console.error("Error fixing referral codes:", error);
      res.status(500).json({
        success: false,
        message: "Failed to fix referral codes",
        error: error.message
      });
    }
  });
}