import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { 
  Gift, Crown, Star, Award, TrendingUp, Users, 
  ShoppingBag, Coins, Target, Zap, Infinity,
  ArrowRight, CheckCircle, Clock, AlertCircle
} from 'lucide-react';

interface StepUpReward {
  step: number;
  multiplier: number;
  pointsRequired: number;
  reward: number;
  completed: boolean;
  progress: number;
}

interface RewardSystemData {
  accumulatedPoints: number;
  globalRewardNumbers: any[];
  stepUpRewards: StepUpReward[];
  infinityRewards: number;
  affiliateRewards: number;
  rippleRewards: number;
  shoppingVouchers: any[];
  totalRewardIncome: number;
  totalGlobalNumbers: number;
  completedGlobalNumbers: number;
  activeGlobalNumbers: number;
}

interface CustomerRewardSystemProps {
  currentUser: any;
}

export default function CustomerRewardSystem({ currentUser }: CustomerRewardSystemProps) {
  const [rewardData, setRewardData] = useState<RewardSystemData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Fetch reward system data
    fetchRewardData();
  }, [currentUser]);

  const fetchRewardData = async () => {
    try {
      setLoading(true);
      // This would be replaced with actual API call
      const mockData: RewardSystemData = {
        accumulatedPoints: 1250,
        globalRewardNumbers: [
          {
            id: '1',
            globalNumber: 1,
            serialNumber: 1,
            step1: { completed: true, amount: 5, reward: 500, multiplier: 5 },
            step2: { completed: true, amount: 25, reward: 1500, multiplier: 25 },
            step3: { completed: false, amount: 125, reward: 3000, multiplier: 125 },
            step4: { completed: false, amount: 500, reward: 30000, multiplier: 500 },
            step5: { completed: false, amount: 2500, reward: 160000, multiplier: 2500 },
            currentPoints: 30,
            totalRequired: 3155,
            isCompleted: false,
            rewardEarned: 2000
          }
        ],
        stepUpRewards: [
          { step: 1, multiplier: 5, pointsRequired: 5, reward: 500, completed: true, progress: 100 },
          { step: 2, multiplier: 25, pointsRequired: 25, reward: 1500, completed: true, progress: 100 },
          { step: 3, multiplier: 125, pointsRequired: 125, reward: 3000, completed: false, progress: 24 },
          { step: 4, multiplier: 500, pointsRequired: 500, reward: 30000, completed: false, progress: 0 },
          { step: 5, multiplier: 2500, pointsRequired: 2500, reward: 160000, completed: false, progress: 0 }
        ],
        infinityRewards: 780000, // 4 × 1,95,000 points
        affiliateRewards: 250,
        rippleRewards: 150,
        shoppingVouchers: [
          {
            id: 'voucher_1',
            merchantId: 'merchant_1',
            merchantName: 'Tech Store',
            pointsAmount: 2000,
            isUsed: false,
            createdAt: new Date()
          },
          {
            id: 'voucher_2',
            merchantId: 'merchant_2',
            merchantName: 'Fashion Hub',
            pointsAmount: 1500,
            isUsed: false,
            createdAt: new Date()
          }
        ],
        totalRewardIncome: 2000,
        totalGlobalNumbers: 1,
        completedGlobalNumbers: 0,
        activeGlobalNumbers: 1
      };
      setRewardData(mockData);
    } catch (error) {
      console.error('Error fetching reward data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!rewardData) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center text-gray-500">
            <AlertCircle className="w-12 h-12 mx-auto mb-4" />
            <p>Unable to load reward system data</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const totalStepUpRewards = rewardData.stepUpRewards.reduce((sum, step) => sum + step.reward, 0);
  const completedSteps = rewardData.stepUpRewards.filter(step => step.completed).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center">
        <h2 className="text-3xl font-bold text-gray-900 mb-2">Customer Reward System</h2>
        <p className="text-gray-600">Complete reward system with 5 types of benefits</p>
      </div>

      {/* Accumulated Points */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Coins className="w-5 h-5 text-blue-600" />
            <span>Accumulated Points</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center">
            <div className="text-4xl font-bold text-blue-600 mb-2">
              {rewardData.accumulatedPoints.toLocaleString()}
            </div>
            <p className="text-gray-600 mb-4">Points accumulated through shopping</p>
            <div className="bg-yellow-50 p-4 rounded-lg">
              <p className="text-sm text-yellow-800">
                <strong>Note:</strong> When you reach 1,500 points, a global reward number will be generated automatically.
              </p>
            </div>
            {rewardData.accumulatedPoints >= 1500 && (
              <Button 
                className="mt-4 komarce-button"
                onClick={() => {
                  // This would trigger the creation of a new Global Number
                  console.log('Creating Global Number...');
                }}
              >
                Create Global Number
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Global Numbers Overview */}
      <Card className="border-red-100">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2 text-red-600">
            <Target className="w-5 h-5 text-red-500" />
            <span>Global Numbers</span>
            <Badge variant="outline" className="bg-red-100 text-red-800 border-red-200">
              {rewardData.totalGlobalNumbers} Total
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="text-center p-4 bg-red-50 rounded-lg">
              <div className="text-2xl font-bold text-red-600">{rewardData.totalGlobalNumbers}</div>
              <div className="text-sm text-gray-600">Total Global Numbers</div>
            </div>
            <div className="text-center p-4 bg-green-50 rounded-lg">
              <div className="text-2xl font-bold text-green-600">{rewardData.completedGlobalNumbers}</div>
              <div className="text-sm text-gray-600">Completed</div>
            </div>
            <div className="text-center p-4 bg-blue-50 rounded-lg">
              <div className="text-2xl font-bold text-blue-600">{rewardData.activeGlobalNumbers}</div>
              <div className="text-sm text-gray-600">Active</div>
            </div>
          </div>
          
          <div className="space-y-4">
            {rewardData.globalRewardNumbers.map((globalNumber, index) => (
              <div key={globalNumber.id} className="border border-gray-200 rounded-lg p-4">
                <div className="flex justify-between items-center mb-3">
                  <div className="flex items-center space-x-2">
                    <span className="font-semibold text-gray-900">Global Number #{globalNumber.globalNumber}</span>
                    <Badge variant="outline" className="text-xs">
                      Serial: {globalNumber.serialNumber}
                    </Badge>
                  </div>
                  <div className="text-right">
                    <div className="text-sm text-gray-600">Reward Earned</div>
                    <div className="font-bold text-red-600">{globalNumber.rewardEarned.toLocaleString()} points</div>
                  </div>
                </div>
                
                <div className="grid grid-cols-5 gap-2">
                  {[
                    { step: globalNumber.step1, name: 'Step 1' },
                    { step: globalNumber.step2, name: 'Step 2' },
                    { step: globalNumber.step3, name: 'Step 3' },
                    { step: globalNumber.step4, name: 'Step 4' },
                    { step: globalNumber.step5, name: 'Step 5' }
                  ].map(({ step, name }, stepIndex) => (
                    <div key={stepIndex} className={`text-center p-2 rounded ${
                      step.completed ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'
                    }`}>
                      <div className="text-xs font-medium">{name}</div>
                      <div className="text-xs">{step.reward.toLocaleString()}</div>
                      {step.completed && <CheckCircle className="w-4 h-4 mx-auto mt-1" />}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* StepUp Reward System */}
      <Card className="border-red-100">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2 text-red-600">
            <Crown className="w-5 h-5 text-red-500" />
            <span>StepUp Reward System</span>
            <Badge variant="outline" className="bg-red-100 text-red-800 border-red-200">
              Total: {totalStepUpRewards.toLocaleString()} points
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
              {rewardData.stepUpRewards.map((step, index) => (
                <div key={step.step} className="relative">
                  <div className={`p-4 rounded-lg border-2 ${
                    step.completed 
                      ? 'border-green-500 bg-green-50' 
                      : step.progress > 0 
                        ? 'border-blue-500 bg-blue-50' 
                        : 'border-gray-300 bg-gray-50'
                  }`}>
                    <div className="text-center">
                      <div className="flex items-center justify-center mb-2">
                        {step.completed ? (
                          <CheckCircle className="w-6 h-6 text-green-600" />
                        ) : step.progress > 0 ? (
                          <Clock className="w-6 h-6 text-blue-600" />
                        ) : (
                          <div className="w-6 h-6 rounded-full border-2 border-gray-400"></div>
                        )}
                      </div>
                      <p className="text-sm font-medium text-gray-600">Step {step.step}</p>
                      <p className="text-lg font-bold text-gray-900">{step.multiplier}x</p>
                      <p className="text-sm text-gray-600">{step.pointsRequired} points</p>
                      <p className="text-lg font-bold text-green-600">{step.reward.toLocaleString()}</p>
                      {step.progress > 0 && !step.completed && (
                        <div className="mt-2">
                          <Progress value={step.progress} className="h-2" />
                          <p className="text-xs text-gray-500 mt-1">{step.progress}% complete</p>
                        </div>
                      )}
                    </div>
                  </div>
                  {index < 4 && (
                    <div className="absolute top-1/2 -right-2 transform -translate-y-1/2">
                      <ArrowRight className="w-4 h-4 text-gray-400" />
                    </div>
                  )}
                </div>
              ))}
            </div>
            
            <div className="bg-blue-50 p-4 rounded-lg">
              <h4 className="font-semibold text-blue-900 mb-2">StepUp Reward Formula</h4>
              <p className="text-sm text-blue-800">
                The formula is: 5, 25, 125, 500, and 2500. The condition for receiving the reward is that 
                the customer's reward number multiplied by these formula values.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Infinity Reward System */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Infinity className="w-5 h-5 text-purple-600" />
            <span>Infinity Reward System</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="bg-purple-50 p-4 rounded-lg">
              <h4 className="font-semibold text-purple-900 mb-2">How Infinity Reward Works</h4>
              <p className="text-sm text-purple-800 mb-3">
                When a customer receives 30,000 points as StepUp Reward in its fourth step, 
                6,000 points will be kept by the company, and four new reward numbers will be 
                automatically generated, each of which will receive 1,95,000 reward points as a stepup reward.
              </p>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                {[1, 2, 3, 4].map((num) => (
                  <div key={num} className="text-center p-3 bg-white rounded border">
                    <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-2">
                      <span className="text-sm font-bold text-purple-600">{num}</span>
                    </div>
                    <p className="text-xs text-gray-600">New Reward Number</p>
                    <p className="text-sm font-semibold">1,95,000 points</p>
                  </div>
                ))}
              </div>
            </div>
            
            <div className="text-center">
              <p className="text-sm text-gray-600">
                This process continues: 4 → 16 → 64 → and so on...
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Affiliate Reward System */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Users className="w-5 h-5 text-green-600" />
            <span>Affiliate Reward System</span>
            <Badge variant="outline" className="bg-green-100 text-green-800">
              5% Commission
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="bg-green-50 p-4 rounded-lg">
              <h4 className="font-semibold text-green-900 mb-2">Lifetime Commission</h4>
              <p className="text-sm text-green-800">
                If a customer refers another customer, they will receive a 5% referral commission 
                on the points earned by the referred customer from any merchant, and this will continue for life.
              </p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="text-center p-4 bg-white rounded border">
                <div className="text-2xl font-bold text-green-600 mb-1">
                  {rewardData.affiliateRewards.toLocaleString()}
                </div>
                <p className="text-sm text-gray-600">Total Commission Earned</p>
              </div>
              <div className="text-center p-4 bg-white rounded border">
                <div className="text-2xl font-bold text-blue-600 mb-1">5%</div>
                <p className="text-sm text-gray-600">Commission Rate</p>
              </div>
              <div className="text-center p-4 bg-white rounded border">
                <div className="text-2xl font-bold text-purple-600 mb-1">∞</div>
                <p className="text-sm text-gray-600">Lifetime</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Ripple Reward System */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <TrendingUp className="w-5 h-5 text-orange-600" />
            <span>Ripple Reward System</span>
            <Badge variant="outline" className="bg-orange-100 text-orange-800">
              10% of Referred Customer Rewards
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="bg-orange-50 p-4 rounded-lg">
              <h4 className="font-semibold text-orange-900 mb-2">Ripple Effect</h4>
              <p className="text-sm text-orange-800 mb-3">
                The customer who referred will also earn another income based on what they receive 
                from the StepUp Reward number.
              </p>
            </div>
            
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>When Referred Customer Gets</TableHead>
                    <TableHead>You Get</TableHead>
                    <TableHead>Percentage</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <TableRow>
                    <TableCell>500 points</TableCell>
                    <TableCell>50 points</TableCell>
                    <TableCell>10%</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell>1,500 points</TableCell>
                    <TableCell>150 points</TableCell>
                    <TableCell>10%</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell>3,000 points</TableCell>
                    <TableCell>300 points</TableCell>
                    <TableCell>10%</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell>30,000 points</TableCell>
                    <TableCell>3,000 points</TableCell>
                    <TableCell>10%</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell>1,60,000 points</TableCell>
                    <TableCell>16,000 points</TableCell>
                    <TableCell>10%</TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </div>
            
            <div className="text-center">
              <div className="text-2xl font-bold text-orange-600 mb-1">
                {rewardData.rippleRewards.toLocaleString()}
              </div>
              <p className="text-sm text-gray-600">Total Ripple Rewards Earned</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Shopping Voucher System */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <ShoppingBag className="w-5 h-5 text-pink-600" />
            <span>Shopping Voucher System</span>
            <Badge variant="outline" className="bg-pink-100 text-pink-800">
              6,000 Points Reserve
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="bg-pink-50 p-4 rounded-lg">
              <h4 className="font-semibold text-pink-900 mb-2">Merchant-Specific Vouchers</h4>
              <p className="text-sm text-pink-800">
                When a customer receives 30,000 points as StepUp Reward in its fourth step, 
                6,000 points are kept by the company for Infinity Reward. From this, another 6,000 points 
                will be deposited proportionally into a separate wallet in the name of the customer from 
                the merchants where the customer has shopped. These points can only be spent by shopping 
                at those specific merchants.
              </p>
            </div>
            
            <div className="text-center">
              <div className="text-2xl font-bold text-pink-600 mb-1">
                {rewardData.shoppingVouchers.length}
              </div>
              <p className="text-sm text-gray-600">Active Shopping Vouchers</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Infinity Reward */}
      <Card className="border-red-100">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2 text-red-600">
            <Infinity className="w-5 h-5 text-red-500" />
            <span>Infinity Reward</span>
            <Badge variant="outline" className="bg-red-100 text-red-800 border-red-200">
              {rewardData.infinityRewards.toLocaleString()} points
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center">
            <div className="text-3xl font-bold text-red-600 mb-2">
              {rewardData.infinityRewards.toLocaleString()}
            </div>
            <p className="text-gray-600 mb-4">Points from Infinity Reward System</p>
            <div className="bg-red-50 p-4 rounded-lg">
              <p className="text-sm text-red-800">
                <strong>How it works:</strong> When you complete Step 4 of any Global Number, 
                4 new Global Numbers are automatically created for you, each eligible for the full 1,95,000 points.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Affiliate Reward */}
      <Card className="border-red-100">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2 text-red-600">
            <Users className="w-5 h-5 text-red-500" />
            <span>Affiliate Reward</span>
            <Badge variant="outline" className="bg-red-100 text-red-800 border-red-200">
              {rewardData.affiliateRewards.toLocaleString()} points
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center">
            <div className="text-3xl font-bold text-red-600 mb-2">
              {rewardData.affiliateRewards.toLocaleString()}
            </div>
            <p className="text-gray-600 mb-4">Lifetime commission from referrals</p>
            <div className="bg-red-50 p-4 rounded-lg">
              <p className="text-sm text-red-800">
                <strong>How it works:</strong> Earn 5% lifetime commission on all points 
                earned by customers you refer from any merchant.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Ripple Reward */}
      <Card className="border-red-100">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2 text-red-600">
            <Zap className="w-5 h-5 text-red-500" />
            <span>Ripple Reward</span>
            <Badge variant="outline" className="bg-red-100 text-red-800 border-red-200">
              {rewardData.rippleRewards.toLocaleString()} points
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center">
            <div className="text-3xl font-bold text-red-600 mb-2">
              {rewardData.rippleRewards.toLocaleString()}
            </div>
            <p className="text-gray-600 mb-4">Points from referred customers' StepUp rewards</p>
            <div className="bg-red-50 p-4 rounded-lg">
              <p className="text-sm text-red-800">
                <strong>How it works:</strong> Earn a percentage of your referred customers' 
                StepUp rewards: 50/100/150/700/1500 points based on their StepUp completion.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Shopping Vouchers */}
      <Card className="border-red-100">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2 text-red-600">
            <Gift className="w-5 h-5 text-red-500" />
            <span>Shopping Vouchers</span>
            <Badge variant="outline" className="bg-red-100 text-red-800 border-red-200">
              {rewardData.shoppingVouchers.length} Available
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {rewardData.shoppingVouchers.length > 0 ? (
            <div className="space-y-4">
              {rewardData.shoppingVouchers.map((voucher) => (
                <div key={voucher.id} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex justify-between items-center">
                    <div>
                      <div className="font-semibold text-gray-900">{voucher.merchantName}</div>
                      <div className="text-sm text-gray-600">Voucher ID: {voucher.id}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-lg font-bold text-red-600">
                        {voucher.pointsAmount.toLocaleString()} points
                      </div>
                      <div className="text-sm text-gray-600">
                        {voucher.isUsed ? 'Used' : 'Available'}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center text-gray-500">
              <Gift className="w-16 h-16 mx-auto mb-4 text-gray-300" />
              <p>No shopping vouchers available yet</p>
              <p className="text-sm">Complete Step 4 of any Global Number to earn shopping vouchers</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Award className="w-5 h-5 text-indigo-600" />
            <span>Reward System Summary</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="text-center p-4 bg-blue-50 rounded-lg">
              <div className="text-2xl font-bold text-blue-600 mb-1">
                {totalStepUpRewards.toLocaleString()}
              </div>
              <p className="text-sm text-gray-600">StepUp Rewards</p>
            </div>
            <div className="text-center p-4 bg-green-50 rounded-lg">
              <div className="text-2xl font-bold text-green-600 mb-1">
                {rewardData.affiliateRewards.toLocaleString()}
              </div>
              <p className="text-sm text-gray-600">Affiliate Rewards</p>
            </div>
            <div className="text-center p-4 bg-orange-50 rounded-lg">
              <div className="text-2xl font-bold text-orange-600 mb-1">
                {rewardData.rippleRewards.toLocaleString()}
              </div>
              <p className="text-sm text-gray-600">Ripple Rewards</p>
            </div>
            <div className="text-center p-4 bg-purple-50 rounded-lg">
              <div className="text-2xl font-bold text-purple-600 mb-1">
                {rewardData.totalRewardIncome.toLocaleString()}
              </div>
              <p className="text-sm text-gray-600">Total Income</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
