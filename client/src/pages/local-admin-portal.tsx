import { useState, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { useRealtimeBalance } from "@/hooks/use-realtime-balance";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { 
  Shield, MapPin, LogOut, Users, DollarSign, BarChart3, Store, Settings, MessageCircle,
  TrendingUp, Coins, CheckCircle, Send, Plus, AlertCircle, Menu, X as XIcon,
  Building2, UserCheck, Award, CreditCard, Globe, FileText, Headphones, 
  Database, BarChart, UserPlus, Building, Calendar, Download, Star as StarIcon, Star,
  Percent, Calculator, Eye, EyeOff, Edit, Trash2, Save, RefreshCw, Filter, Search, Bell, History
} from "lucide-react";
import SecureChat from "@/components/SecureChat";
import { useStorageListener } from "@/hooks/use-storage-listener";
import { NotificationProvider } from "@/hooks/use-notifications";
import NotificationBadge, { NotificationWrapper, MessageNotificationBadge } from "@/components/NotificationBadge";
import { HolyloyLogo } from "@/components/ui/holyloy-logo";

interface LocalAdminUser {
  id: string;
  username: string;
  email: string;
  firstName: string;
  lastName: string;
  role: 'local_admin';
  country: string;
  isActive: boolean;
  createdAt: string;
}

export default function LocalAdminPortal() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [currentUser, setCurrentUser] = useState<LocalAdminUser | null>(null);
  const [activeTab, setActiveTab] = useState("dashboard");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [timeFilter, setTimeFilter] = useState("daily");
  // Local admin point transaction history
  const localTransactionsKey = ['/api/admin/local/transactions', currentUser?.id] as const;
  const { data: localTransactions = [], refetch: refetchLocalTransactions, isFetching: txLoading } = useQuery({
    queryKey: localTransactionsKey as unknown as any,
    enabled: isAuthenticated && !!currentUser,
    queryFn: async () => {
      const res = await fetch(`/api/admin/local/transactions/${currentUser?.id}?t=${Date.now()}`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('localAdminToken')}` }
      });
      if (!res.ok) return [];
      const json = await res.json();
      return Array.isArray(json) ? json : (json?.transactions || []);
    },
    select: (data: any) => Array.isArray(data) ? data : (data?.transactions || []),
    refetchInterval: 15000,
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
    staleTime: 0,
    gcTime: 0
  });

  // Helper: compute totals and running balances
  const localTotals = useMemo(() => {
    const totals = { credits: 0, debits: 0, net: 0 } as { credits: number; debits: number; net: number };
    for (const tx of localTransactions) {
      const amt = Number(tx.amount || 0);
      if (tx.type === 'credit') totals.credits += amt; else totals.debits += amt;
    }
    totals.net = totals.credits - totals.debits;
    return totals;
  }, [localTransactions]);

  const transactionsWithRunning = useMemo(() => {
    if (!Array.isArray(localTransactions)) return [] as any[];
    // If backend doesn't return balanceAfter, compute running from first balance we find
    let running: number | null = null;
    const items = [...localTransactions].sort((a: any, b: any) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
    return items.map((tx: any) => {
      const amount = Number(tx.amount || 0);
      if (typeof tx.balanceAfter === 'number') {
        running = tx.balanceAfter;
      } else {
        if (running == null) running = 0; // start from 0 if unknown
        running = tx.type === 'credit' ? running + amount : running - amount;
      }
      return { ...tx, _runningBalance: running };
    }).reverse(); // show newest first
  }, [localTransactions]);
  const [authLoading, setAuthLoading] = useState(true);
  
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Real-time balance updates
  const { isConnected: balanceSocketConnected } = useRealtimeBalance(
    currentUser?.id,
    localStorage.getItem('localAdminToken') || undefined
  );

  // Login form state
  const [loginForm, setLoginForm] = useState({
    email: "",
    password: "",
    country: ""
  });
  const [showPassword, setShowPassword] = useState(false);

  // Point distribution form
  const [distributeForm, setDistributeForm] = useState({
    merchantId: "",
    points: "",
    description: ""
  });

  // Request points form (Local -> Global)
  const [requestForm, setRequestForm] = useState({
    pointsRequested: "",
    reason: ""
  });

  // Check authentication on mount
  useEffect(() => {
    const token = localStorage.getItem('localAdminToken');
    const user = localStorage.getItem('localAdminUser');
    
    if (token && user) {
      try {
        const userData = JSON.parse(user);
        if (userData.role === 'local_admin') {
          setIsAuthenticated(true);
          setCurrentUser(userData);
          // Warm up local transactions on load
          queryClient.invalidateQueries({ queryKey: ['/api/admin/local/transactions', userData.id] });
        } else {
          setIsAuthenticated(false);
          setCurrentUser(null);
        }
      } catch (error) {
        console.log('Error parsing user data:', error);
        setIsAuthenticated(false);
        setCurrentUser(null);
      }
    } else {
      setIsAuthenticated(false);
      setCurrentUser(null);
    }
    
    setAuthLoading(false);
  }, []);

  // Real-time balance from database API
  const { data: adminBalance, refetch: refetchBalance } = useQuery({
    queryKey: ['/api/admin/balance'],
    enabled: isAuthenticated,
    refetchInterval: 30000, // Poll every 30 seconds for real-time updates
    retry: false,
    staleTime: 0, // Always fetch fresh data
    cacheTime: 0 // Don't cache the results
  });

  // Listen for global updates and force refresh immediately
  useStorageListener(['/api/admin/balance','/api/admin/local/dashboard','/api/admin/merchants']);

  useEffect(() => {
    const handler = () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/balance'] });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/local/dashboard'] });
      refetchBalance();
    };
    window.addEventListener('dataUpdate', handler);
    return () => window.removeEventListener('dataUpdate', handler);
  }, [queryClient, refetchBalance]);

  // Get current user's country dashboard data  
  const { data: localDashboard, isLoading: isDashboardLoading } = useQuery({
    queryKey: ['/api/admin/local/dashboard', currentUser?.country],
    enabled: isAuthenticated && !!currentUser?.country,
    refetchInterval: 30000, // Refresh every 30 seconds
    retry: false
  });

  // Local Admin specific data queries - using mock data for now
  const { data: localMerchantStats } = useQuery({
    queryKey: ['/api/local-admin/merchant-stats'],
    enabled: isAuthenticated,
    queryFn: async () => {
      // Mock data for now - will be replaced with real API calls
      return {
        totalMerchants: 0,
        regularMerchants: 0,
        eMerchants: 0,
        starMerchants: 0,
        doubleStarMerchants: 0,
        tripleStarMerchants: 0,
        executiveMerchants: 0
      };
    }
  });

  const { data: localCustomerStats } = useQuery({
    queryKey: ['/api/local-admin/customer-stats'],
    enabled: isAuthenticated,
    queryFn: async () => {
      // Mock data for now
      return {
        totalCustomers: 0,
        activeCustomers: 0
      };
    }
  });

  const { data: localRewardStats } = useQuery({
    queryKey: ['/api/local-admin/reward-stats'],
    enabled: isAuthenticated,
    queryFn: async () => {
      // Mock data for now
      return {
        totalSales: 50000,
        distributedPoints: 25000,
        totalPoints: 100000
      };
    }
  });

  const { data: localWithdrawalStats } = useQuery({
    queryKey: ['/api/local-admin/withdrawal-stats'],
    enabled: isAuthenticated,
    queryFn: async () => {
      // Mock data for now
      return {
        totalWithdrawals: 15000,
        merchantWithdrawals: 8000,
        customerWithdrawals: 5000,
        withdrawableNotWithdrawn: 2000
      };
    }
  });

  const { data: localMerchantList } = useQuery({
    queryKey: ['/api/local-admin/merchant-list'],
    enabled: isAuthenticated,
    queryFn: async () => {
      // Mock data for now
      return [
        { id: '1', firstName: 'John', lastName: 'Doe', serialNumber: 'SN001', totalPoints: 5000, referralCount: 5 },
        { id: '2', firstName: 'Jane', lastName: 'Smith', serialNumber: 'SN002', totalPoints: 4500, referralCount: 3 },
        { id: '3', firstName: 'Bob', lastName: 'Johnson', serialNumber: 'SN003', totalPoints: 4000, referralCount: 7 }
      ];
    }
  });

  const { data: localCustomerList } = useQuery({
    queryKey: ['/api/local-admin/customer-list'],
    enabled: isAuthenticated,
    queryFn: async () => {
      // Mock data for now
      return [
        { id: '1', firstName: 'Alice', lastName: 'Brown', serialNumber: 'SN001', totalPoints: 5000, referralCount: 5 },
        { id: '2', firstName: 'Charlie', lastName: 'Wilson', serialNumber: 'SN002', totalPoints: 4500, referralCount: 3 },
        { id: '3', firstName: 'Diana', lastName: 'Davis', serialNumber: 'SN003', totalPoints: 4000, referralCount: 7 }
      ];
    }
  });

  const { data: localCofounderStaff } = useQuery({
    queryKey: ['/api/local-admin/cofounder-staff'],
    enabled: isAuthenticated,
    queryFn: async () => {
      // Mock data for now
      return {
        cofounders: [
          { id: '1', firstName: 'Local', lastName: 'Co-Founder', email: 'cofounder@holyloy.com' }
        ],
        staff: [
          { id: '1', firstName: 'Staff', lastName: 'Member', email: 'staff@holyloy.com', role: 'Manager' }
        ]
      };
    }
  });

  const { data: localAnalytics } = useQuery({
    queryKey: ['/api/local-admin/analytics'],
    enabled: isAuthenticated,
    queryFn: async () => {
      // Mock data for now
      return {
        salesPerformance: 85,
        popularBrands: ['Brand A', 'Brand B', 'Brand C'],
        customerBehavior: 'Active',
        inventoryStatus: 'Good'
      };
    }
  });

  const { data: localAcquisition } = useQuery({
    queryKey: ['/api/local-admin/acquisition'],
    enabled: isAuthenticated,
    queryFn: async () => {
      // Mock data for now
      return {
        customerReferral: 45,
        merchantSignup: 12,
        eMerchantSignup: 8
      };
    }
  });

  // Login mutation
  const loginMutation = useMutation({
    mutationFn: async (credentials: { email: string; password: string; adminType: string }) => {
      const response = await fetch('/api/admin/login', {
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
      localStorage.setItem('localAdminToken', data.token);
      localStorage.setItem('localAdminUser', JSON.stringify(data.user));
      setIsAuthenticated(true);
      setCurrentUser(data.user);
      toast({ title: "Welcome!", description: "Successfully logged into Local Admin Portal" });
    },
    onError: (error: Error) => {
      toast({ title: "Login Failed", description: error.message, variant: "destructive" });
    }
  });

  // Merchants query for the current country
  const { data: merchants = [], isLoading: merchantsLoading } = useQuery({
    queryKey: ['/api/admin/merchants', currentUser?.country],
    queryFn: async () => {
      const response = await fetch(`/api/admin/merchants/${currentUser?.country}`, {
        headers: { 
          'Authorization': `Bearer ${localStorage.getItem('localAdminToken')}`
        }
      });
      if (!response.ok) {
        throw new Error('Failed to fetch merchants');
      }
      return response.json();
    },
    enabled: isAuthenticated && !!currentUser?.country,
    retry: false
  });

  // Point distribution mutation
  const distributePointsMutation = useMutation({
    mutationFn: async (data: { merchantId: string; points: number; description: string }) => {
      const response = await fetch('/api/admin/distribute-points', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('localAdminToken')}`
        },
        body: JSON.stringify({
          toUserId: data.merchantId,
          points: data.points,
          description: data.description
        })
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Point distribution failed');
      }
      
      return response.json();
    },
    onSuccess: () => {
      toast({ title: "Points Distributed", description: "Points have been distributed to merchant successfully!" });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/balance'] });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/local/dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/merchants'] });
      queryClient.invalidateQueries({ queryKey: localTransactionsKey as unknown as any });
      refetchLocalTransactions();
      // Also invalidate merchant wallet cache to ensure merchant dashboard updates
      queryClient.invalidateQueries({ queryKey: ['/api/merchant/wallet'] });
      queryClient.invalidateQueries({ queryKey: ['/api/dashboard/merchant'] });
      refetchBalance(); // Force immediate balance update
      setDistributeForm({ merchantId: "", points: "", description: "" });
    },
    onError: (error: Error) => {
      toast({ title: "Distribution Failed", description: error.message, variant: "destructive" });
    }
  });

  // Create point generation request
  const createRequestMutation = useMutation({
    mutationFn: async (data: { pointsRequested: number; reason: string }) => {
      const response = await fetch('/api/admin/point-generation-request', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('localAdminToken')}`
        },
        body: JSON.stringify(data)
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to create request');
      }
      return response.json();
    },
    onSuccess: () => {
      toast({ title: 'Request submitted', description: 'Your request has been sent to Global Admin.' });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/point-generation-requests'] });
      queryClient.invalidateQueries({ queryKey: localTransactionsKey as unknown as any });
      refetchLocalTransactions();
      setRequestForm({ pointsRequested: "", reason: "" });
    },
    onError: (error: Error) => {
      toast({ title: 'Request failed', description: error.message, variant: 'destructive' });
    }
  });

  // List my requests
  const { data: myRequests = [] } = useQuery({
    queryKey: ['/api/admin/point-generation-requests'],
    enabled: isAuthenticated,
    queryFn: async () => {
      const res = await fetch('/api/admin/point-generation-requests', {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('localAdminToken')}` }
      });
      if (!res.ok) throw new Error('Failed to fetch requests');
      return res.json();
    }
  });

  const handleCreateRequest = () => {
    if (!requestForm.pointsRequested || !requestForm.reason) {
      toast({ title: 'Error', description: 'Enter points and reason', variant: 'destructive' });
      return;
    }
    createRequestMutation.mutate({ pointsRequested: parseInt(requestForm.pointsRequested), reason: requestForm.reason });
  };

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!loginForm.email || !loginForm.password) {
      toast({ title: "Error", description: "Please fill in all fields", variant: "destructive" });
      return;
    }
    loginMutation.mutate({ ...loginForm, adminType: 'local' });
  };

  const handleLogout = () => {
    localStorage.removeItem('localAdminToken');
    localStorage.removeItem('localAdminUser');
    setIsAuthenticated(false);
    setCurrentUser(null);
    setActiveTab("dashboard");
    // Clear query cache to prevent stale data
    queryClient.clear();
    toast({ title: "Logged Out", description: "You have been logged out successfully." });
    // Navigate to home page
    window.location.href = "/";
  };

  const handleDistributePoints = () => {
    if (!distributeForm.merchantId || !distributeForm.points || !distributeForm.description) {
      toast({ title: "Error", description: "Please fill in all fields", variant: "destructive" });
      return;
    }
    
    distributePointsMutation.mutate({
      merchantId: distributeForm.merchantId,
      points: parseInt(distributeForm.points),
      description: distributeForm.description
    });
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

  const getCountryName = (country: string) => {
    const names: Record<string, string> = {
      'BD': 'Bangladesh',
      'MY': 'Malaysia',
      'AE': 'United Arab Emirates',
      'PH': 'Philippines'
    };
    return names[country] || country;
  };

  // Show loading state while checking authentication
  if (authLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 via-emerald-50 to-teal-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-lg shadow-2xl border-0">
          <CardContent className="p-8 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Verifying authentication...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 via-white to-red-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-lg shadow-2xl border-0">
          <CardHeader className="text-center bg-gradient-to-r from-red-600 to-red-500 text-white rounded-t-lg">
            <div className="w-20 h-20 bg-white rounded-full mx-auto mb-4 flex items-center justify-center shadow-lg">
              <img 
                src="/images/holyloy-logo.png" 
                alt="HOLYLOY Logo" 
                className="w-14 h-14 object-contain"
              />
            </div>
            <CardTitle className="text-3xl font-bold">Local Admin Portal</CardTitle>
            <p className="text-red-100">Holyloy Regional Administration</p>
          </CardHeader>
          <CardContent className="p-8">
            <form onSubmit={handleLogin} className="space-y-6">
              <div>
                <Label htmlFor="email" className="text-sm font-semibold text-gray-700">Email Address</Label>
                <Input
                  id="email"
                  type="email"
                  value={loginForm.email}
                  onChange={(e) => setLoginForm({...loginForm, email: e.target.value})}
                  placeholder="ae@holyloy.com"
                  className="mt-2 h-12 w-full"
                  required
                  data-testid="input-local-admin-email"
                />
              </div>
              
              <div>
                <Label htmlFor="password" className="text-sm font-semibold text-gray-700">Password</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    value={loginForm.password}
                    onChange={(e) => setLoginForm({...loginForm, password: e.target.value})}
                    placeholder="Enter your secure password"
                    className="mt-2 h-12 w-full pr-10"
                    required
                    data-testid="input-local-admin-password"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-2 h-full px-3 hover:bg-transparent"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4 text-gray-400" />
                    ) : (
                      <Eye className="h-4 w-4 text-gray-400" />
                    )}
                  </Button>
                </div>
              </div>

              <Button 
                type="submit" 
                className="w-full h-12 bg-gradient-to-r from-red-600 to-red-500 hover:from-red-700 hover:to-red-600 text-white font-semibold text-lg"
                disabled={loginMutation.isPending}
                data-testid="button-local-admin-login"
              >
                {loginMutation.isPending ? "Authenticating..." : "Access Local Portal"}
              </Button>
            </form>
            
            <div className="mt-6 text-center text-sm text-gray-500">
              <p className="font-semibold mb-2">Test Credentials:</p>
              <div className="space-y-1">
                <p>Local Admin 1: local1@holyloy.com / local123</p>
                <p>Local Admin 2: local2@holyloy.com / local123</p>
                <p>Local Admin 3: local3@holyloy.com / local123</p>
                <p>Local Admin 4: local4@holyloy.com / local123</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <NotificationProvider 
      currentUser={currentUser ? {
        id: currentUser.id,
        token: localStorage.getItem('localAdminToken') || '',
        role: currentUser.role
      } : undefined}
    >
      <div className="min-h-screen bg-gradient-to-br from-white via-red-50 to-white">
      {/* Header */}
      <div className="komarce-nav">
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
              <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center shadow-md border border-gray-200">
                <img 
                  src="/images/holyloy-logo.png" 
                  alt="HOLYLOY Logo" 
                  className="w-6 h-6 object-contain"
                />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">Local Admin Portal</h1>
                <p className="text-sm text-gray-500">
                  {getCountryFlag(currentUser?.country || '')} {getCountryName(currentUser?.country || '')}
                </p>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              {/* Message Icon */}
              <NotificationWrapper badgeProps={{ type: 'messages' }}>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setActiveTab("chat")}
                  className="relative"
                >
                  <MessageCircle className="w-5 h-5 text-gray-600" />
                </Button>
              </NotificationWrapper>
              
              <div className="flex items-center space-x-2 text-sm text-gray-600">
                <span>{currentUser?.firstName} {currentUser?.lastName}</span>
              </div>
              
              <Button 
                onClick={handleLogout} 
                variant="default" 
                size="sm" 
                className="bg-red-600 hover:bg-red-700 text-white flex items-center"
                data-testid="button-local-admin-logout"
              >
                <LogOut className="w-4 h-4 mr-2" />
                Logout
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="flex">
        {/* Sidebar */}
        <div className={`${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} fixed inset-y-0 left-0 z-50 w-64 bg-white shadow-lg transform transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static lg:inset-0`}>
          <div className="flex items-center justify-between h-16 px-4 border-b">
            <h2 className="text-lg font-semibold text-gray-900">Navigation</h2>
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
            <nav className="p-4 space-y-2 text-gray-700">
              <Button
                variant={activeTab === "dashboard" ? "default" : "outline"}
                className={`w-full justify-start ${activeTab === "dashboard" ? "bg-red-600 text-white border-red-600" : "bg-white text-red-600 border-red-200 hover:bg-red-50"}`}
                onClick={() => setActiveTab("dashboard")}
              >
                <BarChart3 className={`w-4 h-4 mr-2 ${activeTab === "dashboard" ? "text-white" : "text-red-600"}`} />
                Dashboard Overview
              </Button>
              
              <Button
                variant={activeTab === "merchants" ? "default" : "outline"}
                className={`w-full justify-start ${activeTab === "merchants" ? "bg-red-600 text-white border-red-600" : "bg-white text-red-600 border-red-200 hover:bg-red-50"}`}
                onClick={() => setActiveTab("merchants")}
              >
                <Building2 className={`w-4 h-4 mr-2 ${activeTab === "merchants" ? "text-white" : "text-red-600"}`} />
                Local Country Merchants
              </Button>
              
              <Button
                variant={activeTab === "customers" ? "default" : "outline"}
                className={`w-full justify-start ${activeTab === "customers" ? "bg-red-600 text-white border-red-600" : "bg-white text-red-600 border-red-200 hover:bg-red-50"}`}
                onClick={() => setActiveTab("customers")}
              >
                <Users className={`w-4 h-4 mr-2 ${activeTab === "customers" ? "text-white" : "text-red-600"}`} />
                Local Country Customers
              </Button>
              
              <Button
                variant={activeTab === "reward-points" ? "default" : "outline"}
                className={`w-full justify-start ${activeTab === "reward-points" ? "bg-red-600 text-white border-red-600" : "bg-white text-red-600 border-red-200 hover:bg-red-50"}`}
                onClick={() => setActiveTab("reward-points")}
              >
                <Award className={`w-4 h-4 mr-2 ${activeTab === "reward-points" ? "text-white" : "text-red-600"}`} />
                Reward Points
              </Button>
              
              <Button
                variant={activeTab === "withdrawals" ? "default" : "outline"}
                className={`w-full justify-start ${activeTab === "withdrawals" ? "bg-red-600 text-white border-red-600" : "bg-white text-red-600 border-red-200 hover:bg-red-50"}`}
                onClick={() => setActiveTab("withdrawals")}
              >
                <CreditCard className={`w-4 h-4 mr-2 ${activeTab === "withdrawals" ? "text-white" : "text-red-600"}`} />
                Withdrawals
              </Button>
              
              <Button
                variant={activeTab === "merchant-list" ? "default" : "outline"}
                className={`w-full justify-start ${activeTab === "merchant-list" ? "bg-red-600 text-white border-red-600" : "bg-white text-red-600 border-red-200 hover:bg-red-50"}`}
                onClick={() => setActiveTab("merchant-list")}
              >
                <Building className={`w-4 h-4 mr-2 ${activeTab === "merchant-list" ? "text-white" : "text-red-600"}`} />
                Merchant List
              </Button>
              
              <Button
                variant={activeTab === "customer-list" ? "default" : "outline"}
                className={`w-full justify-start ${activeTab === "customer-list" ? "bg-red-600 text-white border-red-600" : "bg-white text-red-600 border-red-200 hover:bg-red-50"}`}
                onClick={() => setActiveTab("customer-list")}
              >
                <Users className={`w-4 h-4 mr-2 ${activeTab === "customer-list" ? "text-white" : "text-red-600"}`} />
                Customer List
              </Button>
              
              <Button
                variant={activeTab === "distribute" ? "default" : "outline"}
                className={`w-full justify-start ${activeTab === "distribute" ? "bg-red-600 text-white border-red-600" : "bg-white text-red-600 border-red-200 hover:bg-red-50"}`}
                onClick={() => setActiveTab("distribute")}
              >
                <DollarSign className={`w-4 h-4 mr-2 ${activeTab === "distribute" ? "text-white" : "text-red-600"}`} />
                Distribute Points
              </Button>
              
              <NotificationWrapper badgeProps={{ type: 'custom', size: 'sm', count: 0 }} className="w-full">
                <Button
                  variant={activeTab === "requests" ? "default" : "outline"}
                  className={`w-full justify-start ${activeTab === "requests" ? "bg-red-600 text-white border-red-600" : "bg-white text-red-600 border-red-200 hover:bg-red-50"}`}
                  onClick={() => setActiveTab("requests")}
                >
                  <Send className={`w-4 h-4 mr-2 ${activeTab === "requests" ? "text-white" : "text-red-600"}`} />
                  Manage Requests
                </Button>
              </NotificationWrapper>
              
              <Button
                variant={activeTab === "transactions" ? "default" : "outline"}
                className={`w-full justify-start ${activeTab === "transactions" ? "bg-red-600 text-white border-red-600" : "bg-white text-red-600 border-red-200 hover:bg-red-50"}`}
                onClick={() => setActiveTab("transactions")}
              >
                <History className={`w-4 h-4 mr-2 ${activeTab === "transactions" ? "text-white" : "text-red-600"}`} />
                Point Transaction History
              </Button>
              
              <NotificationWrapper badgeProps={{ type: 'messages' }} className="w-full">
                <Button
                  variant={activeTab === "chat" ? "default" : "outline"}
                  className={`w-full justify-start ${activeTab === "chat" ? "bg-red-600 text-white border-red-600" : "bg-white text-red-600 border-red-200 hover:bg-red-50"}`}
                  onClick={() => setActiveTab("chat")}
                >
                  <MessageCircle className={`w-4 h-4 mr-2 ${activeTab === "chat" ? "text-white" : "text-red-600"}`} />
                  Secure Chat
                </Button>
              </NotificationWrapper>
            </nav>
          </ScrollArea>
        </div>

        {/* Main Content */}
        <div className="flex-1 lg:ml-0">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            {/* Time Filter */}
            <div className="mb-6 flex justify-between items-center">
              <div className="flex space-x-2">
                <Button
                  variant={timeFilter === "daily" ? "default" : "outline"}
                  size="sm"
                  className={`${timeFilter === "daily" ? 'rounded-full px-4' : 'rounded-full px-4 text-gray-700'}`}
                  onClick={() => setTimeFilter("daily")}
                >
                  Daily
                </Button>
                <Button
                  variant={timeFilter === "weekly" ? "default" : "outline"}
                  size="sm"
                  className={`${timeFilter === "weekly" ? 'rounded-full px-4' : 'rounded-full px-4 text-gray-700'}`}
                  onClick={() => setTimeFilter("weekly")}
                >
                  Weekly
                </Button>
                <Button
                  variant={timeFilter === "monthly" ? "default" : "outline"}
                  size="sm"
                  className={`${timeFilter === "monthly" ? 'rounded-full px-4' : 'rounded-full px-4 text-gray-700'}`}
                  onClick={() => setTimeFilter("monthly")}
                >
                  Monthly
                </Button>
                <Button
                  variant={timeFilter === "yearly" ? "default" : "outline"}
                  size="sm"
                  className={`${timeFilter === "yearly" ? 'rounded-full px-4' : 'rounded-full px-4 text-gray-700'}`}
                  onClick={() => setTimeFilter("yearly")}
                >
                  Yearly
                </Button>
              </div>
              <Button
                variant="outline"
                size="sm"
                className="rounded-full px-4 text-gray-700 hover:text-red-600"
                onClick={() => queryClient.invalidateQueries()}
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Refresh
              </Button>
            </div>

            {/* Content based on active tab */}
            {activeTab === "dashboard" && (
              <div className="space-y-6">
                {/* Dashboard Overview Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Points Balance</p>
                      <p className="text-3xl font-bold text-green-600">
                        {adminBalance?.balance ? adminBalance.balance.toLocaleString() : "0"}
                      </p>
                      {adminBalance?.balance > 0 && (
                        <p className="text-xs text-green-600 mt-1">
                          Ready for distribution
                        </p>
                      )}
                    </div>
                    <Coins className="w-8 h-8 text-green-500" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Active Merchants</p>
                      <p className="text-3xl font-bold text-blue-600">
                            {localDashboard?.overview?.activeMerchants || 0}
                          </p>
                          <p className="text-xs text-gray-500 mt-1">
                            {localDashboard?.merchants?.regular || 0} Regular • {localDashboard?.merchants?.eMerchant || 0} E-Merchants
                      </p>
                    </div>
                        <Building2 className="w-8 h-8 text-blue-500" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Total Customers</p>
                      <p className="text-3xl font-bold text-purple-600">
                            {localDashboard?.overview?.totalCustomers || 0}
                          </p>
                          <p className="text-xs text-gray-500 mt-1">
                            {localDashboard?.customers?.active || 0} Active
                      </p>
                    </div>
                    <Users className="w-8 h-8 text-purple-500" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Points Distributed</p>
                      <p className="text-3xl font-bold text-orange-600">
                            {adminBalance?.totalDistributed ? adminBalance.totalDistributed.toLocaleString() : 0}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                            {adminBalance?.totalReceived ? adminBalance.totalReceived.toLocaleString() : 0} Total Received
                      </p>
                    </div>
                    <TrendingUp className="w-8 h-8 text-orange-500" />
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Country Overview */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <MapPin className="w-5 h-5 mr-2 text-green-600" />
                  {getCountryFlag(currentUser?.country || '')} {getCountryName(currentUser?.country || '')} Overview
                </CardTitle>
                <CardDescription>
                  Regional performance and statistics for your administrative area
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="text-center p-4 bg-green-50 rounded-lg">
                    <p className="text-lg font-bold text-green-700">Market Share</p>
                    <p className="text-2xl font-bold text-green-600">
                      {Math.floor(Math.random() * 30) + 15}%
                    </p>
                    <p className="text-sm text-green-600">Regional market coverage</p>
                  </div>
                  
                  <div className="text-center p-4 bg-blue-50 rounded-lg">
                    <p className="text-lg font-bold text-blue-700">Growth Rate</p>
                    <p className="text-2xl font-bold text-blue-600">
                      +{Math.floor(Math.random() * 20) + 10}%
                    </p>
                    <p className="text-sm text-blue-600">Month-over-month growth</p>
                  </div>
                  
                  <div className="text-center p-4 bg-purple-50 rounded-lg">
                    <p className="text-lg font-bold text-purple-700">Active Rate</p>
                    <p className="text-2xl font-bold text-purple-600">
                      {Math.floor(Math.random() * 25) + 70}%
                    </p>
                    <p className="text-sm text-purple-600">User engagement rate</p>
                  </div>
                </div>
              </CardContent>
            </Card>
              </div>
            )}
            {activeTab === "transactions" && (
              <div className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Point Transaction History</CardTitle>
                    <CardDescription>All credits, debits and balances for this local admin</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                      <div className="p-4 rounded-lg border bg-white">
                        <p className="text-xs text-gray-500">Total Credits</p>
                        <p className="text-2xl font-bold text-green-600">{localTotals.credits.toLocaleString()}</p>
                      </div>
                      <div className="p-4 rounded-lg border bg-white">
                        <p className="text-xs text-gray-500">Total Debits</p>
                        <p className="text-2xl font-bold text-red-600">{localTotals.debits.toLocaleString()}</p>
                      </div>
                      <div className="p-4 rounded-lg border bg-white">
                        <p className="text-xs text-gray-500">Net Change</p>
                        <p className={`text-2xl font-bold ${localTotals.net >= 0 ? 'text-green-600' : 'text-red-600'}`}>{localTotals.net >= 0 ? '+' : ''}{localTotals.net.toLocaleString()}</p>
                      </div>
                    </div>

                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Date</TableHead>
                          <TableHead>Type</TableHead>
                          <TableHead>Description</TableHead>
                          <TableHead className="text-right">Amount</TableHead>
                          <TableHead className="text-right">Running Balance</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {transactionsWithRunning.length > 0 ? (
                          transactionsWithRunning.map((tx: any) => (
                            <TableRow key={tx.id}>
                              <TableCell>{new Date(tx.createdAt).toLocaleString()}</TableCell>
                              <TableCell>
                                <Badge variant={tx.type === 'credit' ? 'default' : 'destructive'}>
                                  {tx.type === 'credit' ? 'Credit' : 'Debit'}
                                </Badge>
                              </TableCell>
                              <TableCell>{tx.description || (tx.type === 'credit' ? 'Points credited' : 'Points debited')}</TableCell>
                              <TableCell className={`text-right ${tx.type === 'credit' ? 'text-green-600' : 'text-red-600'}`}>
                                {tx.type === 'credit' ? '+' : '-'}{Number(tx.amount || 0).toLocaleString()}
                              </TableCell>
                              <TableCell className="text-right">{Number(tx._runningBalance ?? tx.balanceAfter ?? 0).toLocaleString()}</TableCell>
                            </TableRow>
                          ))
                        ) : (
                          <TableRow>
                            <TableCell colSpan={5} className="text-center text-gray-500">
                              {txLoading ? 'Loading transactions…' : 'No transactions found'}
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                    <div className="flex justify-end mt-4">
                      <Button variant="outline" size="sm" className="rounded-full px-4" onClick={() => {
                        queryClient.invalidateQueries({ queryKey: localTransactionsKey as unknown as any });
                        refetchLocalTransactions();
                      }}>
                        <RefreshCw className="w-4 h-4 mr-2" /> Refresh
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Local Country Merchants Tab */}
            {activeTab === "merchants" && (
              <div className="space-y-6">
            <Card>
              <CardHeader>
                    <CardTitle className="flex items-center">
                      <Building2 className="w-5 h-5 mr-2" />
                      Local Country Merchant Statistics
                    </CardTitle>
              </CardHeader>
              <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      <div className="text-center p-4 bg-blue-50 rounded-lg">
                        <Building2 className="w-8 h-8 text-blue-600 mx-auto mb-2" />
                        <p className="text-2xl font-bold text-blue-600">{localMerchantStats?.regularMerchants || 0}</p>
                        <p className="text-sm text-gray-600">Regular Merchants</p>
                      </div>
                      <div className="text-center p-4 bg-green-50 rounded-lg">
                        <Building className="w-8 h-8 text-green-600 mx-auto mb-2" />
                        <p className="text-2xl font-bold text-green-600">{localMerchantStats?.eMerchants || 0}</p>
                        <p className="text-sm text-gray-600">E-Merchants</p>
                      </div>
                      <div className="text-center p-4 bg-purple-50 rounded-lg">
                        <Star className="w-8 h-8 text-purple-600 mx-auto mb-2" />
                        <p className="text-2xl font-bold text-purple-600">{localMerchantStats?.starMerchants || 0}</p>
                        <p className="text-sm text-gray-600">Star Merchants</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Merchant Tiers Distribution</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="flex justify-between items-center">
                        <span className="font-medium">Star Merchants</span>
                        <div className="flex items-center space-x-2">
                          <div className="w-32 bg-gray-200 rounded-full h-2">
                            <div 
                              className="bg-yellow-500 h-2 rounded-full" 
                              style={{ width: `${(localMerchantStats?.starMerchants || 0) / (localMerchantStats?.totalMerchants || 1) * 100}%` }}
                            ></div>
                          </div>
                          <span className="text-sm text-gray-600">{localMerchantStats?.starMerchants || 0}</span>
                        </div>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="font-medium">Double Star Merchants</span>
                        <div className="flex items-center space-x-2">
                          <div className="w-32 bg-gray-200 rounded-full h-2">
                            <div 
                              className="bg-orange-500 h-2 rounded-full" 
                              style={{ width: `${(localMerchantStats?.doubleStarMerchants || 0) / (localMerchantStats?.totalMerchants || 1) * 100}%` }}
                            ></div>
                          </div>
                          <span className="text-sm text-gray-600">{localMerchantStats?.doubleStarMerchants || 0}</span>
                        </div>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="font-medium">Triple Star Merchants</span>
                        <div className="flex items-center space-x-2">
                          <div className="w-32 bg-gray-200 rounded-full h-2">
                            <div 
                              className="bg-red-500 h-2 rounded-full" 
                              style={{ width: `${(localMerchantStats?.tripleStarMerchants || 0) / (localMerchantStats?.totalMerchants || 1) * 100}%` }}
                            ></div>
                          </div>
                          <span className="text-sm text-gray-600">{localMerchantStats?.tripleStarMerchants || 0}</span>
                        </div>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="font-medium">Executive Merchants</span>
                        <div className="flex items-center space-x-2">
                          <div className="w-32 bg-gray-200 rounded-full h-2">
                            <div 
                              className="bg-purple-500 h-2 rounded-full" 
                              style={{ width: `${(localMerchantStats?.executiveMerchants || 0) / (localMerchantStats?.totalMerchants || 1) * 100}%` }}
                            ></div>
                          </div>
                          <span className="text-sm text-gray-600">{localMerchantStats?.executiveMerchants || 0}</span>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Merchant List Tab */}
            {activeTab === "merchant-list" && (
              <div className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      <Building className="w-5 h-5 mr-2" />
                      Merchants in Your Country
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Business</TableHead>
                          <TableHead>Owner</TableHead>
                          <TableHead>Email</TableHead>
                          <TableHead>Tier</TableHead>
                          <TableHead>Status</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {(merchants || []).map((m: any) => (
                          <TableRow key={m.id || m.userId}>
                            <TableCell>{m.businessName || 'Merchant'}</TableCell>
                            <TableCell>{m.user ? `${m.user.firstName} ${m.user.lastName}` : '-'}</TableCell>
                            <TableCell>{m.user?.email || '-'}</TableCell>
                            <TableCell>{m.tier || 'Bronze'}</TableCell>
                            <TableCell>
                              <Badge variant={m.user?.isActive ? 'default' : 'destructive'}>
                                {m.user?.isActive ? 'Active' : 'Inactive'}
                              </Badge>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Local Country Customers Tab */}
            {activeTab === "customers" && (
              <div className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      <Users className="w-5 h-5 mr-2" />
                      Local Country Customer Statistics
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="text-center p-4 bg-blue-50 rounded-lg">
                        <Users className="w-8 h-8 text-blue-600 mx-auto mb-2" />
                        <p className="text-2xl font-bold text-blue-600">{localCustomerStats?.totalCustomers || 0}</p>
                        <p className="text-sm text-gray-600">Total Customers</p>
                      </div>
                      <div className="text-center p-4 bg-green-50 rounded-lg">
                        <UserCheck className="w-8 h-8 text-green-600 mx-auto mb-2" />
                        <p className="text-2xl font-bold text-green-600">{localCustomerStats?.activeCustomers || 0}</p>
                        <p className="text-sm text-gray-600">Active Customers</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Top 10 Customers by Global Number</CardTitle>
                  </CardHeader>
                  <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                          <TableHead>Rank</TableHead>
                          <TableHead>Customer</TableHead>
                          <TableHead>Global Number</TableHead>
                          <TableHead>Points</TableHead>
                          <TableHead>Referrals</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                        {localCustomerList?.slice(0, 10).map((customer: any, index: number) => (
                          <TableRow key={customer.id}>
                          <TableCell>
                              <Badge variant={index < 3 ? "default" : "secondary"}>
                                #{index + 1}
                            </Badge>
                          </TableCell>
                            <TableCell>{customer.firstName} {customer.lastName}</TableCell>
                            <TableCell>{customer.serialNumber || `SN-${customer.id.slice(0, 8)}`}</TableCell>
                            <TableCell>{customer.totalPoints?.toLocaleString() || 0}</TableCell>
                            <TableCell>{customer.referralCount || 0}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Local Country Co-Founder & Staff Tab */}
            {activeTab === "cofounder-staff" && (
              <div className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      <UserCheck className="w-5 h-5 mr-2" />
                      Local Country Co-Founder & Staff Lists
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      <Card>
                        <CardHeader>
                          <CardTitle>Co-Founders</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="space-y-4">
                            {localCofounderStaff?.cofounders?.map((cofounder: any) => (
                              <div key={cofounder.id} className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                                <div>
                                  <p className="font-medium">{cofounder.firstName} {cofounder.lastName}</p>
                                  <p className="text-sm text-gray-500">{cofounder.email}</p>
                                </div>
                                <Badge variant="default">Co-Founder</Badge>
                              </div>
                            ))}
                          </div>
              </CardContent>
            </Card>

                      <Card>
                        <CardHeader>
                          <CardTitle>Staff Members</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="space-y-4">
                            {localCofounderStaff?.staff?.map((staff: any) => (
                              <div key={staff.id} className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                                <div>
                                  <p className="font-medium">{staff.firstName} {staff.lastName}</p>
                                  <p className="text-sm text-gray-500">{staff.email}</p>
                                </div>
                                <Badge variant="secondary">{staff.role}</Badge>
                              </div>
                            ))}
                          </div>
                        </CardContent>
                      </Card>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Local Country Reward Points Tab */}
            {activeTab === "reward-points" && (
              <div className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      <Award className="w-5 h-5 mr-2" />
                      Local Country Reward Points Analytics
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="text-center p-4 bg-blue-50 rounded-lg">
                        <p className="text-2xl font-bold text-blue-600">${localRewardStats?.totalSales || 0}</p>
                        <p className="text-sm text-gray-600">Total Sales to Merchants</p>
                      </div>
                      <div className="text-center p-4 bg-green-50 rounded-lg">
                        <p className="text-2xl font-bold text-green-600">{adminBalance?.totalDistributed ? adminBalance.totalDistributed.toLocaleString() : 0}</p>
                        <p className="text-sm text-gray-600">Total Distributed to Customers</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Local Country Withdrawals Tab */}
            {activeTab === "withdrawals" && (
              <div className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      <CreditCard className="w-5 h-5 mr-2" />
                      Local Country Withdrawal Amount
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                      <div className="text-center p-4 bg-blue-50 rounded-lg">
                        <p className="text-2xl font-bold text-blue-600">${localWithdrawalStats?.totalWithdrawals || 0}</p>
                        <p className="text-sm text-gray-600">Total Withdrawals</p>
                      </div>
                      <div className="text-center p-4 bg-green-50 rounded-lg">
                        <p className="text-2xl font-bold text-green-600">${localWithdrawalStats?.merchantWithdrawals || 0}</p>
                        <p className="text-sm text-gray-600">Merchant Withdrawals</p>
                      </div>
                      <div className="text-center p-4 bg-purple-50 rounded-lg">
                        <p className="text-2xl font-bold text-purple-600">${localWithdrawalStats?.customerWithdrawals || 0}</p>
                        <p className="text-sm text-gray-600">Customer Withdrawals</p>
                      </div>
                      <div className="text-center p-4 bg-orange-50 rounded-lg">
                        <p className="text-2xl font-bold text-orange-600">${localWithdrawalStats?.withdrawableNotWithdrawn || 0}</p>
                        <p className="text-sm text-gray-600">Withdrawable but not withdrawn</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

          {/* Distribute Points Tab */}
            {activeTab === "distribute" && (
              <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <DollarSign className="w-5 h-5 mr-2 text-blue-600" />
                  Distribute Points to Merchants
                </CardTitle>
                <CardDescription>
                  Transfer points from your regional allocation to merchants
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="merchant">Select Merchant</Label>
                      <Select 
                        value={distributeForm.merchantId} 
                        onValueChange={(value) => setDistributeForm(prev => ({ ...prev, merchantId: value }))}
                      >
                        <SelectTrigger data-testid="select-merchant">
                          <SelectValue placeholder="Select merchant" />
                        </SelectTrigger>
                        <SelectContent>
                          {merchantsLoading ? (
                            <SelectItem value="loading" disabled>Loading merchants...</SelectItem>
                          ) : merchants && merchants.length > 0 ? (
                            merchants.map((merchant: any) => (
                              <SelectItem key={merchant.id || merchant.userId} value={merchant.userId || merchant.id}>
                                {merchant.businessName || `Merchant ${merchant.id?.slice(0, 8)}`} - {merchant.tier || 'Bronze'} Tier
                              </SelectItem>
                            ))
                          ) : (
                            <SelectItem value="no-merchants" disabled>No merchants available in {currentUser?.country}</SelectItem>
                          )}
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label htmlFor="distribute-points">Points Amount</Label>
                      <Input
                        id="distribute-points"
                        type="number"
                        placeholder="Enter points amount"
                        value={distributeForm.points}
                        onChange={(e) => setDistributeForm(prev => ({ ...prev, points: e.target.value }))}
                        min="1"
                        data-testid="input-distribute-points"
                      />
                    </div>

                    <div>
                      <Label htmlFor="distribute-description">Description</Label>
                      <Input
                        id="distribute-description"
                        placeholder="Reason for distribution"
                        value={distributeForm.description}
                        onChange={(e) => setDistributeForm(prev => ({ ...prev, description: e.target.value }))}
                        data-testid="input-distribute-description"
                      />
                    </div>

                    <Button
                      onClick={handleDistributePoints}
                      disabled={distributePointsMutation.isPending || !distributeForm.merchantId || !distributeForm.points || !distributeForm.description}
                      className="w-full"
                      data-testid="button-distribute-points"
                    >
                      {distributePointsMutation.isPending ? "Distributing..." : "Distribute Points"}
                    </Button>
                  </div>

                  <div className="space-y-4">
                    <div className="bg-green-50 border border-green-200 p-4 rounded-lg">
                      <h4 className="font-semibold text-green-800 mb-2">Available Balance</h4>
                      <p className="text-2xl font-bold text-green-600">
                        {adminBalance?.balance ? adminBalance.balance.toLocaleString() : "0"} Points
                      </p>
                      <p className="text-sm text-green-600 mt-1">
                        {adminBalance?.balance > 0 ? "Ready for distribution" : "Regional allocation"}
                      </p>
                    </div>

                    {adminBalance?.balance > 0 && (
                      <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg">
                        <div className="flex items-center">
                          <CheckCircle className="w-5 h-5 text-blue-600 mr-2" />
                          <div>
                            <p className="font-semibold text-blue-800">Points Received!</p>
                            <p className="text-sm text-blue-700">
                              {adminBalance.balance.toLocaleString()} points transferred from Global Admin for {getCountryName(currentUser?.country || '')} region
                            </p>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
              </div>
            )}

            {/* Request Points Tab */}
            {activeTab === "request" && (
              <div className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      <Send className="w-5 h-5 mr-2 text-purple-600" />
                      Request Points from Global Admin
                    </CardTitle>
                    <CardDescription>
                      Explain why you need points and submit for approval
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <Label>Points Requested</Label>
                        <Input type="number" value={requestForm.pointsRequested} onChange={(e) => setRequestForm({ ...requestForm, pointsRequested: e.target.value })} placeholder="e.g., 10000" />
                      </div>
                      <div className="md:col-span-2">
                        <Label>Reason</Label>
                        <Input value={requestForm.reason} onChange={(e) => setRequestForm({ ...requestForm, reason: e.target.value })} placeholder="Purpose for points" />
                      </div>
                    </div>
                    <Button onClick={handleCreateRequest} disabled={createRequestMutation.isPending}>
                      {createRequestMutation.isPending ? 'Submitting...' : 'Submit Request'}
                    </Button>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>My Requests</CardTitle>
                    <CardDescription>Track approval status</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Date</TableHead>
                          <TableHead>Points</TableHead>
                          <TableHead>Reason</TableHead>
                          <TableHead>Status</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {myRequests.map((r: any) => (
                          <TableRow key={r.id}>
                            <TableCell>{new Date(r.createdAt).toLocaleString()}</TableCell>
                            <TableCell>{r.pointsRequested.toLocaleString()}</TableCell>
                            <TableCell>{r.reason || '-'}</TableCell>
                            <TableCell>
                              <Badge className={r.status === 'approved' ? 'bg-green-100 text-green-800' : r.status === 'rejected' ? 'bg-red-100 text-red-800' : 'bg-yellow-100 text-yellow-800'}>
                                {r.status}
                              </Badge>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              </div>
            )}

          {/* Chat Tab */}
            {activeTab === "chat" && (
              <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <MessageCircle className="w-5 h-5 mr-2" />
                  Local Admin Secure Chat
                </CardTitle>
                <CardDescription>
                  Communicate with global administrators and regional merchants
                </CardDescription>
              </CardHeader>
              <CardContent>
                {currentUser && (
                  <SecureChat 
                    currentUser={{
                      id: currentUser.id,
                      name: `${currentUser.firstName} ${currentUser.lastName}`,
                      role: currentUser.role,
                      token: localStorage.getItem('localAdminToken') || ''
                    }}
                  />
                )}
              </CardContent>
            </Card>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
    </NotificationProvider>
  );
}