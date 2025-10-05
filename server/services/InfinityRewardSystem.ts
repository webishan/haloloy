import { storage } from '../storage';

export interface InfinityReward {
  id: string;
  customerId: string;
  globalNumber: number;
  rewardNumbers: number[];
  totalPoints: number;
  pointsPerReward: number;
  cycleNumber: number;
  createdAt: Date;
  isActive: boolean;
}

export interface InfinityCycle {
  id: string;
  customerId: string;
  triggerGlobalNumber: number;
  rewardNumbers: number[];
  totalPoints: number;
  pointsPerReward: number;
  cycleNumber: number;
  nextCycleMultiplier: number;
  createdAt: Date;
  isActive: boolean;
}

export class InfinityRewardSystem {
  // Infinity Reward configuration
  private readonly INFINITY_THRESHOLD = 30000; // 4th step threshold
  private readonly POINTS_PER_REWARD = 195000; // Points per reward number
  private readonly INITIAL_REWARD_COUNT = 4; // Initial number of reward numbers
  private readonly GLOBAL_ADMIN_RESERVE = 6000; // Points reserved for global admin
  
  /**
   * Check if customer has reached 30,000 points (4th step) and trigger Infinity Rewards
   */
  async checkAndTriggerInfinityRewards(customerId: string, pointsEarned: number): Promise<{
    infinityRewardTriggered: boolean;
    rewardNumbers?: number[];
    totalPoints?: number;
    cycleNumber?: number;
  }> {
    try {
      // Get customer profile and current StepUp rewards
      const profile = await storage.getCustomerProfileById(customerId);
      if (!profile) {
        throw new Error('Customer profile not found');
      }

      // Get customer's StepUp rewards to check if they've reached 30,000 points
      const stepUpRewards = await storage.getCustomerStepUpRewards(customerId);
      const totalStepUpPoints = stepUpRewards
        .filter(reward => reward.isAwarded)
        .reduce((sum, reward) => sum + reward.rewardPoints, 0);

      console.log(`🔍 Checking Infinity Rewards for customer ${profile.fullName}: ${totalStepUpPoints} StepUp points`);

      // Check if customer has reached 30,000 points threshold
      if (totalStepUpPoints >= this.INFINITY_THRESHOLD) {
        // Check if Infinity Reward has already been triggered
        const existingInfinityRewards = await storage.getCustomerInfinityCycles(customerId);
        const hasInfinityReward = existingInfinityRewards.some(cycle => cycle.cycleNumber === 1);

        if (!hasInfinityReward) {
          console.log(`🎯 INFINITY REWARD TRIGGERED! Customer ${profile.fullName} reached 30,000 points`);
          
          // Generate 4 new reward numbers
          const rewardNumbers = await this.generateInfinityRewardNumbers(customerId, this.INITIAL_REWARD_COUNT);
          
          // Calculate total points (4 × 195,000 = 780,000)
          const totalPoints = this.INITIAL_REWARD_COUNT * this.POINTS_PER_REWARD;
          
          // Create Infinity Reward cycle
          const infinityCycle = await this.createInfinityCycle({
            customerId,
            triggerGlobalNumber: profile.globalSerialNumber || 0,
            rewardNumbers,
            totalPoints,
            pointsPerReward: this.POINTS_PER_REWARD,
            cycleNumber: 1,
            nextCycleMultiplier: 4, // Next cycle will have 16 reward numbers (4 × 4)
            isActive: true
          });

          // Add points to customer's income wallet
          await this.addInfinityRewardToWallet(customerId, totalPoints, infinityCycle.id);

          // Create wallet transaction
          await storage.createCustomerWalletTransaction({
            customerId,
            walletType: 'income',
            transactionType: 'credit',
            amount: totalPoints.toString(),
            balanceAfter: (parseFloat((await storage.getCustomerWallet(customerId))?.incomeBalance || '0') + totalPoints).toFixed(2),
            description: `Infinity Reward - Cycle 1 (4 reward numbers × 195,000 points)`,
            metadata: {
              infinityCycleId: infinityCycle.id,
              rewardNumbers: rewardNumbers.join(','),
              cycleNumber: 1,
              rewardType: 'infinity_reward'
            }
          });

          console.log(`✅ Infinity Reward created: ${totalPoints} points (${this.INITIAL_REWARD_COUNT} reward numbers)`);

          return {
            infinityRewardTriggered: true,
            rewardNumbers,
            totalPoints,
            cycleNumber: 1
          };
        } else {
          console.log(`⚠️ Infinity Reward already triggered for customer ${profile.fullName}`);
        }
      }

      return {
        infinityRewardTriggered: false
      };

    } catch (error) {
      console.error('Error checking Infinity Rewards:', error);
      return {
        infinityRewardTriggered: false
      };
    }
  }

