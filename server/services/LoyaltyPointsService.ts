import type { 
  User, UserWallet, PointTransaction, StepUpRewardNumber, Referral, 
  CommissionTransaction, MerchantTransaction, InsertUserWallet, InsertPointTransaction,
  InsertStepUpRewardNumber, InsertCommissionTransaction, InsertMerchantTransaction
} from "@shared/schema";

export interface ILoyaltyPointsService {
  // Core point earning and transaction system
  addPoints(userId: string, points: number, transactionType: string, metadata?: any): Promise<PointTransaction>;
  transferPoints(fromUserId: string, toUserId: string, points: number, description?: string): Promise<PointTransaction>;
  
  // Three-wallet system
  getWalletBalance(userId: string, walletType: 'reward_points' | 'income' | 'commerce'): Promise<number>;
  transferBetweenWallets(userId: string, fromWallet: string, toWallet: string, amount: number): Promise<PointTransaction>;
  convertPointsToCash(userId: string, points: number): Promise<{ finalAmount: number; vatAmount: number; serviceCharge: number }>;
  
  // Reward number generation and management
  createRewardNumber(userId: string, type: 'global' | 'local'): Promise<StepUpRewardNumber>;
  checkTierProgression(userId: string): Promise<void>;
  awardTier(rewardNumberId: string, tierLevel: number): Promise<void>;
  
  // Bengali document reward system
  processStepUpReward(userId: string, tierLevel: number): Promise<void>;
  processInfinityReward(userId: string): Promise<void>;
  processMerchantShoppingWallet(userId: string, merchantId: string, amount: number): Promise<void>;
  
  // Affiliate referral commission system
  processReferralCommission(refereeId: string, basePoints: number): Promise<void>;
  processRippleRewards(userId: string, tierLevel: number): Promise<void>;
  
  // Merchant commission and cashback
  processMerchantCashback(merchantId: string, pointsDistributed: number): Promise<MerchantTransaction>;
  processMerchantReferralCommission(merchantId: string, referredMerchantId: string): Promise<void>;
  
  // Manual point generation (Global Admin only)
  generatePointsManually(adminId: string, recipientId: string, points: number, description: string): Promise<PointTransaction>;
  
  // QR code transfers
  generateQRCode(senderId: string, points: number, expirationMinutes?: number): Promise<string>;
  processQRTransfer(qrCode: string, receiverId: string): Promise<PointTransaction>;
  
  // Analytics and reporting
  getUserPointsHistory(userId: string): Promise<PointTransaction[]>;
  getWalletTransactions(userId: string, walletType?: string): Promise<PointTransaction[]>;
  getLeaderboard(type: 'global' | 'local', country?: string): Promise<any[]>;
}

export class LoyaltyPointsService implements ILoyaltyPointsService {
  private storage: any;
  
  constructor(storage: any) {
    this.storage = storage;
  }
  
  // Core point earning and transaction system
  async addPoints(userId: string, points: number, transactionType: string, metadata: any = {}): Promise<PointTransaction> {
    const user = await this.storage.getUser(userId);
    if (!user) {
      throw new Error('User not found');
    }

    // Get current wallet balance
    const currentBalance = await this.getWalletBalance(userId, 'reward_points');
    
    // Create point transaction record
    const transaction: InsertPointTransaction = {
      userId,
      points,
      transactionType: transactionType as any,
      description: metadata.description || `${points} points earned via ${transactionType}`,
      metadata: metadata,
      balanceBefore: currentBalance,
      balanceAfter: currentBalance + points,
      status: 'completed',
      auditTrail: [{
        action: 'points_added',
        timestamp: new Date().toISOString(),
        userId,
        points,
        transactionType
      }]
    };
    
    const createdTransaction = await this.storage.createPointTransaction(transaction);
    
    // Update wallet balance
    await this.updateWalletBalance(userId, 'reward_points', points);
    
    // Check for tier progression
    await this.checkTierProgression(userId);
    
    // Process referral commissions if applicable
    if (transactionType === 'purchase' || transactionType === 'cashback') {
      await this.processReferralCommission(userId, points);
    }
    
    return createdTransaction;
  }
  
