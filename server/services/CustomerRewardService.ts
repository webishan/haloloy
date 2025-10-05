import { eq, and, sql, desc, asc } from "drizzle-orm";
import { db } from "../db";
import {
  customers,
  globalNumbers,
  stepUpConfig,
  stepUpRewards,
  infinityRewardCycles,
  shoppingVoucherDistributions,
  shoppingVouchers,
  commissionTransactions,
  referrals,
  orders,
  pointTransactions,
  userWallets,
  type Customer,
  type GlobalNumber,
  type StepUpReward,
  type InfinityRewardCycle,
  type CommissionTransaction
} from "../../shared/schema";

/**
 * CustomerRewardService
 * 
 * Comprehensive service for managing all customer reward systems:
 * - StepUp Rewards: Milestone rewards at 1,500 points with global sequential numbers
 * - Infinity Rewards: Exponential reward number generation at 30,000 points
 * - Shopping Vouchers: Proportional distribution of 6,000 points to merchants
 * - Affiliate Rewards: 5% lifetime commission on referred customers' earnings
 * - Ripple Rewards: Bonus points when referred customers hit StepUp milestones
 */
export class CustomerRewardService {
  
  /**
   * Helper: Update wallet balance
   */
  private async updateWalletBalance(
    userId: string,
    walletType: "reward_points" | "income" | "commerce",
    amountChange: number
  ): Promise<void> {
    await db
      .update(userWallets)
      .set({
        balance: sql`${userWallets.balance} + ${amountChange}`,
        totalReceived: sql`${userWallets.totalReceived} + ${amountChange}`
      })
      .where(
        and(
          eq(userWallets.userId, userId),
          eq(userWallets.walletType, walletType)
        )
      );
  }

  /**
   * STEPUP REWARDS SYSTEM
   * 
   * When a customer's accumulated points reach 1,500:
   * 1. Reset accumulated points to zero
   * 2. Assign a unique global sequential number (1, 2, 3, ...)
   * 3. Check if this triggers any milestone rewards for other customers
   * 
   * Milestones: When global number N is reached, award bonus to customer with global number G where:
   * - G × 5 = N → Award 500 points
   * - G × 25 = N → Award 1,500 points
   * - G × 125 = N → Award 3,000 points
   * - G × 500 = N → Award 30,000 points
   * - G × 2500 = N → Award 160,000 points
   */
  async checkAndProcessStepUpRewards(customerId: string): Promise<{
    globalNumberAssigned: number | null;
    milestonesTriggered: Array<{ recipientCustomerId: string; rewardPoints: number }>;
  }> {
    // Get customer's current accumulated points
    const [customer] = await db
      .select()
      .from(customers)
      .where(eq(customers.id, customerId))
      .limit(1);
    
    if (!customer) {
      throw new Error("Customer not found");
    }

    // Check if customer has accumulated 1,500 points
    if (customer.accumulatedPoints < 1500) {
      return { globalNumberAssigned: null, milestonesTriggered: [] };
    }

    // Calculate how many global numbers should be assigned
    const numberOfGlobalNumbers = Math.floor(customer.accumulatedPoints / 1500);
    const remainingPoints = customer.accumulatedPoints % 1500;
    
    const milestonesTriggered: Array<{ recipientCustomerId: string; rewardPoints: number }> = [];
    let lastGlobalNumber: number | null = null;

    // Process each global number assignment
    for (let i = 0; i < numberOfGlobalNumbers; i++) {
      // Get the next global sequential number
      const [maxGlobalNumber] = await db
        .select({ max: sql<number>`COALESCE(MAX(${globalNumbers.globalNumber}), 0)` })
        .from(globalNumbers);
      
      const nextGlobalNumber = (maxGlobalNumber?.max || 0) + 1;

      // Assign global number to customer
      await db.insert(globalNumbers).values({
        globalNumber: nextGlobalNumber,
        customerId: customerId,
        pointsAccumulated: 1500,
        isActive: true
      });

      lastGlobalNumber = nextGlobalNumber;

      // Check if this new global number triggers any milestone rewards
      const milestones = await this.checkMilestoneRewards(nextGlobalNumber);
      milestonesTriggered.push(...milestones);
    }

    // Update customer's accumulated points (keep remainder)
    await db
      .update(customers)
      .set({ 
        accumulatedPoints: remainingPoints,
        globalRewardNumbers: sql`${customers.globalRewardNumbers} + ${numberOfGlobalNumbers}`,
        globalSerialNumber: lastGlobalNumber,
        stepUpCompleted: true
      })
      .where(eq(customers.id, customerId));

    return { 
      globalNumberAssigned: lastGlobalNumber, 
      milestonesTriggered 
    };
  }