  /**
   * Generate new Infinity Reward numbers
   */
  private async generateInfinityRewardNumbers(customerId: string, count: number): Promise<number[]> {
    const rewardNumbers: number[] = [];
    
    for (let i = 0; i < count; i++) {
      // Generate sequential reward numbers starting from a high base
      const baseNumber = 1000000 + (parseInt(customerId.replace(/-/g, '').slice(0, 8), 16) % 100000);
      const rewardNumber = baseNumber + i;
      rewardNumbers.push(rewardNumber);
    }

    return rewardNumbers;
  }

  /**
   * Create Infinity Reward cycle
   */
  private async createInfinityCycle(cycleData: {
    customerId: string;
    triggerGlobalNumber: number;
    rewardNumbers: number[];
    totalPoints: number;
    pointsPerReward: number;
    cycleNumber: number;
    nextCycleMultiplier: number;
    isActive: boolean;
  }): Promise<InfinityCycle> {
    const id = crypto.randomUUID();
    const now = new Date();

    const infinityCycle: InfinityCycle = {
      id,
      customerId: cycleData.customerId,
      triggerGlobalNumber: cycleData.triggerGlobalNumber,
      rewardNumbers: cycleData.rewardNumbers,
      totalPoints: cycleData.totalPoints,
      pointsPerReward: cycleData.pointsPerReward,
      cycleNumber: cycleData.cycleNumber,
      nextCycleMultiplier: cycleData.nextCycleMultiplier,
      createdAt: now,
      isActive: cycleData.isActive
    };

    // Store in a simple Map for now (in production, this would be in database)
    const infinityCycles = (storage as any).infinityCycles || new Map();
    infinityCycles.set(id, infinityCycle);
    (storage as any).infinityCycles = infinityCycles;

    return infinityCycle;
  }

