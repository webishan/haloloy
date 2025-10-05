import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { 
  Users, Crown, Globe, MapPin, Send, MessageCircle, Plus, Settings, BarChart3, 
  DollarSign, UserCheck, Shield, Award, Zap, TrendingUp, Phone, Mail, Calendar, 
  Clock, CheckCircle, XCircle, AlertCircle, LogOut, Eye, Star
} from "lucide-react";
import { io, Socket } from "socket.io-client";
import SecureChat from "@/components/SecureChat";

interface AdminUser {
  id: string;
  username: string;
  email: string;
  firstName: string;
  lastName: string;
  role: 'global_admin' | 'local_admin';
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

export default function AdminPortal() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [currentUser, setCurrentUser] = useState<AdminUser | null>(null);
  const [activeTab, setActiveTab] = useState("dashboard");
  const [socket, setSocket] = useState<Socket | null>(null);
  const [selectedChatUser, setSelectedChatUser] = useState<any>(null);
  const [newMessage, setNewMessage] = useState("");
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Login form state
  const [loginForm, setLoginForm] = useState({
    email: "",
    password: "",
    adminType: "global" as "global" | "local"
  });

  // Points form state
  const [addPointsForm, setAddPointsForm] = useState({
    points: "",
    description: ""
  });

  // Check authentication on mount
  useEffect(() => {
    const token = localStorage.getItem('adminToken');
    const user = localStorage.getItem('adminUser');
    if (token && user) {
      try {
        const userData = JSON.parse(user);
        setCurrentUser(userData);
        setIsAuthenticated(true);
      } catch (error) {
        console.error('Error parsing stored user data:', error);
        localStorage.removeItem('adminToken');
        localStorage.removeItem('adminUser');
      }
    }
  }, []);

  // Initialize WebSocket with proper authentication
  useEffect(() => {
    if (isAuthenticated && currentUser) {
      const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
      const wsUrl = `${protocol}//${window.location.host}`;
      const token = localStorage.getItem('adminToken');
      
      const newSocket = io(wsUrl, {
        path: '/ws',
        auth: { token },
        query: { userId: currentUser.id }
      });

      newSocket.on('connect', () => {
        console.log('Connected to chat server');
        // Authenticate with the server
        newSocket.emit('authenticate', { 
          userId: currentUser.id, 
          token 
        });
      });

      newSocket.on('authenticated', (data) => {
        console.log('Socket authenticated:', data);
        toast({ title: "Chat Connected", description: "Real-time chat is now active" });
      });

      newSocket.on('authError', (error) => {
        console.error('Socket auth error:', error);
        toast({ title: "Chat Error", description: "Failed to connect to chat", variant: "destructive" });
      });

      newSocket.on('newMessage', (message: ChatMessage) => {
        // Only add message to state if it's for the current conversation
        if (selectedChatUser && (message.senderId === selectedChatUser.id || message.receiverId === selectedChatUser.id)) {
          setChatMessages(prev => [...prev, message]);
        }
        toast({ 
          title: "New Message", 
          description: `Message from ${message.senderName}: ${message.message.slice(0, 50)}...` 
        });
      });

      newSocket.on('messageConfirmed', (message: ChatMessage) => {
        // Only add message to state if it's for the current conversation
        if (selectedChatUser && (message.senderId === selectedChatUser.id || message.receiverId === selectedChatUser.id)) {
          setChatMessages(prev => [...prev, message]);
        }
      });

      newSocket.on('messageError', (error) => {
        console.error('Message error:', error);
        toast({ title: "Message Failed", description: error.error, variant: "destructive" });
      });

      newSocket.on('userTyping', (data) => {
        // Handle typing indicators if needed
        console.log('User typing:', data);
      });

      newSocket.on('messageRead', (data) => {
        // Handle read receipts if needed
        console.log('Message read:', data);
      });

      setSocket(newSocket);

      return () => {
        newSocket.disconnect();
      };
    }
  }, [isAuthenticated, currentUser, selectedChatUser]);

