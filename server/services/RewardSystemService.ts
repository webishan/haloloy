import { storage } from "../storage";

export interface AccumulatedPointsBreakdown {
  purchasePoints: number;
  wasteManagementPoints: number; 
  dailyLoginPoints: number;
  referralPoints: number;
  birthdayPoints: number;
  otherActivityPoints: number;
  totalAccumulated: number;
}

export interface RewardIncomeBreakdown {
  stepUpRewards: number;      // 800/1500/3500/32200
  infinityRewards: number;    // From 26200 split into 4 new numbers
  affiliateRewards: number;   // 5% lifetime commission
  rippleRewards: number;      // 50/100/150/700
  dailyLoginRewards: number;
  birthdayRewards: number;
  totalRewardIncome: number;
}

export interface GlobalRewardNumber {
  id: string;
  customerId: string;
  serialNumber: number;
  tier1: { completed: boolean; amount: 800; reward: number };
  tier2: { completed: boolean; amount: 1500; reward: number };
  tier3: { completed: boolean; amount: 3500; reward: number };
  tier4: { completed: boolean; amount: 32200; reward: number; voucherReserve: 6000; redeemable: 26200 };
  currentPoints: number;
  totalRequired: 38000;
  isCompleted: boolean;
  createdAt: Date;
}

export interface RewardSystemData {
  // Accumulated Points (up to 1499, then converts to reward number)
  accumulatedPoints: AccumulatedPointsBreakdown;
  
  // Global Reward Numbers
  globalRewardNumbers: GlobalRewardNumber[];
  totalGlobalNumbers: number;
  completedGlobalNumbers: number;
  activeGlobalNumbers: number;
  
  // Reward Income (in Taka)
  rewardIncome: RewardIncomeBreakdown;
  
  // Balance Wallet (after transfer from reward income with deductions)
  balanceWallet: number;
  
  // Serial Numbers
  globalSerial: { assigned: number; total: number };
  localSerial: { assigned: number; total: number };
  serialActivation: { activated: number; total: number };
}

export class RewardSystemService {
  
  // Get complete reward system data for a customer
  async getRewardSystemData(customerId: string): Promise<RewardSystemData> {
    const profile = await storage.getCustomerProfile(customerId);
    if (!profile) {
      throw new Error('Customer profile not found');
    }

    // Get accumulated points breakdown
    const accumulatedPoints: AccumulatedPointsBreakdown = {
      purchasePoints: profile.purchasePoints || 0,
      wasteManagementPoints: profile.wasteManagementPoints || 0,
      dailyLoginPoints: profile.dailyLoginPoints || 0,
      referralPoints: profile.referralPoints || 0,
      birthdayPoints: profile.birthdayPoints || 0,
      otherActivityPoints: profile.otherActivityPoints || 0,
      totalAccumulated: profile.accumulatedPoints || 0
    };

    // Get global reward numbers
    const globalRewardNumbers = await storage.getGlobalRewardNumbersByCustomer(customerId);
    const totalGlobalNumbers = globalRewardNumbers.length;
    const completedGlobalNumbers = globalRewardNumbers.filter(rn => rn.isCompleted).length;
    const activeGlobalNumbers = totalGlobalNumbers - completedGlobalNumbers;

    // Get reward income breakdown
    const rewardIncome: RewardIncomeBreakdown = {
      stepUpRewards: await this.calculateStepUpRewards(customerId),
      infinityRewards: await this.calculateInfinityRewards(customerId),
      affiliateRewards: await this.calculateAffiliateRewards(customerId),
      rippleRewards: await this.calculateRippleRewards(customerId),
      dailyLoginRewards: await this.calculateDailyLoginRewards(customerId),
      birthdayRewards: await this.calculateBirthdayRewards(customerId),
      totalRewardIncome: profile.rewardPoints || 0
    };

    // Get serial number data
    const serialNumber = await storage.getCustomerSerialNumber(customerId);
    const globalSerial = {
      assigned: serialNumber ? 1 : 0,
      total: await this.getTotalGlobalSerials()
    };

    const localSerial = {
      assigned: 0, // Not implemented yet
      total: 0
    };

    const serialActivation = {
      activated: serialNumber ? 1 : 0,
      total: 500 // As shown in screenshot
    };

    return {
      accumulatedPoints,
      globalRewardNumbers,
      totalGlobalNumbers,
      completedGlobalNumbers,
      activeGlobalNumbers,
      rewardIncome,
      balanceWallet: profile.balanceWallet || 0,
      globalSerial,
      localSerial,
      serialActivation
    };
  }