  /**
   * Add Infinity Reward points to customer's income wallet
   */
  private async addInfinityRewardToWallet(customerId: string, points: number, infinityCycleId: string): Promise<void> {
    const wallet = await storage.getCustomerWallet(customerId);
    if (wallet) {
      const currentIncomeBalance = parseFloat(wallet.incomeBalance || '0');
      const newIncomeBalance = currentIncomeBalance + points;
      const newTotalIncomeEarned = parseFloat(wallet.totalIncomeEarned || '0') + points;

      await storage.updateCustomerWallet(customerId, {
        incomeBalance: newIncomeBalance.toFixed(2),
        totalIncomeEarned: newTotalIncomeEarned.toFixed(2),
        lastTransactionAt: new Date()
      });

      console.log(`💰 Added ${points} Infinity Reward points to customer wallet`);
    } else {
      // Create wallet if it doesn't exist
      await storage.createCustomerWallet({
        customerId,
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

      console.log(`💰 Created wallet with ${points} Infinity Reward points`);
    }
  }

  /**
   * Get customer's Infinity Reward cycles
   */
  async getCustomerInfinityCycles(customerId: string): Promise<InfinityCycle[]> {
    try {
      const infinityCycles = (storage as any).infinityCycles || new Map();
      return Array.from(infinityCycles.values())
        .filter((cycle: InfinityCycle) => cycle.customerId === customerId)
        .sort((a: InfinityCycle, b: InfinityCycle) => b.createdAt.getTime() - a.createdAt.getTime());
    } catch (error) {
      console.error('Error getting Infinity cycles:', error);
      return [];
    }
  }

  /**
   * Check Infinity eligibility for a customer
   */
  async checkInfinityEligibility(customerUserId: string): Promise<{
    isEligible: boolean;
    currentPoints: number;
    pointsNeeded: number;
  }> {
    try {
      const profile = await storage.getCustomerProfileById(customerUserId);
      if (!profile) {
        return { isEligible: false, currentPoints: 0, pointsNeeded: this.INFINITY_THRESHOLD };
      }

      // Get customer's StepUp rewards
      const stepUpRewards = await storage.getCustomerStepUpRewards(profile.id);
      const totalStepUpPoints = stepUpRewards
        .filter(reward => reward.isAwarded)
        .reduce((sum, reward) => sum + reward.rewardPoints, 0);

      return {
        isEligible: totalStepUpPoints >= this.INFINITY_THRESHOLD,
        currentPoints: totalStepUpPoints,
        pointsNeeded: Math.max(0, this.INFINITY_THRESHOLD - totalStepUpPoints)
      };
    } catch (error) {
      console.error('Error checking Infinity eligibility:', error);
      return { isEligible: false, currentPoints: 0, pointsNeeded: this.INFINITY_THRESHOLD };
    }
  }

  /**
   * Process Infinity cycle (for testing)
   */
  async processInfinityCycle(customerUserId: string): Promise<{
    success: boolean;
    error?: string;
    cycleData?: any;
  }> {
    try {
      const profile = await storage.getCustomerProfileById(customerUserId);
    if (!profile) {
        return { success: false, error: 'Customer profile not found' };
      }

      const result = await this.checkAndTriggerInfinityRewards(profile.id, 30000);
      
      if (result.infinityRewardTriggered) {
        return {
          success: true,
          cycleData: {
            rewardNumbers: result.rewardNumbers,
            totalPoints: result.totalPoints,
            cycleNumber: result.cycleNumber
          }
        };
      } else {
        return { success: false, error: 'Customer not eligible for Infinity Rewards' };
      }
    } catch (error) {
      console.error('Error processing Infinity cycle:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  /**
   * Get Infinity Reward statistics for global admin
   */
  async getInfinityRewardStatistics(): Promise<{
    totalCustomersWithInfinityRewards: number;
    totalInfinityRewardsDistributed: number;
    totalRewardNumbersGenerated: number;
    cyclesByNumber: Record<number, number>;
  }> {
    try {
      const infinityCycles = (storage as any).infinityCycles || new Map();
      const allCycles = Array.from(infinityCycles.values()) as InfinityCycle[];

      const totalCustomersWithInfinityRewards = new Set(allCycles.map(cycle => cycle.customerId)).size;
      const totalInfinityRewardsDistributed = allCycles.reduce((sum, cycle) => sum + cycle.totalPoints, 0);
      const totalRewardNumbersGenerated = allCycles.reduce((sum, cycle) => sum + cycle.rewardNumbers.length, 0);

      const cyclesByNumber = allCycles.reduce((acc, cycle) => {
        acc[cycle.cycleNumber] = (acc[cycle.cycleNumber] || 0) + 1;
        return acc;
      }, {} as Record<number, number>);

      return {
        totalCustomersWithInfinityRewards,
        totalInfinityRewardsDistributed,
        totalRewardNumbersGenerated,
        cyclesByNumber
      };
    } catch (error) {
      console.error('Error getting Infinity Reward statistics:', error);
    return {
        totalCustomersWithInfinityRewards: 0,
        totalInfinityRewardsDistributed: 0,
        totalRewardNumbersGenerated: 0,
        cyclesByNumber: {}
      };
    }
  }
}

// Export singleton instance
export const infinityRewardSystem = new InfinityRewardSystem();