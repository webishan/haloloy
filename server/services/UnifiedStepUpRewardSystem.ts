import { storage } from '../storage';

/**
 * Unified StepUp Reward System
 * 
 * Logic: When a customer reaches 1500 points, they get a Global Number (1, 2, 3, ...)
 * When Global Number N is reached, customers with existing Global Numbers receive rewards
 * Formula: Customer Global Number × Milestone Factor = Trigger Global Number
 * 
 * Milestone Factors: [5, 25, 125, 500, 2500]
 * Reward Points: [500, 1500, 3000, 30000, 160000]
 * 
 * Example: Customer with Global #1 gets 500 points when Global #5 is reached (1×5=5)
 */

export interface StepUpReward {
  id: string;
  recipientCustomerId: string;
  recipientGlobalNumber: number;
  triggerGlobalNumber: number;
  multiplier: number;
  rewardPoints: number;
  description: string;
  isAwarded: boolean;
  awardedAt: Date;
  createdAt: Date;
}

export class UnifiedStepUpRewardSystem {
  // StepUp configuration according to Bengali logic
  private readonly MILESTONE_FACTORS = [5, 25, 125, 500, 2500];
  private readonly REWARD_POINTS = [500, 1500, 3000, 30000, 160000];
  
  /**
   * Main method: Process StepUp rewards when a new Global Number is assigned
   * This should be called every time a new Global Number is created
   */
  async processNewGlobalNumber(newGlobalNumber: number): Promise<StepUpReward[]> {
    console.log(`🎯 Processing StepUp rewards for new Global Number: ${newGlobalNumber}`);
    
    const awardedRewards: StepUpReward[] = [];
    
    try {
      // Get all customers who have global numbers (excluding the new one)
      const existingCustomers = await this.getCustomersWithGlobalNumbers();
      console.log(`📊 Found ${existingCustomers.length} existing customers with Global Numbers`);
      
      // For each existing customer, check if they should receive a reward
      for (const customer of existingCustomers) {
        // Check each Global Number this customer has
        for (const customerGlobalNumber of customer.globalNumbers) {
          // Check each milestone factor
          for (let i = 0; i < this.MILESTONE_FACTORS.length; i++) {
            const factor = this.MILESTONE_FACTORS[i];
            const rewardPoints = this.REWARD_POINTS[i];
            const triggerNumber = customerGlobalNumber * factor;
            
            // If the new global number matches the trigger formula
            if (newGlobalNumber === triggerNumber) {
              console.log(`🎯 FORMULA MATCH! Customer ${customer.fullName} Global #${customerGlobalNumber} × ${factor} = ${triggerNumber} (New Global #${newGlobalNumber})`);
              
              // Check if this reward has already been given
              const alreadyAwarded = await this.isRewardAlreadyAwarded(
                customer.id,
                customerGlobalNumber,
                triggerNumber,
                factor
              );
              
              if (!alreadyAwarded) {
                // Award the StepUp reward
                const reward = await this.awardStepUpReward(
                  customer.id,
                  customerGlobalNumber,
                  triggerNumber,
                  factor,
                  rewardPoints
                );
                
                awardedRewards.push(reward);
                console.log(`🎁 StepUp Reward Awarded: ${rewardPoints} points to ${customer.fullName} (Global #${customerGlobalNumber})`);
              } else {
                console.log(`⚠️ Reward already awarded: ${customer.fullName} Global #${customerGlobalNumber} for factor ${factor}`);
              }
            }
          }
        }
      }
      
      console.log(`✅ Processed ${awardedRewards.length} StepUp rewards for Global Number ${newGlobalNumber}`);
      return awardedRewards;
      
    } catch (error) {
      console.error(`❌ Error processing StepUp rewards for Global Number ${newGlobalNumber}:`, error);
      return [];
    }
  }
  
  /**
   * Get all customers who have global numbers (including multiple Global Numbers per customer)
   */
  private async getCustomersWithGlobalNumbers(): Promise<Array<{id: string, globalNumbers: number[], userId: string, fullName: string}>> {
    try {
      const allProfiles = await storage.getAllCustomerProfiles();
      const customersWithGlobalNumbers = [];
      
      for (const profile of allProfiles) {
        // Get all Global Numbers for this customer
        const customerGlobalNumbers = await this.getCustomerGlobalNumbers(profile.id);
        
        if (customerGlobalNumbers.length > 0) {
          customersWithGlobalNumbers.push({
            id: profile.id,
            globalNumbers: customerGlobalNumbers,
            userId: profile.userId,
            fullName: profile.fullName
          });
        }
      }
      
      return customersWithGlobalNumbers;
    } catch (error) {
      console.error('Error getting customers with global numbers:', error);
      return [];
    }
  }

