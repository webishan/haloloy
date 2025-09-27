import { storage } from '../storage';

export interface GlobalNumberRecord {
  id: string;
  customerId: string;
  globalNumber: number;
  assignedAt: Date;
  pointsAtAssignment: number;
  rewardsEarned: number[];
  isActive: boolean;
}

export interface StepUpReward {
  globalNumber: number;
  multiplier: number;
  rewardPoints: number;
  awardedTo: string; // customer ID who received the reward
  awardedAt: Date;
}

export class GlobalNumberSystem {
  // StepUp multipliers and their corresponding reward points
  private readonly STEPUP_MULTIPLIERS = [5, 25, 125, 500, 2500];
  private readonly STEPUP_REWARDS = [500, 1500, 3000, 30000, 160000];
  
  // Policy: Reward points do NOT count toward triggering new Global Numbers
  private readonly REWARD_POINTS_TRIGGER_GLOBAL_NUMBERS = false;

  /**
   * Check if customer has reached 1500 points and assign Global Number
   */
  async checkAndAssignGlobalNumber(customerUserId: string, earnedPoints: number, isRewardPoints: boolean = false): Promise<{
    globalNumberAssigned: boolean;
    globalNumber?: number;
    pointsReset: boolean;
    stepUpRewards: StepUpReward[];
  }> {
    console.log(`🔍 checkAndAssignGlobalNumber called for user ${customerUserId} with ${earnedPoints} points`);
    const profile = await storage.getCustomerProfile(customerUserId);
    if (!profile) {
      throw new Error('Customer profile not found');
    }
    console.log(`🔍 Current profile: accumulated=${profile.accumulatedPoints}, global=${profile.globalSerialNumber}`);

    // If these are reward points and policy says they don't trigger Global Numbers, skip
    if (isRewardPoints && !this.REWARD_POINTS_TRIGGER_GLOBAL_NUMBERS) {
      // Just add to balance without triggering Global Number
      await storage.updateCustomerProfile(customerUserId, {
        currentPointsBalance: profile.currentPointsBalance + earnedPoints,
        totalPointsEarned: profile.totalPointsEarned + earnedPoints
      });
      
      return {
        globalNumberAssigned: false,
        pointsReset: false,
        stepUpRewards: []
      };
    }

    const currentAccumulated = profile.accumulatedPoints || 0;
    const newAccumulated = currentAccumulated + earnedPoints;

    // Check if customer reaches 1500 points threshold for the first time
    if (newAccumulated >= 1500 && currentAccumulated < 1500) {
      // Only assign Global Number if customer doesn't already have one (globalSerialNumber = 0)
      if (profile.globalSerialNumber === 0 || profile.globalSerialNumber === null || profile.globalSerialNumber === undefined) {
        // Update total points earned before assigning global number
        const newTotalEarned = profile.totalPointsEarned + earnedPoints;
        console.log(`🔍 Updating totalPointsEarned: ${profile.totalPointsEarned} + ${earnedPoints} = ${newTotalEarned}`);
        await storage.updateCustomerProfile(customerUserId, {
          totalPointsEarned: newTotalEarned
        });
        
        // Assign new Global Number
        const globalNumber = await this.assignGlobalNumber(customerUserId);
        
        // Check for StepUp rewards
        const stepUpRewards = await this.checkStepUpRewards(globalNumber);
        
        return {
          globalNumberAssigned: true,
          globalNumber,
          pointsReset: true,
          stepUpRewards
        };
      } else {
        // Customer already has a Global Number, just reset points and accumulate
        await storage.updateCustomerProfile(customerUserId, {
          accumulatedPoints: 0, // Reset accumulated points
          currentPointsBalance: 0, // Reset current balance
          totalPointsEarned: profile.totalPointsEarned + earnedPoints
        });
        
        return {
          globalNumberAssigned: false,
          pointsReset: true,
          stepUpRewards: []
        };
      }
    } else {
      // Just accumulate points
      await storage.updateCustomerProfile(customerUserId, {
        accumulatedPoints: newAccumulated,
        currentPointsBalance: profile.currentPointsBalance + earnedPoints,
        totalPointsEarned: profile.totalPointsEarned + earnedPoints
      });
      
      return {
        globalNumberAssigned: false,
        pointsReset: false,
        stepUpRewards: []
      };
    }
  }

  /**
   * Assign a new Global Number to customer (sequential, company-wide)
   */
  private async assignGlobalNumber(customerUserId: string): Promise<number> {
    // Get customer profile to get the profile ID
    const profile = await storage.getCustomerProfile(customerUserId);
    if (!profile) {
      throw new Error('Customer profile not found');
    }
    
    // Assign serial number to customer which handles getting the next global number
    const serial = await storage.assignSerialNumberToCustomer(profile.id);
    
    console.log(`🎯 Global Number #${serial.globalSerialNumber} assigned to customer ${customerUserId}`);
    
    return serial.globalSerialNumber;
  }

