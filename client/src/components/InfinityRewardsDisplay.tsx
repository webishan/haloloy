import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Infinity, Crown, Target, TrendingUp, Sparkles } from 'lucide-react';
import { apiRequest } from '@/lib/queryClient';

interface InfinityReward {
  id: string;
  cycleNumber: number;
  globalNumbersGenerated: number;
  totalPointsDeducted: number;
  createdAt: string;
  globalNumbers: number[];
}

interface InfinityRewardsData {
  cycles: InfinityReward[];
  totalCycles: number;
  totalGlobalNumbers: number;
  nextCycleRequirement: number;
  isEligible: boolean;
}

export default function InfinityRewardsDisplay({ currentUser }: { currentUser: any }) {
  const { data: infinityData, isLoading } = useQuery({
    queryKey: ['/api/customer/infinity-rewards', currentUser?.id],
    enabled: !!currentUser,
    refetchInterval: 5000,
    select: (data: InfinityRewardsData) => data || {
      cycles: [],
      totalCycles: 0,
      totalGlobalNumbers: 0,
      nextCycleRequirement: 30000,
      isEligible: false
    }
  });

  if (isLoading) {
    return (
      <Card className="bg-gradient-to-br from-purple-50 to-indigo-50 border-2 border-purple-200">
        <CardHeader>
          <CardTitle className="flex items-center text-purple-800">
            <Infinity className="w-5 h-5 mr-2 text-purple-600" />
            Infinity Rewards System
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-purple-200 rounded w-3/4"></div>
            <div className="h-8 bg-purple-200 rounded w-1/2"></div>
            <div className="h-4 bg-purple-200 rounded w-1/4"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const { 
    cycles = [], 
    totalCycles = 0, 
    totalGlobalNumbers = 0, 
    nextCycleRequirement = 30000, 
    isEligible = false 
  } = infinityData || {};

  return (
    <Card className="bg-gradient-to-br from-purple-50 to-indigo-50 border-2 border-purple-200">
      <CardHeader>
        <CardTitle className="flex items-center text-purple-800">
          <Infinity className="w-5 h-5 mr-2 text-purple-600" />
          Infinity Rewards System
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Current Status */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="text-center p-4 bg-white rounded-lg border border-purple-100">
            <div className="text-2xl font-bold text-purple-600">{totalCycles}</div>
            <div className="text-sm text-purple-700">Cycles Completed</div>
          </div>
          <div className="text-center p-4 bg-white rounded-lg border border-purple-100">
            <div className="text-2xl font-bold text-indigo-600">{totalGlobalNumbers}</div>
            <div className="text-sm text-indigo-700">Global Numbers Generated</div>
          </div>
          <div className="text-center p-4 bg-white rounded-lg border border-purple-100">
            <div className="text-2xl font-bold text-green-600">
              {totalGlobalNumbers * 195000}
            </div>
            <div className="text-sm text-green-700">Total Reward Points</div>
          </div>
        </div>

        {/* Next Cycle Progress */}
        <div className="bg-white p-4 rounded-lg border border-purple-100">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-semibold text-purple-800">Next Infinity Cycle</span>
            <Badge variant={isEligible ? "default" : "secondary"} className="bg-purple-100 text-purple-800">
              {isEligible ? "Ready" : "In Progress"}
            </Badge>
          </div>
          <div className="text-sm text-gray-600 mb-2">
            Need 30,000 points to trigger next cycle
          </div>
          <Progress 
            value={isEligible ? 100 : 0} 
            className="h-2"
          />
        </div>

        {/* Cycle History */}
        {cycles && cycles.length > 0 && (
          <div className="space-y-3">
            <h4 className="font-semibold text-purple-800">Recent Cycles</h4>
            <div className="space-y-2 max-h-40 overflow-y-auto">
              {cycles.slice(0, 3).map((cycle, index) => (
                <div key={cycle.id} className="flex items-center justify-between p-3 bg-white rounded-lg border border-purple-100">
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center">
                      <Crown className="w-4 h-4 text-purple-600" />
                    </div>
                    <div>
                      <div className="font-medium text-purple-800">Cycle #{cycle.cycleNumber}</div>
                      <div className="text-sm text-gray-600">
                        {cycle.globalNumbersGenerated} Global Numbers Generated
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-medium text-green-600">
                      +{cycle.globalNumbersGenerated * 195000} pts
                    </div>
                    <div className="text-xs text-gray-500">
                      {new Date(cycle.createdAt).toLocaleDateString()}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Global Numbers Display */}
        {cycles && cycles.length > 0 && (
          <div className="bg-white p-4 rounded-lg border border-purple-100">
            <h4 className="font-semibold text-purple-800 mb-3">Your Global Numbers</h4>
            <div className="flex flex-wrap gap-2">
              {cycles.flatMap(cycle => cycle.globalNumbers).slice(0, 20).map((number, index) => (
                <Badge key={index} variant="outline" className="bg-purple-50 text-purple-700 border-purple-200">
                  #{number}
                </Badge>
              ))}
              {cycles.flatMap(cycle => cycle.globalNumbers).length > 20 && (
                <Badge variant="outline" className="bg-gray-50 text-gray-600">
                  +{cycles.flatMap(cycle => cycle.globalNumbers).length - 20} more
                </Badge>
              )}
            </div>
          </div>
        )}

        {/* How It Works */}
        <div className="bg-gradient-to-r from-purple-50 to-indigo-50 p-4 rounded-lg border border-purple-100">
          <h4 className="font-semibold text-purple-800 mb-2">How Infinity Rewards Work</h4>
          <div className="text-sm text-gray-700 space-y-1">
            <div>• 1st Cycle: 4 Global Numbers (780,000 points)</div>
            <div>• 2nd Cycle: 16 Global Numbers (3,120,000 points)</div>
            <div>• 3rd Cycle: 64 Global Numbers (12,480,000 points)</div>
            <div>• Each Global Number = 195,000 StepUp Reward points</div>
            <div>• Each cycle requires 30,000 points to trigger</div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
