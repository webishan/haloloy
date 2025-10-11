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
import { useSimpleRealtime } from '@/hooks/use-simple-realtime';
import RewardNumberSystem from '@/components/RewardNumberSystem';
import GlobalNumberDisplay from '@/components/GlobalNumberDisplay';
import InfinityRewardsDisplay from '@/components/InfinityRewardsDisplay';
import ShoppingVoucherDisplay from '@/components/ShoppingVoucherDisplay';
import NewAffiliateRewardsDisplay from '@/components/NewAffiliateRewardsDisplay';
import RippleRewardsDisplay from '@/components/RippleRewardsDisplay';
import { 
  User, Wallet, Coins, TrendingUp, History, QrCode, Send, 
  Download, Gift, Crown, Star, Award, Calendar, Eye, Settings, 
  Target, Copy, ArrowUpRight, ArrowDownRight, Filter, Search, 
  MoreHorizontal, Bell, Menu, X as XIcon, Home, Plus, Edit, RefreshCw,
  Smartphone, Mail, Lock, Shield, CheckCircle, AlertCircle,
  Building2, Package, ShoppingCart, BarChart, PieChart, LineChart,
  Zap, Percent, Recycle, Heart, ArrowRight, ArrowLeft, Users
} from 'lucide-react';
import { ResponsiveContainer, LineChart as RechartsLine, Line, XAxis, YAxis, CartesianGrid, Tooltip, 
         BarChart as RechartsBar, Bar, PieChart as RechartsPie, Pie, Cell } from 'recharts';

// QR Code Image Component with proper authentication
function QRCodeImage() {
  const [qrImageUrl, setQrImageUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    const fetchQRImage = async () => {
      try {
        setLoading(true);
        setError(false);
        
        // Get the token from localStorage (check both customerToken and token)
        const customerToken = localStorage.getItem('customerToken');
        const token = localStorage.getItem('token');
        const authToken = customerToken || token;
        if (!authToken) {
          setError(true);
          setLoading(false);
          return;
        }

        // Create a blob URL for the authenticated image request
        const response = await fetch('/api/customer/qr-code-image', {
          headers: {
            'Authorization': `Bearer ${authToken}`
          }
        });

        if (!response.ok) {
          throw new Error('Failed to fetch QR code image');
        }

        const blob = await response.blob();
        const imageUrl = URL.createObjectURL(blob);
        setQrImageUrl(imageUrl);
      } catch (err) {
        console.error('Error fetching QR code image:', err);
        setError(true);
      } finally {
        setLoading(false);
      }
    };

    fetchQRImage();

    // Cleanup blob URL on unmount
    return () => {
      if (qrImageUrl) {
        URL.revokeObjectURL(qrImageUrl);
      }
    };
  }, []);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-full">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <p className="text-xs text-gray-500 mt-2">Loading QR Code...</p>
      </div>
    );
  }

  if (error || !qrImageUrl) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-4">
        <div className="w-24 h-24 bg-gray-100 rounded-lg flex items-center justify-center mb-3">
          <svg className="w-12 h-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z"></path>
          </svg>
        </div>
        <p className="text-sm font-medium text-gray-700 mb-1">QR Code</p>
        <p className="text-xs text-red-500">Failed to load</p>
        <button 
          onClick={() => window.location.reload()} 
          className="mt-2 px-3 py-1 text-xs bg-blue-500 text-white rounded hover:bg-blue-600"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center h-full">
      <img 
        src={qrImageUrl} 
        alt="Customer QR Code" 
        className="w-48 h-48 object-contain border-2 border-gray-200 rounded-lg shadow-sm"
      />
      <p className="text-xs text-gray-500 mt-2">Scan with merchant app</p>
    </div>
  );
}