  async transferPoints(fromUserId: string, toUserId: string, points: number, description?: string): Promise<PointTransaction> {
    const fromBalance = await this.getWalletBalance(fromUserId, 'reward_points');
    
    if (fromBalance < points) {
      throw new Error('Insufficient balance');
    }
    
    // Create transfer out transaction
    const transferOut: InsertPointTransaction = {
      userId: fromUserId,
      points: -points,
      transactionType: 'transfer_out',
      toUserId,
      description: description || `Transferred ${points} points to user`,
      balanceBefore: fromBalance,
      balanceAfter: fromBalance - points,
      status: 'completed'
    };
    
    const outTransaction = await this.storage.createPointTransaction(transferOut);
    
    // Update sender's wallet
    await this.updateWalletBalance(fromUserId, 'reward_points', -points);
    
    // Create transfer in transaction for recipient
    const toBalance = await this.getWalletBalance(toUserId, 'reward_points');
    const transferIn: InsertPointTransaction = {
      userId: toUserId,
      points,
      transactionType: 'transfer_in',
      fromUserId,
      description: description || `Received ${points} points from user`,
      balanceBefore: toBalance,
      balanceAfter: toBalance + points,
      status: 'completed'
    };
    
    await this.storage.createPointTransaction(transferIn);
    await this.updateWalletBalance(toUserId, 'reward_points', points);
    
    // Check tier progression for recipient
    await this.checkTierProgression(toUserId);
    
    return outTransaction;
  }
  
  // Three-wallet system implementation
  async getWalletBalance(userId: string, walletType: 'reward_points' | 'income' | 'commerce'): Promise<number> {
    const wallet = await this.storage.getUserWallet(userId, walletType);
    return wallet ? parseFloat(wallet.balance) : 0;
  }
  
  async transferBetweenWallets(userId: string, fromWallet: string, toWallet: string, amount: number): Promise<PointTransaction> {
    const fromBalance = await this.getWalletBalance(userId, fromWallet as any);
    
    if (fromBalance < amount) {
      throw new Error('Insufficient wallet balance');
    }
    
    // Create wallet transfer transaction
    const walletTransfer: InsertPointTransaction = {
      userId,
      points: amount,
      transactionType: 'wallet_conversion',
      fromWalletType: fromWallet as any,
      toWalletType: toWallet as any,
      description: `Converted ${amount} from ${fromWallet} to ${toWallet}`,
      balanceBefore: fromBalance,
      balanceAfter: fromBalance - amount,
      status: 'completed'
    };
    
    const transaction = await this.storage.createPointTransaction(walletTransfer);
    
    // Update wallet balances
    await this.updateWalletBalance(userId, fromWallet as any, -amount);
    await this.updateWalletBalance(userId, toWallet as any, amount);
    
    return transaction;
  }
  
  async convertPointsToCash(userId: string, points: number): Promise<{ finalAmount: number; vatAmount: number; serviceCharge: number }> {
    const vatRate = 0.125; // 12.5% VAT as per Bengali document
    const serviceChargeRate = 0.05; // 5% service charge
    
    const baseAmount = points; // 1 point = 1 unit of currency
    const vatAmount = baseAmount * vatRate;
    const serviceCharge = baseAmount * serviceChargeRate;
    const finalAmount = baseAmount - vatAmount - serviceCharge;
    
    // Create withdrawal transaction
    const withdrawal: InsertPointTransaction = {
      userId,
      points: -points,
      transactionType: 'withdrawal',
      description: `Cash withdrawal of ${points} points`,
      balanceBefore: await this.getWalletBalance(userId, 'income'),
      balanceAfter: await this.getWalletBalance(userId, 'income') - points,
      vatAmount: vatAmount.toString(),
      serviceCharge: serviceCharge.toString(),
      finalAmount: finalAmount.toString(),
      status: 'completed'
    };
    
    await this.storage.createPointTransaction(withdrawal);
    await this.updateWalletBalance(userId, 'income', -points);
    
    return { finalAmount, vatAmount, serviceCharge };
  }
  
