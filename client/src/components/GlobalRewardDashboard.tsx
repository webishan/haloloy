import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { 
  Trophy, Star, Gift, Coins, Award, CheckCircle, Lock, 
  ArrowRight, Sparkles, Crown, Target, TrendingUp, DollarSign,
  ShoppingBag, Recycle, Calendar, Users, Heart, Activity
} from "lucide-react";

interface RewardPointBreakdown {
  purchasePoints: number;
  wasteManagementPoints: number;
  dailyLoginPoints: number;
  referralPoints: number;
  birthdayPoints: number;
  otherActivityPoints: number;
  totalAccumulated: number;
}

interface GlobalRewardNumber {
  id: string;
  customerId: string;
  rewardNumber: number;
  serialNumber: number;
  tier1Completed: boolean;
  tier1Amount: number;
  tier1Reward: number;
  tier2Completed: boolean;
  tier2Amount: number;
  tier2Reward: number;
  tier3Completed: boolean;
  tier3Amount: number;
  tier3Reward: number;
  tier4Completed: boolean;
  tier4Amount: number;
  tier4Reward: number;
  tier4VoucherReserve: number;
  tier4RedeemableAmount: number;
  totalPointsRequired: number;
  currentPoints: number;
  isCompleted: boolean;
  createdAt: string;
  completedAt?: string;
}

interface RewardIncome {
  stepUpRewards: number;
  infinityRewards: number;
  affiliateRewards: number;
  rippleRewards: number;
  dailyLoginRewards: number;
  birthdayRewards: number;
  totalRewardIncome: number;
}

