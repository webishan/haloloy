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
    const vatRate = 0.125; // 12.5% VAT
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
    const rewardNumbers = await this.storage.getActiveRewardNumbers(userId);
    const userPoints = await this.getUserTotalPoints(userId);
    
    for (const rewardNumber of rewardNumbers) {
      let pointsToApply = userPoints;
      
      // Check each tier progression
      if (rewardNumber.tier1Status === 'active' && pointsToApply >= rewardNumber.tier1Amount) {
        await this.awardTier(rewardNumber.id, 1);
        pointsToApply -= rewardNumber.tier1Amount;
        await this.processRippleRewards(userId, 1);
      }
      
      if (rewardNumber.tier1Status === 'completed' && rewardNumber.tier2Status === 'locked') {
        await this.storage.updateStepUpRewardNumber(rewardNumber.id, { tier2Status: 'active' });
      }
      
      if (rewardNumber.tier2Status === 'active' && pointsToApply >= rewardNumber.tier2Amount) {
        await this.awardTier(rewardNumber.id, 2);
        pointsToApply -= rewardNumber.tier2Amount;
        await this.processRippleRewards(userId, 2);
      }
      
      if (rewardNumber.tier2Status === 'completed' && rewardNumber.tier3Status === 'locked') {
        await this.storage.updateStepUpRewardNumber(rewardNumber.id, { tier3Status: 'active' });
      }
      
      if (rewardNumber.tier3Status === 'active' && pointsToApply >= rewardNumber.tier3Amount) {
        await this.awardTier(rewardNumber.id, 3);
        pointsToApply -= rewardNumber.tier3Amount;
        await this.processRippleRewards(userId, 3);
      }
      
      if (rewardNumber.tier3Status === 'completed' && rewardNumber.tier4Status === 'locked') {
        await this.storage.updateStepUpRewardNumber(rewardNumber.id, { tier4Status: 'active' });
      }
      
      if (rewardNumber.tier4Status === 'active' && pointsToApply >= rewardNumber.tier4Amount) {
        await this.awardTier(rewardNumber.id, 4);
        await this.processRippleRewards(userId, 4);
        
        // Special handling for tier 4 - split into voucher reserve and redeemable
        await this.updateWalletBalance(userId, 'income', rewardNumber.tier4VoucherReserve);
        await this.updateWalletBalance(userId, 'commerce', rewardNumber.tier4RedeemableAmount);
      }
      
      // Update current points on reward number
      await this.storage.updateStepUpRewardNumber(rewardNumber.id, { 
        currentPoints: Math.min(pointsToApply, rewardNumber.totalPointsRequired) 
      });
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
  
  // Ripple reward system (50, 100, 150, 700 points for tiers 1-4)
  async processRippleRewards(userId: string, tierLevel: number): Promise<void> {
    const referral = await this.storage.getReferralByReferee(userId);
    if (!referral) return; // No referrer
    
    const rippleAmounts = [50, 100, 150, 700]; // For tiers 1-4
    const rippleAmount = rippleAmounts[tierLevel - 1];
    
    if (!rippleAmount) return;
    
    // Award ripple reward to referrer
    await this.addPoints(referral.referrerId, rippleAmount, 'ripple_reward', {
      refereeId: userId,
      tierLevel,
      rippleAmount,
      description: `Ripple reward for tier ${tierLevel} completion`
    });
    
    // Update referral tracking
    await this.storage.updateReferral(referral.id, {
      totalRippleRewards: referral.totalRippleRewards + rippleAmount
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
  
  private async generateUniqueSerial(type: string, country: string): Promise<string> {
    // Generate unique serial based on type and country
    const prefix = type === 'global' ? 'G' : 'L';
    const countryCode = country.toUpperCase();
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substring(2, 6);
    
    return `${prefix}${countryCode}${timestamp}${random}`.toUpperCase();
  }
}