  // Reward number generation and StepUp tier system
  async createRewardNumber(userId: string, type: 'global' | 'local'): Promise<StepUpRewardNumber> {
    const user = await this.storage.getUser(userId);
    if (!user) {
      throw new Error('User not found');
    }
    
    // Generate unique reward number and serial
    const rewardNumber = await this.generateUniqueRewardNumber();
    const serialNumber = await this.generateUniqueSerial(type, user.country);
    
    const rewardNumberData: InsertStepUpRewardNumber = {
      userId,
      rewardNumber,
      serialNumber,
      type,
      country: user.country,
      tier1Status: 'active',
      currentPoints: 0
    };
    
    return await this.storage.createStepUpRewardNumber(rewardNumberData);
  }
  
  async checkTierProgression(userId: string): Promise<void> {
    const userPoints = await this.getUserTotalPoints(userId);
    
    // Check if user qualifies for global serial number (1500 points)
    if (userPoints >= 1500) {
      await this.checkAndCreateGlobalSerial(userId);
    }
    
    const rewardNumbers = await this.storage.getActiveRewardNumbers(userId);
    
    for (const rewardNumber of rewardNumbers) {
      let pointsToApply = userPoints;
      
      // Check each tier progression - Bengali document logic
      if (rewardNumber.tier1Status === 'active' && pointsToApply >= rewardNumber.tier1Amount) {
        await this.awardTier(rewardNumber.id, 1);
        pointsToApply -= rewardNumber.tier1Amount;
        // Award StepUp reward (800 points)
        await this.processStepUpReward(userId, 1);
        // Award Ripple reward to referrer (50 points)
        await this.processRippleRewards(userId, 1);
      }
      
      if (rewardNumber.tier1Status === 'completed' && rewardNumber.tier2Status === 'locked') {
        await this.storage.updateStepUpRewardNumber(rewardNumber.id, { tier2Status: 'active' });
      }
      
      if (rewardNumber.tier2Status === 'active' && pointsToApply >= rewardNumber.tier2Amount) {
        await this.awardTier(rewardNumber.id, 2);
        pointsToApply -= rewardNumber.tier2Amount;
        // Award StepUp reward (1500 points)
        await this.processStepUpReward(userId, 2);
        // Award Ripple reward to referrer (100 points)
        await this.processRippleRewards(userId, 2);
      }
      
      if (rewardNumber.tier2Status === 'completed' && rewardNumber.tier3Status === 'locked') {
        await this.storage.updateStepUpRewardNumber(rewardNumber.id, { tier3Status: 'active' });
      }
      
      if (rewardNumber.tier3Status === 'active' && pointsToApply >= rewardNumber.tier3Amount) {
        await this.awardTier(rewardNumber.id, 3);
        pointsToApply -= rewardNumber.tier3Amount;
        // Award StepUp reward (3500 points)
        await this.processStepUpReward(userId, 3);
        // Award Ripple reward to referrer (150 points)
        await this.processRippleRewards(userId, 3);
      }
      
      if (rewardNumber.tier3Status === 'completed' && rewardNumber.tier4Status === 'locked') {
        await this.storage.updateStepUpRewardNumber(rewardNumber.id, { tier4Status: 'active' });
      }
      
      if (rewardNumber.tier4Status === 'active' && pointsToApply >= rewardNumber.tier4Amount) {
        await this.awardTier(rewardNumber.id, 4);
        // Award StepUp reward (32200 points)
        await this.processStepUpReward(userId, 4);
        // Award Ripple reward to referrer (700 points)
        await this.processRippleRewards(userId, 4);
        // Process Infinity reward (generate 4 new reward numbers)
        await this.processInfinityReward(userId);
        // Process merchant shopping wallet (26200 Taka for designated merchants)
        await this.processMerchantShoppingWallet(userId, 'designated_merchant', 26200);
      }
      
      // Update current points on reward number
      await this.storage.updateStepUpRewardNumber(rewardNumber.id, { 
        currentPoints: Math.min(pointsToApply, rewardNumber.totalPointsRequired) 
      });
    }
  }
  
