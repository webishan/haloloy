import { Router } from "express";
import { db } from "./db";
import { eq, and, desc, sql } from "drizzle-orm";
import {
  customers,
  globalNumbers,
  shoppingVouchers,
  stepUpRewards,
  referrals,
  commissionTransactions,
  infinityRewardCycles
} from "../shared/schema";

const router = Router();

/**
 * GET /api/customer/rewards/global-numbers
 * Get all global numbers assigned to a customer
 */
router.get("/customer/rewards/global-numbers", async (req, res) => {
  try {
    const userId = req.query.userId as string;
    
    if (!userId) {
      return res.status(400).json({ message: "userId is required" });
    }

    // Get customer
    const [customer] = await db
      .select()
      .from(customers)
      .where(eq(customers.userId, userId))
      .limit(1);

    if (!customer) {
      return res.status(404).json({ message: "Customer not found" });
    }

    // Get all global numbers for this customer
    const numbers = await db
      .select()
      .from(globalNumbers)
      .where(eq(globalNumbers.customerId, customer.id))
      .orderBy(globalNumbers.globalNumber);

    res.json({
      globalNumbers: numbers,
      totalCount: numbers.length,
      latestNumber: customer.globalSerialNumber
    });
  } catch (error) {
    console.error("Error fetching global numbers:", error);
    res.status(500).json({ message: "Failed to fetch global numbers" });
  }
});

/**
 * GET /api/customer/rewards/shopping-vouchers
 * Get all active shopping vouchers for a customer
 */
router.get("/customer/rewards/shopping-vouchers", async (req, res) => {
  try {
    const userId = req.query.userId as string;
    
    if (!userId) {
      return res.status(400).json({ message: "userId is required" });
    }

    // Get customer
    const [customer] = await db
      .select()
      .from(customers)
      .where(eq(customers.userId, userId))
      .limit(1);

    if (!customer) {
      return res.status(404).json({ message: "Customer not found" });
    }

    // Get all active shopping vouchers
    const vouchers = await db
      .select()
      .from(shoppingVouchers)
      .where(
        and(
          eq(shoppingVouchers.customerId, customer.id),
          eq(shoppingVouchers.status, "active")
        )
      )
      .orderBy(desc(shoppingVouchers.createdAt));

    res.json({
      vouchers: vouchers,
      totalCount: vouchers.length
    });
  } catch (error) {
    console.error("Error fetching shopping vouchers:", error);
    res.status(500).json({ message: "Failed to fetch shopping vouchers" });
  }
});

/**
 * GET /api/customer/rewards/summary
 * Get comprehensive reward summary for a customer
 */
router.get("/customer/rewards/summary", async (req, res) => {
  try {
    const userId = req.query.userId as string;
    
    if (!userId) {
      return res.status(400).json({ message: "userId is required" });
    }

    // Get customer
    const [customer] = await db
      .select()
      .from(customers)
      .where(eq(customers.userId, userId))
      .limit(1);

    if (!customer) {
      return res.status(404).json({ message: "Customer not found" });
    }

    // Get referral info (if customer refers others)
    const referralStats = await db
      .select({
        totalReferrals: sql<number>`COUNT(*)`,
        lifetimeCommission: sql<string>`COALESCE(SUM(${referrals.lifetimeCommissionEarned}), 0)`,
        totalRippleRewards: sql<number>`COALESCE(SUM(${referrals.totalRippleRewards}), 0)`
      })
      .from(referrals)
      .where(eq(referrals.referrerId, userId));

    // Get step up milestone rewards received
    const stepUpMilestones = await db
      .select()
      .from(stepUpRewards)
      .where(
        and(
          eq(stepUpRewards.recipientCustomerId, customer.id),
          eq(stepUpRewards.isAwarded, true)
        )
      )
      .orderBy(desc(stepUpRewards.awardedAt))
      .limit(10);

    // Get infinity reward cycles
    const infinityCycles = await db
      .select()
      .from(infinityRewardCycles)
      .where(eq(infinityRewardCycles.customerId, customer.id))
      .orderBy(desc(infinityRewardCycles.createdAt));

    // Get global numbers count
    const [globalNumberCount] = await db
      .select({ count: sql<number>`COUNT(*)` })
      .from(globalNumbers)
      .where(eq(globalNumbers.customerId, customer.id));

    res.json({
      customer: {
        id: customer.id,
        accumulatedPoints: customer.accumulatedPoints,
        totalPointsEarned: customer.totalPointsEarned,
        globalRewardNumbers: customer.globalRewardNumbers,
        globalSerialNumber: customer.globalSerialNumber,
        stepUpCompleted: customer.stepUpCompleted,
        infinityEligible: customer.infinityEligible,
        infinityCyclesCompleted: customer.infinityCyclesCompleted
      },
      globalNumbers: {
        count: globalNumberCount?.count || 0,
        latest: customer.globalSerialNumber
      },
      referralStats: {
        totalReferrals: Number(referralStats[0]?.totalReferrals || 0),
        lifetimeCommission: Number(referralStats[0]?.lifetimeCommission || 0),
        totalRippleRewards: Number(referralStats[0]?.totalRippleRewards || 0)
      },
      stepUpMilestones: stepUpMilestones,
      infinityCycles: infinityCycles
    });
  } catch (error) {
    console.error("Error fetching reward summary:", error);
    res.status(500).json({ message: "Failed to fetch reward summary" });
  }
});

/**
 * GET /api/customer/rewards/referral-info
 * Get referral link and stats for customer
 */
router.get("/customer/rewards/referral-info", async (req, res) => {
  try {
    const userId = req.query.userId as string;
    
    if (!userId) {
      return res.status(400).json({ message: "userId is required" });
    }

    // Get customer
    const [customer] = await db
      .select()
      .from(customers)
      .where(eq(customers.userId, userId))
      .limit(1);

    if (!customer) {
      return res.status(404).json({ message: "Customer not found" });
    }

    // Get referral code
    const referralCode = customer.referralCode || `REF-${customer.id.slice(0, 8).toUpperCase()}`;

    // Get list of referred customers
    const referredCustomers = await db
      .select({
        referralId: referrals.id,
        refereeId: referrals.refereeId,
        lifetimeCommission: referrals.lifetimeCommissionEarned,
        totalRippleRewards: referrals.totalRippleRewards,
        createdAt: referrals.createdAt
      })
      .from(referrals)
      .where(eq(referrals.referrerId, userId))
      .orderBy(desc(referrals.createdAt));

    // Get recent commission transactions
    const recentCommissions = await db
      .select()
      .from(commissionTransactions)
      .where(eq(commissionTransactions.referrerId, userId))
      .orderBy(desc(commissionTransactions.createdAt))
      .limit(20);

    res.json({
      referralCode: referralCode,
      referralLink: `${req.protocol}://${req.get('host')}/signup?ref=${referralCode}`,
      referredCustomers: referredCustomers,
      recentCommissions: recentCommissions,
      totalReferrals: referredCustomers.length
    });
  } catch (error) {
    console.error("Error fetching referral info:", error);
    res.status(500).json({ message: "Failed to fetch referral info" });
  }
});

export default router;
