import { storage } from '../storage';
import { GlobalRewardNumber } from '../storage';

export class RewardSystemService {
  // StepUp multipliers configuration
  private readonly STEPUP_MULTIPLIERS = [5, 25, 125, 500, 2500];
  private readonly STEPUP_REWARDS = [500, 1500, 3000, 30000, 160000];
  
  // Create a new Global Number when customer reaches 1500 points
  async createGlobalRewardNumber(customerId: string): Promise<GlobalRewardNumber> {
    const profile = await storage.getCustomerProfile(customerId);
    if (!profile) {
      throw new Error('Customer profile not found');
    }

    if (profile.accumulatedPoints < 1500) {
      throw new Error('Customer has not reached 1500 points yet');
    }

    // Get the next global number (company-wide serial)
    const nextGlobalNumber = await this.getNextGlobalNumber();
    
    // Get customer's personal serial number
    const customerSerialNumber = await this.getCustomerSerialNumber(customerId);

    // Reset customer's accumulated points to 0
    await storage.updateCustomerProfile(customerId, {
      accumulatedPoints: 0,
      currentPointsBalance: 0,
      purchasePoints: 0,
      wasteManagementPoints: 0,
      dailyLoginPoints: 0,
      referralPoints: 0,
      birthdayPoints: 0,
      otherActivityPoints: 0
    });

    // Create the Global Reward Number
    const globalRewardNumber: GlobalRewardNumber = {
      id: `reward_${Date.now()}_${Math.random().toString(36).substring(2)}`,
      customerId,
      globalNumber: nextGlobalNumber,
      serialNumber: customerSerialNumber,
      step1: { completed: false, amount: this.calculateStepAmount(nextGlobalNumber, 1), reward: 500, multiplier: 5 },
      step2: { completed: false, amount: this.calculateStepAmount(nextGlobalNumber, 2), reward: 1500, multiplier: 25 },
      step3: { completed: false, amount: this.calculateStepAmount(nextGlobalNumber, 3), reward: 3000, multiplier: 125 },
      step4: { completed: false, amount: this.calculateStepAmount(nextGlobalNumber, 4), reward: 30000, multiplier: 500 },
      step5: { completed: false, amount: this.calculateStepAmount(nextGlobalNumber, 5), reward: 160000, multiplier: 2500 },
      currentPoints: 0,
      totalRequired: this.calculateTotalRequired(nextGlobalNumber),
      isCompleted: false,
      rewardEarned: 0,
      createdAt: new Date()
    };

    await storage.saveGlobalRewardNumber(globalRewardNumber);

    // Process matching rules for existing Global Numbers
    await this.processMatchingRules(nextGlobalNumber);

    return globalRewardNumber;
  }

  // Add accumulated points to customer and check for Global Number creation
  async addAccumulatedPoints(customerId: string, points: number, source: string): Promise<void> {
    const profile = await storage.getCustomerProfile(customerId);
    if (!profile) {
      throw new Error('Customer profile not found');
    }

    // Add points to the appropriate category
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

    // Update accumulated points
    updates.accumulatedPoints = (profile.accumulatedPoints || 0) + points;
    updates.currentPointsBalance = (profile.currentPointsBalance || 0) + points;
    updates.totalPointsEarned = (profile.totalPointsEarned || 0) + points;

    await storage.updateCustomerProfile(customerId, updates);

    // Check if customer qualifies for Global Number (1500 points)
    const updatedProfile = await storage.getCustomerProfile(customerId);
    if (updatedProfile && updatedProfile.accumulatedPoints >= 1500) {
      await this.createGlobalRewardNumber(customerId);
    }

    // Add points to existing Global Reward Numbers
    const globalRewardNumbers = await storage.getGlobalRewardNumbersByCustomer(customerId);
    for (const globalNumber of globalRewardNumbers) {
      await this.addPointsToRewardNumber(globalNumber.id, points);
    }
  }