  async checkAndCreateGlobalSerial(userId: string): Promise<void> {
    // Get customer profile to check total points
    const profile = await this.storage.getCustomerProfile(userId);
    if (!profile) return;

    const totalPoints = profile.totalPointsEarned || 0;
    
    // Only proceed if customer has 1500+ points (global eligibility threshold)
    if (totalPoints < 1500) return;

    // Check if customer already has a global serial number
    const customerId = await this.getCustomerId(userId);
    if (!customerId) return;

    const existingSerial = await this.storage.getCustomerSerialNumber(customerId);
    
    // If no serial number exists, create one based on achievement order
    if (!existingSerial) {
      const serialData = await this.storage.assignSerialNumberToCustomer(customerId);
      console.log(`🎉 Global serial number #${serialData.globalSerialNumber} assigned to customer ${userId} with ${totalPoints} points`);
      
      // Determine reward tier based on serial number ranges (from Bengali logic)
      const rewardTier = this.getRewardTierBySerial(serialData.globalSerialNumber);
      console.log(`🎯 Customer ${userId} assigned to reward tier: ${rewardTier.name} (Serial #${serialData.globalSerialNumber})`);
    }

    // Check if user already has a global reward number
    const existingRewardNumbers = await this.storage.getRewardNumbersByUser(userId);
    const hasGlobalReward = existingRewardNumbers.some((rn: any) => rn.type === 'global');
    
    if (!hasGlobalReward) {
      // Create global reward number automatically with enhanced tier system
      const user = await this.storage.getUser(userId);
      if (user) {
        const globalRewardNumber = await this.storage.getNextGlobalRewardNumber();
        const serialNumber = await this.storage.generateSerialNumber();
        
        // Enhanced tier amounts based on global point system logic
        const rewardNumberData: InsertStepUpRewardNumber = {
          userId,
          rewardNumber: globalRewardNumber,
          serialNumber: serialNumber,
          type: 'global',
          tier1Status: 'active',
          tier1Amount: 800,    // First tier requirement
          tier2Status: 'locked',
          tier2Amount: 1500,   // Second tier requirement  
          tier3Status: 'locked',
          tier3Amount: 3500,   // Third tier requirement
          tier4Status: 'locked',
          tier4Amount: 32200,  // Final tier requirement
          tier4VoucherReserve: 6000,    // Voucher reserve amount
          tier4RedeemableAmount: 20200, // Redeemable amount
          currentPoints: 0,
          totalPointsRequired: 37000,   // Total points needed for completion
          isCompleted: false,
          country: user.country || 'BD'
        };
        
        await this.storage.createStepUpRewardNumber(rewardNumberData);
        console.log(`🎯 Global reward number created for customer ${userId}`);
      }
    }
  }

  // Get reward tier based on global serial number (from Bengali logic)
  private getRewardTierBySerial(serialNumber: number): { name: string; range: string; reward: number } {
    if (serialNumber === 1) {
      return { name: 'Champion', range: '1', reward: 38000 };
    } else if (serialNumber >= 2 && serialNumber <= 5) {
      return { name: 'Elite', range: '2-5', reward: 15000 };
    } else if (serialNumber >= 6 && serialNumber <= 15) {
      return { name: 'Premium', range: '6-15', reward: 8000 };
    } else if (serialNumber >= 16 && serialNumber <= 37) {
      return { name: 'Gold', range: '16-37', reward: 3500 };
    } else if (serialNumber >= 38 && serialNumber <= 65) {
      return { name: 'Silver', range: '38-65', reward: 1500 };
    } else {
      return { name: 'Bronze', range: '66+', reward: 800 };
    }
  }

