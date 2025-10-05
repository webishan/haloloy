import { storage } from '../storage';

export interface StepUpReward {
  id: string;
  recipientCustomerId: string;
  recipientGlobalNumber: number;
  triggerGlobalNumber: number;
  multiplier: number;
  rewardPoints: number;
  isAwarded: boolean;
  awardedAt: Date;
  createdAt: Date;
}

export class StepUpRewardSystem {
  // StepUp multipliers and rewards according to Bengali logic
  private readonly STEPUP_MULTIPLIERS = [5, 25, 125, 500, 2500];
  private readonly STEPUP_REWARDS = [500, 1500, 3000, 30000, 160000];
  
  /**
   * Check and award StepUp rewards when a new global number is created
   * Bengali Logic: Customer with Global Number G gets reward when total global numbers reach G × multiplier
   * Formula: Customer Global Number × Milestone Factor = Trigger Global Number
   */
  async checkAndAwardStepUpRewards(newGlobalNumber: number): Promise<StepUpReward[]> {
    console.log(`🔍 Checking StepUp rewards for new Global Number: ${newGlobalNumber}`);
    
    const awardedRewards: StepUpReward[] = [];
    
    // Get all customers who have global numbers
    const allCustomers = await this.getAllCustomersWithGlobalNumbers();
    console.log(`📊 Found ${allCustomers.length} customers with global numbers:`, allCustomers);
    
    // For each existing customer with global numbers
    for (const customer of allCustomers) {
      const customerGlobalNumber = customer.globalSerialNumber;
      
      // Check each StepUp multiplier level
      for (let i = 0; i < this.STEPUP_MULTIPLIERS.length; i++) {
        const multiplier = this.STEPUP_MULTIPLIERS[i];
        const rewardPoints = this.STEPUP_REWARDS[i];
        const triggerGlobalNumber = customerGlobalNumber * multiplier;
        
        // If the new global number has reached this customer's formula trigger
        if (newGlobalNumber === triggerGlobalNumber) {
          console.log(`🎯 FORMULA MATCH! Customer #${customerGlobalNumber} eligible for ${rewardPoints} points (${customerGlobalNumber}×${multiplier}=${triggerGlobalNumber})`);
          
          // Check if this specific StepUp reward has already been awarded
          const alreadyAwarded = await this.hasStepUpRewardBeenAwarded(
            customerGlobalNumber, 
            triggerGlobalNumber, 
            multiplier
          );
          
          if (!alreadyAwarded) {
            // Award the StepUp reward
            const reward = await this.awardStepUpReward(
              customer.id,
              customerGlobalNumber,
              triggerGlobalNumber,
              multiplier,
              rewardPoints
            );
            
            awardedRewards.push(reward);
            
            console.log(`🎁 StepUp Reward: Customer #${customerGlobalNumber} receives ${rewardPoints} points (formula: ${customerGlobalNumber}×${multiplier}=${triggerGlobalNumber})`);
          } else {
            console.log(`⚠️ StepUp reward already awarded: Customer #${customerGlobalNumber} for multiplier ${multiplier}`);
          }
        }
      }
    }
    
    return awardedRewards;
  }
  
  /**
   * Get all customers who have global numbers
   */
  async getAllCustomersWithGlobalNumbers(): Promise<Array<{id: string, globalSerialNumber: number}>> {
    try {
      // Get all customer profiles with global numbers from the database
      const allProfiles = await storage.getAllCustomerProfiles();
      return allProfiles
        .filter(profile => profile.globalSerialNumber && profile.globalSerialNumber > 0)
        .map(profile => ({
          id: profile.id,
          globalSerialNumber: profile.globalSerialNumber
        }));
    } catch (error) {
      console.error('Error getting customers with global numbers:', error);
      return [];
    }
  }
  
  /**
   * Check if a StepUp reward has already been awarded
   */
  private async hasStepUpRewardBeenAwarded(
    recipientGlobalNumber: number, 
    triggerGlobalNumber: number, 
    multiplier: number
  ): Promise<boolean> {
    try {
      // Check if reward already exists in database
      const existingReward = await storage.getStepUpReward(
        recipientGlobalNumber, 
        triggerGlobalNumber, 
        multiplier
      );
      
      return existingReward !== null;
    } catch (error) {
      console.error('Error checking if StepUp reward has been awarded:', error);
      return false; // If there's an error, allow the reward to be processed
    }
  }
  
