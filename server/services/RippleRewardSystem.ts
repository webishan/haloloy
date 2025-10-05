import { storage } from '../storage';

export interface RippleReward {
  id: string;
  referrerId: string;
  referredId: string;
  referredCustomerName: string;
  stepUpRewardAmount: number;
  rippleRewardAmount: number;
  formula: string;
  createdAt: Date;
  isAwarded: boolean;
  awardedAt?: Date;
}

export class RippleRewardSystem {
  // Ripple Reward configuration based on referred customer's StepUp earnings
  private readonly RIPPLE_REWARD_TIERS = [
    { minPoints: 500, maxPoints: 1499, rippleReward: 50, formula: '500-1499 points → 50 ripple points' },
    { minPoints: 1500, maxPoints: 2999, rippleReward: 100, formula: '1500-2999 points → 100 ripple points' },
    { minPoints: 3000, maxPoints: 29999, rippleReward: 150, formula: '3000-29999 points → 150 ripple points' },
    { minPoints: 30000, maxPoints: 159999, rippleReward: 700, formula: '30000-159999 points → 700 ripple points' },
    { minPoints: 160000, maxPoints: Infinity, rippleReward: 1500, formula: '160000+ points → 1500 ripple points' }
  ];
  
  /**
   * Process Ripple Reward when a referred customer earns StepUp points
   */
  async processRippleReward(referredCustomerId: string, stepUpRewardAmount: number): Promise<{
    rippleRewardProcessed: boolean;
    rippleRewardAmount?: number;
    referrerId?: string;
  }> {
    try {
      console.log(`🌊 Processing Ripple Reward for referred customer ${referredCustomerId}: ${stepUpRewardAmount} StepUp points`);

      // Get the referral relationship
      const referral = await storage.getCustomerReferralByReferred(referredCustomerId);
      if (!referral) {
        console.log(`⚠️ No referral relationship found for customer ${referredCustomerId}`);
        return { rippleRewardProcessed: false };
      }

      // Get referrer profile
      const referrerProfile = await storage.getCustomerProfileById(referral.referrerId);
      if (!referrerProfile) {
        console.log(`⚠️ Referrer profile not found for ${referral.referrerId}`);
        return { rippleRewardProcessed: false };
      }

      // Get referred customer profile
      const referredProfile = await storage.getCustomerProfileById(referredCustomerId);
      if (!referredProfile) {
        console.log(`⚠️ Referred customer profile not found for ${referredCustomerId}`);
        return { rippleRewardProcessed: false };
      }

      // Calculate Ripple Reward based on StepUp amount
      const rippleRewardTier = this.getRippleRewardTier(stepUpRewardAmount);
      if (!rippleRewardTier) {
        console.log(`⚠️ No Ripple Reward tier found for ${stepUpRewardAmount} points`);
        return { rippleRewardProcessed: false };
      }

      // Check if this Ripple Reward has already been processed for this specific StepUp reward
      const existingRippleReward = await this.getExistingRippleReward(
        referral.referrerId,
        referredCustomerId,
        stepUpRewardAmount
      );

      if (existingRippleReward) {
        console.log(`⚠️ Ripple Reward already processed for this StepUp reward: ${stepUpRewardAmount} points`);
        return { rippleRewardProcessed: false };
      }

      // Create Ripple Reward
      const rippleReward = await this.createRippleReward({
        referrerId: referral.referrerId,
        referredId: referredCustomerId,
        referredCustomerName: referredProfile.fullName,
        stepUpRewardAmount,
        rippleRewardAmount: rippleRewardTier.rippleReward,
        formula: rippleRewardTier.formula,
        isAwarded: true
      });

      // Add Ripple Reward to referrer's income wallet
      await this.addRippleRewardToWallet(referral.referrerId, rippleRewardTier.rippleReward, rippleReward.id);

      // Create wallet transaction
      await storage.createCustomerWalletTransaction({
        customerId: referral.referrerId,
        walletType: 'income',
        transactionType: 'credit',
        amount: rippleRewardTier.rippleReward.toString(),
        balanceAfter: (parseFloat((await storage.getCustomerWallet(referral.referrerId))?.incomeBalance || '0') + rippleRewardTier.rippleReward).toFixed(2),
        description: `Ripple Reward: ${rippleRewardTier.formula} from referred customer ${referredProfile.fullName}`,
        metadata: {
          rippleRewardId: rippleReward.id,
          referredCustomerId,
          referredCustomerName: referredProfile.fullName,
          stepUpRewardAmount,
          rippleRewardAmount: rippleRewardTier.rippleReward,
          rewardType: 'ripple_reward'
        }
      });

      console.log(`✅ Ripple Reward processed: ${rippleRewardTier.rippleReward} points to referrer ${referrerProfile.fullName} (${rippleRewardTier.formula})`);

      return {
        rippleRewardProcessed: true,
        rippleRewardAmount: rippleRewardTier.rippleReward,
        referrerId: referral.referrerId
      };

    } catch (error) {
      console.error('Error processing Ripple Reward:', error);
      return {
        rippleRewardProcessed: false
      };
    }
  }

