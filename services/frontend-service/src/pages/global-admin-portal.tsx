import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useStorageListener } from "@/hooks/use-storage-listener";
import { 
  Shield, Crown, LogOut, Users, DollarSign, BarChart3, Star, Settings, MessageCircle,
  TrendingUp, Coins, CheckCircle, Send, Plus, AlertCircle, Check, X, Menu, X as XIcon,
  Building2, UserCheck, Award, CreditCard, Globe, FileText, Headphones, 
  Database, BarChart, UserPlus, Building, Calendar, Download, Star as StarIcon,
  Percent, Calculator, Eye, Edit, Trash2, Save, RefreshCw, Filter, Search
} from "lucide-react";
import { HolyloyLogo } from "@/components/ui/holyloy-logo";
import io from "socket.io-client";
import SecureChat from "@/components/SecureChat";
import PointsManagementPanel from "@/components/PointsManagementPanel";

interface GlobalAdminUser {
  id: string;
  username: string;
  email: string;
  firstName: string;
  lastName: string;
  role: 'global_admin';
  country: string;
  isActive: boolean;
  createdAt: string;
}

interface ChatMessage {
  id: string;
  senderId: string;
  receiverId: string;
  message: string;
  isRead: boolean;
  createdAt: string;
  senderName?: string;
}