export default function CustomerDashboard() {
  const { user, profile } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [activeSection, setActiveSection] = useState('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showTransferDialog, setShowTransferDialog] = useState(false);
  const [showQRDialog, setShowQRDialog] = useState(false);
  const [showProfileDialog, setShowProfileDialog] = useState(false);
  const [rewardsNotificationDismissed, setRewardsNotificationDismissed] = useState(false);

  const { data: dashboardData = {}, isLoading } = useQuery({
    queryKey: ['/api/customer/dashboard'],
    enabled: !!user && user.role === 'customer'
  });

  // Global Number System Queries
  const { data: globalNumbersData = { globalNumbers: [], count: 0 } } = useQuery({
    queryKey: ['/api/customer/global-numbers'],
    enabled: !!user && user.role === 'customer'
  });

  const { data: stepUpConfig = [] } = useQuery({
    queryKey: ['/api/customer/stepup-config'],
    enabled: !!user && user.role === 'customer'
  });

  const { data: globalNumberConfig = null } = useQuery({
    queryKey: ['/api/customer/global-number-config'],
    enabled: !!user && user.role === 'customer'
  });

  // QR Code query
  const { data: qrCodeData } = useQuery({
    queryKey: ['/api/customer/qr-code'],
    enabled: !!user && user.role === 'customer'
  });

  // QR Code generation mutation
  const generateQRCodeMutation = useMutation({
    mutationFn: async () => {
      const customerToken = localStorage.getItem('customerToken');
      const token = localStorage.getItem('token');
      const authToken = customerToken || token;
      const response = await fetch('/api/customer/qr-code', {
        headers: {
          'Authorization': `Bearer ${authToken}`
        }
      });
      if (!response.ok) throw new Error('Failed to generate QR code');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/customer/qr-code'] });
      queryClient.invalidateQueries({ queryKey: ['/api/customer/dashboard'] });
    }
  });

  const { data: customerProfile = {} } = useQuery({
    queryKey: ['/api/customer/profile'],
    enabled: !!user && user.role === 'customer',
    refetchInterval: 30000, // Refresh every 30 seconds instead of 3 seconds
    refetchIntervalInBackground: false, // Don't refetch in background
    staleTime: 10000, // Consider data fresh for 10 seconds
    cacheTime: 300000, // Cache for 5 minutes
    refetchOnWindowFocus: false, // Don't refetch on window focus
    refetchOnMount: true // Only refetch on component mount
  });

  const { data: walletData = {} } = useQuery({
    queryKey: ['/api/customer/wallet'],
    enabled: !!user && user.role === 'customer',
    refetchInterval: 30000, // Refresh every 30 seconds instead of 3 seconds
    refetchIntervalInBackground: false, // Don't refetch in background
    staleTime: 10000, // Consider data fresh for 10 seconds
    cacheTime: 300000, // Cache for 5 minutes
    refetchOnWindowFocus: false, // Don't refetch on window focus
    refetchOnMount: true // Only refetch on component mount
  });

  // Simple real-time updates for all customer data - reduced frequency
  const { forceRefresh } = useSimpleRealtime([
    '/api/customer/dashboard',
    '/api/customer/profile',
    '/api/customer/wallet',
    '/api/customer/transactions'
  ], 30000); // Update every 30 seconds instead of 1 second

  const { data: transactions = [], isLoading: isLoadingTransactions } = useQuery({
    queryKey: ['/api/customer/transactions'],
    enabled: !!user && user.role === 'customer'
  });

  // Country tax configuration (hardcoded per country, default 12%)
  const countryTaxMap: Record<string, number> = {
    BD: 0.12,
    IN: 0.12,
    US: 0.12
  };

  const customerCountry = (profile?.country || dashboardData?.profile?.country || 'BD') as string;
  const taxRate = countryTaxMap[customerCountry] ?? 0.12;

  const { data: transfers = [] } = useQuery({
    queryKey: ['/api/customer/transfers'],
    enabled: !!user && user.role === 'customer'
  });

  const { data: purchases = [] } = useQuery({
    queryKey: ['/api/customer/purchases'],
    enabled: !!user && user.role === 'customer'
  });

  // Ripple Rewards (when referred customers get StepUp rewards)
  const { data: rippleRewardsData } = useQuery({
    queryKey: ['/api/customer/wallet/ripple-rewards'],
    enabled: !!user && user.role === 'customer',
    refetchInterval: 60000 // Refresh every minute
  });

  // Shopping Vouchers
  const { data: shoppingVouchersData } = useQuery({
    queryKey: ['/api/customer/wallet/shopping-vouchers'],
    enabled: !!user && user.role === 'customer',
    refetchInterval: 60000 // Refresh every minute
  });

  const { data: serialNumber = {} } = useQuery({
    queryKey: ['/api/customer/serial-number'],
    enabled: !!user && user.role === 'customer'
  });

  // Advanced reward system data
  const { data: rewardDashboard = {} } = useQuery({
    queryKey: ['/api/customer/dashboard'],
    enabled: !!user && user.role === 'customer'
  });

  const { data: rewards = [] } = useQuery({
    queryKey: ['/api/customer/rewards'],
    enabled: !!user && user.role === 'customer'
  });

  const { data: affiliateLink = {} } = useQuery({
    queryKey: ['/api/customer/affiliate-link'],
    enabled: !!user && user.role === 'customer'
  });

  const { data: referrals = [] } = useQuery({
    queryKey: ['/api/customer/referrals'],
    enabled: !!user && user.role === 'customer'
  });

  const { data: vouchers = [] } = useQuery({
    queryKey: ['/api/customer/vouchers'],
    enabled: !!user && user.role === 'customer'
  });

  const { data: rewardStatus = {} } = useQuery({
    queryKey: ['/api/customer/status'],
    enabled: !!user && user.role === 'customer'
  });

  const { data: referralCommissions = [] } = useQuery({
    queryKey: ['/api/customer/referral-commissions'],
    enabled: !!user && user.role === 'customer'
  });

  const { data: wasteManagementRewards = [] } = useQuery({
    queryKey: ['/api/customer/waste-management'],
    enabled: !!user && user.role === 'customer'
  });

  const { data: medicalBenefits = [] } = useQuery({
    queryKey: ['/api/customer/medical-benefits'],
    enabled: !!user && user.role === 'customer'
  });

  // Referral System data
  const { data: referralInfo = {}, isLoading: referralInfoLoading, error: referralInfoError } = useQuery({
    queryKey: ['/api/customer/wallet/referral-info'],
    enabled: !!user && user.role === 'customer',
    retry: 3,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  const { data: referralStats = {}, isLoading: referralStatsLoading, error: referralStatsError } = useQuery({
    queryKey: ['/api/customer/wallet/referral-stats'],
    enabled: !!user && user.role === 'customer'
  });

  // Get StepUp rewards received by this customer
  const { data: stepUpRewards = [] } = useQuery({
    queryKey: ['/api/customer/stepup-rewards'],
    enabled: !!user && user.role === 'customer',
    select: (data: any) => Array.isArray(data) ? data : []
  });

  // Reset notification dismissal when new StepUp rewards are received
  useEffect(() => {
    if (stepUpRewards.length > 0) {
      // Check if the number of rewards has increased since last dismissal
      // This will show the notification again for new rewards
      const previousRewardCount = localStorage.getItem('previousRewardCount');
      const currentRewardCount = stepUpRewards.length;
      
      if (previousRewardCount && parseInt(previousRewardCount) < currentRewardCount) {
        setRewardsNotificationDismissed(false);
      }
      
      localStorage.setItem('previousRewardCount', currentRewardCount.toString());
    }
  }, [stepUpRewards.length]);

  // Enhanced customer data with Global Number system - using dashboard data as primary source
  const profileData = dashboardData.profile || customerProfile;
  const serialData = dashboardData.serialNumber || serialNumber;
  const walletInfo = dashboardData.wallet || walletData;
  
  // FIXED: Don't double-count points - use profile data as the source of truth
  const customerData = {
    fullName: profileData.fullName || 'John Doe',
    accountNumber: profileData.uniqueAccountNumber || 'KOM00000001',
    mobileNumber: profileData.mobileNumber || '+8801234567890',
    email: profileData.email || 'john.doe@example.com',
    tier: profileData.tier || 'bronze',
    pointsBalance: profileData.currentPointsBalance ?? 0, // Read from profile for Global Number system
    accumulatedPoints: profileData.accumulatedPoints ?? profileData.currentPointsBalance ?? 0,
    totalEarned: profileData.totalPointsEarned ?? 0, // Use profile data as single source of truth
    totalSpent: walletInfo.totalPointsSpent || 0,
    totalTransferred: walletInfo.totalPointsTransferred || 0,
    globalSerialNumber: serialData.globalSerialNumber || profileData.globalSerialNumber || 0,
    localSerialNumber: serialData.localSerialNumber || profileData.localSerialNumber || 0,
    profileComplete: profileData.profileComplete || false,
    qrCode: qrCodeData?.qrCode || profileData.qrCode || (profileData.id && profileData.uniqueAccountNumber ? `KOMARCE:CUSTOMER:${profileData.id}:${profileData.uniqueAccountNumber}` : null),
    // Global Number System data
    globalNumbers: globalNumbersData.globalNumbers || [],
    globalNumberCount: globalNumbersData.count || 0,
    stepUpConfig: stepUpConfig || [],
    globalNumberConfig: globalNumberConfig,
    pointsToNextGlobalNumber: globalNumberConfig ? Math.max(0, (globalNumberConfig.pointsThreshold || 1500) - (profileData.currentPointsBalance ?? profileData.accumulatedPoints ?? 0)) : 1500
  };

  // NEW: StepUp Reward Balance Calculation
  const stepUpRewardBalance = (() => {
    // Calculate total StepUp rewards from transactions
    const stepUpTransactions = Array.isArray(transactions) 
      ? transactions.filter((t: any) => 
          t.transactionType === 'reward' && 
          t.description && 
          t.description.includes('StepUp Reward')
        )
      : [];
    
    const totalStepUpRewards = stepUpTransactions.reduce((sum: number, t: any) => sum + (t.points || 0), 0);
    return Number.isFinite(totalStepUpRewards) ? totalStepUpRewards : 0;
  })();
  
  // NEW: Net Balance = StepUp rewards after tax
  const netBalance = Math.max(0, stepUpRewardBalance * (1 - taxRate));

  // Render Dashboard Section
  const renderDashboard = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">Customer Dashboard</h2>
        <div className="flex items-center space-x-2">
          <Badge variant="outline" className="bg-blue-100 text-blue-800">
            {customerData.tier.toUpperCase()}
          </Badge>
          {customerData.globalNumbers && customerData.globalNumbers.length > 0 && (
            <Badge variant="outline" className="bg-green-100 text-green-800">
              Global #{customerData.globalNumbers.map((num: any) => num.globalNumber || num).join(', ')}
            </Badge>
          )}
        </div>
      </div>

                {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  <Card>
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between">
                        <div>
                <p className="text-sm font-medium text-gray-600">Loyalty Points</p>
                <p className="text-2xl font-bold text-green-600">{customerData.pointsBalance.toLocaleString()}</p>
                <p className="text-xs text-gray-500">Points</p>
                        </div>
              <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                <Coins className="w-6 h-6 text-green-600" />
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between">
                        <div>
                <p className="text-sm font-medium text-gray-600">Total Earned</p>
                <p className="text-2xl font-bold text-blue-600">{customerData.totalEarned.toLocaleString()}</p>
                <p className="text-xs text-gray-500">Points</p>
                        </div>
              <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-blue-600" />
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between">
                        <div>
                <p className="text-sm font-medium text-gray-600">Total Spent</p>
                <p className="text-2xl font-bold text-orange-600">{customerData.totalSpent.toLocaleString()}</p>
                <p className="text-xs text-gray-500">Points</p>
                        </div>
              <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center">
                <ShoppingCart className="w-6 h-6 text-orange-600" />
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between">
                        <div>
                <p className="text-sm font-medium text-gray-600">Total Transferred</p>
                <p className="text-2xl font-bold text-purple-600">{customerData.totalTransferred.toLocaleString()}</p>
                <p className="text-xs text-gray-500">Points</p>
                        </div>
              <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center">
                <Send className="w-6 h-6 text-purple-600" />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>

      {/* Global Numbers, Income Wallet, Main Balance */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Global Numbers */}
        <Card className="border-2 border-yellow-200 bg-gradient-to-r from-yellow-50 to-orange-50">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-yellow-700">Global Numbers</p>
                <p className="text-3xl font-bold text-yellow-700">
                  {Array.isArray(customerData.globalNumbers) && customerData.globalNumbers.length > 0
                    ? customerData.globalNumbers.map((num: any) => num.globalNumber || num).join(', ')
                    : (customerData.globalSerialNumber && customerData.globalSerialNumber > 0 
                        ? customerData.globalSerialNumber 
                        : 'Not Assigned')}
                </p>
                <p className="text-xs text-yellow-700 mt-1">
                  Points to next Global Number: {customerData.pointsToNextGlobalNumber.toLocaleString()} pts
                </p>
              </div>
              <Crown className="w-8 h-8 text-yellow-600" />
            </div>
          </CardContent>
        </Card>

        {/* Income Wallet - NEW: Accurate StepUp Reward Logic */}
        <Card className="border-2 border-blue-200 bg-gradient-to-r from-blue-50 to-cyan-50">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-blue-700">Income Wallet</p>
                <p className="text-3xl font-bold text-blue-600">
                  {stepUpRewardBalance.toLocaleString()} pts
                </p>
                <p className="text-xs text-blue-600 mt-1">
                  StepUp rewards from milestone achievements
                </p>
              </div>
              <Wallet className="w-8 h-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        {/* NEW: Net Balance (after tax) */}
        <Card className="border-2 border-green-200 bg-gradient-to-r from-green-50 to-emerald-50">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-green-700">Net Balance (after tax)</p>
                <p className="text-3xl font-bold text-green-700">
                  {netBalance.toLocaleString()} pts
                </p>
                <p className="text-xs text-green-700 mt-1">
                  StepUp: {stepUpRewardBalance.toLocaleString()} pts • Tax {Math.round(taxRate*100)}%
                </p>
              </div>
              <Wallet className="w-8 h-8 text-green-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card>
                  <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <QrCode className="w-5 h-5 text-blue-600" />
              <span>My QR Code</span>
            </CardTitle>
                  </CardHeader>
                  <CardContent>
            <div className="text-center space-y-3">
              <div className="w-16 h-16 bg-gradient-to-br from-blue-100 to-purple-100 rounded-xl flex items-center justify-center mx-auto">
                <QrCode className="w-8 h-8 text-blue-600" />
              </div>
              <p className="text-sm text-gray-600">
                Unique QR code for merchant scanning
              </p>
              <Button 
                onClick={() => setShowQRDialog(true)} 
                className="w-full bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700"
              >
                <QrCode className="w-4 h-4 mr-2" />
                View & Share QR Code
              </Button>
            </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Send className="w-5 h-5" />
              <span>Transfer Points</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
            <p className="text-sm text-gray-600 mb-4">
              Send points to other customers
            </p>
            <Button onClick={() => setShowTransferDialog(true)} className="w-full">
              <Send className="w-4 h-4 mr-2" />
              Transfer Points
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <User className="w-5 h-5" />
              <span>Profile</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-600 mb-4">
              {customerData.profileComplete ? 'Profile Complete' : 'Complete Profile for Withdrawals'}
            </p>
            <Button 
              onClick={() => setShowProfileDialog(true)} 
              variant={customerData.profileComplete ? "outline" : "default"}
              className="w-full"
            >
              <User className="w-4 h-4 mr-2" />
              {customerData.profileComplete ? 'View Profile' : 'Complete Profile'}
            </Button>
          </CardContent>
        </Card>
                            </div>

                      </div>
  );

  // Render Wallet Section
  const renderWallet = () => (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-900">My Wallet</h2>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Wallet Summary</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Loyalty Points</span>
              <span className="text-2xl font-bold text-green-600">{customerData.pointsBalance.toLocaleString()}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Total Earned</span>
              <span className="text-lg font-semibold">{customerData.totalEarned.toLocaleString()}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Total Spent</span>
              <span className="text-lg font-semibold">{customerData.totalSpent.toLocaleString()}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Total Transferred</span>
              <span className="text-lg font-semibold">{customerData.totalTransferred.toLocaleString()}</span>
            </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
            <CardTitle>Account Information</CardTitle>
                  </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Account Number</span>
              <span className="font-mono">{customerData.accountNumber}</span>
                              </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Mobile Number</span>
              <span>{customerData.mobileNumber}</span>
                            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Tier</span>
              <Badge variant="outline" className="bg-blue-100 text-blue-800">
                {customerData.tier.toUpperCase()}
              </Badge>
                              </div>
            {customerData.globalNumbers && customerData.globalNumbers.length > 0 && (
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Global Numbers</span>
                <span className="font-semibold text-xl">#{customerData.globalNumbers.map((num: any) => num.globalNumber || num).join(', ')}</span>
                            </div>
            )}
          </CardContent>
        </Card>
                          </div>
    </div>
  );

  // Render Transactions Section
  const renderTransactions = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">Transaction History</h2>
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <History className="w-4 h-4" />
          <span>Complete transaction record</span>
        </div>
      </div>
      
      {/* Transaction Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="border-green-200 bg-green-50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-green-700">Total Earned</p>
                <p className="text-2xl font-bold text-green-600">
                  {transactions
                    .filter((t: any) => t.points > 0)
                    .reduce((sum: number, t: any) => sum + t.points, 0)
                    .toLocaleString()} pts
                </p>
              </div>
              <TrendingUp className="w-8 h-8 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-red-200 bg-red-50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-red-700">Total Spent</p>
                <p className="text-2xl font-bold text-red-600">
                  {Math.abs(transactions
                    .filter((t: any) => t.points < 0)
                    .reduce((sum: number, t: any) => sum + t.points, 0))
                    .toLocaleString()} pts
                </p>
              </div>
              <ShoppingCart className="w-8 h-8 text-red-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-blue-200 bg-blue-50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-blue-700">Total Transactions</p>
                <p className="text-2xl font-bold text-blue-600">
                  {transactions.length}
                </p>
              </div>
              <History className="w-8 h-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-purple-200 bg-purple-50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-purple-700">Current Balance</p>
                <p className="text-2xl font-bold text-purple-600">
                  {transactions.length > 0 ? transactions[transactions.length - 1].balanceAfter.toLocaleString() : '0'} pts
                </p>
              </div>
              <Wallet className="w-8 h-8 text-purple-500" />
            </div>
          </CardContent>
        </Card>
      </div>
      
      {/* Detailed Transaction Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Table className="w-4 h-4" />
            Detailed Transaction History
          </CardTitle>
          <p className="text-sm text-gray-600">
            Complete record of all your point transactions with detailed descriptions
          </p>
        </CardHeader>
        <CardContent>
          {isLoadingTransactions ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-600"></div>
              <span className="ml-2 text-gray-600">Loading transactions...</span>
            </div>
          ) : transactions && transactions.length > 0 ? (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[120px]">Date & Time</TableHead>
                    <TableHead className="w-[100px]">Type</TableHead>
                    <TableHead className="min-w-[200px]">Description</TableHead>
                    <TableHead className="w-[120px]">Points</TableHead>
                    <TableHead className="w-[120px]">Balance After</TableHead>
                    <TableHead className="w-[100px]">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {transactions.map((transaction: any) => (
                    <TableRow key={transaction.id} className="hover:bg-gray-50">
                      <TableCell>
                        <div>
                          <div className="font-medium">
                            {new Date(transaction.createdAt).toLocaleDateString()}
                          </div>
                          <div className="text-sm text-gray-500">
                            {new Date(transaction.createdAt).toLocaleTimeString()}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge 
                          variant={
                            transaction.transactionType === 'earned' ? 'default' :
                            transaction.transactionType === 'spent' ? 'destructive' :
                            transaction.transactionType === 'transfer' ? 'secondary' :
                            'outline'
                          }
                          className="capitalize"
                        >
                          {transaction.transactionType}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="max-w-[200px]">
                          <div className="font-medium text-gray-900 truncate">
                            {transaction.description || 'No description available'}
                          </div>
                          {transaction.source && (
                            <div className="text-sm text-gray-500">
                              Source: {transaction.source}
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className={`font-semibold ${
                          transaction.points > 0 ? 'text-green-600' : 'text-red-600'
                        }`}>
                          {transaction.points > 0 ? '+' : ''}{transaction.points.toLocaleString()}
                        </div>
                        <div className="text-xs text-gray-500">points</div>
                      </TableCell>
                      <TableCell>
                        <div className="font-medium">
                          {transaction.balanceAfter.toLocaleString()}
                        </div>
                        <div className="text-xs text-gray-500">points</div>
                      </TableCell>
                      <TableCell>
                        <Badge 
                          variant={
                            transaction.status === 'completed' ? 'default' :
                            transaction.status === 'pending' ? 'secondary' :
                            transaction.status === 'failed' ? 'destructive' :
                            'outline'
                          }
                          className="capitalize"
                        >
                          {transaction.status || 'completed'}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="text-center py-12">
              <History className="w-16 h-16 mx-auto mb-4 text-gray-300" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No Transactions Yet</h3>
              <p className="text-gray-500 mb-4">
                Your transaction history will appear here once you start earning or spending points.
              </p>
              <div className="text-sm text-gray-400">
                <p>• Earn points through purchases and activities</p>
                <p>• Spend points on rewards and transfers</p>
                <p>• All transactions will be tracked here</p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );

  // Render Transfers Section
  const renderTransfers = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">Point Transfers</h2>
        <Button onClick={() => setShowTransferDialog(true)}>
          <Send className="w-4 h-4 mr-2" />
          Transfer Points
                        </Button>
                      </div>
      
      <Card>
        <CardHeader>
          <CardTitle>Transfer History</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Recipient/Sender</TableHead>
                <TableHead>Points</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {transfers.map((transfer: any) => (
                <TableRow key={transfer.id}>
                  <TableCell>{new Date(transfer.createdAt).toLocaleDateString()}</TableCell>
                  <TableCell>
                    {transfer.fromCustomerId === customerData.accountNumber ? 'Sent' : 'Received'}
                  </TableCell>
                  <TableCell>
                    {transfer.fromCustomerId === customerData.accountNumber ? 
                      `To: ${transfer.toCustomerId}` : 
                      `From: ${transfer.fromCustomerId}`
                    }
                  </TableCell>
                  <TableCell>{transfer.points}</TableCell>
                  <TableCell>
                    <Badge variant={
                      transfer.status === 'completed' ? 'default' :
                      transfer.status === 'pending' ? 'secondary' :
                      'destructive'
                    }>
                      {transfer.status}
                    </Badge>
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
          <CardTitle>Personal Information</CardTitle>
                  </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="fullName">Full Name</Label>
              <Input id="fullName" value={customerData.fullName} readOnly />
                              </div>
                              <div>
              <Label htmlFor="email">Email</Label>
              <Input id="email" value={customerData.email} readOnly />
                              </div>
                            </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="mobileNumber">Mobile Number</Label>
              <Input id="mobileNumber" value={customerData.mobileNumber} readOnly />
                          </div>
            <div>
              <Label htmlFor="accountNumber">Account Number</Label>
              <Input id="accountNumber" value={customerData.accountNumber} readOnly />
                      </div>
                      </div>
        </CardContent>
      </Card>

      {!customerData.profileComplete && (
        <Card className="border-orange-200 bg-orange-50">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2 text-orange-800">
              <AlertCircle className="w-5 h-5" />
              <span>Complete Profile for Withdrawals</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-orange-700 mb-4">
              To withdraw any type of income, you must complete your profile with the following mandatory details:
            </p>
            <ul className="list-disc list-inside text-orange-700 space-y-2">
              <li>Father's Name</li>
              <li>Mother's Name</li>
              <li>National ID (NID) card number or Passport number</li>
              <li>Blood Group</li>
              <li>Nominee Details</li>
            </ul>
            <Button 
              onClick={() => setShowProfileDialog(true)} 
              className="mt-4 bg-orange-600 hover:bg-orange-700"
            >
              Complete Profile
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );

  // Render Rewards Section
  const renderRewards = () => (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-900">Reward System</h2>
      
      {/* StepUp Reward System */}
      <RewardNumberSystem currentUser={user} />
      
      {/* Infinity Rewards */}
      <InfinityRewardsDisplay currentUser={user} />
      
      {/* Shopping Vouchers */}
      <ShoppingVoucherDisplay currentUser={user} />
      
      {/* Affiliate Rewards */}
      <NewAffiliateRewardsDisplay currentUser={user} />
      
      {/* Ripple Rewards */}
      <RippleRewardsDisplay currentUser={user} />
    </div>
  );

  // Render Referrals Section
  const renderReferrals = () => {
    const referralDetails = referralStats?.referralDetails || [];
    const totalReferrals = referralStats?.totalReferrals || 0;
    const totalCommission = referralStats?.totalCommissionEarned || 0;
    const commissionRate = referralStats?.commissionRate || 5;

    return (
      <div className="space-y-6">
        <h2 className="text-2xl font-bold text-gray-900">Referral System</h2>
        
        {/* Referral Link & Code */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Target className="w-5 h-5 text-blue-600" />
              <span>Your Affiliate Link</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {/* Referral info is stable now; hide debug panel */}
              
              <div>
                <Label htmlFor="referral-link">Share this link to earn {commissionRate}% commission</Label>
                <div className="flex space-x-2 mt-2">
                  <Input 
                    id="referral-link" 
                    value={
                      referralInfoLoading 
                        ? 'Loading...' 
                        : referralInfoError 
                          ? 'Error loading referral link' 
                          : referralInfo?.referralLink || 'No referral link available'
                    } 
                    readOnly 
                    data-testid="input-referral-link"
                  />
                  <Button 
                    onClick={() => {
                      if (referralInfo?.referralLink) {
                        navigator.clipboard.writeText(referralInfo.referralLink);
                        toast({ title: "Referral link copied to clipboard!" });
                      } else {
                        toast({ title: "No referral link to copy", variant: "destructive" });
                      }
                    }}
                    disabled={!referralInfo?.referralLink || referralInfoLoading}
                    data-testid="button-copy-link"
                  >
                    <Copy className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              <div>
                <Label htmlFor="referral-code">Your Referral Code</Label>
                <div className="flex space-x-2 mt-2">
                  <Input 
                    id="referral-code" 
                    value={
                      referralInfoLoading 
                        ? 'Loading...' 
                        : referralInfoError 
                          ? 'Error loading referral code' 
                          : referralInfo?.referralCode || 'No referral code available'
                    } 
                    readOnly 
                    className="font-bold text-lg"
                    data-testid="input-referral-code"
                  />
                  <Button 
                    onClick={() => {
                      if (referralInfo?.referralCode) {
                        navigator.clipboard.writeText(referralInfo.referralCode);
                        toast({ title: "Referral code copied to clipboard!" });
                      } else {
                        toast({ title: "No referral code to copy", variant: "destructive" });
                      }
                    }}
                    disabled={!referralInfo?.referralCode || referralInfoLoading}
                    data-testid="button-copy-code"
                  >
                    <Copy className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 pt-2">
                <div className="text-center p-4 bg-blue-50 rounded-lg">
                  <p className="text-2xl font-bold text-blue-600" data-testid="text-total-referrals">
                    {totalReferrals}
                  </p>
                  <p className="text-sm text-gray-600">Total Referrals</p>
                </div>
                <div className="text-center p-4 bg-green-50 rounded-lg">
                  <p className="text-2xl font-bold text-green-600" data-testid="text-active-referrals">
                    {referralStats?.activeReferrals || 0}
                  </p>
                  <p className="text-sm text-gray-600">Active Referrals</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Referral Statistics */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Referrals</p>
                  <p className="text-2xl font-bold text-blue-600" data-testid="stat-total-referrals">
                    {totalReferrals}
                  </p>
                </div>
                <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                  <Users className="w-6 h-6 text-blue-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Commission</p>
                  <p className="text-2xl font-bold text-green-600" data-testid="stat-total-commission">
                    {totalCommission.toLocaleString()} Points
                  </p>
                </div>
                <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                  <Coins className="w-6 h-6 text-green-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Commission Rate</p>
                  <p className="text-2xl font-bold text-purple-600">{commissionRate}%</p>
                  <p className="text-xs text-gray-500">Lifetime commission</p>
                </div>
                <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center">
                  <Percent className="w-6 h-6 text-purple-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
                      
        {/* Referral List */}
        <Card>
          <CardHeader>
            <CardTitle>Your Referrals</CardTitle>
          </CardHeader>
          <CardContent>
            {referralDetails.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <Users className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>No referrals yet. Share your referral link to get started!</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Referred Customer</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Registration Date</TableHead>
                    <TableHead>Points Earned</TableHead>
                    <TableHead>Commission Earned</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {referralDetails.map((referral: any, index: number) => (
                    <TableRow key={referral.customerId || index} data-testid={`row-referral-${index}`}>
                      <TableCell data-testid={`text-customer-name-${index}`}>
                        {referral.fullName}
                      </TableCell>
                      <TableCell>{referral.email}</TableCell>
                      <TableCell>
                        {new Date(referral.registrationDate).toLocaleDateString()}
                      </TableCell>
                      <TableCell>{referral.totalPointsEarned?.toLocaleString() || 0}</TableCell>
                      <TableCell>{referral.commissionEarned?.toLocaleString() || 0} Points</TableCell>
                      <TableCell>
                        <Badge variant={referral.status === 'active' ? 'default' : 'secondary'}>
                          {referral.status}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    );
  };

  // Render Vouchers Section
  const renderVouchers = () => (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-900">Shopping Vouchers</h2>
      
      {/* Shopping Vouchers Box */}
      <Card className="border-2 border-indigo-200 bg-gradient-to-r from-indigo-50 to-purple-50">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-indigo-700">Shopping Vouchers</p>
              <p className="text-3xl font-bold text-indigo-600">
                {shoppingVouchersData?.statistics?.totalVoucherValue?.toLocaleString() || 0} Points
              </p>
              <p className="text-xs text-indigo-600 mt-1">
                {shoppingVouchersData?.statistics?.activeVouchers || 0} active vouchers
              </p>
            </div>
            <Gift className="w-8 h-8 text-indigo-500" />
          </div>
        </CardContent>
      </Card>
      
      {/* Voucher Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
                        <div>
                <p className="text-sm font-medium text-gray-600">Active Vouchers</p>
                <p className="text-2xl font-bold text-green-600">
                  {vouchers.filter((v: any) => v.status === 'active').length}
                </p>
                        </div>
              <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                <Package className="w-6 h-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
                        <div>
                <p className="text-sm font-medium text-gray-600">Total Value</p>
                <p className="text-2xl font-bold text-blue-600">
                  {vouchers
                    .filter((v: any) => v.status === 'active')
                    .reduce((sum: number, v: any) => sum + parseFloat(v.voucherValue.toString()), 0)
                    .toLocaleString()} BDT
                </p>
                        </div>
              <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                <Coins className="w-6 h-6 text-blue-600" />
                      </div>
                    </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Used Vouchers</p>
                <p className="text-2xl font-bold text-orange-600">
                  {vouchers.filter((v: any) => v.status === 'used').length}
                </p>
              </div>
              <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center">
                <CheckCircle className="w-6 h-6 text-orange-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Voucher List */}
      <Card>
        <CardHeader>
          <CardTitle>Your Vouchers</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Voucher Code</TableHead>
                <TableHead>Merchant</TableHead>
                <TableHead>Value</TableHead>
                <TableHead>Expires</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {vouchers.map((voucher: any) => (
                <TableRow key={voucher.id}>
                  <TableCell className="font-mono">{voucher.voucherCode}</TableCell>
                  <TableCell>{voucher.merchantId}</TableCell>
                  <TableCell>{parseFloat(voucher.voucherValue.toString()).toLocaleString()} BDT</TableCell>
                  <TableCell>{new Date(voucher.expiresAt).toLocaleDateString()}</TableCell>
                  <TableCell>
                    <Badge variant={
                      voucher.status === 'active' ? 'default' :
                      voucher.status === 'used' ? 'secondary' :
                      'destructive'
                    }>
                      {voucher.status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {voucher.status === 'active' && (
                      <Button 
                        size="sm" 
                        onClick={() => {
                          navigator.clipboard.writeText(voucher.voucherCode);
                          toast({ title: "Voucher code copied to clipboard" });
                        }}
                      >
                        <Copy className="w-4 h-4" />
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );

  // Render Waste Management Section
  const renderWasteManagement = () => (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-900">Waste Management Rewards</h2>
      
      {/* Waste Management Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {[
          { type: 'plastic', rate: 5, color: 'bg-blue-100 text-blue-600' },
          { type: 'paper', rate: 3, color: 'bg-green-100 text-green-600' },
          { type: 'metal', rate: 8, color: 'bg-gray-100 text-gray-600' },
          { type: 'electronic', rate: 15, color: 'bg-purple-100 text-purple-600' }
        ].map((waste) => (
          <Card key={waste.type}>
            <CardContent className="p-6">
              <div className="text-center">
                <div className={`w-12 h-12 rounded-full ${waste.color} flex items-center justify-center mx-auto mb-4`}>
                  <Recycle className="w-6 h-6" />
                </div>
                <p className="text-sm font-medium text-gray-600 capitalize">{waste.type}</p>
                <p className="text-2xl font-bold">{waste.rate} pts/kg</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Process Waste Reward */}
      <Card>
        <CardHeader>
          <CardTitle>Process Waste Reward</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="waste-type">Waste Type</Label>
                <Select>
                  <SelectTrigger>
                    <SelectValue placeholder="Select waste type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="plastic">Plastic (5 pts/kg)</SelectItem>
                    <SelectItem value="paper">Paper (3 pts/kg)</SelectItem>
                    <SelectItem value="metal">Metal (8 pts/kg)</SelectItem>
                    <SelectItem value="organic">Organic (2 pts/kg)</SelectItem>
                    <SelectItem value="electronic">Electronic (15 pts/kg)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="waste-quantity">Quantity (kg)</Label>
                <Input id="waste-quantity" type="number" placeholder="Enter quantity" />
              </div>
            </div>
            <Button className="w-full">
              <Recycle className="w-4 h-4 mr-2" />
              Process Waste Reward
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Waste Management History */}
      <Card>
        <CardHeader>
          <CardTitle>Waste Management History</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Waste Type</TableHead>
                <TableHead>Quantity</TableHead>
                <TableHead>Rate</TableHead>
                <TableHead>Points Awarded</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {wasteManagementRewards.map((reward: any) => (
                <TableRow key={reward.id}>
                  <TableCell>{new Date(reward.createdAt).toLocaleDateString()}</TableCell>
                  <TableCell className="capitalize">{reward.wasteType}</TableCell>
                  <TableCell>{reward.quantity} kg</TableCell>
                  <TableCell>{reward.rewardRate} pts/kg</TableCell>
                  <TableCell className="font-semibold text-green-600">{reward.pointsAwarded} pts</TableCell>
                  <TableCell>
                    <Badge variant={reward.status === 'awarded' ? 'default' : 'secondary'}>
                      {reward.status}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );

  // Render Medical Benefits Section
  const renderMedicalBenefits = () => (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-900">Medical Facility Benefits</h2>
      
      {/* Medical Benefits Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Available Benefits</p>
                <p className="text-2xl font-bold text-green-600">
                  {medicalBenefits.filter((b: any) => b.status === 'available').length}
                </p>
              </div>
              <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                <Heart className="w-6 h-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Used Benefits</p>
                <p className="text-2xl font-bold text-blue-600">
                  {medicalBenefits.filter((b: any) => b.status === 'used').length}
                </p>
              </div>
              <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                <CheckCircle className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Value</p>
                <p className="text-2xl font-bold text-purple-600">
                  {medicalBenefits
                    .filter((b: any) => b.status === 'available')
                    .reduce((sum: number, b: any) => sum + parseFloat(b.benefitAmount.toString()), 0)
                    .toLocaleString()} BDT
                </p>
              </div>
              <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center">
                <Coins className="w-6 h-6 text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Medical Benefits List */}
      <Card>
        <CardHeader>
          <CardTitle>Your Medical Benefits</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Benefit Type</TableHead>
                <TableHead>Facility</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Expires</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {medicalBenefits.map((benefit: any) => (
                <TableRow key={benefit.id}>
                  <TableCell className="capitalize">{benefit.benefitType}</TableCell>
                  <TableCell>
                    <div>
                      <p className="font-medium">{benefit.facilityName}</p>
                      <p className="text-sm text-gray-500 capitalize">{benefit.facilityType}</p>
                    </div>
                  </TableCell>
                  <TableCell>{parseFloat(benefit.benefitAmount.toString()).toLocaleString()} BDT</TableCell>
                  <TableCell>{new Date(benefit.expiresAt).toLocaleDateString()}</TableCell>
                  <TableCell>
                    <Badge variant={
                      benefit.status === 'available' ? 'default' :
                      benefit.status === 'used' ? 'secondary' :
                      'destructive'
                    }>
                      {benefit.status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {benefit.status === 'available' && (
                      <Button size="sm">
                        <Heart className="w-4 h-4 mr-1" />
                        Use
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-white via-red-50 to-white pt-20">




      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col lg:flex-row gap-8">
          {/* Sidebar */}
          <div className="lg:w-64 flex-shrink-0">
            <div className="bg-white rounded-lg shadow-sm border p-6">
              <nav className="space-y-2 text-gray-700">
                <Button
                  variant={activeSection === "dashboard" ? "default" : "outline"}
                  className={`w-full justify-start ${activeSection !== "dashboard" ? "bg-white" : ""}`}
                  onClick={() => setActiveSection("dashboard")}
                >
                  <Home className="w-4 h-4 mr-2" />
                  Dashboard
                </Button>
                
                <Button
                  variant={activeSection === "main-balance" ? "default" : "outline"}
                  className={`w-full justify-start ${activeSection !== "main-balance" ? "bg-white" : ""}`}
                  onClick={() => setActiveSection("main-balance")}
                >
                  <TrendingUp className="w-4 h-4 mr-2" />
                  Main Balance
                </Button>
                
                <Button
                  variant={activeSection === "wallet" ? "default" : "outline"}
                  className={`w-full justify-start ${activeSection !== "wallet" ? "bg-white" : ""}`}
                  onClick={() => setActiveSection("wallet")}
                >
                  <Wallet className="w-4 h-4 mr-2" />
                  My Wallet
                </Button>
                
                <Button
                  variant={activeSection === "transactions" ? "default" : "outline"}
                  className={`w-full justify-start ${activeSection !== "transactions" ? "bg-white" : ""}`}
                  onClick={() => setActiveSection("transactions")}
                >
                  <History className="w-4 h-4 mr-2" />
                  Transactions
                </Button>
                
                <Button
                  variant={activeSection === "transfers" ? "default" : "outline"}
                  className={`w-full justify-start ${activeSection !== "transfers" ? "bg-white" : ""}`}
                  onClick={() => setActiveSection("transfers")}
                >
                  <Send className="w-4 h-4 mr-2" />
                  Transfers
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
                  variant={activeSection === "rewards" ? "default" : "ghost"}
                  className="w-full justify-start relative"
                  onClick={() => {
                    setActiveSection("rewards");
                    setRewardsNotificationDismissed(true);
                  }}
                >
                  <Gift className="w-4 h-4 mr-2" />
                  Rewards
                  {stepUpRewards.length > 0 && !rewardsNotificationDismissed && (
                    <Badge className="ml-auto bg-red-500 text-white text-xs h-5 w-5 rounded-full flex items-center justify-center">
                      {stepUpRewards.length}
                    </Badge>
                  )}
                </Button>
                
                <Button
                  variant={activeSection === "referrals" ? "default" : "ghost"}
                  className="w-full justify-start"
                  onClick={() => setActiveSection("referrals")}
                >
                  <Target className="w-4 h-4 mr-2" />
                  Referrals
                </Button>
                
                <Button
                  variant={activeSection === "vouchers" ? "default" : "ghost"}
                  className="w-full justify-start"
                  onClick={() => setActiveSection("vouchers")}
                >
                  <Package className="w-4 h-4 mr-2" />
                  Vouchers
                </Button>
                
                
                <Button
                  variant={activeSection === "waste-management" ? "default" : "ghost"}
                  className="w-full justify-start"
                  onClick={() => setActiveSection("waste-management")}
                >
                  <Recycle className="w-4 h-4 mr-2" />
                  Waste Management
                </Button>
                
                <Button
                  variant={activeSection === "medical-benefits" ? "default" : "ghost"}
                  className="w-full justify-start"
                  onClick={() => setActiveSection("medical-benefits")}
                >
                  <Heart className="w-4 h-4 mr-2" />
                  Medical Benefits
                </Button>
              </nav>
            </div>
          </div>

          {/* Main Content */}
          <div className="flex-1">
            {activeSection === 'dashboard' && renderDashboard()}
            {activeSection === 'wallet' && renderWallet()}
            {activeSection === 'transactions' && renderTransactions()}
            {activeSection === 'transfers' && renderTransfers()}
            {activeSection === 'profile' && renderProfile()}
            {activeSection === 'rewards' && renderRewards()}
            {activeSection === 'referrals' && renderReferrals()}
            {activeSection === 'vouchers' && renderVouchers()}
            {activeSection === 'waste-management' && renderWasteManagement()}
            {activeSection === 'medical-benefits' && renderMedicalBenefits()}
            {activeSection === 'main-balance' && (
              <div className="space-y-6">
                <h2 className="text-2xl font-bold text-gray-900">Main Balance</h2>
                <Card>
                  <CardHeader>
                    <CardTitle>Available Balance (after tax)</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-gray-600">Income Wallet</span>
                      <span className="text-xl font-semibold text-gray-900">{stepUpRewardBalance.toLocaleString()} pts</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-gray-600">Tax ({Math.round(taxRate*100)}%)</span>
                      <span className="text-xl font-semibold text-red-600">-{(stepUpRewardBalance * taxRate).toLocaleString()} pts</span>
                    </div>
                    <Separator />
                    <div className="flex items-center justify-between">
                      <span className="text-gray-800 font-medium">Net Balance</span>
                      <span className="text-2xl font-bold text-green-600">{netBalance.toLocaleString()} pts</span>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Transfer Points Dialog */}
      <Dialog open={showTransferDialog} onOpenChange={setShowTransferDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Transfer Points</DialogTitle>
          </DialogHeader>
          <form onSubmit={(e) => {
            e.preventDefault();
            const formData = new FormData(e.target as HTMLFormElement);
            const toCustomerId = formData.get('toCustomerId') as string;
            const points = parseInt(formData.get('points') as string);
            const description = formData.get('description') as string;
            
            // Here you would call the API to transfer points
            toast({ 
              title: "Transfer Successful", 
              description: `Transferred ${points} points to ${toCustomerId}` 
            });
            setShowTransferDialog(false);
          }} className="space-y-4">
            <div>
              <Label htmlFor="toCustomerId">Recipient Account Number</Label>
              <Input name="toCustomerId" required placeholder="KOM00000002" />
            </div>
            <div>
              <Label htmlFor="points">Points to Transfer</Label>
              <Input name="points" type="number" required min="1" max={customerData.pointsBalance} />
              <p className="text-sm text-gray-500 mt-1">
                Available: {customerData.pointsBalance.toLocaleString()} points
              </p>
            </div>
            <div>
              <Label htmlFor="description">Description (Optional)</Label>
              <Textarea name="description" placeholder="Reason for transfer..." />
            </div>
            <div className="flex justify-end space-x-2">
              <Button type="button" variant="outline" onClick={() => setShowTransferDialog(false)}>
                        Cancel
                      </Button>
              <Button type="submit">
                Transfer Points
              </Button>
                    </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* QR Code Dialog */}
      <Dialog open={showQRDialog} onOpenChange={setShowQRDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-center text-xl font-bold">My QR Code</DialogTitle>
          </DialogHeader>
          <div className="text-center space-y-6">
            {/* Enhanced QR Code Display */}
            <div className="bg-gradient-to-br from-blue-50 to-purple-50 p-6 rounded-2xl">
              <div className="w-72 h-72 bg-white rounded-xl border-4 border-blue-200 shadow-lg flex items-center justify-center mx-auto p-4">
                <QRCodeImage />
              </div>
              
              {/* Customer Info */}
              <div className="mt-4 p-4 bg-white/70 rounded-lg">
                <p className="text-sm font-semibold text-gray-800">{customerData.fullName}</p>
                <p className="text-xs text-gray-600">Account: {customerData.accountNumber}</p>
                <p className="text-xs text-blue-600 font-mono mt-1">
                  {customerData.qrCode ? customerData.qrCode.substring(0, 30) + '...' : 'Loading...'}
                </p>
              </div>
            </div>
            
            {/* Instructions */}
            <div className="bg-blue-50 p-4 rounded-lg">
              <h4 className="font-semibold text-blue-800 mb-2">How to use:</h4>
              <ul className="text-sm text-blue-700 space-y-1 text-left">
                <li>• Show this QR code to merchants</li>
                <li>• They can scan it to add you as a customer</li>
                <li>• Or copy the code and paste it manually</li>
                <li>• Download the image for offline use</li>
              </ul>
            </div>
            {/* Action Buttons */}
            <div className="grid grid-cols-2 gap-3">
              <Button 
                disabled={generateQRCodeMutation.isPending}
                className="w-full bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700"
                onClick={async () => {
                try {
                  let qrCodeData = customerData.qrCode;
                  
                  console.log('Copying QR code:', qrCodeData); // Debug log
                  
                  // If QR code is not available or invalid, try to generate it
                  if (!qrCodeData || qrCodeData === 'undefined' || qrCodeData === 'null' || !qrCodeData.startsWith('KOMARCE:CUSTOMER:')) {
                    console.log('QR code not valid, generating new one...');
                    
                    try {
                      const result = await generateQRCodeMutation.mutateAsync();
                      qrCodeData = result.qrCode;
                      console.log('Generated QR code:', qrCodeData);
                    } catch (generateError) {
                      console.error('Failed to generate QR code:', generateError);
                      toast({
                        title: "QR Code generation failed",
                        description: "Please try refreshing the page",
                        variant: "destructive"
                      });
                      return;
                    }
                  }
                  
                  // Final validation
                  if (!qrCodeData || !qrCodeData.startsWith('KOMARCE:CUSTOMER:')) {
                    toast({
                      title: "QR Code not ready",
                      description: "Please refresh the page and try again",
                      variant: "destructive"
                    });
                    return;
                  }
                  
                  await navigator.clipboard.writeText(qrCodeData);
                  toast({ 
                    title: "QR Code copied to clipboard",
                    description: "You can now paste this in the merchant portal"
                  });
                } catch (error) {
                  console.error('Error copying QR code:', error);
                  toast({
                    title: "Copy failed",
                    description: "Failed to copy QR code to clipboard",
                    variant: "destructive"
                  });
                }
              }}>
                {generateQRCodeMutation.isPending ? (
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Copy className="w-4 h-4 mr-2" />
                )}
                {generateQRCodeMutation.isPending ? 'Generating...' : 'Copy QR Code'}
              </Button>
              <Button 
                variant="outline"
                className="w-full border-2 border-green-500 text-green-600 hover:bg-green-50"
                onClick={async () => {
                  try {
                    const token = localStorage.getItem('token');
                    if (!token) {
                      toast({
                        title: "Error",
                        description: "Please log in to download QR code",
                        variant: "destructive",
                      });
                      return;
                    }

                    const response = await fetch('/api/customer/qr-code-image', {
                      headers: {
                        'Authorization': `Bearer ${token}`
                      }
                    });

                    if (!response.ok) {
                      throw new Error('Failed to fetch QR code image');
                    }

                    const blob = await response.blob();
                    const url = URL.createObjectURL(blob);
                    const link = document.createElement('a');
                    link.download = `komarce-qr-${customerData.accountNumber}.png`;
                    link.href = url;
                    link.click();
                    URL.revokeObjectURL(url);

                    toast({
                      title: "QR Code Downloaded",
                      description: "Your QR code has been downloaded successfully",
                    });
                  } catch (error) {
                    toast({
                      title: "Download Failed",
                      description: "Failed to download QR code",
                      variant: "destructive",
                    });
                  }
                }}
              >
                <Download className="w-4 h-4 mr-2" />
                Download PNG
              </Button>
            </div>
        </div>
        </DialogContent>
      </Dialog>

      {/* Profile Dialog */}
      <Dialog open={showProfileDialog} onOpenChange={setShowProfileDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Complete Profile</DialogTitle>
          </DialogHeader>
          <form onSubmit={(e) => {
            e.preventDefault();
            const formData = new FormData(e.target as HTMLFormElement);
            const fathersName = formData.get('fathersName') as string;
            const mothersName = formData.get('mothersName') as string;
            const nidNumber = formData.get('nidNumber') as string;
            const bloodGroup = formData.get('bloodGroup') as string;
            const nomineeDetails = formData.get('nomineeDetails') as string;
            
            // Here you would call the API to update profile
            toast({ 
              title: "Profile Updated", 
              description: "Your profile has been completed successfully" 
            });
            setShowProfileDialog(false);
          }} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="fathersName">Father's Name *</Label>
                <Input name="fathersName" required />
      </div>
              <div>
                <Label htmlFor="mothersName">Mother's Name *</Label>
                <Input name="mothersName" required />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="nidNumber">NID Number *</Label>
                <Input name="nidNumber" required />
              </div>
              <div>
                <Label htmlFor="bloodGroup">Blood Group *</Label>
                <Select name="bloodGroup" required>
                  <option value="A+">A+</option>
                  <option value="A-">A-</option>
                  <option value="B+">B+</option>
                  <option value="B-">B-</option>
                  <option value="AB+">AB+</option>
                  <option value="AB-">AB-</option>
                  <option value="O+">O+</option>
                  <option value="O-">O-</option>
                </Select>
              </div>
            </div>
            <div>
              <Label htmlFor="nomineeDetails">Nominee Details *</Label>
              <Textarea name="nomineeDetails" required placeholder="Name, relationship, contact information..." />
            </div>
            <div className="flex justify-end space-x-2">
              <Button type="button" variant="outline" onClick={() => setShowProfileDialog(false)}>
                Cancel
              </Button>
              <Button type="submit">
                Complete Profile
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}