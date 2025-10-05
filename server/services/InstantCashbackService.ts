import type { IStorage } from '../storage';

export interface InstantCashbackTransaction {
  id: string;
  merchantId: string;
  customerId: string;
  pointsTransferred: number;
  cashbackAmount: number;
  cashbackPercentage: number;
  transferTransactionId: string;
  description: string;
  createdAt: Date;
}

export class InstantCashbackService {
  private storage: IStorage;
  private cashbackRate = 0.10; // 10% instant cashback

  constructor(storage: IStorage) {
    this.storage = storage;
  }

  /**
   * Process instant cashback when merchant transfers points to customer
   */
  async processInstantCashback(
    merchantId: string,
    customerId: string,
    pointsTransferred: number,
    transferTransactionId: string
  ): Promise<{
    success: boolean;
    cashbackAmount: number;
    transaction?: InstantCashbackTransaction;
    error?: string;
  }> {
    try {
      // Validate minimum transfer (1 point minimum)
      if (pointsTransferred < 1) {
        return {
          success: false,
          cashbackAmount: 0,
          error: 'Minimum 1 point required for cashback'
        };
      }

      // Calculate 10% cashback
      const cashbackAmount = Math.round(pointsTransferred * this.cashbackRate);

      // Get current merchant wallet, create if it doesn't exist
      let wallet = await this.storage.getMerchantWallet(merchantId);
      if (!wallet) {
        console.log(`🔧 Creating merchant wallet for merchant ${merchantId}`);
        wallet = await this.storage.createMerchantWallet({
          merchantId,
          rewardPointBalance: 0,
          totalPointsIssued: 0,
          incomeWalletBalance: "0.00",
          cashbackIncome: "0.00",
          referralIncome: "0.00",
          royaltyIncome: "0.00",
          commerceWalletBalance: "0.00",
          totalDeposited: "0.00",
          totalWithdrawn: "0.00"
        });
        console.log(`✅ Merchant wallet created successfully`);
      }

      // Update merchant wallet with cashback
      const newCashbackIncome = parseFloat(wallet.cashbackIncome) + cashbackAmount;
      const newIncomeBalance = parseFloat(wallet.incomeWalletBalance) + cashbackAmount;

      await this.storage.updateMerchantWallet(merchantId, {
        cashbackIncome: newCashbackIncome.toString(),
        incomeWalletBalance: newIncomeBalance.toString()
      });

      // Create cashback transaction record
      const transaction: InstantCashbackTransaction = {
        id: crypto.randomUUID(),
        merchantId,
        customerId,
        pointsTransferred,
        cashbackAmount,
        cashbackPercentage: this.cashbackRate * 100,
        transferTransactionId,
        description: `10% instant cashback on ${pointsTransferred} points transfer`,
        createdAt: new Date()
      };

      // Store transaction in merchant income
      await this.storage.createMerchantIncome({
        merchantId,
        incomeType: 'cashback_15_percent', // Reusing existing enum
        amount: cashbackAmount.toString(),
        sourceAmount: pointsTransferred.toString(),
        description: transaction.description,
        referenceId: transferTransactionId
      });

      // Create wallet transaction record
      await this.storage.createWalletTransaction({
        merchantId,
        walletType: 'income',
        transactionType: 'income',
        amount: cashbackAmount.toString(),
        description: transaction.description,
        referenceId: transferTransactionId,
        balanceAfter: newIncomeBalance.toString()
      });

      console.log(`💰 Instant Cashback: ${cashbackAmount} points awarded to merchant ${merchantId}`);

      return {
        success: true,
        cashbackAmount,
        transaction
      };

    } catch (error: any) {
      console.error('Error processing instant cashback:', error);
      return {
        success: false,
        cashbackAmount: 0,
        error: error.message
      };
    }
  }

  /**
   * Get merchant's cashback history
   */
  async getMerchantCashbackHistory(merchantId: string, limit: number = 50): Promise<{
    transactions: any[];
    totalCashback: number;
    totalTransfers: number;
  }> {
    try {
      // Get cashback income records
      const incomes = await this.storage.getMerchantIncome(merchantId);
      const cashbackIncomes = incomes
        .filter(income => income.incomeType === 'cashback_15_percent')
        .slice(0, limit)
        .map(income => ({
          id: income.id,
          pointsTransferred: parseInt(income.sourceAmount || '0'),
          cashbackAmount: parseFloat(income.amount),
          description: income.description,
          createdAt: income.createdAt,
          referenceId: income.referenceId
        }));

      // Calculate totals
      const totalCashback = cashbackIncomes.reduce((sum, tx) => sum + tx.cashbackAmount, 0);
      const totalTransfers = cashbackIncomes.length;

      return {
        transactions: cashbackIncomes,
        totalCashback,
        totalTransfers
      };

    } catch (error: any) {
      console.error('Error getting cashback history:', error);
      return {
        transactions: [],
        totalCashback: 0,
        totalTransfers: 0
      };
    }
  }

  /**
   * Get merchant's current cashback summary
   */
  async getMerchantCashbackSummary(merchantId: string): Promise<{
    totalCashback: number;
    todayCashback: number;
    thisMonthCashback: number;
    totalTransfers: number;
    affiliateCashback: number;
  }> {
    try {
      const wallet = await this.storage.getMerchantWallet(merchantId);
      const history = await this.getMerchantCashbackHistory(merchantId, 1000);

      const today = new Date();
      const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
      const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);

      console.log(`📊 Cashback Summary Debug for merchant ${merchantId}:`);
      console.log(`   - Total transactions: ${history.transactions.length}`);
      console.log(`   - Today start: ${startOfDay.toISOString()}`);
      console.log(`   - Month start: ${startOfMonth.toISOString()}`);
      console.log(`   - Current time: ${today.toISOString()}`);

      const todayCashback = history.transactions
        .filter(tx => {
          const txDate = new Date(tx.createdAt);
          return txDate >= startOfDay && txDate < new Date(startOfDay.getTime() + 24 * 60 * 60 * 1000);
        })
        .reduce((sum, tx) => sum + tx.cashbackAmount, 0);

      const thisMonthCashback = history.transactions
        .filter(tx => {
          const txDate = new Date(tx.createdAt);
          return txDate >= startOfMonth && txDate < new Date(today.getFullYear(), today.getMonth() + 1, 1);
        })
        .reduce((sum, tx) => sum + tx.cashbackAmount, 0);

      console.log(`   - Today's cashback: ${todayCashback}`);
      console.log(`   - This month's cashback: ${thisMonthCashback}`);
      console.log(`   - Total cashback from wallet: ${parseFloat(wallet?.cashbackIncome || '0')}`);

      // Get merchant data to access affiliate cashback
      const merchant = await this.storage.getMerchant(merchantId);
      const affiliateCashback = parseFloat(merchant?.affiliateCashback?.toString() || '0');
      const instantCashback = parseFloat(wallet?.cashbackIncome || '0');
      const totalCashback = instantCashback + affiliateCashback;
      
      console.log(`   - Instant cashback: ${instantCashback}`);
      console.log(`   - Affiliate cashback: ${affiliateCashback}`);
      console.log(`   - Total cashback: ${totalCashback}`);

      return {
        totalCashback,
        todayCashback,
        thisMonthCashback,
        totalTransfers: history.totalTransfers,
        affiliateCashback
      };

    } catch (error: any) {
      console.error('Error getting cashback summary:', error);
      return {
        totalCashback: 0,
        todayCashback: 0,
        thisMonthCashback: 0,
        totalTransfers: 0,
        affiliateCashback: 0
      };
    }
  }
}

export const instantCashbackService = new InstantCashbackService(null as any);