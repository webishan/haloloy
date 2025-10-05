import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useSimpleRealtime } from "@/hooks/use-simple-realtime";
import { 
  User, LogOut, TrendingUp, Star, DollarSign, BarChart3, MessageCircle, Gift,
  Coins, ShoppingBag, Award, QrCode, Trophy, Heart, AlertCircle, Crown
} from "lucide-react";
import SecureChat from "@/components/SecureChat";
import QRTransferComponent from "@/components/QRTransferComponent";
import RewardNumberSystem from "@/components/RewardNumberSystem";
import GlobalRewardDashboard from "@/components/GlobalRewardDashboard";
import Logo from "@/components/ui/logo";
import { apiRequest } from "@/lib/queryClient";

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
      <div className="flex flex-col items-center justify-center h-full">
        <svg className="w-32 h-32 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z"></path>
        </svg>
        <p className="text-xs text-gray-500 mt-2">QR Code</p>
        <p className="text-xs text-red-500 mt-1">Failed to load</p>
      </div>
    );
  }

  return (
    <img 
      src={qrImageUrl} 
      alt="Customer QR Code" 
      className="w-full h-full object-contain p-2"
    />
  );
}

interface CustomerUser {
  id: string;
  username: string;
  email: string;
  firstName: string;
  lastName: string;
  role: 'customer';
  country: string;
  isActive: boolean;
  createdAt: string;
}

