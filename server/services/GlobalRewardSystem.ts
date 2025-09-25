import type { CustomerProfile, InsertCustomerProfile } from "@shared/schema";

export interface RewardPointBreakdown {
  purchasePoints: number;
  wasteManagementPoints: number;
  dailyLoginPoints: number;
  referralPoints: number;
  birthdayPoints: number;
  otherActivityPoints: number;
  totalAccumulated: number;
}

export interface GlobalRewardNumber {
  id: string;
  customerId: string;
  rewardNumber: number;
  serialNumber: number;
  tier1Completed: boolean;
  tier1Amount: number;
  tier1Reward: number;
  tier2Completed: boolean;
  tier2Amount: number;
  tier2Reward: number;
  tier3Completed: boolean;
  tier3Amount: number;
  tier3Reward: number;
  tier4Completed: boolean;
  tier4Amount: number;
  tier4Reward: number;
  tier4VoucherReserve: number;
  tier4RedeemableAmount: number;
  totalPointsRequired: number;
  currentPoints: number;
  isCompleted: boolean;
  createdAt: Date;
  completedAt?: Date;
}

export interface RewardIncome {
  stepUpRewards: number;
  infinityRewards: number;
  affiliateRewards: number;
  rippleRewards: number;
  dailyLoginRewards: number;
  birthdayRewards: number;
  totalRewardIncome: number;
}

export class GlobalRewardSystem {
  private storage: any;
  private globalRewardCounter: number = 0;

  constructor(storage: any) {
    this.storage = storage;
  }

  // 1. Accumulated Points Logic (up to 1499, then converts to reward number at 1500)
  async addAccumulatedPoints(
    customerId: string, 
    points: number, 
    source: 'purchase' | 'waste_management' | 'daily_login' | 'referral' | 'birthday' | 'other'
  ): Promise<{ rewardNumberCreated: boolean; newRewardNumber?: GlobalRewardNumber }> {
    const profile = await this.storage.getCustomerProfile(customerId);
    if (!profile) throw new Error('Customer profile not found');

    // Update item-wise points
    const updatedProfile = { ...profile };
    switch (source) {
      case 'purchase':
        updatedProfile.purchasePoints = (profile.purchasePoints || 0) + points;
        break;
      case 'waste_management':
        updatedProfile.wasteManagementPoints = (profile.wasteManagementPoints || 0) + points;
        break;
      case 'daily_login':
        updatedProfile.dailyLoginPoints = (profile.dailyLoginPoints || 0) + points;
        break;
      case 'referral':
        updatedProfile.referralPoints = (profile.referralPoints || 0) + points;
        break;
      case 'birthday':
        updatedProfile.birthdayPoints = (profile.birthdayPoints || 0) + points;
        break;
      case 'other':
        updatedProfile.otherActivityPoints = (profile.otherActivityPoints || 0) + points;
        break;
    }

    // Calculate new accumulated points
    const currentAccumulated = profile.accumulatedPoints || 0;
    const newAccumulated = currentAccumulated + points;

    // Check if we need to create a reward number (at 1500 points)
    let rewardNumberCreated = false;
    let newRewardNumber: GlobalRewardNumber | undefined;

    if (newAccumulated >= 1500 && currentAccumulated < 1500) {
      // Create new global reward number
      newRewardNumber = await this.createGlobalRewardNumber(customerId);
      rewardNumberCreated = true;

      // Reset accumulated points and add excess to the new reward number
      const excessPoints = newAccumulated - 1500;
      updatedProfile.accumulatedPoints = 0;
      updatedProfile.globalRewardNumbers = (profile.globalRewardNumbers || 0) + 1;

      // Add excess points to the new reward number
      if (excessPoints > 0) {
        await this.addPointsToRewardNumber(newRewardNumber.id, excessPoints);
      }
    } else if (newAccumulated < 1500) {
      // Just accumulate points (up to 1499)
      updatedProfile.accumulatedPoints = newAccumulated;
    } else {
      // Already have reward numbers, add points to the latest active one
      const activeRewardNumber = await this.getActiveRewardNumber(customerId);
      if (activeRewardNumber) {
        await this.addPointsToRewardNumber(activeRewardNumber.id, points);
      }
    }

    // Update total points earned
    updatedProfile.totalPointsEarned = (profile.totalPointsEarned || 0) + points;

    await this.storage.updateCustomerProfile(customerId, updatedProfile);

    return { rewardNumberCreated, newRewardNumber };
  }

