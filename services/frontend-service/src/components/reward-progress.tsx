import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Coins, Award, TrendingUp } from 'lucide-react';

interface RewardProgressProps {
  customer?: {
    totalPoints: number;
    accumulatedPoints: number;
    currentTier?: string;
    globalRewardNumbers: number;
    localRewardNumbers: number;
    totalRewardBalance: string;
    availableBalance: string;
  };
}

export default function RewardProgress({ customer }: RewardProgressProps) {
  if (!customer) {
    return (
      <Card>
        <CardContent className="p-6">
          <p className="text-center text-gray-500">Login to view your reward progress</p>
        </CardContent>
      </Card>
    );
  }

  const progressToNextTier = (customer.accumulatedPoints / 1500) * 100;
  const pointsToNext = 1500 - customer.accumulatedPoints;

  return (
    <div className="space-y-6">
      {/* Points Overview */}
      <div className="grid md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Points</p>
                <p className="text-2xl font-bold text-primary">{customer.totalPoints}</p>
              </div>
              <div className="p-3 bg-primary/10 rounded-lg">
                <Coins className="w-6 h-6 text-primary" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Current Tier</p>
                <p className="text-2xl font-bold text-accent">
                  {customer.currentTier?.replace('_', ' ').toUpperCase() || 'Tier 1'}
                </p>
              </div>
              <div className="p-3 bg-accent/10 rounded-lg">
                <Award className="w-6 h-6 text-accent" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Reward Numbers</p>
                <p className="text-2xl font-bold text-blue-600">
                  {customer.globalRewardNumbers + customer.localRewardNumbers}
                </p>
              </div>
              <div className="p-3 bg-blue-100 rounded-lg">
                <TrendingUp className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Available Balance</p>
                <p className="text-2xl font-bold text-green-600">
                  ${customer.availableBalance}
                </p>
              </div>
              <div className="p-3 bg-green-100 rounded-lg">
                <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                </svg>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Progress to Next Reward Number */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Progress to Next Reward Number</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Accumulated Points</span>
              <span className="text-sm text-gray-600">{pointsToNext} points to go</span>
            </div>
            <Progress value={progressToNextTier} className="h-3" />
            <div className="flex justify-between text-sm text-gray-600">
              <span>Current: {customer.accumulatedPoints} pts</span>
              <span>Next Reward: 1,500 pts</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Reward Tiers */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Reward Tier System</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center space-x-3">
                <Badge variant="outline">Tier 1</Badge>
                <span className="font-medium">800 Points</span>
              </div>
              <span className="text-primary font-semibold">Available</span>
            </div>
            
            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center space-x-3">
                <Badge variant="outline">Tier 2</Badge>
                <span className="font-medium">1,500 Points</span>
              </div>
              <span className="text-primary font-semibold">Available</span>
            </div>
            
            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center space-x-3">
                <Badge variant="outline">Tier 3</Badge>
                <span className="font-medium">3,500 Points</span>
              </div>
              <span className="text-primary font-semibold">Available</span>
            </div>
            
            <div className="flex items-center justify-between p-4 bg-accent/10 rounded-lg border-2 border-accent">
              <div className="flex items-center space-x-3">
                <Badge className="bg-accent text-black">Tier 4</Badge>
                <span className="font-medium">32,200 Points</span>
              </div>
              <span className="text-accent font-semibold">Premium</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