  async awardTier(rewardNumberId: string, tierLevel: number): Promise<void> {
    const updateData: any = {};
    const now = new Date();
    
    switch (tierLevel) {
      case 1:
        updateData.tier1Status = 'completed';
        updateData.tier1CompletedAt = now;
        break;
      case 2:
        updateData.tier2Status = 'completed';
        updateData.tier2CompletedAt = now;
        break;
      case 3:
        updateData.tier3Status = 'completed';
        updateData.tier3CompletedAt = now;
        break;
      case 4:
        updateData.tier4Status = 'completed';
        updateData.tier4CompletedAt = now;
        updateData.isCompleted = true;
        updateData.completedAt = now;
        break;
    }
    
    await this.storage.updateStepUpRewardNumber(rewardNumberId, updateData);
  }
  
  // Affiliate referral commission system (5% lifetime commission)
  async processReferralCommission(refereeId: string, basePoints: number): Promise<void> {
    const referral = await this.storage.getReferralByReferee(refereeId);
    if (!referral) return; // No referrer
    
    const commissionRate = 0.05; // 5%
    const commissionAmount = basePoints * commissionRate;
    
    // Create commission transaction for referrer
    await this.addPoints(referral.referrerId, Math.floor(commissionAmount), 'referral_commission', {
      refereeId,
      basePoints,
      commissionRate,
      description: `5% referral commission from ${refereeId}`
    });
    
    // Update referral tracking
    const currentCommission = parseFloat(referral.lifetimeCommissionEarned);
    await this.storage.updateReferral(referral.id, {
      lifetimeCommissionEarned: (currentCommission + commissionAmount).toString()
    });
    
    // Record commission transaction
    const commissionTransaction: InsertCommissionTransaction = {
      referrerId: referral.referrerId,
      refereeId,
      transactionType: 'affiliate_commission',
      originalTransactionId: 'temp', // Would be actual transaction ID
      baseAmount: basePoints,
      commissionAmount: commissionAmount.toString(),
      commissionRate: commissionRate
    };
    
    await this.storage.createCommissionTransaction(commissionTransaction);
  }
  
  // Ripple reward system (50, 100, 150, 700 points for tiers 1-4) - Bengali document logic
  async processRippleRewards(userId: string, tierLevel: number): Promise<void> {
    const referral = await this.storage.getReferralByReferee(userId);
    if (!referral) return; // No referrer
    
    // Ripple reward amounts as per Bengali document: 50, 100, 150, 700
    const rippleAmounts = [50, 100, 150, 700]; // For tiers 1-4
    const rippleAmount = rippleAmounts[tierLevel - 1];
    
    if (!rippleAmount) return;
    
    // Award ripple reward to referrer in income wallet
    await this.updateWalletBalance(referral.referrerId, 'income', rippleAmount);
    
    // Create transaction record
    await this.storage.createPointTransaction({
      userId: referral.referrerId,
      points: rippleAmount,
      transactionType: 'ripple_reward',
      description: `Ripple reward for tier ${tierLevel} completion by ${userId}`,
      balanceBefore: await this.getWalletBalance(referral.referrerId, 'income') - rippleAmount,
      balanceAfter: await this.getWalletBalance(referral.referrerId, 'income'),
      status: 'completed',
      metadata: {
        refereeId: userId,
        tierLevel,
        rippleAmount,
        rewardType: 'ripple'
      }
    });
    
    // Update referral tracking
    await this.storage.updateReferral(referral.id, {
      totalRippleRewards: (referral.totalRippleRewards || 0) + rippleAmount
    });
    
    // Record commission transaction
    const commissionTransaction: InsertCommissionTransaction = {
      referrerId: referral.referrerId,
      refereeId: userId,
      transactionType: 'ripple_reward',
      originalTransactionId: 'tier_completion',
      baseAmount: 0,
      commissionAmount: rippleAmount.toString(),
      rippleLevel: tierLevel,
      rippleAmount
    };
    
    await this.storage.createCommissionTransaction(commissionTransaction);
  }

