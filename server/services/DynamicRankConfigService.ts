import type { IStorage } from "../storage";
import type { InsertMerchantRankCondition, MerchantRankCondition } from "../../shared/schema.js";

/**
 * DynamicRankConfigService
 * 
 * Allows global admin to dynamically configure merchant rank conditions
 * Admin can create, update, and manage rank requirements
 * Changes can trigger re-evaluation of all merchants
 */
export class DynamicRankConfigService {
  private storage: IStorage;
  private VALID_RANKS = ["bronze", "silver", "gold", "platinum", "diamond"];

  constructor(storage: IStorage) {
    this.storage = storage;
  }

  /**
   * Create or update a rank condition
   */
  async saveRankCondition(
    rankData: {
      rank: string;
      displayName: string;
      minPointsDistributed: number;
      minTotalSales: number;
      minReferrals?: number;
      minMonthsActive?: number;
      globalSalesBonusPercent: number;
      description?: string;
      benefits?: string[];
    },
    adminId: string
  ): Promise<{ success: boolean; rankConditionId?: string; error?: string }> {
    try {
      // Validate rank
      if (!this.VALID_RANKS.includes(rankData.rank)) {
        return {
          success: false,
          error: `Invalid rank. Must be one of: ${this.VALID_RANKS.join(", ")}`,
        };
      }

      // Validate requirements
      if (rankData.minPointsDistributed < 0) {
        return { success: false, error: "Minimum points distributed cannot be negative" };
      }

      if (rankData.minTotalSales < 0) {
        return { success: false, error: "Minimum total sales cannot be negative" };
      }

      if (rankData.globalSalesBonusPercent < 0 || rankData.globalSalesBonusPercent > 100) {
        return { success: false, error: "Global sales bonus percent must be between 0 and 100" };
      }

      // Check if rank condition already exists
      const existing = await this.storage.getRankConditionByRank(rankData.rank);

      if (existing) {
        // Update existing condition
        await this.storage.updateRankCondition(existing.id, {
          displayName: rankData.displayName,
          minPointsDistributed: rankData.minPointsDistributed,
          minTotalSales: rankData.minTotalSales.toString(),
          minReferrals: rankData.minReferrals || 0,
          minMonthsActive: rankData.minMonthsActive || 0,
          globalSalesBonusPercent: rankData.globalSalesBonusPercent.toString(),
          description: rankData.description,
          benefits: rankData.benefits,
          updatedBy: adminId,
        });

        return {
          success: true,
          rankConditionId: existing.id,
        };
      } else {
        // Create new condition
        const newCondition: InsertMerchantRankCondition = {
          rank: rankData.rank,
          displayName: rankData.displayName,
          minPointsDistributed: rankData.minPointsDistributed,
          minTotalSales: rankData.minTotalSales.toString(),
          minReferrals: rankData.minReferrals || 0,
          minMonthsActive: rankData.minMonthsActive || 0,
          globalSalesBonusPercent: rankData.globalSalesBonusPercent.toString(),
          description: rankData.description,
          benefits: rankData.benefits,
          updatedBy: adminId,
        };

        const created = await this.storage.createRankCondition(newCondition);

        return {
          success: true,
          rankConditionId: created.id,
        };
      }
    } catch (error) {
      console.error("Error saving rank condition:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error occurred",
      };
    }
  }

  /**
   * Get all rank conditions
   */
  async getAllRankConditions(): Promise<MerchantRankCondition[]> {
    try {
      return await this.storage.getAllRankConditions();
    } catch (error) {
      console.error("Error getting rank conditions:", error);
      return [];
    }
  }

  /**
   * Get active rank conditions
   */
  async getActiveRankConditions(): Promise<MerchantRankCondition[]> {
    try {
      return await this.storage.getActiveRankConditions();
    } catch (error) {
      console.error("Error getting active rank conditions:", error);
      return [];
    }
  }

  /**
   * Get specific rank condition
   */
  async getRankCondition(rank: string): Promise<MerchantRankCondition | null> {
    try {
      return await this.storage.getRankConditionByRank(rank);
    } catch (error) {
      console.error("Error getting rank condition:", error);
      return null;
    }
  }