  /**
   * Check if a new global number triggers milestone rewards
   * Milestones: 5, 25, 125, 500, 2500 (multipliers)
   * Rewards: 500, 1500, 3000, 30000, 160000 (points)
   */
  private async checkMilestoneRewards(newGlobalNumber: number): Promise<Array<{ recipientCustomerId: string; rewardPoints: number }>> {
    const milestoneConfig = [
      { multiplier: 5, rewardPoints: 500 },
      { multiplier: 25, rewardPoints: 1500 },
      { multiplier: 125, rewardPoints: 3000 },
      { multiplier: 500, rewardPoints: 30000 },
      { multiplier: 2500, rewardPoints: 160000 }
    ];

    const rewardsTriggered: Array<{ recipientCustomerId: string; rewardPoints: number }> = [];

    for (const milestone of milestoneConfig) {
      // Check if newGlobalNumber is a multiple of the milestone multiplier
      if (newGlobalNumber % milestone.multiplier === 0) {
        const recipientGlobalNumber = newGlobalNumber / milestone.multiplier;

        // Find customer with this global number
        const [recipientGlobalRecord] = await db
          .select()
          .from(globalNumbers)
          .where(eq(globalNumbers.globalNumber, recipientGlobalNumber))
          .limit(1);

        if (recipientGlobalRecord) {
          // Check if this reward has already been given (idempotency)
          const [existingReward] = await db
            .select()
            .from(stepUpRewards)
            .where(
              and(
                eq(stepUpRewards.recipientGlobalNumber, recipientGlobalNumber),
                eq(stepUpRewards.triggerGlobalNumber, newGlobalNumber),
                eq(stepUpRewards.multiplier, milestone.multiplier)
              )
            )
            .limit(1);

          if (!existingReward) {
            // Award the milestone reward
            await this.awardStepUpMilestone(
              recipientGlobalRecord.customerId,
              recipientGlobalNumber,
              newGlobalNumber,
              milestone.multiplier,
              milestone.rewardPoints
            );

            rewardsTriggered.push({
              recipientCustomerId: recipientGlobalRecord.customerId,
              rewardPoints: milestone.rewardPoints
            });
          }
        }
      }
    }

    return rewardsTriggered;
  }

  /**
   * Award a StepUp milestone reward to a customer
   */
  private async awardStepUpMilestone(
    recipientCustomerId: string,
    recipientGlobalNumber: number,
    triggerGlobalNumber: number,
    multiplier: number,
    rewardPoints: number
  ): Promise<void> {
    // Record the reward
    const [reward] = await db.insert(stepUpRewards).values({
      recipientCustomerId,
      recipientGlobalNumber,
      triggerGlobalNumber,
      multiplier,
      rewardPoints,
      isAwarded: true,
      awardedAt: new Date()
    }).returning();

    // Add points to customer's income wallet
    await this.updateWalletBalance(recipientCustomerId, "income", rewardPoints);

    // Record transaction
    await db.insert(pointTransactions).values({
      userId: recipientCustomerId,
      points: rewardPoints,
      transactionType: "cashback",
      toWalletType: "income",
      description: `StepUp Milestone Reward: Global #${recipientGlobalNumber} × ${multiplier} = ${triggerGlobalNumber}`,
      referenceId: reward.id,
      status: "completed"
    });
  }