  // Login mutation
  const loginMutation = useMutation({
    mutationFn: async (credentials: typeof loginForm) => {
      const response = await fetch('/api/admin/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(credentials)
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || 'Login failed');
      }
      
      return await response.json();
    },
    onSuccess: (data) => {
      setCurrentUser(data.user);
      setIsAuthenticated(true);
      localStorage.setItem('adminToken', data.token);
      localStorage.setItem('adminUser', JSON.stringify(data.user));
      toast({ 
        title: "Login Successful", 
        description: `Welcome ${data.user.firstName}! You are logged in as ${data.user.role.replace('_', ' ')}.` 
      });
    },
    onError: (error: Error) => {
      console.error('Login error:', error);
      toast({ 
        title: "Login Failed", 
        description: error.message || "Invalid credentials",
        variant: "destructive" 
      });
    }
  });

  // Data queries with error handling
  const { data: dashboardData, isLoading: isDashboardLoading } = useQuery({
    queryKey: ['/api/admin/dashboard'],
    enabled: isAuthenticated,
    retry: false,
    refetchInterval: 30000 // Refresh every 30 seconds
  });

  const { data: adminsList } = useQuery({
    queryKey: ['/api/admin/admins'],
    enabled: isAuthenticated && currentUser?.role === 'global_admin',
    retry: false
  });

  const { data: merchantsList } = useQuery({
    queryKey: ['/api/admin/merchants'],
    enabled: isAuthenticated,
    retry: false
  });

  const { data: pointDistributions } = useQuery({
    queryKey: ['/api/admin/point-distributions'],
    enabled: isAuthenticated,
    retry: false
  });

  const { data: chatUsers } = useQuery({
    queryKey: ['/api/admin/chat-users'],
    enabled: isAuthenticated,
    retry: false
  });

  // Fetch chat messages for selected user
  const { data: messagesForSelectedUser = [], refetch: refetchMessages } = useQuery({
    queryKey: ['/api/admin/chat-messages', selectedChatUser?.id],
    queryFn: async () => {
      if (!selectedChatUser) return [];
      const response = await fetch(`/api/admin/chat-messages?partnerId=${selectedChatUser.id}`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('adminToken')}` }
      });
      if (!response.ok) throw new Error('Failed to fetch messages');
      return response.json();
    },
    enabled: !!selectedChatUser,
    retry: false
  });

  // Manual point addition mutation (global admin only)
  const addPointsMutation = useMutation({
    mutationFn: async (data: { points: number; description: string }) => {
      const response = await fetch('/api/admin/add-points', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('adminToken')}`
        },
        body: JSON.stringify(data)
      });
      
      if (!response.ok) {
        const error = await response.text();
        throw new Error(error);
      }
      
      return response.json();
    },
    onSuccess: () => {
      toast({ title: "Points Added", description: "Points have been added to your balance successfully!" });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/dashboard'] });
    },
    onError: (error: Error) => {
      toast({ title: "Add Points Failed", description: error.message, variant: "destructive" });
    }
  });

  // Point distribution mutation
  const distributePointsMutation = useMutation({
    mutationFn: async (data: { toUserId: string; points: number; description: string }) => {
      const response = await fetch('/api/admin/distribute-points', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('adminToken')}`
        },
        body: JSON.stringify(data)
      });
      
      if (!response.ok) {
        const error = await response.text();
        throw new Error(error);
      }
      
      return response.json();
    },
    onSuccess: () => {
      toast({ title: "Points Distributed", description: "Points have been distributed successfully!" });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/point-distributions'] });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/dashboard'] });
    },
    onError: (error: Error) => {
      toast({ title: "Distribution Failed", description: error.message, variant: "destructive" });
    }
  });

  // Send message mutation
  const sendMessageMutation = useMutation({
    mutationFn: async (data: { receiverId: string; message: string }) => {
      const response = await fetch('/api/admin/send-message', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('adminToken')}`
        },
        body: JSON.stringify(data)
      });
      
      if (!response.ok) {
        const error = await response.text();
        throw new Error(error);
      }
      
      return response.json();
    },
    onSuccess: () => {
      setNewMessage("");
      queryClient.invalidateQueries({ queryKey: ['/api/admin/chat-messages'] });
      refetchMessages();
    },
    onError: (error: Error) => {
      toast({ title: "Message Failed", description: error.message, variant: "destructive" });
    }
  });

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    loginMutation.mutate(loginForm);
  };

  const handleLogout = () => {
    localStorage.removeItem('adminToken');
    localStorage.removeItem('adminUser');
    setIsAuthenticated(false);
    setCurrentUser(null);
    setActiveTab("dashboard");
    if (socket) {
      socket.disconnect();
      setSocket(null);
    }
    toast({ title: "Logged Out", description: "You have been logged out successfully." });
  };

  const handleSendMessage = () => {
    if (!newMessage.trim() || !selectedChatUser) return;
    
    // Send via WebSocket for real-time delivery
    if (socket) {
      socket.emit('sendMessage', {
        receiverId: selectedChatUser.id,
        message: newMessage.trim()
      });
      setNewMessage(""); // Clear input immediately for better UX
    } else {
      // Fallback to HTTP API if socket not available
      sendMessageMutation.mutate({
        receiverId: selectedChatUser.id,
        message: newMessage.trim()
      });
    }
  };

  const handleAddPoints = () => {
    if (!addPointsForm.points || !addPointsForm.description) {
      toast({ title: "Error", description: "Please fill in all fields", variant: "destructive" });
      return;
    }
    
    addPointsMutation.mutate({
      points: parseInt(addPointsForm.points),
      description: addPointsForm.description
    });
    
    setAddPointsForm({ points: "", description: "" });
  };

  // Login Form
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 via-white to-red-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-lg shadow-2xl border-0">
          <CardHeader className="text-center bg-gradient-to-r from-red-600 to-red-500 text-white rounded-t-lg">
            <div className="w-20 h-20 bg-white/20 backdrop-blur-sm rounded-full mx-auto mb-4 flex items-center justify-center">
              <img 
                src="/images/holyloy-logo.png" 
                alt="HOLYLOY Logo" 
                className="w-12 h-12 object-contain"
              />
            </div>
            <CardTitle className="text-3xl font-bold">Holyloy Admin Portal</CardTitle>
            <p className="text-red-100">Secure administrative access</p>
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
                  className="mt-2 h-12"
                  required
                  data-testid="input-admin-email"
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
                  className="mt-2 h-12"
                  required
                  data-testid="input-admin-password"
                />
              </div>

              <div>
                <Label htmlFor="adminType" className="text-sm font-semibold text-gray-700">Admin Level</Label>
                <Select 
                  value={loginForm.adminType} 
                  onValueChange={(value: "global" | "local") => setLoginForm({...loginForm, adminType: value})}
                >
                  <SelectTrigger className="mt-2 h-12" data-testid="select-admin-type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="global">Global Administrator</SelectItem>
                    <SelectItem value="local">Local Administrator</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Button 
                type="submit" 
                className="w-full h-12 bg-gradient-to-r from-red-600 to-red-500 hover:from-red-700 hover:to-red-600 text-white font-semibold text-lg"
                disabled={loginMutation.isPending}
                data-testid="button-admin-login"
              >
                {loginMutation.isPending ? "Authenticating..." : "Access Admin Portal"}
              </Button>
            </form>
            
            <div className="mt-6 text-center text-sm text-gray-500">
              <p>Test Credentials:</p>
              <p>Global: global@holyloy.com / holyloy123</p>
              <p>Local BD: local1@holyloy.com / local123</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Main Admin Dashboard
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-4">
              <div className="w-10 h-10 bg-gradient-to-r from-red-600 to-red-500 rounded-lg flex items-center justify-center">
                <Shield className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">Holyloy Admin Portal</h1>
                <p className="text-sm text-gray-500">
                  {currentUser?.role === 'global_admin' ? 'Global Administrator' : `Local Administrator - ${currentUser?.country || 'Unknown'}`}
                </p>
                <p className="text-xs text-gray-400">
                  User ID: {currentUser?.username || currentUser?.email || 'Unknown'}
                </p>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              <Badge variant={currentUser?.role === 'global_admin' ? 'default' : 'secondary'} className="px-3 py-1">
                {currentUser?.role === 'global_admin' ? (
                  <>
                    <Crown className="w-4 h-4 mr-1" />
                    Global Admin
                  </>
                ) : (
                  <>
                    <MapPin className="w-4 h-4 mr-1" />
                    Local Admin
                  </>
                )}
              </Badge>
              
              <div className="text-xs text-gray-500">
                Role: {currentUser?.role || 'Unknown'}
              </div>
              
              <div className="flex items-center space-x-2 text-sm text-gray-600">
                <span>{currentUser?.firstName} {currentUser?.lastName}</span>
              </div>
              
              <Button onClick={handleLogout} variant="outline" size="sm" data-testid="button-admin-logout">
                <LogOut className="w-4 h-4 mr-2" />
                Logout
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className={`grid w-full ${currentUser?.role === 'global_admin' ? 'grid-cols-9' : 'grid-cols-8'}`}>
            <TabsTrigger value="dashboard" data-testid="tab-dashboard">
              <BarChart3 className="w-4 h-4 mr-2" />
              Dashboard
            </TabsTrigger>
            {currentUser?.role === 'global_admin' && (
              <TabsTrigger value="add-points" data-testid="tab-add-points">
                <Plus className="w-4 h-4 mr-2" />
                Add Points
              </TabsTrigger>
            )}
            <TabsTrigger value="analytics" data-testid="tab-analytics">
              <TrendingUp className="w-4 h-4 mr-2" />
              Analytics
            </TabsTrigger>
            <TabsTrigger value="points" data-testid="tab-points">
              <DollarSign className="w-4 h-4 mr-2" />
              Points
            </TabsTrigger>
            <TabsTrigger value="users" data-testid="tab-users">
              <Users className="w-4 h-4 mr-2" />
              Users
            </TabsTrigger>
            <TabsTrigger value="merchants" data-testid="tab-merchants">
              <Star className="w-4 h-4 mr-2" />
              Merchants
            </TabsTrigger>
            <TabsTrigger value="withdrawals" data-testid="tab-withdrawals">
              <Zap className="w-4 h-4 mr-2" />
              Withdrawals
            </TabsTrigger>
            <TabsTrigger value="chat" data-testid="tab-chat">
              <MessageCircle className="w-4 h-4 mr-2" />
              Chat
            </TabsTrigger>
            <TabsTrigger value="settings" data-testid="tab-settings">
              <Settings className="w-4 h-4 mr-2" />
              Settings
            </TabsTrigger>
          </TabsList>

          {/* Analytics Tab */}
          <TabsContent value="analytics" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Merchants</CardTitle>
                  <Users className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{dashboardData?.merchants?.total || 0}</div>
                  <p className="text-xs text-muted-foreground">
                    {dashboardData?.merchants?.regular || 0} Regular, {dashboardData?.merchants?.eMerchant || 0} E-Merchants
                  </p>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Customers</CardTitle>
                  <UserCheck className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{dashboardData?.customers?.total || 0}</div>
                  <p className="text-xs text-muted-foreground">
                    Active users across all countries
                  </p>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Reward Points</CardTitle>
                  <DollarSign className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{dashboardData?.rewardPoints?.totalDistributed?.toLocaleString() || 0}</div>
                  <p className="text-xs text-muted-foreground">
                    Total distributed to customers
                  </p>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Serial Numbers</CardTitle>
                  <Award className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{dashboardData?.serialNumbers?.global?.total || 0}</div>
                  <p className="text-xs text-muted-foreground">
                    Global: {dashboardData?.serialNumbers?.global?.completed || 0} completed
                  </p>
                </CardContent>
              </Card>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Merchant Types Distribution</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Regular Merchants</span>
                      <span className="text-sm text-muted-foreground">{dashboardData?.merchants?.regular || 0}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">E-Merchants</span>
                      <span className="text-sm text-muted-foreground">{dashboardData?.merchants?.eMerchant || 0}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Star Merchants</span>
                      <span className="text-sm text-muted-foreground">{dashboardData?.merchants?.star || 0}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Double Star</span>
                      <span className="text-sm text-muted-foreground">{dashboardData?.merchants?.doubleStar || 0}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Triple Star</span>
                      <span className="text-sm text-muted-foreground">{dashboardData?.merchants?.tripleStar || 0}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Executive</span>
                      <span className="text-sm text-muted-foreground">{dashboardData?.merchants?.executive || 0}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Withdrawal Analytics</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Total Withdrawn</span>
                      <span className="text-sm text-muted-foreground">${dashboardData?.withdrawals?.totalWithdrawn?.toLocaleString() || 0}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Merchant Withdrawals</span>
                      <span className="text-sm text-muted-foreground">${dashboardData?.withdrawals?.merchant?.amount?.toLocaleString() || 0}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Customer Withdrawals</span>
                      <span className="text-sm text-muted-foreground">${dashboardData?.withdrawals?.customer?.amount?.toLocaleString() || 0}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Total VAT & Service Charge</span>
                      <span className="text-sm text-muted-foreground">${dashboardData?.vatServiceCharge?.totalVAT?.toLocaleString() || 0}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Country-wise Breakdown</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {dashboardData?.countryBreakdown?.map((country: any) => (
                    <div key={country.country} className="flex items-center justify-between p-4 border rounded-lg">
                      <div>
                        <h4 className="font-medium">{country.country}</h4>
                        <p className="text-sm text-muted-foreground">
                          {country.merchants || 0} merchants, {country.customers || 0} customers
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-medium">${country.sales?.toLocaleString() || 0}</p>
                        <p className="text-xs text-muted-foreground">Total Sales</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Add Points Tab (Global Admin Only) */}
          {currentUser?.role === 'global_admin' && (
            <TabsContent value="add-points" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Plus className="w-5 h-5 mr-2 text-yellow-600" />
                    Manual Points Addition
                  </CardTitle>
                  <CardDescription>
                    Add points to your global balance for distribution to local admins and merchants
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="bg-yellow-50 border border-yellow-200 p-4 rounded-lg">
                    <div className="flex items-center">
                      <AlertCircle className="w-5 h-5 text-yellow-600 mr-2" />
                      <div>
                        <p className="font-semibold text-yellow-800">Global Admin Authority</p>
                        <p className="text-sm text-yellow-700">
                          Only global administrators can manually add points to the system. 
                          These points will be available for distribution to local admins and merchants.
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
                        className="w-full"
                        data-testid="button-add-points"
                      >
                        {addPointsMutation.isPending ? "Adding Points..." : "Add Points to System"}
                      </Button>
                    </div>

                    <div className="space-y-4">
                      <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg">
                        <h4 className="font-semibold text-blue-800 mb-2">Current Balance</h4>
                        <p className="text-2xl font-bold text-blue-600">
                          {dashboardData?.overview?.globalPointsBalance?.toLocaleString() || 0} Points
                        </p>
                        <p className="text-sm text-blue-600 mt-1">Available for distribution</p>
                      </div>

                      <div className="bg-gray-50 border border-gray-200 p-4 rounded-lg">
                        <h4 className="font-semibold text-gray-800 mb-2">How it works:</h4>
                        <ol className="text-sm text-gray-600 space-y-1">
                          <li>1. Add points to your global balance</li>
                          <li>2. Distribute points to local admins</li>
                          <li>3. Local admins distribute to merchants</li>
                          <li>4. Merchants use points for customers</li>
                        </ol>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          )}

          {/* Dashboard Tab */}
          <TabsContent value="dashboard" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Total Merchants</p>
                      <p className="text-3xl font-bold text-blue-600">
                        {isDashboardLoading ? "..." : (dashboardData?.overview?.totalMerchants || 0)}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        +{dashboardData?.overview?.newMerchantsThisMonth || 0} this month
                      </p>
                    </div>
                    <Star className="w-8 h-8 text-blue-500" />
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Total Customers</p>
                      <p className="text-3xl font-bold text-green-600">
                        {isDashboardLoading ? "..." : (dashboardData?.overview?.totalCustomers || 0)}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        +{dashboardData?.overview?.newCustomersThisMonth || 0} this month
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
                      <p className="text-sm font-medium text-gray-600">Points Distributed</p>
                      <p className="text-3xl font-bold text-purple-600">
                        {isDashboardLoading ? "..." : (dashboardData?.overview?.totalPointsDistributed || 0)}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        Across all channels
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
                      <p className="text-sm font-medium text-gray-600">Total Sales</p>
                      <p className="text-3xl font-bold text-orange-600">
                        ${isDashboardLoading ? "..." : (dashboardData?.financialMetrics?.totalSales || "0.00")}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        Avg: ${dashboardData?.financialMetrics?.averageOrderValue || "0.00"} per order
                      </p>
                    </div>
                    <TrendingUp className="w-8 h-8 text-orange-500" />
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Enhanced Analytics Dashboard */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Merchant Analytics */}
              <Card>
                <CardHeader>
                  <CardTitle>Merchant Distribution</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {Object.entries(dashboardData?.merchantAnalytics?.byTier || {}).map(([tier, count]) => (
                      <div key={tier} className="flex justify-between items-center">
                        <span className="text-sm capitalize">{tier.replace(/([A-Z])/g, ' $1').trim()}</span>
                        <Badge variant="outline">{count as number}</Badge>
                      </div>
                    ))}
                  </div>
                  <div className="mt-4 pt-4 border-t">
                    <div className="flex justify-between text-sm">
                      <span>Active:</span>
                      <span className="font-semibold text-green-600">
                        {dashboardData?.merchantAnalytics?.totalActive || 0}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm mt-1">
                      <span>Avg Points:</span>
                      <span className="font-semibold">
                        {dashboardData?.merchantAnalytics?.averagePointsBalance || "0"}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Customer Analytics */}
              <Card>
                <CardHeader>
                  <CardTitle>Customer Tiers</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {Object.entries(dashboardData?.customerAnalytics?.byTier || {}).map(([tier, count]) => (
                      <div key={tier} className="flex justify-between items-center">
                        <span className="text-sm">{tier}</span>
                        <Badge variant={tier === 'Diamond' ? 'default' : 'secondary'}>{count as number}</Badge>
                      </div>
                    ))}
                  </div>
                  <div className="mt-4 pt-4 border-t">
                    <div className="flex justify-between text-sm">
                      <span>Total Points:</span>
                      <span className="font-semibold text-purple-600">
                        {dashboardData?.customerAnalytics?.totalActivePoints?.toLocaleString() || "0"}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Recent Activity */}
            <Card>
              <CardHeader>
                <CardTitle>Recent Point Distributions</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Points</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {dashboardData?.recentActivity?.recentDistributions?.map((distribution: any) => (
                      <TableRow key={distribution.id}>
                        <TableCell>{new Date(distribution.createdAt).toLocaleDateString()}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-xs">
                            {distribution.type?.replace(/_/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase())}
                          </Badge>
                        </TableCell>
                        <TableCell className="font-semibold text-green-600">+{distribution.points}</TableCell>
                        <TableCell className="truncate max-w-xs">{distribution.description}</TableCell>
                        <TableCell>
                          <Badge variant="default" className="text-xs">
                            <CheckCircle className="w-3 h-3 mr-1" />
                            Completed
                          </Badge>
                        </TableCell>
                      </TableRow>
                    )) || (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center text-gray-500 py-8">
                          No recent distributions found
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Points Distribution Tab */}
          <TabsContent value="points" className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-bold">Point Distribution System</h2>
              <Dialog>
                <DialogTrigger asChild>
                  <Button data-testid="button-distribute-points">
                    <Plus className="w-4 h-4 mr-2" />
                    Distribute Points
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Distribute Points</DialogTitle>
                  </DialogHeader>
                  <PointDistributionForm 
                    currentUser={currentUser}
                    adminsList={adminsList}
                    merchantsList={merchantsList}
                    onSubmit={(data) => distributePointsMutation.mutate(data)}
                    isLoading={distributePointsMutation.isPending}
                  />
                </DialogContent>
              </Dialog>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Point Distribution History</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>From</TableHead>
                      <TableHead>To</TableHead>
                      <TableHead>Points</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {pointDistributions?.map((distribution: any) => (
                      <TableRow key={distribution.id}>
                        <TableCell>{new Date(distribution.createdAt).toLocaleDateString()}</TableCell>
                        <TableCell>{distribution.fromUserName}</TableCell>
                        <TableCell>{distribution.toUserName}</TableCell>
                        <TableCell className="font-semibold text-green-600">+{distribution.points}</TableCell>
                        <TableCell>{distribution.description}</TableCell>
                        <TableCell>
                          <Badge variant="default">
                            <CheckCircle className="w-3 h-3 mr-1" />
                            Completed
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Users Management Tab */}
          <TabsContent value="users" className="space-y-6">
            <h2 className="text-2xl font-bold">User Management</h2>
            
            {currentUser?.role === 'global_admin' && (
              <Card>
                <CardHeader>
                  <CardTitle>Local Administrators</CardTitle>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Country</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Points Available</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {adminsList?.filter((admin: any) => admin.adminType === 'local').map((admin: any) => (
                        <TableRow key={admin.id}>
                          <TableCell>{admin.user?.firstName} {admin.user?.lastName}</TableCell>
                          <TableCell>{admin.user?.email}</TableCell>
                          <TableCell>
                            <Badge variant="secondary">{admin.user?.country}</Badge>
                          </TableCell>
                          <TableCell>
                            <Badge variant={admin.user?.isActive ? "default" : "destructive"}>
                              {admin.user?.isActive ? "Active" : "Inactive"}
                            </Badge>
                          </TableCell>
                          <TableCell className="font-semibold">{admin.availablePoints || 0}</TableCell>
                          <TableCell>
                            <Button size="sm" variant="outline" data-testid={`button-view-admin-${admin.id}`}>
                              <Eye className="w-4 h-4 mr-1" />
                              View
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Merchants Tab */}
          <TabsContent value="merchants" className="space-y-6">
            <h2 className="text-2xl font-bold">Merchant Management</h2>
            
            <Card>
              <CardHeader>
                <CardTitle>Merchants</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Business Name</TableHead>
                      <TableHead>Owner</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Country</TableHead>
                      <TableHead>Tier</TableHead>
                      <TableHead>Points</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {merchantsList?.map((merchant: any) => (
                      <TableRow key={merchant.id}>
                        <TableCell className="font-medium">{merchant.businessName}</TableCell>
                        <TableCell>{merchant.user?.firstName} {merchant.user?.lastName}</TableCell>
                        <TableCell>{merchant.user?.email}</TableCell>
                        <TableCell>
                          <Badge variant="secondary">{merchant.user?.country}</Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{merchant.tier}</Badge>
                        </TableCell>
                        <TableCell className="font-semibold">{merchant.availablePoints || 0}</TableCell>
                        <TableCell>
                          <Badge variant={merchant.isActive ? "default" : "destructive"}>
                            {merchant.isActive ? "Active" : "Inactive"}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Chat Tab */}
          <TabsContent value="chat" className="space-y-6">
            <h2 className="text-2xl font-bold">Real-time Communication</h2>
            
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Chat Users List */}
              <Card>
                <CardHeader>
                  <CardTitle>Available Users</CardTitle>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-96">
                    <div className="space-y-2">
                      {chatUsers?.map((user: any) => (
                        <div
                          key={user.id}
                          className={`p-3 rounded-lg cursor-pointer transition-colors ${
                            selectedChatUser?.id === user.id 
                              ? 'bg-blue-100 border-blue-300' 
                              : 'bg-gray-50 hover:bg-gray-100'
                          }`}
                          onClick={() => setSelectedChatUser(user)}
                          data-testid={`chat-user-${user.id}`}
                        >
                          <div className="flex items-center space-x-3">
                            <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
                              <span className="text-white text-xs font-medium">
                                {user.firstName?.charAt(0) || user.email.charAt(0)}
                              </span>
                            </div>
                            <div>
                              <p className="font-medium text-sm">{user.firstName} {user.lastName}</p>
                              <p className="text-xs text-gray-500 capitalize">{user.role?.replace('_', ' ')}</p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>

              {/* Chat Window */}
              <Card className="lg:col-span-2">
                <CardHeader>
                  <CardTitle>
                    {selectedChatUser ? (
                      <div className="flex items-center space-x-3">
                        <MessageCircle className="w-5 h-5" />
                        <span>Chat with {selectedChatUser.firstName} {selectedChatUser.lastName}</span>
                        <Badge variant="secondary" className="text-xs">
                          {selectedChatUser.role?.replace('_', ' ')}
                        </Badge>
                      </div>
                    ) : (
                      'Select a user to start chatting'
                    )}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {selectedChatUser ? (
                    <div className="space-y-4">
                      {/* Messages Area */}
                      <ScrollArea className="h-80 border rounded-lg p-4">
                        <div className="space-y-3">
                          {chatMessages.map((message) => (
                            <div
                              key={message.id}
                              className={`flex ${message.senderId === currentUser?.id ? 'justify-end' : 'justify-start'}`}
                            >
                              <div
                                className={`max-w-xs px-4 py-2 rounded-lg ${
                                  message.senderId === currentUser?.id
                                    ? 'bg-blue-500 text-white'
                                    : 'bg-gray-100 text-gray-900'
                                }`}
                              >
                                <p className="text-sm">{message.message}</p>
                                <p className="text-xs opacity-70 mt-1">
                                  {new Date(message.createdAt).toLocaleTimeString()}
                                </p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </ScrollArea>

                      {/* Message Input */}
                      <div className="flex space-x-2">
                        <Input
                          value={newMessage}
                          onChange={(e) => setNewMessage(e.target.value)}
                          placeholder="Type your message..."
                          onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                          data-testid="input-chat-message"
                        />
                        <Button 
                          onClick={handleSendMessage}
                          disabled={!newMessage.trim() || sendMessageMutation.isPending}
                          data-testid="button-send-message"
                        >
                          <Send className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="h-80 flex items-center justify-center text-gray-500">
                      <div className="text-center">
                        <MessageCircle className="w-12 h-12 mx-auto mb-4 opacity-50" />
                        <p>Select a user from the list to start a conversation</p>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Enhanced Secure Chat Integration */}
            <Card className="mt-6">
              <CardHeader>
                <CardTitle>Enhanced Secure Messaging</CardTitle>
                <CardDescription>
                  Advanced real-time communication with role-based hierarchy and conversation management
                </CardDescription>
              </CardHeader>
              <CardContent>
                {currentUser && (
                  <SecureChat 
                    currentUser={{
                      id: currentUser.id,
                      name: `${currentUser.firstName} ${currentUser.lastName}`,
                      role: currentUser.role,
                      token: localStorage.getItem('adminToken') || ''
                    }}
                  />
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Withdrawals Tab */}
          <TabsContent value="withdrawals" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Zap className="w-5 h-5 mr-2 text-blue-600" />
                  Withdrawal Management
                </CardTitle>
                <CardDescription>
                  Manage and monitor withdrawal requests from merchants and customers
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium">Pending Requests</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold text-yellow-600">0</div>
                        <p className="text-xs text-muted-foreground">Awaiting approval</p>
                      </CardContent>
                    </Card>
                    
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium">Total Withdrawn</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold text-green-600">$0</div>
                        <p className="text-xs text-muted-foreground">This month</p>
                      </CardContent>
                    </Card>
                    
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium">VAT Collected</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold text-blue-600">$0</div>
                        <p className="text-xs text-muted-foreground">12.5% on withdrawals</p>
                      </CardContent>
                    </Card>
                  </div>

                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="text-lg font-semibold">Recent Withdrawal Requests</h3>
                      <Select defaultValue="all">
                        <SelectTrigger className="w-32">
                          <SelectValue placeholder="Filter" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All</SelectItem>
                          <SelectItem value="pending">Pending</SelectItem>
                          <SelectItem value="approved">Approved</SelectItem>
                          <SelectItem value="rejected">Rejected</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="border rounded-lg">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>User</TableHead>
                            <TableHead>Type</TableHead>
                            <TableHead>Amount</TableHead>
                            <TableHead>Method</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Date</TableHead>
                            <TableHead>Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          <TableRow>
                            <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                              No withdrawal requests found
                            </TableCell>
                          </TableRow>
                        </TableBody>
                      </Table>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Settings Tab */}
          <TabsContent value="settings" className="space-y-6">
            <h2 className="text-2xl font-bold">Settings & Configuration</h2>
            
            <Card>
              <CardHeader>
                <CardTitle>Account Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Name</Label>
                    <Input value={`${currentUser?.firstName} ${currentUser?.lastName}`} disabled />
                  </div>
                  <div>
                    <Label>Email</Label>
                    <Input value={currentUser?.email} disabled />
                  </div>
                  <div>
                    <Label>Role</Label>
                    <Input value={currentUser?.role?.replace('_', ' ').toUpperCase()} disabled />
                  </div>
                  <div>
                    <Label>Country</Label>
                    <Input value={currentUser?.country} disabled />
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

// Point Distribution Form Component
function PointDistributionForm({ 
  currentUser, 
  adminsList, 
  merchantsList, 
  onSubmit, 
  isLoading 
}: {
  currentUser: AdminUser | null;
  adminsList: any[];
  merchantsList: any[];
  onSubmit: (data: any) => void;
  isLoading: boolean;
}) {
  const [form, setForm] = useState({
    toUserId: "",
    points: "",
    description: ""
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      toUserId: form.toUserId,
      points: parseInt(form.points),
      description: form.description
    });
    setForm({ toUserId: "", points: "", description: "" });
  };

  // Determine available recipients based on admin type
  const availableRecipients = currentUser?.role === 'global_admin' 
    ? adminsList?.filter(admin => admin.adminType === 'local') || []
    : merchantsList || [];

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <Label>Recipient</Label>
        <Select value={form.toUserId} onValueChange={(value) => setForm({...form, toUserId: value})}>
          <SelectTrigger data-testid="select-point-recipient">
            <SelectValue placeholder={`Select ${currentUser?.role === 'global_admin' ? 'local admin' : 'merchant'}`} />
          </SelectTrigger>
          <SelectContent>
            {availableRecipients.map((recipient: any) => (
              <SelectItem key={recipient.userId || recipient.id} value={recipient.userId || recipient.id}>
                {currentUser?.role === 'global_admin' 
                  ? `${recipient.user?.firstName} ${recipient.user?.lastName} (${recipient.user?.country})`
                  : `${recipient.businessName} - ${recipient.user?.firstName} ${recipient.user?.lastName}`
                }
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div>
        <Label>Points</Label>
        <Input
          type="number"
          value={form.points}
          onChange={(e) => setForm({...form, points: e.target.value})}
          placeholder="Enter points to distribute"
          min="1"
          required
          data-testid="input-points-amount"
        />
      </div>

      <div>
        <Label>Description</Label>
        <Textarea
          value={form.description}
          onChange={(e) => setForm({...form, description: e.target.value})}
          placeholder="Reason for point distribution"
          required
          data-testid="textarea-points-description"
        />
      </div>

      <Button type="submit" disabled={isLoading} className="w-full" data-testid="button-submit-points">
        {isLoading ? "Distributing..." : "Distribute Points"}
      </Button>
    </form>
  );
}