// Customer QR Code Display Component
function CustomerQRCodeDisplay({ currentUser }: { currentUser: CustomerUser | null }) {
  const { toast } = useToast();
  const [qrCodeImage, setQrCodeImage] = useState<string | null>(null);

  // Get customer QR code
  const { data: qrData, isLoading: qrLoading, error: qrError } = useQuery({
    queryKey: ['/api/customer/qr-code', currentUser?.id],
    enabled: !!currentUser,
    select: (data: any) => data || {}
  });

  // Generate QR code image when data is available
  useEffect(() => {
    if (qrData?.qrCode) {
      // Use the backend endpoint to get the QR code image
      setQrCodeImage('/api/customer/qr-code-image');
    }
  }, [qrData?.qrCode]);

  const copyQRCode = async () => {
    if (qrData?.qrCode) {
      try {
        if (navigator.clipboard && window.isSecureContext) {
          await navigator.clipboard.writeText(qrData.qrCode);
          toast({
            title: "QR Code Copied",
            description: "Your QR code has been copied to clipboard",
          });
        } else {
          // Fallback for older browsers or non-secure contexts
          const textArea = document.createElement('textarea');
          textArea.value = qrData.qrCode;
          textArea.style.position = 'fixed';
          textArea.style.left = '-999999px';
          textArea.style.top = '-999999px';
          document.body.appendChild(textArea);
          textArea.focus();
          textArea.select();
          document.execCommand('copy');
          textArea.remove();
          toast({
            title: "QR Code Copied",
            description: "Your QR code has been copied to clipboard",
          });
        }
      } catch (error) {
        console.error('Failed to copy QR code:', error);
        toast({
          title: "Copy Failed",
          description: "Please manually copy the QR code from the text below",
          variant: "destructive",
        });
      }
    }
  };

  const copyShareableLink = async () => {
    if (qrData?.qrCode) {
      try {
        const shareableLink = `${window.location.origin}/merchant/scan?qr=${encodeURIComponent(qrData.qrCode)}`;
        if (navigator.clipboard && window.isSecureContext) {
          await navigator.clipboard.writeText(shareableLink);
          toast({
            title: "Shareable Link Copied",
            description: "Link copied to clipboard. Share this with merchants for instant point transfers!",
          });
        } else {
          // Fallback for older browsers or non-secure contexts
          const textArea = document.createElement('textarea');
          textArea.value = shareableLink;
          textArea.style.position = 'fixed';
          textArea.style.left = '-999999px';
          textArea.style.top = '-999999px';
          document.body.appendChild(textArea);
          textArea.focus();
          textArea.select();
          document.execCommand('copy');
          textArea.remove();
          toast({
            title: "Shareable Link Copied",
            description: "Link copied to clipboard. Share this with merchants for instant point transfers!",
          });
        }
      } catch (error) {
        console.error('Failed to copy shareable link:', error);
        toast({
          title: "Copy Failed",
          description: "Please manually copy the link from the text below",
          variant: "destructive",
        });
      }
    }
  };

  const downloadQRCode = async () => {
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
      link.download = `komarce-qr-${currentUser?.id}.png`;
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
  };

  if (!currentUser) {
    return <div className="text-center py-8 text-gray-500">Please log in to view your QR code</div>;
  }

  if (qrLoading) {
    return <div className="text-center py-8">Loading your QR code...</div>;
  }

  if (qrError) {
    return (
      <div className="text-center py-8 text-red-500">
        <AlertCircle className="mx-auto h-12 w-12 mb-4" />
        <p>Failed to load QR code. Please try again.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="text-center">
        <div className="bg-white p-6 rounded-lg border-2 border-dashed border-gray-300 inline-block">
          <div className="bg-gray-100 p-6 rounded-lg mb-4 h-64 w-64">
            <QRCodeImage />
          </div>
          <p className="text-sm text-gray-600 mb-2">Your Unique QR Code</p>
          <div 
            className="bg-gray-50 p-3 rounded font-mono text-xs break-all cursor-pointer hover:bg-gray-100 transition-colors"
            onClick={copyQRCode}
            title="Click to copy QR code"
          >
            {qrData?.qrCode || 'No QR code available'}
          </div>
        </div>
      </div>
      
      <div className="text-center space-y-4">
        <div className="flex gap-2 justify-center flex-wrap">
          <Button onClick={copyQRCode} variant="outline" size="sm">
            <QrCode className="h-4 w-4 mr-2" />
            Copy QR Code
          </Button>
          <Button onClick={copyShareableLink} variant="default" size="sm">
            <QrCode className="h-4 w-4 mr-2" />
            Copy Shareable Link
          </Button>
          {qrCodeImage && (
            <Button onClick={downloadQRCode} variant="outline" size="sm">
              <QrCode className="h-4 w-4 mr-2" />
              Download
            </Button>
          )}
        </div>
        
        <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
          <h4 className="font-semibold text-blue-900 mb-2">How to Use Your QR Code:</h4>
          <div className="text-sm text-blue-800 space-y-1">
            <p>• <strong>Show QR Code:</strong> Let merchants scan your QR code directly</p>
            <p>• <strong>Share Link:</strong> Send the shareable link to merchants via WhatsApp, SMS, or email</p>
            <p>• <strong>Instant Transfer:</strong> Merchants can transfer points to you immediately</p>
          </div>
        </div>
        
        {qrData?.qrCode && (
          <div className="bg-gray-50 p-3 rounded border">
            <p className="text-xs text-gray-600 mb-2">Shareable Link:</p>
            <div className="bg-white p-2 rounded border font-mono text-xs break-all">
              {`${window.location.origin}/merchant/scan?qr=${encodeURIComponent(qrData.qrCode)}`}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function CustomerPortal() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [currentUser, setCurrentUser] = useState<CustomerUser | null>(null);
  const [activeTab, setActiveTab] = useState("dashboard");
  
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Login form state
  const [loginForm, setLoginForm] = useState({
    email: "",
    password: ""
  });

  // Check authentication on mount
  useEffect(() => {
    const token = localStorage.getItem('customerToken');
    const user = localStorage.getItem('customerUser');
    
    if (token && user) {
      setIsAuthenticated(true);
      setCurrentUser(JSON.parse(user));
    }
  }, []);

  // Login mutation
  const loginMutation = useMutation({
    mutationFn: async (credentials: { email: string; password: string; role: string }) => {
      const response = await fetch('/api/customer/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(credentials)
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Login failed');
      }
      
      return response.json();
    },
    onSuccess: (data) => {
      localStorage.setItem('customerToken', data.token);
      localStorage.setItem('customerUser', JSON.stringify(data.user));
      setIsAuthenticated(true);
      setCurrentUser(data.user);
      toast({ title: "Welcome!", description: "Successfully logged into Customer Portal" });
    },
    onError: (error: Error) => {
      toast({ title: "Login Failed", description: error.message, variant: "destructive" });
    }
  });

  // Dashboard data query
  const { data: dashboardData, isLoading: isDashboardLoading } = useQuery({
    queryKey: ['/api/customer/dashboard', currentUser?.id],
    enabled: isAuthenticated && !!currentUser,
    select: (data: any) => data || {},
    refetchInterval: 30000, // Refresh every 30 seconds instead of 3 seconds
    refetchIntervalInBackground: false, // Don't refetch in background
    staleTime: 10000, // Consider data fresh for 10 seconds
    cacheTime: 300000, // Cache for 5 minutes
    refetchOnWindowFocus: false, // Don't refetch on window focus
    refetchOnMount: true // Only refetch on component mount
  });

  // Customer profile query
  const { data: customerProfile, isLoading: profileLoading } = useQuery({
    queryKey: ['/api/customer/profile', currentUser?.id],
    enabled: isAuthenticated && !!currentUser,
    select: (data: any) => data || {},
    refetchInterval: 30000, // Refresh every 30 seconds instead of 3 seconds
    refetchIntervalInBackground: false, // Don't refetch in background
    staleTime: 10000, // Consider data fresh for 10 seconds
    cacheTime: 300000, // Cache for 5 minutes
    refetchOnWindowFocus: false, // Don't refetch on window focus
    refetchOnMount: true // Only refetch on component mount
  });

  // Transaction history query
  const { data: transactions = [], isLoading: transactionsLoading } = useQuery({
    queryKey: ['/api/customer/transactions', currentUser?.id],
    enabled: isAuthenticated && !!currentUser,
    select: (data: any) => Array.isArray(data) ? data : [],
    refetchInterval: 30000, // Refresh every 30 seconds instead of 3 seconds
    refetchIntervalInBackground: false, // Don't refetch in background
    staleTime: 10000, // Consider data fresh for 10 seconds
    cacheTime: 300000, // Cache for 5 minutes
    refetchOnWindowFocus: false, // Don't refetch on window focus
    refetchOnMount: true // Only refetch on component mount
  });

  // Reward numbers query
  const { data: rewardNumbers = [], isLoading: rewardNumbersLoading } = useQuery({
    queryKey: ['/api/customer/reward-numbers', currentUser?.id],
    enabled: isAuthenticated && !!currentUser,
    select: (data: any) => Array.isArray(data) ? data : []
  });

  // Simple real-time updates for all customer data
  const { forceRefresh } = useSimpleRealtime([
    '/api/customer/dashboard',
    '/api/customer/profile',
    '/api/customer/transactions',
    '/api/customer/wallet',
    '/api/customer/reward-numbers'
  ], 1000); // Update every 1 second

  // Auto-check for global serial eligibility when customer profile loads
  useEffect(() => {
    if (dashboardData && dashboardData.globalSerialAssigned && dashboardData.globalSerialNumber) {
      toast({
        title: "🎉 Global Serial Number Assigned!",
        description: `Congratulations! Your global serial number is #${dashboardData.globalSerialNumber}`,
        duration: 5000,
      });
    }
  }, [dashboardData, toast]);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!loginForm.email || !loginForm.password) {
      toast({ title: "Error", description: "Please fill in all fields", variant: "destructive" });
      return;
    }
    
    // Development testing bypass - works immediately
    if (loginForm.password === 'customer123') {
      const mockUser = {
        id: '1',
        username: loginForm.email.split('@')[0],
        email: loginForm.email,
        firstName: 'Test',
        lastName: 'Customer',
        role: 'customer',
        country: 'BD'
      };
      const mockToken = 'dev-token-' + Date.now();
      
      localStorage.setItem('customerToken', mockToken);
      localStorage.setItem('customerUser', JSON.stringify(mockUser));
      setIsAuthenticated(true);
      setCurrentUser(mockUser);
      toast({ title: "Welcome!", description: "Successfully logged into Customer Portal" });
      return;
    }
    
    loginMutation.mutate({ ...loginForm, role: 'customer' });
  };

  const handleLogout = () => {
    localStorage.removeItem('customerToken');
    localStorage.removeItem('customerUser');
    setIsAuthenticated(false);
    setCurrentUser(null);
    setActiveTab("dashboard");
    toast({ title: "Logged Out", description: "You have been logged out successfully." });
  };

  const getCountryFlag = (country: string) => {
    const flags: Record<string, string> = {
      'BD': '🇧🇩',
      'MY': '🇲🇾', 
      'AE': '🇦🇪',
      'PH': '🇵🇭'
    };
    return flags[country] || '🌍';
  };

  const getTierColor = (tier: string) => {
    return tier === 'gold' ? 'bg-yellow-100 text-yellow-800' :
           tier === 'silver' ? 'bg-gray-100 text-gray-800' :
           'bg-orange-100 text-orange-800';
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 flex items-center justify-center p-4 animate-gradient">
        <Card className="w-full max-w-lg komarce-card animate-fade-in">
          <CardHeader className="text-center komarce-gradient text-white rounded-t-2xl p-8">
            <div className="w-24 h-24 bg-white/20 backdrop-blur-sm rounded-full mx-auto mb-6 flex items-center justify-center animate-float">
              <Logo size="xl" />
            </div>
            <CardTitle className="text-3xl font-bold mb-2">Customer Portal</CardTitle>
            <p className="text-blue-100">Holyloy Loyalty Dashboard</p>
          </CardHeader>
          <CardContent className="p-8">
            <form onSubmit={handleLogin} className="space-y-6">
              <div className="animate-slide-up">
                <Label htmlFor="customer-email" className="text-sm font-semibold text-gray-700">Email Address</Label>
                <Input
                  id="customer-email"
                  type="email"
                  value={loginForm.email}
                  onChange={(e) => setLoginForm({...loginForm, email: e.target.value})}
                  placeholder="customer1@bd.holyloy.com"
                  className="mt-2 h-12 komarce-input focus-komarce"
                  required
                  data-testid="input-customer-email"
                />
              </div>
              
              <div className="animate-slide-up" style={{ animationDelay: '0.1s' }}>
                <Label htmlFor="customer-password" className="text-sm font-semibold text-gray-700">Password</Label>
                <Input
                  id="customer-password"
                  type="password"
                  value={loginForm.password}
                  onChange={(e) => setLoginForm({...loginForm, password: e.target.value})}
                  placeholder="Enter your password"
                  className="mt-2 h-12 komarce-input focus-komarce"
                  required
                  data-testid="input-customer-password"
                />
              </div>

              <Button 
                type="submit" 
                className="w-full h-12 komarce-button animate-slide-up"
                style={{ animationDelay: '0.2s' }}
                disabled={loginMutation.isPending}
                data-testid="button-customer-login"
              >
                {loginMutation.isPending ? "Authenticating..." : "Access Customer Portal"}
              </Button>
            </form>
            
            <div className="mt-6 text-center text-sm text-gray-500 animate-slide-up" style={{ animationDelay: '0.3s' }}>
              <p className="font-semibold text-gray-700 mb-2">Test Credentials:</p>
              <div className="space-y-1 text-xs">
                <p>customer1@bd.holyloy.com / customer123</p>
                <p>customer2@my.holyloy.com / customer123</p>
                <p>customer3@ae.holyloy.com / customer123</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="komarce-nav sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-20">
            <div className="flex items-center space-x-4 animate-slide-in-left">
              <Logo size="lg" className="animate-float" />
            </div>
            
            <div className="flex items-center space-x-6 animate-slide-in-right">
              {customerProfile && (customerProfile as any).currentTier && (
                <Badge className={`${getTierColor((customerProfile as any).currentTier || 'bronze')} animate-pulse-slow`}>
                  <Star className="w-4 h-4 mr-1" />
                  {((customerProfile as any).currentTier || 'bronze').toUpperCase()} MEMBER
                </Badge>
              )}
              
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 komarce-gradient rounded-full flex items-center justify-center text-white font-bold text-sm">
                  {currentUser?.firstName?.charAt(0)}{currentUser?.lastName?.charAt(0)}
                </div>
                <div className="text-sm">
                  <div className="font-semibold text-gray-900">{currentUser?.firstName} {currentUser?.lastName}</div>
                  <div className="text-gray-500">{getCountryFlag(currentUser?.country || '')} Member</div>
                </div>
              </div>
              
              <Button 
                onClick={handleLogout} 
                variant="outline" 
                size="sm" 
                className="hover:bg-red-50 hover:border-red-200 hover:text-red-600 transition-all duration-200"
                data-testid="button-customer-logout"
              >
                <LogOut className="w-4 h-4 mr-2" />
                Logout
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-8">
          <TabsList className="grid w-full grid-cols-7 komarce-card p-2 h-auto">
            <TabsTrigger 
              value="dashboard" 
              data-testid="tab-dashboard"
              className="flex flex-col items-center p-4 rounded-xl transition-all duration-200 hover:bg-blue-50 data-[state=active]:komarce-gradient data-[state=active]:text-white"
            >
              <BarChart3 className="w-5 h-5 mb-1" />
              <span className="text-xs font-medium">Dashboard</span>
            </TabsTrigger>
            <TabsTrigger 
              value="global-rewards" 
              data-testid="tab-global-rewards"
              className="flex flex-col items-center p-4 rounded-xl transition-all duration-200 hover:bg-purple-50 data-[state=active]:komarce-gradient data-[state=active]:text-white"
            >
              <Crown className="w-5 h-5 mb-1" />
              <span className="text-xs font-medium">Global Rewards</span>
            </TabsTrigger>
            <TabsTrigger 
              value="test-system" 
              data-testid="tab-test-system"
              className="flex flex-col items-center p-4 rounded-xl transition-all duration-200 hover:bg-pink-50 data-[state=active]:komarce-gradient data-[state=active]:text-white"
            >
              <Sparkles className="w-5 h-5 mb-1" />
              <span className="text-xs font-medium">Test System</span>
            </TabsTrigger>
            <TabsTrigger 
              value="rewards" 
              data-testid="tab-rewards"
              className="flex flex-col items-center p-4 rounded-xl transition-all duration-200 hover:bg-yellow-50 data-[state=active]:komarce-gradient data-[state=active]:text-white"
            >
              <Trophy className="w-5 h-5 mb-1" />
              <span className="text-xs font-medium">Reward Numbers</span>
            </TabsTrigger>
            <TabsTrigger 
              value="transactions" 
              data-testid="tab-transactions"
              className="flex flex-col items-center p-4 rounded-xl transition-all duration-200 hover:bg-green-50 data-[state=active]:komarce-gradient data-[state=active]:text-white"
            >
              <DollarSign className="w-5 h-5 mb-1" />
              <span className="text-xs font-medium">Transactions</span>
            </TabsTrigger>
            <TabsTrigger 
              value="qr-transfer" 
              data-testid="tab-qr-transfer"
              className="flex flex-col items-center p-4 rounded-xl transition-all duration-200 hover:bg-indigo-50 data-[state=active]:komarce-gradient data-[state=active]:text-white"
            >
              <QrCode className="w-5 h-5 mb-1" />
              <span className="text-xs font-medium">QR Transfer</span>
            </TabsTrigger>
            <TabsTrigger 
              value="chat" 
              data-testid="tab-chat"
              className="flex flex-col items-center p-4 rounded-xl transition-all duration-200 hover:bg-orange-50 data-[state=active]:komarce-gradient data-[state=active]:text-white"
            >
              <MessageCircle className="w-5 h-5 mb-1" />
              <span className="text-xs font-medium">Chat</span>
            </TabsTrigger>
          </TabsList>

          {/* Dashboard Tab */}
          <TabsContent value="dashboard" className="space-y-6">
            {/* Dashboard Header with Refresh Button */}
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-bold text-gray-900">Dashboard</h2>
              <Button 
                onClick={() => {
                  forceRefresh();
                  toast({ title: "Refreshed", description: "Dashboard data updated!" });
                }}
                variant="outline"
                size="sm"
                className="flex items-center gap-2"
              >
                <TrendingUp className="w-4 h-4" />
                Refresh
              </Button>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <Card className="komarce-card animate-slide-up hover:shadow-komarce transition-all duration-300">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Loyalty Points</p>
                      <p className="text-3xl font-bold komarce-gradient-text">
                        {isDashboardLoading ? "..." : ((customerProfile as any)?.totalPointsEarned?.toLocaleString() || (dashboardData as any)?.profile?.totalPointsEarned?.toLocaleString() || 0)}
                      </p>
                    </div>
                    <div className="p-3 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full">
                      <Coins className="w-6 h-6 text-white" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="komarce-card animate-slide-up hover:shadow-komarce transition-all duration-300" style={{ animationDelay: '0.1s' }}>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Current Balance</p>
                      <p className="text-3xl font-bold komarce-gradient-text">
                        {isDashboardLoading ? "..." : ((customerProfile as any)?.currentPointsBalance?.toLocaleString() || (dashboardData as any)?.profile?.currentPointsBalance?.toLocaleString() || 0)}
                      </p>
                    </div>
                    <div className="p-3 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full">
                      <TrendingUp className="w-6 h-6 text-white" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              {(((customerProfile as any)?.globalSerialNumber > 0) || ((dashboardData as any)?.serialNumber?.globalSerialNumber > 0)) && (
                <Card className="komarce-card animate-slide-up hover:shadow-komarce-lg transition-all duration-300 border-4 border-gradient-to-r from-yellow-400 to-orange-500 bg-gradient-to-br from-yellow-50 to-orange-50 animate-glow" style={{ animationDelay: '0.2s' }}>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-lg font-bold text-orange-700 uppercase tracking-wide">🏆 Global Number</p>
                        <p className="text-8xl font-black text-transparent bg-clip-text bg-gradient-to-r from-yellow-600 to-orange-600 drop-shadow-2xl">
                          #{(customerProfile as any)?.globalSerialNumber > 0 ? (customerProfile as any)?.globalSerialNumber : (dashboardData as any)?.serialNumber?.globalSerialNumber}
                        </p>
                        <p className="text-sm text-orange-600 font-semibold mt-2">
                          Company-wide Sequential Achievement
                        </p>
                      </div>
                      <div className="relative animate-float">
                        <Crown className="w-12 h-12 text-yellow-500 animate-pulse" />
                        <div className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full animate-ping"></div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              <Card className="komarce-card animate-slide-up hover:shadow-komarce transition-all duration-300" style={{ animationDelay: '0.3s' }}>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Reward Numbers</p>
                      <p className="text-3xl font-bold komarce-gradient-text">
                        {isDashboardLoading ? "..." : (rewardNumbers.length || 0)}
                      </p>
                    </div>
                    <div className="p-3 bg-gradient-to-r from-green-500 to-blue-500 rounded-full">
                      <Award className="w-6 h-6 text-white" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Member Profile */}
            {customerProfile && (
              <Card className="komarce-card animate-slide-up" style={{ animationDelay: '0.4s' }}>
                <CardHeader className="border-b bg-gradient-to-r from-blue-50 to-purple-50 rounded-t-2xl">
                  <CardTitle className="flex items-center">
                    <div className="p-2 komarce-gradient rounded-full mr-3">
                      <User className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <span className="komarce-gradient-text text-xl">Member Profile</span>
                      <CardDescription className="text-gray-600 mt-1">Your loyalty membership information and tier status</CardDescription>
                    </div>
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    <div className="p-4 bg-blue-50 rounded-xl border border-blue-200">
                      <p className="text-sm font-medium text-blue-700 mb-2">Member Since</p>
                      <p className="text-lg font-bold text-blue-900">
                        {new Date(currentUser?.createdAt || '').toLocaleDateString()}
                      </p>
                    </div>
                    
                    <div className="p-4 bg-purple-50 rounded-xl border border-purple-200">
                      <p className="text-sm font-medium text-purple-700 mb-2">Current Tier</p>
                      <Badge className={`${getTierColor(customerProfile.currentTier || 'bronze')} text-sm px-3 py-1`}>
                        <Star className="w-4 h-4 mr-1" />
                        {(customerProfile.currentTier || 'bronze').toUpperCase()}
                      </Badge>
                    </div>
                    
                    <div className="p-4 bg-pink-50 rounded-xl border border-pink-200">
                      <p className="text-sm font-medium text-pink-700 mb-2">Loyalty Points</p>
                      <p className="text-lg font-bold komarce-gradient-text">
                        {(customerProfile.totalPointsEarned || customerProfile.totalPoints || 0).toLocaleString()} points
                      </p>
                    </div>
                    
                    <div className="p-4 bg-green-50 rounded-xl border border-green-200">
                      <p className="text-sm font-medium text-green-700 mb-2">Current Balance</p>
                      <p className="text-lg font-bold text-green-600">
                        {(customerProfile.currentPointsBalance || 0).toLocaleString()} points
                      </p>
                    </div>
                    
                    {(customerProfile.globalSerialNumber > 0 || customerProfile.globalRewardNumbers) && (
                      <div className="col-span-full">
                        <div className="komarce-gradient p-6 rounded-2xl text-white animate-glow">
                          <div className="flex items-center space-x-4">
                            <Crown className="w-12 h-12 text-yellow-300 animate-pulse" />
                            <div>
                              <p className="text-lg font-bold uppercase tracking-wide mb-3">🏆 Global Number</p>
                              <p className="text-8xl font-black mb-3 drop-shadow-2xl">
                                #{customerProfile.globalSerialNumber > 0 ? customerProfile.globalSerialNumber : 'Pending'}
                              </p>
                              <p className="text-base font-semibold text-blue-100">
                                {customerProfile.globalSerialNumber > 0 ? 'Company-wide Sequential Achievement' : 'Earn 1,500 points to qualify'}
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                    
                    {(customerProfile.localSerialNumber || customerProfile.localRewardNumbers) && (
                      <div className="p-4 bg-orange-50 rounded-xl border border-orange-200">
                        <p className="text-sm font-medium text-orange-700 mb-2">Local Number</p>
                        <p className="text-lg font-bold text-orange-600">
                          #{customerProfile.localSerialNumber || 'Pending'}
                        </p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Tier Progress */}
            <Card className="komarce-card animate-slide-up" style={{ animationDelay: '0.5s' }}>
              <CardHeader className="border-b bg-gradient-to-r from-yellow-50 to-orange-50 rounded-t-2xl">
                <CardTitle className="flex items-center">
                  <div className="p-2 bg-gradient-to-r from-yellow-500 to-orange-500 rounded-full mr-3">
                    <Award className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <span className="komarce-gradient-text text-xl">Tier Progression</span>
                    <CardDescription className="text-gray-600 mt-1">Your progress towards the next tier level</CardDescription>
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <div className="space-y-6">
                  <div className="flex justify-between items-center">
                    <div className="text-center">
                      <div className="text-sm font-medium text-gray-600 mb-1">Current Tier</div>
                      <Badge className={`${getTierColor(customerProfile?.currentTier || 'bronze')} text-sm px-3 py-1`}>
                        {(customerProfile?.currentTier || 'bronze').toUpperCase()}
                      </Badge>
                    </div>
                    <ArrowRight className="w-6 h-6 text-gray-400" />
                    <div className="text-center">
                      <div className="text-sm font-medium text-gray-600 mb-1">Next Tier</div>
                      <Badge variant="outline" className="text-sm px-3 py-1">
                        {customerProfile?.currentTier === 'gold' ? 'MAX TIER' : customerProfile?.currentTier === 'silver' ? 'GOLD' : 'SILVER'}
                      </Badge>
                    </div>
                  </div>
                  
                  <div className="relative">
                    <div className="w-full bg-gray-200 rounded-full h-4 overflow-hidden">
                      <div 
                        className="komarce-gradient h-4 rounded-full transition-all duration-500 animate-gradient"
                        style={{ 
                          width: `${Math.min(100, ((customerProfile?.accumulatedPoints || 0) / 5000) * 100)}%` 
                        }}
                      ></div>
                    </div>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className="text-xs font-bold text-white drop-shadow-lg">
                        {Math.min(100, ((customerProfile?.accumulatedPoints || 0) / 5000) * 100).toFixed(1)}%
                      </span>
                    </div>
                  </div>
                  
                  <div className="text-center p-4 bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl">
                    <p className="text-sm font-semibold text-gray-700">
                      {5000 - (customerProfile?.accumulatedPoints || 0) > 0 
                        ? `${(5000 - (customerProfile?.accumulatedPoints || 0)).toLocaleString()} points to next tier`
                        : '🎉 Congratulations! You\'ve reached the maximum tier!'}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Global Rewards Tab */}
          <TabsContent value="global-rewards" className="space-y-6">
            <GlobalRewardDashboard currentUser={currentUser} />
          </TabsContent>

          {/* Test System Tab - Removed Legacy Component */}
          <TabsContent value="test-system" className="space-y-6">
            <div className="text-center py-8 text-gray-500">
              <p>Legacy test system has been removed. Focus is now exclusively on StepUp rewards.</p>
            </div>
          </TabsContent>

          {/* Reward Numbers Tab */}
          <TabsContent value="rewards" className="space-y-6">
            <RewardNumberSystem currentUser={currentUser} />
          </TabsContent>

          {/* Transactions Tab */}
          <TabsContent value="transactions" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Transaction History</CardTitle>
                <CardDescription>Your recent point transactions and activities</CardDescription>
              </CardHeader>
              <CardContent>
                {transactionsLoading ? (
                  <div className="text-center py-8">Loading transactions...</div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Points</TableHead>
                        <TableHead>Description</TableHead>
                        <TableHead>Source</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {transactions.slice(0, 20).map((transaction: any) => (
                        <TableRow key={transaction.id}>
                          <TableCell>{new Date(transaction.createdAt).toLocaleDateString()}</TableCell>
                          <TableCell>
                            <Badge variant="secondary">
                              {transaction.transactionType.replace('_', ' ')}
                            </Badge>
                          </TableCell>
                          <TableCell className={`font-medium ${transaction.points > 0 ? 'text-green-600' : 'text-red-600'}`}>
                            {transaction.points > 0 ? '+' : ''}{transaction.points}
                          </TableCell>
                          <TableCell>{transaction.description}</TableCell>
                          <TableCell>
                            <Badge variant="outline">{transaction.pointsSource}</Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* QR Transfer Tab */}
          <TabsContent value="qr-transfer" className="space-y-6">
            {/* Customer QR Code Display */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <QrCode className="w-5 h-5 mr-2" />
                  Your QR Code
                </CardTitle>
                <CardDescription>
                  Show this QR code to merchants to receive points
                </CardDescription>
              </CardHeader>
              <CardContent>
                <CustomerQRCodeDisplay currentUser={currentUser} />
              </CardContent>
            </Card>

            {/* QR Transfer Component */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <QrCode className="w-5 h-5 mr-2" />
                  QR Code Point Transfer
                </CardTitle>
                <CardDescription>
                  Send and receive points using QR codes for quick transactions
                </CardDescription>
              </CardHeader>
              <CardContent>
                {currentUser && (
                  <QRTransferComponent 
                    currentUser={{
                      id: currentUser.id,
                      name: `${currentUser.firstName} ${currentUser.lastName}`,
                      role: currentUser.role
                    }}
                  />
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Chat Tab */}
          <TabsContent value="chat" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <MessageCircle className="w-5 h-5 mr-2" />
                  Customer Support Chat
                </CardTitle>
                <CardDescription>
                  Get help and communicate with merchants and support team
                </CardDescription>
              </CardHeader>
              <CardContent>
                {currentUser && (
                  <SecureChat 
                    currentUser={{
                      id: currentUser.id,
                      name: `${currentUser.firstName} ${currentUser.lastName}`,
                      role: currentUser.role,
                      token: localStorage.getItem('customerToken') || ''
                    }}
                  />
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}