  // StepUp reward system - Award points based on tier completion
  async processStepUpReward(userId: string, tierLevel: number): Promise<void> {
    const stepUpAmounts = [800, 1500, 3500, 32200]; // As per Bengali document
    const stepUpAmount = stepUpAmounts[tierLevel - 1];
    
    if (!stepUpAmount) return;
    
    // Award StepUp reward to user's income wallet
    await this.updateWalletBalance(userId, 'income', stepUpAmount);
    
    // Create transaction record
    await this.storage.createPointTransaction({
      userId,
      points: stepUpAmount,
      transactionType: 'stepup_reward',
      description: `StepUp reward for tier ${tierLevel} completion`,
      balanceBefore: await this.getWalletBalance(userId, 'income') - stepUpAmount,
      balanceAfter: await this.getWalletBalance(userId, 'income'),
      status: 'completed',
      metadata: {
        tierLevel,
        stepUpAmount,
        rewardType: 'stepup'
      }
    });
  }

  // Infinity reward system - Deduct 6,000 points twice (merchant distribution + 4 global numbers)
  async processInfinityReward(userId: string): Promise<void> {
    const deductionAmount = 6000; // 6,000 points to be deducted twice
    
    // First deduction: Distribute to merchants based on ratio where customer earned points
    await this.distributeToMerchants(userId, deductionAmount);
    
    // Second deduction: Generate 4 new global numbers (4 × 1,500 = 6,000 points)
    await this.generateFourGlobalNumbers(userId);
    
    // Create transaction record
    await this.storage.createPointTransaction({
      userId,
      points: -deductionAmount * 2, // Total 12,000 points deducted
      transactionType: 'infinity_reward',
      description: `Infinity reward: 6,000 points distributed to merchants, 6,000 points used for 4 new global numbers`,
      balanceBefore: await this.getWalletBalance(userId, 'income') + (deductionAmount * 2),
      balanceAfter: await this.getWalletBalance(userId, 'income'),
      status: 'completed',
      metadata: {
        rewardType: 'infinity',
        merchantDistribution: deductionAmount,
        newGlobalNumbers: 4,
        totalDeducted: deductionAmount * 2
      }
    });
  }

  // Distribute points to merchants based on ratio where customer earned points
  private async distributeToMerchants(userId: string, amount: number): Promise<void> {
    // Get customer's transaction history to determine merchant ratios
    const transactions = await this.storage.getCustomerTransactions(userId);
    const merchantRatios = this.calculateMerchantRatios(transactions);
    
    // Distribute points to merchants based on ratios
    for (const [merchantId, ratio] of Object.entries(merchantRatios)) {
      const merchantAmount = amount * ratio;
      await this.storage.addMerchantPoints(merchantId, merchantAmount);
    }
  }

  // Calculate merchant ratios based on where customer earned points
  private calculateMerchantRatios(transactions: any[]): Record<string, number> {
    const merchantTotals: Record<string, number> = {};
    let totalPoints = 0;
    
    // Calculate total points earned from each merchant
    for (const transaction of transactions) {
      if (transaction.merchantId && transaction.points > 0) {
        merchantTotals[transaction.merchantId] = (merchantTotals[transaction.merchantId] || 0) + transaction.points;
        totalPoints += transaction.points;
      }
    }
    
    // Calculate ratios
    const ratios: Record<string, number> = {};
    for (const [merchantId, points] of Object.entries(merchantTotals)) {
      ratios[merchantId] = points / totalPoints;
    }
    
    return ratios;
  }