  // Add points to a Global Reward Number
  async addPointsToRewardNumber(globalNumberId: string, points: number): Promise<void> {
    const globalRewardNumber = await storage.getGlobalRewardNumberById(globalNumberId);
    if (!globalRewardNumber) {
      throw new Error('Global Reward Number not found');
    }

    const newCurrentPoints = globalRewardNumber.currentPoints + points;
    let rewardEarned = 0;

    // Check StepUp progression (5 steps: 500, 1500, 3000, 30000, 160000)
    if (!globalRewardNumber.step1.completed && newCurrentPoints >= globalRewardNumber.step1.amount) {
      globalRewardNumber.step1.completed = true;
      rewardEarned += globalRewardNumber.step1.reward;
      console.log(`🏆 Step 1 completed for reward #${globalRewardNumber.globalNumber}: +${globalRewardNumber.step1.reward} points`);
    }

    if (globalRewardNumber.step1.completed && !globalRewardNumber.step2.completed && 
        newCurrentPoints >= globalRewardNumber.step1.amount + globalRewardNumber.step2.amount) {
      globalRewardNumber.step2.completed = true;
      rewardEarned += globalRewardNumber.step2.reward;
      console.log(`🏆 Step 2 completed for reward #${globalRewardNumber.globalNumber}: +${globalRewardNumber.step2.reward} points`);
    }

    if (globalRewardNumber.step2.completed && !globalRewardNumber.step3.completed && 
        newCurrentPoints >= globalRewardNumber.step1.amount + globalRewardNumber.step2.amount + globalRewardNumber.step3.amount) {
      globalRewardNumber.step3.completed = true;
      rewardEarned += globalRewardNumber.step3.reward;
      console.log(`🏆 Step 3 completed for reward #${globalRewardNumber.globalNumber}: +${globalRewardNumber.step3.reward} points`);
    }

    if (globalRewardNumber.step3.completed && !globalRewardNumber.step4.completed && 
        newCurrentPoints >= globalRewardNumber.step1.amount + globalRewardNumber.step2.amount + globalRewardNumber.step3.amount + globalRewardNumber.step4.amount) {
      globalRewardNumber.step4.completed = true;
      rewardEarned += globalRewardNumber.step4.reward;
      console.log(`🏆 Step 4 completed for reward #${globalRewardNumber.globalNumber}: +${globalRewardNumber.step4.reward} points`);
      
      // Create Infinity Reward (4 new reward numbers) when step 4 is completed
      await this.createInfinityReward(globalRewardNumber.customerId);
      console.log(`♾️ Infinity reward activated: 4 new reward numbers created`);
    }

    if (globalRewardNumber.step4.completed && !globalRewardNumber.step5.completed && 
        newCurrentPoints >= globalRewardNumber.totalRequired) {
      globalRewardNumber.step5.completed = true;
      globalRewardNumber.isCompleted = true;
      globalRewardNumber.completedAt = new Date();
      rewardEarned += globalRewardNumber.step5.reward;
      console.log(`🏆 Step 5 completed for reward #${globalRewardNumber.globalNumber}: +${globalRewardNumber.step5.reward} points`);
    }

    // Update the reward number
    globalRewardNumber.currentPoints = newCurrentPoints;
    globalRewardNumber.rewardEarned = (globalRewardNumber.rewardEarned || 0) + rewardEarned;
    await storage.updateGlobalRewardNumber(globalRewardNumber.id, globalRewardNumber);

    // Add earned rewards to customer's balance
    if (rewardEarned > 0) {
      const profile = await storage.getCustomerProfile(globalRewardNumber.customerId);
      if (profile) {
        await storage.updateCustomerProfile(globalRewardNumber.customerId, {
          currentPointsBalance: (profile.currentPointsBalance || 0) + rewardEarned,
          totalPointsEarned: (profile.totalPointsEarned || 0) + rewardEarned
        });
      }
    }
  }

  // Create infinity reward (4 new reward numbers from 26200 remaining)
  async createInfinityReward(customerId: string): Promise<void> {
    const remainingAmount = 26200; // After 6000 voucher reserve
    const pointsPerNewReward = remainingAmount / 4; // 6550 points per new reward

    for (let i = 0; i < 4; i++) {
      // Get next serial number
      const serialData = await storage.assignSerialNumberToCustomer(customerId);
      await this.createGlobalRewardNumber(customerId);
      
      // Add initial points to the new reward number
      const rewardNumbers = await storage.getGlobalRewardNumbersByCustomer(customerId);
      const activeRewardNumber = rewardNumbers.find(rn => !rn.isCompleted);
      if (activeRewardNumber) {
        await this.addPointsToRewardNumber(activeRewardNumber.id, pointsPerNewReward);
      }
    }
  }

  // Calculate step amounts based on global serial number and company progress
  private calculateStepAmount(globalNumber: number, step: number): number {
    // This implements the Bengali logic where step amounts depend on global company progress
    // Formula: customer's reward number * multiplier
    const multiplier = this.STEPUP_MULTIPLIERS[step - 1];
    return globalNumber * multiplier;
  }