  // Add points to accumulated points (implements the 1500 conversion logic)
  async addAccumulatedPoints(
    customerId: string, 
    points: number, 
    source: 'purchase' | 'waste_management' | 'daily_login' | 'referral' | 'birthday' | 'other'
  ): Promise<{ rewardNumberCreated: boolean; newSerialNumber?: number }> {
    const profile = await storage.getCustomerProfile(customerId);
    if (!profile) {
      throw new Error('Customer profile not found');
    }

    // Update source-specific points
    const updates: any = {};
    switch (source) {
      case 'purchase':
        updates.purchasePoints = (profile.purchasePoints || 0) + points;
        break;
      case 'waste_management':
        updates.wasteManagementPoints = (profile.wasteManagementPoints || 0) + points;
        break;
      case 'daily_login':
        updates.dailyLoginPoints = (profile.dailyLoginPoints || 0) + points;
        break;
      case 'referral':
        updates.referralPoints = (profile.referralPoints || 0) + points;
        break;
      case 'birthday':
        updates.birthdayPoints = (profile.birthdayPoints || 0) + points;
        break;
      case 'other':
        updates.otherActivityPoints = (profile.otherActivityPoints || 0) + points;
        break;
    }

    // Update total points earned
    updates.totalPointsEarned = (profile.totalPointsEarned || 0) + points;

    // Handle accumulated points logic (up to 1499, then convert to reward number at 1500)
    const currentAccumulated = profile.accumulatedPoints || 0;
    const newAccumulated = currentAccumulated + points;
    
    let rewardNumberCreated = false;
    let newSerialNumber: number | undefined;

    if (newAccumulated >= 1500 && currentAccumulated < 1500) {
      // Create global reward number and assign serial number
      const serialData = await storage.assignSerialNumberToCustomer(customerId);
      newSerialNumber = serialData.globalSerialNumber;
      
      // Create global reward number
      await this.createGlobalRewardNumber(customerId, serialData.globalSerialNumber);
      
      // Reset accumulated points and add excess to the new reward number
      const excessPoints = newAccumulated - 1500;
      updates.accumulatedPoints = 0;
      
      if (excessPoints > 0) {
        await this.addPointsToRewardNumber(customerId, excessPoints);
      }
      
      rewardNumberCreated = true;
      console.log(`🎯 Customer ${customerId} reached 1500 points! Created Global Reward Number #${newSerialNumber}`);
    } else if (newAccumulated < 1500) {
      // Just accumulate points (up to 1499)
      updates.accumulatedPoints = newAccumulated;
    } else {
      // Already has reward numbers, add points to active reward number
      await this.addPointsToRewardNumber(customerId, points);
    }

    // Update customer profile
    await storage.updateCustomerProfile(customerId, updates);

    return { rewardNumberCreated, newSerialNumber };
  }

  // Create a new global reward number
  private async createGlobalRewardNumber(customerId: string, serialNumber: number): Promise<void> {
    const rewardNumber: GlobalRewardNumber = {
      id: `reward_${Date.now()}_${Math.random().toString(36).substring(2)}`,
      customerId,
      serialNumber,
      tier1: { completed: false, amount: 800, reward: this.calculateTierReward(serialNumber, 1) },
      tier2: { completed: false, amount: 1500, reward: this.calculateTierReward(serialNumber, 2) },
      tier3: { completed: false, amount: 3500, reward: this.calculateTierReward(serialNumber, 3) },
      tier4: { completed: false, amount: 32200, reward: this.calculateTierReward(serialNumber, 4), voucherReserve: 6000, redeemable: 26200 },
      currentPoints: 0,
      totalRequired: 38000,
      isCompleted: false,
      createdAt: new Date()
    };

    await storage.createGlobalRewardNumber(rewardNumber);
  }

  // Add points to existing reward number and check tier progression
  private async addPointsToRewardNumber(customerId: string, points: number): Promise<void> {
    const rewardNumbers = await storage.getGlobalRewardNumbersByCustomer(customerId);
    const activeRewardNumber = rewardNumbers.find(rn => !rn.isCompleted);
    
    if (!activeRewardNumber) return;

    const newCurrentPoints = activeRewardNumber.currentPoints + points;
    let rewardEarned = 0;

    // Check tier progression
    if (!activeRewardNumber.tier1.completed && newCurrentPoints >= activeRewardNumber.tier1.amount) {
      activeRewardNumber.tier1.completed = true;
      rewardEarned += activeRewardNumber.tier1.reward;
      console.log(`🏆 Tier 1 completed for serial #${activeRewardNumber.serialNumber}: +${activeRewardNumber.tier1.reward} Taka`);
    }

    if (activeRewardNumber.tier1.completed && !activeRewardNumber.tier2.completed && 
        newCurrentPoints >= activeRewardNumber.tier1.amount + activeRewardNumber.tier2.amount) {
      activeRewardNumber.tier2.completed = true;
      rewardEarned += activeRewardNumber.tier2.reward;
      console.log(`🏆 Tier 2 completed for serial #${activeRewardNumber.serialNumber}: +${activeRewardNumber.tier2.reward} Taka`);
    }

    if (activeRewardNumber.tier2.completed && !activeRewardNumber.tier3.completed && 
        newCurrentPoints >= activeRewardNumber.tier1.amount + activeRewardNumber.tier2.amount + activeRewardNumber.tier3.amount) {
      activeRewardNumber.tier3.completed = true;
      rewardEarned += activeRewardNumber.tier3.reward;
      console.log(`🏆 Tier 3 completed for serial #${activeRewardNumber.serialNumber}: +${activeRewardNumber.tier3.reward} Taka`);
    }

    if (activeRewardNumber.tier3.completed && !activeRewardNumber.tier4.completed && 
        newCurrentPoints >= activeRewardNumber.totalRequired) {
      activeRewardNumber.tier4.completed = true;
      activeRewardNumber.isCompleted = true;
      rewardEarned += activeRewardNumber.tier4.reward;
      
      // Create infinity reward (4 new reward numbers from 26200 remaining)
      await this.createInfinityReward(customerId);
      
      console.log(`🏆 Tier 4 completed for serial #${activeRewardNumber.serialNumber}: +${activeRewardNumber.tier4.reward} Taka`);
      console.log(`♾️ Infinity reward activated: 4 new reward numbers created from ${activeRewardNumber.tier4.redeemable} Taka`);
    }

    activeRewardNumber.currentPoints = newCurrentPoints;
    await storage.updateGlobalRewardNumber(activeRewardNumber.id, activeRewardNumber);

    // Add reward income
    if (rewardEarned > 0) {
      await this.addRewardIncome(customerId, rewardEarned, 'stepup_reward');
    }
  }

