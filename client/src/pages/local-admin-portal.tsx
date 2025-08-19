import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { 
  Shield, MapPin, LogOut, Users, DollarSign, BarChart3, Star, MessageCircle,
  TrendingUp, Coins, Send
} from "lucide-react";
import io from "socket.io-client";

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
  const [socket, setSocket] = useState<any>(null);
  
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Login form state
  const [loginForm, setLoginForm] = useState({
    email: "",
    password: ""
  });

  // Points form state
  const [distributePointsForm, setDistributePointsForm] = useState({
    toUserId: "",
    points: "",
    description: ""
  });

  // Check authentication on mount
  useEffect(() => {
    const token = localStorage.getItem('localAdminToken');
    const user = localStorage.getItem('localAdminUser');
    if (token && user) {
      const userData = JSON.parse(user);
      if (userData.role === 'local_admin') {
        setIsAuthenticated(true);
        setCurrentUser(userData);
      }
    }
  }, []);

  // Login mutation for local admin
  const loginMutation = useMutation({
    mutationFn: async (credentials: { email: string; password: string }) => {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...credentials, userType: 'local_admin' })
      });
      
      if (!response.ok) {
        const error = await response.text();
        throw new Error(error);
      }
      
      return response.json();
    },
    onSuccess: (data) => {
      if (data.user.role === 'local_admin') {
        localStorage.setItem('localAdminToken', data.token);
        localStorage.setItem('localAdminUser', JSON.stringify(data.user));
        setIsAuthenticated(true);
        setCurrentUser(data.user);
        toast({ title: "Login Successful", description: "Welcome to Local Admin Portal!" });
      } else {
        throw new Error("Access denied. Local admin role required.");
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

  const { data: merchants } = useQuery({
    queryKey: ['/api/admin/merchants'],
    enabled: isAuthenticated,
    retry: false
  });

  // Point distribution mutation to merchants
  const distributePointsMutation = useMutation({
    mutationFn: async (data: { toUserId: string; points: number; description: string }) => {
      const response = await fetch('/api/admin/distribute-points', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('localAdminToken')}`
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
      toast({ title: "Points Distributed", description: "Points have been distributed to merchant successfully!" });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/dashboard'] });
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
    localStorage.removeItem('localAdminToken');
    localStorage.removeItem('localAdminUser');
    setIsAuthenticated(false);
    setCurrentUser(null);
    setActiveTab("dashboard");
    if (socket) {
      socket.disconnect();
      setSocket(null);
    }
    toast({ title: "Logged Out", description: "You have been logged out successfully." });
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
      <div className="min-h-screen bg-gradient-to-br from-green-50 via-teal-50 to-blue-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-lg shadow-2xl border-0">
          <CardHeader className="text-center bg-gradient-to-r from-green-600 to-teal-600 text-white rounded-t-lg">
            <div className="w-20 h-20 bg-white/20 backdrop-blur-sm rounded-full mx-auto mb-4 flex items-center justify-center">
              <MapPin className="w-10 h-10 text-white" />
            </div>
            <CardTitle className="text-3xl font-bold">Local Admin Portal</CardTitle>
            <p className="text-green-100">KOMARCE Regional Administration</p>
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
                  placeholder="local.bd@komarce.com"
                  className="mt-2 h-12"
                  required
                  data-testid="input-local-admin-email"
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
                  data-testid="input-local-admin-password"
                />
              </div>

              <Button 
                type="submit" 
                className="w-full h-12 bg-gradient-to-r from-green-600 to-teal-600 hover:from-green-700 hover:to-teal-700 text-white font-semibold text-lg"
                disabled={loginMutation.isPending}
                data-testid="button-local-admin-login"
              >
                {loginMutation.isPending ? "Authenticating..." : "Access Local Portal"}
              </Button>
            </form>
            
            <div className="mt-6 text-center text-sm text-gray-500">
              <p>Test Credentials:</p>
              <p>Email: local.bd@komarce.com</p>
              <p>Password: local123</p>
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
              <div className="w-10 h-10 bg-gradient-to-r from-green-600 to-teal-600 rounded-lg flex items-center justify-center">
                <MapPin className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">Local Admin Portal</h1>
                <p className="text-sm text-gray-500">KOMARCE {currentUser?.country} Administration</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              <Badge variant="secondary" className="px-3 py-1">
                <MapPin className="w-4 h-4 mr-1" />
                Local Admin - {currentUser?.country}
              </Badge>
              
              <div className="flex items-center space-x-2 text-sm text-gray-600">
                <span>{currentUser?.firstName} {currentUser?.lastName}</span>
              </div>
              
              <Button onClick={handleLogout} variant="outline" size="sm" data-testid="button-local-admin-logout">
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
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="dashboard" data-testid="tab-dashboard">
              <BarChart3 className="w-4 h-4 mr-2" />
              Dashboard
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
                      <p className="text-sm font-medium text-gray-600">My Points Balance</p>
                      <p className="text-3xl font-bold text-blue-600">
                        {isDashboardLoading ? "..." : (dashboardData?.overview?.localPointsBalance?.toLocaleString() || 0)}
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
                      <p className="text-sm font-medium text-gray-600">Local Merchants</p>
                      <p className="text-3xl font-bold text-green-600">
                        {isDashboardLoading ? "..." : (dashboardData?.countrySpecific?.localMerchants || 0)}
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
                      <p className="text-sm font-medium text-gray-600">Local Customers</p>
                      <p className="text-3xl font-bold text-purple-600">
                        {isDashboardLoading ? "..." : (dashboardData?.countrySpecific?.localCustomers || 0)}
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
                      <p className="text-sm font-medium text-gray-600">Local Sales</p>
                      <p className="text-3xl font-bold text-orange-600">
                        ${isDashboardLoading ? "..." : (dashboardData?.countrySpecific?.localSales || "0.00")}
                      </p>
                    </div>
                    <TrendingUp className="w-8 h-8 text-orange-500" />
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Distribute Points Tab */}
          <TabsContent value="distribute" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <DollarSign className="w-5 h-5 mr-2 text-green-600" />
                  Distribute Points to Merchants
                </CardTitle>
                <CardDescription>
                  Transfer points from your local balance to merchants in your region
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="distribute-merchant">Merchant</Label>
                      <Select 
                        value={distributePointsForm.toUserId} 
                        onValueChange={(value) => setDistributePointsForm(prev => ({ ...prev, toUserId: value }))}
                      >
                        <SelectTrigger data-testid="select-merchant">
                          <SelectValue placeholder="Select merchant" />
                        </SelectTrigger>
                        <SelectContent>
                          {merchants?.filter((merchant: any) => merchant.country === currentUser?.country)
                            .map((merchant: any) => (
                            <SelectItem key={merchant.id} value={merchant.userId}>
                              {merchant.businessName} ({merchant.tier})
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
                        {dashboardData?.overview?.localPointsBalance?.toLocaleString() || 0} Points
                      </p>
                      <p className="text-sm text-blue-600 mt-1">Your region: {currentUser?.country}</p>
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
                  Local Admin Chat
                </CardTitle>
                <CardDescription>
                  Communicate with global admin and merchants in your region
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