export default function GlobalAdminPortal() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [currentUser, setCurrentUser] = useState<GlobalAdminUser | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("dashboard");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [timeFilter, setTimeFilter] = useState("daily");
  const [socket, setSocket] = useState<any>(null);
  const [selectedChatUser, setSelectedChatUser] = useState<any>(null);
  const [newMessage, setNewMessage] = useState("");
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  
  const { toast } = useToast();
  const queryClient = useQueryClient();
  // Pending requests from local admins
  const { data: pendingRequests = [] } = useQuery({
    queryKey: ['/api/admin/pending-point-requests'],
    enabled: isAuthenticated,
    queryFn: async () => {
      const res = await fetch('/api/admin/pending-point-requests', {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('globalAdminToken')}` }
      });
      if (!res.ok) throw new Error('Failed to fetch pending requests');
      return res.json();
    }
  });

  const approveMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/admin/approve-point-request/${id}`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${localStorage.getItem('globalAdminToken')}` }
      });
      if (!res.ok) throw new Error('Approve failed');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/pending-point-requests'] });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/balance'] });
    }
  });

  const rejectMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/admin/reject-point-request/${id}`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${localStorage.getItem('globalAdminToken')}` }
      });
      if (!res.ok) throw new Error('Reject failed');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/pending-point-requests'] });
    }
  });

  // Login form state
  const [loginForm, setLoginForm] = useState({
    email: "",
    password: ""
  });

  // Points form states
  const [addPointsForm, setAddPointsForm] = useState({
    points: "",
    description: ""
  });

  const [distributePointsForm, setDistributePointsForm] = useState({
    toUserId: "",
    points: "",
    description: ""
  });

  // Check authentication on mount - always verify with server
  useEffect(() => {
    const verifyAuth = async () => {
      setAuthLoading(true);
      const token = localStorage.getItem('globalAdminToken');
      
      if (!token) {
        setIsAuthenticated(false);
        setCurrentUser(null);
        setAuthLoading(false);
        return;
      }

      try {
        const response = await fetch('/api/admin/balance', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (response.ok) {
          const user = localStorage.getItem('globalAdminUser');
          if (user) {
            const userData = JSON.parse(user);
            if (userData.role === 'global_admin') {
              setIsAuthenticated(true);
              setCurrentUser(userData);
            } else {
              setIsAuthenticated(false);
              setCurrentUser(null);
            }
          } else {
            setIsAuthenticated(false);
            setCurrentUser(null);
          }
        } else {
          // Token is invalid, clear everything and force re-login
          console.log('Token validation failed, clearing storage');
          localStorage.clear(); // Clear all localStorage
          setIsAuthenticated(false);
          setCurrentUser(null);
          toast({ 
            title: "Session Expired", 
            description: "Please log in again",
            variant: "destructive" 
          });
        }
      } catch (error) {
        console.log('Auth verification error:', error);
        localStorage.clear(); // Clear all localStorage
        setIsAuthenticated(false);
        setCurrentUser(null);
      }
      
      setAuthLoading(false);
    };

    verifyAuth();
  }, []);

  // Socket connection for real-time chat
  useEffect(() => {
    if (isAuthenticated && currentUser) {
      const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
      const wsUrl = `${protocol}//${window.location.host}/ws`;
      const newSocket = io(wsUrl);

      newSocket.on('connect', () => {
        newSocket.emit('authenticate', {
          userId: currentUser.id,
          role: currentUser.role,
          token: localStorage.getItem('globalAdminToken')
        });
      });

      newSocket.on('authenticated', (data) => {
        setSocket(newSocket);
      });

      newSocket.on('newMessage', (message: ChatMessage) => {
        if (selectedChatUser && (message.senderId === selectedChatUser.id || message.receiverId === selectedChatUser.id)) {
          setChatMessages(prev => [...prev, message]);
        }
        toast({ 
          title: "New Message", 
          description: `Message from ${message.senderName}: ${message.message.slice(0, 50)}...` 
        });
      });

      return () => {
        newSocket.disconnect();
      };
    }
  }, [isAuthenticated, currentUser, selectedChatUser]);

  // Login mutation for global admin
  const loginMutation = useMutation({
    mutationFn: async (credentials: { email: string; password: string }) => {
      const response = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...credentials, adminType: 'global' })
      });
      
      if (!response.ok) {
        const error = await response.text();
        throw new Error(error);
      }
      
      return response.json();
    },
    onSuccess: (data) => {
      if (data.user.role === 'global_admin') {
        localStorage.setItem('globalAdminToken', data.token);
        localStorage.setItem('globalAdminUser', JSON.stringify(data.user));
        setIsAuthenticated(true);
        setCurrentUser(data.user);
        toast({ title: "Login Successful", description: "Welcome to Global Admin Portal!" });
      } else {
        throw new Error("Access denied. Global admin role required.");
      }
    },
    onError: (error: Error) => {
      toast({ 
        title: "Login Failed", 
        description: error.message || "Invalid credentials",
        variant: "destructive" 
      });
    }
  });

  // Data queries
  const { data: dashboardData, isLoading: isDashboardLoading } = useQuery({
    queryKey: ['/api/admin/dashboard'],
    enabled: isAuthenticated,
    retry: false,
    refetchInterval: 30000
  });

  // Global Admin specific data queries
  const { data: merchantStats } = useQuery({
    queryKey: ['/api/admin/merchant-stats'],
    enabled: isAuthenticated,
    queryFn: async () => {
      const res = await fetch('/api/admin/merchant-stats', {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('globalAdminToken')}` }
      });
      if (!res.ok) throw new Error('Failed to fetch merchant stats');
      return res.json();
    }
  });

  const { data: customerStats } = useQuery({
    queryKey: ['/api/admin/customer-stats'],
    enabled: isAuthenticated,
    queryFn: async () => {
      const res = await fetch('/api/admin/customer-stats', {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('globalAdminToken')}` }
      });
      if (!res.ok) throw new Error('Failed to fetch customer stats');
      return res.json();
    }
  });

  const { data: rewardStats } = useQuery({
    queryKey: ['/api/admin/reward-stats'],
    enabled: isAuthenticated,
    queryFn: async () => {
      const res = await fetch('/api/admin/reward-stats', {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('globalAdminToken')}` }
      });
      if (!res.ok) throw new Error('Failed to fetch reward stats');
      return res.json();
    }
  });

  const { data: withdrawalStats } = useQuery({
    queryKey: ['/api/admin/withdrawal-stats'],
    enabled: isAuthenticated,
    queryFn: async () => {
      const res = await fetch('/api/admin/withdrawal-stats', {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('globalAdminToken')}` }
      });
      if (!res.ok) throw new Error('Failed to fetch withdrawal stats');
      return res.json();
    }
  });

  const { data: topCustomers } = useQuery({
    queryKey: ['/api/admin/top-customers'],
    enabled: isAuthenticated,
    queryFn: async () => {
      const res = await fetch('/api/admin/top-customers', {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('globalAdminToken')}` }
      });
      if (!res.ok) throw new Error('Failed to fetch top customers');
      return res.json();
    }
  });

  const { data: globalMerchants } = useQuery({
    queryKey: ['/api/admin/global-merchants'],
    enabled: isAuthenticated,
    queryFn: async () => {
      const res = await fetch('/api/admin/global-merchants', {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('globalAdminToken')}` }
      });
      if (!res.ok) throw new Error('Failed to fetch global merchants');
      return res.json();
    }
  });

  const { data: globalCustomers } = useQuery({
    queryKey: ['/api/admin/global-customers'],
    enabled: isAuthenticated,
    queryFn: async () => {
      const res = await fetch('/api/admin/global-customers', {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('globalAdminToken')}` }
      });
      if (!res.ok) throw new Error('Failed to fetch global customers');
      return res.json();
    }
  });

  // Get local admins from database
  const { data: localAdminsFromDB } = useQuery({
    queryKey: ['/api/admin/admins'],
    enabled: isAuthenticated,
    retry: false
  });

  // Use local admins from database for dropdown
  const adminsList = localAdminsFromDB || [];

  const { data: chatUsers } = useQuery({
    queryKey: ['/api/admin/chat-users'],
    enabled: isAuthenticated,
    retry: false
  });

  // Real-time admin balance from database
  const { data: adminBalance, refetch: refetchBalance } = useQuery({
    queryKey: ['/api/admin/balance'],
    enabled: isAuthenticated,
    refetchInterval: 5000, // Poll every 5 seconds
    retry: false,
    staleTime: 0, // Always fetch fresh data
    cacheTime: 0 // Don't cache the results
  });

  // Listen for storage/custom events to force immediate refresh
  useStorageListener(['/api/admin/balance','/api/admin/dashboard','/api/admin/transactions']);

  // Transaction history from database
  const { data: transactionHistory, refetch: refetchTransactions } = useQuery({
    queryKey: ['/api/admin/transactions'],
    enabled: isAuthenticated,
    refetchInterval: 30000, // Poll every 30 seconds
    refetchOnWindowFocus: true, // Refresh when window gains focus
    staleTime: 10000, // Consider data stale after 10 seconds
    gcTime: 60000, // Cache for 1 minute
    retry: false
  });

  // Point generation mutation (global admin only)
  const addPointsMutation = useMutation({
    mutationFn: async (data: { points: number; description: string }) => {
      const response = await fetch('/api/admin/add-points', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('globalAdminToken')}`
        },
        body: JSON.stringify(data)
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to generate points');
      }
      
      return response.json();
    },
    onSuccess: (data) => {
      toast({ 
        title: "Points Generated Successfully", 
        description: `${data.points?.toLocaleString()} points added to your balance` 
      });
      
      // Refresh balance and transaction history
      refetchBalance();
      refetchTransactions();
      queryClient.invalidateQueries({ queryKey: ['/api/admin/dashboard'] });
      
      setAddPointsForm({ points: "", description: "" });
    },
    onError: (error: Error) => {
      toast({ title: "Point Generation Failed", description: error.message, variant: "destructive" });
    }
  });

  // Remove localStorage dependency - now using database

  // Point distribution mutation
  const distributePointsMutation = useMutation({
    mutationFn: async (data: { toUserId: string; points: number; description: string }) => {
      const response = await fetch('/api/admin/distribute-points', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('globalAdminToken')}`
        },
        body: JSON.stringify(data)
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to distribute points');
      }
      
      return response.json();
    },
    onSuccess: (data) => {
      toast({ 
        title: "Points Distributed Successfully", 
        description: `${data.distribution?.points?.toLocaleString()} points distributed. Remaining balance: ${data.remainingBalance?.toLocaleString()}` 
      });
      
      // Refresh balance and transaction history
      refetchBalance();
      refetchTransactions();
      queryClient.invalidateQueries({ queryKey: ['/api/admin/dashboard'] });
      
      setDistributePointsForm({ toUserId: "", points: "", description: "" });
    },
    onError: (error: Error) => {
      toast({ title: "Point Distribution Failed", description: error.message, variant: "destructive" });
    }
  });

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!loginForm.email || !loginForm.password) {
      toast({ title: "Error", description: "Please fill in all fields", variant: "destructive" });
      return;
    }
    
    loginMutation.mutate(loginForm);
  };

  const handleLogout = () => {
    localStorage.removeItem('globalAdminToken');
    localStorage.removeItem('globalAdminUser');
    setIsAuthenticated(false);
    setCurrentUser(null);
    setActiveTab("dashboard");
    if (socket) {
      socket.disconnect();
      setSocket(null);
    }
    toast({ title: "Logged Out", description: "You have been logged out successfully." });
  };

  const handleAddPoints = () => {
    if (!addPointsForm.points || !addPointsForm.description) {
      toast({ title: "Error", description: "Please fill in all fields", variant: "destructive" });
      return;
    }
    
    const points = parseInt(addPointsForm.points);
    if (points <= 0) {
      toast({ title: "Error", description: "Points must be greater than 0", variant: "destructive" });
      return;
    }
    
    addPointsMutation.mutate({
      points: points,
      description: addPointsForm.description
    });
  };

  const handleDistributePoints = () => {
    if (!distributePointsForm.toUserId || !distributePointsForm.points || !distributePointsForm.description) {
      toast({ title: "Error", description: "Please fill in all fields", variant: "destructive" });
      return;
    }
    
    const points = parseInt(distributePointsForm.points);
    const availableBalance = (adminBalance as any)?.balance || 0;
    
    if (points <= 0) {
      toast({ title: "Error", description: "Points must be greater than 0", variant: "destructive" });
      return;
    }
    
    if (points > availableBalance) {
      toast({ 
        title: "Insufficient Balance", 
        description: `You only have ${availableBalance.toLocaleString()} points available. Please enter a lower amount.`,
        variant: "destructive" 
      });
      return;
    }
    
    distributePointsMutation.mutate({
      toUserId: distributePointsForm.toUserId,
      points: points,
      description: distributePointsForm.description
    });
  };

  // Show loading state while checking authentication
  if (authLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-lg shadow-2xl border-0">
          <CardContent className="p-8 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Verifying authentication...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-lg shadow-2xl border-0">
          <CardHeader className="text-center bg-gradient-to-r from-red-600 to-red-500 text-white rounded-t-lg">
            <div className="w-20 h-20 bg-white rounded-full mx-auto mb-4 flex items-center justify-center shadow-lg">
              <img 
                src="/images/holyloy-logo.png" 
                alt="HOLYLOY Logo" 
                className="w-14 h-14 object-contain"
              />
            </div>
            <CardTitle className="text-3xl font-bold">Global Admin Portal</CardTitle>
            <p className="text-red-100">Holyloy Global Administration</p>
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
                  placeholder="global@holyloy.com"
                  className="mt-2 h-12 w-full"
                  required
                  data-testid="input-global-admin-email"
                />
              </div>
              
              <div>
                <Label htmlFor="password" className="text-sm font-semibold text-gray-700">Password</Label>
                <Input
                  id="password"
                  type="password"
                  value={loginForm.password}
                  onChange={(e) => setLoginForm({...loginForm, password: e.target.value})}
                  placeholder="Enter your secure password"
                  className="mt-2 h-12 w-full"
                  required
                  data-testid="input-global-admin-password"
                />
              </div>

              <Button 
                type="submit" 
                className="w-full h-12 bg-gradient-to-r from-red-600 to-red-500 hover:from-red-700 hover:to-red-600 text-white font-semibold text-lg"
                disabled={loginMutation.isPending}
                data-testid="button-global-admin-login"
              >
                {loginMutation.isPending ? "Authenticating..." : "Access Global Portal"}
              </Button>
            </form>
            
            <div className="mt-6 text-center text-sm text-gray-500">
              <p>Test Credentials:</p>
              <p>Email: global@holyloy.com</p>
              <p>Password: global123</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
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
              <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center shadow-md border border-gray-200">
                <img 
                  src="/images/holyloy-logo.png" 
                  alt="HOLYLOY Logo" 
                  className="w-6 h-6 object-contain"
                />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">Global Admin Portal</h1>
                <p className="text-sm text-gray-500">Holyloy Global Administration</p>
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
                variant="outline" 
                size="sm" 
                className="text-red-600 border-red-300 hover:bg-red-50 hover:border-red-400 flex items-center"
                data-testid="button-global-admin-logout"
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
            <nav className="p-4 space-y-2">
              <Button
                variant={activeTab === "dashboard" ? "default" : "ghost"}
                className="w-full justify-start"
                onClick={() => setActiveTab("dashboard")}
              >
                <BarChart3 className="w-4 h-4 mr-2" />
                Dashboard Overview
              </Button>
              
              <Button
                variant={activeTab === "merchants" ? "default" : "ghost"}
                className="w-full justify-start"
                onClick={() => setActiveTab("merchants")}
              >
                <Building2 className="w-4 h-4 mr-2" />
                Global Merchants
              </Button>
              
              <Button
                variant={activeTab === "customers" ? "default" : "ghost"}
                className="w-full justify-start"
                onClick={() => setActiveTab("customers")}
              >
                <Users className="w-4 h-4 mr-2" />
                Global Customers
              </Button>
              
              <Button
                variant={activeTab === "cofounder-staff" ? "default" : "ghost"}
                className="w-full justify-start"
                onClick={() => setActiveTab("cofounder-staff")}
              >
                <UserCheck className="w-4 h-4 mr-2" />
                Co-Founder & Staff
              </Button>
              
              <Button
                variant={activeTab === "reward-points" ? "default" : "ghost"}
                className="w-full justify-start"
                onClick={() => setActiveTab("reward-points")}
              >
                <Award className="w-4 h-4 mr-2" />
                Reward Points
              </Button>
              
              <Button
                variant={activeTab === "withdrawals" ? "default" : "ghost"}
                className="w-full justify-start"
                onClick={() => setActiveTab("withdrawals")}
              >
                <CreditCard className="w-4 h-4 mr-2" />
                Withdrawals
              </Button>
              
              <Button
                variant={activeTab === "commission-settings" ? "default" : "ghost"}
                className="w-full justify-start"
                onClick={() => setActiveTab("commission-settings")}
              >
                <Percent className="w-4 h-4 mr-2" />
                Commission Settings
              </Button>
              
              <Button
                variant={activeTab === "merchant-list" ? "default" : "ghost"}
                className="w-full justify-start"
                onClick={() => setActiveTab("merchant-list")}
              >
                <Building className="w-4 h-4 mr-2" />
                Merchant List
              </Button>
              
              <Button
                variant={activeTab === "customer-list" ? "default" : "ghost"}
                className="w-full justify-start"
                onClick={() => setActiveTab("customer-list")}
              >
                <Users className="w-4 h-4 mr-2" />
                Customer List
              </Button>
              
              <Button
                variant={activeTab === "header-footer" ? "default" : "ghost"}
                className="w-full justify-start"
                onClick={() => setActiveTab("header-footer")}
              >
                <Globe className="w-4 h-4 mr-2" />
                Header & Footer
              </Button>
              
              <Button
                variant={activeTab === "user-roles" ? "default" : "ghost"}
                className="w-full justify-start"
                onClick={() => setActiveTab("user-roles")}
              >
                <Shield className="w-4 h-4 mr-2" />
                User Roles
              </Button>
              
              <Button
                variant={activeTab === "customer-care" ? "default" : "ghost"}
                className="w-full justify-start"
                onClick={() => setActiveTab("customer-care")}
              >
                <Headphones className="w-4 h-4 mr-2" />
                Customer Care
              </Button>
              
              <Button
                variant={activeTab === "vat-service" ? "default" : "ghost"}
                className="w-full justify-start"
                onClick={() => setActiveTab("vat-service")}
              >
                <Calculator className="w-4 h-4 mr-2" />
                VAT & Service Charge
              </Button>
              
              <Button
                variant={activeTab === "analytics" ? "default" : "ghost"}
                className="w-full justify-start"
                onClick={() => setActiveTab("analytics")}
              >
                <BarChart className="w-4 h-4 mr-2" />
                Analytics & Reporting
              </Button>
              
              <Button
                variant={activeTab === "acquisition" ? "default" : "ghost"}
                className="w-full justify-start"
                onClick={() => setActiveTab("acquisition")}
              >
                <UserPlus className="w-4 h-4 mr-2" />
                Acquisition Reports
              </Button>
              
              <Button
                variant={activeTab === "backup" ? "default" : "ghost"}
                className="w-full justify-start"
                onClick={() => setActiveTab("backup")}
              >
                <Database className="w-4 h-4 mr-2" />
                Backup System
              </Button>
              
              <Button
                variant={activeTab === "nps" ? "default" : "ghost"}
                className="w-full justify-start"
                onClick={() => setActiveTab("nps")}
              >
                <StarIcon className="w-4 h-4 mr-2" />
                NPS Setup
              </Button>
              
              <Button
                variant={activeTab === "generate-points" ? "default" : "ghost"}
                className="w-full justify-start"
                onClick={() => setActiveTab("generate-points")}
              >
              <Plus className="w-4 h-4 mr-2" />
              Generate Points
              </Button>
              
              <Button
                variant={activeTab === "distribute" ? "default" : "ghost"}
                className="w-full justify-start"
                onClick={() => setActiveTab("distribute")}
              >
              <DollarSign className="w-4 h-4 mr-2" />
              Distribute Points
              </Button>
              
              <Button
                variant={activeTab === "requests" ? "default" : "ghost"}
                className="w-full justify-start"
                onClick={() => setActiveTab("requests")}
              >
                <Send className="w-4 h-4 mr-2" />
                Manage Requests
              </Button>
              
              <Button
                variant={activeTab === "chat" ? "default" : "ghost"}
                className="w-full justify-start"
                onClick={() => setActiveTab("chat")}
              >
              <MessageCircle className="w-4 h-4 mr-2" />
                Secure Chat
              </Button>
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
                  onClick={() => setTimeFilter("daily")}
                >
                  Daily
                </Button>
                <Button
                  variant={timeFilter === "weekly" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setTimeFilter("weekly")}
                >
                  Weekly
                </Button>
                <Button
                  variant={timeFilter === "monthly" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setTimeFilter("monthly")}
                >
                  Monthly
                </Button>
                <Button
                  variant={timeFilter === "yearly" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setTimeFilter("yearly")}
                >
                  Yearly
                </Button>
              </div>
              <Button
                variant="outline"
                size="sm"
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
                          <p className="text-sm font-medium text-gray-600">Total Global Merchants</p>
                      <p className="text-3xl font-bold text-blue-600">
                            {merchantStats?.totalMerchants || 0}
                          </p>
                          <p className="text-xs text-gray-500 mt-1">
                            {merchantStats?.regularMerchants || 0} Regular • {merchantStats?.eMerchants || 0} E-Merchants
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
                          <p className="text-sm font-medium text-gray-600">Total Global Customers</p>
                      <p className="text-3xl font-bold text-green-600">
                            {customerStats?.totalCustomers || 0}
                          </p>
                          <p className="text-xs text-gray-500 mt-1">
                            {customerStats?.activeCustomers || 0} Active
                      </p>
                    </div>
                        <Users className="w-8 h-8 text-green-500" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                          <p className="text-sm font-medium text-gray-600">Reward Points</p>
                      <p className="text-3xl font-bold text-purple-600">
                            {rewardStats?.totalPoints || 0}
                          </p>
                          <p className="text-xs text-gray-500 mt-1">
                            {rewardStats?.distributedPoints || 0} Distributed
                      </p>
                    </div>
                        <Award className="w-8 h-8 text-purple-500" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                          <p className="text-sm font-medium text-gray-600">Withdrawal Amount</p>
                      <p className="text-3xl font-bold text-orange-600">
                            ${withdrawalStats?.totalWithdrawals || 0}
                          </p>
                          <p className="text-xs text-gray-500 mt-1">
                            {withdrawalStats?.pendingWithdrawals || 0} Pending
                      </p>
                    </div>
                        <CreditCard className="w-8 h-8 text-orange-500" />
                  </div>
                </CardContent>
              </Card>
            </div>

                {/* Top 10 Customers Leaderboard */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      <Star className="w-5 h-5 mr-2" />
                      Top 10 Customers Leaderboard
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Rank</TableHead>
                          <TableHead>Customer</TableHead>
                          <TableHead>Country</TableHead>
                          <TableHead>Points</TableHead>
                          <TableHead>Referrals</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {topCustomers?.slice(0, 10).map((customer: any, index: number) => (
                          <TableRow key={customer.id}>
                            <TableCell>
                              <Badge variant={index < 3 ? "default" : "secondary"}>
                                #{index + 1}
                              </Badge>
                            </TableCell>
                            <TableCell>{customer.firstName} {customer.lastName}</TableCell>
                            <TableCell>{customer.country}</TableCell>
                            <TableCell>{customer.totalPoints?.toLocaleString() || 0}</TableCell>
                            <TableCell>{customer.referralCount || 0}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>

                {/* Country-wise Statistics */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <Card>
                    <CardHeader>
                      <CardTitle>Country-wise Merchant Distribution</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        {merchantStats?.countryStats?.map((stat: any) => (
                          <div key={stat.country} className="flex justify-between items-center">
                            <span className="font-medium">{stat.country}</span>
                            <div className="flex items-center space-x-2">
                              <div className="w-32 bg-gray-200 rounded-full h-2">
                                <div 
                                  className="bg-blue-600 h-2 rounded-full" 
                                  style={{ width: `${(stat.count / (merchantStats?.totalMerchants || 1)) * 100}%` }}
                                ></div>
                              </div>
                              <span className="text-sm text-gray-600">{stat.count}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle>Country-wise Customer Distribution</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        {customerStats?.countryStats?.map((stat: any) => (
                          <div key={stat.country} className="flex justify-between items-center">
                            <span className="font-medium">{stat.country}</span>
                            <div className="flex items-center space-x-2">
                              <div className="w-32 bg-gray-200 rounded-full h-2">
                                <div 
                                  className="bg-green-600 h-2 rounded-full" 
                                  style={{ width: `${(stat.count / (customerStats?.totalCustomers || 1)) * 100}%` }}
                                ></div>
                              </div>
                              <span className="text-sm text-gray-600">{stat.count}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </div>
            )}

            {/* Global Merchants Tab */}
            {activeTab === "merchants" && (
              <div className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      <Building2 className="w-5 h-5 mr-2" />
                      Global Merchant Statistics
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      <div className="text-center p-4 bg-blue-50 rounded-lg">
                        <Building2 className="w-8 h-8 text-blue-600 mx-auto mb-2" />
                        <p className="text-2xl font-bold text-blue-600">{merchantStats?.regularMerchants || 0}</p>
                        <p className="text-sm text-gray-600">Regular Merchants</p>
                      </div>
                      <div className="text-center p-4 bg-green-50 rounded-lg">
                        <Building className="w-8 h-8 text-green-600 mx-auto mb-2" />
                        <p className="text-2xl font-bold text-green-600">{merchantStats?.eMerchants || 0}</p>
                        <p className="text-sm text-gray-600">E-Merchants</p>
                      </div>
                      <div className="text-center p-4 bg-purple-50 rounded-lg">
                        <Star className="w-8 h-8 text-purple-600 mx-auto mb-2" />
                        <p className="text-2xl font-bold text-purple-600">{merchantStats?.starMerchants || 0}</p>
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
                              style={{ width: `${(merchantStats?.starMerchants || 0) / (merchantStats?.totalMerchants || 1) * 100}%` }}
                            ></div>
                          </div>
                          <span className="text-sm text-gray-600">{merchantStats?.starMerchants || 0}</span>
                        </div>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="font-medium">Double Star Merchants</span>
                        <div className="flex items-center space-x-2">
                          <div className="w-32 bg-gray-200 rounded-full h-2">
                            <div 
                              className="bg-orange-500 h-2 rounded-full" 
                              style={{ width: `${(merchantStats?.doubleStarMerchants || 0) / (merchantStats?.totalMerchants || 1) * 100}%` }}
                            ></div>
                          </div>
                          <span className="text-sm text-gray-600">{merchantStats?.doubleStarMerchants || 0}</span>
                        </div>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="font-medium">Triple Star Merchants</span>
                        <div className="flex items-center space-x-2">
                          <div className="w-32 bg-gray-200 rounded-full h-2">
                            <div 
                              className="bg-red-500 h-2 rounded-full" 
                              style={{ width: `${(merchantStats?.tripleStarMerchants || 0) / (merchantStats?.totalMerchants || 1) * 100}%` }}
                            ></div>
                          </div>
                          <span className="text-sm text-gray-600">{merchantStats?.tripleStarMerchants || 0}</span>
                        </div>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="font-medium">Executive Merchants</span>
                        <div className="flex items-center space-x-2">
                          <div className="w-32 bg-gray-200 rounded-full h-2">
                            <div 
                              className="bg-purple-500 h-2 rounded-full" 
                              style={{ width: `${(merchantStats?.executiveMerchants || 0) / (merchantStats?.totalMerchants || 1) * 100}%` }}
                            ></div>
                          </div>
                          <span className="text-sm text-gray-600">{merchantStats?.executiveMerchants || 0}</span>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Global Customers Tab */}
            {activeTab === "customers" && (
              <div className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      <Users className="w-5 h-5 mr-2" />
                      Global Customer Statistics
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="text-center p-4 bg-blue-50 rounded-lg">
                        <Users className="w-8 h-8 text-blue-600 mx-auto mb-2" />
                        <p className="text-2xl font-bold text-blue-600">{customerStats?.totalCustomers || 0}</p>
                        <p className="text-sm text-gray-600">Total Customers</p>
                      </div>
                      <div className="text-center p-4 bg-green-50 rounded-lg">
                        <UserCheck className="w-8 h-8 text-green-600 mx-auto mb-2" />
                        <p className="text-2xl font-bold text-green-600">{customerStats?.activeCustomers || 0}</p>
                        <p className="text-sm text-gray-600">Active Customers</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Top 10 Customers by Serial Number</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Rank</TableHead>
                          <TableHead>Customer</TableHead>
                          <TableHead>Serial Number</TableHead>
                          <TableHead>Country</TableHead>
                          <TableHead>Points</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {topCustomers?.slice(0, 10).map((customer: any, index: number) => (
                          <TableRow key={customer.id}>
                            <TableCell>
                              <Badge variant={index < 3 ? "default" : "secondary"}>
                                #{index + 1}
                              </Badge>
                            </TableCell>
                            <TableCell>{customer.firstName} {customer.lastName}</TableCell>
                            <TableCell>{customer.serialNumber || `SN-${customer.id.slice(0, 8)}`}</TableCell>
                            <TableCell>{customer.country}</TableCell>
                            <TableCell>{customer.totalPoints?.toLocaleString() || 0}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Manage Requests Tab */}
            {activeTab === "requests" && (
              <div className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Pending Point Generation Requests</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Date</TableHead>
                          <TableHead>Requester</TableHead>
                          <TableHead>Country</TableHead>
                          <TableHead>Points</TableHead>
                          <TableHead>Reason</TableHead>
                          <TableHead>Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {pendingRequests.map((r: any) => (
                          <TableRow key={r.id}>
                            <TableCell>{new Date(r.createdAt).toLocaleString()}</TableCell>
                            <TableCell>{r.requesterId?.slice(0,8)}</TableCell>
                            <TableCell>{r.requesterCountry}</TableCell>
                            <TableCell>{r.pointsRequested.toLocaleString()}</TableCell>
                            <TableCell>{r.reason || '-'}</TableCell>
                            <TableCell className="space-x-2">
                              <Button size="sm" onClick={() => approveMutation.mutate(r.id)}>
                                <Check className="w-4 h-4 mr-1" /> Approve
                              </Button>
                              <Button size="sm" variant="destructive" onClick={() => rejectMutation.mutate(r.id)}>
                                <X className="w-4 h-4 mr-1" /> Reject
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Commission & Percentage Settings Tab */}
            {activeTab === "commission-settings" && (
              <div className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      <Percent className="w-5 h-5 mr-2" />
                      Global Commission & Percentage Settings
                    </CardTitle>
                    <CardDescription>
                      Configure global commission rates and percentage settings. Confirm password before saving changes.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="bg-yellow-50 border border-yellow-200 p-4 rounded-lg">
                      <div className="flex items-center">
                        <AlertCircle className="w-5 h-5 text-yellow-600 mr-2" />
                        <div>
                          <p className="font-semibold text-yellow-800">Password Confirmation Required</p>
                          <p className="text-sm text-yellow-700">
                            You must confirm your password before saving any commission settings.
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                      {/* Customer Benefits */}
                      <Card>
                        <CardHeader>
                          <CardTitle className="text-lg">Customer Benefits</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                          <div className="space-y-2">
                            <Label>Stepup Reward (%)</Label>
                            <Input type="number" placeholder="5" />
                          </div>
                          <div className="space-y-2">
                            <Label>Infinity Reward (%)</Label>
                            <Input type="number" placeholder="10" />
                          </div>
                          <div className="space-y-2">
                            <Label>Affiliate Reward (%)</Label>
                            <Input type="number" placeholder="15" />
                          </div>
                          <div className="space-y-2">
                            <Label>Ripple Reward (%)</Label>
                            <Input type="number" placeholder="20" />
                          </div>
                          <div className="space-y-2">
                            <Label>Shopping Voucher (%)</Label>
                            <Input type="number" placeholder="25" />
                          </div>
                        </CardContent>
                      </Card>

                      {/* Merchant Benefits */}
                      <Card>
                        <CardHeader>
                          <CardTitle className="text-lg">Merchant Benefits</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                          <div className="space-y-2">
                            <Label>Instant Cashback (%)</Label>
                            <Input type="number" placeholder="3" />
                          </div>
                          <div className="space-y-2">
                            <Label>Affiliate Cashback (%)</Label>
                            <Input type="number" placeholder="5" />
                          </div>
                          <div className="space-y-2">
                            <Label>Profit Share Cashback (%)</Label>
                            <Input type="number" placeholder="7" />
                          </div>
                          <div className="space-y-2">
                            <Label>Shopping Voucher (%)</Label>
                            <Input type="number" placeholder="10" />
                          </div>
                          <div className="space-y-2">
                            <Label>Rank Incentive (%)</Label>
                            <Input type="number" placeholder="12" />
                          </div>
                        </CardContent>
                      </Card>

                      {/* Co-founder Benefits */}
                      <Card>
                        <CardHeader>
                          <CardTitle className="text-lg">Co-founder Benefits</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                          <div className="space-y-2">
                            <Label>Instant Cashback (%)</Label>
                            <Input type="number" placeholder="5" />
                          </div>
                          <div className="space-y-2">
                            <Label>Affiliate Cashback (%)</Label>
                            <Input type="number" placeholder="8" />
                          </div>
                          <div className="space-y-2">
                            <Label>Profit Share Cashback (%)</Label>
                            <Input type="number" placeholder="10" />
                          </div>
                          <div className="space-y-2">
                            <Label>Shopping Voucher (%)</Label>
                            <Input type="number" placeholder="15" />
                          </div>
                          <div className="space-y-2">
                            <Label>Rank Incentive (%)</Label>
                            <Input type="number" placeholder="18" />
                          </div>
                          <div className="space-y-2">
                            <Label>Partnership Commission (%)</Label>
                            <Input type="number" placeholder="20" />
                          </div>
                          <div className="space-y-2">
                            <Label>All Partnership Commission (%)</Label>
                            <Input type="number" placeholder="25" />
                          </div>
                        </CardContent>
                      </Card>
                    </div>

                    <div className="flex justify-end space-x-4">
                      <Button variant="outline">Reset to Default</Button>
                      <Button className="bg-blue-600 hover:bg-blue-700">
                        <Save className="w-4 h-4 mr-2" />
                        Save Settings
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* VAT & Service Charge Tab */}
            {activeTab === "vat-service" && (
              <div className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      <Calculator className="w-5 h-5 mr-2" />
                      Global VAT & Service Charge Management
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      <Card>
                        <CardHeader>
                          <CardTitle>Total Global VAT & Service Charge</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="space-y-4">
                            <div className="text-center p-4 bg-blue-50 rounded-lg">
                              <p className="text-2xl font-bold text-blue-600">$12,450.00</p>
                              <p className="text-sm text-gray-600">Total Global VAT</p>
                            </div>
                            <div className="text-center p-4 bg-green-50 rounded-lg">
                              <p className="text-2xl font-bold text-green-600">$8,230.00</p>
                              <p className="text-sm text-gray-600">Total Service Charge</p>
                            </div>
                            <div className="text-center p-4 bg-purple-50 rounded-lg">
                              <p className="text-2xl font-bold text-purple-600">$20,680.00</p>
                              <p className="text-sm text-gray-600">Combined Total</p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>

                      <Card>
                        <CardHeader>
                          <CardTitle>VAT & Service Charge by Country</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="space-y-4">
                            <div className="flex justify-between items-center">
                              <span className="font-medium">United States</span>
                              <div className="text-right">
                                <p className="text-sm font-semibold">$5,200.00</p>
                                <p className="text-xs text-gray-500">VAT: $3,100 • Service: $2,100</p>
                              </div>
                            </div>
                            <div className="flex justify-between items-center">
                              <span className="font-medium">United Kingdom</span>
                              <div className="text-right">
                                <p className="text-sm font-semibold">$4,800.00</p>
                                <p className="text-xs text-gray-500">VAT: $2,900 • Service: $1,900</p>
                              </div>
                            </div>
                            <div className="flex justify-between items-center">
                              <span className="font-medium">Canada</span>
                              <div className="text-right">
                                <p className="text-sm font-semibold">$3,200.00</p>
                                <p className="text-xs text-gray-500">VAT: $1,800 • Service: $1,400</p>
                              </div>
                            </div>
                            <div className="flex justify-between items-center">
                              <span className="font-medium">Australia</span>
                              <div className="text-right">
                                <p className="text-sm font-semibold">$2,900.00</p>
                                <p className="text-xs text-gray-500">VAT: $1,700 • Service: $1,200</p>
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </div>

                    <div className="flex space-x-2">
                      <Button variant="outline">Daily</Button>
                      <Button variant="outline">Weekly</Button>
                      <Button variant="default">Monthly</Button>
                      <Button variant="outline">Yearly</Button>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

          {/* Generate Points Tab */}
            {activeTab === "generate-points" && (
              <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Plus className="w-5 h-5 mr-2 text-blue-600" />
                  Manual Points Addition
                </CardTitle>
                <CardDescription>
                  Add points to the global system for distribution to local admins and merchants
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg">
                  <div className="flex items-center">
                    <AlertCircle className="w-5 h-5 text-blue-600 mr-2" />
                    <div>
                      <p className="font-semibold text-blue-800">Global Admin Authority</p>
                      <p className="text-sm text-blue-700">
                        Only global administrators can manually add points to the system.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="add-points-amount">Points Amount</Label>
                      <Input
                        id="add-points-amount"
                        type="number"
                        placeholder="Enter points amount"
                        value={addPointsForm.points}
                        onChange={(e) => setAddPointsForm(prev => ({ ...prev, points: e.target.value }))}
                        min="1"
                        data-testid="input-add-points-amount"
                      />
                    </div>
                    
                    <div>
                      <Label htmlFor="add-points-description">Description</Label>
                      <Input
                        id="add-points-description"
                        placeholder="Reason for adding points"
                        value={addPointsForm.description}
                        onChange={(e) => setAddPointsForm(prev => ({ ...prev, description: e.target.value }))}
                        data-testid="input-add-points-description"
                      />
                    </div>

                    <Button
                      onClick={handleAddPoints}
                      disabled={addPointsMutation.isPending || !addPointsForm.points || !addPointsForm.description}
                      className="w-full bg-blue-600 hover:bg-blue-700"
                      data-testid="button-generate-points"
                    >
                      {addPointsMutation.isPending ? "Generating Points..." : "Generate Points"}
                    </Button>
                  </div>

                  <div className="space-y-4">
                    <div className="bg-green-50 border border-green-200 p-4 rounded-lg">
                      <h4 className="font-semibold text-green-800 mb-2">Current Balance</h4>
                      <p className="text-2xl font-bold text-green-600">
                        {adminBalance?.balance ? adminBalance.balance.toLocaleString() : '0'} Points
                      </p>
                      <p className="text-sm text-green-600 mt-1">Available for distribution</p>
                    </div>
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
                  <DollarSign className="w-5 h-5 mr-2 text-green-600" />
                  Distribute Points to Local Admins
                </CardTitle>
                <CardDescription>
                  Transfer points from your global balance to local administrators
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="distribute-admin">Local Admin</Label>
                      <Select 
                        value={distributePointsForm.toUserId} 
                        onValueChange={(value) => setDistributePointsForm(prev => ({ ...prev, toUserId: value }))}
                      >
                        <SelectTrigger data-testid="select-local-admin">
                          <SelectValue placeholder="Select local admin" />
                        </SelectTrigger>
                        <SelectContent>
                          {adminsList?.map((admin: any) => (
                            <SelectItem key={admin.id || admin.userId} value={admin.id || admin.userId}>
                              {admin.user?.firstName || admin.firstName} {admin.user?.lastName || admin.lastName} ({admin.user?.country || admin.country}) - {admin.user?.email || 'No email'}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label htmlFor="distribute-points">Points Amount</Label>
                      <Input
                        id="distribute-points"
                        type="number"
                        placeholder="Enter points to distribute"
                        value={distributePointsForm.points}
                        onChange={(e) => setDistributePointsForm(prev => ({ ...prev, points: e.target.value }))}
                        min="1"
                        data-testid="input-distribute-points"
                      />
                    </div>

                    <div>
                      <Label htmlFor="distribute-description">Description</Label>
                      <Input
                        id="distribute-description"
                        placeholder="Reason for distribution"
                        value={distributePointsForm.description}
                        onChange={(e) => setDistributePointsForm(prev => ({ ...prev, description: e.target.value }))}
                        data-testid="input-distribute-description"
                      />
                    </div>

                    <Button
                      onClick={handleDistributePoints}
                      disabled={distributePointsMutation.isPending || !distributePointsForm.toUserId || !distributePointsForm.points || !distributePointsForm.description}
                      className="w-full"
                      data-testid="button-distribute-points"
                    >
                      {distributePointsMutation.isPending ? "Distributing..." : "Distribute Points"}
                    </Button>
                  </div>

                  <div className="space-y-4">
                    <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg">
                      <h4 className="font-semibold text-blue-800 mb-2">Available Balance</h4>
                      <p className="text-2xl font-bold text-blue-600">
                        {adminBalance ? (adminBalance as any).balance.toLocaleString() : 0} Points
                      </p>
                      <p className="text-sm text-blue-600 mt-1">Ready for distribution</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
              </div>
            )}

            {/* Global Merchant List Tab */}
            {activeTab === "merchant-list" && (
              <div className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      <Building className="w-5 h-5 mr-2" />
                      Global Merchant List & E-Merchant List
                    </CardTitle>
                    <CardDescription>
                      View and manage all global merchants with indication for E-merchants
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex justify-between items-center mb-4">
                      <div className="flex space-x-2">
                        <Input placeholder="Search merchants..." className="w-64" />
                        <Button variant="outline">
                          <Search className="w-4 h-4 mr-2" />
                          Search
                        </Button>
                      </div>
                      <div className="flex space-x-2">
                        <Button variant="outline">
                          <Filter className="w-4 h-4 mr-2" />
                          Filter
                        </Button>
                        <Button variant="outline">
                          <Download className="w-4 h-4 mr-2" />
                          Export
                        </Button>
                      </div>
                    </div>
                    
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Merchant</TableHead>
                          <TableHead>Type</TableHead>
                          <TableHead>Country</TableHead>
                          <TableHead>Tier</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {globalMerchants?.map((merchant: any) => (
                          <TableRow key={merchant.id}>
                            <TableCell>
                              <div>
                                <p className="font-medium">{merchant.businessName}</p>
                                <p className="text-sm text-gray-500">{merchant.contactEmail}</p>
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge variant={merchant.isEMerchant ? "default" : "secondary"}>
                                {merchant.isEMerchant ? "E-Merchant" : "Regular"}
                              </Badge>
                            </TableCell>
                            <TableCell>{merchant.country}</TableCell>
                            <TableCell>
                              <Badge variant="outline">
                                {merchant.tier || "Standard"}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <Badge variant={merchant.isActive ? "default" : "destructive"}>
                                {merchant.isActive ? "Active" : "Inactive"}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <div className="flex space-x-2">
                                <Button size="sm" variant="outline">
                                  <Eye className="w-4 h-4" />
                                </Button>
                                <Button size="sm" variant="outline">
                                  <Edit className="w-4 h-4" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Global Customer List Tab */}
            {activeTab === "customer-list" && (
              <div className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      <Users className="w-5 h-5 mr-2" />
                      Global Customer List
                    </CardTitle>
                    <CardDescription>
                      View and manage all global customers
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex justify-between items-center mb-4">
                      <div className="flex space-x-2">
                        <Input placeholder="Search customers..." className="w-64" />
                        <Button variant="outline">
                          <Search className="w-4 h-4 mr-2" />
                          Search
                        </Button>
                      </div>
                      <div className="flex space-x-2">
                        <Button variant="outline">
                          <Filter className="w-4 h-4 mr-2" />
                          Filter
                        </Button>
                        <Button variant="outline">
                          <Download className="w-4 h-4 mr-2" />
                          Export
                        </Button>
                      </div>
                    </div>
                    
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Customer</TableHead>
                          <TableHead>Serial Number</TableHead>
                          <TableHead>Country</TableHead>
                          <TableHead>Points</TableHead>
                          <TableHead>Referrals</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {globalCustomers?.map((customer: any) => (
                          <TableRow key={customer.id}>
                            <TableCell>
                              <div>
                                <p className="font-medium">{customer.firstName} {customer.lastName}</p>
                                <p className="text-sm text-gray-500">{customer.email}</p>
                              </div>
                            </TableCell>
                            <TableCell>{customer.serialNumber || `SN-${customer.id.slice(0, 8)}`}</TableCell>
                            <TableCell>{customer.country}</TableCell>
                            <TableCell>{customer.totalPoints?.toLocaleString() || 0}</TableCell>
                            <TableCell>{customer.referralCount || 0}</TableCell>
                            <TableCell>
                              <Badge variant={customer.isActive ? "default" : "destructive"}>
                                {customer.isActive ? "Active" : "Inactive"}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <div className="flex space-x-2">
                                <Button size="sm" variant="outline">
                                  <Eye className="w-4 h-4" />
                                </Button>
                                <Button size="sm" variant="outline">
                                  <Edit className="w-4 h-4" />
                                </Button>
                              </div>
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
                  Global Admin Secure Chat
                </CardTitle>
                <CardDescription>
                  Communicate with local administrators across all regions with end-to-end security
                </CardDescription>
              </CardHeader>
              <CardContent>
                {currentUser && (
                  <SecureChat 
                    currentUser={{
                      id: currentUser.id,
                      name: `${currentUser.firstName} ${currentUser.lastName}`,
                      role: currentUser.role,
                      token: localStorage.getItem('globalAdminToken') || ''
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
  );
}