import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { 
  Trophy, Star, Gift, Coins, Award, CheckCircle, Lock, 
  ArrowRight, Sparkles, Crown, Target, TrendingUp, DollarSign,
  ShoppingBag, Recycle, Calendar, Users, Heart, Activity, TestTube
} from "lucide-react";

export default function RewardSystemTester() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedCustomer, setSelectedCustomer] = useState("");
  const [pointsToAdd, setPointsToAdd] = useState("");
  const [selectedSource, setSelectedSource] = useState("");

  // Get all customers for testing
  const { data: customers = [], isLoading: customersLoading } = useQuery({
    queryKey: ['/api/test/customers'],
    select: (data: any) => Array.isArray(data) ? data : []
  });

  // Get reward system data for selected customer
  const { data: rewardData, isLoading: dataLoading } = useQuery({
    queryKey: ['/api/customer/reward-system-data', selectedCustomer],
    enabled: !!selectedCustomer,
    select: (data: any) => data || null
  });

  // Add points mutation
  const addPointsMutation = useMutation({
    mutationFn: async ({ customerId, points, source }: { customerId: string; points: number; source: string }) => {
      const response = await fetch('/api/test/add-points-to-customer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ customerId, points, source })
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to add points');
      }
      
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Points Added Successfully!",
        description: data.message,
      });
      queryClient.invalidateQueries({ queryKey: ['/api/customer/reward-system-data'] });
      queryClient.invalidateQueries({ queryKey: ['/api/test/customers'] });
      setPointsToAdd("");
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to Add Points",
        description: error.message,
        variant: "destructive"
      });
    }
  });

  const handleAddPoints = () => {
    if (!selectedCustomer || !pointsToAdd || !selectedSource) {
      toast({
        title: "Missing Information",
        description: "Please select customer, enter points, and choose source",
        variant: "destructive"
      });
      return;
    }

    const points = parseInt(pointsToAdd);
    if (isNaN(points) || points <= 0) {
      toast({
        title: "Invalid Points",
        description: "Please enter a valid positive number",
        variant: "destructive"
      });
      return;
    }

    addPointsMutation.mutate({
      customerId: selectedCustomer,
      points,
      source: selectedSource
    });
  };

  const sourceOptions = [
    { value: 'purchase', label: '🛒 Purchase', icon: ShoppingBag },
    { value: 'waste_management', label: '♻️ Waste Management', icon: Recycle },
    { value: 'daily_login', label: '📅 Daily Login', icon: Calendar },
    { value: 'referral', label: '👥 Referral', icon: Users },
    { value: 'birthday', label: '🎂 Birthday', icon: Heart },
    { value: 'other', label: '⚡ Other Activity', icon: Activity }
  ];

  return (
    <div className="space-y-6 p-6 bg-gray-50 min-h-screen">
      {/* Header */}
      <Card className="bg-gradient-to-r from-blue-600 to-purple-600 text-white">
        <CardHeader>
          <CardTitle className="flex items-center text-2xl">
            <TestTube className="w-8 h-8 mr-3" />
            🧪 Reward System Tester
          </CardTitle>
          <CardDescription className="text-blue-100">
            Test the Bengali Document Logic - Add points and see the system work in real-time
          </CardDescription>
        </CardHeader>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Left Column - Testing Controls */}
        <div className="space-y-6">
          
          {/* Test Controls */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Target className="w-5 h-5 mr-2 text-blue-600" />
                Test Controls
              </CardTitle>
              <CardDescription>
                Add points to customers and see the reward system logic in action
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              
              {/* Customer Selection */}
              <div>
                <Label htmlFor="customer-select">Select Customer</Label>
                <Select value={selectedCustomer} onValueChange={setSelectedCustomer}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose a customer to test with" />
                  </SelectTrigger>
                  <SelectContent>
                    {customers.map((customer: any) => (
                      <SelectItem key={customer.id} value={customer.id}>
                        {customer.fullName} (ID: {customer.id.slice(0, 8)}...) - {customer.totalPointsEarned} total points
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Points Input */}
              <div>
                <Label htmlFor="points-input">Points to Add</Label>
                <Input
                  id="points-input"
                  type="number"
                  value={pointsToAdd}
                  onChange={(e) => setPointsToAdd(e.target.value)}
                  placeholder="Enter points (e.g., 100, 500, 1500)"
                  min="1"
                />
              </div>

              {/* Source Selection */}
              <div>
                <Label htmlFor="source-select">Point Source</Label>
                <Select value={selectedSource} onValueChange={setSelectedSource}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose point source" />
                  </SelectTrigger>
                  <SelectContent>
                    {sourceOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Add Points Button */}
              <Button 
                onClick={handleAddPoints}
                disabled={addPointsMutation.isPending || !selectedCustomer || !pointsToAdd || !selectedSource}
                className="w-full bg-green-600 hover:bg-green-700"
                size="lg"
              >
                <Coins className="w-4 h-4 mr-2" />
                {addPointsMutation.isPending ? "Adding Points..." : "Add Points & Test System"}
              </Button>

              {/* Quick Test Buttons */}
              <div className="border-t pt-4">
                <Label className="text-sm font-semibold text-gray-700 mb-2 block">Quick Tests:</Label>
                <div className="grid grid-cols-2 gap-2">
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => {
                      setPointsToAdd("1500");
                      setSelectedSource("purchase");
                    }}
                  >
                    Test 1500 Points
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => {
                      setPointsToAdd("800");
                      setSelectedSource("purchase");
                    }}
                  >
                    Test 800 Points
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => {
                      setPointsToAdd("100");
                      setSelectedSource("daily_login");
                    }}
                  >
                    Test Daily Login
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => {
                      setPointsToAdd("50");
                      setSelectedSource("waste_management");
                    }}
                  >
                    Test Recycling
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* System Logic Explanation */}
          <Card className="bg-blue-50 border-blue-200">
            <CardHeader>
              <CardTitle className="text-blue-800">📋 Bengali Document Logic</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-blue-700 space-y-2">
              <p><strong>Accumulated Points:</strong> Points accumulate up to 1499. At 1500, they convert to Global Reward Number.</p>
              <p><strong>Global Reward Numbers:</strong> 4-tier system (800/1500/3500/32200 points) with rewards.</p>
              <p><strong>Reward Income:</strong> StepUp, Infinity, Affiliate (5%), Ripple (50/100/150/700).</p>
              <p><strong>Balance Wallet:</strong> Transfer from reward income with 12.5% VAT + 5% service charge.</p>
              <p><strong>Serial Numbers:</strong> Assigned based on achievement order when reaching 1500 points.</p>
            </CardContent>
          </Card>
        </div>

        {/* Right Column - Real-time Results */}
        <div className="space-y-6">
          
          {/* Selected Customer Data */}
          {selectedCustomer && rewardData && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Crown className="w-5 h-5 mr-2 text-yellow-600" />
                  Customer Reward Data
                </CardTitle>
                <CardDescription>
                  Real-time data for selected customer
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                
                {/* Accumulated Points */}
                <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-semibold text-blue-900">Accumulated Points</span>
                    <Coins className="w-4 h-4 text-blue-600" />
                  </div>
                  <div className="text-3xl font-bold text-blue-600 mb-2">
                    {rewardData.accumulatedPoints.totalAccumulated}
                  </div>
                  <div className="text-xs text-blue-700">
                    {1500 - rewardData.accumulatedPoints.totalAccumulated > 0 
                      ? `${1500 - rewardData.accumulatedPoints.totalAccumulated} points to Global Reward Number`
                      : 'Ready for Global Reward Number!'
                    }
                  </div>
                </div>

                {/* Item-wise Breakdown */}
                <div className="grid grid-cols-2 gap-2">
                  <div className="p-2 bg-green-50 rounded text-center">
                    <div className="text-sm font-medium text-green-800">Purchase</div>
                    <div className="text-lg font-bold text-green-600">
                      {rewardData.accumulatedPoints.purchasePoints}
                    </div>
                  </div>
                  <div className="p-2 bg-purple-50 rounded text-center">
                    <div className="text-sm font-medium text-purple-800">Daily Login</div>
                    <div className="text-lg font-bold text-purple-600">
                      {rewardData.accumulatedPoints.dailyLoginPoints}
                    </div>
                  </div>
                  <div className="p-2 bg-orange-50 rounded text-center">
                    <div className="text-sm font-medium text-orange-800">Referrals</div>
                    <div className="text-lg font-bold text-orange-600">
                      {rewardData.accumulatedPoints.referralPoints}
                    </div>
                  </div>
                  <div className="p-2 bg-pink-50 rounded text-center">
                    <div className="text-sm font-medium text-pink-800">Other</div>
                    <div className="text-lg font-bold text-pink-600">
                      {rewardData.accumulatedPoints.otherActivityPoints}
                    </div>
                  </div>
                </div>

                {/* Global Reward Numbers */}
                <div className="p-4 bg-yellow-50 rounded-lg border border-yellow-200">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-semibold text-yellow-900">Global Reward Numbers</span>
                    <Trophy className="w-4 h-4 text-yellow-600" />
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-center">
                    <div>
                      <div className="text-lg font-bold text-yellow-600">{rewardData.totalGlobalNumbers}</div>
                      <div className="text-xs text-yellow-700">Total</div>
                    </div>
                    <div>
                      <div className="text-lg font-bold text-green-600">{rewardData.completedGlobalNumbers}</div>
                      <div className="text-xs text-green-700">Completed</div>
                    </div>
                    <div>
                      <div className="text-lg font-bold text-blue-600">{rewardData.activeGlobalNumbers}</div>
                      <div className="text-xs text-blue-700">Active</div>
                    </div>
                  </div>
                </div>

                {/* Reward Income */}
                <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-semibold text-green-900">Reward Income</span>
                    <DollarSign className="w-4 h-4 text-green-600" />
                  </div>
                  <div className="text-2xl font-bold text-green-600 mb-2">
                    {rewardData.rewardIncome.totalRewardIncome} Taka
                  </div>
                  <div className="text-xs text-green-700">Available for transfer to Balance Wallet</div>
                </div>

                {/* Serial Numbers */}
                <div className="grid grid-cols-2 gap-2">
                  <div className="p-2 bg-blue-50 rounded text-center">
                    <div className="text-sm font-medium text-blue-800">Global Serial</div>
                    <div className="text-lg font-bold text-blue-600">
                      {rewardData.globalSerial.assigned}/{rewardData.globalSerial.total}
                    </div>
                  </div>
                  <div className="p-2 bg-purple-50 rounded text-center">
                    <div className="text-sm font-medium text-purple-800">Balance Wallet</div>
                    <div className="text-lg font-bold text-purple-600">
                      {rewardData.balanceWallet} TK
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Instructions */}
          <Card className="bg-green-50 border-green-200">
            <CardHeader>
              <CardTitle className="text-green-800">🎯 How to Test</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-green-700 space-y-2">
              <p><strong>1.</strong> Select a customer from the dropdown</p>
              <p><strong>2.</strong> Enter points to add (try 100, 500, 1500)</p>
              <p><strong>3.</strong> Choose a point source (Purchase, Daily Login, etc.)</p>
              <p><strong>4.</strong> Click "Add Points & Test System"</p>
              <p><strong>5.</strong> Watch the real-time data update on the right</p>
              <p><strong>6.</strong> Try adding 1500 points to see Global Reward Number creation!</p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}