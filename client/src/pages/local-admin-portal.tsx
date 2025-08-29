import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { 
  Shield, MapPin, LogOut, Users, DollarSign, BarChart3, Store, Settings, MessageCircle,
  TrendingUp, Coins, CheckCircle, Send, Plus, AlertCircle
} from "lucide-react";
import SecureChat from "@/components/SecureChat";

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
  
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Login form state
  const [loginForm, setLoginForm] = useState({
    email: "",
    password: "",
    country: ""
  });

  // Point distribution form
  const [distributeForm, setDistributeForm] = useState({
    merchantId: "",
    points: "",
    description: ""
  });

  // Check authentication on mount
  useEffect(() => {
    const token = localStorage.getItem('localAdminToken');
    const user = localStorage.getItem('localAdminUser');
    
    if (token && user) {
      setIsAuthenticated(true);
      setCurrentUser(JSON.parse(user));
    }
  }, []);

  // Real-time balance from database API
  const { data: adminBalance, refetch: refetchBalance } = useQuery({
    queryKey: ['/api/admin/balance'],
    enabled: isAuthenticated,
    refetchInterval: 5000, // Poll every 5 seconds for real-time updates
    retry: false
  });

  // Get current user's country dashboard data  
  const { data: localDashboard, isLoading: isDashboardLoading } = useQuery({
    queryKey: ['/api/admin/local-dashboard', currentUser?.country],
    enabled: isAuthenticated && !!currentUser?.country,
    refetchInterval: 30000, // Refresh every 30 seconds
    retry: false
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
      queryClient.invalidateQueries({ queryKey: ['/api/admin/local-dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/merchants'] });
      refetchBalance(); // Force immediate balance update
      setDistributeForm({ merchantId: "", points: "", description: "" });
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
    loginMutation.mutate({ ...loginForm, adminType: 'local' });
  };

  const handleLogout = () => {
    localStorage.removeItem('localAdminToken');
    localStorage.removeItem('localAdminUser');
    setIsAuthenticated(false);
    setCurrentUser(null);
    setActiveTab("dashboard");
    toast({ title: "Logged Out", description: "You have been logged out successfully." });
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

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 via-emerald-50 to-teal-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-lg shadow-2xl border-0">
          <CardHeader className="text-center bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-t-lg">
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
                  placeholder="bd@komarce.com"
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
                className="w-full h-12 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white font-semibold text-lg"
                disabled={loginMutation.isPending}
                data-testid="button-local-admin-login"
              >
                {loginMutation.isPending ? "Authenticating..." : "Access Local Portal"}
              </Button>
            </form>
            
            <div className="mt-6 text-center text-sm text-gray-500">
              <p className="font-semibold mb-2">Available Local Admin Portals:</p>
              <div className="space-y-1">
                <p>🇧🇩 Bangladesh: bd@komarce.com / local123</p>
                <p>🇲🇾 Malaysia: my@komarce.com / local123</p>
                <p>🇦🇪 UAE: ae@komarce.com / local123</p>
                <p>🇵🇭 Philippines: ph@komarce.com / local123</p>
              </div>
              <p className="text-xs mt-3 text-green-600">
                💡 Use logout button to switch between regional portals
              </p>
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
              <div className="w-10 h-10 bg-gradient-to-r from-green-600 to-emerald-600 rounded-lg flex items-center justify-center">
                <MapPin className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">Local Admin Portal</h1>
                <p className="text-sm text-gray-500">
                  {getCountryFlag(currentUser?.country || '')} {getCountryName(currentUser?.country || '')}
                </p>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              <Badge variant="default" className="px-3 py-1">
                <Shield className="w-4 h-4 mr-1" />
                Local Administrator
              </Badge>
              
              <div className="flex items-center space-x-2 text-sm text-gray-600">
                <span>{currentUser?.firstName} {currentUser?.lastName}</span>
              </div>
              
              <Button 
                onClick={handleLogout} 
                variant="destructive" 
                size="sm" 
                className="bg-red-600 hover:bg-red-700 text-white border-red-600"
                data-testid="button-local-admin-logout"
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
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="dashboard" data-testid="tab-dashboard">
              <BarChart3 className="w-4 h-4 mr-2" />
              Dashboard
            </TabsTrigger>
            <TabsTrigger value="merchants" data-testid="tab-merchants">
              <Store className="w-4 h-4 mr-2" />
              Merchants
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
                        {localDashboard?.activeMerchants || 0}
                      </p>
                    </div>
                    <Store className="w-8 h-8 text-blue-500" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Total Customers</p>
                      <p className="text-3xl font-bold text-purple-600">
                        {localDashboard?.totalCustomers || 0}
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
                        {localDashboard?.pointsDistributed?.toLocaleString() || 0}
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
          </TabsContent>

          {/* Merchants Tab */}
          <TabsContent value="merchants" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Regional Merchants</CardTitle>
                <CardDescription>
                  Merchants operating in {getCountryName(currentUser?.country || '')}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {merchantsLoading ? (
                  <div className="text-center py-8">Loading merchants...</div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Business Name</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Tier</TableHead>
                        <TableHead>Points Balance</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {merchants.map((merchant: any) => (
                        <TableRow key={merchant.id}>
                          <TableCell className="font-medium">{merchant.businessName}</TableCell>
                          <TableCell>{merchant.businessType}</TableCell>
                          <TableCell>
                            <Badge className={
                              merchant.tier === 'gold' ? 'bg-yellow-100 text-yellow-800' :
                              merchant.tier === 'silver' ? 'bg-gray-100 text-gray-800' :
                              'bg-orange-100 text-orange-800'
                            }>
                              {merchant.tier}
                            </Badge>
                          </TableCell>
                          <TableCell>{merchant.availablePoints?.toLocaleString() || 0}</TableCell>
                          <TableCell>
                            <Badge className="bg-green-100 text-green-800">Active</Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Distribute Points Tab */}
          <TabsContent value="distribute" className="space-y-6">
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
          </TabsContent>

          {/* Chat Tab */}
          <TabsContent value="chat" className="space-y-6">
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
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}