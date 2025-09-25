import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState, useEffect, useRef } from 'react';
import jsQR from 'jsqr';
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
import { NotificationProvider } from '@/hooks/use-notifications';
import NotificationBadge, { NotificationWrapper, MessageNotificationBadge } from '@/components/NotificationBadge';
import SecureChat from '@/components/SecureChat';
import { 
  LayoutDashboard, Package, ShoppingCart, Coins, BarChart, 
  Plus, Edit, Trash2, DollarSign, TrendingUp, Users, Store,
  Star, Award, Calendar, Eye, Settings, Target, Copy,
  CreditCard, Wallet, Send, Download, Gift, Crown,
  ArrowUpRight, ArrowDownRight, Filter, Search, MoreHorizontal,
  RefreshCw, MessageCircle,
  QrCode, UserPlus, Activity, PieChart, LineChart, Bell,
  Menu, X as XIcon, Home, Infinity, Trophy, User, Zap,
  AlertCircle, Percent, Calculator, Building2, Upload
} from 'lucide-react';
import { ResponsiveContainer, LineChart as RechartsLine, Line, XAxis, YAxis, CartesianGrid, Tooltip, 
         BarChart as RechartsBar, Bar, PieChart as RechartsPie, Pie, Cell } from 'recharts';

// QR Code Scan Component
function QRScanComponent({ onCustomerScanned, onError }: { 
  onCustomerScanned: (customer: any) => void; 
  onError: (error: string) => void; 
}) {
  const [scanMode, setScanMode] = useState<'camera' | 'upload'>('camera');
  const [isScanning, setIsScanning] = useState(false);
  const [qrCodeInput, setQrCodeInput] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const scanQRCode = async (qrCode: string) => {
    try {
      setIsScanning(true);
      const token = localStorage.getItem('token');
      if (!token) {
        onError('Please log in to scan QR codes');
        return;
      }

      const response = await fetch('/api/merchant/scan-customer', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ qrCode })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to scan QR code');
      }

      const result = await response.json();
      onCustomerScanned(result.customer);
    } catch (error: any) {
      onError(error.message || 'Failed to scan QR code');
    } finally {
      setIsScanning(false);
    }
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (file.type.startsWith('image/')) {
      // Handle image files - decode QR code
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            onError('Failed to process image');
            return;
          }
          
          canvas.width = img.width;
          canvas.height = img.height;
          ctx.drawImage(img, 0, 0);
          
          const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
          const code = jsQR(imageData.data, imageData.width, imageData.height);
          
          if (code) {
            setQrCodeInput(code.data);
            // Auto-scan the decoded QR code
            setTimeout(() => {
              scanQRCode(code.data);
            }, 500);
          } else {
            onError('No QR code found in the image');
          }
        };
        img.src = e.target?.result as string;
      };
      reader.readAsDataURL(file);
    } else {
      // For text files, read the content
      const reader = new FileReader();
      reader.onload = (e) => {
        const result = e.target?.result as string;
        setQrCodeInput(result.trim());
      };
      reader.readAsText(file);
    }
  };

  const handleManualInput = () => {
    if (qrCodeInput.trim()) {
      scanQRCode(qrCodeInput.trim());
    }
  };

  return (
    <div className="space-y-4">
      {/* Mode Selection */}
      <div className="flex space-x-2">
        <Button
          variant={scanMode === 'camera' ? 'default' : 'outline'}
          onClick={() => setScanMode('camera')}
          className="flex-1"
        >
          <QrCode className="w-4 h-4 mr-2" />
          Camera Scan
        </Button>
        <Button
          variant={scanMode === 'upload' ? 'default' : 'outline'}
          onClick={() => setScanMode('upload')}
          className="flex-1"
        >
          <Upload className="w-4 h-4 mr-2" />
          Upload Image
        </Button>
      </div>

      {scanMode === 'camera' ? (
        <div className="space-y-4">
          <div className="text-center p-8 border-2 border-dashed border-gray-300 rounded-lg">
            <QrCode className="w-16 h-16 mx-auto text-gray-400 mb-4" />
            <p className="text-gray-600 mb-4">Camera scanning not implemented yet</p>
            <p className="text-sm text-gray-500">Please use manual input or upload option</p>
          </div>
          
          {/* Manual QR Code Input */}
          <div className="space-y-2">
            <Label htmlFor="qrInput">Or enter QR code manually:</Label>
            <Input
              id="qrInput"
              placeholder="KOMARCE:CUSTOMER:..."
              value={qrCodeInput}
              onChange={(e) => setQrCodeInput(e.target.value)}
            />
            <Button 
              onClick={handleManualInput}
              disabled={!qrCodeInput.trim() || isScanning}
              className="w-full"
            >
              {isScanning ? 'Scanning...' : 'Scan QR Code'}
            </Button>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="text-center p-8 border-2 border-dashed border-gray-300 rounded-lg">
            <Upload className="w-16 h-16 mx-auto text-gray-400 mb-4" />
            <p className="text-gray-600 mb-2">Upload QR code image or text file</p>
            <p className="text-sm text-gray-500 mb-4">Supports PNG, JPG, GIF, TXT, JSON</p>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*,.txt,.json"
              onChange={handleFileUpload}
              className="hidden"
            />
            <Button 
              onClick={() => fileInputRef.current?.click()}
              variant="outline"
            >
              Choose File
            </Button>
          </div>
          
          {/* Manual QR Code Input */}
          <div className="space-y-2">
            <Label htmlFor="qrInputUpload">Or enter QR code manually:</Label>
            <Input
              id="qrInputUpload"
              placeholder="KOMARCE:CUSTOMER:..."
              value={qrCodeInput}
              onChange={(e) => setQrCodeInput(e.target.value)}
            />
            <Button 
              onClick={handleManualInput}
              disabled={!qrCodeInput.trim() || isScanning}
              className="w-full"
            >
              {isScanning ? 'Scanning...' : 'Scan QR Code'}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

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
  const [showQRScanDialog, setShowQRScanDialog] = useState(false);

  const { data: dashboardData = {}, isLoading } = useQuery({
    queryKey: ['/api/dashboard/merchant'],
    enabled: !!user && user.role === 'merchant',
    refetchInterval: 30000, // Refresh every 30 seconds instead of 3 seconds
    refetchIntervalInBackground: false, // Don't refetch in background
    staleTime: 10000, // Consider data fresh for 10 seconds
    cacheTime: 300000, // Cache for 5 minutes
    refetchOnWindowFocus: false, // Don't refetch on window focus
    refetchOnMount: true // Only refetch on component mount
  });

  const { data: walletData = {}, isLoading: walletsLoading } = useQuery({
    queryKey: ['/api/merchant/wallet'],
    enabled: !!user && user.role === 'merchant',
    refetchInterval: 30000, // Refresh every 30 seconds instead of 3 seconds
    refetchIntervalInBackground: false, // Don't refetch in background
    staleTime: 10000, // Consider data fresh for 10 seconds
    cacheTime: 300000, // Cache for 5 minutes
    refetchOnWindowFocus: false, // Don't refetch on window focus
    refetchOnMount: true // Only refetch on component mount
  });

  const { data: customers = [], refetch: refetchCustomers } = useQuery({
    queryKey: ['/api/merchant/scanned-customers'],
    enabled: !!user && user.role === 'merchant',
    refetchInterval: 30000, // Refresh every 30 seconds instead of 3 seconds
    refetchIntervalInBackground: false, // Don't refetch in background
    staleTime: 10000, // Consider data fresh for 10 seconds
    cacheTime: 300000, // Cache for 5 minutes
    refetchOnWindowFocus: false, // Don't refetch on window focus
    refetchOnMount: true, // Only refetch on component mount
    retry: 3, // Retry failed requests
    retryDelay: 1000, // Wait 1 second between retries
    onSuccess: (data) => {
      console.log('✅ Customer list updated:', data);
      // Force re-render if we have customers
      if (data && data.length > 0) {
        console.log('📋 Available customers:', data.map(c => `${c.fullName} - ${c.accountNumber}`));
      }
    }
  });

  // Only refresh on component mount, not continuously
  useEffect(() => {
    if (user && user.role === 'merchant') {
      // Only clear cache on initial load, not continuously
      queryClient.invalidateQueries(['/api/merchant/scanned-customers']);
    }
  }, [user, queryClient]);

  // Simple real-time updates for all merchant data - reduced frequency
  const { forceRefresh } = useSimpleRealtime([
    '/api/merchant/wallet',
    '/api/dashboard/merchant',
    '/api/merchant/scanned-customers',
    '/api/merchant/profile',
    '/api/merchant/leaderboard'
  ], 30000); // Update every 30 seconds instead of 1 second

  // Manual refresh function for immediate updates
  const handleManualRefresh = () => {
    queryClient.invalidateQueries({ queryKey: ['/api/merchant/wallet'] });
    queryClient.invalidateQueries({ queryKey: ['/api/dashboard/merchant'] });
    queryClient.invalidateQueries({ queryKey: ['/api/merchant/scanned-customers'] });
    toast({ title: "Refreshing Data", description: "Merchant data is being refreshed..." });
  };

  // Listen for point distribution updates
  useEffect(() => {
    const checkForPointUpdates = () => {
      // Check if loyalty points have increased
      const currentPoints = walletData?.rewardPointWallet?.availablePoints || 0;
      const previousPoints = localStorage.getItem('previousLoyaltyPoints');
      
      if (previousPoints && parseInt(previousPoints) < currentPoints) {
        const pointsGained = currentPoints - parseInt(previousPoints);
        toast({ 
          title: "🎉 Points Received!", 
          description: `You received ${pointsGained} loyalty points from admin distribution!`,
          duration: 5000
        });
      }
      
      // Store current points for next comparison
      localStorage.setItem('previousLoyaltyPoints', currentPoints.toString());
    };

    if (walletData?.rewardPointWallet?.availablePoints !== undefined) {
      checkForPointUpdates();
    }
  }, [walletData?.rewardPointWallet?.availablePoints]);

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
      
      // Force immediate refresh
      forceRefresh();
      
      // Additional immediate updates
      setTimeout(() => {
        refetchCustomers(); // Refresh customer list immediately
        forceRefresh(); // Force another refresh
      }, 100);
      
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
    loyaltyPoints: walletData?.rewardPointWallet?.availablePoints || 0,
    totalCashback: walletData?.cashbackIncome || 0,
    balance: walletData?.commerceWalletBalance || 0,
    incomeBalance: walletData?.incomeWalletBalance || 0,
    registeredCustomers: customers?.length || 0,
    merchantName: merchantProfile?.user?.businessName || "Tech Store",
    tier: "Star Merchant",
    joinedDate: "Aug 2025",
    referralLink: "komarce.com/ref/m001",
    // Wallet breakdown
    rewardPointBalance: walletData?.rewardPointWallet?.availablePoints || 0,
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
        <div className="flex items-center gap-4">
          <Button 
            onClick={handleManualRefresh}
            variant="outline"
            size="sm"
            className="flex items-center gap-2"
          >
            <RefreshCw className="w-4 h-4" />
            Refresh
          </Button>
          <div className="relative">
            <Bell className="w-6 h-6 text-gray-600" />
            <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">1</span>
          </div>
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
              <div className="w-12 h-12 bg-red-100 rounded-2xl flex items-center justify-center">
                <Infinity className="w-6 h-6 text-red-600" />
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
              <div className="w-12 h-12 bg-red-100 rounded-2xl flex items-center justify-center">
                <Users className="w-6 h-6 text-red-500" />
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
              onClick={() => setShowQRScanDialog(true)}
              className="w-full justify-start bg-red-600 hover:bg-red-700"
            >
              <QrCode className="w-4 h-4 mr-2" />
              Scan Customer QR
            </Button>
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
          Issue Loyalty Points
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
        <Button onClick={() => setShowQRScanDialog(true)}>
          <QrCode className="w-4 h-4 mr-2" />
          Scan Customer QR
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
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Customer List</CardTitle>
              <p className="text-sm text-gray-500 mt-1">
                {customers.length > 0 ? `Showing ${customers.length} customer(s)` : 'No customers found'}
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                // Force refresh customer list
                queryClient.invalidateQueries(['/api/merchant/scanned-customers']);
                queryClient.removeQueries(['/api/merchant/scanned-customers']); // Remove all cached data
                setTimeout(() => {
                  refetchCustomers();
                }, 100);
              }}
              className="text-blue-600 border-blue-300 hover:bg-blue-50"
            >
              <RefreshCw className="w-4 h-4 mr-1" />
              Clear Cache & Refresh
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Account Number</TableHead>
                <TableHead>Mobile</TableHead>
                <TableHead>Loyalty Points</TableHead>
                <TableHead>Tier</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {customers.length > 0 ? customers.map((customer: any) => (
                <TableRow key={customer.id}>
                  <TableCell className="font-medium">{customer.fullName}</TableCell>
                  <TableCell>{customer.accountNumber}</TableCell>
                  <TableCell>{customer.mobileNumber}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className="text-green-600">
                      {customer.currentPointsBalance} pts
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant={customer.tier === 'gold' ? 'default' : customer.tier === 'silver' ? 'secondary' : 'outline'}>
                      {customer.tier}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => {
                        setShowSendPointsDialog(true);
                        // Pre-select this customer in the form
                        setTimeout(() => {
                          const select = document.querySelector('select[name="customerId"]') as HTMLSelectElement;
                          if (select) select.value = customer.id;
                        }, 100);
                      }}
                    >
                      <Send className="w-4 h-4 mr-1" />
                      Send Points
                    </Button>
                  </TableCell>
                </TableRow>
              )) : (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-gray-500 py-8">
                    <div className="flex flex-col items-center space-y-2">
                      <QrCode className="w-8 h-8 text-gray-400" />
                      <p>No scanned customers yet</p>
                      <p className="text-sm">Scan customer QR codes to add them to your list</p>
                    </div>
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
    <NotificationProvider 
      currentUser={user ? {
        id: user.id,
        token: localStorage.getItem('token') || '',
        role: user.role
      } : undefined}
    >
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
              
              {/* Notification Bell */}
              <NotificationWrapper badgeProps={{ type: 'total', size: 'sm' }}>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setActiveSection("chat")}
                  className="relative"
                >
                  <Bell className="w-5 h-5 text-gray-600" />
                </Button>
              </NotificationWrapper>
              
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
              
              <NotificationWrapper badgeProps={{ type: 'messages' }}>
                <Button
                  variant={activeSection === "chat" ? "default" : "ghost"}
                  className="w-full justify-start"
                  onClick={() => setActiveSection("chat")}
                >
                  <MessageCircle className="w-4 h-4 mr-2" />
                  Secure Chat
                </Button>
              </NotificationWrapper>
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
            {activeSection === 'chat' && (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <h2 className="text-2xl font-bold text-gray-900">Secure Chat</h2>
                  <Badge variant="outline" className="text-blue-600 border-blue-300">
                    <MessageCircle className="w-4 h-4 mr-1" />
                    Merchant Chat
                  </Badge>
                </div>
                
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      <MessageCircle className="w-5 h-5 mr-2" />
                      Merchant Secure Chat
                    </CardTitle>
                    <p className="text-sm text-gray-600">
                      Communicate with local administrators and customers securely
                    </p>
                  </CardHeader>
                  <CardContent>
                    {user && (
                      <SecureChat 
                        currentUser={{
                          id: user.id,
                          name: `${user.firstName} ${user.lastName}`,
                          role: user.role,
                          token: localStorage.getItem('token') || ''
                        }}
                      />
                    )}
                  </CardContent>
                </Card>
              </div>
            )}
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
      <Dialog open={showSendPointsDialog} onOpenChange={(open) => {
        setShowSendPointsDialog(open);
        if (open) {
          // Force refresh customer list when dialog opens
          queryClient.invalidateQueries(['/api/merchant/scanned-customers']);
          queryClient.removeQueries(['/api/merchant/scanned-customers']); // Remove all cached data
          setTimeout(() => {
            refetchCustomers();
          }, 100);
        }
      }}>
        <DialogContent>
          <DialogHeader>
            <div className="flex items-center justify-between">
              <DialogTitle>Send Loyalty Points to Customer</DialogTitle>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  // Force refresh customer list
                  queryClient.invalidateQueries(['/api/merchant/scanned-customers']);
                  queryClient.removeQueries(['/api/merchant/scanned-customers']); // Remove all cached data
                  setTimeout(() => {
                    refetchCustomers();
                  }, 100);
                }}
                className="text-blue-600 border-blue-300 hover:bg-blue-50"
              >
                <RefreshCw className="w-4 h-4 mr-1" />
                Clear Cache & Refresh
              </Button>
            </div>
          </DialogHeader>
          <form onSubmit={(e) => {
            e.preventDefault();
            const formData = new FormData(e.target as HTMLFormElement);
            const customerId = formData.get('customerId') as string;
            const points = parseInt(formData.get('points') as string);
            const description = formData.get('description') as string;
            
            // Validate customer selection
            if (!customerId || customerId.trim() === '') {
              toast({ 
                title: "Error", 
                description: "Please select a customer from the dropdown.", 
                variant: "destructive" 
              });
              return;
            }
            
            // Validate that customer exists in scanned customers
            const selectedCustomer = customers.find((c: any) => c.id === customerId);
            if (!selectedCustomer) {
              toast({ 
                title: "Error", 
                description: "Selected customer not found. Please refresh and try again.", 
                variant: "destructive" 
              });
              return;
            }
            
            sendPointsMutation.mutate({
              customerId,
              points,
              description
            });
          }} className="space-y-4">
            <div>
              <Label htmlFor="customerId">Customer</Label>
              <Select name="customerId" required key={customers.length}>
                <SelectTrigger>
                  <SelectValue placeholder="Select customer" />
                </SelectTrigger>
                <SelectContent>
                  {customers.length > 0 ? (
                    customers.map((customer: any) => (
                      <SelectItem key={customer.id} value={customer.id}>
                        {customer.fullName} - {customer.accountNumber} ({customer.currentPointsBalance} points)
                      </SelectItem>
                    ))
                  ) : (
                    <div className="p-2 text-sm text-gray-500">
                      No scanned customers found. Please scan a customer QR code first.
                    </div>
                  )}
                </SelectContent>
              </Select>
              {customers.length === 0 && (
                <p className="text-xs text-gray-500 mt-1">
                  💡 Tip: Use "Scan Customer QR" to add customers to your list
                </p>
              )}
              {customers.length > 0 && (
                <div className="mt-2 p-2 bg-green-50 border border-green-200 rounded">
                  <p className="text-xs text-green-600 font-medium">
                    ✅ {customers.length} customer(s) available for point transfer
                  </p>
                </div>
              )}
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
                {sendPointsMutation.isPending ? 'Sending...' : 'Send Loyalty Points'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* QR Code Scan Dialog */}
      <Dialog open={showQRScanDialog} onOpenChange={setShowQRScanDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Scan Customer QR Code</DialogTitle>
          </DialogHeader>
          <QRScanComponent 
            onCustomerScanned={(customer) => {
              toast({
                title: "Customer Added!",
                description: `${customer.fullName} has been added to your customer list.`,
              });
              // Force refresh customer list immediately with aggressive cache clearing
              queryClient.invalidateQueries(['/api/merchant/scanned-customers']);
              queryClient.removeQueries(['/api/merchant/scanned-customers']);
              setTimeout(() => {
                refetchCustomers();
              }, 100);
              setShowQRScanDialog(false);
            }}
            onError={(error) => {
              toast({
                title: "Scan Failed",
                description: error,
                variant: "destructive",
              });
            }}
          />
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
    </NotificationProvider>
  );
}