  /**
   * Activate or deactivate a rank
   */
  async toggleRankActive(
    rank: string,
    isActive: boolean,
    adminId: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const condition = await this.storage.getRankConditionByRank(rank);

      if (!condition) {
        return { success: false, error: "Rank condition not found" };
      }

      await this.storage.updateRankCondition(condition.id, {
        isActive,
        updatedBy: adminId,
      });

      return { success: true };
    } catch (error) {
      console.error("Error toggling rank active status:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error occurred",
      };
    }
  }

  /**
   * Delete a rank condition
   */
  async deleteRankCondition(
    rank: string,
    adminId: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const condition = await this.storage.getRankConditionByRank(rank);

      if (!condition) {
        return { success: false, error: "Rank condition not found" };
      }

      // Check if any merchants currently have this rank
      const merchantsWithRank = await this.storage.getMerchantsByRank(rank);

      if (merchantsWithRank && merchantsWithRank.length > 0) {
        return {
          success: false,
          error: `Cannot delete rank: ${merchantsWithRank.length} merchant(s) currently have this rank`,
        };
      }

      await this.storage.deleteRankCondition(condition.id);

      return { success: true };
    } catch (error) {
      console.error("Error deleting rank condition:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error occurred",
      };
    }
  }

  /**
   * Initialize default rank conditions if none exist
   */
  async initializeDefaultRanks(adminId: string): Promise<{ success: boolean; error?: string }> {
    try {
      const existing = await this.storage.getAllRankConditions();

      if (existing && existing.length > 0) {
        return { success: false, error: "Rank conditions already exist" };
      }

      const defaultRanks = [
        {
          rank: "bronze",
          displayName: "Bronze Merchant",
          minPointsDistributed: 10000,
          minTotalSales: 50000,
          minReferrals: 0,
          minMonthsActive: 1,
          globalSalesBonusPercent: 0.05,
          description: "Entry level rank for active merchants",
          benefits: ["5% global sales bonus", "Basic analytics dashboard"],
        },
        {
          rank: "silver",
          displayName: "Silver Merchant",
          minPointsDistributed: 50000,
          minTotalSales: 250000,
          minReferrals: 2,
          minMonthsActive: 3,
          globalSalesBonusPercent: 0.10,
          description: "Intermediate rank for growing merchants",
          benefits: ["10% global sales bonus", "Priority support", "Advanced analytics"],
        },
        {
          rank: "gold",
          displayName: "Gold Merchant",
          minPointsDistributed: 150000,
          minTotalSales: 750000,
          minReferrals: 5,
          minMonthsActive: 6,
          globalSalesBonusPercent: 0.20,
          description: "Advanced rank for successful merchants",
          benefits: ["20% global sales bonus", "Dedicated account manager", "Marketing support"],
        },
        {
          rank: "platinum",
          displayName: "Platinum Merchant",
          minPointsDistributed: 500000,
          minTotalSales: 2500000,
          minReferrals: 10,
          minMonthsActive: 12,
          globalSalesBonusPercent: 0.35,
          description: "Elite rank for top-performing merchants",
          benefits: ["35% global sales bonus", "Premium features access", "Custom solutions"],
        },
        {
          rank: "diamond",
          displayName: "Diamond Merchant",
          minPointsDistributed: 1500000,
          minTotalSales: 10000000,
          minReferrals: 25,
          minMonthsActive: 24,
          globalSalesBonusPercent: 0.50,
          description: "Highest rank for exceptional merchants",
          benefits: ["50% global sales bonus", "VIP treatment", "Exclusive events", "Revenue sharing opportunities"],
        },
      ];

      for (const rankData of defaultRanks) {
        await this.saveRankCondition(rankData, adminId);
      }

      return { success: true };
    } catch (error) {
      console.error("Error initializing default ranks:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error occurred",
      };
    }
  }

  /**
   * Validate rank hierarchy (ensure requirements increase with rank level)
   */
  async validateRankHierarchy(): Promise<{
    valid: boolean;
    errors: string[];
  }> {
    try {
      const ranks = await this.storage.getActiveRankConditions();

      if (!ranks || ranks.length === 0) {
        return { valid: true, errors: [] };
      }

      const errors: string[] = [];
      const rankOrder = ["bronze", "silver", "gold", "platinum", "diamond"];

      // Sort ranks by order
      const sortedRanks = ranks
        .filter(r => rankOrder.includes(r.rank))
        .sort((a, b) => rankOrder.indexOf(a.rank) - rankOrder.indexOf(b.rank));

      // Validate that requirements increase
      for (let i = 1; i < sortedRanks.length; i++) {
        const prev = sortedRanks[i - 1];
        const current = sortedRanks[i];

        if (current.minPointsDistributed <= prev.minPointsDistributed) {
          errors.push(
            `${current.rank} points requirement (${current.minPointsDistributed}) should be greater than ${prev.rank} (${prev.minPointsDistributed})`
          );
        }

        const prevSales = parseFloat(prev.minTotalSales || "0");
        const currentSales = parseFloat(current.minTotalSales || "0");

        if (currentSales <= prevSales) {
          errors.push(
            `${current.rank} sales requirement (${currentSales}) should be greater than ${prev.rank} (${prevSales})`
          );
        }

        const prevBonus = parseFloat(prev.globalSalesBonusPercent || "0");
        const currentBonus = parseFloat(current.globalSalesBonusPercent || "0");

        if (currentBonus <= prevBonus) {
          errors.push(
            `${current.rank} bonus (${currentBonus}%) should be greater than ${prev.rank} (${prevBonus}%)`
          );
        }
      }

      return {
        valid: errors.length === 0,
        errors,
      };
    } catch (error) {
      console.error("Error validating rank hierarchy:", error);
      return {
        valid: false,
        errors: [error instanceof Error ? error.message : "Unknown error occurred"],
      };
    }
  }

  /**
   * Get statistics about rank distribution
   */
  async getRankDistributionStats(): Promise<{
    [rank: string]: {
      count: number;
      percentage: number;
      totalBonus: number;
    };
  }> {
    try {
      const allMerchants = await this.storage.getAllActiveMerchants();
      const total = allMerchants.length;

      const distribution: { [rank: string]: { count: number; percentage: number; totalBonus: number } } = {};

      for (const rank of this.VALID_RANKS) {
        const merchantsWithRank = await this.storage.getMerchantsByRank(rank);
        const count = merchantsWithRank?.length || 0;
        const totalBonus = merchantsWithRank?.reduce(
          (sum, m) => sum + parseFloat(m.totalRankBonus || "0"),
          0
        ) || 0;

        distribution[rank] = {
          count,
          percentage: total > 0 ? (count / total) * 100 : 0,
          totalBonus,
        };
      }

      // Add "none" rank for merchants without rank
      const noRankMerchants = allMerchants.filter(m => !m.currentRank || m.currentRank === "none");
      distribution["none"] = {
        count: noRankMerchants.length,
        percentage: total > 0 ? (noRankMerchants.length / total) * 100 : 0,
        totalBonus: 0,
      };

      return distribution;
    } catch (error) {
      console.error("Error getting rank distribution stats:", error);
      return {};
    }
  }
}