  /**
   * Get all Global Numbers for a specific customer
   */
  private async getCustomerGlobalNumbers(customerId: string): Promise<number[]> {
    try {
      const serialNumbers = await storage.getAllCustomerSerialNumbers();
      const customerSerials = serialNumbers.filter(s => s.customerId === customerId && s.isActive);
      return customerSerials.map(s => s.globalSerialNumber).sort((a, b) => a - b);
    } catch (error) {
      console.error('Error getting customer global numbers:', error);
      return [];
    }
  }
  
  /**
   * Check if a specific StepUp reward has already been awarded
   */
  private async isRewardAlreadyAwarded(
    customerId: string,
    recipientGlobalNumber: number,
    triggerGlobalNumber: number,
    multiplier: number
  ): Promise<boolean> {
    try {
      const existingRewards = await storage.getCustomerStepUpRewards(customerId);
      return existingRewards.some(reward => 
        reward.recipientGlobalNumber === recipientGlobalNumber &&
        reward.triggerGlobalNumber === triggerGlobalNumber &&
        reward.multiplier === multiplier &&
        reward.isAwarded
      );
    } catch (error) {
      console.error('Error checking if reward already awarded:', error);
      return false; // If error, allow the reward to be processed
    }
  }
  
  /**
   * Award StepUp reward to a customer
   */
  private async awardStepUpReward(
    customerId: string,
    recipientGlobalNumber: number,
    triggerGlobalNumber: number,
    multiplier: number,
    rewardPoints: number
  ): Promise<StepUpReward> {
    console.log(`💰 Awarding StepUp reward: Customer ${customerId}, Global #${recipientGlobalNumber}, ${rewardPoints} points`);
    
    try {
      // Get customer profile
      const profile = await storage.getCustomerProfileById(customerId);
      if (!profile) {
        throw new Error(`Customer profile not found: ${customerId}`);
      }
      
      // Create description
      const description = `StepUp Reward: Global #${recipientGlobalNumber} (${recipientGlobalNumber}×${multiplier}=${triggerGlobalNumber} formula)`;
      
      // 1. StepUp rewards should NOT be added to totalPointsEarned or currentPointsBalance
      // They only go to Income Wallet - no profile updates needed
      
      // NEW: StepUp rewards are now only recorded as transactions
      // The frontend will calculate the balance from transaction history
      await this.recordStepUpReward(customerId, rewardPoints, description);
      
      // 2. Check for Infinity Rewards (30,000 points threshold)
      if (rewardPoints === 30000) {
        console.log(`🎯 Customer ${profile.fullName} reached 30,000 points - checking Infinity Rewards`);
        const { infinityRewardSystem } = await import('./InfinityRewardSystem');
        await infinityRewardSystem.checkAndTriggerInfinityRewards(customerId, rewardPoints);
      }
      
      // 3. Check for Shopping Vouchers (30,000 points threshold)
      if (rewardPoints === 30000) {
        console.log(`🎯 Customer ${profile.fullName} reached 30,000 points - checking Shopping Vouchers`);
        const { shoppingVoucherSystem } = await import('./ShoppingVoucherSystem');
        await shoppingVoucherSystem.checkAndCreateShoppingVouchers(customerId, rewardPoints);
      }
      
      // 4. Process Ripple Rewards for referrers
      console.log(`🌊 Processing Ripple Rewards for ${rewardPoints} StepUp points`);
      const { rippleRewardSystem } = await import('./RippleRewardSystem');
      await rippleRewardSystem.processRippleReward(customerId, rewardPoints);
      
      // 5. Create StepUp reward record
      const reward = await storage.createStepUpReward({
        recipientCustomerId: customerId,
        recipientGlobalNumber: recipientGlobalNumber,
        triggerGlobalNumber: triggerGlobalNumber,
        multiplier: multiplier,
        rewardPoints: rewardPoints,
        isAwarded: true,
        awardedAt: new Date()
      });
      
      console.log(`✅ StepUp reward awarded successfully: ${profile.fullName} received ${rewardPoints} points`);
      
      return {
        id: reward.id,
        recipientCustomerId: customerId,
        recipientGlobalNumber: recipientGlobalNumber,
        triggerGlobalNumber: triggerGlobalNumber,
        multiplier: multiplier,
        rewardPoints: rewardPoints,
        description: description,
        isAwarded: true,
        awardedAt: new Date(),
        createdAt: new Date()
      };
      
    } catch (error) {
      console.error(`❌ Error awarding StepUp reward:`, error);
      throw error;
    }
  }
  
