import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { 
  Trophy, Gift, Coins, Target, TrendingUp, 
  ArrowRight, Crown, Activity, CheckCircle, Infinity,
  ShoppingBag, Users, Zap, DollarSign, Sparkles
} from "lucide-react";

interface CustomerProfile {
  id: string;
  userId: string;
  currentPointsBalance: number;
  accumulatedPoints: number;
  globalSerialNumber: number | null;
  totalPointsEarned: number;
  globalRewardNumbers: number;
}

interface StepUpReward {
  id: string;
  customerId: string;
  customerGlobalNumber: number;
  multiplier: number;
  rewardPoints: number;
  triggerGlobalNumber: number;
  awardedAt: string;
}

export default function GlobalRewardDashboard({ currentUser }: { currentUser: any }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Get customer profile with StepUp data
  const { data: customerData, isLoading: dataLoading } = useQuery({
    queryKey: ['/api/customer/profile', currentUser?.id],
    enabled: !!currentUser,
    refetchOnWindowFocus: true,
    select: (data: any) => data || {
      accumulatedPoints: 0,
      currentPointsBalance: 0,
      globalSerialNumber: null,
      totalPointsEarned: 0,
      globalRewardNumbers: 0
    }
  });

  // Get StepUp rewards earned by this customer
  const { data: stepUpRewards, isLoading: rewardsLoading } = useQuery({
    queryKey: ['/api/customer/stepup-rewards', currentUser?.id],
    enabled: !!currentUser,
    select: (data: StepUpReward[]) => data || []
  });

  // Get Shopping Vouchers
  const { data: shoppingVouchers = [], isLoading: vouchersLoading } = useQuery({
    queryKey: ['/api/customer/shopping-vouchers'],
    enabled: !!currentUser
  });

  // Get Reward Summary (includes Infinity, Affiliate, Ripple)
  const { data: rewardSummary, isLoading: summaryLoading } = useQuery({
    queryKey: ['/api/customer/reward-summary'],
    enabled: !!currentUser
  });

  // Add points mutation for testing
  const addPointsMutation = useMutation({
    mutationFn: async (points: number) => {
      const response = await fetch('/api/customer/add-points', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('customerToken')}`
        },
        body: JSON.stringify({ points })
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to add points');
      }
      
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Points Added!",
        description: `Added ${data.pointsAdded} points. ${data.globalNumberAssigned ? `Global Number #${data.globalNumber} assigned!` : ''}`,
      });
      queryClient.invalidateQueries({ queryKey: ['/api/customer/profile'] });
      queryClient.invalidateQueries({ queryKey: ['/api/customer/stepup-rewards'] });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to add points",
        description: error.message,
        variant: "destructive"
      });
    }
  });

  if (!currentUser) {
    return (
      <div className="text-center py-8 text-gray-500" data-testid="login-required">
        Please log in to view your StepUp Reward dashboard
      </div>
    );
  }

  if (dataLoading || rewardsLoading || vouchersLoading || summaryLoading) {
    return (
      <div className="text-center py-8" data-testid="loading-dashboard">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
        <p className="text-gray-500 mt-2">Loading Customer Reward System...</p>
      </div>
    );
  }

  // Use currentPointsBalance for progress bar since that's where loyalty points are stored
  const pointsToNextGlobal = 1500 - (customerData.pointsBalance || 0);
  const progressPercentage = ((customerData.pointsBalance || 0) / 1500) * 100;


  return (
    <div className="space-y-6 bg-gray-50 dark:bg-gray-900 min-h-screen p-6">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm border border-gray-200 dark:border-gray-700">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2" data-testid="page-title">
          StepUp Reward System
        </h1>
        <p className="text-gray-600 dark:text-gray-400" data-testid="page-description">
          Earn points, reach 1500 to get sequential global numbers, and receive formula-based milestone rewards
        </p>
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Left Column - Point Accumulation */}
        <div className="space-y-6">
          
          {/* Point Accumulation Card */}
          <Card className="bg-white dark:bg-gray-800 shadow-sm border border-gray-200 dark:border-gray-700">
            <CardHeader className="border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center">
                  <Target className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <CardTitle className="text-lg text-gray-900 dark:text-gray-100">Points to Global Number</CardTitle>
                  <CardDescription className="text-gray-600 dark:text-gray-400">
                    Collect 1500 points to get your next sequential global number
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-6">
              
              {/* Current Points Display */}
              <div className="text-center mb-6">
                <div className="text-6xl font-bold text-blue-600 dark:text-blue-400 mb-2" data-testid="accumulated-points">
                  {customerData.pointsBalance || 0}
                </div>
                <div className="text-lg text-gray-600 dark:text-gray-400 mb-4">Loyalty Points</div>
                
                {/* Progress Bar */}
                <div className="max-w-md mx-auto">
                  <Progress 
                    value={progressPercentage} 
                    className="h-4 mb-2"
                    data-testid="progress-bar"
                  />
                  <div className="text-sm text-gray-600 dark:text-gray-400" data-testid="progress-text">
                    {pointsToNextGlobal > 0 
                      ? `${pointsToNextGlobal} points to next Global Number`
                      : 'Ready for Global Number assignment!'
                    }
                  </div>
                </div>
              </div>

              {/* Current Global Number */}
              {customerData.globalSerialNumber && (
                <div className="text-center p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg border border-yellow-200 dark:border-yellow-800 mb-6">
                  <div className="flex items-center justify-center space-x-2 mb-2">
                    <Crown className="w-6 h-6 text-yellow-600 dark:text-yellow-400" />
                    <span className="text-lg font-semibold text-yellow-800 dark:text-yellow-200">Current Global Number</span>
                  </div>
                  <div className="text-4xl font-bold text-yellow-600 dark:text-yellow-400" data-testid="global-number">
                    #{customerData.globalSerialNumber}
                  </div>
                  <div className="text-sm text-yellow-700 dark:text-yellow-300 mt-2">
                    Total Global Numbers Earned: {customerData.globalRewardNumbers || 0}
                  </div>
                </div>
              )}

              {/* Statistics */}
              <div className="grid grid-cols-2 gap-4">
                <div className="text-center p-4 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
                  <div className="text-2xl font-bold text-green-600 dark:text-green-400" data-testid="total-points">
                    {customerData.totalPointsEarned || 0}
                  </div>
                  <div className="text-sm text-green-700 dark:text-green-300">Total Points Earned</div>
                </div>
                <div className="text-center p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg border border-purple-200 dark:border-purple-800">
                  <div className="text-2xl font-bold text-purple-600 dark:text-purple-400" data-testid="current-balance">
                    {customerData.currentPointsBalance || 0}
                  </div>
                  <div className="text-sm text-purple-700 dark:text-purple-300">Current Balance</div>
                </div>
              </div>

              {/* Test Button for Development */}
              <div className="mt-6 pt-4 border-t border-gray-200 dark:border-gray-700">
                <Button 
                  onClick={() => {
                    const points = prompt('Enter points to add (for testing):');
                    if (points && !isNaN(Number(points)) && Number(points) > 0) {
                      addPointsMutation.mutate(Number(points));
                    }
                  }}
                  disabled={addPointsMutation.isPending}
                  variant="outline"
                  className="w-full"
                  data-testid="button-add-points"
                >
                  <Coins className="w-4 h-4 mr-2" />
                  Add Points (Test)
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Column - StepUp Rewards */}
        <div className="space-y-6">
          
          {/* StepUp Rewards Card */}
          <Card className="bg-white dark:bg-gray-800 shadow-sm border border-gray-200 dark:border-gray-700">
            <CardHeader className="border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center">
                  <Gift className="w-4 h-4 text-green-600 dark:text-green-400" />
                </div>
                <div>
                  <CardTitle className="text-lg text-gray-900 dark:text-gray-100">StepUp Rewards Earned</CardTitle>
                  <CardDescription className="text-gray-600 dark:text-gray-400">
                    Formula-based milestone rewards (Global# × [5,25,125,500,2500])
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-6">
              
              {/* Total Rewards */}
              <div className="text-center mb-6 p-4 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
                <div className="text-4xl font-bold text-green-600 dark:text-green-400 mb-2" data-testid="total-rewards">
                  {stepUpRewards?.reduce((sum, reward) => sum + reward.rewardPoints, 0) || 0}
                </div>
                <div className="text-lg text-green-700 dark:text-green-300">Total StepUp Reward Points</div>
                <div className="text-sm text-green-600 dark:text-green-400 mt-1">
                  {stepUpRewards?.length || 0} rewards earned
                </div>
              </div>

              {/* Reward Breakdown */}
              {stepUpRewards && stepUpRewards.length > 0 ? (
                <div className="space-y-3 max-h-64 overflow-y-auto" data-testid="rewards-list">
                  {stepUpRewards?.map((reward, index) => (
                    <div key={reward.id} className="flex items-center justify-between p-3 bg-gradient-to-r from-green-50 to-blue-50 dark:from-green-900/20 dark:to-blue-900/20 rounded border border-green-200 dark:border-green-800">
                      <div className="flex items-center space-x-3">
                        <Trophy className="w-5 h-5 text-yellow-600 dark:text-yellow-400" />
                        <div>
                          <div className="font-semibold text-gray-900 dark:text-gray-100" data-testid={`reward-formula-${index}`}>
                            #{reward.customerGlobalNumber} × {reward.multiplier} = #{reward.triggerGlobalNumber}
                          </div>
                          <div className="text-xs text-gray-600 dark:text-gray-400">
                            {new Date(reward.awardedAt).toLocaleDateString()}
                          </div>
                        </div>
                      </div>
                      <Badge variant="secondary" className="bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200" data-testid={`reward-points-${index}`}>
                        +{reward.rewardPoints} pts
                      </Badge>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg" data-testid="no-rewards">
                  <Gift className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">No StepUp Rewards Yet</h3>
                  <p className="text-gray-600 dark:text-gray-400 mb-4">
                    You'll earn rewards when other customers reach milestone numbers based on your global number
                  </p>
                  <div className="text-sm text-gray-500 dark:text-gray-500">
                    {customerData.globalSerialNumber 
                      ? `Your Global #${customerData.globalSerialNumber} will earn rewards when global numbers reach: ${[5,25,125,500,2500].map(m => customerData.globalSerialNumber * m).join(', ')}`
                      : 'Get your first global number to start earning milestone rewards!'
                    }
                  </div>
                </div>
              )}

              {/* StepUp Formula Explanation */}
              <div className="mt-6 pt-4 border-t border-gray-200 dark:border-gray-700">
                <h4 className="font-semibold text-gray-900 dark:text-gray-100 mb-3">How StepUp Rewards Work:</h4>
                <div className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
                  <div>• When global numbers reach your_number × 5 → +500 points</div>
                  <div>• When global numbers reach your_number × 25 → +1500 points</div>
                  <div>• When global numbers reach your_number × 125 → +3000 points</div>
                  <div>• When global numbers reach your_number × 500 → +30000 points</div>
                  <div>• When global numbers reach your_number × 2500 → +160000 points</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* New Reward Systems Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
        
        {/* Infinity Rewards */}
        <Card className="bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 shadow-sm border border-purple-200 dark:border-purple-800">
          <CardHeader className="border-b border-purple-200 dark:border-purple-700">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-purple-100 dark:bg-purple-900 rounded-full flex items-center justify-center">
                <Infinity className="w-4 h-4 text-purple-600 dark:text-purple-400" />
              </div>
              <div>
                <CardTitle className="text-lg text-gray-900 dark:text-gray-100">Infinity Rewards</CardTitle>
                <CardDescription className="text-gray-600 dark:text-gray-400">
                  Exponential rewards at 30k, 150k, 750k points
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-6">
            {(rewardSummary as any)?.infinityCycles && (rewardSummary as any)?.infinityCycles.length > 0 ? (
              <div className="space-y-4">
                <div className="text-center p-4 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
                  <div className="text-3xl font-bold text-purple-600 dark:text-purple-400">
                    {(rewardSummary as any)?.infinityCycles?.reduce((sum: number, cycle: any) => sum + cycle.rewardPoints, 0) || 0}
                  </div>
                  <div className="text-sm text-purple-700 dark:text-purple-300">Total Infinity Points</div>
                </div>
                {(rewardSummary as any)?.infinityCycles?.map((cycle: any) => (
                  <div key={cycle.id} className="flex items-center justify-between p-3 bg-white dark:bg-gray-800 rounded border border-purple-200 dark:border-purple-800">
                    <div>
                      <div className="font-semibold text-gray-900 dark:text-gray-100">Cycle {cycle.cycleNumber}</div>
                      <div className="text-xs text-gray-600 dark:text-gray-400">
                        Milestone: {cycle.milestonePoints.toLocaleString()} pts
                      </div>
                    </div>
                    <Badge variant="secondary" className="bg-purple-100 dark:bg-purple-900 text-purple-800 dark:text-purple-200">
                      +{cycle.rewardPoints.toLocaleString()} pts
                    </Badge>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <Infinity className="w-16 h-16 text-purple-400 mx-auto mb-4" />
                <p className="text-gray-600 dark:text-gray-400 text-sm">
                  Reach 30,000 total points to unlock Infinity Rewards
                </p>
                <div className="mt-4 text-xs text-gray-500 dark:text-gray-500">
                  <div>• 30,000 pts → 5,000 reward</div>
                  <div>• 150,000 pts → 30,000 reward</div>
                  <div>• 750,000 pts → 200,000 reward</div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Shopping Vouchers */}
        <Card className="bg-gradient-to-br from-orange-50 to-yellow-50 dark:from-orange-900/20 dark:to-yellow-900/20 shadow-sm border border-orange-200 dark:border-orange-800">
          <CardHeader className="border-b border-orange-200 dark:border-orange-700">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-orange-100 dark:bg-orange-900 rounded-full flex items-center justify-center">
                <ShoppingBag className="w-4 h-4 text-orange-600 dark:text-orange-400" />
              </div>
              <div>
                <CardTitle className="text-lg text-gray-900 dark:text-gray-100">Shopping Vouchers</CardTitle>
                <CardDescription className="text-gray-600 dark:text-gray-400">
                  6,000 pts distributed to merchants when you earn rewards
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-6">
            {Array.isArray(shoppingVouchers) && shoppingVouchers.length > 0 ? (
              <div className="space-y-4">
                <div className="text-center p-4 bg-orange-100 dark:bg-orange-900/30 rounded-lg">
                  <div className="text-3xl font-bold text-orange-600 dark:text-orange-400">
                    {(shoppingVouchers as any[])?.reduce((sum: number, v: any) => sum + v.voucherAmount, 0) || 0}
                  </div>
                  <div className="text-sm text-orange-700 dark:text-orange-300">Total Voucher Value</div>
                </div>
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {(shoppingVouchers as any[])?.map((voucher: any) => (
                    <div key={voucher.id} className="flex items-center justify-between p-3 bg-white dark:bg-gray-800 rounded border border-orange-200 dark:border-orange-800">
                      <div className="flex-1">
                        <div className="font-semibold text-gray-900 dark:text-gray-100 text-sm">
                          {voucher.merchantName || 'Merchant'}
                        </div>
                        <div className="text-xs text-gray-600 dark:text-gray-400">
                          {new Date(voucher.distributedAt).toLocaleDateString()}
                        </div>
                      </div>
                      <Badge variant="secondary" className="bg-orange-100 dark:bg-orange-900 text-orange-800 dark:text-orange-200">
                        {voucher.voucherAmount} pts
                      </Badge>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="text-center py-8">
                <ShoppingBag className="w-16 h-16 text-orange-400 mx-auto mb-4" />
                <p className="text-gray-600 dark:text-gray-400 text-sm">
                  Earn global numbers to unlock shopping vouchers
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-500 mt-2">
                  6,000 points distributed proportionally to merchants
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Affiliate and Ripple Rewards Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
        
        {/* Affiliate Rewards */}
        <Card className="bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-blue-900/20 dark:to-cyan-900/20 shadow-sm border border-blue-200 dark:border-blue-800">
          <CardHeader className="border-b border-blue-200 dark:border-blue-700">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center">
                <Users className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <CardTitle className="text-lg text-gray-900 dark:text-gray-100">Affiliate Rewards</CardTitle>
                <CardDescription className="text-gray-600 dark:text-gray-400">
                  5% lifetime commission from referred customers
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-6">
            {(rewardSummary as any)?.affiliateCommissions && (rewardSummary as any)?.affiliateCommissions.length > 0 ? (
              <div className="space-y-4">
                <div className="text-center p-4 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                  <div className="text-3xl font-bold text-blue-600 dark:text-blue-400">
                    {(rewardSummary as any)?.affiliateCommissions?.reduce((sum: number, c: any) => sum + c.commissionAmount, 0) || 0}
                  </div>
                  <div className="text-sm text-blue-700 dark:text-blue-300">Total Affiliate Earnings</div>
                </div>
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {(rewardSummary as any)?.affiliateCommissions?.map((commission: any) => (
                    <div key={commission.id} className="flex items-center justify-between p-3 bg-white dark:bg-gray-800 rounded border border-blue-200 dark:border-blue-800">
                      <div className="flex-1">
                        <div className="text-xs text-gray-600 dark:text-gray-400">
                          5% of {commission.originalAmount} pts
                        </div>
                        <div className="text-xs text-gray-500 dark:text-gray-500">
                          {new Date(commission.earnedAt).toLocaleDateString()}
                        </div>
                      </div>
                      <Badge variant="secondary" className="bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200">
                        +{commission.commissionAmount} pts
                      </Badge>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="text-center py-8">
                <Users className="w-16 h-16 text-blue-400 mx-auto mb-4" />
                <p className="text-gray-600 dark:text-gray-400 text-sm">
                  Refer customers to earn 5% commission
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-500 mt-2">
                  Earn lifetime commission on all their purchases
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Ripple Rewards */}
        <Card className="bg-gradient-to-br from-teal-50 to-emerald-50 dark:from-teal-900/20 dark:to-emerald-900/20 shadow-sm border border-teal-200 dark:border-teal-800">
          <CardHeader className="border-b border-teal-200 dark:border-teal-700">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-teal-100 dark:bg-teal-900 rounded-full flex items-center justify-center">
                <Zap className="w-4 h-4 text-teal-600 dark:text-teal-400" />
              </div>
              <div>
                <CardTitle className="text-lg text-gray-900 dark:text-gray-100">Ripple Rewards</CardTitle>
                <CardDescription className="text-gray-600 dark:text-gray-400">
                  Bonus points when referred customers hit milestones
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-6">
            {(rewardSummary as any)?.rippleRewards && (rewardSummary as any)?.rippleRewards.length > 0 ? (
              <div className="space-y-4">
                <div className="text-center p-4 bg-teal-100 dark:bg-teal-900/30 rounded-lg">
                  <div className="text-3xl font-bold text-teal-600 dark:text-teal-400">
                    {(rewardSummary as any)?.rippleRewards?.reduce((sum: number, r: any) => sum + r.bonusPoints, 0) || 0}
                  </div>
                  <div className="text-sm text-teal-700 dark:text-teal-300">Total Ripple Bonus</div>
                </div>
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {(rewardSummary as any)?.rippleRewards?.map((ripple: any) => (
                    <div key={ripple.id} className="flex items-center justify-between p-3 bg-white dark:bg-gray-800 rounded border border-teal-200 dark:border-teal-800">
                      <div className="flex-1">
                        <div className="text-xs text-gray-600 dark:text-gray-400">
                          Milestone #{ripple.milestoneNumber}
                        </div>
                        <div className="text-xs text-gray-500 dark:text-gray-500">
                          {new Date(ripple.earnedAt).toLocaleDateString()}
                        </div>
                      </div>
                      <Badge variant="secondary" className="bg-teal-100 dark:bg-teal-900 text-teal-800 dark:text-teal-200">
                        +{ripple.bonusPoints} pts
                      </Badge>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="text-center py-8">
                <Zap className="w-16 h-16 text-teal-400 mx-auto mb-4" />
                <p className="text-gray-600 dark:text-gray-400 text-sm">
                  Refer customers to earn ripple rewards
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-500 mt-2">
                  Get bonus points when they reach milestones
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}