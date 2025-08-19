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
import { 
  Shield, Crown, LogOut, Users, DollarSign, BarChart3, Star, Settings, MessageCircle,
  TrendingUp, Coins, CheckCircle, Send, Plus, AlertCircle
} from "lucide-react";
import io from "socket.io-client";

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
  const [activeTab, setActiveTab] = useState("dashboard");
  const [socket, setSocket] = useState<any>(null);
  const [selectedChatUser, setSelectedChatUser] = useState<any>(null);
  const [newMessage, setNewMessage] = useState("");
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  
  const { toast } = useToast();
  const queryClient = useQueryClient();

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

  // Check authentication on mount
  useEffect(() => {
    const token = localStorage.getItem('globalAdminToken');
    const user = localStorage.getItem('globalAdminUser');
    if (token && user) {
      const userData = JSON.parse(user);
      if (userData.role === 'global_admin') {
        setIsAuthenticated(true);
        setCurrentUser(userData);
      }
    }
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
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...credentials, userType: 'global_admin' })
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

  const { data: localAdmins } = useQuery({
    queryKey: ['/api/admin/admins'],
    enabled: isAuthenticated,
    retry: false
  });

  const { data: chatUsers } = useQuery({
    queryKey: ['/api/admin/chat-users'],
    enabled: isAuthenticated,
    retry: false
  });

  // Manual point addition mutation (global admin only)
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
        const error = await response.text();
        throw new Error(error);
      }
      
      return response.json();
    },
    onSuccess: () => {
      toast({ title: "Points Added", description: "Points have been added to your balance successfully!" });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/dashboard'] });
      setAddPointsForm({ points: "", description: "" });
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
          'Authorization': `Bearer ${localStorage.getItem('globalAdminToken')}`
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
      queryClient.invalidateQueries({ queryKey: ['/api/admin/dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/point-distributions'] });
      setDistributePointsForm({ toUserId: "", points: "", description: "" });
    },
    onError: (error: Error) => {
      toast({ title: "Distribution Failed", description: error.message, variant: "destructive" });
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
    
    addPointsMutation.mutate({
      points: parseInt(addPointsForm.points),
      description: addPointsForm.description
    });
  };

  const handleDistributePoints = () => {
    if (!distributePointsForm.toUserId || !distributePointsForm.points || !distributePointsForm.description) {
      toast({ title: "Error", description: "Please fill in all fields", variant: "destructive" });
      return;
    }
    
    distributePointsMutation.mutate({
      toUserId: distributePointsForm.toUserId,
      points: parseInt(distributePointsForm.points),
      description: distributePointsForm.description
    });
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-lg shadow-2xl border-0">
          <CardHeader className="text-center bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-t-lg">
            <div className="w-20 h-20 bg-white/20 backdrop-blur-sm rounded-full mx-auto mb-4 flex items-center justify-center">
              <Crown className="w-10 h-10 text-white" />
            </div>
            <CardTitle className="text-3xl font-bold">Global Admin Portal</CardTitle>
            <p className="text-blue-100">KOMARCE Global Administration</p>
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
                  placeholder="global@komarce.com"
                  className="mt-2 h-12"
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
                  className="mt-2 h-12"
                  required
                  data-testid="input-global-admin-password"
                />
              </div>

              <Button 
                type="submit" 
                className="w-full h-12 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-semibold text-lg"
                disabled={loginMutation.isPending}
                data-testid="button-global-admin-login"
              >
                {loginMutation.isPending ? "Authenticating..." : "Access Global Portal"}
              </Button>
            </form>
            
            <div className="mt-6 text-center text-sm text-gray-500">
              <p>Test Credentials:</p>
              <p>Email: global@komarce.com</p>
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
              <div className="w-10 h-10 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-lg flex items-center justify-center">
                <Crown className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">Global Admin Portal</h1>
                <p className="text-sm text-gray-500">KOMARCE Global Administration</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              <Badge variant="default" className="px-3 py-1">
                <Crown className="w-4 h-4 mr-1" />
                Global Administrator
              </Badge>
              
              <div className="flex items-center space-x-2 text-sm text-gray-600">
                <span>{currentUser?.firstName} {currentUser?.lastName}</span>
              </div>
              
              <Button onClick={handleLogout} variant="outline" size="sm" data-testid="button-global-admin-logout">
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
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="dashboard" data-testid="tab-dashboard">
              <BarChart3 className="w-4 h-4 mr-2" />
              Dashboard
            </TabsTrigger>
            <TabsTrigger value="add-points" data-testid="tab-add-points">
              <Plus className="w-4 h-4 mr-2" />
              Add Points
            </TabsTrigger>
            <TabsTrigger value="distribute" data-testid="tab-distribute">
              <DollarSign className="w-4 h-4 mr-2" />
              Distribute Points
            </TabsTrigger>
            <TabsTrigger value="chat" data-testid="tab-chat">
              <MessageCircle className="w-4 h-4 mr-2" />
              Chat
            </TabsTrigger>
          </TabsList>

          {/* Dashboard Tab */}
          <TabsContent value="dashboard" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Points Balance</p>
                      <p className="text-3xl font-bold text-blue-600">
                        {isDashboardLoading ? "..." : (dashboardData?.overview?.globalPointsBalance?.toLocaleString() || 0)}
                      </p>
                    </div>
                    <Coins className="w-8 h-8 text-blue-500" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Total Merchants</p>
                      <p className="text-3xl font-bold text-green-600">
                        {isDashboardLoading ? "..." : (dashboardData?.overview?.totalMerchants || 0)}
                      </p>
                    </div>
                    <Star className="w-8 h-8 text-green-500" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Total Customers</p>
                      <p className="text-3xl font-bold text-purple-600">
                        {isDashboardLoading ? "..." : (dashboardData?.overview?.totalCustomers || 0)}
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
                      <p className="text-sm font-medium text-gray-600">Total Sales</p>
                      <p className="text-3xl font-bold text-orange-600">
                        ${isDashboardLoading ? "..." : (dashboardData?.overview?.totalSales || "0.00")}
                      </p>
                    </div>
                    <TrendingUp className="w-8 h-8 text-orange-500" />
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Add Points Tab */}
          <TabsContent value="add-points" className="space-y-6">
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
                      className="w-full"
                      data-testid="button-add-points"
                    >
                      {addPointsMutation.isPending ? "Adding Points..." : "Add Points to System"}
                    </Button>
                  </div>

                  <div className="space-y-4">
                    <div className="bg-green-50 border border-green-200 p-4 rounded-lg">
                      <h4 className="font-semibold text-green-800 mb-2">Current Balance</h4>
                      <p className="text-2xl font-bold text-green-600">
                        {dashboardData?.overview?.globalPointsBalance?.toLocaleString() || 0} Points
                      </p>
                      <p className="text-sm text-green-600 mt-1">Available for distribution</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Distribute Points Tab */}
          <TabsContent value="distribute" className="space-y-6">
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
                          {localAdmins?.filter((admin: any) => admin.role === 'local_admin')
                            .map((admin: any) => (
                            <SelectItem key={admin.id} value={admin.userId}>
                              {admin.firstName} {admin.lastName} ({admin.country})
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
                        {dashboardData?.overview?.globalPointsBalance?.toLocaleString() || 0} Points
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Chat Tab */}
          <TabsContent value="chat" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <MessageCircle className="w-5 h-5 mr-2" />
                  Global Admin Chat
                </CardTitle>
                <CardDescription>
                  Communicate with local administrators across all regions
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-96 flex items-center justify-center text-gray-500">
                  Chat functionality will be implemented here
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}