  /**
   * Get Ripple Reward tier based on StepUp reward amount
   */
  private getRippleRewardTier(stepUpRewardAmount: number): { rippleReward: number; formula: string } | null {
    for (const tier of this.RIPPLE_REWARD_TIERS) {
      if (stepUpRewardAmount >= tier.minPoints && stepUpRewardAmount <= tier.maxPoints) {
        return {
          rippleReward: tier.rippleReward,
          formula: tier.formula
        };
      }
    }
    return null;
  }

  /**
   * Check if Ripple Reward already exists for this specific StepUp reward
   */
  private async getExistingRippleReward(
    referrerId: string,
    referredId: string,
    stepUpRewardAmount: number
  ): Promise<RippleReward | null> {
    try {
      const rippleRewards = (storage as any).rippleRewards || new Map();
      const existingRewards = Array.from(rippleRewards.values()) as RippleReward[];
      
      return existingRewards.find(reward => 
        reward.referrerId === referrerId &&
        reward.referredId === referredId &&
        reward.stepUpRewardAmount === stepUpRewardAmount
      ) || null;
    } catch (error) {
      console.error('Error checking existing Ripple Reward:', error);
      return null;
    }
  }

  /**
   * Create Ripple Reward
   */
  private async createRippleReward(rewardData: {
    referrerId: string;
    referredId: string;
    referredCustomerName: string;
    stepUpRewardAmount: number;
    rippleRewardAmount: number;
    formula: string;
    isAwarded: boolean;
  }): Promise<RippleReward> {
    const id = crypto.randomUUID();
    const now = new Date();

    const rippleReward: RippleReward = {
      id,
      referrerId: rewardData.referrerId,
      referredId: rewardData.referredId,
      referredCustomerName: rewardData.referredCustomerName,
      stepUpRewardAmount: rewardData.stepUpRewardAmount,
      rippleRewardAmount: rewardData.rippleRewardAmount,
      formula: rewardData.formula,
      createdAt: now,
      isAwarded: rewardData.isAwarded,
      awardedAt: rewardData.isAwarded ? now : undefined
    };

    // Store in a simple Map for now (in production, this would be in database)
    const rippleRewards = (storage as any).rippleRewards || new Map();
    rippleRewards.set(id, rippleReward);
    (storage as any).rippleRewards = rippleRewards;

    return rippleReward;
  }

  /**
   * Add Ripple Reward to referrer's income wallet
   */
  private async addRippleRewardToWallet(referrerId: string, points: number, rippleRewardId: string): Promise<void> {
    const wallet = await storage.getCustomerWallet(referrerId);
    if (wallet) {
      const currentIncomeBalance = parseFloat(wallet.incomeBalance || '0');
      const newIncomeBalance = currentIncomeBalance + points;
      const newTotalIncomeEarned = parseFloat(wallet.totalIncomeEarned || '0') + points;

      await storage.updateCustomerWallet(referrerId, {
        incomeBalance: newIncomeBalance.toFixed(2),
        totalIncomeEarned: newTotalIncomeEarned.toFixed(2),
        lastTransactionAt: new Date()
      });

      console.log(`💰 Added ${points} Ripple Reward points to referrer wallet`);
    } else {
      // Create wallet if it doesn't exist
      await storage.createCustomerWallet({
        customerId: referrerId,
        rewardPointBalance: 0,
        totalRewardPointsEarned: 0,
        totalRewardPointsSpent: 0,
        totalRewardPointsTransferred: 0,
        incomeBalance: points.toFixed(2),
        totalIncomeEarned: points.toFixed(2),
        totalIncomeSpent: "0.00",
        totalIncomeTransferred: "0.00",
        commerceBalance: "0.00",
        totalCommerceAdded: "0.00",
        totalCommerceSpent: "0.00",
        totalCommerceWithdrawn: "0.00"
      });

      console.log(`💰 Created referrer wallet with ${points} Ripple Reward points`);
    }
  }