  /**
   * Record StepUp reward and update Income Wallet balance
   */
  private async recordStepUpReward(customerId: string, rewardPoints: number, description: string): Promise<void> {
    try {
      console.log(`📝 Recording StepUp reward and updating Income Wallet: ${rewardPoints} points for customer ${customerId}`);
      
      // Get or create customer wallet
      let wallet = await storage.getCustomerWallet(customerId);
      if (!wallet) {
        console.log(`📦 Creating new wallet for customer ${customerId}`);
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
        console.log(`✅ Created wallet with Income Balance: ${wallet.incomeBalance}`);
      } else {
        console.log(`📊 Current wallet - Income Balance: ${wallet.incomeBalance}, Total Income Earned: ${wallet.totalIncomeEarned}`);
        
        // Update Income Wallet with StepUp reward
        const newIncomeBalance = parseFloat(wallet.incomeBalance) + rewardPoints;
        const newTotalIncomeEarned = parseFloat(wallet.totalIncomeEarned) + rewardPoints;
        
        console.log(`📈 Updating wallet - New Income Balance: ${newIncomeBalance}, New Total Income Earned: ${newTotalIncomeEarned}`);
        
        wallet = await storage.updateCustomerWallet(customerId, {
          incomeBalance: newIncomeBalance.toFixed(2),
          totalIncomeEarned: newTotalIncomeEarned.toFixed(2),
          lastTransactionAt: new Date()
        });
        
        console.log(`✅ Updated wallet - Income Balance: ${wallet.incomeBalance}, Total Income Earned: ${wallet.totalIncomeEarned}`);
      }
      
      // Create wallet transaction for Income Wallet history
      try {
        await storage.createCustomerWalletTransaction({
          customerId: customerId,
          walletType: 'income',
          transactionType: 'credit',
          amount: rewardPoints.toString(),
          balanceAfter: wallet.incomeBalance,
          description: description,
          metadata: {
            rewardType: 'stepup',
            source: 'stepup_reward_system'
          }
        });
        console.log(`📝 Created wallet transaction record`);
      } catch (transactionError) {
        console.error(`⚠️ Error creating wallet transaction:`, transactionError);
        // Don't fail the whole operation if transaction creation fails
      }
      
      // Also create point transaction for compatibility
      await storage.createCustomerPointTransaction({
        customerId: customerId,
        merchantId: 'system',
        points: rewardPoints,
        transactionType: 'reward',
        description: description,
        balanceBefore: 0,
        balanceAfter: 0
      });
      
      console.log(`🎉 Successfully recorded StepUp reward and updated Income Wallet for customer ${customerId}`);
      
    } catch (error) {
      console.error(`❌ Error recording StepUp reward:`, error);
      throw error;
    }
  }
  
  /**
   * Get customer's StepUp rewards
   */
  async getCustomerStepUpRewards(customerId: string): Promise<StepUpReward[]> {
    try {
      const rewards = await storage.getCustomerStepUpRewards(customerId);
      return rewards.map(reward => ({
        id: reward.id,
        recipientCustomerId: reward.recipientCustomerId,
        recipientGlobalNumber: reward.recipientGlobalNumber,
        triggerGlobalNumber: reward.triggerGlobalNumber,
        multiplier: reward.multiplier,
        rewardPoints: reward.rewardPoints,
        description: `StepUp Reward: Global #${reward.recipientGlobalNumber} (${reward.recipientGlobalNumber}×${reward.multiplier}=${reward.triggerGlobalNumber} formula)`,
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
   * Process all existing global numbers to catch up on missed rewards
   * This should be called during system initialization
   */
  async processAllExistingGlobalNumbers(): Promise<StepUpReward[]> {
    console.log('🔄 Processing all existing Global Numbers for missed StepUp rewards...');
    
    try {
      const allCustomers = await this.getCustomersWithGlobalNumbers();
      if (allCustomers.length === 0) {
        console.log('📊 No customers with Global Numbers found');
        return [];
      }
      
      // Get all unique Global Numbers from all customers
      const allGlobalNumbers = new Set<number>();
      for (const customer of allCustomers) {
        for (const globalNumber of customer.globalNumbers) {
          allGlobalNumbers.add(globalNumber);
        }
      }
      
      const maxGlobalNumber = Math.max(...Array.from(allGlobalNumbers));
      console.log(`📈 Processing Global Numbers 1 to ${maxGlobalNumber}`);
      
      const allRewards: StepUpReward[] = [];
      
      // Process each global number sequentially
      for (let globalNumber = 1; globalNumber <= maxGlobalNumber; globalNumber++) {
        const rewards = await this.processNewGlobalNumber(globalNumber);
        allRewards.push(...rewards);
      }
      
      console.log(`🎉 Processed ${allRewards.length} total StepUp rewards from existing Global Numbers`);
      return allRewards;
      
    } catch (error) {
      console.error('Error processing existing Global Numbers:', error);
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
}

// Export singleton instance
export const unifiedStepUpRewardSystem = new UnifiedStepUpRewardSystem();