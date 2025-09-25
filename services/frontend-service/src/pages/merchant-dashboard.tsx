import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState, useEffect } from 'react';
import { Link } from 'wouter';
import { useAuth } from '@/hooks/use-auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import { 
  LayoutDashboard, Package, ShoppingCart, Coins, BarChart, 
  Plus, Edit, Trash2, DollarSign, TrendingUp, Users, Store,
  Star, Award, Calendar, Eye, Settings, Target, Copy,
  CreditCard, Wallet, Send, Download, Gift, Crown,
  ArrowUpRight, ArrowDownRight, Filter, Search, MoreHorizontal,
  QrCode, UserPlus, Activity, PieChart, LineChart, Bell,
  Menu, X as XIcon, Home, Infinity, Trophy, User, Zap,
  AlertCircle, Percent, Calculator, Building2
} from 'lucide-react';
import { ResponsiveContainer, LineChart as RechartsLine, Line, XAxis, YAxis, CartesianGrid, Tooltip, 
         BarChart as RechartsBar, Bar, PieChart as RechartsPie, Pie, Cell } from 'recharts';

export default function MerchantDashboard() {
  const { user, profile } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [activeSection, setActiveSection] = useState('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showSendPointsDialog, setShowSendPointsDialog] = useState(false);
  const [showPurchaseDialog, setShowPurchaseDialog] = useState(false);
  const [showWithdrawDialog, setShowWithdrawDialog] = useState(false);
  const [showTransferDialog, setShowTransferDialog] = useState(false);
  const [showRechargeDialog, setShowRechargeDialog] = useState(false);
  const [showSaleDialog, setShowSaleDialog] = useState(false);
  const [showReportDialog, setShowReportDialog] = useState(false);

  const { data: dashboardData = {}, isLoading } = useQuery({
    queryKey: ['/api/dashboard/merchant'],
    enabled: !!user && user.role === 'merchant'
  });

  const { data: walletData = {}, isLoading: walletsLoading } = useQuery({
    queryKey: ['/api/merchant/wallet'],
    enabled: !!user && user.role === 'merchant'
  });

  const { data: customers = [] } = useQuery({
    queryKey: ['/api/merchant/customers'],
    enabled: !!user && user.role === 'merchant'
  });

  const { data: leaderboard = [] } = useQuery({
    queryKey: ['/api/merchant/leaderboard'],
    enabled: !!user && user.role === 'merchant'
  });

  const { data: merchantProfile = {} } = useQuery({
    queryKey: ['/api/merchant/profile'],
    enabled: !!user && user.role === 'merchant'
  });

  // Mutations
  const sendPointsMutation = useMutation({
    mutationFn: (data: { customerId: string; points: number; description: string }) => {
      return apiRequest('/api/merchant/rewards/send', 'POST', data);
    },
    onSuccess: () => {
      toast({ title: "Success", description: "Points sent successfully!" });
      queryClient.invalidateQueries({ queryKey: ['/api/merchant/wallet'] });
      queryClient.invalidateQueries({ queryKey: ['/api/dashboard/merchant'] });
      queryClient.invalidateQueries({ queryKey: ['/api/merchant/scanned-customers'] });
      queryClient.invalidateQueries({ queryKey: ['/api/merchant/profile'] });
      queryClient.invalidateQueries({ queryKey: ['/api/merchant/leaderboard'] });
      
      // Remove cached data to force fresh fetch
      queryClient.removeQueries({ queryKey: ['/api/merchant/wallet'] });
      queryClient.removeQueries({ queryKey: ['/api/dashboard/merchant'] });
      queryClient.removeQueries({ queryKey: ['/api/merchant/scanned-customers'] });
      
      // Force immediate refetch
      setTimeout(() => {
        queryClient.refetchQueries({ queryKey: ['/api/merchant/wallet'] });
        queryClient.refetchQueries({ queryKey: ['/api/dashboard/merchant'] });
      }, 100);
      queryClient.invalidateQueries({ queryKey: ['/api/merchant/customers'] });
      setShowSendPointsDialog(false);
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message || "Failed to send points" });
    }
  });

  const purchasePointsMutation = useMutation({
    mutationFn: (data: { amount: number; paymentMethod: string }) => {
      return apiRequest('/api/merchant/points/purchase', 'POST', data);
    },
    onSuccess: () => {
      toast({ title: "Success", description: "Points purchased successfully!" });
      queryClient.invalidateQueries({ queryKey: ['/api/merchant/wallet'] });
      queryClient.invalidateQueries({ queryKey: ['/api/dashboard/merchant'] });
      queryClient.invalidateQueries({ queryKey: ['/api/merchant/scanned-customers'] });
      queryClient.invalidateQueries({ queryKey: ['/api/merchant/profile'] });
      queryClient.invalidateQueries({ queryKey: ['/api/merchant/leaderboard'] });
      
      // Remove cached data to force fresh fetch
      queryClient.removeQueries({ queryKey: ['/api/merchant/wallet'] });
      queryClient.removeQueries({ queryKey: ['/api/dashboard/merchant'] });
      queryClient.removeQueries({ queryKey: ['/api/merchant/scanned-customers'] });
      
      // Force immediate refetch
      setTimeout(() => {
        queryClient.refetchQueries({ queryKey: ['/api/merchant/wallet'] });
        queryClient.refetchQueries({ queryKey: ['/api/dashboard/merchant'] });
      }, 100);
      setShowPurchaseDialog(false);
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message || "Failed to purchase points" });
    }
  });

  const withdrawMutation = useMutation({
    mutationFn: (data: { amount: number; bankAccount: string }) => {
      return apiRequest('/api/merchant/wallet/withdraw', 'POST', data);
    },
    onSuccess: () => {
      toast({ title: "Success", description: "Withdrawal request submitted!" });
      queryClient.invalidateQueries({ queryKey: ['/api/merchant/wallet'] });
      queryClient.invalidateQueries({ queryKey: ['/api/dashboard/merchant'] });
      queryClient.invalidateQueries({ queryKey: ['/api/merchant/scanned-customers'] });
      queryClient.invalidateQueries({ queryKey: ['/api/merchant/profile'] });
      queryClient.invalidateQueries({ queryKey: ['/api/merchant/leaderboard'] });
      
      // Remove cached data to force fresh fetch
      queryClient.removeQueries({ queryKey: ['/api/merchant/wallet'] });
      queryClient.removeQueries({ queryKey: ['/api/dashboard/merchant'] });
      queryClient.removeQueries({ queryKey: ['/api/merchant/scanned-customers'] });
      
      // Force immediate refetch
      setTimeout(() => {
        queryClient.refetchQueries({ queryKey: ['/api/merchant/wallet'] });
        queryClient.refetchQueries({ queryKey: ['/api/dashboard/merchant'] });
      }, 100);
      setShowWithdrawDialog(false);
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message || "Failed to process withdrawal" });
    }
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="container mx-auto px-4 py-8">
          <div className="animate-pulse space-y-8">
            <div className="h-8 bg-gray-200 rounded w-1/4"></div>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="h-32 bg-gray-200 rounded-lg"></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Merchant data from API
  const merchantData = {
    loyaltyPoints: walletData?.rewardPointBalance || 0,
    totalCashback: walletData?.cashbackIncome || 0,
    balance: walletData?.commerceWalletBalance || 0,
    incomeBalance: walletData?.incomeWalletBalance || 0,
    registeredCustomers: customers?.length || 0,
    merchantName: merchantProfile?.user?.businessName || "Tech Store",
    tier: "Star Merchant",
    joinedDate: "Aug 2025",
    referralLink: "komarce.com/ref/m001",
    // Wallet breakdown
    rewardPointBalance: walletData?.rewardPointBalance || 0,
    totalPointsIssued: walletData?.totalPointsIssued || 0,
    cashbackIncome: walletData?.cashbackIncome || 0,
    referralIncome: walletData?.referralIncome || 0,
    royaltyIncome: walletData?.royaltyIncome || 0,
    totalDeposited: walletData?.totalDeposited || 0,
    totalWithdrawn: walletData?.totalWithdrawn || 0
  };

  const pointDistributionData = [
    { month: 'Jan', points: 0 },
    { month: 'Feb', points: 300 },
    { month: 'Mar', points: 200 },
    { month: 'Apr', points: 250 },
    { month: 'May', points: 200 },
    { month: 'Jun', points: 250 },
    { month: 'Jul', points: 0 }
  ];

  const weeklyDistributionData = [
    { day: 'Mon', points: 120 },
    { day: 'Tue', points: 200 },
    { day: 'Wed', points: 300 },
    { day: 'Thu', points: 250 },
    { day: 'Fri', points: 400 },
    { day: 'Sat', points: 350 },
    { day: 'Sun', points: 280 }
  ];

  const marketingData = {
    templatesDownloaded: 1200,
    campaignViews: 15600,
    socialShares: 890,
    engagementRate: 7.2
  };

  const leaderboardData = leaderboard || [
    { rank: 1, name: "Ahmed Hassan", code: "AH01", points: 15420, customers: 247, revenue: 45600, tier: "Co Founder" },
    { rank: 2, name: "Sarah Khan", code: "SK02", points: 14250, customers: 198, revenue: 38900, tier: "Regional Manager" },
    { rank: 3, name: "Mohammad Ali", code: "MA03", points: 13890, customers: 176, revenue: 35200, tier: "Business Manager" },
    { rank: 4, name: "Fatima Rahman", code: "FR04", points: 12500, customers: 165, revenue: 32800, tier: "Super Star Merchant" }
  ];

  // Render Main Dashboard
  const renderDashboard = () => (
    <div className="space-y-6">
      {/* Welcome Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Welcome back</h1>
          <p className="text-gray-600">Here's what's happening with your business today</p>
        </div>
        <div className="relative">
          <Bell className="w-6 h-6 text-gray-600" />
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">1</span>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Loyalty Points</p>
                <div className="flex items-center space-x-2">
                  <p className="text-2xl font-bold text-gray-900">{merchantData.loyaltyPoints}</p>
                </div>
                <p className="text-xs text-green-600 flex items-center mt-1">
                  <ArrowUpRight className="w-3 h-3 mr-1" />
                  +12.5% from last month
                </p>
              </div>
              <div className="w-12 h-12 bg-purple-100 rounded-2xl flex items-center justify-center">
                <Infinity className="w-6 h-6 text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Cashback</p>
                <div className="flex items-center space-x-2">
                  <span className="text-orange-600">৳</span>
                  <p className="text-2xl font-bold text-gray-900">{merchantData.totalCashback}</p>
                </div>
                <p className="text-xs text-green-600 flex items-center mt-1">
                  <ArrowUpRight className="w-3 h-3 mr-1" />
                  +6.2% from last month
                </p>
              </div>
              <div className="w-12 h-12 bg-orange-100 rounded-2xl flex items-center justify-center">
                <DollarSign className="w-6 h-6 text-orange-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Balance</p>
                <div className="flex items-center space-x-2">
                  <span className="text-green-600">৳</span>
                  <p className="text-2xl font-bold text-gray-900">{merchantData.balance}</p>
                </div>
                <p className="text-xs text-gray-500 mt-1">After VAT & Service Charge</p>
              </div>
              <div className="w-12 h-12 bg-green-100 rounded-2xl flex items-center justify-center">
                <Wallet className="w-6 h-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Registered Customers</p>
                <div className="flex items-center space-x-2">
                  <p className="text-2xl font-bold text-gray-900">{merchantData.registeredCustomers}</p>
                </div>
                <p className="text-xs text-green-600 flex items-center mt-1">
                  <ArrowUpRight className="w-3 h-3 mr-1" />
                  +10 new this week
                </p>
              </div>
              <div className="w-12 h-12 bg-blue-100 rounded-2xl flex items-center justify-center">
                <Users className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts and Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Point Distribution Trend */}
        <Card>
          <CardHeader>
            <CardTitle>Point Distribution Trend</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <RechartsLine data={pointDistributionData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip />
                  <Line type="monotone" dataKey="points" stroke="#8884d8" strokeWidth={2} />
                </RechartsLine>
              </ResponsiveContainer>
            </div>
            <div className="mt-4 flex justify-between text-sm text-gray-600">
              <span>0 Points Distributed Today</span>
              <span>0 Monthly Total</span>
            </div>
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button 
              onClick={() => setShowSendPointsDialog(true)}
              className="w-full justify-start bg-blue-600 hover:bg-blue-700"
            >
              <Send className="w-4 h-4 mr-2" />
              Transfer Points
            </Button>
            <Button 
              onClick={() => setShowPurchaseDialog(true)}
              className="w-full justify-start bg-green-600 hover:bg-green-700"
            >
              <Plus className="w-4 h-4 mr-2" />
              Purchase Points
            </Button>
            <Button 
              onClick={() => setShowWithdrawDialog(true)}
              className="w-full justify-start bg-orange-600 hover:bg-orange-700"
            >
              <Wallet className="w-4 h-4 mr-2" />
              Withdraw Balance
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Referral Program */}
      <Card>
        <CardHeader>
          <CardTitle>Referral Program</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <p className="text-sm text-gray-600">Referred Merchants: 0</p>
              <p className="text-sm text-gray-600">Commission Earned: ৳0</p>
            </div>
            <div>
              <Button variant="outline" className="w-full">
                <Copy className="w-4 h-4 mr-2" />
                Your Referral Link
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );

  // Render Loyalty Points Section
  const renderLoyaltyPoints = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">Reward Point Wallet</h2>
        <Button onClick={() => setShowSendPointsDialog(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Issue Points
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="text-center">
              <p className="text-3xl font-bold text-purple-600">{merchantData.rewardPointBalance}</p>
              <p className="text-sm text-gray-600">Available Points</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="text-center">
              <p className="text-3xl font-bold text-green-600">{merchantData.totalPointsIssued}</p>
              <p className="text-sm text-gray-600">Total Points Issued</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="text-center">
              <p className="text-3xl font-bold text-blue-600">0</p>
              <p className="text-sm text-gray-600">Points Issued Today</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent Point Transactions</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Points</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow>
                <TableCell colSpan={4} className="text-center text-gray-500">
                  No recent transactions
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );

  // Render Income Wallet Section
  const renderIncomeWallet = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">Income Wallet</h2>
        <Button onClick={() => setShowTransferDialog(true)}>
          <Send className="w-4 h-4 mr-2" />
          Transfer to Commerce
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="text-center">
              <p className="text-3xl font-bold text-green-600">৳{merchantData.incomeBalance}</p>
              <p className="text-sm text-gray-600">Total Income Balance</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="text-center">
              <p className="text-3xl font-bold text-orange-600">৳{merchantData.cashbackIncome}</p>
              <p className="text-sm text-gray-600">15% Cashback Income</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="text-center">
              <p className="text-3xl font-bold text-blue-600">৳{merchantData.referralIncome}</p>
              <p className="text-sm text-gray-600">2% Referral Income</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="text-center">
              <p className="text-3xl font-bold text-purple-600">৳{merchantData.royaltyIncome}</p>
              <p className="text-sm text-gray-600">1% Royalty Income</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Income Breakdown</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">15% Cashback (on 1500+ Taka discount)</span>
                <span className="font-semibold">৳{merchantData.cashbackIncome}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">2% Referral (per 1000 Taka sales)</span>
                <span className="font-semibold">৳{merchantData.referralIncome}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">1% Royalty (monthly distribution)</span>
                <span className="font-semibold">৳{merchantData.royaltyIncome}</span>
              </div>
              <Separator />
              <div className="flex justify-between items-center font-bold">
                <span>Total Income</span>
                <span>৳{merchantData.incomeBalance}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Transfer to Commerce Wallet</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <p className="text-sm text-gray-600">
                Transfer funds from Income Wallet to Commerce Wallet. 
                A 12.5% VAT and service charge will be applied during transfer.
              </p>
              <Button 
                onClick={() => setShowTransferDialog(true)}
                className="w-full"
                disabled={merchantData.incomeBalance <= 0}
              >
                <Send className="w-4 h-4 mr-2" />
                Transfer to Commerce Wallet
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );

  // Render Commerce Wallet Section
  const renderCommerceWallet = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">Commerce Wallet</h2>
        <div className="flex space-x-2">
          <Button onClick={() => setShowPurchaseDialog(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Add Balance
          </Button>
          <Button onClick={() => setShowWithdrawDialog(true)}>
            <Wallet className="w-4 h-4 mr-2" />
            Withdraw
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="text-center">
              <p className="text-3xl font-bold text-green-600">৳{merchantData.balance}</p>
              <p className="text-sm text-gray-600">Available Balance</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="text-center">
              <p className="text-3xl font-bold text-blue-600">৳{merchantData.totalDeposited}</p>
              <p className="text-sm text-gray-600">Total Deposited</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="text-center">
              <p className="text-3xl font-bold text-orange-600">৳{merchantData.totalWithdrawn}</p>
              <p className="text-sm text-gray-600">Total Withdrawn</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Wallet Features</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                  <Plus className="w-4 h-4 text-green-600" />
                </div>
                <div>
                  <p className="font-medium">Add Balance</p>
                  <p className="text-sm text-gray-600">Deposit from bank or mobile financial services</p>
                </div>
              </div>
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                  <Send className="w-4 h-4 text-blue-600" />
                </div>
                <div>
                  <p className="font-medium">Transfer from Income</p>
                  <p className="text-sm text-gray-600">Transfer from Income Wallet (12.5% VAT applies)</p>
                </div>
              </div>
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-orange-100 rounded-full flex items-center justify-center">
                  <Wallet className="w-4 h-4 text-orange-600" />
                </div>
                <div>
                  <p className="font-medium">Withdraw</p>
                  <p className="text-sm text-gray-600">Withdraw to bank account (profile required)</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Withdrawal Requirements</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <p className="text-sm text-gray-600">Complete your profile to enable withdrawals:</p>
              <ul className="text-sm space-y-1">
                <li className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-gray-300 rounded-full"></div>
                  <span>Father's name</span>
                </li>
                <li className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-gray-300 rounded-full"></div>
                  <span>Mother's name</span>
                </li>
                <li className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-gray-300 rounded-full"></div>
                  <span>NID/Passport number</span>
                </li>
                <li className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-gray-300 rounded-full"></div>
                  <span>Nominee details</span>
                </li>
              </ul>
              <Button variant="outline" size="sm" className="mt-3">
                <Edit className="w-4 h-4 mr-2" />
                Update Profile
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );

  // Render Customers Section
  const renderCustomers = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">Customer Management</h2>
        <Button>
          <UserPlus className="w-4 h-4 mr-2" />
          Add Customer
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="text-center">
              <p className="text-3xl font-bold text-blue-600">{merchantData.registeredCustomers}</p>
              <p className="text-sm text-gray-600">Total Customers</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="text-center">
              <p className="text-3xl font-bold text-green-600">0</p>
              <p className="text-sm text-gray-600">Active Today</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="text-center">
              <p className="text-3xl font-bold text-purple-600">0</p>
              <p className="text-sm text-gray-600">New This Week</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="text-center">
              <p className="text-3xl font-bold text-orange-600">0</p>
              <p className="text-sm text-gray-600">Points Redeemed</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Customer List</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Points</TableHead>
                <TableHead>Last Visit</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {customers.length > 0 ? customers.map((customer: any) => (
                <TableRow key={customer.id}>
                  <TableCell>{customer.firstName} {customer.lastName}</TableCell>
                  <TableCell>{customer.email}</TableCell>
                  <TableCell>{customer.totalPoints || 0}</TableCell>
                  <TableCell>{new Date(customer.lastLoginAt || customer.createdAt).toLocaleDateString()}</TableCell>
                  <TableCell>
                    <Button variant="outline" size="sm">
                      <Eye className="w-4 h-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              )) : (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-gray-500">
                    No customers found
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );

  // Render Leaderboard Section
  const renderLeaderboard = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">Merchant Leaderboard</h2>
        <Badge variant="outline" className="text-yellow-600 border-yellow-600">
          <Star className="w-4 h-4 mr-1" />
          {merchantData.tier}
        </Badge>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Top Performers</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Rank</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Code</TableHead>
                <TableHead>Points</TableHead>
                <TableHead>Customers</TableHead>
                <TableHead>Revenue</TableHead>
                <TableHead>Tier</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {leaderboardData.map((merchant: any) => (
                <TableRow key={merchant.rank}>
                  <TableCell>
                    <Badge variant={merchant.rank <= 3 ? "default" : "secondary"}>
                      #{merchant.rank}
                    </Badge>
                  </TableCell>
                  <TableCell className="font-medium">{merchant.name}</TableCell>
                  <TableCell>{merchant.code}</TableCell>
                  <TableCell>{merchant.points.toLocaleString()}</TableCell>
                  <TableCell>{merchant.customers}</TableCell>
                  <TableCell>৳{merchant.revenue.toLocaleString()}</TableCell>
                  <TableCell>
                    <Badge variant="outline">{merchant.tier}</Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );

  // Render Profile Section
  const renderProfile = () => (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-900">Profile Settings</h2>
      
      <Card>
        <CardHeader>
          <CardTitle>Business Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="businessName">Business Name</Label>
              <Input id="businessName" value={merchantData.merchantName} readOnly />
            </div>
            <div>
              <Label htmlFor="tier">Current Tier</Label>
              <Input id="tier" value={merchantData.tier} readOnly />
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="joinedDate">Joined Date</Label>
              <Input id="joinedDate" value={merchantData.joinedDate} readOnly />
            </div>
            <div>
              <Label htmlFor="referralLink">Referral Link</Label>
              <Input id="referralLink" value={merchantData.referralLink} readOnly />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );

  // Render Point Recharge Section
  const renderPointRecharge = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">Point Recharge System</h2>
        <Button onClick={() => setShowRechargeDialog(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Request Recharge
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="text-center">
              <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <DollarSign className="w-6 h-6 text-blue-600" />
              </div>
              <h3 className="font-semibold text-gray-900">Direct Cash Payment</h3>
              <p className="text-sm text-gray-600 mt-2">Pay cash directly to the company</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="text-center">
              <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <CreditCard className="w-6 h-6 text-green-600" />
              </div>
              <h3 className="font-semibold text-gray-900">Bank/Mobile Transfer</h3>
              <p className="text-sm text-gray-600 mt-2">Transfer to company account and request points</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="text-center">
              <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Zap className="w-6 h-6 text-purple-600" />
              </div>
              <h3 className="font-semibold text-gray-900">Automatic Payment Gateway</h3>
              <p className="text-sm text-gray-600 mt-2">Instant recharge via payment gateway</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recharge History</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Method</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Points</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow>
                <TableCell colSpan={5} className="text-center text-gray-500">
                  No recharge history found
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );

  // Render Product Sales Section
  const renderProductSales = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">Product Sales with Mandatory Discounts</h2>
        <Button onClick={() => setShowSaleDialog(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Record Sale
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Mandatory Discount Rules</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center">
                  <AlertCircle className="w-4 h-4 text-red-600" />
                </div>
                <div>
                  <p className="font-medium text-red-800">Reward Points (Mandatory)</p>
                  <p className="text-sm text-gray-600">Must give reward points for every sale</p>
                </div>
              </div>
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                  <DollarSign className="w-4 h-4 text-blue-600" />
                </div>
                <div>
                  <p className="font-medium text-blue-800">Cash Discount (Optional)</p>
                  <p className="text-sm text-gray-600">Additional cash discount is optional</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Distribution Methods</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                  <Edit className="w-4 h-4 text-green-600" />
                </div>
                <div>
                  <p className="font-medium">Manual Distribution</p>
                  <p className="text-sm text-gray-600">Give points as you wish</p>
                </div>
              </div>
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center">
                  <Percent className="w-4 h-4 text-purple-600" />
                </div>
                <div>
                  <p className="font-medium">Automatic Percentage</p>
                  <p className="text-sm text-gray-600">Pre-set percentage of sales amount</p>
                </div>
              </div>
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-orange-100 rounded-full flex items-center justify-center">
                  <Calculator className="w-4 h-4 text-orange-600" />
                </div>
                <div>
                  <p className="font-medium">Automatic Fixed</p>
                  <p className="text-sm text-gray-600">Pre-set fixed amount per product</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent Sales</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Product</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Points Given</TableHead>
                <TableHead>Cash Discount</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow>
                <TableCell colSpan={6} className="text-center text-gray-500">
                  No sales recorded yet
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );

  // Render Activity Tracking Section
  const renderActivityTracking = () => (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-900">Merchant Activity Tracking</h2>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="text-center">
              <p className="text-3xl font-bold text-green-600">0</p>
              <p className="text-sm text-gray-600">Points Distributed This Month</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="text-center">
              <p className="text-3xl font-bold text-blue-600">1000</p>
              <p className="text-sm text-gray-600">Required Points</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="text-center">
              <Badge variant="default" className="bg-green-100 text-green-800">
                Active
              </Badge>
              <p className="text-sm text-gray-600 mt-2">Current Status</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Activity Requirements</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <p className="text-sm text-gray-600">
              To remain active, merchants must distribute a minimum number of points to customers each month.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 border rounded-lg">
                <h4 className="font-semibold">Basic Level</h4>
                <p className="text-2xl font-bold text-blue-600">1,000</p>
                <p className="text-sm text-gray-600">Points per month</p>
              </div>
              <div className="p-4 border rounded-lg">
                <h4 className="font-semibold">Standard Level</h4>
                <p className="text-2xl font-bold text-green-600">2,000</p>
                <p className="text-sm text-gray-600">Points per month</p>
              </div>
              <div className="p-4 border rounded-lg">
                <h4 className="font-semibold">Premium Level</h4>
                <p className="text-2xl font-bold text-purple-600">5,000</p>
                <p className="text-sm text-gray-600">Points per month</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );

  // Render Distribution Reports Section
  const renderDistributionReports = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">Point Distribution Reports</h2>
        <Button onClick={() => setShowReportDialog(true)}>
          <BarChart className="w-4 h-4 mr-2" />
          Generate Report
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Report Types</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                  <Package className="w-4 h-4 text-blue-600" />
                </div>
                <div>
                  <p className="font-medium">Product-wise Report</p>
                  <p className="text-sm text-gray-600">Points distributed by product</p>
                </div>
              </div>
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                  <Building2 className="w-4 h-4 text-green-600" />
                </div>
                <div>
                  <p className="font-medium">Supplier-wise Report</p>
                  <p className="text-sm text-gray-600">Points distributed by supplier company</p>
                </div>
              </div>
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center">
                  <Users className="w-4 h-4 text-purple-600" />
                </div>
                <div>
                  <p className="font-medium">Customer-wise Report</p>
                  <p className="text-sm text-gray-600">Points distributed to customers</p>
                </div>
              </div>
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-orange-100 rounded-full flex items-center justify-center">
                  <Calendar className="w-4 h-4 text-orange-600" />
                </div>
                <div>
                  <p className="font-medium">Monthly Summary</p>
                  <p className="text-sm text-gray-600">Monthly distribution summary</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Example Report</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex justify-between items-center p-3 bg-gray-50 rounded">
                <span className="font-medium">RIBANA Cosmetics</span>
                <div className="text-right">
                  <p className="font-semibold">1,250 points</p>
                  <p className="text-sm text-gray-600">৳12,500 sales</p>
                </div>
              </div>
              <div className="flex justify-between items-center p-3 bg-gray-50 rounded">
                <span className="font-medium">Electronics Hub</span>
                <div className="text-right">
                  <p className="font-semibold">850 points</p>
                  <p className="text-sm text-gray-600">৳8,500 sales</p>
                </div>
              </div>
              <div className="flex justify-between items-center p-3 bg-gray-50 rounded">
                <span className="font-medium">Fashion Store</span>
                <div className="text-right">
                  <p className="font-semibold">650 points</p>
                  <p className="text-sm text-gray-600">৳6,500 sales</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Generated Reports</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Report Type</TableHead>
                <TableHead>Period</TableHead>
                <TableHead>Total Points</TableHead>
                <TableHead>Generated</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow>
                <TableCell colSpan={5} className="text-center text-gray-500">
                  No reports generated yet
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Top Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className="lg:hidden"
              >
                <Menu className="w-5 h-5" />
              </Button>
              <div className="w-10 h-10 bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-lg">K</span>
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">KOMARCE Merchant Portal</h1>
                <p className="text-sm text-gray-500">Welcome, {merchantData.merchantName}</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              <Badge variant="default" className="px-3 py-1 bg-yellow-100 text-yellow-800">
                <Star className="w-4 h-4 mr-1" />
                {merchantData.tier}
              </Badge>
              <div className="text-sm text-gray-600">
                <span className="font-medium">75% to next rank</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="flex">
        {/* Sidebar */}
        <div className={`${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} fixed inset-y-0 left-0 z-50 w-64 bg-white shadow-lg transform transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static lg:inset-0`}>
          <div className="flex items-center justify-between h-16 px-4 border-b">
            <h2 className="text-lg font-semibold text-gray-900">Merchant Sidebar</h2>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSidebarOpen(false)}
              className="lg:hidden"
            >
              <XIcon className="w-5 h-5" />
            </Button>
          </div>
          
          <ScrollArea className="h-[calc(100vh-4rem)]">
            <nav className="p-4 space-y-2">
              <Button
                variant={activeSection === "dashboard" ? "default" : "ghost"}
                className="w-full justify-start"
                onClick={() => setActiveSection("dashboard")}
              >
                <Home className="w-4 h-4 mr-2" />
                Dashboard
              </Button>
              
              <Button
                variant={activeSection === "loyalty-points" ? "default" : "ghost"}
                className="w-full justify-start"
                onClick={() => setActiveSection("loyalty-points")}
              >
                <Infinity className="w-4 h-4 mr-2" />
                Reward Points
              </Button>
              
              <Button
                variant={activeSection === "income-wallet" ? "default" : "ghost"}
                className="w-full justify-start"
                onClick={() => setActiveSection("income-wallet")}
              >
                <DollarSign className="w-4 h-4 mr-2" />
                Income Wallet
              </Button>
              
              <Button
                variant={activeSection === "customers" ? "default" : "ghost"}
                className="w-full justify-start"
                onClick={() => setActiveSection("customers")}
              >
                <Users className="w-4 h-4 mr-2" />
                Customers
              </Button>
              
              <Button
                variant={activeSection === "wallets" ? "default" : "ghost"}
                className="w-full justify-start"
                onClick={() => setActiveSection("wallets")}
              >
                <Wallet className="w-4 h-4 mr-2" />
                Wallets
              </Button>
              
              <Button
                variant={activeSection === "marketing" ? "default" : "ghost"}
                className="w-full justify-start"
                onClick={() => setActiveSection("marketing")}
              >
                <Target className="w-4 h-4 mr-2" />
                Marketing Tools
              </Button>
              
              <Button
                variant={activeSection === "leaderboard" ? "default" : "ghost"}
                className="w-full justify-start"
                onClick={() => setActiveSection("leaderboard")}
              >
                <Trophy className="w-4 h-4 mr-2" />
                Leaderboard
              </Button>
              
              <Button
                variant={activeSection === "profile" ? "default" : "ghost"}
                className="w-full justify-start"
                onClick={() => setActiveSection("profile")}
              >
                <User className="w-4 h-4 mr-2" />
                Profile
              </Button>
              
              <Button
                variant={activeSection === "point-recharge" ? "default" : "ghost"}
                className="w-full justify-start"
                onClick={() => setActiveSection("point-recharge")}
              >
                <Plus className="w-4 h-4 mr-2" />
                Point Recharge
              </Button>
              
              <Button
                variant={activeSection === "product-sales" ? "default" : "ghost"}
                className="w-full justify-start"
                onClick={() => setActiveSection("product-sales")}
              >
                <ShoppingCart className="w-4 h-4 mr-2" />
                Product Sales
              </Button>
              
              <Button
                variant={activeSection === "activity-tracking" ? "default" : "ghost"}
                className="w-full justify-start"
                onClick={() => setActiveSection("activity-tracking")}
              >
                <Activity className="w-4 h-4 mr-2" />
                Activity Tracking
              </Button>
              
              <Button
                variant={activeSection === "distribution-reports" ? "default" : "ghost"}
                className="w-full justify-start"
                onClick={() => setActiveSection("distribution-reports")}
              >
                <BarChart className="w-4 h-4 mr-2" />
                Distribution Reports
              </Button>
            </nav>

            {/* Star Merchant Widget */}
            <div className="p-4 mt-6">
              <div className="bg-gradient-to-br from-yellow-50 to-orange-50 rounded-lg border border-yellow-200 p-4">
                <div className="flex items-center space-x-2 mb-2">
                  <Star className="w-5 h-5 text-yellow-600" />
                  <span className="font-semibold text-yellow-800">Star Merchant</span>
                </div>
                <p className="text-sm text-yellow-700 mb-2">Current Rank</p>
                <div className="w-full bg-yellow-200 rounded-full h-2 mb-2">
                  <div className="bg-yellow-500 h-2 rounded-full" style={{ width: '75%' }}></div>
                </div>
                <p className="text-xs text-yellow-600">75% to next rank</p>
              </div>
            </div>
          </ScrollArea>
        </div>

        {/* Main Content */}
        <div className="flex-1 lg:ml-0">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            {activeSection === 'dashboard' && renderDashboard()}
            {activeSection === 'loyalty-points' && renderLoyaltyPoints()}
            {activeSection === 'income-wallet' && renderIncomeWallet()}
            {activeSection === 'customers' && renderCustomers()}
            {activeSection === 'leaderboard' && renderLeaderboard()}
            {activeSection === 'profile' && renderProfile()}
            {activeSection === 'wallets' && renderCommerceWallet()}
            {activeSection === 'point-recharge' && renderPointRecharge()}
            {activeSection === 'product-sales' && renderProductSales()}
            {activeSection === 'activity-tracking' && renderActivityTracking()}
            {activeSection === 'distribution-reports' && renderDistributionReports()}
            {activeSection === 'marketing' && (
              <div className="text-center py-12">
                <Target className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">Marketing Tools</h3>
                <p className="text-gray-500">Marketing features coming soon</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Send Points Dialog */}
      <Dialog open={showSendPointsDialog} onOpenChange={setShowSendPointsDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Send Points to Customer</DialogTitle>
          </DialogHeader>
          <form onSubmit={(e) => {
            e.preventDefault();
            const formData = new FormData(e.target as HTMLFormElement);
            sendPointsMutation.mutate({
              customerId: formData.get('customerId') as string,
              points: parseInt(formData.get('points') as string),
              description: formData.get('description') as string
            });
          }} className="space-y-4">
            <div>
              <Label htmlFor="customerId">Customer</Label>
              <Select name="customerId" required>
                <SelectTrigger>
                  <SelectValue placeholder="Select customer" />
                </SelectTrigger>
                <SelectContent>
                  {customers.map((customer: any) => (
                    <SelectItem key={customer.id} value={customer.id}>
                      {customer.firstName} {customer.lastName} - {customer.email}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="points">Points</Label>
              <Input name="points" type="number" required min="1" />
            </div>
            <div>
              <Label htmlFor="description">Description</Label>
              <Textarea name="description" required />
            </div>
            <div className="flex justify-end space-x-2">
              <Button type="button" variant="outline" onClick={() => setShowSendPointsDialog(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={sendPointsMutation.isPending}>
                {sendPointsMutation.isPending ? 'Sending...' : 'Send Points'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Purchase Points Dialog */}
      <Dialog open={showPurchaseDialog} onOpenChange={setShowPurchaseDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Purchase Points</DialogTitle>
          </DialogHeader>
          <form onSubmit={(e) => {
            e.preventDefault();
            const formData = new FormData(e.target as HTMLFormElement);
            purchasePointsMutation.mutate({
              amount: parseInt(formData.get('amount') as string),
              paymentMethod: formData.get('paymentMethod') as string
            });
          }} className="space-y-4">
            <div>
              <Label htmlFor="amount">Amount (৳)</Label>
              <Input name="amount" type="number" required min="100" />
            </div>
            <div>
              <Label htmlFor="paymentMethod">Payment Method</Label>
              <Select name="paymentMethod" required>
                <SelectTrigger>
                  <SelectValue placeholder="Select payment method" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="bank">Bank Transfer</SelectItem>
                  <SelectItem value="card">Credit Card</SelectItem>
                  <SelectItem value="mobile">Mobile Banking</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex justify-end space-x-2">
              <Button type="button" variant="outline" onClick={() => setShowPurchaseDialog(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={purchasePointsMutation.isPending}>
                {purchasePointsMutation.isPending ? 'Processing...' : 'Purchase'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Withdraw Dialog */}
      <Dialog open={showWithdrawDialog} onOpenChange={setShowWithdrawDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Withdraw Balance</DialogTitle>
          </DialogHeader>
          <form onSubmit={(e) => {
            e.preventDefault();
            const formData = new FormData(e.target as HTMLFormElement);
            withdrawMutation.mutate({
              amount: parseInt(formData.get('amount') as string),
              bankAccount: formData.get('bankAccount') as string
            });
          }} className="space-y-4">
            <div>
              <Label htmlFor="amount">Amount (৳)</Label>
              <Input name="amount" type="number" required min="100" max={merchantData.balance} />
            </div>
            <div>
              <Label htmlFor="bankAccount">Bank Account</Label>
              <Input name="bankAccount" required placeholder="Enter bank account details" />
            </div>
            <div className="flex justify-end space-x-2">
              <Button type="button" variant="outline" onClick={() => setShowWithdrawDialog(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={withdrawMutation.isPending}>
                {withdrawMutation.isPending ? 'Processing...' : 'Withdraw'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Transfer Income to Commerce Dialog */}
      <Dialog open={showTransferDialog} onOpenChange={setShowTransferDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Transfer to Commerce Wallet</DialogTitle>
          </DialogHeader>
          <form onSubmit={(e) => {
            e.preventDefault();
            const formData = new FormData(e.target as HTMLFormElement);
            const amount = parseFloat(formData.get('amount') as string);
            const vatAmount = amount * 0.125; // 12.5% VAT and service charge
            const transferAmount = amount - vatAmount;
            
            // Here you would call the API to transfer funds
            toast({ 
              title: "Transfer Successful", 
              description: `৳${transferAmount} transferred (after 12.5% VAT & service charge)` 
            });
            setShowTransferDialog(false);
          }} className="space-y-4">
            <div>
              <Label htmlFor="amount">Amount to Transfer (৳)</Label>
              <Input name="amount" type="number" required min="1" max={merchantData.incomeBalance} />
              <p className="text-sm text-gray-500 mt-1">
                Available: ৳{merchantData.incomeBalance}
              </p>
            </div>
            <div className="bg-yellow-50 p-3 rounded-lg">
              <p className="text-sm text-yellow-800">
                <strong>Note:</strong> A 12.5% VAT and service charge will be deducted from the transfer amount.
              </p>
            </div>
            <div className="flex justify-end space-x-2">
              <Button type="button" variant="outline" onClick={() => setShowTransferDialog(false)}>
                Cancel
              </Button>
              <Button type="submit">
                Transfer to Commerce Wallet
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Point Recharge Dialog */}
      <Dialog open={showRechargeDialog} onOpenChange={setShowRechargeDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Request Point Recharge</DialogTitle>
          </DialogHeader>
          <form onSubmit={(e) => {
            e.preventDefault();
            const formData = new FormData(e.target as HTMLFormElement);
            const amount = parseFloat(formData.get('amount') as string);
            const method = formData.get('method') as string;
            const reference = formData.get('reference') as string;
            
            // Here you would call the API to create recharge request
            toast({ 
              title: "Recharge Request Created", 
              description: `৳${amount} recharge request submitted via ${method}` 
            });
            setShowRechargeDialog(false);
          }} className="space-y-4">
            <div>
              <Label htmlFor="method">Recharge Method</Label>
              <Select name="method" required>
                <option value="direct_cash">Direct Cash Payment</option>
                <option value="bank_transfer">Bank Transfer</option>
                <option value="mobile_transfer">Mobile Transfer</option>
                <option value="automatic_payment_gateway">Automatic Payment Gateway</option>
              </Select>
            </div>
            <div>
              <Label htmlFor="amount">Amount (৳)</Label>
              <Input name="amount" type="number" required min="100" />
              <p className="text-sm text-gray-500 mt-1">
                1 Taka = 1 Point
              </p>
            </div>
            <div>
              <Label htmlFor="reference">Payment Reference</Label>
              <Input name="reference" placeholder="Transaction ID, Reference Number, etc." />
            </div>
            <div className="flex justify-end space-x-2">
              <Button type="button" variant="outline" onClick={() => setShowRechargeDialog(false)}>
                Cancel
              </Button>
              <Button type="submit">
                Submit Request
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Product Sale Dialog */}
      <Dialog open={showSaleDialog} onOpenChange={setShowSaleDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Record Product Sale</DialogTitle>
          </DialogHeader>
          <form onSubmit={(e) => {
            e.preventDefault();
            const formData = new FormData(e.target as HTMLFormElement);
            const customerId = formData.get('customerId') as string;
            const productId = formData.get('productId') as string;
            const quantity = parseInt(formData.get('quantity') as string);
            const unitPrice = parseFloat(formData.get('unitPrice') as string);
            const distributionMethod = formData.get('distributionMethod') as string;
            const distributionValue = parseFloat(formData.get('distributionValue') as string);
            const cashDiscount = parseFloat(formData.get('cashDiscount') as string) || 0;
            
            const totalAmount = quantity * unitPrice;
            const pointsGiven = distributionMethod === 'manual' ? distributionValue : 
                              distributionMethod === 'automatic_percentage' ? Math.floor(totalAmount * distributionValue / 100) :
                              distributionValue;
            
            // Here you would call the API to record the sale
            toast({ 
              title: "Sale Recorded", 
              description: `Sale recorded: ${quantity} items, ${pointsGiven} points given` 
            });
            setShowSaleDialog(false);
          }} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="customerId">Customer ID</Label>
                <Input name="customerId" required />
              </div>
              <div>
                <Label htmlFor="productId">Product ID</Label>
                <Input name="productId" required />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="quantity">Quantity</Label>
                <Input name="quantity" type="number" required min="1" />
              </div>
              <div>
                <Label htmlFor="unitPrice">Unit Price (৳)</Label>
                <Input name="unitPrice" type="number" required min="0" step="0.01" />
              </div>
            </div>
            <div>
              <Label htmlFor="distributionMethod">Point Distribution Method</Label>
              <Select name="distributionMethod" required>
                <option value="manual">Manual</option>
                <option value="automatic_percentage">Automatic Percentage</option>
                <option value="automatic_fixed">Automatic Fixed Amount</option>
              </Select>
            </div>
            <div>
              <Label htmlFor="distributionValue">Distribution Value</Label>
              <Input name="distributionValue" type="number" required min="0" />
              <p className="text-sm text-gray-500 mt-1">
                For percentage: enter percentage (e.g., 5 for 5%). For fixed: enter point amount.
              </p>
            </div>
            <div>
              <Label htmlFor="cashDiscount">Cash Discount (৳) - Optional</Label>
              <Input name="cashDiscount" type="number" min="0" step="0.01" />
            </div>
            <div className="flex justify-end space-x-2">
              <Button type="button" variant="outline" onClick={() => setShowSaleDialog(false)}>
                Cancel
              </Button>
              <Button type="submit">
                Record Sale
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Generate Report Dialog */}
      <Dialog open={showReportDialog} onOpenChange={setShowReportDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Generate Distribution Report</DialogTitle>
          </DialogHeader>
          <form onSubmit={(e) => {
            e.preventDefault();
            const formData = new FormData(e.target as HTMLFormElement);
            const reportType = formData.get('reportType') as string;
            const period = formData.get('period') as string;
            
            // Here you would call the API to generate the report
            toast({ 
              title: "Report Generated", 
              description: `${reportType} report generated for ${period}` 
            });
            setShowReportDialog(false);
          }} className="space-y-4">
            <div>
              <Label htmlFor="reportType">Report Type</Label>
              <Select name="reportType" required>
                <option value="product_wise">Product-wise Report</option>
                <option value="supplier_wise">Supplier-wise Report</option>
                <option value="customer_wise">Customer-wise Report</option>
                <option value="monthly_summary">Monthly Summary</option>
              </Select>
            </div>
            <div>
              <Label htmlFor="period">Period</Label>
              <Input name="period" type="month" required />
            </div>
            <div className="flex justify-end space-x-2">
              <Button type="button" variant="outline" onClick={() => setShowReportDialog(false)}>
                Cancel
              </Button>
              <Button type="submit">
                Generate Report
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}