  /**
   * Get customer's Ripple Rewards
   */
  async getCustomerRippleRewards(customerId: string): Promise<RippleReward[]> {
    try {
      const rippleRewards = (storage as any).rippleRewards || new Map();
      return Array.from(rippleRewards.values())
        .filter((reward: RippleReward) => reward.referrerId === customerId)
        .sort((a: RippleReward, b: RippleReward) => b.createdAt.getTime() - a.createdAt.getTime());
    } catch (error) {
      console.error('Error getting customer Ripple Rewards:', error);
      return [];
    }
  }

  /**
   * Get Ripple Reward statistics for global admin
   */
  async getRippleRewardStatistics(): Promise<{
    totalRippleRewardsProcessed: number;
    totalRippleRewardsDistributed: number;
    averageRippleRewardPerTransaction: number;
    topReferrers: Array<{
      referrerId: string;
      referrerName: string;
      totalRippleRewards: number;
      totalReferrals: number;
    }>;
  }> {
    try {
      const rippleRewards = (storage as any).rippleRewards || new Map();
      const allRewards = Array.from(rippleRewards.values()) as RippleReward[];

      const totalRippleRewardsProcessed = allRewards.length;
      const totalRippleRewardsDistributed = allRewards.reduce((sum, reward) => sum + reward.rippleRewardAmount, 0);
      const averageRippleRewardPerTransaction = totalRippleRewardsProcessed > 0 
        ? totalRippleRewardsDistributed / totalRippleRewardsProcessed 
        : 0;

      // Calculate top referrers
      const referrerStats = new Map<string, { referrerName: string; totalRewards: number; totalReferrals: number }>();
      
      for (const reward of allRewards) {
        if (referrerStats.has(reward.referrerId)) {
          const existing = referrerStats.get(reward.referrerId)!;
          existing.totalRewards += reward.rippleRewardAmount;
          existing.totalReferrals += 1;
        } else {
          const referrerProfile = await storage.getCustomerProfileById(reward.referrerId);
          referrerStats.set(reward.referrerId, {
            referrerName: referrerProfile?.fullName || 'Unknown',
            totalRewards: reward.rippleRewardAmount,
            totalReferrals: 1
          });
        }
      }

      const topReferrers = Array.from(referrerStats.entries())
        .map(([referrerId, stats]) => ({
          referrerId,
          referrerName: stats.referrerName,
          totalRippleRewards: stats.totalRewards,
          totalReferrals: stats.totalReferrals
        }))
        .sort((a, b) => b.totalRippleRewards - a.totalRippleRewards)
        .slice(0, 10);

      return {
        totalRippleRewardsProcessed,
        totalRippleRewardsDistributed,
        averageRippleRewardPerTransaction,
        topReferrers
      };
    } catch (error) {
      console.error('Error getting Ripple Reward statistics:', error);
      return {
        totalRippleRewardsProcessed: 0,
        totalRippleRewardsDistributed: 0,
        averageRippleRewardPerTransaction: 0,
        topReferrers: []
      };
    }
  }

  /**
   * Get Ripple Rewards by referrer ID (for customer dashboard)
   */
  async getRippleRewardsByReferrer(referrerId: string): Promise<Array<{
    referredCustomerName: string;
    stepUpRewardAmount: number;
    rippleRewardAmount: number;
    formula: string;
    createdAt: Date;
  }>> {
    try {
      const rippleRewards = (storage as any).rippleRewards || new Map();
      const rewards = Array.from(rippleRewards.values())
        .filter((reward: RippleReward) => reward.referrerId === referrerId)
        .sort((a: RippleReward, b: RippleReward) => b.createdAt.getTime() - a.createdAt.getTime());

      return rewards.map(reward => ({
        referredCustomerName: reward.referredCustomerName,
        stepUpRewardAmount: reward.stepUpRewardAmount,
        rippleRewardAmount: reward.rippleRewardAmount,
        formula: reward.formula,
        createdAt: reward.createdAt
      }));
    } catch (error) {
      console.error('Error getting Ripple Rewards by referrer:', error);
      return [];
    }
  }
}

// Export singleton instance
export const rippleRewardSystem = new RippleRewardSystem();