export default function GlobalRewardDashboard({ currentUser }: { currentUser: any }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Get comprehensive reward system data (matches screenshot exactly)
  const { data: rewardSystemData, isLoading: dataLoading } = useQuery({
    queryKey: ['/api/customer/reward-system-data', currentUser?.id],
    enabled: !!currentUser,
    select: (data: any) => data || {
      accumulatedPoints: {
        purchasePoints: 0,
        wasteManagementPoints: 0,
        dailyLoginPoints: 0,
        referralPoints: 0,
        birthdayPoints: 0,
        otherActivityPoints: 0,
        totalAccumulated: 0
      },
      globalRewardNumbers: [],
      totalGlobalNumbers: 0,
      completedGlobalNumbers: 0,
      activeGlobalNumbers: 0,
      rewardIncome: {
        stepUpRewards: 0,
        infinityRewards: 0,
        affiliateRewards: 0,
        rippleRewards: 0,
        dailyLoginRewards: 0,
        birthdayRewards: 0,
        totalRewardIncome: 0
      },
      balanceWallet: 0,
      globalSerial: { assigned: 0, total: 64 },
      localSerial: { assigned: 0, total: 0 },
      serialActivation: { activated: 0, total: 500 }
    }
  });

  // Transfer reward to balance mutation
  const transferMutation = useMutation({
    mutationFn: async (amount: number) => {
      const response = await fetch('/api/customer/transfer-reward-to-balance', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('customerToken')}`
        },
        body: JSON.stringify({ amount })
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Transfer failed');
      }
      
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Transfer Successful!",
        description: `Transferred ${data.finalAmount} Taka to balance wallet (after deductions)`,
      });
      queryClient.invalidateQueries({ queryKey: ['/api/customer/reward-system-data'] });
    },
    onError: (error: Error) => {
      toast({
        title: "Transfer Failed",
        description: error.message,
        variant: "destructive"
      });
    }
  });

  const getItemIcon = (item: string) => {
    switch (item) {
      case 'purchase': return <ShoppingBag className="w-4 h-4 text-blue-500" />;
      case 'wasteManagement': return <Recycle className="w-4 h-4 text-green-500" />;
      case 'dailyLogin': return <Calendar className="w-4 h-4 text-purple-500" />;
      case 'referral': return <Users className="w-4 h-4 text-orange-500" />;
      case 'birthday': return <Heart className="w-4 h-4 text-pink-500" />;
      case 'other': return <Activity className="w-4 h-4 text-gray-500" />;
      default: return <Coins className="w-4 h-4 text-yellow-500" />;
    }
  };

  const getTierIcon = (tier: number) => {
    switch (tier) {
      case 1: return <Star className="w-5 h-5 text-yellow-500" />;
      case 2: return <Award className="w-5 h-5 text-orange-500" />;
      case 3: return <Trophy className="w-5 h-5 text-purple-500" />;
      case 4: return <Crown className="w-5 h-5 text-pink-500" />;
      default: return <Lock className="w-5 h-5 text-gray-400" />;
    }
  };

  const getTierColor = (completed: boolean, active: boolean) => {
    if (completed) return 'bg-green-100 text-green-800 border-green-200';
    if (active) return 'bg-blue-100 text-blue-800 border-blue-200';
    return 'bg-gray-100 text-gray-600 border-gray-200';
  };

  if (!currentUser) {
    return (
      <div className="text-center py-8 text-gray-500">
        Please log in to view your global reward dashboard
      </div>
    );
  }

  if (dataLoading) {
    return (
      <div className="text-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
        <p className="text-gray-500 mt-2">Loading reward system...</p>
      </div>
    );
  }

  const { 
    accumulatedPoints, 
    globalRewardNumbers, 
    totalGlobalNumbers,
    completedGlobalNumbers,
    activeGlobalNumbers,
    rewardIncome, 
    balanceWallet,
    globalSerial,
    localSerial,
    serialActivation
  } = rewardSystemData;

  return (
    <div className="space-y-6 bg-gray-50 min-h-screen p-6">
      {/* Header */}
      <div className="bg-white rounded-lg p-6 shadow-sm">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Reward System</h1>
        <p className="text-gray-600">Complete reward system with accumulated points, global reward numbers, and income tracking</p>
      </div>

      {/* Main Content - Matches Screenshot Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Column - Accumulated Points System */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Accumulated Points Card */}
          <Card className="bg-white shadow-sm">
            <CardHeader className="border-b">
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                  <Coins className="w-4 h-4 text-blue-600" />
                </div>
                <div>
                  <CardTitle className="text-lg">Accumulated Points System</CardTitle>
                  <CardDescription>Points accumulate up to 1499, then convert to Global Reward Number at 1500</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-6">
              
              {/* Total Accumulated Points Display */}
              <div className="text-center mb-6">
                <div className="text-6xl font-bold text-blue-600 mb-2">
                  {accumulatedPoints.totalAccumulated}
                </div>
                <div className="text-lg text-gray-600 mb-4">Accumulated Points</div>
                <div className="text-sm text-gray-500 mb-4">
                  Points up to 1499 accumulate here. At 1500, converts to Global Reward Number
                </div>
                
                {/* Progress Bar */}
                <div className="max-w-md mx-auto">
                  <Progress 
                    value={(accumulatedPoints.totalAccumulated / 1500) * 100} 
                    className="h-4 mb-2"
                  />
                  <div className="text-sm text-gray-600">
                    {1500 - accumulatedPoints.totalAccumulated > 0 
                      ? `${1500 - accumulatedPoints.totalAccumulated} points to Global Reward Number`
                      : 'Ready for Global Reward Number!'
                    }
                  </div>
                </div>
              </div>

              {/* Item-wise Point Breakdown */}
              <div className="border-t pt-6">
                <h3 className="font-semibold text-gray-900 mb-4">📊 Item-wise Point Breakdown</h3>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  
                  <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                    <div className="flex items-center space-x-2 mb-2">
                      <ShoppingBag className="w-4 h-4 text-blue-600" />
                      <span className="font-medium text-blue-900">Purchase</span>
                    </div>
                    <div className="text-2xl font-bold text-blue-600">
                      {accumulatedPoints.purchasePoints}
                    </div>
                    <div className="text-xs text-blue-700">From shopping activities</div>
                  </div>

                  <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                    <div className="flex items-center space-x-2 mb-2">
                      <Recycle className="w-4 h-4 text-green-600" />
                      <span className="font-medium text-green-900">Waste Management</span>
                    </div>
                    <div className="text-2xl font-bold text-green-600">
                      {accumulatedPoints.wasteManagementPoints}
                    </div>
                    <div className="text-xs text-green-700">From recycling activities</div>
                  </div>

                  <div className="bg-purple-50 p-4 rounded-lg border border-purple-200">
                    <div className="flex items-center space-x-2 mb-2">
                      <Calendar className="w-4 h-4 text-purple-600" />
                      <span className="font-medium text-purple-900">Daily Login</span>
                    </div>
                    <div className="text-2xl font-bold text-purple-600">
                      {accumulatedPoints.dailyLoginPoints}
                    </div>
                    <div className="text-xs text-purple-700">From daily visits</div>
                  </div>

                  <div className="bg-orange-50 p-4 rounded-lg border border-orange-200">
                    <div className="flex items-center space-x-2 mb-2">
                      <Users className="w-4 h-4 text-orange-600" />
                      <span className="font-medium text-orange-900">Referrals</span>
                    </div>
                    <div className="text-2xl font-bold text-orange-600">
                      {accumulatedPoints.referralPoints}
                    </div>
                    <div className="text-xs text-orange-700">From inviting friends</div>
                  </div>

                  <div className="bg-pink-50 p-4 rounded-lg border border-pink-200">
                    <div className="flex items-center space-x-2 mb-2">
                      <Heart className="w-4 h-4 text-pink-600" />
                      <span className="font-medium text-pink-900">Birthday</span>
                    </div>
                    <div className="text-2xl font-bold text-pink-600">
                      {accumulatedPoints.birthdayPoints}
                    </div>
                    <div className="text-xs text-pink-700">Birthday bonuses</div>
                  </div>

                  <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                    <div className="flex items-center space-x-2 mb-2">
                      <Activity className="w-4 h-4 text-gray-600" />
                      <span className="font-medium text-gray-900">Other Activities</span>
                    </div>
                    <div className="text-2xl font-bold text-gray-600">
                      {accumulatedPoints.otherActivityPoints}
                    </div>
                    <div className="text-xs text-gray-700">Other point sources</div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Global Reward Numbers Section */}
          <Card className="bg-white shadow-sm">
            <CardHeader className="border-b">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <div className="w-8 h-8 bg-yellow-100 rounded-full flex items-center justify-center">
                    <Crown className="w-4 h-4 text-yellow-600" />
                  </div>
                  <div>
                    <CardTitle className="text-lg">🏆 Global Reward Numbers</CardTitle>
                    <CardDescription>4-tier reward system (800/1500/3500/32200 points)</CardDescription>
                  </div>
                </div>
                <Button variant="outline" size="sm">
                  View All Details
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-6">
              
              {/* Summary Stats */}
              <div className="grid grid-cols-3 gap-4 mb-6">
                <div className="text-center p-4 bg-blue-50 rounded-lg">
                  <div className="text-3xl font-bold text-blue-600">{totalGlobalNumbers}</div>
                  <div className="text-sm text-blue-700">Total Numbers</div>
                </div>
                <div className="text-center p-4 bg-green-50 rounded-lg">
                  <div className="text-3xl font-bold text-green-600">{completedGlobalNumbers}</div>
                  <div className="text-sm text-green-700">Completed</div>
                </div>
                <div className="text-center p-4 bg-orange-50 rounded-lg">
                  <div className="text-3xl font-bold text-orange-600">{activeGlobalNumbers}</div>
                  <div className="text-sm text-orange-700">Active Numbers</div>
                </div>
              </div>

              {/* No Reward Numbers Message */}
              {globalRewardNumbers.length === 0 && (
                <div className="text-center py-8 border-2 border-dashed border-gray-300 rounded-lg">
                  <Trophy className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">No Reward Numbers Yet</h3>
                  <p className="text-gray-600 mb-4">
                    Accumulate 1,500 points to earn your first Global Reward Number!
                  </p>
                  <div className="text-sm text-gray-500">
                    Current: {accumulatedPoints.totalAccumulated} / 1,500 points
                  </div>
                </div>
              )}

              {/* Reward Numbers List */}
              {globalRewardNumbers.map((rewardNumber: GlobalRewardNumber) => (
                <div key={rewardNumber.id} className="border rounded-lg p-4 mb-4 bg-gradient-to-r from-yellow-50 to-orange-50">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center space-x-3">
                      <Crown className="w-6 h-6 text-yellow-600" />
                      <div>
                        <div className="font-bold text-lg">Global Reward #{rewardNumber.serialNumber}</div>
                        <div className="text-sm text-gray-600">
                          {rewardNumber.currentPoints} / {rewardNumber.totalRequired} points
                        </div>
                      </div>
                    </div>
                    <Badge variant={rewardNumber.isCompleted ? "default" : "secondary"}>
                      {rewardNumber.isCompleted ? "Completed" : "Active"}
                    </Badge>
                  </div>
                  
                  {/* 4-Tier Progress */}
                  <div className="grid grid-cols-4 gap-2">
                    <div className={`p-2 rounded text-center text-xs ${rewardNumber.tier1.completed ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'}`}>
                      <div className="font-bold">Tier 1</div>
                      <div>800 pts</div>
                      <div>{rewardNumber.tier1.reward} Taka</div>
                    </div>
                    <div className={`p-2 rounded text-center text-xs ${rewardNumber.tier2.completed ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'}`}>
                      <div className="font-bold">Tier 2</div>
                      <div>1500 pts</div>
                      <div>{rewardNumber.tier2.reward} Taka</div>
                    </div>
                    <div className={`p-2 rounded text-center text-xs ${rewardNumber.tier3.completed ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'}`}>
                      <div className="font-bold">Tier 3</div>
                      <div>3500 pts</div>
                      <div>{rewardNumber.tier3.reward} Taka</div>
                    </div>
                    <div className={`p-2 rounded text-center text-xs ${rewardNumber.tier4.completed ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'}`}>
                      <div className="font-bold">Tier 4</div>
                      <div>32200 pts</div>
                      <div>{rewardNumber.tier4.reward} Taka</div>
                    </div>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>

        {/* Right Column - Reward Income & Serial Numbers */}
        <div className="space-y-6">
          
          {/* Reward Income Card */}
          <Card className="bg-white shadow-sm">
            <CardHeader className="border-b">
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                  <DollarSign className="w-4 h-4 text-green-600" />
                </div>
                <div>
                  <CardTitle className="text-lg">💰 Reward Income System</CardTitle>
                  <CardDescription>All income sources in Taka</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-6">
              
              {/* Total Reward Income */}
              <div className="text-center mb-6 p-4 bg-green-50 rounded-lg">
                <div className="text-4xl font-bold text-green-600 mb-2">
                  {rewardIncome.totalRewardIncome}
                </div>
                <div className="text-lg text-green-700">Total Reward Income (Taka)</div>
              </div>

              {/* Income Sources */}
              <div className="space-y-3">
                <div className="flex justify-between items-center p-3 bg-blue-50 rounded">
                  <span className="text-sm font-medium">StepUp Rewards</span>
                  <span className="font-bold text-blue-600">{rewardIncome.stepUpRewards} Taka</span>
                </div>
                <div className="flex justify-between items-center p-3 bg-purple-50 rounded">
                  <span className="text-sm font-medium">Infinity Rewards</span>
                  <span className="font-bold text-purple-600">{rewardIncome.infinityRewards} Taka</span>
                </div>
                <div className="flex justify-between items-center p-3 bg-orange-50 rounded">
                  <span className="text-sm font-medium">Affiliate Rewards</span>
                  <span className="font-bold text-orange-600">{rewardIncome.affiliateRewards} Taka</span>
                </div>
                <div className="flex justify-between items-center p-3 bg-pink-50 rounded">
                  <span className="text-sm font-medium">Ripple Rewards</span>
                  <span className="font-bold text-pink-600">{rewardIncome.rippleRewards} Taka</span>
                </div>
                <div className="flex justify-between items-center p-3 bg-indigo-50 rounded">
                  <span className="text-sm font-medium">Daily Login</span>
                  <span className="font-bold text-indigo-600">{rewardIncome.dailyLoginRewards} Taka</span>
                </div>
                <div className="flex justify-between items-center p-3 bg-red-50 rounded">
                  <span className="text-sm font-medium">Birthday Rewards</span>
                  <span className="font-bold text-red-600">{rewardIncome.birthdayRewards} Taka</span>
                </div>
              </div>

              {/* Transfer Button */}
              {rewardIncome.totalRewardIncome > 0 && (
                <div className="mt-6 pt-4 border-t">
                  <Button 
                    onClick={() => {
                      const amount = prompt(`Enter amount to transfer (Available: ${rewardIncome.totalRewardIncome} Taka):`);
                      if (amount && !isNaN(Number(amount)) && Number(amount) > 0) {
                        transferMutation.mutate(Number(amount));
                      }
                    }}
                    disabled={transferMutation.isPending}
                    className="w-full bg-green-600 hover:bg-green-700"
                  >
                    <ArrowRight className="w-4 h-4 mr-2" />
                    Transfer to Balance Wallet
                  </Button>
                  <p className="text-xs text-gray-500 mt-2 text-center">
                    12.5% VAT + 5% service charge will be deducted
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Serial Numbers Card */}
          <Card className="bg-white shadow-sm">
            <CardHeader className="border-b">
              <CardTitle className="text-lg">📊 Serial Numbers</CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <div className="space-y-4">
                
                {/* Global Serial */}
                <div className="p-4 bg-yellow-50 rounded-lg border border-yellow-200">
                  <div className="flex justify-between items-center mb-2">
                    <span className="font-medium text-yellow-900">🌍 Global Serial</span>
                    <Crown className="w-4 h-4 text-yellow-600" />
                  </div>
                  <div className="text-2xl font-bold text-yellow-600">
                    {globalSerial.assigned}/{globalSerial.total}
                  </div>
                  <div className="text-xs text-yellow-700">Assigned globally</div>
                </div>

                {/* Local Serial */}
                <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                  <div className="flex justify-between items-center mb-2">
                    <span className="font-medium text-green-900">🏠 Local Serial</span>
                    <Trophy className="w-4 h-4 text-green-600" />
                  </div>
                  <div className="text-2xl font-bold text-green-600">
                    {localSerial.assigned}/{localSerial.total}
                  </div>
                  <div className="text-xs text-green-700">Country specific</div>
                </div>

                {/* Serial Activation */}
                <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                  <div className="flex justify-between items-center mb-2">
                    <span className="font-medium text-blue-900">⚡ Serial Activation</span>
                    <Target className="w-4 h-4 text-blue-600" />
                  </div>
                  <div className="text-2xl font-bold text-blue-600">
                    {serialActivation.activated}/{serialActivation.total}
                  </div>
                  <div className="text-xs text-blue-700">Activated serials</div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Balance Wallet Card */}
          <Card className="bg-white shadow-sm">
            <CardHeader className="border-b">
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center">
                  <Target className="w-4 h-4 text-purple-600" />
                </div>
                <div>
                  <CardTitle className="text-lg">💳 Balance Wallet (TK)</CardTitle>
                  <CardDescription>Spendable balance after transfers</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-6">
              <div className="text-center p-4 bg-purple-50 rounded-lg">
                <div className="text-4xl font-bold text-purple-600 mb-2">
                  {balanceWallet}
                </div>
                <div className="text-lg text-purple-700">Available Balance (Taka)</div>
                <div className="text-sm text-purple-600 mt-2">
                  Ready for spending and withdrawals
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );


}