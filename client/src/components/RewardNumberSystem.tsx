import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Crown, Target, TrendingUp, Sparkles, Gift, Coins } from "lucide-react";

interface CustomerProfile {
  id: string;
  globalSerialNumber: number;
  accumulatedPoints: number;
  currentPointsBalance: number;
  totalPointsEarned: number;
  globalRewardNumbers: number;
}

interface StepUpReward {
  id: string;
  recipientGlobalNumber: number;
  rewardPoints: number;
  description: string;
  awardedAt: string;
}

export default function RewardNumberSystem({ currentUser }: { currentUser: any }) {
  // Get customer profile
  const { data: customerProfile, isLoading: profileLoading } = useQuery({
    queryKey: ['/api/customer/profile', currentUser?.id],
    enabled: !!currentUser,
    refetchOnWindowFocus: true,
    select: (data: any): CustomerProfile => data || {
      id: '',
      globalSerialNumber: 0,
      accumulatedPoints: 0,
      currentPointsBalance: 0,
      totalPointsEarned: 0,
      globalRewardNumbers: 0
    }
  });

  // Get Global Number configuration
  const { data: globalNumberConfig } = useQuery({
    queryKey: ['/api/customer/global-number-config'],
    enabled: !!currentUser,
    select: (data: any) => data || { pointsThreshold: 1500 }
  });

  // Get customer's Global Numbers
  const { data: globalNumbers = [] } = useQuery({
    queryKey: ['/api/customer/global-numbers'],
    enabled: !!currentUser,
    select: (data: any) => data?.globalNumbers || []
  });

  // Get StepUp rewards received by this customer
  const { data: receivedStepUpRewards = [] } = useQuery({
    queryKey: ['/api/customer/stepup-rewards'],
    enabled: !!currentUser,
    select: (data: any) => Array.isArray(data) ? data : [],
    refetchOnWindowFocus: true,
    staleTime: 0 // Always fetch fresh data
  });

  // Get comprehensive transaction history for StepUp reward calculation
  const { data: transactions = [] } = useQuery({
    queryKey: ['/api/customer/transactions'],
    enabled: !!currentUser,
    select: (data: any) => Array.isArray(data) ? data : []
  });

  // Get wallet transactions
  const { data: walletTransactions = [] } = useQuery({
    queryKey: ['/api/customer/wallet/transactions'],
    enabled: !!currentUser,
    select: (data: any) => Array.isArray(data) ? data : []
  });

  const pointsThreshold = globalNumberConfig?.pointsThreshold || 1500;
  // Use currentPointsBalance for progress bar since that's where loyalty points are stored
  const currentPoints = customerProfile?.currentPointsBalance || 0;
  const progressPercentage = Math.min(currentPoints / pointsThreshold * 100, 100);
  const pointsNeeded = Math.max(0, pointsThreshold - currentPoints);

  // NEW: StepUp Reward Balance Calculation (same as dashboard)
  const stepUpRewardBalance = (() => {
    // Calculate total StepUp rewards from transactions
    const stepUpTransactions = Array.isArray(transactions) 
      ? transactions.filter((t: any) => 
          t.transactionType === 'reward' && 
          t.description && 
          t.description.includes('StepUp Reward')
        )
      : [];
    
    const totalStepUpRewards = stepUpTransactions.reduce((sum: number, t: any) => sum + (t.points || 0), 0);
    return Number.isFinite(totalStepUpRewards) ? totalStepUpRewards : 0;
  })();


  if (profileLoading) {
    return (
      <div className="space-y-4">
        <div className="animate-pulse">
          <div className="h-32 bg-gray-200 rounded-lg mb-4"></div>
          <div className="h-24 bg-gray-200 rounded-lg"></div>
        </div>
      </div>
    );
  }

  // Use actual received StepUp rewards from API
  const stepUpRewards = receivedStepUpRewards || [];

  return (
    <div className="space-y-6" data-testid="stepup-rewards-container">

      {/* NEW: Income Wallet Box - Rebuilt with Dashboard Logic */}
      <Card className="bg-gradient-to-br from-green-50 to-emerald-50 border-2 border-green-200">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center text-green-800">
            <Coins className="w-5 h-5 mr-2 text-green-600" />
            Income Wallet
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Income Balance */}
            <div className="text-center p-4 bg-white rounded-lg border border-green-100">
              <div className="text-3xl font-bold text-green-600 mb-1">
                {stepUpRewardBalance.toLocaleString()} BDT
              </div>
              <div className="text-sm text-green-700">Current Balance</div>
            </div>

            {/* Income Statistics */}
            <div className="grid grid-cols-2 gap-3">
              <div className="text-center p-3 bg-white rounded-lg border border-green-100">
                <div className="text-lg font-bold text-green-600">
                  {stepUpRewardBalance.toLocaleString()}
                </div>
                <div className="text-xs text-green-700">Total Earned</div>
              </div>
              <div className="text-center p-3 bg-white rounded-lg border border-green-100">
                <div className="text-lg font-bold text-orange-600">
                  0
                </div>
                <div className="text-xs text-orange-700">Total Spent</div>
              </div>
            </div>

            {/* Income Sources */}
            <div className="bg-white p-3 rounded-lg border border-green-100">
              <div className="text-sm font-semibold text-green-800 mb-2">💰 Income Sources:</div>
              <div className="space-y-1 text-xs text-gray-600">
                <div>• StepUp Rewards (500, 1,500, 3,000, 30,000, 160,000 points)</div>
                <div>• Infinity Rewards (30,000+ points)</div>
                <div>• Affiliate Commissions</div>
                <div>• Ripple Rewards</div>
                <div>• Shopping Vouchers</div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* StepUp Rewards Box */}
      <Card className="bg-gradient-to-br from-purple-50 to-pink-50 border-2 border-purple-200">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center text-purple-800">
            <Crown className="w-6 h-6 mr-2 text-purple-600" />
            StepUp Rewards System
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {/* StepUp Rewards Status */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="text-center p-4 bg-white rounded-lg border border-purple-100">
                <div className="text-2xl font-bold text-purple-800 mb-1">
                  {globalNumbers.length || 0}
                </div>
                <div className="text-sm text-purple-600">Total Global Numbers</div>
              </div>
              
              <div className="text-center p-4 bg-white rounded-lg border border-purple-100">
                <div className="text-2xl font-bold text-green-600 mb-1">
                  {(receivedStepUpRewards?.reduce((total, reward) => total + (reward.rewardPoints || 0), 0) || 0).toLocaleString()}
                </div>
                <div className="text-sm text-purple-600">StepUp Rewards Earned</div>
              </div>
            </div>

            {/* Received StepUp Rewards */}
            {receivedStepUpRewards.length > 0 ? (
              <div className="space-y-4">
                <div className="text-lg font-semibold text-purple-800 mb-3">
                  🎁 StepUp Rewards Received
                </div>
                
                <div className="space-y-3">
                  {receivedStepUpRewards.map((reward: StepUpReward) => (
                    <div key={reward.id} className="p-4 bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg border border-green-200 shadow-sm">
                      <div className="flex justify-between items-center mb-2">
                        <div className="flex items-center space-x-3">
                          <Sparkles className="w-5 h-5 text-green-600" />
                          <Badge className="bg-green-100 text-green-800">
                            Global #{reward.recipientGlobalNumber}
                          </Badge>
                          <span className="text-sm font-medium text-gray-700">
                            StepUp Reward
                          </span>
                        </div>
                        <div className="text-right">
                          <div className="text-lg font-bold text-green-600">
                            +{(reward.rewardPoints || 0).toLocaleString()} points
                          </div>
                          <div className="text-xs text-gray-500">
                            {new Date(reward.awardedAt).toLocaleDateString()}
                          </div>
                        </div>
                      </div>
                      
                      <div className="text-sm text-gray-600">
                        {reward.description}
                      </div>
                    </div>
                  ))}
                </div>
                
                <div className="bg-gradient-to-r from-green-50 to-emerald-50 p-4 rounded-lg border border-green-200">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-600 mb-1">
                      {(receivedStepUpRewards?.reduce((total, reward) => total + (reward.rewardPoints || 0), 0) || 0).toLocaleString()}
                    </div>
                    <div className="text-sm text-green-700">Total StepUp Rewards Earned</div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-8">
                <Crown className="w-16 h-16 mx-auto mb-4 text-purple-300" />
                <div className="text-lg font-semibold text-purple-800 mb-2">
                  No StepUp Rewards Received Yet
                </div>
                <div className="text-sm text-purple-600 mb-4">
                  You'll receive StepUp Rewards when other customers achieve milestone Global Numbers!
                </div>
                
                {globalNumbers.length > 0 ? (
                  <div className="bg-white p-4 rounded-lg border border-purple-100">
                    <div className="text-sm font-semibold text-purple-800 mb-3">
                      🎯 Your Global Numbers: {globalNumbers.map(gn => `#${gn.number || gn.globalNumber || gn}`).join(', ')}
                    </div>
                    <div className="text-xs text-gray-600">
                      You'll receive rewards when milestone Global Numbers are reached by others!
                    </div>
                  </div>
                ) : (
                  <div className="bg-white p-4 rounded-lg border border-purple-100">
                    <div className="text-sm font-semibold text-purple-800 mb-3">
                      🎁 How to Get StepUp Rewards:
                    </div>
                    <div className="space-y-2 text-xs text-gray-600">
                      <div>1. Earn 1,500 points to get your first Global Number</div>
                      <div>2. Receive rewards when others achieve milestone Global Numbers</div>
                      <div>3. Formula: Your Global Number × [5, 25, 125, 500, 2500]</div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* StepUp Formula Explanation */}
            <div className="bg-gradient-to-r from-yellow-50 to-orange-50 p-4 rounded-lg border border-yellow-200">
              <div className="text-sm text-yellow-800">
                <div className="font-semibold mb-2">🧮 StepUp Rewards Formula:</div>
                <div className="space-y-1 text-xs">
                  <div>• <strong>Milestone Factors:</strong> 5, 25, 125, 500, 2500</div>
                  <div>• <strong>Reward Points:</strong> 500, 1,500, 3,000, 30,000, 160,000</div>
                  <div>• <strong>Formula:</strong> Your Global Number × Milestone Factor = Trigger Global Number</div>
                  <div>• <strong>Example:</strong> If you have Global #2, you get 1,500 points when Global #50 is reached (2×25=50)</div>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>




      {/* Transaction History */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center">
            <Gift className="w-5 h-5 mr-2 text-blue-600" />
            Transaction History
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* StepUp Rewards Transactions */}
            {stepUpRewards.length > 0 && (
              <div className="space-y-3">
                <div className="text-sm font-semibold text-purple-800 mb-2">🎁 StepUp Rewards</div>
                {stepUpRewards.slice(0, 5).map((reward: any) => (
                  <div key={reward.id} className="flex items-center justify-between p-3 bg-purple-50 rounded-lg border border-purple-200">
                    <div className="flex items-center space-x-3">
                      <Sparkles className="w-4 h-4 text-purple-600" />
                      <div>
                        <div className="text-sm font-medium text-purple-800">
                          StepUp Reward - Global #{reward.recipientGlobalNumber}
                        </div>
                        <div className="text-xs text-purple-600">
                          {new Date(reward.awardedAt).toLocaleDateString()}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-bold text-green-600">
                        +{(reward.rewardPoints || 0).toLocaleString()} points
                      </div>
                      <div className="text-xs text-gray-500">StepUp</div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Point Transactions */}
            {transactions.length > 0 && (
              <div className="space-y-3">
                <div className="text-sm font-semibold text-blue-800 mb-2">💳 Point Transactions</div>
                {transactions.slice(0, 5).map((transaction: any) => (
                  <div key={transaction.id} className="flex items-center justify-between p-3 bg-blue-50 rounded-lg border border-blue-200">
                    <div className="flex items-center space-x-3">
                      <Target className="w-4 h-4 text-blue-600" />
                      <div>
                        <div className="text-sm font-medium text-blue-800">
                          {transaction.description || 'Point Transaction'}
                        </div>
                        <div className="text-xs text-blue-600">
                          {new Date(transaction.createdAt).toLocaleDateString()}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className={`text-sm font-bold ${transaction.points > 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {transaction.points > 0 ? '+' : ''}{(transaction.points || 0).toLocaleString()} points
                      </div>
                      <div className="text-xs text-gray-500">
                        {transaction.transactionType || 'Transaction'}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Wallet Transactions */}
            {walletTransactions.length > 0 && (
              <div className="space-y-3">
                <div className="text-sm font-semibold text-green-800 mb-2">💰 Wallet Transactions</div>
                {walletTransactions.slice(0, 5).map((transaction: any) => (
                  <div key={transaction.id} className="flex items-center justify-between p-3 bg-green-50 rounded-lg border border-green-200">
                    <div className="flex items-center space-x-3">
                      <Coins className="w-4 h-4 text-green-600" />
                      <div>
                        <div className="text-sm font-medium text-green-800">
                          {transaction.description || 'Wallet Transaction'}
                        </div>
                        <div className="text-xs text-green-600">
                          {new Date(transaction.createdAt).toLocaleDateString()}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className={`text-sm font-bold ${transaction.amount > 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {transaction.amount > 0 ? '+' : ''}{parseFloat(transaction.amount || 0).toLocaleString()} BDT
                      </div>
                      <div className="text-xs text-gray-500">
                        {transaction.walletType || 'Wallet'}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* No Transactions */}
            {stepUpRewards.length === 0 && transactions.length === 0 && walletTransactions.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                <Gift className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                <p>No transactions yet</p>
                <p className="text-sm mt-1">Your transaction history will appear here</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

    </div>
  );
}