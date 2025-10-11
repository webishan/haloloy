import { storage } from '../storage';
import { rippleRewardSystem } from './RippleRewardSystem';
import { stepUpRewardSystem } from './StepUpRewardSystem';

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
  // StepUp multipliers and their corresponding reward points according to specification
  private readonly STEPUP_MULTIPLIERS = [5, 25, 125, 500, 2500];
  private readonly STEPUP_REWARDS = [500, 1500, 3000, 30000, 160000];
  
  // Policy: Points earned through rewards do NOT count toward triggering new Global Numbers
  private readonly REWARD_POINTS_TRIGGER_GLOBAL_NUMBERS = false;
  
  // Points threshold to trigger new Global Number
  private readonly GLOBAL_NUMBER_THRESHOLD = 1500;

  /**
   * Check if customer has reached exactly 1500 points and assign Global Number
   * User Requirements:
   * - When customer reaches 1500 points, assign next sequential global number (1, 2, 3...)
   * - Reset customer's loyalty points to 0 after assigning global number
   * - Support multiple global numbers per customer
   * - Global numbers are assigned sequentially based on order of reaching 1500 points
   */
  async checkAndAssignGlobalNumber(customerUserId: string, earnedPoints: number, isRewardPoints: boolean = false): Promise<{
    globalNumberAssigned: boolean;
    globalNumber?: number;
    pointsReset: boolean;
    stepUpRewards: StepUpReward[];
    globalNumbers: number[];
  }> {
    console.log(`🔍 Global Number System: Processing ${earnedPoints} points for customer ${customerUserId}`);
    const profile = await storage.getCustomerProfile(customerUserId);
    if (!profile) {
      throw new Error('Customer profile not found');
    }
    
    // Calculate customer's new total points after earning
    const currentPoints = profile.currentPointsBalance || 0;
    const newPointsTotal = currentPoints + earnedPoints;
    
    console.log(`🔍 Current points: ${currentPoints}, adding: ${earnedPoints}, new total: ${newPointsTotal}`);

    // If these are reward points and policy says they don't trigger Global Numbers, skip
    if (isRewardPoints && !this.REWARD_POINTS_TRIGGER_GLOBAL_NUMBERS) {
      // DON'T add points here - they should already be added by the calling function
      // This prevents double addition of points
      console.log(`✅ Reward points already added by calling function: ${earnedPoints} (no global number triggered)`);
      return {
        globalNumberAssigned: false,
        pointsReset: false,
        stepUpRewards: [],
        globalNumbers: []
      };
    }

    const stepUpRewards: StepUpReward[] = [];
    let globalNumbersAssigned: number[] = [];
    let remainingPoints = newPointsTotal;

    // Process all complete 1500-point thresholds
    while (remainingPoints >= this.GLOBAL_NUMBER_THRESHOLD) {
      // Assign sequential global number
      const globalNumber = await this.assignSequentialGlobalNumber(customerUserId);
      globalNumbersAssigned.push(globalNumber);
      remainingPoints -= this.GLOBAL_NUMBER_THRESHOLD;
      
      console.log(`🎯 Assigned Sequential Global Number #${globalNumber} to customer ${customerUserId}`);
      console.log(`🔄 Points after global number: ${remainingPoints} remaining`);
      
      // Check for StepUp rewards using the unified system
      const { unifiedStepUpRewardSystem } = await import('./UnifiedStepUpRewardSystem');
      const rewards = await unifiedStepUpRewardSystem.processNewGlobalNumber(globalNumber);
      stepUpRewards.push(...rewards);
    }

    // Important: Points reset to 0 after getting global number(s)
    // Only remaining points less than 1500 are kept
    await storage.updateCustomerProfile(customerUserId, {
      currentPointsBalance: remainingPoints, // RESET: Only leftover points < 1500
      // DON'T add earnedPoints here - they should already be added by the calling function
      // totalPointsEarned: profile.totalPointsEarned + earnedPoints,
      globalRewardNumbers: (profile.globalRewardNumbers || 0) + globalNumbersAssigned.length,
      globalSerialNumber: globalNumbersAssigned[globalNumbersAssigned.length - 1] // Store the latest Global Number
    });

    // Update customer wallet to reflect the point reset
    const wallet = await storage.getCustomerWallet(profile.id);
    if (wallet) {
      await storage.updateCustomerWallet(profile.id, {
        rewardPointBalance: remainingPoints, // Reset to remaining points only
        // DON'T add earnedPoints here - they should already be added by the calling function
        // totalRewardPointsEarned: wallet.totalRewardPointsEarned + earnedPoints,
        lastTransactionAt: new Date()
      });
    }

    if (globalNumbersAssigned.length > 0) {
      console.log(`✅ ${globalNumbersAssigned.length} global numbers assigned: [${globalNumbersAssigned.join(', ')}]`);
      console.log(`🔄 Points reset to: ${remainingPoints} (from ${newPointsTotal})`);
      
      return {
        globalNumberAssigned: true,
        globalNumber: globalNumbersAssigned[globalNumbersAssigned.length - 1], // Latest global number
        pointsReset: true,
        stepUpRewards,
        globalNumbers: globalNumbersAssigned
      };
    } else {
      // Just update points without assigning global number
      console.log(`📊 Points updated: ${newPointsTotal}/${this.GLOBAL_NUMBER_THRESHOLD} (need ${this.GLOBAL_NUMBER_THRESHOLD - newPointsTotal} more)`);
      
      return {
        globalNumberAssigned: false,
        pointsReset: false,
        stepUpRewards: [],
        globalNumbers: []
      };
    }
  }

  /**
   * Assign next sequential Global Number to customer (1, 2, 3, 4, 5...)
   */
  private async assignSequentialGlobalNumber(customerUserId: string): Promise<number> {
    // Get customer profile
    const profile = await storage.getCustomerProfile(customerUserId);
    if (!profile) {
      throw new Error('Customer profile not found');
    }
    
    // Get next sequential global number (using existing serial number system)
    // This method already handles creating the serial number record AND updating the customer profile
    const serial = await storage.assignSerialNumberToCustomer(profile.id);
    const nextGlobalNumber = serial.globalSerialNumber;
    
    // Note: assignSerialNumberToCustomer already creates the serial number record
    // We don't need to create a separate GlobalNumber record as it would be duplicate
    
    // Note: assignSerialNumberToCustomer already updates the customer profile with globalSerialNumber
    // No need to update again here
    
    console.log(`🎯 Sequential Global Number #${nextGlobalNumber} assigned to customer ${customerUserId}`);
    return nextGlobalNumber;
  }

  // StepUp rewards are now handled by the dedicated StepUpRewardSystem

  /**
   * Award milestone reward to customer who achieved specific global number
   */
  private async awardMilestoneReward(
    customerId: string,
    globalNumber: number,
    bonusPoints: number
  ): Promise<StepUpReward> {
    const profile = await storage.getCustomerProfile(customerId);
    if (!profile) {
      throw new Error('Customer profile not found');
    }

    // Add bonus points to customer balance (these are reward points, not earned points)
    await storage.updateCustomerProfile(customerId, {
      currentPointsBalance: profile.currentPointsBalance + bonusPoints,
      totalPointsEarned: profile.totalPointsEarned + bonusPoints
    });

    // Update customer wallet
    const wallet = await storage.getCustomerWallet(profile.id);
    if (wallet) {
      await storage.updateCustomerWallet(profile.id, {
        rewardPointBalance: wallet.rewardPointBalance + bonusPoints,
        totalRewardPointsEarned: wallet.totalRewardPointsEarned + bonusPoints,
        lastTransactionAt: new Date()
      });
    }

    // Create transaction record
    await storage.createCustomerPointTransaction({
      customerId: profile.id,
      merchantId: 'system',
      points: bonusPoints,
      transactionType: 'earned',
      description: `StepUp Milestone Reward: ${this.getMilestoneDescription(globalNumber)} customer globally to reach 1500 points`,
      balanceBefore: profile.currentPointsBalance,
      balanceAfter: profile.currentPointsBalance + bonusPoints
    });

    // Record the milestone reward using new schema
    await this.recordMilestoneReward(globalNumber, bonusPoints, profile.id);

    console.log(`🎁 Milestone reward awarded: Customer ${customerId} (Global #${globalNumber}) received ${bonusPoints} bonus points`);

    return {
      globalNumber,
      multiplier: 0, // Not applicable for milestone rewards
      rewardPoints: bonusPoints,
      awardedTo: customerId,
      awardedAt: new Date()
    };
  }

  // StepUp reward awarding is now handled by StepUpRewardSystem

  /**
   * Get milestone description (5th, 25th, 125th, etc.)
   */
  private getMilestoneDescription(globalNumber: number): string {
    if (globalNumber === 5) return "5th";
    if (globalNumber === 25) return "25th";
    if (globalNumber === 125) return "125th";
    if (globalNumber === 500) return "500th";
    if (globalNumber === 2500) return "2500th";
    return `${globalNumber}th`;
  }

  /**
   * Check if a milestone reward has already been awarded
   */
  private async hasMilestoneRewardBeenAwarded(milestoneGlobalNumber: number): Promise<boolean> {
    try {
      // Find the customer who achieved this milestone
      const allSerialNumbers = await storage.getAllCustomerSerialNumbers();
      const milestoneCustomer = allSerialNumbers.find(s => s.globalSerialNumber === milestoneGlobalNumber);
      
      if (!milestoneCustomer) {
        return false;
      }

      // Check transaction history for this specific milestone reward
      const transactions = await storage.getCustomerPointTransactions(milestoneCustomer.customerId);
      const rewardDescription = `StepUp Milestone Reward: ${this.getMilestoneDescription(milestoneGlobalNumber)} customer globally to reach 1500 points`;
      
      // Look for existing transaction with exact description and type
      const existingReward = transactions.find(t => 
        t.description === rewardDescription && 
        t.transactionType === 'earned'
      );

      if (existingReward) {
        console.log(`⚠️ Milestone reward already awarded: Global #${milestoneGlobalNumber}`);
      }

      return existingReward !== undefined;
    } catch (error) {
      console.error('Error checking if milestone reward has been awarded:', error);
      return false; // If there's an error, allow the reward to be processed
    }
  }

  /**
   * Record milestone reward achievement
   */
  private async recordMilestoneReward(globalNumber: number, bonusPoints: number, customerId: string): Promise<void> {
    try {
      // For now, we rely on the transaction record created in awardMilestoneReward
      // Future enhancement: use the new stepUpMilestones table for proper tracking
      console.log(`📝 Milestone reward recorded: Customer ${customerId} (Global #${globalNumber}) received ${bonusPoints} bonus points`);
    } catch (error) {
      console.error('Error recording milestone reward:', error);
    }
  }

  // StepUp reward checking and recording is now handled by StepUpRewardSystem

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

  // Income wallet crediting is now handled by StepUpRewardSystem
}

export const globalNumberSystem = new GlobalNumberSystem();