  // 2. Create Global Reward Number (when reaching 1500 points)
  async createGlobalRewardNumber(customerId: string): Promise<GlobalRewardNumber> {
    this.globalRewardCounter++;
    const serialNumber = this.globalRewardCounter;

    const rewardNumber: GlobalRewardNumber = {
      id: `reward_${Date.now()}_${Math.random().toString(36).substring(2)}`,
      customerId,
      rewardNumber: this.globalRewardCounter,
      serialNumber,
      tier1Completed: false,
      tier1Amount: 800,
      tier1Reward: this.calculateTier1Reward(serialNumber),
      tier2Completed: false,
      tier2Amount: 1500,
      tier2Reward: this.calculateTier2Reward(serialNumber),
      tier3Completed: false,
      tier3Amount: 3500,
      tier3Reward: this.calculateTier3Reward(serialNumber),
      tier4Completed: false,
      tier4Amount: 32200,
      tier4Reward: this.calculateTier4Reward(serialNumber),
      tier4VoucherReserve: 6000,
      tier4RedeemableAmount: 26200,
      totalPointsRequired: 38000,
      currentPoints: 0,
      isCompleted: false,
      createdAt: new Date()
    };

    // Store the reward number (you'll need to implement storage for this)
    await this.storage.createGlobalRewardNumber(rewardNumber);

    console.log(`🎯 Created Global Reward Number #${serialNumber} for customer ${customerId}`);
    return rewardNumber;
  }

  // 3. StepUp Reward Calculation based on Global Serial Number
  private calculateTier1Reward(serialNumber: number): number {
    // When global company has 6 reward numbers running, serial #1 gets 800 points
    return 800;
  }

  private calculateTier2Reward(serialNumber: number): number {
    // When global company has 30 reward numbers running, serial #1 gets 1500 points
    return 1500;
  }

  private calculateTier3Reward(serialNumber: number): number {
    // When global company has 120 reward numbers running, serial #1 gets 3500 points
    return 3500;
  }

  private calculateTier4Reward(serialNumber: number): number {
    // When global company has 480 reward numbers running, serial #1 gets 32200 points
    return 32200;
  }

  // 4. Add points to existing reward number and check tier progression
  async addPointsToRewardNumber(rewardNumberId: string, points: number): Promise<void> {
    const rewardNumber = await this.storage.getGlobalRewardNumber(rewardNumberId);
    if (!rewardNumber) return;

    const newCurrentPoints = rewardNumber.currentPoints + points;
    let rewardIncome = 0;

    // Check tier progression
    if (!rewardNumber.tier1Completed && newCurrentPoints >= rewardNumber.tier1Amount) {
      rewardNumber.tier1Completed = true;
      rewardIncome += rewardNumber.tier1Reward;
      console.log(`🏆 Tier 1 completed for reward #${rewardNumber.serialNumber}: +${rewardNumber.tier1Reward} reward points`);
    }

    if (rewardNumber.tier1Completed && !rewardNumber.tier2Completed && newCurrentPoints >= rewardNumber.tier1Amount + rewardNumber.tier2Amount) {
      rewardNumber.tier2Completed = true;
      rewardIncome += rewardNumber.tier2Reward;
      console.log(`🏆 Tier 2 completed for reward #${rewardNumber.serialNumber}: +${rewardNumber.tier2Reward} reward points`);
    }

    if (rewardNumber.tier2Completed && !rewardNumber.tier3Completed && newCurrentPoints >= rewardNumber.tier1Amount + rewardNumber.tier2Amount + rewardNumber.tier3Amount) {
      rewardNumber.tier3Completed = true;
      rewardIncome += rewardNumber.tier3Reward;
      console.log(`🏆 Tier 3 completed for reward #${rewardNumber.serialNumber}: +${rewardNumber.tier3Reward} reward points`);
    }

    if (rewardNumber.tier3Completed && !rewardNumber.tier4Completed && newCurrentPoints >= rewardNumber.totalPointsRequired) {
      rewardNumber.tier4Completed = true;
      rewardIncome += rewardNumber.tier4Reward;
      rewardNumber.isCompleted = true;
      rewardNumber.completedAt = new Date();
      
      // Create infinity reward (new 4 reward numbers from remaining 26200)
      await this.createInfinityReward(rewardNumber.customerId, rewardNumber.tier4RedeemableAmount);
      
      console.log(`🏆 Tier 4 completed for reward #${rewardNumber.serialNumber}: +${rewardNumber.tier4Reward} reward points`);
      console.log(`♾️ Infinity reward activated: 4 new reward numbers created`);
    }

    rewardNumber.currentPoints = newCurrentPoints;
    await this.storage.updateGlobalRewardNumber(rewardNumberId, rewardNumber);

    // Add reward income to customer's reward wallet
    if (rewardIncome > 0) {
      await this.addRewardIncome(rewardNumber.customerId, rewardIncome, 'stepup_reward');
    }
  }

  // 5. Infinity Reward System (creates 4 new reward numbers from 26200 remaining)
  async createInfinityReward(customerId: string, amount: number): Promise<void> {
    const remainingAfterVoucher = amount - 6000; // 26200 - 6000 = 20200
    const pointsPerNewReward = remainingAfterVoucher / 4; // 5050 points per new reward

    for (let i = 0; i < 4; i++) {
      const newRewardNumber = await this.createGlobalRewardNumber(customerId);
      await this.addPointsToRewardNumber(newRewardNumber.id, pointsPerNewReward);
    }
  }