  /**
   * Award StepUp reward to customer
   */
  private async awardStepUpReward(
    customerId: string,
    recipientGlobalNumber: number,
    triggerGlobalNumber: number,
    multiplier: number,
    rewardPoints: number
  ): Promise<StepUpReward> {
    console.log(`🔍 Awarding StepUp reward: customerId=${customerId}, globalNumber=${recipientGlobalNumber}, multiplier=${multiplier}, points=${rewardPoints}`);
    
    // Get customer profile
    const profile = await storage.getCustomerProfileById(customerId);
    if (!profile) {
      console.error(`❌ Customer profile not found for StepUp reward: ${customerId}`);
      throw new Error('Customer profile not found');
    }
    
    console.log(`✅ Found customer profile for StepUp reward: ${profile.fullName}`);

    // StepUp rewards should NOT be added to totalPointsEarned or currentPointsBalance
    // They only go to Income Wallet - no profile updates needed

    // StepUp rewards should NOT be added to reward points (loyalty points)
    // They only go to Income Wallet

    // Add to Income Wallet
    await this.addToIncomeWallet(profile.id, rewardPoints, recipientGlobalNumber, triggerGlobalNumber, multiplier);

    // Create transaction record
    await storage.createCustomerPointTransaction({
      customerId: profile.id,
      merchantId: 'system',
      points: rewardPoints,
      transactionType: 'reward', // StepUp rewards are rewards, not earned points
      description: `StepUp Reward: Global #${recipientGlobalNumber} (${recipientGlobalNumber}×${multiplier}=${triggerGlobalNumber} formula)`,
      balanceBefore: profile.currentPointsBalance,
      balanceAfter: profile.currentPointsBalance // Loyalty points remain unchanged
    });

    // Create StepUp reward record
    const reward = await storage.createStepUpReward({
      recipientCustomerId: customerId,
      recipientGlobalNumber: recipientGlobalNumber,
      triggerGlobalNumber: triggerGlobalNumber,
      multiplier: multiplier,
      rewardPoints: rewardPoints,
      isAwarded: true,
      awardedAt: new Date()
    });

    return {
      id: reward.id,
      recipientCustomerId: customerId,
      recipientGlobalNumber: recipientGlobalNumber,
      triggerGlobalNumber: triggerGlobalNumber,
      multiplier: multiplier,
      rewardPoints: rewardPoints,
      isAwarded: true,
      awardedAt: new Date(),
      createdAt: new Date()
    };
  }
  
  /**
   * Add StepUp reward to customer's Income Wallet
   */
  private async addToIncomeWallet(
    customerId: string, 
    rewardPoints: number, 
    recipientGlobalNumber: number, 
    triggerGlobalNumber: number, 
    multiplier: number
  ): Promise<void> {
    try {
      // Get or create customer wallet
      let wallet = await storage.getCustomerWallet(customerId);
      if (!wallet) {
        wallet = await storage.createCustomerWallet({
          customerId: customerId,
          rewardPointBalance: 0,
          totalRewardPointsEarned: 0,
          totalRewardPointsSpent: 0,
          totalRewardPointsTransferred: 0,
          incomeBalance: rewardPoints.toFixed(2),
          totalIncomeEarned: rewardPoints.toFixed(2),
          totalIncomeSpent: "0.00",
          totalIncomeTransferred: "0.00",
          commerceBalance: "0.00",
          totalCommerceAdded: "0.00",
          totalCommerceSpent: "0.00",
          totalCommerceWithdrawn: "0.00"
        });
      } else {
        // Update wallet with StepUp reward points in the INCOME BALANCE
        const newIncomeBalance = parseFloat(wallet.incomeBalance) + rewardPoints;
        const newTotalIncomeEarned = parseFloat(wallet.totalIncomeEarned) + rewardPoints;
        
        await storage.updateCustomerWallet(customerId, {
          incomeBalance: newIncomeBalance.toFixed(2),
          totalIncomeEarned: newTotalIncomeEarned.toFixed(2),
          lastTransactionAt: new Date()
        });
      }

      // Create wallet transaction record for income wallet history
      await storage.createCustomerWalletTransaction({
        customerId: customerId,
        walletType: 'income',
        transactionType: 'credit',
        amount: rewardPoints.toString(),
        balanceAfter: (wallet.rewardPointBalance + rewardPoints).toString(),
        description: `StepUp Reward: Global #${recipientGlobalNumber} (${recipientGlobalNumber}×${multiplier}=${triggerGlobalNumber} formula)`,
        metadata: {
          globalNumber: recipientGlobalNumber,
          multiplier: multiplier,
          formula: `${recipientGlobalNumber}×${multiplier}=${triggerGlobalNumber}`,
          rewardType: 'stepup'
        }
      });

      console.log(`💰 StepUp reward added to Income Wallet: Customer ${customerId} received ${rewardPoints} points (Global #${recipientGlobalNumber} × ${multiplier})`);
      
    } catch (error) {
      console.error(`❌ Error adding StepUp reward to Income Wallet:`, error);
    }
  }
  
