import { storage } from '../storage';
import { calculateRoyaltyIncome } from '../merchant-wallet-routes';

export class RoyaltyDistributionService {
  /**
   * Distribute monthly royalty to all merchants
   * 1% of total sales from all merchants distributed equally
   */
  static async distributeMonthlyRoyalty(month: string, year: number): Promise<void> {
    try {
      // Check if distribution already exists for this month
      const existingDistribution = await storage.getRoyaltyDistributionByMonth(month);
      if (existingDistribution && existingDistribution.isDistributed) {
        throw new Error(`Royalty already distributed for ${month}`);
      }

      // Get all merchants
      const merchants = await storage.getMerchants();
      const totalMerchants = merchants.length;

      if (totalMerchants === 0) {
        throw new Error('No merchants found for royalty distribution');
      }

      // Calculate total sales from all merchants for the month
      let totalSales = 0;
      for (const merchant of merchants) {
        totalSales += parseFloat(merchant.totalSales);
      }

      // Calculate 1% royalty from total sales
      const totalRoyalty = calculateRoyaltyIncome(totalSales);
      const royaltyPerMerchant = totalRoyalty / totalMerchants;

      // Create royalty distribution record
      const distribution = await storage.createRoyaltyDistribution({
        month,
        year,
        totalSales: totalSales.toString(),
        totalMerchants,
        royaltyPerMerchant: royaltyPerMerchant.toString(),
        totalDistributed: totalRoyalty.toString(),
        isDistributed: false
      });

      // Distribute royalty to each merchant
      for (const merchant of merchants) {
        // Get or create merchant wallet
        let wallet = await storage.getMerchantWallet(merchant.id);
        if (!wallet) {
          wallet = await storage.createMerchantWallet({
            merchantId: merchant.id,
            rewardPointBalance: 0,
            totalPointsIssued: 0,
            incomeWalletBalance: 0,
            cashbackIncome: 0,
            referralIncome: 0,
            royaltyIncome: 0,
            commerceWalletBalance: 0,
            totalDeposited: 0,
            totalWithdrawn: 0
          });
        }

        // Update wallet with royalty income
        const newIncomeBalance = parseFloat(wallet.incomeWalletBalance) + royaltyPerMerchant;
        const newRoyaltyIncome = parseFloat(wallet.royaltyIncome) + royaltyPerMerchant;

        await storage.updateMerchantWallet(merchant.id, {
          incomeWalletBalance: newIncomeBalance.toString(),
          royaltyIncome: newRoyaltyIncome.toString()
        });

        // Create income record
        await storage.createMerchantIncome({
          merchantId: merchant.id,
          incomeType: 'royalty_1_percent',
          amount: royaltyPerMerchant.toString(),
          sourceAmount: totalSales.toString(),
          description: `Monthly royalty distribution for ${month} (1% of total sales)`,
          referenceId: distribution.id
        });

        // Create transaction record
        await storage.createWalletTransaction({
          merchantId: merchant.id,
          walletType: 'income',
          transactionType: 'income',
          amount: royaltyPerMerchant.toString(),
          description: `Monthly royalty distribution for ${month}`,
          balanceAfter: newIncomeBalance.toString()
        });
      }

      // Mark distribution as completed
      await storage.updateMerchantWallet(distribution.id, {
        isDistributed: true,
        distributedAt: new Date()
      });

      console.log(`Monthly royalty distribution completed for ${month}:`);
      console.log(`- Total sales: ${totalSales}`);
      console.log(`- Total merchants: ${totalMerchants}`);
      console.log(`- Royalty per merchant: ${royaltyPerMerchant}`);
      console.log(`- Total distributed: ${totalRoyalty}`);

    } catch (error) {
      console.error('Error in monthly royalty distribution:', error);
      throw error;
    }
  }

  /**
   * Get royalty distribution statistics
   */
  static async getRoyaltyStats(): Promise<{
    totalDistributions: number;
    totalDistributed: number;
    averagePerMerchant: number;
    lastDistribution: any;
  }> {
    try {
      const distributions = await storage.getRoyaltyDistributions();
      const distributed = distributions.filter(d => d.isDistributed);
      
      const totalDistributed = distributed.reduce((sum, d) => sum + parseFloat(d.totalDistributed), 0);
      const averagePerMerchant = distributed.length > 0 ? totalDistributed / distributed.length : 0;
      const lastDistribution = distributed.length > 0 ? distributed[0] : null;

      return {
        totalDistributions: distributed.length,
        totalDistributed,
        averagePerMerchant,
        lastDistribution
      };
    } catch (error) {
      console.error('Error getting royalty stats:', error);
      throw error;
    }
  }

  /**
   * Schedule monthly royalty distribution (to be called by cron job)
   */
  static async scheduleMonthlyDistribution(): Promise<void> {
    const now = new Date();
    const month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const year = now.getFullYear();

    try {
      await this.distributeMonthlyRoyalty(month, year);
    } catch (error) {
      console.error(`Failed to distribute royalty for ${month}:`, error);
    }
  }
}