  // Generate 4 new global numbers for customer
  private async generateFourGlobalNumbers(userId: string): Promise<void> {
    for (let i = 0; i < 4; i++) {
      // Create new global number (1,500 points = 1 global number)
      await this.storage.createGlobalRewardNumber({
        userId,
        globalNumber: await this.storage.getNextGlobalNumber(),
        points: 1500,
        status: 'active'
      });
    }
  }

  // Merchant shopping wallet system - 26200 Taka for designated merchants
  async processMerchantShoppingWallet(userId: string, merchantId: string, amount: number): Promise<void> {
    // Create merchant-specific shopping wallet
    await this.updateWalletBalance(userId, 'commerce', amount);
    
    // Create transaction record
    await this.storage.createPointTransaction({
      userId,
      points: amount,
      transactionType: 'merchant_shopping_wallet',
      description: `Merchant shopping wallet for merchant ${merchantId}`,
      balanceBefore: await this.getWalletBalance(userId, 'commerce') - amount,
      balanceAfter: await this.getWalletBalance(userId, 'commerce'),
      status: 'completed',
      metadata: {
        merchantId,
        rewardType: 'merchant_shopping',
        restrictedMerchant: true
      }
    });
  }
  
  // Merchant commission and cashback (15% instant cashback)
  async processMerchantCashback(merchantId: string, pointsDistributed: number): Promise<MerchantTransaction> {
    const cashbackRate = 0.15; // 15%
    const cashbackAmount = pointsDistributed * cashbackRate;
    
    // Add cashback to merchant's income wallet
    await this.updateWalletBalance(merchantId, 'income', cashbackAmount);
    
    // Create merchant transaction record
    const merchantTransaction: InsertMerchantTransaction = {
      merchantId,
      transactionType: 'instant_cashback',
      amount: cashbackAmount.toString(),
      pointsInvolved: pointsDistributed,
      cashbackRate: cashbackRate
    };
    
    return await this.storage.createMerchantTransaction(merchantTransaction);
  }
  
  async processMerchantReferralCommission(merchantId: string, referredMerchantId: string): Promise<void> {
    // 2% commission for merchant referrals
    const commissionRate = 0.02;
    
    // Get referred merchant's point distribution activity
    const referredMerchantTransactions = await this.storage.getMerchantTransactions(referredMerchantId);
    const totalDistributed = referredMerchantTransactions
      .filter((t: any) => t.transactionType === 'point_distribution')
      .reduce((sum: number, t: any) => sum + (t.pointsInvolved || 0), 0);
    
    const commissionAmount = totalDistributed * commissionRate;
    
    if (commissionAmount > 0) {
      // Add commission to referring merchant's income wallet
      await this.updateWalletBalance(merchantId, 'income', commissionAmount);
      
      // Record transaction
      const merchantTransaction: InsertMerchantTransaction = {
        merchantId,
        transactionType: 'referral_commission',
        amount: commissionAmount.toString(),
        referredMerchantId,
        commissionRate: commissionRate
      };
      
      await this.storage.createMerchantTransaction(merchantTransaction);
    }
  }
  
  // Manual point generation (Global Admin only)
  async generatePointsManually(adminId: string, recipientId: string, points: number, description: string): Promise<PointTransaction> {
    const admin = await this.storage.getUser(adminId);
    if (!admin || admin.role !== 'global_admin') {
      throw new Error('Only global admins can manually generate points');
    }
    
    return await this.addPoints(recipientId, points, 'admin_manual', {
      adminId,
      description,
      manualGeneration: true
    });
  }
  