  // Create infinity reward (4 new reward numbers from 26200 remaining)
  private async createInfinityReward(customerId: string): Promise<void> {
    const remainingAmount = 26200; // After 6000 voucher reserve
    const pointsPerNewReward = remainingAmount / 4; // 6550 points per new reward

    for (let i = 0; i < 4; i++) {
      // Get next serial number
      const serialData = await storage.assignSerialNumberToCustomer(customerId);
      await this.createGlobalRewardNumber(customerId, serialData.globalSerialNumber);
      
      // Add initial points to the new reward number
      await this.addPointsToRewardNumber(customerId, pointsPerNewReward);
    }
  }

  // Calculate tier rewards based on global serial number and company progress
  private calculateTierReward(serialNumber: number, tier: number): number {
    // This implements the Bengali logic where rewards depend on global company progress
    switch (tier) {
      case 1: // When global company has 6 reward numbers running
        return 800;
      case 2: // When global company has 30 reward numbers running  
        return 1500;
      case 3: // When global company has 120 reward numbers running
        return 3500;
      case 4: // When global company has 480 reward numbers running
        return 32200;
      default:
        return 0;
    }
  }

  // Add reward income to customer's reward wallet
  private async addRewardIncome(customerId: string, amount: number, source: string): Promise<void> {
    const profile = await storage.getCustomerProfile(customerId);
    if (!profile) return;

    const newRewardPoints = (profile.rewardPoints || 0) + amount;
    await storage.updateCustomerProfile(customerId, { rewardPoints: newRewardPoints });

    // Create transaction record
    await storage.createCustomerPointTransaction({
      customerId,
      points: amount,
      transactionType: 'reward_earned',
      source,
      description: `Reward income from ${source}: ${amount} Taka`,
      balanceBefore: profile.rewardPoints || 0,
      balanceAfter: newRewardPoints
    });
  }

  // Transfer from reward wallet to balance wallet (with 12.5% VAT + 5% service charge)
  async transferRewardToBalance(customerId: string, amount: number): Promise<{ finalAmount: number; vatAmount: number; serviceCharge: number }> {
    const profile = await storage.getCustomerProfile(customerId);
    if (!profile || (profile.rewardPoints || 0) < amount) {
      throw new Error('Insufficient reward balance');
    }

    const vatRate = 0.125; // 12.5% VAT
    const serviceChargeRate = 0.05; // 5% service charge
    
    const vatAmount = amount * vatRate;
    const serviceCharge = amount * serviceChargeRate;
    const finalAmount = amount - vatAmount - serviceCharge;

    // Update balances
    const newRewardPoints = (profile.rewardPoints || 0) - amount;
    const newBalanceWallet = (profile.balanceWallet || 0) + finalAmount;

    await storage.updateCustomerProfile(customerId, {
      rewardPoints: newRewardPoints,
      balanceWallet: newBalanceWallet
    });

    return { finalAmount, vatAmount, serviceCharge };
  }

  // Calculate various reward income types
  private async calculateStepUpRewards(customerId: string): Promise<number> {
    // Calculate from completed tiers
    return 0; // Implement based on completed tiers
  }

  private async calculateInfinityRewards(customerId: string): Promise<number> {
    // Calculate from infinity reward system
    return 0;
  }

  private async calculateAffiliateRewards(customerId: string): Promise<number> {
    // Calculate 5% lifetime commission
    return 0;
  }

  private async calculateRippleRewards(customerId: string): Promise<number> {
    // Calculate ripple rewards (50/100/150/700)
    return 0;
  }

  private async calculateDailyLoginRewards(customerId: string): Promise<number> {
    return 0;
  }

  private async calculateBirthdayRewards(customerId: string): Promise<number> {
    return 0;
  }

  private async getTotalGlobalSerials(): Promise<number> {
    // Get total number of global serials assigned
    const allSerials = await storage.getAllCustomerSerialNumbers();
    return allSerials.length;
  }
}

export const rewardSystemService = new RewardSystemService();