import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { 
  Coins, Trophy, Crown, Star, Target, CheckCircle, 
  ArrowRight, Sparkles, Gift, Award, TrendingUp
} from "lucide-react";

interface AccumulatedPointsData {
  currentPoints: number;
  maxPoints: number;
  pointsToNextReward: number;
  hasRewardNumber: boolean;
  globalNumber?: number;
  rewardNumbers: Array<{
    id: string;
    number: number;
    type: 'global' | 'local';
    createdAt: string;
  }>;
}

interface CustomerProfile {
  totalPointsEarned: number;
  currentPointsBalance: number;
  globalSerialNumber?: number;
  globalRewardNumbers?: number;
  localRewardNumbers?: number;
}

export default function AccumulatedPointsDisplay({ currentUser }: { currentUser: any }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Get customer profile
  const { data: customerProfile } = useQuery({
    queryKey: ['/api/customer/profile', currentUser?.id],
    enabled: !!currentUser,
    select: (data: any) => data || {}
  });

  // Get accumulated points data
  const { data: accumulatedData, isLoading } = useQuery({
    queryKey: ['/api/customer/accumulated-points'],
    queryFn: async () => {
      const response = await fetch('/api/customer/accumulated-points', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('customerToken')}`
        }
      });
      if (!response.ok) {
        throw new Error('Failed to fetch accumulated points');
      }
      return response.json();
    },
    enabled: !!currentUser,
    refetchInterval: 3000,
    refetchOnWindowFocus: true,
    select: (data: any) => data || {
      currentPoints: 0,
      maxPoints: 1500,
      pointsToNextReward: 1500,
      hasRewardNumber: false,
      rewardNumbers: []
    }
  });

  // Convert points to reward number mutation
  const convertPointsMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch('/api/customer/convert-points-to-reward', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('customerToken')}`
        }
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to convert points to reward number');
      }
      
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "🎉 Points Converted to Reward Number!",
        description: `Your points have been converted to Global Reward Number #${data.globalNumber}`,
      });
      queryClient.invalidateQueries({ queryKey: ['/api/customer/accumulated-points'] });
      queryClient.invalidateQueries({ queryKey: ['/api/customer/profile'] });
      queryClient.invalidateQueries({ queryKey: ['/api/customer/reward-numbers'] });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to Convert Points",
        description: error.message,
        variant: "destructive"
      });
    }
  });

  // Calculate progress percentage
  const progressPercentage = Math.min((accumulatedData?.currentPoints || 0) / 1500 * 100, 100);
  
  // Check if points can be converted
  const canConvertPoints = (accumulatedData?.currentPoints || 0) >= 1500 && !accumulatedData?.hasRewardNumber;

  // Get reward tier based on global number
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

  if (!currentUser) {
    return (
      <div className="text-center py-8 text-gray-500">
        Please log in to view your accumulated points
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Main Accumulated Points Card */}
      <Card className="border-2 border-blue-200 bg-gradient-to-br from-blue-50 to-indigo-50">
        <CardHeader>
          <CardTitle className="flex items-center text-blue-800 text-xl">
            <Coins className="w-6 h-6 mr-2" />
            🎯 Accumulated Points System
          </CardTitle>
          <CardDescription className="text-blue-700">
            Points accumulate up to 1,499, then convert to Global Reward Numbers at 1,500 points
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Current Points Display */}
          <div className="text-center">
            <div className="bg-gradient-to-r from-blue-100 to-indigo-100 p-8 rounded-xl border-2 border-blue-200">
              <div className="flex items-center justify-center mb-4">
                <Coins className="w-12 h-12 text-blue-600 mr-3" />
                <div className="text-6xl font-black text-transparent bg-clip-text bg-gradient-to-r from-blue-700 to-indigo-700">
                  {(accumulatedData?.currentPoints || 0).toLocaleString()}
                </div>
              </div>
              
              <div className="text-lg font-bold text-blue-800 mb-4">
                ACCUMULATED POINTS
              </div>
              
              <div className="text-sm text-blue-700 font-semibold">
                {canConvertPoints 
                  ? "🎉 Ready to convert to Global Reward Number!"
                  : `Earn ${(1500 - (accumulatedData?.currentPoints || 0)).toLocaleString()} more points to unlock your first Global Reward Number!`
                }
              </div>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-600">Progress to Reward Number</span>
              <span className="text-sm font-bold text-blue-600">
                {(accumulatedData?.currentPoints || 0)} / 1,500 points
              </span>
            </div>
            <Progress 
              value={progressPercentage} 
              className="h-4"
            />
            <div className="text-xs text-gray-500 text-center">
              {progressPercentage.toFixed(1)}% Complete
            </div>
          </div>

          {/* Conversion Button */}
          {canConvertPoints && (
            <div className="text-center">
              <Button
                onClick={() => convertPointsMutation.mutate()}
                disabled={convertPointsMutation.isPending}
                size="lg"
                className="bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600 text-white font-bold py-4 px-8 rounded-xl shadow-lg transform hover:scale-105 transition-all duration-200"
              >
                <Crown className="w-6 h-6 mr-2" />
                {convertPointsMutation.isPending ? "Converting..." : "Convert to Global Reward Number"}
                <Sparkles className="w-6 h-6 ml-2" />
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Global Number Display (when converted) */}
      {accumulatedData?.hasRewardNumber && accumulatedData?.globalNumber && (
        <Card className="border-4 border-gradient-to-r from-yellow-400 to-orange-500 bg-gradient-to-br from-yellow-50 to-orange-50 shadow-2xl">
          <CardHeader className="bg-gradient-to-r from-yellow-100 to-orange-100 rounded-t-lg">
            <CardTitle className="flex items-center text-orange-800 text-xl">
              <Crown className="w-8 h-8 mr-3 text-yellow-600 animate-pulse" />
              🏆 Global Reward Number
            </CardTitle>
            <CardDescription className="text-orange-700 font-semibold">
              Your unique global number for the reward system
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6 p-6">
            {/* Global Number Display */}
            <div className="text-center">
              <div className="bg-gradient-to-r from-yellow-200 to-orange-200 p-8 rounded-xl border-4 border-yellow-300 shadow-inner">
                <div className="flex items-center justify-center mb-4">
                  <Crown className="w-16 h-16 text-yellow-600 mr-4" />
                  <CheckCircle className="w-12 h-12 text-green-600" />
                </div>
                
                <div className="text-6xl font-black text-transparent bg-clip-text bg-gradient-to-r from-yellow-700 to-orange-700 mb-2">
                  #{accumulatedData.globalNumber}
                </div>
                
                <div className="text-lg font-bold text-orange-800 mb-4">
                  GLOBAL REWARD NUMBER
                </div>
                
                <div className="bg-white p-4 rounded-lg border-2 border-yellow-300 mb-4">
                  <div className="text-sm font-bold text-gray-700 mb-2">🎯 Your Reward Tier</div>
                  <div className="text-lg font-bold text-blue-600">
                    {getRewardTierBySerial(accumulatedData.globalNumber).name}
                  </div>
                  <div className="text-sm text-gray-600">
                    Serial Range: {getRewardTierBySerial(accumulatedData.globalNumber).range}
                  </div>
                  <div className="text-sm font-semibold text-green-600">
                    Tier Reward: {getRewardTierBySerial(accumulatedData.globalNumber).reward.toLocaleString()} points
                  </div>
                </div>
                
                <div className="text-sm text-orange-700 font-semibold">
                  Your points have been converted to Global Reward Number #{accumulatedData.globalNumber}!
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Reward Numbers History */}
      {accumulatedData?.rewardNumbers && accumulatedData.rewardNumbers.length > 0 && (
        <Card className="border-green-200 bg-green-50">
          <CardHeader>
            <CardTitle className="flex items-center text-green-800">
              <Trophy className="w-5 h-5 mr-2" />
              Your Reward Numbers
            </CardTitle>
            <CardDescription className="text-green-700">
              All your converted reward numbers and their status
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {accumulatedData.rewardNumbers.map((rewardNumber: any) => (
                <div key={rewardNumber.id} className="bg-white p-4 rounded-lg border-2 border-green-200">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center space-x-2">
                      {rewardNumber.type === 'global' ? 
                        <Crown className="w-5 h-5 text-purple-600" /> : 
                        <Trophy className="w-5 h-5 text-green-600" />
                      }
                      <span className="font-semibold">
                        {rewardNumber.type === 'global' ? 'Global' : 'Local'} #{rewardNumber.number}
                      </span>
                    </div>
                    <Badge variant="outline" className="text-xs">
                      {rewardNumber.type === 'global' ? 'Global' : 'Local'}
                    </Badge>
                  </div>
                  <div className="text-sm text-gray-600">
                    Created: {new Date(rewardNumber.createdAt).toLocaleDateString()}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Information Card */}
      <Card className="bg-blue-50 border-blue-200">
        <CardHeader>
          <CardTitle className="flex items-center text-blue-800">
            <Gift className="w-5 h-5 mr-2" />
            How the Accumulated Points System Works
          </CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-blue-700 space-y-2">
          <p>• <strong>Point Accumulation:</strong> All points from purchases, activities, and rewards accumulate here</p>
          <p>• <strong>1,499 Point Cap:</strong> Points accumulate up to 1,499 before conversion</p>
          <p>• <strong>1,500 Point Conversion:</strong> At exactly 1,500 points, they convert to a Global Reward Number</p>
          <p>• <strong>Point Reset:</strong> After conversion, accumulated points reset to 0</p>
          <p>• <strong>Global Number:</strong> A unique global number is assigned and displayed in the Reward Number section</p>
          <p>• <strong>Reward Tiers:</strong> Each global number has 4 reward tiers with different point requirements</p>
        </CardContent>
      </Card>
    </div>
  );
}