  // Calculate total required points for all steps
  private calculateTotalRequired(globalNumber: number): number {
    return this.STEPUP_MULTIPLIERS.reduce((total, multiplier) => total + (globalNumber * multiplier), 0);
  }

  // Process matching rules when a new Global Number is created
  private async processMatchingRules(newGlobalNumber: number): Promise<void> {
    const allGlobalNumbers = await storage.getAllGlobalRewardNumbers();
    
    for (const existingNumber of allGlobalNumbers) {
      if (existingNumber.globalNumber === newGlobalNumber) continue;
      
      // Check if existing number qualifies for reward
      for (let i = 0; i < this.STEPUP_MULTIPLIERS.length; i++) {
        const multiplier = this.STEPUP_MULTIPLIERS[i];
        if (existingNumber.globalNumber * multiplier === newGlobalNumber) {
          await this.awardStepUpReward(existingNumber.customerId, this.STEPUP_REWARDS[i]);
          console.log(`🎯 Matching rule: Global #${existingNumber.globalNumber} × ${multiplier} = #${newGlobalNumber}, awarded ${this.STEPUP_REWARDS[i]} points`);
        }
      }
    }
  }

  // Award StepUp reward to customer
  private async awardStepUpReward(customerId: string, rewardPoints: number): Promise<void> {
    const profile = await storage.getCustomerProfile(customerId);
    if (profile) {
      await storage.updateCustomerProfile(customerId, {
        currentPointsBalance: (profile.currentPointsBalance || 0) + rewardPoints,
        totalPointsEarned: (profile.totalPointsEarned || 0) + rewardPoints
      });
    }
  }

  // Get next global number (company-wide serial)
  private async getNextGlobalNumber(): Promise<number> {
    const allGlobalNumbers = await storage.getAllGlobalRewardNumbers();
    return allGlobalNumbers.length + 1;
  }

  // Get customer's personal serial number
  private async getCustomerSerialNumber(customerId: string): Promise<number> {
    const customerGlobalNumbers = await storage.getGlobalRewardNumbersByCustomer(customerId);
    return customerGlobalNumbers.length + 1;
  }

  // Calculate infinity rewards
  async calculateInfinityRewards(customerId: string): Promise<number> {
    const rewardNumbers = await storage.getGlobalRewardNumbersByCustomer(customerId);
    return rewardNumbers.filter(rn => rn.step4.completed).length * 4 * 6550; // 4 new numbers × 6550 points each
  }

  // Process affiliate reward (5% lifetime commission)
  async processAffiliateReward(referrerId: string, referredCustomerId: string, pointsEarned: number): Promise<void> {
    const commission = pointsEarned * 0.05; // 5% commission
    const profile = await storage.getCustomerProfile(referrerId);
    if (profile) {
      await storage.updateCustomerProfile(referrerId, {
        currentPointsBalance: (profile.currentPointsBalance || 0) + commission,
        totalPointsEarned: (profile.totalPointsEarned || 0) + commission
      });
    }
  }

  // Calculate affiliate rewards
  async calculateAffiliateRewards(customerId: string): Promise<number> {
    // This would calculate total affiliate rewards earned
    return 0; // Placeholder
  }

  // Process ripple reward (percentage of referred customer's StepUp rewards)
  async processRippleReward(referrerId: string, referredCustomerId: string, stepUpReward: number): Promise<void> {
    const ripplePercentage = 0.1; // 10% of StepUp rewards
    const rippleReward = stepUpReward * ripplePercentage;
    const profile = await storage.getCustomerProfile(referrerId);
    if (profile) {
      await storage.updateCustomerProfile(referrerId, {
        currentPointsBalance: (profile.currentPointsBalance || 0) + rippleReward,
        totalPointsEarned: (profile.totalPointsEarned || 0) + rippleReward
      });
    }
  }

  // Calculate ripple rewards
  async calculateRippleRewards(customerId: string): Promise<number> {
    // This would calculate total ripple rewards earned
    return 0; // Placeholder
  }

  // Create shopping voucher
  async createShoppingVoucher(customerId: string, merchantId: string, pointsAmount: number): Promise<void> {
    const voucher = {
      id: `voucher_${Date.now()}_${Math.random().toString(36).substring(2)}`,
      customerId,
      merchantId,
      pointsAmount,
      isUsed: false,
      createdAt: new Date()
    };

    await storage.saveShoppingVoucher(voucher);
  }

  // Get shopping vouchers for customer
  async getShoppingVouchers(customerId: string): Promise<any[]> {
    return await storage.getShoppingVouchersByCustomer(customerId);
  }
}