  // 6. Affiliate Reward System (5% lifetime commission)
  async processAffiliateReward(referrerId: string, refereeId: string, basePoints: number): Promise<void> {
    const affiliateReward = basePoints * 0.05; // 5% commission
    await this.addRewardIncome(referrerId, affiliateReward, 'affiliate_reward');
    
    console.log(`💰 Affiliate reward: ${referrerId} earned ${affiliateReward} points from ${refereeId}'s ${basePoints} points`);
  }

  // 7. Ripple Reward System
  async processRippleReward(referrerId: string, refereeRewardTier: number): Promise<void> {
    let rippleAmount = 0;
    
    switch (refereeRewardTier) {
      case 1: rippleAmount = 50; break;   // Referee got 800, referrer gets 50
      case 2: rippleAmount = 100; break;  // Referee got 1500, referrer gets 100
      case 3: rippleAmount = 150; break;  // Referee got 3500, referrer gets 150
      case 4: rippleAmount = 700; break;  // Referee got 32200, referrer gets 700
    }

    if (rippleAmount > 0) {
      await this.addRewardIncome(referrerId, rippleAmount, 'ripple_reward');
      console.log(`🌊 Ripple reward: ${referrerId} earned ${rippleAmount} points from referee's tier ${refereeRewardTier} completion`);
    }
  }

  // 8. Add reward income to customer's reward wallet
  async addRewardIncome(customerId: string, amount: number, source: string): Promise<void> {
    const profile = await this.storage.getCustomerProfile(customerId);
    if (!profile) return;

    const updatedRewardPoints = (profile.rewardPoints || 0) + amount;
    await this.storage.updateCustomerProfile(customerId, { rewardPoints: updatedRewardPoints });

    // Create reward transaction record
    await this.storage.createCustomerPointTransaction({
      customerId,
      points: amount,
      transactionType: 'reward_earned',
      source,
      description: `Reward income from ${source}`,
      balanceBefore: profile.rewardPoints || 0,
      balanceAfter: updatedRewardPoints
    });
  }

  // 9. Transfer from reward wallet to balance wallet (with 12.5% VAT + service charge)
  async transferRewardToBalance(customerId: string, amount: number): Promise<{ finalAmount: number; vatAmount: number; serviceCharge: number }> {
    const profile = await this.storage.getCustomerProfile(customerId);
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

    await this.storage.updateCustomerProfile(customerId, {
      rewardPoints: newRewardPoints,
      balanceWallet: newBalanceWallet
    });

    // Create transaction records
    await this.storage.createCustomerPointTransaction({
      customerId,
      points: -amount,
      transactionType: 'reward_transfer_out',
      source: 'reward_to_balance',
      description: `Transfer to balance wallet (VAT: ${vatAmount}, Service: ${serviceCharge})`,
      balanceBefore: profile.rewardPoints || 0,
      balanceAfter: newRewardPoints
    });

    await this.storage.createCustomerPointTransaction({
      customerId,
      points: finalAmount,
      transactionType: 'balance_transfer_in',
      source: 'reward_to_balance',
      description: `Received from reward wallet (after deductions)`,
      balanceBefore: profile.balanceWallet || 0,
      balanceAfter: newBalanceWallet
    });

    return { finalAmount, vatAmount, serviceCharge };
  }

  // 10. Get comprehensive reward breakdown
  async getRewardBreakdown(customerId: string): Promise<{
    accumulatedPoints: RewardPointBreakdown;
    globalRewardNumbers: GlobalRewardNumber[];
    rewardIncome: RewardIncome;
    balanceWallet: number;
  }> {
    const profile = await this.storage.getCustomerProfile(customerId);
    if (!profile) throw new Error('Customer profile not found');

    const rewardNumbers = await this.storage.getGlobalRewardNumbersByCustomer(customerId);

    const accumulatedPoints: RewardPointBreakdown = {
      purchasePoints: profile.purchasePoints || 0,
      wasteManagementPoints: profile.wasteManagementPoints || 0,
      dailyLoginPoints: profile.dailyLoginPoints || 0,
      referralPoints: profile.referralPoints || 0,
      birthdayPoints: profile.birthdayPoints || 0,
      otherActivityPoints: profile.otherActivityPoints || 0,
      totalAccumulated: profile.accumulatedPoints || 0
    };

    const rewardIncome: RewardIncome = {
      stepUpRewards: 0, // Calculate from completed tiers
      infinityRewards: 0,
      affiliateRewards: 0,
      rippleRewards: 0,
      dailyLoginRewards: 0,
      birthdayRewards: 0,
      totalRewardIncome: profile.rewardPoints || 0
    };

    return {
      accumulatedPoints,
      globalRewardNumbers: rewardNumbers,
      rewardIncome,
      balanceWallet: profile.balanceWallet || 0
    };
  }

  // Helper methods
  private async getActiveRewardNumber(customerId: string): Promise<GlobalRewardNumber | null> {
    const rewardNumbers = await this.storage.getGlobalRewardNumbersByCustomer(customerId);
    return rewardNumbers.find((rn: GlobalRewardNumber) => !rn.isCompleted) || null;
  }
}