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
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import { 
  LayoutDashboard, Package, ShoppingCart, Coins, BarChart, 
  Plus, Edit, Trash2, DollarSign, TrendingUp, Users, Store,
  Star, Award, Calendar, Eye, Settings, Target, Copy,
  CreditCard, Wallet, Send, Download, Gift, Crown,
  ArrowUpRight, ArrowDownRight, Filter, Search, MoreHorizontal,
  QrCode, UserPlus, Activity, PieChart, LineChart, Bell
} from 'lucide-react';
import { ResponsiveContainer, LineChart as RechartsLine, Line, XAxis, YAxis, CartesianGrid, Tooltip, 
         BarChart as RechartsBar, Bar, PieChart as RechartsPie, Pie, Cell } from 'recharts';

export default function MerchantDashboard() {
  const { user, profile } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [activeSection, setActiveSection] = useState('dashboard');
  const [showSendPointsDialog, setShowSendPointsDialog] = useState(false);
  const [showPurchaseDialog, setShowPurchaseDialog] = useState(false);
  const [showWithdrawDialog, setShowWithdrawDialog] = useState(false);

  const { data: dashboardData = {}, isLoading } = useQuery({
    queryKey: ['/api/dashboard/merchant'],
    enabled: !!user && user.role === 'merchant'
  });

  const { data: walletData = {}, isLoading: walletsLoading } = useQuery({
    queryKey: ['/api/merchant/wallets'],
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

  const { data: categories = [] } = useQuery({
    queryKey: ['/api/categories']
  });

  const { data: brands = [] } = useQuery({
    queryKey: ['/api/brands']
  });

  // Mutations for merchant actions
  const sendPointsMutation = useMutation({
    mutationFn: async (data: { customerEmail: string; points: number; description?: string }) => {
      return apiRequest('/api/merchant/rewards/send', 'POST', data);
    },
    onSuccess: () => {
      toast({ title: "Success", description: "Points sent successfully!" });
      queryClient.invalidateQueries({ queryKey: ['/api/merchant/wallets'] });
      queryClient.invalidateQueries({ queryKey: ['/api/merchant/customers'] });
      setShowSendPointsDialog(false);
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message || "Failed to send points", variant: "destructive" });
    }
  });

  const purchasePointsMutation = useMutation({
    mutationFn: async (data: { points: number; amount: number; paymentMethod: string }) => {
      return apiRequest('/api/merchant/points/purchase', 'POST', data);
    },
    onSuccess: () => {
      toast({ title: "Success", description: "Points purchased successfully!" });
      queryClient.invalidateQueries({ queryKey: ['/api/merchant/wallets'] });
      setShowPurchaseDialog(false);
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message || "Failed to purchase points", variant: "destructive" });
    }
  });

  const withdrawMutation = useMutation({
    mutationFn: async (data: { amount: number; paymentMethod: string; accountDetails?: string }) => {
      return apiRequest('/api/merchant/wallet/withdraw', 'POST', data);
    },
    onSuccess: () => {
      toast({ title: "Success", description: "Withdrawal request submitted successfully!" });
      queryClient.invalidateQueries({ queryKey: ['/api/merchant/wallets'] });
      setShowWithdrawDialog(false);
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message || "Failed to process withdrawal", variant: "destructive" });
    }
  });

  if (isLoading) {
    return (
      <div className="pt-20 min-h-screen bg-gray-50">
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

  // Mock data for demo - in real app this would come from API
  const merchantData = {
    loyaltyPoints: 1000,
    totalCashback: 0,
    balance: 1000,
    registeredCustomers: 1,
    merchantName: "Star Merchant",
    tier: "Star Merchant",
    joinedDate: "Aug 2025",
    referralLink: "komarce.com/ref/m001"
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

  const leaderboardData = [
    { rank: 1, name: "Ahmed Hassan", code: "AH01", points: 15420, customers: 247, revenue: 45600, tier: "Co Founder" },
    { rank: 2, name: "Sarah Khan", code: "SK02", points: 14250, customers: 198, revenue: 38900, tier: "Regional Manager" },
    { rank: 3, name: "Mohammad Ali", code: "MA03", points: 13890, customers: 176, revenue: 35200, tier: "Business Manager" },
    { rank: 4, name: "Fatima Rahman", code: "FR04", points: 12500, customers: 165, revenue: 32800, tier: "Super Star Merchant" }
  ];

  // Render Main Dashboard
  const renderDashboard = () => (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Merchant Dashboard</h1>
          <p className="text-gray-600">Welcome back</p>
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
                <Coins className="w-6 h-6 text-purple-600" />
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
                <p className="text-xs text-green-600 flex items-center mt-1">
                  <ArrowUpRight className="w-3 h-3 mr-1" />
                  After VAT & Service Charge
                </p>
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

      {/* Chart and Quick Actions Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Point Distribution Chart */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-lg font-semibold">Point Distribution Trend</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <RechartsLine data={pointDistributionData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="month" stroke="#6b7280" fontSize={12} />
                <YAxis stroke="#6b7280" fontSize={12} />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'white', 
                    border: '1px solid #e5e7eb', 
                    borderRadius: '8px',
                    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                  }} 
                />
                <Line 
                  type="monotone" 
                  dataKey="points" 
                  stroke="#3b82f6" 
                  strokeWidth={3}
                  dot={{ fill: '#3b82f6', strokeWidth: 2, r: 4 }}
                  activeDot={{ r: 6, stroke: '#3b82f6', strokeWidth: 2 }}
                />
              </RechartsLine>
            </ResponsiveContainer>
            
            <div className="grid grid-cols-2 gap-4 mt-4">
              <div className="text-center p-3 bg-gray-50 rounded-lg">
                <p className="text-2xl font-bold text-gray-900">0</p>
                <p className="text-sm text-gray-600">Points Distributed Today</p>
              </div>
              <div className="text-center p-3 bg-gray-50 rounded-lg">
                <p className="text-2xl font-bold text-gray-900">0</p>
                <p className="text-sm text-gray-600">Monthly Total</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg font-semibold">Quick Actions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button 
              onClick={() => setShowSendPointsDialog(true)}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white"
            >
              <Send className="w-4 h-4 mr-2" />
              Transfer Points
            </Button>
            <Button 
              onClick={() => setShowPurchaseDialog(true)}
              className="w-full bg-green-600 hover:bg-green-700 text-white"
            >
              <Plus className="w-4 h-4 mr-2" />
              Purchase Points
            </Button>
            <Button 
              onClick={() => setShowWithdrawDialog(true)}
              className="w-full bg-orange-500 hover:bg-orange-600 text-white"
            >
              <Wallet className="w-4 h-4 mr-2" />
              Withdraw Balance
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Referral Program */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold mb-2">Referral Program</h3>
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <p className="text-sm text-gray-600">Referred Merchants</p>
                  <p className="text-2xl font-bold">0</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Commission Earned</p>
                  <p className="text-2xl font-bold">৳0</p>
                </div>
              </div>
              <div className="mt-4">
                <p className="text-sm text-gray-600 mb-2">Your Referral Link</p>
                <div className="flex items-center space-x-2">
                  <code className="flex-1 bg-gray-100 px-3 py-2 rounded text-sm">{merchantData.referralLink}</code>
                  <Button size="sm" variant="outline">
                    <Copy className="w-4 h-4" />
                    Copy
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );

  // Render Loyalty Points Management
  const renderLoyaltyPoints = () => (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Loyalty Points Management</h1>
        <p className="text-gray-600">Manage your reward points and track distribution</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="text-center">
              <p className="text-sm font-medium text-gray-600">Available Points</p>
              <p className="text-3xl font-bold text-gray-900">0</p>
              <p className="text-xs text-gray-500 mt-1">↗ +5.2% from last week</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="text-center">
              <p className="text-sm font-medium text-gray-600">Total Distributed</p>
              <p className="text-3xl font-bold text-gray-900">0</p>
              <p className="text-xs text-gray-500 mt-1">↗ +12.5% from last month</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="text-center">
              <p className="text-sm font-medium text-gray-600">Today's Distribution</p>
              <p className="text-3xl font-bold text-gray-900">0</p>
              <p className="text-xs text-gray-500 mt-1">↗ Points distributed today</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="text-center">
              <p className="text-sm font-medium text-gray-600">Monthly Total</p>
              <p className="text-3xl font-bold text-gray-900">0</p>
              <p className="text-xs text-gray-500 mt-1">↗ This month's total</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Distribution Chart and Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Point Distribution</CardTitle>
            <div className="flex items-center space-x-2">
              <Select defaultValue="manual">
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="manual">Manual Mode</SelectItem>
                  <SelectItem value="auto">Auto Mode</SelectItem>
                </SelectContent>
              </Select>
              <Button variant="outline" size="sm">
                <QrCode className="w-4 h-4 mr-2" />
                QR Transfer
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="mb-4">
              <h3 className="font-semibold mb-3">Weekly Point Distribution</h3>
              <ResponsiveContainer width="100%" height={200}>
                <RechartsBar data={weeklyDistributionData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="day" stroke="#6b7280" fontSize={12} />
                  <YAxis stroke="#6b7280" fontSize={12} />
                  <Tooltip />
                  <Bar dataKey="points" fill="#1f2937" radius={[4, 4, 0, 0]} />
                </RechartsBar>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Distribution Actions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button 
              onClick={() => setShowSendPointsDialog(true)}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white"
            >
              <Send className="w-4 h-4 mr-2" />
              Send Points
            </Button>
            <Button className="w-full bg-green-600 hover:bg-green-700 text-white">
              <QrCode className="w-4 h-4 mr-2" />
              QR Code Transfer
            </Button>
            <Button 
              onClick={() => setShowPurchaseDialog(true)}
              className="w-full bg-orange-500 hover:bg-orange-600 text-white"
            >
              <Package className="w-4 h-4 mr-2" />
              Purchase Points
            </Button>
            
            <Separator />
            
            <div className="space-y-2">
              <h4 className="font-semibold text-sm">Distribution Settings</h4>
              <div className="space-y-1">
                <div className="flex justify-between text-sm">
                  <span>Current Mode:</span>
                  <span className="font-medium">Manual</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Min Points:</span>
                  <span className="font-medium">1</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Max Points:</span>
                  <span className="font-medium">10,000</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Purchase History and Distribution Summary */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Purchase History</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 border rounded-lg">
                <div>
                  <p className="font-medium">1,000 Points</p>
                  <p className="text-sm text-gray-600">Jan 15, 2024</p>
                </div>
                <div className="text-right">
                  <p className="font-semibold">৳1,000</p>
                  <Badge variant="default" className="bg-green-100 text-green-800">Completed</Badge>
                </div>
              </div>
              
              <div className="flex items-center justify-between p-3 border rounded-lg">
                <div>
                  <p className="font-medium">2,500 Points</p>
                  <p className="text-sm text-gray-600">Jan 18, 2024</p>
                </div>
                <div className="text-right">
                  <p className="font-semibold">৳2,500</p>
                  <Badge variant="default" className="bg-green-100 text-green-800">Completed</Badge>
                </div>
              </div>

              <div className="flex items-center justify-between p-3 border rounded-lg">
                <div>
                  <p className="font-medium">5,000 Points</p>
                  <p className="text-sm text-gray-600">Jan 5, 2024</p>
                </div>
                <div className="text-right">
                  <p className="font-semibold">৳5,000</p>
                  <Badge variant="default" className="bg-green-100 text-green-800">Completed</Badge>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Distribution Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                <span className="text-sm font-medium">Total Points Purchased</span>
                <span className="font-bold text-lg">25,000</span>
              </div>
              
              <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                <span className="text-sm font-medium">Total Points Distributed</span>
                <span className="font-bold text-lg">0</span>
              </div>
              
              <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                <span className="text-sm font-medium">Remaining Points</span>
                <span className="font-bold text-lg">0</span>
              </div>

              <div className="flex justify-between items-center p-3 bg-green-50 rounded-lg">
                <span className="text-sm font-medium">Efficiency Rate</span>
                <span className="font-bold text-lg text-green-600">95.2%</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Transactions */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Point Transactions</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Points</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Description</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8 text-gray-500">
                  No transactions found
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );

  // Render Cashback Management  
  const renderCashback = () => (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Cashback Management</h1>
        <p className="text-gray-600">Track and manage your cashback earnings from all sources</p>
      </div>

      {/* Cashback Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="text-center">
              <p className="text-sm font-medium text-gray-600">Total Cashback</p>
              <div className="flex items-center justify-center space-x-1">
                <span className="text-orange-600">৳</span>
                <p className="text-3xl font-bold text-gray-900">0</p>
              </div>
              <p className="text-xs text-gray-500 mt-1">↗ +11.3% from last month</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="text-center">
              <p className="text-sm font-medium text-gray-600">15% Instant Cashback</p>
              <div className="flex items-center justify-center space-x-1">
                <span className="text-orange-600">৳</span>
                <p className="text-3xl font-bold text-gray-900">0</p>
              </div>
              <p className="text-xs text-gray-500 mt-1">↗ From point transfers</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="text-center">
              <p className="text-sm font-medium text-gray-600">2% Referral Commission</p>
              <div className="flex items-center justify-center space-x-1">
                <span className="text-green-600">৳</span>
                <p className="text-3xl font-bold text-gray-900">0</p>
              </div>
              <p className="text-xs text-gray-500 mt-1">↗ From 0 referral</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="text-center">
              <p className="text-sm font-medium text-gray-600">1% Royalty Bonus</p>
              <div className="flex items-center justify-center space-x-1">
                <span className="text-blue-600">৳</span>
                <p className="text-3xl font-bold text-gray-900">0</p>
              </div>
              <p className="text-xs text-gray-500 mt-1">↗ Monthly merchant bonus</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Cashback Breakdown</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <RechartsBar data={[
                { name: '15% Instant', value: 4, color: '#8b5cf6' },
                { name: '2% Referral', value: 3, color: '#10b981' },
                { name: '1% Royalty', value: 2, color: '#f59e0b' }
              ]}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="name" stroke="#6b7280" fontSize={12} />
                <YAxis stroke="#6b7280" fontSize={12} />
                <Tooltip />
                <Bar dataKey="value" fill="#8884d8" radius={[4, 4, 0, 0]} />
              </RechartsBar>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Monthly Cashback Trend</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <RechartsLine data={[
                { month: 'Jan', cashback: 0 },
                { month: 'Feb', cashback: 1000 },
                { month: 'Mar', cashback: 750 },
                { month: 'Apr', cashback: 500 },
                { month: 'May', cashback: 1250 },
                { month: 'Jun', cashback: 950 },
                { month: 'Jul', cashback: 0 }
              ]}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="month" stroke="#6b7280" fontSize={12} />
                <YAxis stroke="#6b7280" fontSize={12} />
                <Tooltip />
                <Line 
                  type="monotone" 
                  dataKey="cashback" 
                  stroke="#10b981" 
                  strokeWidth={3}
                  dot={{ fill: '#10b981', strokeWidth: 2, r: 4 }}
                />
              </RechartsLine>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Cashback Sources */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="border-l-4 border-purple-500">
          <CardHeader className="flex flex-row items-center space-y-0 pb-3">
            <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center mr-3">
              <DollarSign className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <h3 className="font-semibold">Instant Cashback (15%)</h3>
              <p className="text-sm text-gray-600">Earned from point transfers to customers</p>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>This Month:</span>
                <span className="font-medium">৳2,850</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Active Referrals:</span>
                <span className="font-medium">0</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Your Share:</span>
                <span className="font-medium">1%</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-green-500">
          <CardHeader className="flex flex-row items-center space-y-0 pb-3">
            <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center mr-3">
              <Users className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <h3 className="font-semibold">Referral Commission (2%)</h3>
              <p className="text-sm text-gray-600">From 0 referred merchants</p>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>This Month:</span>
                <span className="font-medium">৳1,240</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Active Referrals:</span>
                <span className="font-medium">0</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Your Share:</span>
                <span className="font-medium">1%</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-blue-500">
          <CardHeader className="flex flex-row items-center space-y-0 pb-3">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center mr-3">
              <Crown className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h3 className="font-semibold">Royalty Bonus (1%)</h3>
              <p className="text-sm text-gray-600">Monthly share from all merchants</p>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>This Month:</span>
                <span className="font-medium">৳2,090</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Available Balance:</span>
                <span className="font-medium">৳500</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Your Share:</span>
                <span className="font-medium">1%</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Merchant Incentive Program */}
      <Card>
        <CardHeader>
          <CardTitle>Merchant Incentive Program</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="text-center p-4 border rounded-lg bg-blue-50">
              <div className="flex items-center justify-center mb-2">
                <Star className="w-6 h-6 text-yellow-500" />
                <span className="ml-2 font-semibold">Star Merchant</span>
              </div>
              <p className="text-sm text-gray-600">Achieve 1,000 points distribution monthly</p>
              <div className="mt-2 bg-blue-200 rounded-full h-2">
                <div className="bg-blue-600 h-2 rounded-full" style={{ width: '75%' }}></div>
              </div>
              <p className="text-xs text-gray-500 mt-1">Progress: 750/1,000</p>
              <Badge variant="default" className="mt-2">Current</Badge>
            </div>

            <div className="text-center p-4 border rounded-lg">
              <div className="flex items-center justify-center mb-2">
                <Star className="w-6 h-6 text-yellow-500" />
                <Star className="w-6 h-6 text-yellow-500" />
                <span className="ml-2 font-semibold">Super Star Merchant</span>
              </div>
              <p className="text-sm text-gray-600">Achieve 2,000 points distribution monthly</p>
              <Badge variant="outline" className="mt-2">Next</Badge>
              <p className="text-xs text-green-600 mt-1">Bonus: +5% Cashback</p>
            </div>

            <div className="text-center p-4 border rounded-lg">
              <div className="flex items-center justify-center mb-2">
                <Crown className="w-6 h-6 text-purple-600" />
                <span className="ml-2 font-semibold">Co Founder</span>
              </div>
              <p className="text-sm text-gray-600">Exclusive partnership benefits</p>
              <Badge variant="outline" className="mt-2">Premium</Badge>
              <p className="text-xs text-purple-600 mt-1">Revenue Share: +5% Cashback</p>
            </div>

            <div className="text-center p-4 border rounded-lg">
              <div className="flex items-center justify-center mb-2">
                <Award className="w-6 h-6 text-green-600" />
                <span className="ml-2 font-semibold">Executive</span>
              </div>
              <p className="text-sm text-gray-600">Highest tier benefits</p>
              <Badge variant="outline" className="mt-2">Elite</Badge>
              <p className="text-xs text-green-600 mt-1">Revenue Share: 14%</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* VAT & Service Charges and Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>VAT & Service Charges</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                <span className="text-sm font-medium">Gross Cashback</span>
                <span className="font-bold">৳0</span>
              </div>
              <p className="text-xs text-gray-600">Before deductions</p>

              <div className="flex justify-between items-center p-3 bg-red-50 rounded-lg">
                <span className="text-sm font-medium">VAT & Service Charge</span>
                <span className="font-bold text-red-600">-৳0.00</span>
              </div>
              <p className="text-xs text-gray-600">12.5% deduction</p>

              <div className="flex justify-between items-center p-3 bg-green-50 rounded-lg">
                <span className="text-sm font-medium">Net Balance</span>
                <span className="font-bold text-green-600">৳0.00</span>
              </div>
              <p className="text-xs text-gray-600">Available for withdrawal</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button className="w-full bg-blue-600 hover:bg-blue-700 text-white">
              <Send className="w-4 h-4 mr-2" />
              Transfer to Komarce Wallet
            </Button>
            <Button className="w-full bg-green-600 hover:bg-green-700 text-white">
              <Wallet className="w-4 h-4 mr-2" />
              Withdraw Balance
            </Button>
            <Button className="w-full bg-gray-600 hover:bg-gray-700 text-white">
              <Eye className="w-4 h-4 mr-2" />
              View Detailed Report
            </Button>

            <Separator />

            <div className="space-y-2">
              <h4 className="font-semibold text-sm">Next Payment</h4>
              <div className="space-y-1">
                <div className="flex justify-between text-sm">
                  <span>৳0.00</span>
                  <span className="text-gray-500">Available for withdrawal</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Cashback Transactions */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Cashback Transactions</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Points</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Description</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8 text-gray-500">
                  No recent cashback found
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );

  // Render Customer Management
  const renderCustomers = () => (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Customer Management</h1>
        <p className="text-gray-600">Manage your registered customers and track their activity</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="text-center">
              <p className="text-sm font-medium text-gray-600">Total Customers</p>
              <p className="text-3xl font-bold text-gray-900">1</p>
              <p className="text-xs text-green-600 mt-1">↗ +2 new this month</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="text-center">
              <p className="text-sm font-medium text-gray-600">Active Customers</p>
              <p className="text-3xl font-bold text-gray-900">1</p>
              <p className="text-xs text-green-600 mt-1">↗ 100% activity rate</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="text-center">
              <p className="text-sm font-medium text-gray-600">Reward Holders</p>
              <p className="text-3xl font-bold text-gray-900">1</p>
              <p className="text-xs text-gray-600 mt-1">↗ Customers with reward numbers</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="text-center">
              <p className="text-sm font-medium text-gray-600">This Month's Activity</p>
              <p className="text-3xl font-bold text-gray-900">0</p>
              <p className="text-xs text-gray-600 mt-1">↗ Total transactions</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Customer Directory */}
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center space-y-4 sm:space-y-0">
            <CardTitle>Customer Directory</CardTitle>
            <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-2 w-full sm:w-auto">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input 
                  placeholder="Search customers by name, mobile, or email..." 
                  className="pl-10 w-full sm:w-80"
                />
              </div>
              <Select defaultValue="all">
                <SelectTrigger className="w-full sm:w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Customers</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>
              <Button variant="outline">
                <Filter className="w-4 h-4 mr-2" />
                More Filters
              </Button>
              <Button variant="outline">
                <Download className="w-4 h-4 mr-2" />
                Export
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="mb-4">
            <h3 className="font-semibold mb-3">Customer List (1)</h3>
          </div>
          
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Customer</TableHead>
                <TableHead>Contact</TableHead>
                <TableHead>Points</TableHead>
                <TableHead>Reward Number</TableHead>
                <TableHead>This Month</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Registered</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow>
                <TableCell>
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                      <span className="text-blue-600 font-semibold">DC</span>
                    </div>
                    <div>
                      <p className="font-medium">Demo Customer</p>
                      <p className="text-sm text-gray-600">ID: #001</p>
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  <div>
                    <p className="font-medium">9876543210</p>
                    <p className="text-sm text-gray-600">demo@email.com</p>
                  </div>
                </TableCell>
                <TableCell>
                  <div>
                    <p className="font-bold text-blue-600">1500</p>
                    <p className="text-xs text-gray-600">Total Points</p>
                  </div>
                </TableCell>
                <TableCell>
                  <Badge className="bg-yellow-100 text-yellow-800">
                    Reward
                  </Badge>
                </TableCell>
                <TableCell>
                  <div>
                    <p className="font-medium">0</p>
                    <p className="text-xs text-gray-600">Points</p>
                  </div>
                </TableCell>
                <TableCell>
                  <Badge className="bg-green-100 text-green-800">
                    Active
                  </Badge>
                </TableCell>
                <TableCell>Aug 07, 2025</TableCell>
                <TableCell>
                  <div className="flex space-x-2">
                    <Button size="sm" variant="outline">
                      <Eye className="w-4 h-4" />
                      View
                    </Button>
                    <Button size="sm" className="bg-blue-600 hover:bg-blue-700 text-white">
                      <Send className="w-4 h-4" />
                      Send Points
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>

          <Button className="w-full mt-4" variant="outline">
            <UserPlus className="w-4 h-4 mr-2" />
            Add Customer
          </Button>
        </CardContent>
      </Card>

      {/* Top Customers and Customer Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Top Customers</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center space-x-3 p-3 border rounded-lg">
                <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                  <span className="text-blue-600 font-semibold">DC</span>
                </div>
                <div className="flex-1">
                  <p className="font-medium">Demo Customer</p>
                  <p className="text-sm text-gray-600">9876543210</p>
                </div>
                <div className="text-right">
                  <p className="font-bold text-blue-600">1500</p>
                  <p className="text-xs text-gray-600">Points</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Customer Activity</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                <span className="text-sm font-medium">New This Month</span>
                <span className="font-bold text-lg">1</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );

  // Render Wallets
  const renderWallets = () => (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Wallet Management</h1>
        <p className="text-gray-600">Manage your three-wallet system and track all transactions</p>
      </div>

      {/* Three Wallet Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Reward Point Wallet */}
        <Card className="border-l-4 border-purple-500">
          <CardHeader className="flex flex-row items-center space-y-0 pb-3">
            <div className="w-12 h-12 bg-purple-100 rounded-2xl flex items-center justify-center mr-3">
              <Coins className="w-6 h-6 text-purple-600" />
            </div>
            <div>
              <h3 className="font-semibold">Reward Point Wallet</h3>
              <p className="text-sm text-gray-600">Available Points for Distribution</p>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="text-center">
                <p className="text-4xl font-bold text-purple-600">0</p>
                <p className="text-sm text-gray-600">Available Points for Distribution</p>
              </div>
              
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Total Purchased:</span>
                  <span className="font-medium">0</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Total Distributed:</span>
                  <span className="font-medium">0</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Available Balance:</span>
                  <span className="font-medium">0</span>
                </div>
              </div>

              <Button 
                onClick={() => setShowPurchaseDialog(true)}
                className="w-full bg-purple-600 hover:bg-purple-700 text-white"
              >
                <Package className="w-4 h-4 mr-2" />
                Purchase Points
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Income Wallet */}
        <Card className="border-l-4 border-green-500">
          <CardHeader className="flex flex-row items-center space-y-0 pb-3">
            <div className="w-12 h-12 bg-green-100 rounded-2xl flex items-center justify-center mr-3">
              <DollarSign className="w-6 h-6 text-green-600" />
            </div>
            <div>
              <h3 className="font-semibold">Income Wallet</h3>
              <p className="text-sm text-gray-600">Total Cashback Earnings</p>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="text-center">
                <div className="flex items-center justify-center space-x-1">
                  <span className="text-green-600">৳</span>
                  <p className="text-4xl font-bold text-green-600">500</p>
                </div>
                <p className="text-sm text-gray-600">Total Cashback Earnings</p>
              </div>
              
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>15% Instant Cashback:</span>
                  <span className="font-medium">৳5,200</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>2% Referral Commission:</span>
                  <span className="font-medium">৳1,240</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>1% Royalty Bonus:</span>
                  <span className="font-medium">৳2,090</span>
                </div>
              </div>

              <Button 
                onClick={() => {
                  toast({ title: "Transfer Initiated", description: "Transferring income to Komarce wallet..." });
                }}
                className="w-full bg-green-600 hover:bg-green-700 text-white"
              >
                <Send className="w-4 h-4 mr-2" />
                Transfer to Komarce
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Komarce Wallet */}
        <Card className="border-l-4 border-orange-500">
          <CardHeader className="flex flex-row items-center space-y-0 pb-3">
            <div className="w-12 h-12 bg-orange-100 rounded-2xl flex items-center justify-center mr-3">
              <Wallet className="w-6 h-6 text-orange-600" />
            </div>
            <div>
              <h3 className="font-semibold">Komarce Wallet</h3>
              <p className="text-sm text-gray-600">Available for Withdrawal</p>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="text-center">
                <div className="flex items-center justify-center space-x-1">
                  <span className="text-orange-600">৳</span>
                  <p className="text-4xl font-bold text-orange-600">500</p>
                </div>
                <p className="text-sm text-gray-600">Available for Withdrawal</p>
              </div>
              
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Total Received:</span>
                  <span className="font-medium">৳0</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Total Withdrawn:</span>
                  <span className="font-medium">৳0</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Available Balance:</span>
                  <span className="font-medium">৳500</span>
                </div>
              </div>

              <Button 
                onClick={() => {
                  toast({ title: "Balance Added", description: "Balance added to Komarce wallet successfully!" });
                }}
                className="w-full bg-orange-600 hover:bg-orange-700 text-white"
              >
                <Download className="w-4 h-4 mr-2" />
                Add Balance
              </Button>
              
              <Button 
                onClick={() => setShowWithdrawDialog(true)}
                className="w-full" variant="outline"
              >
                <Download className="w-4 h-4 mr-2" />
                Withdraw
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions and Wallet Summary */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button 
              onClick={() => {
                toast({ title: "Transfer Options", description: "Wallet transfer feature coming soon!" });
              }}
              className="w-full bg-purple-600 hover:bg-purple-700 text-white"
            >
              <Send className="w-4 h-4 mr-2" />
              Transfer Between Wallets
            </Button>
            <Button 
              onClick={() => {
                toast({ title: "Balance Added", description: "Balance added successfully!" });
              }}
              className="w-full bg-green-600 hover:bg-green-700 text-white"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Balance
            </Button>
            <Button 
              onClick={() => setShowWithdrawDialog(true)}
              className="w-full bg-orange-500 hover:bg-orange-600 text-white"
            >
              <Download className="w-4 h-4 mr-2" />
              Withdraw Funds
            </Button>
            <Button 
              onClick={() => {
                toast({ title: "Payment Methods", description: "Payment method configuration coming soon!" });
              }}
              className="w-full" variant="outline"
            >
              <CreditCard className="w-4 h-4 mr-2" />
              Payment Methods
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Wallet Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex justify-between items-center p-3 bg-blue-50 rounded-lg">
                <span className="text-sm font-medium">Total Asset Value</span>
                <span className="font-bold text-lg text-blue-600">৳1000.00</span>
              </div>
              <p className="text-xs text-gray-600">Combined wallet balance</p>
              
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Reward Points:</span>
                  <span className="font-medium">0</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Income Balance:</span>
                  <span className="font-medium">৳500</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Komarce Balance:</span>
                  <span className="font-medium">৳500</span>
                </div>
              </div>

              <Separator />

              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>VAT & Service Charge:</span>
                  <span className="font-medium text-red-600">12.5%</span>
                </div>
                <p className="text-xs text-gray-600">Applied on transfers from Income Wallet</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Payment Methods */}
      <Card>
        <CardHeader>
          <CardTitle>Payment Methods</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="border rounded-lg p-4 text-center">
              <div className="w-12 h-12 bg-gray-100 rounded-lg mx-auto mb-3 flex items-center justify-center">
                <CreditCard className="w-6 h-6 text-gray-600" />
              </div>
              <h3 className="font-semibold">Bank Transfer</h3>
              <p className="text-sm text-gray-600 mb-3">Direct bank account transfer</p>
              <Button 
                onClick={() => {
                  toast({ title: "Bank Transfer", description: "Bank transfer configuration saved!" });
                }}
                variant="outline" size="sm"
              >
                Configure
              </Button>
            </div>

            <div className="border rounded-lg p-4 text-center">
              <div className="w-12 h-12 bg-pink-100 rounded-lg mx-auto mb-3 flex items-center justify-center">
                <Wallet className="w-6 h-6 text-pink-600" />
              </div>
              <h3 className="font-semibold">bKash</h3>
              <p className="text-sm text-gray-600 mb-3">Mobile financial service</p>
              <Button 
                onClick={() => {
                  toast({ title: "bKash", description: "bKash configuration saved!" });
                }}
                variant="outline" size="sm"
              >
                Configure
              </Button>
            </div>

            <div className="border rounded-lg p-4 text-center">
              <div className="w-12 h-12 bg-orange-100 rounded-lg mx-auto mb-3 flex items-center justify-center">
                <Wallet className="w-6 h-6 text-orange-600" />
              </div>
              <h3 className="font-semibold">Nagad</h3>
              <p className="text-sm text-gray-600 mb-3">Mobile financial service</p>
              <Button 
                onClick={() => {
                  toast({ title: "Nagad", description: "Nagad configuration saved!" });
                }}
                variant="outline" size="sm"
              >
                Configure
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Recent Wallet Transactions */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Wallet Transactions</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Points</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Description</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8 text-gray-500">
                  No transactions found
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );

  // Render Marketing Tools
  const renderMarketing = () => (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Marketing Tools</h1>
        <p className="text-gray-600">Access promotional materials and marketing resources for your business</p>
      </div>

      {/* Marketing Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="text-center">
              <p className="text-sm font-medium text-gray-600">Templates Downloaded</p>
              <p className="text-3xl font-bold text-gray-900">{marketingData.templatesDownloaded}</p>
              <p className="text-xs text-green-600 mt-1">↗ +27% from last month</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="text-center">
              <p className="text-sm font-medium text-gray-600">Campaign Views</p>
              <p className="text-3xl font-bold text-gray-900">{marketingData.campaignViews}</p>
              <p className="text-xs text-green-600 mt-1">↗ +18% from last month</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="text-center">
              <p className="text-sm font-medium text-gray-600">Social Shares</p>
              <p className="text-3xl font-bold text-gray-900">{marketingData.socialShares}</p>
              <p className="text-xs text-green-600 mt-1">↗ +25% from last month</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="text-center">
              <p className="text-sm font-medium text-gray-600">Engagement Rate</p>
              <p className="text-3xl font-bold text-gray-900">{marketingData.engagementRate}%</p>
              <p className="text-xs text-green-600 mt-1">↗ +0.8% from last month</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Marketing Templates */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Marketing Templates</CardTitle>
          <div className="flex space-x-2">
            <Button variant="outline" size="sm">
              <Download className="w-4 h-4 mr-2" />
              Download All
            </Button>
            <Button size="sm" className="bg-blue-600 hover:bg-blue-700 text-white">
              <Plus className="w-4 h-4 mr-2" />
              Create Custom
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="all" className="w-full">
            <TabsList className="grid w-full grid-cols-5">
              <TabsTrigger value="all">All Templates</TabsTrigger>
              <TabsTrigger value="banners">Banners</TabsTrigger>
              <TabsTrigger value="social">Social Media</TabsTrigger>
              <TabsTrigger value="flyers">Flyers</TabsTrigger>
              <TabsTrigger value="posters">Posters</TabsTrigger>
            </TabsList>

            <TabsContent value="all" className="space-y-4 mt-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Template 1 */}
                <Card className="border-2 border-dashed border-gray-200 hover:border-blue-400 transition-colors">
                  <CardContent className="p-6">
                    <div className="aspect-video bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg mb-4 flex items-center justify-center">
                      <div className="text-white text-center">
                        <h3 className="font-bold text-lg">KOMARCE Loyalty Program</h3>
                        <p className="text-sm">Promote your participation in KOMARCE loyalty program</p>
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="font-semibold">KOMARCE Loyalty Program</h4>
                        <p className="text-sm text-gray-600">Banner</p>
                        <div className="flex items-center space-x-2 mt-2">
                          <Badge className="bg-green-100 text-green-800 text-xs">Active</Badge>
                          <span className="text-xs text-gray-500">📥 3,245 downloads</span>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Button size="sm" variant="outline">Customize</Button>
                        <Button size="sm" className="bg-blue-600 hover:bg-blue-700 text-white w-full">
                          <Download className="w-4 h-4 mr-1" />
                          Download
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Template 2 */}
                <Card className="border-2 border-dashed border-gray-200 hover:border-green-400 transition-colors">
                  <CardContent className="p-6">
                    <div className="aspect-video bg-gradient-to-br from-green-500 to-blue-600 rounded-lg mb-4 flex items-center justify-center">
                      <div className="text-white text-center">
                        <h3 className="font-bold text-lg">Point Rewards Available</h3>
                        <p className="text-sm">Announce reward points availability to customers</p>
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="font-semibold">Point Rewards Available</h4>
                        <p className="text-sm text-gray-600">Social Media</p>
                        <div className="flex items-center space-x-2 mt-2">
                          <Badge className="bg-green-100 text-green-800 text-xs">Valid</Badge>
                          <span className="text-xs text-gray-500">📥 1,749 downloads</span>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Button size="sm" variant="outline">Customize</Button>
                        <Button size="sm" className="bg-green-600 hover:bg-green-700 text-white w-full">
                          <Download className="w-4 h-4 mr-1" />
                          Download
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Template 3 */}
                <Card className="border-2 border-dashed border-gray-200 hover:border-orange-400 transition-colors">
                  <CardContent className="p-6">
                    <div className="aspect-video bg-gradient-to-br from-orange-500 to-red-600 rounded-lg mb-4 flex items-center justify-center">
                      <div className="text-white text-center">
                        <h3 className="font-bold text-lg">Cashback Offer</h3>
                        <p className="text-sm">Highlight cashback benefits for customers</p>
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="font-semibold">Cashback Offer</h4>
                        <p className="text-sm text-gray-600">Flyer</p>
                        <div className="flex items-center space-x-2 mt-2">
                          <Badge className="bg-red-100 text-red-800 text-xs">New</Badge>
                          <span className="text-xs text-gray-500">📥 890 downloads</span>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Button size="sm" variant="outline">Customize</Button>
                        <Button size="sm" className="bg-orange-600 hover:bg-orange-700 text-white w-full">
                          <Download className="w-4 h-4 mr-1" />
                          Download
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Campaign Performance and Marketing Resources */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Campaign Performance</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                    <Activity className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <h4 className="font-medium">Loyalty Program Banner</h4>
                    <p className="text-sm text-gray-600">Social Media Campaign</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-semibold text-green-600">+24%</p>
                  <p className="text-sm text-gray-600">Engagement</p>
                </div>
              </div>

              <div className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
                    <DollarSign className="w-5 h-5 text-orange-600" />
                  </div>
                  <div>
                    <h4 className="font-medium">Cashback Promotion</h4>
                    <p className="text-sm text-gray-600">Print Advertisement</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-semibold text-green-600">+18%</p>
                  <p className="text-sm text-gray-600">Conversion</p>
                </div>
              </div>

              <div className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                    <Users className="w-5 h-5 text-green-600" />
                  </div>
                  <div>
                    <h4 className="font-medium">Referral Campaign</h4>
                    <p className="text-sm text-gray-600">Digital Marketing</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-semibold text-green-600">+32%</p>
                  <p className="text-sm text-gray-600">Referrals</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Marketing Resources</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
                    <Package className="w-5 h-5 text-gray-600" />
                  </div>
                  <div>
                    <h4 className="font-medium">Brand Guidelines</h4>
                    <p className="text-sm text-gray-600">KOMARCE brand colors, fonts, and logo usage guidelines</p>
                  </div>
                </div>
                <Button 
                  onClick={() => {
                    toast({ title: "Brand Guidelines", description: "Brand guidelines PDF downloaded!" });
                  }}
                  size="sm" variant="outline"
                >
                  <Download className="w-4 h-4" />
                  Download PDF
                </Button>
              </div>

              <div className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                    <Gift className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <h4 className="font-medium">Logo Pack</h4>
                    <p className="text-sm text-gray-600">High-resolution KOMARCE logos in various formats</p>
                  </div>
                </div>
                <Button 
                  onClick={() => {
                    toast({ title: "Logo Pack", description: "KOMARCE logo pack downloaded!" });
                  }}
                  size="sm" variant="outline"
                >
                  <Download className="w-4 h-4" />
                  Download ZIP
                </Button>
              </div>

              <div className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                    <Eye className="w-5 h-5 text-green-600" />
                  </div>
                  <div>
                    <h4 className="font-medium">Video Templates</h4>
                    <p className="text-sm text-gray-600">Animated templates for social media and digital ads</p>
                  </div>
                </div>
                <Button 
                  onClick={() => {
                    toast({ title: "Gallery", description: "Opening marketing gallery..." });
                  }}
                  size="sm" variant="outline"
                >
                  <Eye className="w-4 h-4" />
                  View Gallery
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Create Custom Campaign */}
      <Card>
        <CardHeader>
          <CardTitle>Create Custom Campaign</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div>
              <h3 className="font-semibold mb-4">Campaign Details</h3>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="campaign-name">Campaign Name</Label>
                  <Input id="campaign-name" placeholder="Enter campaign name" />
                </div>
                
                <div>
                  <Label htmlFor="campaign-type">Campaign Type</Label>
                  <Select>
                    <SelectTrigger>
                      <SelectValue placeholder="Select campaign type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="banner">Banner</SelectItem>
                      <SelectItem value="social">Social Media</SelectItem>
                      <SelectItem value="flyer">Flyer</SelectItem>
                      <SelectItem value="poster">Poster</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="description">Description</Label>
                  <Textarea id="description" placeholder="Describe your campaign" />
                </div>

                <div>
                  <Label htmlFor="audience">Target Audience</Label>
                  <Textarea id="audience" placeholder="Describe your target audience" />
                </div>
              </div>
            </div>

            <div>
              <h3 className="font-semibold mb-4">Campaign Preview</h3>
              <div className="aspect-video bg-gray-100 rounded-lg flex items-center justify-center mb-4">
                <div className="text-center text-gray-500">
                  <Package className="w-12 h-12 mx-auto mb-2" />
                  <p>Campaign Preview</p>
                  <p className="text-sm">Your campaign will appear here</p>
                </div>
              </div>
              <Button 
                onClick={() => {
                  toast({ title: "Campaign Created", description: "Custom campaign created successfully!" });
                }}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white"
              >
                <Plus className="w-4 h-4 mr-2" />
                Create Campaign
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );

  // Render Leaderboard
  const renderLeaderboard = () => (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Merchant Leaderboard</h1>
        <p className="text-gray-600">Compare your performance with other merchants and track your ranking</p>
      </div>

      {/* Leaderboard Filters */}
      <Card>
        <CardContent className="p-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center space-y-4 sm:space-y-0">
            <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-4">
              <Select defaultValue="this-month">
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="this-month">This Month</SelectItem>
                  <SelectItem value="last-month">Last Month</SelectItem>
                  <SelectItem value="this-year">This Year</SelectItem>
                </SelectContent>
              </Select>

              <Select defaultValue="points">
                <SelectTrigger className="w-48">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="points">Points Distributed</SelectItem>
                  <SelectItem value="customers">Customer Count</SelectItem>
                  <SelectItem value="revenue">Revenue</SelectItem>
                </SelectContent>
              </Select>

              <Button 
                onClick={() => {
                  toast({ title: "Trends", description: "Loading performance trends..." });
                }}
                variant="outline"
              >
                <TrendingUp className="w-4 h-4 mr-2" />
                View Trends
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Leaderboard Tabs */}
      <Tabs defaultValue="global" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="global">Global Leaderboard</TabsTrigger>
          <TabsTrigger value="regional">Regional Ranking</TabsTrigger>
          <TabsTrigger value="category">Category Leaders</TabsTrigger>
        </TabsList>

        <TabsContent value="global" className="space-y-6">
          {/* Global Merchant Leaderboard */}
          <Card>
            <CardHeader>
              <CardTitle>Global Merchant Leaderboard</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-16">#</TableHead>
                    <TableHead>Merchant</TableHead>
                    <TableHead>Points</TableHead>
                    <TableHead>Customers</TableHead>
                    <TableHead>Revenue</TableHead>
                    <TableHead>Tier</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {leaderboardData.map((merchant, index) => (
                    <TableRow key={index} className={index < 3 ? 'bg-gradient-to-r from-yellow-50 to-orange-50' : ''}>
                      <TableCell>
                        <div className="flex items-center space-x-2">
                          {index === 0 && <Crown className="w-5 h-5 text-yellow-500" />}
                          {index === 1 && <Award className="w-5 h-5 text-gray-400" />}
                          {index === 2 && <Award className="w-5 h-5 text-orange-500" />}
                          <span className="font-bold text-lg">{merchant.rank}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-3">
                          <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                            <span className="font-semibold text-blue-600">{merchant.code}</span>
                          </div>
                          <div>
                            <p className="font-medium">{merchant.name}</p>
                            <p className="text-sm text-gray-600">{merchant.code}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="font-bold text-blue-600">{merchant.points.toLocaleString()}</p>
                          <p className="text-xs text-gray-600">Points</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="font-bold text-green-600">{merchant.customers}</p>
                          <p className="text-xs text-gray-600">Customers</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="font-bold text-orange-600">৳{merchant.revenue.toLocaleString()}</p>
                          <p className="text-xs text-gray-600">Revenue</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={
                          merchant.tier === 'Co Founder' ? 'default' :
                          merchant.tier === 'Regional Manager' ? 'secondary' :
                          merchant.tier === 'Business Manager' ? 'outline' : 'destructive'
                        }>
                          {merchant.tier}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="regional" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Regional Ranking</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8">
                <p className="text-gray-500">Regional leaderboard data will be displayed here</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="category" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Category Leaders</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8">
                <p className="text-gray-500">Category-wise leader data will be displayed here</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Achievement Badges */}
      <Card>
        <CardHeader>
          <CardTitle>Achievement Badges</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="text-center p-6 border rounded-lg bg-yellow-50">
              <div className="w-16 h-16 bg-yellow-100 rounded-full mx-auto mb-4 flex items-center justify-center">
                <Crown className="w-8 h-8 text-yellow-600" />
              </div>
              <h3 className="font-semibold text-yellow-800">Top Performer</h3>
              <p className="text-sm text-yellow-600 mt-2">Highest points distributor this month</p>
            </div>

            <div className="text-center p-6 border rounded-lg bg-blue-50">
              <div className="w-16 h-16 bg-blue-100 rounded-full mx-auto mb-4 flex items-center justify-center">
                <Users className="w-8 h-8 text-blue-600" />
              </div>
              <h3 className="font-semibold text-blue-800">Customer Magnet</h3>
              <p className="text-sm text-blue-600 mt-2">Most new customers acquired</p>
            </div>

            <div className="text-center p-6 border rounded-lg bg-green-50">
              <div className="w-16 h-16 bg-green-100 rounded-full mx-auto mb-4 flex items-center justify-center">
                <TrendingUp className="w-8 h-8 text-green-600" />
              </div>
              <h3 className="font-semibold text-green-800">Growth Champion</h3>
              <p className="text-sm text-green-600 mt-2">Highest growth rate this quarter</p>
            </div>

            <div className="text-center p-6 border rounded-lg bg-purple-50">
              <div className="w-16 h-16 bg-purple-100 rounded-full mx-auto mb-4 flex items-center justify-center">
                <Star className="w-8 h-8 text-purple-600" />
              </div>
              <h3 className="font-semibold text-purple-800">Loyalty Master</h3>
              <p className="text-sm text-purple-600 mt-2">Best customer retention rate</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );

  // Render Profile Settings
  const renderProfile = () => (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Profile Settings</h1>
        <p className="text-gray-600">Manage your account information and preferences</p>
      </div>

      {/* Profile Overview */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-6">
              <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center">
                <span className="text-2xl font-bold text-blue-600">M</span>
              </div>
              <div>
                <h2 className="text-2xl font-bold">Merchant ID</h2>
                <p className="text-gray-600">Merchant • Joined {merchantData.joinedDate}</p>
                <div className="flex items-center space-x-4 mt-2">
                  <Badge className="bg-blue-100 text-blue-800">{merchantData.loyaltyPoints} Points</Badge>
                  <Badge className="bg-green-100 text-green-800">1 Customer</Badge>
                  <Badge className="bg-orange-100 text-orange-800">0 Referrals</Badge>
                </div>
              </div>
            </div>
            <Button className="bg-blue-600 hover:bg-blue-700 text-white">
              <Edit className="w-4 h-4 mr-2" />
              Edit Profile
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Profile Tabs */}
      <Tabs defaultValue="personal" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="personal">Personal Info</TabsTrigger>
          <TabsTrigger value="business">Business Details</TabsTrigger>
          <TabsTrigger value="security">Security</TabsTrigger>
          <TabsTrigger value="preferences">Preferences</TabsTrigger>
        </TabsList>

        <TabsContent value="personal" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Personal Information</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <Label htmlFor="first-name">First Name</Label>
                  <Input id="first-name" placeholder="Enter your first name" />
                </div>
                
                <div>
                  <Label htmlFor="last-name">Last Name</Label>
                  <Input id="last-name" placeholder="Enter your last name" />
                </div>

                <div>
                  <Label htmlFor="email">Email Address</Label>
                  <Input id="email" type="email" placeholder="Enter your email" />
                </div>

                <div>
                  <Label htmlFor="mobile">Mobile Number</Label>
                  <Input id="mobile" placeholder="Enter your mobile number" />
                </div>

                <div>
                  <Label htmlFor="fathers-name">Father's Name</Label>
                  <Input id="fathers-name" placeholder="Enter your father's name" />
                </div>

                <div>
                  <Label htmlFor="mothers-name">Mother's Name</Label>
                  <Input id="mothers-name" placeholder="Enter your mother's name" />
                </div>

                <div>
                  <Label htmlFor="voter-id">Voter ID / Passport Number</Label>
                  <Input id="voter-id" placeholder="Enter your voter ID or passport number" />
                </div>

                <div>
                  <Label htmlFor="blood-group">Blood Group</Label>
                  <Select>
                    <SelectTrigger>
                      <SelectValue placeholder="Select blood group" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="a+">A+</SelectItem>
                      <SelectItem value="a-">A-</SelectItem>
                      <SelectItem value="b+">B+</SelectItem>
                      <SelectItem value="b-">B-</SelectItem>
                      <SelectItem value="ab+">AB+</SelectItem>
                      <SelectItem value="ab-">AB-</SelectItem>
                      <SelectItem value="o+">O+</SelectItem>
                      <SelectItem value="o-">O-</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="md:col-span-2">
                  <Label htmlFor="house-address">House Address</Label>
                  <Textarea id="house-address" placeholder="Enter your full address" />
                </div>

                <div>
                  <Label htmlFor="country">Country</Label>
                  <Input id="country" placeholder="Enter your country" />
                </div>

                <div>
                  <Label htmlFor="city">City</Label>
                  <Input id="city" placeholder="Enter your city" />
                </div>

                <div>
                  <Label htmlFor="district">District</Label>
                  <Input id="district" placeholder="Enter your district" />
                </div>

                <div>
                  <Label htmlFor="postcode">Postcode</Label>
                  <Input id="postcode" placeholder="Enter your postcode" />
                </div>

                <div>
                  <Label htmlFor="police-station">Police Station</Label>
                  <Input id="police-station" placeholder="Enter your police station" />
                </div>

                <div>
                  <Label htmlFor="whatsapp">WhatsApp Number</Label>
                  <Input id="whatsapp" placeholder="Enter your WhatsApp number" />
                </div>

                <div>
                  <Label htmlFor="telegram">Telegram Username</Label>
                  <Input id="telegram" placeholder="Enter your Telegram username" />
                </div>
              </div>

              <div className="flex justify-end mt-6">
                <Button className="bg-blue-600 hover:bg-blue-700 text-white">
                  <Settings className="w-4 h-4 mr-2" />
                  Edit Profile
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="business" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Business Details</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8">
                <p className="text-gray-500">Business details section will be displayed here</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="security" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Security Settings</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8">
                <p className="text-gray-500">Security settings will be displayed here</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="preferences" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Preferences</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8">
                <p className="text-gray-500">Preference settings will be displayed here</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Top Header */}
      <div className="bg-white border-b sticky top-16 z-40">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between py-4">
            <div className="flex items-center space-x-6">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center">
                  <Store className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h1 className="text-xl font-bold text-gray-900">KOMARCE</h1>
                  <p className="text-sm text-gray-600">Merchant Portal</p>
                </div>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <Badge className="bg-yellow-100 text-yellow-800 px-3 py-1">
                <Star className="w-4 h-4 mr-1" />
                {merchantData.tier}
              </Badge>
              <div className="text-right">
                <p className="text-sm font-medium">{user?.firstName} {user?.lastName}</p>
                <p className="text-xs text-gray-600">75% to next rank</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Send Points Dialog */}
      <Dialog open={showSendPointsDialog} onOpenChange={setShowSendPointsDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Send Reward Points</DialogTitle>
          </DialogHeader>
          <form onSubmit={(e) => {
            e.preventDefault();
            const formData = new FormData(e.target as HTMLFormElement);
            sendPointsMutation.mutate({
              customerEmail: formData.get('customerEmail') as string,
              points: parseInt(formData.get('points') as string),
              description: formData.get('description') as string
            });
          }}>
            <div className="space-y-4">
              <div>
                <Label htmlFor="customerEmail">Customer Email</Label>
                <Input name="customerEmail" type="email" placeholder="customer@email.com" required />
              </div>
              <div>
                <Label htmlFor="points">Points to Send</Label>
                <Input name="points" type="number" min="1" placeholder="100" required />
              </div>
              <div>
                <Label htmlFor="description">Description (Optional)</Label>
                <Textarea name="description" placeholder="Reward for purchase..." />
              </div>
              <Button type="submit" className="w-full" disabled={sendPointsMutation.isPending}>
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
            <DialogTitle>Purchase Reward Points</DialogTitle>
          </DialogHeader>
          <form onSubmit={(e) => {
            e.preventDefault();
            const formData = new FormData(e.target as HTMLFormElement);
            purchasePointsMutation.mutate({
              points: parseInt(formData.get('points') as string),
              amount: parseInt(formData.get('amount') as string),
              paymentMethod: formData.get('paymentMethod') as string
            });
          }}>
            <div className="space-y-4">
              <div>
                <Label htmlFor="points">Points to Purchase</Label>
                <Input name="points" type="number" min="100" placeholder="1000" required />
              </div>
              <div>
                <Label htmlFor="amount">Amount ($)</Label>
                <Input name="amount" type="number" min="1" placeholder="1000" required />
              </div>
              <div>
                <Label htmlFor="paymentMethod">Payment Method</Label>
                <Select name="paymentMethod" required>
                  <SelectTrigger>
                    <SelectValue placeholder="Select payment method" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                    <SelectItem value="bkash">bKash</SelectItem>
                    <SelectItem value="nagad">Nagad</SelectItem>
                    <SelectItem value="credit_card">Credit Card</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button type="submit" className="w-full" disabled={purchasePointsMutation.isPending}>
                {purchasePointsMutation.isPending ? 'Processing...' : 'Purchase Points'}
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
              paymentMethod: formData.get('paymentMethod') as string,
              accountDetails: formData.get('accountDetails') as string
            });
          }}>
            <div className="space-y-4">
              <div>
                <Label htmlFor="amount">Amount to Withdraw ($)</Label>
                <Input name="amount" type="number" min="1" max="500" placeholder="100" required />
                <p className="text-sm text-gray-600">Available: $500</p>
              </div>
              <div>
                <Label htmlFor="paymentMethod">Withdrawal Method</Label>
                <Select name="paymentMethod" required>
                  <SelectTrigger>
                    <SelectValue placeholder="Select withdrawal method" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                    <SelectItem value="bkash">bKash</SelectItem>
                    <SelectItem value="nagad">Nagad</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="accountDetails">Account Details</Label>
                <Textarea name="accountDetails" placeholder="Account number/phone number..." required />
              </div>
              <Button type="submit" className="w-full" disabled={withdrawMutation.isPending}>
                {withdrawMutation.isPending ? 'Processing...' : 'Submit Withdrawal'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <div className="flex">
        {/* Sidebar */}
        <div className="w-64 bg-white border-r h-screen sticky top-32 overflow-y-auto">
          <div className="p-6">
            <nav className="space-y-2">
              <button onClick={() => setActiveSection('dashboard')} className={`w-full flex items-center space-x-3 p-3 rounded-lg transition-colors text-left ${activeSection === 'dashboard' ? 'bg-blue-50 text-blue-600 border border-blue-200' : 'text-gray-600 hover:bg-gray-50'}`}>
                <LayoutDashboard className="w-5 h-5" />
                <span>Dashboard</span>
              </button>
              <button onClick={() => setActiveSection('loyalty-points')} className={`w-full flex items-center space-x-3 p-3 rounded-lg transition-colors text-left ${activeSection === 'loyalty-points' ? 'bg-blue-50 text-blue-600 border border-blue-200' : 'text-gray-600 hover:bg-gray-50'}`}>
                <Coins className="w-5 h-5" />
                <span>Loyalty Points</span>
              </button>
              <button onClick={() => setActiveSection('cashback')} className={`w-full flex items-center space-x-3 p-3 rounded-lg transition-colors text-left ${activeSection === 'cashback' ? 'bg-blue-50 text-blue-600 border border-blue-200' : 'text-gray-600 hover:bg-gray-50'}`}>
                <DollarSign className="w-5 h-5" />
                <span>Cashback</span>
              </button>
              <button onClick={() => setActiveSection('customers')} className={`w-full flex items-center space-x-3 p-3 rounded-lg transition-colors text-left ${activeSection === 'customers' ? 'bg-blue-50 text-blue-600 border border-blue-200' : 'text-gray-600 hover:bg-gray-50'}`}>
                <Users className="w-5 h-5" />
                <span>Customers</span>
              </button>
              <button onClick={() => setActiveSection('wallets')} className={`w-full flex items-center space-x-3 p-3 rounded-lg transition-colors text-left ${activeSection === 'wallets' ? 'bg-blue-50 text-blue-600 border border-blue-200' : 'text-gray-600 hover:bg-gray-50'}`}>
                <Wallet className="w-5 h-5" />
                <span>Wallets</span>
              </button>
              <button onClick={() => setActiveSection('marketing')} className={`w-full flex items-center space-x-3 p-3 rounded-lg transition-colors text-left ${activeSection === 'marketing' ? 'bg-blue-50 text-blue-600 border border-blue-200' : 'text-gray-600 hover:bg-gray-50'}`}>
                <Target className="w-5 h-5" />
                <span>Marketing Tools</span>
              </button>
              <button onClick={() => setActiveSection('leaderboard')} className={`w-full flex items-center space-x-3 p-3 rounded-lg transition-colors text-left ${activeSection === 'leaderboard' ? 'bg-blue-50 text-blue-600 border border-blue-200' : 'text-gray-600 hover:bg-gray-50'}`}>
                <Award className="w-5 h-5" />
                <span>Leaderboard</span>
              </button>
              <button onClick={() => setActiveSection('profile')} className={`w-full flex items-center space-x-3 p-3 rounded-lg transition-colors text-left ${activeSection === 'profile' ? 'bg-blue-50 text-blue-600 border border-blue-200' : 'text-gray-600 hover:bg-gray-50'}`}>
                <Settings className="w-5 h-5" />
                <span>Profile</span>
              </button>
            </nav>

            {/* Merchant Status Widget */}
            <div className="mt-6 p-4 bg-gradient-to-br from-yellow-50 to-orange-50 rounded-lg border border-yellow-200">
              <div className="flex items-center space-x-2 mb-2">
                <Star className="w-5 h-5 text-yellow-600" />
                <span className="font-semibold text-yellow-800">{merchantData.tier}</span>
              </div>
              <p className="text-xs text-yellow-700 mb-3">Current Rank</p>
              <div className="w-full bg-yellow-200 rounded-full h-2 mb-2">
                <div className="bg-yellow-600 h-2 rounded-full" style={{ width: '75%' }}></div>
              </div>
              <p className="text-xs text-yellow-600">75% to next rank</p>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 p-6">
          {activeSection === 'dashboard' && renderDashboard()}
          {activeSection === 'loyalty-points' && renderLoyaltyPoints()}
          {activeSection === 'cashback' && renderCashback()}
          {activeSection === 'customers' && renderCustomers()}
          {activeSection === 'wallets' && renderWallets()}
          {activeSection === 'marketing' && renderMarketing()}
          {activeSection === 'leaderboard' && renderLeaderboard()}
          {activeSection === 'profile' && renderProfile()}
        </div>
      </div>
    </div>
  );
}