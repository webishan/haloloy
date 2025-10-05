import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Waves, Gift, TrendingUp, Award, Users } from 'lucide-react';
import { apiRequest } from '@/lib/queryClient';

interface RippleReward {
  id: string;
  referredCustomerId: string;
  referredCustomerName: string;
  stepUpRewardAmount: number;
  rippleAmount: number;
  ripplePercentage: number;
  createdAt: string;
  description: string;
}

interface RippleRewardsData {
  totalRippleRewards: number;
  totalRippleCount: number;
  recentRipples: RippleReward[];
  rippleBreakdown: {
    amount500: number;
    amount1500: number;
    amount3000: number;
    amount30000: number;
    amount160000: number;
  };
}

export default function RippleRewardsDisplay({ currentUser }: { currentUser: any }) {
  const { data: rippleData, isLoading } = useQuery({
    queryKey: ['/api/customer/ripple-rewards', currentUser?.id],
    enabled: !!currentUser,
    refetchInterval: 5000,
    select: (data: RippleRewardsData) => data || {
      totalRippleRewards: 0,
      totalRippleCount: 0,
      recentRipples: [],
      rippleBreakdown: {
        amount500: 0,
        amount1500: 0,
        amount3000: 0,
        amount30000: 0,
        amount160000: 0
      }
    }
  });

  if (isLoading) {
    return (
      <Card className="bg-gradient-to-br from-cyan-50 to-blue-50 border-2 border-cyan-200">
        <CardHeader>
          <CardTitle className="flex items-center text-cyan-800">
            <Waves className="w-5 h-5 mr-2 text-cyan-600" />
            Ripple Rewards
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-cyan-200 rounded w-3/4"></div>
            <div className="h-8 bg-cyan-200 rounded w-1/2"></div>
            <div className="h-4 bg-cyan-200 rounded w-1/4"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const { 
    totalRippleRewards = 0, 
    totalRippleCount = 0, 
    recentRipples = [], 
    rippleBreakdown = {
      amount500: 0,
      amount1500: 0,
      amount3000: 0,
      amount30000: 0,
      amount160000: 0
    }
  } = rippleData || {};

  return (
    <Card className="bg-gradient-to-br from-cyan-50 to-blue-50 border-2 border-cyan-200">
      <CardHeader>
        <CardTitle className="flex items-center text-cyan-800">
          <Waves className="w-5 h-5 mr-2 text-cyan-600" />
          Ripple Rewards
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Ripple Summary */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="text-center p-4 bg-white rounded-lg border border-cyan-100">
            <div className="text-3xl font-bold text-cyan-600">{(totalRippleRewards || 0).toLocaleString()}</div>
            <div className="text-sm text-cyan-700">Total Ripple Rewards</div>
          </div>
          <div className="text-center p-4 bg-white rounded-lg border border-cyan-100">
            <div className="text-3xl font-bold text-blue-600">{totalRippleCount}</div>
            <div className="text-sm text-blue-700">Ripple Events</div>
          </div>
        </div>

        {/* Ripple Breakdown */}
        <div className="bg-white p-4 rounded-lg border border-cyan-100">
          <h4 className="font-semibold text-cyan-800 mb-3">Ripple Reward Breakdown</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">500 pts StepUp →</span>
                <Badge variant="outline" className="bg-green-100 text-green-800">
                  {(rippleBreakdown?.amount500 || 0)} × 50 pts
                </Badge>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">1,500 pts StepUp →</span>
                <Badge variant="outline" className="bg-blue-100 text-blue-800">
                  {(rippleBreakdown?.amount1500 || 0)} × 100 pts
                </Badge>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">3,000 pts StepUp →</span>
                <Badge variant="outline" className="bg-purple-100 text-purple-800">
                  {(rippleBreakdown?.amount3000 || 0)} × 150 pts
                </Badge>
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">30,000 pts StepUp →</span>
                <Badge variant="outline" className="bg-orange-100 text-orange-800">
                  {(rippleBreakdown?.amount30000 || 0)} × 700 pts
                </Badge>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">160,000 pts StepUp →</span>
                <Badge variant="outline" className="bg-red-100 text-red-800">
                  {(rippleBreakdown?.amount160000 || 0)} × 1,500 pts
                </Badge>
              </div>
            </div>
          </div>
        </div>

        {/* Recent Ripple Events */}
        {recentRipples && recentRipples.length > 0 && (
          <div className="space-y-4">
            <h4 className="font-semibold text-cyan-800">Recent Ripple Events</h4>
            <div className="bg-white rounded-lg border border-cyan-100 overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Referred Customer</TableHead>
                    <TableHead>StepUp Reward</TableHead>
                    <TableHead>Your Ripple</TableHead>
                    <TableHead>Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {recentRipples.slice(0, 5).map((ripple) => (
                    <TableRow key={ripple.id}>
                      <TableCell>
                        <div className="flex items-center">
                          <Users className="w-4 h-4 mr-2 text-cyan-600" />
                          {ripple.referredCustomerName}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm font-medium">{(ripple.stepUpRewardAmount || 0).toLocaleString()} pts</div>
                        <div className="text-xs text-gray-500">{ripple.description}</div>
                      </TableCell>
                      <TableCell className="text-green-600 font-medium">
                        +{(ripple.rippleAmount || 0).toLocaleString()} pts
                      </TableCell>
                      <TableCell>{new Date(ripple.createdAt).toLocaleDateString()}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        )}

        {/* How It Works */}
        <div className="bg-gradient-to-r from-cyan-50 to-blue-50 p-4 rounded-lg border border-cyan-100">
          <h4 className="font-semibold text-cyan-800 mb-2">How Ripple Rewards Work</h4>
          <div className="text-sm text-gray-700 space-y-1">
            <div>• When your referrals earn StepUp rewards, you get Ripple rewards</div>
            <div>• 500 pts StepUp → You get 50 pts (10%)</div>
            <div>• 1,500 pts StepUp → You get 100 pts (6.7%)</div>
            <div>• 3,000 pts StepUp → You get 150 pts (5%)</div>
            <div>• 30,000 pts StepUp → You get 700 pts (2.3%)</div>
            <div>• 160,000 pts StepUp → You get 1,500 pts (0.9%)</div>
            <div>• Ripple rewards are automatically added to your income wallet</div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