  // QR code point transfers
  async generateQRCode(senderId: string, points: number, expirationMinutes: number = 30): Promise<string> {
    const qrCode = `KOMARCE_${Date.now()}_${Math.random().toString(36).substring(2)}`;
    const expiresAt = new Date(Date.now() + expirationMinutes * 60000);
    
    const qrTransfer = {
      qrCode,
      senderId,
      points,
      expiresAt
    };
    
    await this.storage.createQRTransfer(qrTransfer);
    return qrCode;
  }
  
  async processQRTransfer(qrCode: string, receiverId: string): Promise<PointTransaction> {
    const qrTransfer = await this.storage.getQRTransfer(qrCode);
    
    if (!qrTransfer) {
      throw new Error('Invalid QR code');
    }
    
    if (qrTransfer.isUsed) {
      throw new Error('QR code already used');
    }
    
    if (new Date() > qrTransfer.expiresAt) {
      throw new Error('QR code expired');
    }
    
    // Process the transfer
    const transaction = await this.transferPoints(qrTransfer.senderId, receiverId, qrTransfer.points, 'QR code transfer');
    
    // Mark QR code as used
    await this.storage.updateQRTransfer(qrTransfer.id, {
      isUsed: true,
      usedAt: new Date(),
      receiverId
    });
    
    return transaction;
  }
  
  // Analytics and reporting
  async getUserPointsHistory(userId: string): Promise<PointTransaction[]> {
    return await this.storage.getPointTransactions(userId);
  }
  
  async getWalletTransactions(userId: string, walletType?: string): Promise<PointTransaction[]> {
    const transactions = await this.storage.getPointTransactions(userId);
    
    if (walletType) {
      return transactions.filter((t: any) => 
        t.fromWalletType === walletType || t.toWalletType === walletType
      );
    }
    
    return transactions;
  }
  
  async getLeaderboard(type: 'global' | 'local', country?: string): Promise<any[]> {
    return await this.storage.getLeaderboard(type, country);
  }
  
  // Helper methods
  private async updateWalletBalance(userId: string, walletType: 'reward_points' | 'income' | 'commerce', amount: number): Promise<void> {
    let wallet = await this.storage.getUserWallet(userId, walletType);
    
    if (!wallet) {
      // Create wallet if it doesn't exist
      const walletData: InsertUserWallet = {
        userId,
        walletType,
        balance: amount.toString(),
        totalReceived: amount > 0 ? amount.toString() : '0',
        totalSpent: amount < 0 ? Math.abs(amount).toString() : '0'
      };
      await this.storage.createUserWallet(walletData);
    } else {
      // Update existing wallet
      const currentBalance = parseFloat(wallet.balance);
      const newBalance = currentBalance + amount;
      const totalReceived = parseFloat(wallet.totalReceived) + (amount > 0 ? amount : 0);
      const totalSpent = parseFloat(wallet.totalSpent) + (amount < 0 ? Math.abs(amount) : 0);
      
      await this.storage.updateUserWallet(wallet.id, {
        balance: newBalance.toString(),
        totalReceived: totalReceived.toString(),
        totalSpent: totalSpent.toString()
      });
    }
  }
  
  private async getUserTotalPoints(userId: string): Promise<number> {
    const transactions = await this.storage.getPointTransactions(userId);
    return transactions.reduce((sum: number, t: any) => sum + t.points, 0);
  }
  
  private async generateUniqueRewardNumber(): Promise<number> {
    // Generate unique reward number (would implement proper logic)
    return Math.floor(Math.random() * 1000000) + 100000;
  }
  
  private async getCustomerId(userId: string): Promise<string | null> {
    try {
      const profile = await this.storage.getCustomerProfile(userId);
      return profile ? profile.id : null;
    } catch (error) {
      return null;
    }
  }

  private async generateUniqueSerial(type: string, country: string): Promise<string> {
    // Generate unique serial based on type and country
    const prefix = type === 'global' ? 'G' : 'L';
    const countryCode = country.toUpperCase();
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substring(2, 6);
    
    return `${prefix}${countryCode}${timestamp}${random}`.toUpperCase();
  }
}