  /**
   * Check for StepUp rewards when a new Global Number is created
   * Rule: Check if newGlobalNumber matches milestone numbers (5, 25, 125, 500, 2500)
   */
  private async checkStepUpRewards(newGlobalNumber: number): Promise<StepUpReward[]> {
    const rewards: StepUpReward[] = [];
    
    // Check if the new global number matches any milestone
    const milestoneIndex = this.STEPUP_MULTIPLIERS.indexOf(newGlobalNumber);
    
    if (milestoneIndex !== -1) {
      const rewardPoints = this.STEPUP_REWARDS[milestoneIndex];
      
      // Find the customer who has the first global number (global number 1)
      const allSerialNumbers = await storage.getAllCustomerSerialNumbers();
      const firstGlobalCustomer = allSerialNumbers.find(s => s.globalSerialNumber === 1);
      
      if (firstGlobalCustomer) {
        // Check if this reward has already been awarded (idempotent)
        const alreadyAwarded = await this.hasRewardBeenAwarded(1, newGlobalNumber);
        
        if (!alreadyAwarded) {
          // Award the reward to the first global number achiever
          const reward = await this.awardStepUpReward(
            firstGlobalCustomer.customerId,
            1, // First global number
            newGlobalNumber, // Milestone number
            rewardPoints
          );
          
          rewards.push(reward);
          
          console.log(`🎁 StepUp Reward: Global #1 gets ${rewardPoints} points when milestone #${newGlobalNumber} is reached`);
        }
      }
    }
    
    return rewards;
  }

  /**
   * Award StepUp reward to customer
   */
  private async awardStepUpReward(
    customerId: string,
    globalNumber: number,
    multiplier: number,
    rewardPoints: number
  ): Promise<StepUpReward> {
    const profile = await storage.getCustomerProfile(customerId);
    if (!profile) {
      throw new Error('Customer profile not found');
    }

    // Add reward points to customer balance (these are reward points, not earned points)
    await storage.updateCustomerProfile(customerId, {
      currentPointsBalance: profile.currentPointsBalance + rewardPoints,
      totalPointsEarned: profile.totalPointsEarned + rewardPoints
    });

    // Update customer wallet
    const wallet = await storage.getCustomerWallet(profile.id);
    if (wallet) {
      await storage.updateCustomerWallet(profile.id, {
        pointsBalance: wallet.pointsBalance + rewardPoints,
        totalPointsEarned: wallet.totalPointsEarned + rewardPoints,
        lastTransactionAt: new Date()
      });
    }

    // Create transaction record
    await storage.createCustomerPointTransaction({
      customerId: profile.id,
      merchantId: 'system',
      points: rewardPoints,
      transactionType: 'stepup_reward',
      description: `StepUp Reward: Global #${globalNumber} × ${multiplier} multiplier`,
      balanceBefore: profile.currentPointsBalance,
      balanceAfter: profile.currentPointsBalance + rewardPoints
    });

    // Record the reward (for idempotency)
    await this.recordStepUpReward(globalNumber, multiplier, customerId);

    return {
      globalNumber,
      multiplier,
      rewardPoints,
      awardedTo: customerId,
      awardedAt: new Date()
    };
  }

  /**
   * Check if a StepUp reward has already been awarded
   */
  private async hasRewardBeenAwarded(globalNumber: number, multiplier: number): Promise<boolean> {
    // This would check a rewards table - for now, we'll use a simple approach
    // In a real implementation, you'd have a separate table for tracking awarded rewards
    return false; // For now, always allow rewards (can be enhanced)
  }

  /**
   * Record that a StepUp reward has been awarded (for idempotency)
   */
  private async recordStepUpReward(globalNumber: number, multiplier: number, customerId: string): Promise<void> {
    // This would record in a rewards table - for now, we'll log it
    console.log(`📝 Recorded StepUp reward: Global #${globalNumber} × ${multiplier} → Customer ${customerId}`);
  }

  /**
   * Get customer's Global Numbers
   */
  async getCustomerGlobalNumbers(customerId: string): Promise<GlobalNumberRecord[]> {
    const profile = await storage.getCustomerProfile(customerId);
    if (!profile) {
      return [];
    }

    const serialNumbers = await storage.getAllCustomerSerialNumbers();
    const customerSerials = serialNumbers.filter(s => s.customerId === profile.id);

    return customerSerials.map(serial => ({
      id: serial.id,
      customerId: serial.customerId,
      globalNumber: serial.globalSerialNumber,
      assignedAt: serial.createdAt,
      pointsAtAssignment: serial.pointsAtSerial || 1500,
      rewardsEarned: [], // Would be populated from rewards table
      isActive: serial.isActive
    }));
  }

  /**
   * Get system-wide Global Number statistics
   */
  async getGlobalNumberStats(): Promise<{
    totalGlobalNumbers: number;
    latestGlobalNumber: number;
    totalRewardsAwarded: number;
    totalRewardPoints: number;
  }> {
    const allSerials = await storage.getAllCustomerSerialNumbers();
    
    return {
      totalGlobalNumbers: allSerials.length,
      latestGlobalNumber: Math.max(...allSerials.map(s => s.globalSerialNumber), 0),
      totalRewardsAwarded: 0, // Would be calculated from rewards table
      totalRewardPoints: 0    // Would be calculated from rewards table
    };
  }
}

export const globalNumberSystem = new GlobalNumberSystem();