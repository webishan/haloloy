import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { 
  Trophy, Star, Gift, Coins, Award, CheckCircle, Lock, 
  ArrowRight, Sparkles, Crown, Target, TrendingUp
} from "lucide-react";

interface RewardNumber {
  id: string;
  rewardNumber: string;
  serialNumber: string;
  type: 'global' | 'local';
  tier1Status: 'locked' | 'active' | 'completed';
  tier1Amount: number;
  tier2Status: 'locked' | 'active' | 'completed';
  tier2Amount: number;
  tier3Status: 'locked' | 'active' | 'completed';
  tier3Amount: number;
  tier4Status: 'locked' | 'active' | 'completed';
  tier4Amount: number;
  tier4VoucherReserve: number;
  tier4RedeemableAmount: number;
  currentPoints: number;
  totalPointsRequired: number;
  isCompleted: boolean;
  country: string;
  createdAt: string;
}

interface CustomerProfile {
  totalPointsEarned: number;
  currentPointsBalance: number;
  globalRewardNumbers?: number;
  localRewardNumbers?: number;
}

export default function RewardNumberSystem({ currentUser }: { currentUser: any }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Get customer profile
  const { data: customerProfile } = useQuery({
    queryKey: ['/api/customer/profile', currentUser?.id],
    enabled: !!currentUser,
    select: (data: any) => data || {}
  });

  // Get reward numbers
  const { data: rewardNumbers = [], isLoading: rewardNumbersLoading } = useQuery({
    queryKey: ['/api/customer/reward-numbers', currentUser?.id],
    enabled: !!currentUser,
    select: (data: any) => Array.isArray(data) ? data : []
  });

  // Get reward income summary
  const { data: rewardIncome } = useQuery({
    queryKey: ['/api/loyalty/reward-income', currentUser?.id],
    enabled: !!currentUser,
    select: (data: any) => data || {}
  });

  // Get tier progression status
  const { data: tierStatus } = useQuery({
    queryKey: ['/api/customer/tier-progression-status', currentUser?.id],
    enabled: !!currentUser,
    select: (data: any) => data || {}
  });

  // Create local reward number mutation
  const createLocalRewardMutation = useMutation({
    mutationFn: async (country: string) => {
      const response = await fetch('/api/customer/create-local-reward-number', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('customerToken')}`
        },
        body: JSON.stringify({ country })
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to create local reward number');
      }
      
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Local Reward Number Created!",
        description: "Your local reward number has been activated successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/customer/reward-numbers'] });
      queryClient.invalidateQueries({ queryKey: ['/api/customer/tier-progression-status'] });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to Create Reward Number",
        description: error.message,
        variant: "destructive"
      });
    }
  });

  // Check tier progression mutation
  const checkTierProgressionMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch('/api/customer/check-tier-progression', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('customerToken')}`
        }
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to check tier progression');
      }
      
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Tier Progression Updated!",
        description: "Your reward tiers have been checked and updated.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/customer/reward-numbers'] });
      queryClient.invalidateQueries({ queryKey: ['/api/customer/tier-progression-status'] });
    }
  });

  // Check global serial eligibility mutation
  const checkGlobalSerialMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch('/api/customer/check-global-serial-eligibility', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('customerToken')}`
        }
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to check global serial eligibility');
      }
      
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: data.eligible ? "Global Serial Number Check Complete!" : "Not Yet Eligible",
        description: data.message,
        variant: data.eligible ? "default" : "destructive"
      });
      queryClient.invalidateQueries({ queryKey: ['/api/customer/reward-numbers'] });
      queryClient.invalidateQueries({ queryKey: ['/api/customer/tier-progression-status'] });
      queryClient.invalidateQueries({ queryKey: ['/api/customer/profile'] });
    }
  });

  const getTierIcon = (tier: number) => {
    switch (tier) {
      case 1: return <Star className="w-5 h-5 text-yellow-500" />;
      case 2: return <Award className="w-5 h-5 text-orange-500" />;
      case 3: return <Trophy className="w-5 h-5 text-purple-500" />;
      case 4: return <Crown className="w-5 h-5 text-pink-500" />;
      default: return <Lock className="w-5 h-5 text-gray-400" />;
    }
  };

  const getTierColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-800 border-green-200';
      case 'active': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'locked': return 'bg-gray-100 text-gray-600 border-gray-200';
      default: return 'bg-gray-100 text-gray-600 border-gray-200';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': return <CheckCircle className="w-4 h-4" />;
      case 'active': return <Target className="w-4 h-4" />;
      case 'locked': return <Lock className="w-4 h-4" />;
      default: return <Lock className="w-4 h-4" />;
    }
  };

  const calculateProgress = (currentPoints: number, totalRequired: number) => {
    return Math.min((currentPoints / totalRequired) * 100, 100);
  };

  const canCreateLocalReward = () => {
    const totalPoints = customerProfile?.totalPointsEarned || 0;
    const hasLocalReward = rewardNumbers.some((rn: RewardNumber) => rn.type === 'local');
    return totalPoints >= 1500 && !hasLocalReward;
  };

  // Get reward tier based on global serial number (matching backend logic)
  const getRewardTierBySerial = (serialNumber: number): { name: string; range: string; reward: number } => {
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
  };

  const RewardNumberCard = ({ rewardNumber }: { rewardNumber: RewardNumber }) => {
    const tiers = [
      { 
        tier: 1, 
        status: rewardNumber.tier1Status, 
        amount: rewardNumber.tier1Amount,
        title: "Tier 1 - Bronze",
        description: "First milestone reward"
      },
      { 
        tier: 2, 
        status: rewardNumber.tier2Status, 
        amount: rewardNumber.tier2Amount,
        title: "Tier 2 - Silver", 
        description: "Enhanced rewards unlock"
      },
      { 
        tier: 3, 
        status: rewardNumber.tier3Status, 
        amount: rewardNumber.tier3Amount,
        title: "Tier 3 - Gold",
        description: "Premium tier benefits"
      },
      { 
        tier: 4, 
        status: rewardNumber.tier4Status, 
        amount: rewardNumber.tier4Amount,
        title: "Tier 4 - Diamond",
        description: "Ultimate reward tier"
      }
    ];

    return (
      <Card className="border-2 border-dashed border-blue-200 bg-gradient-to-br from-blue-50 to-indigo-50">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className={`p-3 rounded-full ${rewardNumber.type === 'global' ? 'bg-purple-100' : 'bg-green-100'}`}>
                {rewardNumber.type === 'global' ? 
                  <Crown className="w-6 h-6 text-purple-600" /> : 
                  <Trophy className="w-6 h-6 text-green-600" />
                }
              </div>
              <div>
                <CardTitle className="text-lg">
                  {rewardNumber.type === 'global' ? 'Global' : 'Local'} Reward Number
                </CardTitle>
                <CardDescription>
                  #{rewardNumber.rewardNumber} • Serial: {rewardNumber.serialNumber}
                </CardDescription>
              </div>
            </div>
            <Badge variant={rewardNumber.isCompleted ? "default" : "secondary"}>
              {rewardNumber.isCompleted ? "Completed" : "Active"}
            </Badge>
          </div>
        </CardHeader>
        
        <CardContent className="space-y-6">
          {/* Progress Overview */}
          <div className="bg-white p-4 rounded-lg border">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-600">Overall Progress</span>
              <span className="text-sm font-bold text-blue-600">
                {rewardNumber.currentPoints.toLocaleString()} / {rewardNumber.totalPointsRequired.toLocaleString()} points
              </span>
            </div>
            <Progress 
              value={calculateProgress(rewardNumber.currentPoints, rewardNumber.totalPointsRequired)} 
              className="h-3"
            />
            <div className="text-xs text-gray-500 mt-1">
              {calculateProgress(rewardNumber.currentPoints, rewardNumber.totalPointsRequired).toFixed(1)}% Complete
            </div>
          </div>

          {/* Tier Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {tiers.map((tier) => (
              <div 
                key={tier.tier}
                className={`p-4 rounded-lg border-2 ${getTierColor(tier.status)}`}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center space-x-2">
                    {getTierIcon(tier.tier)}
                    <span className="font-semibold text-sm">{tier.title}</span>
                  </div>
                  {getStatusIcon(tier.status)}
                </div>
                <div className="text-lg font-bold mb-1">
                  {tier.amount.toLocaleString()} points
                </div>
                <div className="text-xs opacity-75">
                  {tier.description}
                </div>
                {tier.tier === 4 && (
                  <div className="mt-2 text-xs space-y-1">
                    <div>Voucher Reserve: {rewardNumber.tier4VoucherReserve.toLocaleString()}</div>
                    <div>Redeemable: {rewardNumber.tier4RedeemableAmount.toLocaleString()}</div>
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Country Badge */}
          <div className="flex items-center justify-between">
            <Badge variant="outline" className="text-xs">
              Country: {rewardNumber.country}
            </Badge>
            <div className="text-xs text-gray-500">
              Created: {new Date(rewardNumber.createdAt).toLocaleDateString()}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  if (!currentUser) {
    return (
      <div className="text-center py-8 text-gray-500">
        Please log in to view your reward numbers
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Coins className="w-5 h-5 text-blue-500" />
              <div>
                <div className="text-sm text-gray-600">Total Points</div>
                <div className="text-lg font-bold text-blue-600">
                  {(customerProfile?.totalPointsEarned || 0).toLocaleString()}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Crown className="w-5 h-5 text-purple-500" />
              <div>
                <div className="text-sm text-gray-600">Global Numbers</div>
                <div className="text-lg font-bold text-purple-600">
                  {customerProfile?.globalRewardNumbers || 0}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Trophy className="w-5 h-5 text-green-500" />
              <div>
                <div className="text-sm text-gray-600">Local Numbers</div>
                <div className="text-lg font-bold text-green-600">
                  {customerProfile?.localRewardNumbers || 0}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <TrendingUp className="w-5 h-5 text-orange-500" />
              <div>
                <div className="text-sm text-gray-600">Active Numbers</div>
                <div className="text-lg font-bold text-orange-600">
                  {rewardNumbers.filter((rn: RewardNumber) => !rn.isCompleted).length}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Eligibility Notice */}
      {(customerProfile?.totalPointsEarned || 0) >= 1500 && (
        <Card className="border-green-200 bg-green-50">
          <CardContent className="p-4">
            <div className="flex items-center space-x-3">
              <CheckCircle className="w-6 h-6 text-green-600" />
              <div>
                <div className="font-semibold text-green-800">
                  🎉 Congratulations! You're eligible for global serial numbers!
                </div>
                <div className="text-sm text-green-700">
                  You have earned {(customerProfile?.totalPointsEarned || 0).toLocaleString()} points (minimum 1,500 required)
                </div>
                {customerProfile?.globalSerialNumber && (
                  <div className="text-sm font-semibold text-green-800 mt-1">
                    Your Global Serial Number: #{customerProfile.globalSerialNumber}
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Global Serial Number Status - Enhanced Display */}
      {(customerProfile?.totalPointsEarned || 0) >= 1500 && (
        <Card className="border-4 border-gradient-to-r from-yellow-400 to-orange-500 bg-gradient-to-br from-yellow-50 to-orange-50 shadow-2xl">
          <CardHeader className="bg-gradient-to-r from-yellow-100 to-orange-100 rounded-t-lg">
            <CardTitle className="flex items-center text-orange-800 text-xl">
              <Crown className="w-8 h-8 mr-3 text-yellow-600 animate-pulse" />
              🏆 Global Serial Number Status
            </CardTitle>
            <CardDescription className="text-orange-700 font-semibold">
              Achievement Order Ranking System - Based on 1,500+ Points Milestone
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6 p-6">
            {/* Global Serial Number Display */}
            <div className="text-center">
              <div className="bg-gradient-to-r from-yellow-200 to-orange-200 p-8 rounded-xl border-4 border-yellow-300 shadow-inner">
                <div className="flex items-center justify-center mb-4">
                  <Crown className="w-16 h-16 text-yellow-600 mr-4" />
                  {customerProfile?.globalSerialNumber ? (
                    <CheckCircle className="w-12 h-12 text-green-600" />
                  ) : (
                    <div className="w-12 h-12 bg-yellow-400 rounded-full animate-spin flex items-center justify-center">
                      <div className="w-6 h-6 bg-white rounded-full"></div>
                    </div>
                  )}
                </div>
                
                <div className="text-6xl font-black text-transparent bg-clip-text bg-gradient-to-r from-yellow-700 to-orange-700 mb-2">
                  {customerProfile?.globalSerialNumber ? `#${customerProfile.globalSerialNumber}` : 'PENDING'}
                </div>
                
                <div className="text-lg font-bold text-orange-800 mb-4">
                  {customerProfile?.globalSerialNumber ? 'GLOBAL SERIAL NUMBER ASSIGNED' : 'AWAITING ASSIGNMENT'}
                </div>
                
                {customerProfile?.globalSerialNumber && (
                  <div className="bg-white p-4 rounded-lg border-2 border-yellow-300 mb-4">
                    <div className="text-sm font-bold text-gray-700 mb-2">🎯 Your Reward Tier</div>
                    <div className="text-lg font-bold text-blue-600">
                      {getRewardTierBySerial(customerProfile.globalSerialNumber).name}
                    </div>
                    <div className="text-sm text-gray-600">
                      Serial Range: {getRewardTierBySerial(customerProfile.globalSerialNumber).range}
                    </div>
                    <div className="text-sm font-semibold text-green-600">
                      Tier Reward: {getRewardTierBySerial(customerProfile.globalSerialNumber).reward.toLocaleString()} points
                    </div>
                  </div>
                )}
                
                <div className="text-sm text-orange-700 font-semibold">
                  {customerProfile?.globalSerialNumber 
                    ? `You achieved 1,500+ points and received serial #${customerProfile.globalSerialNumber} based on achievement order!`
                    : 'You qualify for global serial assignment! Processing...'
                  }
                </div>
              </div>
            </div>

            {/* Reward Tier Information */}
            <div className="bg-white p-6 rounded-lg border-2 border-yellow-200">
              <h4 className="font-bold text-gray-800 mb-4 flex items-center">
                <Trophy className="w-5 h-5 mr-2 text-yellow-600" />
                Global Serial Number Reward Tiers
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 text-xs">
                <div className="bg-yellow-100 p-3 rounded border">
                  <div className="font-bold text-yellow-800">🥇 Champion (#1)</div>
                  <div className="text-yellow-700">Reward: 38,000 points</div>
                </div>
                <div className="bg-orange-100 p-3 rounded border">
                  <div className="font-bold text-orange-800">🥈 Elite (#2-5)</div>
                  <div className="text-orange-700">Reward: 15,000 points</div>
                </div>
                <div className="bg-purple-100 p-3 rounded border">
                  <div className="font-bold text-purple-800">🥉 Premium (#6-15)</div>
                  <div className="text-purple-700">Reward: 8,000 points</div>
                </div>
                <div className="bg-blue-100 p-3 rounded border">
                  <div className="font-bold text-blue-800">🏆 Gold (#16-37)</div>
                  <div className="text-blue-700">Reward: 3,500 points</div>
                </div>
                <div className="bg-gray-100 p-3 rounded border">
                  <div className="font-bold text-gray-800">🥈 Silver (#38-65)</div>
                  <div className="text-gray-700">Reward: 1,500 points</div>
                </div>
                <div className="bg-amber-100 p-3 rounded border">
                  <div className="font-bold text-amber-800">🥉 Bronze (#66+)</div>
                  <div className="text-amber-700">Reward: 800 points</div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Action Buttons */}
      <div className="flex flex-wrap gap-4">
        {(customerProfile?.totalPointsEarned || 0) >= 1500 && (
          <Button
            onClick={() => checkGlobalSerialMutation.mutate()}
            disabled={checkGlobalSerialMutation.isPending}
            className="bg-purple-600 hover:bg-purple-700"
          >
            <Crown className="w-4 h-4 mr-2" />
            {checkGlobalSerialMutation.isPending ? "Checking..." : "Check Global Serial Eligibility"}
          </Button>
        )}

        {canCreateLocalReward() && (
          <Button
            onClick={() => createLocalRewardMutation.mutate(currentUser?.country || 'BD')}
            disabled={createLocalRewardMutation.isPending}
            className="bg-green-600 hover:bg-green-700"
          >
            <Trophy className="w-4 h-4 mr-2" />
            {createLocalRewardMutation.isPending ? "Creating..." : "Create Local Reward Number"}
          </Button>
        )}

        <Button
          onClick={() => checkTierProgressionMutation.mutate()}
          disabled={checkTierProgressionMutation.isPending}
          variant="outline"
        >
          <Sparkles className="w-4 h-4 mr-2" />
          {checkTierProgressionMutation.isPending ? "Checking..." : "Check Tier Progression"}
        </Button>
      </div>

      {/* Reward Numbers Display */}
      {rewardNumbersLoading ? (
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="text-gray-500 mt-2">Loading reward numbers...</p>
        </div>
      ) : rewardNumbers.length > 0 ? (
        <div className="space-y-6">
          <h3 className="text-xl font-bold text-gray-900">Your Reward Numbers</h3>
          <div className="grid grid-cols-1 gap-6">
            {rewardNumbers.map((rewardNumber: RewardNumber) => (
              <RewardNumberCard key={rewardNumber.id} rewardNumber={rewardNumber} />
            ))}
          </div>
        </div>
      ) : (
        <Card className="border-dashed border-2 border-gray-300">
          <CardContent className="p-8 text-center">
            <Trophy className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No Reward Numbers Yet</h3>
            <p className="text-gray-600 mb-4">
              {(customerProfile?.totalPointsEarned || 0) < 1500 
                ? `Earn ${(1500 - (customerProfile?.totalPointsEarned || 0)).toLocaleString()} more points to unlock your first reward number!`
                : "You're eligible to create your first reward number!"
              }
            </p>
            {(customerProfile?.totalPointsEarned || 0) >= 1500 && (
              <Button
                onClick={() => createLocalRewardMutation.mutate(currentUser?.country || 'BD')}
                disabled={createLocalRewardMutation.isPending}
                className="bg-blue-600 hover:bg-blue-700"
              >
                <Trophy className="w-4 h-4 mr-2" />
                Create Your First Reward Number
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      {/* Reward Income System */}
      {rewardIncome && (
        <Card className="bg-gradient-to-br from-green-50 to-emerald-50 border-green-200">
          <CardHeader>
            <CardTitle className="flex items-center text-green-800">
              <Coins className="w-6 h-6 mr-2" />
              🎯 Reward Income System
            </CardTitle>
            <CardDescription className="text-green-700">
              Complete reward income tracking as per Bengali document specifications
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Total Income Overview */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-white p-4 rounded-lg border-2 border-green-200">
                <div className="flex items-center space-x-2 mb-2">
                  <Coins className="w-5 h-5 text-green-600" />
                  <span className="font-semibold text-green-800">Total Income</span>
                </div>
                <div className="text-2xl font-bold text-green-600">
                  {(rewardIncome.totalIncome || 0).toLocaleString()} Taka
                </div>
              </div>
              
              <div className="bg-white p-4 rounded-lg border-2 border-blue-200">
                <div className="flex items-center space-x-2 mb-2">
                  <Trophy className="w-5 h-5 text-blue-600" />
                  <span className="font-semibold text-blue-800">Commerce Balance</span>
                </div>
                <div className="text-2xl font-bold text-blue-600">
                  {(rewardIncome.commerceBalance || 0).toLocaleString()} Taka
                </div>
              </div>
              
              <div className="bg-white p-4 rounded-lg border-2 border-purple-200">
                <div className="flex items-center space-x-2 mb-2">
                  <Star className="w-5 h-5 text-purple-600" />
                  <span className="font-semibold text-purple-800">Active Rewards</span>
                </div>
                <div className="text-2xl font-bold text-purple-600">
                  {(rewardIncome.stepUpRewards?.length || 0) + (rewardIncome.rippleRewards?.length || 0)}
                </div>
              </div>
            </div>

            {/* Reward Types Breakdown */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* StepUp Rewards */}
              <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200">
                <h4 className="font-bold text-yellow-800 mb-3 flex items-center">
                  <Star className="w-5 h-5 mr-2" />
                  StepUp Rewards (800/1500/3500/32200)
                </h4>
                <div className="space-y-2">
                  <div className="text-sm text-yellow-700">
                    <strong>Count:</strong> {rewardIncome.stepUpRewards?.length || 0} rewards
                  </div>
                  <div className="text-sm text-yellow-700">
                    <strong>Total:</strong> {(rewardIncome.stepUpRewards?.reduce((sum: number, r: any) => sum + r.points, 0) || 0).toLocaleString()} Taka
                  </div>
                </div>
              </div>

              {/* Ripple Rewards */}
              <div className="bg-orange-50 p-4 rounded-lg border border-orange-200">
                <h4 className="font-bold text-orange-800 mb-3 flex items-center">
                  <TrendingUp className="w-5 h-5 mr-2" />
                  Ripple Rewards (50/100/150/700)
                </h4>
                <div className="space-y-2">
                  <div className="text-sm text-orange-700">
                    <strong>Count:</strong> {rewardIncome.rippleRewards?.length || 0} rewards
                  </div>
                  <div className="text-sm text-orange-700">
                    <strong>Total:</strong> {(rewardIncome.rippleRewards?.reduce((sum: number, r: any) => sum + r.points, 0) || 0).toLocaleString()} Taka
                  </div>
                </div>
              </div>

              {/* Affiliate Rewards */}
              <div className="bg-purple-50 p-4 rounded-lg border border-purple-200">
                <h4 className="font-bold text-purple-800 mb-3 flex items-center">
                  <Award className="w-5 h-5 mr-2" />
                  Affiliate Rewards (5% Lifetime)
                </h4>
                <div className="space-y-2">
                  <div className="text-sm text-purple-700">
                    <strong>Count:</strong> {rewardIncome.affiliateRewards?.length || 0} commissions
                  </div>
                  <div className="text-sm text-purple-700">
                    <strong>Total:</strong> {(rewardIncome.affiliateRewards?.reduce((sum: number, r: any) => sum + r.points, 0) || 0).toLocaleString()} Taka
                  </div>
                </div>
              </div>

              {/* Infinity Rewards */}
              <div className="bg-indigo-50 p-4 rounded-lg border border-indigo-200">
                <h4 className="font-bold text-indigo-800 mb-3 flex items-center">
                  <Crown className="w-5 h-5 mr-2" />
                  Infinity Rewards (4 New Numbers)
                </h4>
                <div className="space-y-2">
                  <div className="text-sm text-indigo-700">
                    <strong>Count:</strong> {rewardIncome.infinityRewards?.length || 0} rewards
                  </div>
                  <div className="text-sm text-indigo-700">
                    <strong>Total:</strong> {(rewardIncome.infinityRewards?.reduce((sum: number, r: any) => sum + r.points, 0) || 0).toLocaleString()} Taka
                  </div>
                </div>
              </div>
            </div>

            {/* Balance Transfer Information */}
            <div className="bg-red-50 p-4 rounded-lg border border-red-200">
              <h4 className="font-bold text-red-800 mb-3 flex items-center">
                <ArrowRight className="w-5 h-5 mr-2" />
                Balance Transfer (12.5% VAT + Service Charge)
              </h4>
              <div className="text-sm text-red-700 space-y-1">
                <p>• <strong>VAT:</strong> 12.5% deducted from reward/income transfers</p>
                <p>• <strong>Service Charge:</strong> Additional 5% service charge</p>
                <p>• <strong>Final Amount:</strong> 82.5% of original amount after deductions</p>
                <p>• <strong>Merchant Shopping:</strong> 26,200 Taka for designated merchants only</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Information Card */}
      <Card className="bg-blue-50 border-blue-200">
        <CardHeader>
          <CardTitle className="flex items-center text-blue-800">
            <Gift className="w-5 h-5 mr-2" />
            How Reward Numbers Work
          </CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-blue-700 space-y-2">
          <p>• <strong>Eligibility:</strong> Earn 1,500 points to unlock your first reward number</p>
          <p>• <strong>Global Numbers:</strong> Available worldwide with premium rewards</p>
          <p>• <strong>Local Numbers:</strong> Country-specific rewards and benefits</p>
          <p>• <strong>4-Tier System:</strong> Each number has 4 reward tiers to unlock</p>
          <p>• <strong>Progressive Rewards:</strong> Higher tiers offer better rewards and benefits</p>
          <p>• <strong>Tier 4 Special:</strong> Includes voucher reserves and redeemable amounts</p>
        </CardContent>
      </Card>
    </div>
  );
}