  /**
   * Get customer's StepUp rewards
   */
  async getCustomerStepUpRewards(customerId: string): Promise<StepUpReward[]> {
    try {
      // Get all StepUp rewards for this customer from database
      const rewards = await storage.getCustomerStepUpRewards(customerId);
      
      // Convert to our interface format
      return rewards.map(reward => ({
        id: reward.id,
        recipientCustomerId: reward.recipientCustomerId,
        recipientGlobalNumber: reward.recipientGlobalNumber,
        triggerGlobalNumber: reward.triggerGlobalNumber,
        multiplier: reward.multiplier,
        rewardPoints: reward.rewardPoints,
        isAwarded: reward.isAwarded,
        awardedAt: reward.awardedAt,
        createdAt: reward.createdAt
      }));
    } catch (error) {
      console.error('Error getting customer StepUp rewards:', error);
      return [];
    }
  }
  
  /**
   * Get total StepUp rewards earned by customer
   */
  async getTotalStepUpRewardsEarned(customerId: string): Promise<number> {
    try {
      const rewards = await this.getCustomerStepUpRewards(customerId);
      return rewards.reduce((total, reward) => total + reward.rewardPoints, 0);
    } catch (error) {
      console.error('Error getting total StepUp rewards earned:', error);
      return 0;
    }
  }
  
  /**
   * Process all existing global numbers to trigger any missed StepUp rewards
   * This is called when the system is initialized to catch up on any missed rewards
   */
  async processExistingGlobalNumbers(): Promise<StepUpReward[]> {
    console.log('🔄 Processing existing global numbers for missed StepUp rewards...');
    
    try {
      // Get all customers with global numbers
      const allCustomers = await this.getAllCustomersWithGlobalNumbers();
      console.log(`📊 Found ${allCustomers.length} customers with global numbers`);
      
      // Get the highest global number in the system
      const maxGlobalNumber = Math.max(...allCustomers.map(c => c.globalSerialNumber));
      console.log(`📈 Highest global number in system: ${maxGlobalNumber}`);
      
      const allRewards: StepUpReward[] = [];
      
      // Process each global number from 1 to the highest
      for (let globalNumber = 1; globalNumber <= maxGlobalNumber; globalNumber++) {
        console.log(`🔍 Processing Global Number ${globalNumber}...`);
        const rewards = await this.checkAndAwardStepUpRewards(globalNumber);
        allRewards.push(...rewards);
        
        if (rewards.length > 0) {
          console.log(`✅ Found ${rewards.length} StepUp rewards for Global Number ${globalNumber}`);
        }
      }
      
      console.log(`🎉 Processed ${allRewards.length} total StepUp rewards from existing global numbers`);
      return allRewards;
    } catch (error) {
      console.error('Error processing existing global numbers:', error);
      return [];
    }
  }
}

export const stepUpRewardSystem = new StepUpRewardSystem();