  /**
   * INFINITY REWARDS SYSTEM
   * 
   * When a customer reaches 30,000 points (4th Step of StepUp):
   * 1. Keep 6,000 points for Global admin (tracked separately)
   * 2. Generate 4 new reward numbers (first cycle)
   * 3. Each new number provides 195,000 StepUp Reward points (total 780,000 points)
   * 4. Next cycle: 16 numbers, then 64, then continue expanding exponentially (4x multiplier)
   * 5. Another 6,000 points allocated for Shopping Vouchers (separate method)
   */
  async checkAndProcessInfinityRewards(customerId: string): Promise<{
    cycleTriggered: boolean;
    cycleNumber: number;
    newGlobalNumbers: number[];
  }> {
    // Get customer data
    const [customer] = await db
      .select()
      .from(customers)
      .where(eq(customers.id, customerId))
      .limit(1);

    if (!customer) {
      throw new Error("Customer not found");
    }

    // Check eligibility: Must have completed StepUp (reached 1500 once) and have 30,000+ accumulated points
    if (!customer.stepUpCompleted || customer.accumulatedPoints < 30000) {
      return { cycleTriggered: false, cycleNumber: 0, newGlobalNumbers: [] };
    }

    // Calculate cycle number (1st cycle = 4 numbers, 2nd = 16, 3rd = 64, etc.)
    const cycleNumber = customer.infinityCyclesCompleted + 1;
    const newNumbersToGenerate = Math.pow(4, cycleNumber); // 4^1 = 4, 4^2 = 16, 4^3 = 64...

    // Create infinity cycle record
    const [infinityCycle] = await db
      .insert(infinityRewardCycles)
      .values({
        customerId: customerId,
        cycleNumber: cycleNumber,
        pointsAtStart: customer.accumulatedPoints,
        merchantDistributionAmount: 6000, // Shopping voucher distribution
        newGlobalNumbersGenerated: newNumbersToGenerate,
        totalPointsDeducted: 12000, // 6000 for admin + 6000 for shopping vouchers
        distributionCompleted: false,
        globalNumbersAssigned: false
      })
      .returning();

    // Generate new global numbers (each provides 195,000 points)
    const newGlobalNumbers: number[] = [];
    
    for (let i = 0; i < newNumbersToGenerate; i++) {
      // Get next global sequential number
      const [maxGlobalNumber] = await db
        .select({ max: sql<number>`COALESCE(MAX(${globalNumbers.globalNumber}), 0)` })
        .from(globalNumbers);
      
      const nextGlobalNumber = (maxGlobalNumber?.max || 0) + 1;

      // Assign global number (from infinity cycle)
      await db.insert(globalNumbers).values({
        globalNumber: nextGlobalNumber,
        customerId: customerId,
        pointsAccumulated: 195000, // Each infinity number = 195,000 points
        isActive: true
      });

      newGlobalNumbers.push(nextGlobalNumber);

      // Add 195,000 points to customer's income wallet
      await this.updateWalletBalance(customerId, "income", 195000);

      // Record transaction
      await db.insert(pointTransactions).values({
        userId: customerId,
        points: 195000,
        transactionType: "cashback",
        toWalletType: "income",
        description: `Infinity Cycle ${cycleNumber} - Global Number ${nextGlobalNumber}`,
        referenceId: infinityCycle.id,
        status: "completed"
      });
    }

    // Update infinity cycle status
    await db
      .update(infinityRewardCycles)
      .set({ globalNumbersAssigned: true })
      .where(eq(infinityRewardCycles.id, infinityCycle.id));

    // Update customer: Deduct 12,000 points (6k admin + 6k vouchers) and increment cycle count
    await db
      .update(customers)
      .set({
        accumulatedPoints: sql`${customers.accumulatedPoints} - 12000`,
        infinityCyclesCompleted: cycleNumber,
        infinityEligible: true,
        lastInfinityCycleAt: new Date(),
        globalRewardNumbers: sql`${customers.globalRewardNumbers} + ${newNumbersToGenerate}`
      })
      .where(eq(customers.id, customerId));

    // Process shopping voucher distribution (called separately)
    await this.distributeShoppingVouchers(customerId, infinityCycle.id);

    return {
      cycleTriggered: true,
      cycleNumber: cycleNumber,
      newGlobalNumbers: newGlobalNumbers
    };
  }

  /**
   * SHOPPING VOUCHER SYSTEM
   * 
   * When customer reaches 30,000 points (triggered with Infinity):
   * 1. Allocate 6,000 points for Shopping Vouchers
   * 2. Distribute proportionally among merchants where customer has shopped
   * 3. Store in separate shopping voucher wallet for customer
   */
  async distributeShoppingVouchers(customerId: string, infinityCycleId: string): Promise<void> {
    const totalVoucherPoints = 6000;

    // Get all merchants where customer has made orders
    const customerOrders = await db
      .select({
        merchantId: orders.merchantId,
        totalSpent: sql<number>`SUM(CAST(${orders.totalAmount} AS DECIMAL))::NUMERIC`
      })
      .from(orders)
      .where(eq(orders.customerId, customerId))
      .groupBy(orders.merchantId);

    if (customerOrders.length === 0) {
      // No orders yet, can't distribute vouchers
      return;
    }

    // Calculate total spent across all merchants
    const totalSpent = customerOrders.reduce((sum, order) => sum + Number(order.totalSpent), 0);

    // Distribute voucher points proportionally
    for (const order of customerOrders) {
      const merchantSpent = Number(order.totalSpent);
      const proportion = merchantSpent / totalSpent;
      const voucherPoints = Math.floor(totalVoucherPoints * proportion);

      if (voucherPoints > 0) {
        // Create shopping voucher for customer at this merchant
        const voucherCode = `SV-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;
        const expiresAt = new Date();
        expiresAt.setMonth(expiresAt.getMonth() + 12); // 1 year validity

        await db.insert(shoppingVouchers).values({
          customerId: customerId,
          merchantId: order.merchantId,
          voucherCode: voucherCode,
          voucherValue: voucherPoints.toString(),
          originalRewardId: infinityCycleId,
          status: "active",
          expiresAt: expiresAt
        });

        // Record transaction
        await db.insert(pointTransactions).values({
          userId: customerId,
          points: voucherPoints,
          transactionType: "cashback",
          toWalletType: "commerce",
          description: `Shopping Voucher for Merchant ${order.merchantId.slice(0, 8)} - ${voucherPoints} points`,
          referenceId: infinityCycleId,
          status: "completed"
        });
      }
    }

    // Record shopping voucher distribution
    await db.insert(shoppingVoucherDistributions).values({
      customerId: customerId,
      customerInfinityCycleId: infinityCycleId,
      totalVoucherValue: totalVoucherPoints,
      merchantSharePoints: totalVoucherPoints,
      cashOutStatus: "pending"
    });
  }

  /**
   * AFFILIATE REWARDS SYSTEM
   * 
   * When a referred customer earns reward points from any merchant:
   * 1. Calculate 5% of those points as referral commission
   * 2. Add to referrer's income wallet
   * 3. Maintain referral relationship permanently
   */
  async processAffiliateReward(
    customerId: string,
    pointsEarned: number,
    originalTransactionId: string
  ): Promise<{ commissionPaid: boolean; commissionAmount: number; referrerId: string | null }> {
    // Check if customer was referred
    const [referralRecord] = await db
      .select()
      .from(referrals)
      .where(eq(referrals.refereeId, customerId))
      .limit(1);

    if (!referralRecord) {
      return { commissionPaid: false, commissionAmount: 0, referrerId: null };
    }

    // Calculate 5% commission
    const commissionAmount = Math.floor(pointsEarned * 0.05);

    if (commissionAmount === 0) {
      return { commissionPaid: false, commissionAmount: 0, referrerId: referralRecord.referrerId };
    }

    // Add commission to referrer's income wallet
    await this.updateWalletBalance(referralRecord.referrerId, "income", commissionAmount);

    // Record commission transaction
    await db.insert(commissionTransactions).values({
      referrerId: referralRecord.referrerId,
      refereeId: customerId,
      transactionType: "affiliate_commission",
      originalTransactionId: originalTransactionId,
      baseAmount: pointsEarned,
      commissionAmount: commissionAmount.toString(),
      commissionRate: "0.05" // 5%
    });

    // Update referrer's total affiliate commission in referrals table
    await db
      .update(referrals)
      .set({
        lifetimeCommissionEarned: sql`${referrals.lifetimeCommissionEarned} + ${commissionAmount}`
      })
      .where(eq(referrals.id, referralRecord.id));

    // Record transaction for referrer
    await db.insert(pointTransactions).values({
      userId: referralRecord.referrerId,
      points: commissionAmount,
      transactionType: "referral_commission",
      toWalletType: "income",
      fromUserId: customerId,
      description: `Affiliate Commission (5%) from referred customer`,
      referenceId: referralRecord.id,
      status: "completed"
    });

    return { 
      commissionPaid: true, 
      commissionAmount: commissionAmount, 
      referrerId: referralRecord.referrerId 
    };
  }

  /**
   * RIPPLE REWARDS SYSTEM
   * 
   * When a referred customer earns specific StepUp Reward points:
   * - 500 points → Referrer gets 50 points
   * - 1,500 points → Referrer gets 100 points
   * - 3,000 points → Referrer gets 150 points
   * - 30,000 points → Referrer gets 700 points
   * - 160,000 points → Referrer gets 1,500 points
   */
  async processRippleReward(
    recipientCustomerId: string,
    stepUpRewardPoints: number,
    originalStepUpRewardId: string
  ): Promise<{ ripplePaid: boolean; rippleAmount: number; referrerId: string | null }> {
    // Define ripple reward mapping
    const rippleMapping: { [key: number]: number } = {
      500: 50,
      1500: 100,
      3000: 150,
      30000: 700,
      160000: 1500
    };

    // Check if this StepUp amount triggers a ripple reward
    const rippleAmount = rippleMapping[stepUpRewardPoints];
    
    if (!rippleAmount) {
      return { ripplePaid: false, rippleAmount: 0, referrerId: null };
    }

    // Check if recipient was referred
    const [referralRecord] = await db
      .select()
      .from(referrals)
      .where(eq(referrals.refereeId, recipientCustomerId))
      .limit(1);

    if (!referralRecord) {
      return { ripplePaid: false, rippleAmount: 0, referrerId: null };
    }

    // Add ripple reward to referrer's income wallet
    await this.updateWalletBalance(referralRecord.referrerId, "income", rippleAmount);

    // Record ripple reward transaction
    await db.insert(commissionTransactions).values({
      referrerId: referralRecord.referrerId,
      refereeId: recipientCustomerId,
      transactionType: "ripple_reward",
      originalTransactionId: originalStepUpRewardId,
      baseAmount: stepUpRewardPoints,
      commissionAmount: rippleAmount.toString(),
      rippleAmount: rippleAmount
    });

    // Update referrer's total ripple rewards in referrals table
    await db
      .update(referrals)
      .set({
        totalRippleRewards: sql`${referrals.totalRippleRewards} + ${rippleAmount}`
      })
      .where(eq(referrals.id, referralRecord.id));

    // Record transaction for referrer
    await db.insert(pointTransactions).values({
      userId: referralRecord.referrerId,
      points: rippleAmount,
      transactionType: "ripple_reward",
      toWalletType: "income",
      fromUserId: recipientCustomerId,
      description: `Ripple Reward: Referred customer earned ${stepUpRewardPoints} StepUp points`,
      referenceId: referralRecord.id,
      status: "completed"
    });

    return { 
      ripplePaid: true, 
      rippleAmount: rippleAmount, 
      referrerId: referralRecord.referrerId 
    };
  }

  /**
   * Master method to process all rewards when customer earns points
   * This should be called whenever a customer receives points from merchant
   */
  async processAllRewards(customerId: string, pointsEarned: number, transactionId: string): Promise<{
    stepUpResult: any;
    infinityResult: any;
    affiliateResult: any;
  }> {
    // 1. Add points to accumulated balance
    await db
      .update(customers)
      .set({
        accumulatedPoints: sql`${customers.accumulatedPoints} + ${pointsEarned}`,
        totalPointsEarned: sql`${customers.totalPointsEarned} + ${pointsEarned}`
      })
      .where(eq(customers.id, customerId));

    // 2. Check and process StepUp rewards (1,500 point milestones)
    const stepUpResult = await this.checkAndProcessStepUpRewards(customerId);

    // 3. Check and process Infinity rewards (30,000 point threshold)
    const infinityResult = await this.checkAndProcessInfinityRewards(customerId);

    // 4. Process Affiliate rewards (5% to referrer)
    const affiliateResult = await this.processAffiliateReward(customerId, pointsEarned, transactionId);

    // 5. Process Ripple rewards (only if StepUp milestones were triggered)
    if (stepUpResult.milestonesTriggered.length > 0) {
      for (const milestone of stepUpResult.milestonesTriggered) {
        if (milestone.recipientCustomerId === customerId) {
          // This customer earned a milestone reward, trigger ripple for their referrer
          await this.processRippleReward(customerId, milestone.rewardPoints, transactionId);
        }
      }
    }

    return {
      stepUpResult,
      infinityResult,
      affiliateResult
    };
  }

  /**
   * Get customer's global numbers
   */
  async getCustomerGlobalNumbers(customerId: string): Promise<GlobalNumber[]> {
    return await db
      .select()
      .from(globalNumbers)
      .where(eq(globalNumbers.customerId, customerId))
      .orderBy(asc(globalNumbers.globalNumber));
  }

  /**
   * Get customer's shopping vouchers
   */
  async getCustomerShoppingVouchers(customerId: string): Promise<any[]> {
    return await db
      .select()
      .from(shoppingVouchers)
      .where(
        and(
          eq(shoppingVouchers.customerId, customerId),
          eq(shoppingVouchers.status, "active")
        )
      )
      .orderBy(desc(shoppingVouchers.createdAt));
  }
}

export const customerRewardService = new CustomerRewardService();
