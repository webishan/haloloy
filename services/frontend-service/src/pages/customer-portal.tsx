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
import { 
  User, LogOut, TrendingUp, Star, DollarSign, BarChart3, MessageCircle, Gift,
  Coins, ShoppingBag, Award, QrCode, Trophy, Heart
} from "lucide-react";
import SecureChat from "@/components/SecureChat";
import QRTransferComponent from "@/components/QRTransferComponent";

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
    select: (data: any) => data || {}
  });

  // Customer profile query
  const { data: customerProfile, isLoading: profileLoading } = useQuery({
    queryKey: ['/api/customer/profile', currentUser?.id],
    enabled: isAuthenticated && !!currentUser,
    select: (data: any) => data || {}
  });

  // Transaction history query
  const { data: transactions = [], isLoading: transactionsLoading } = useQuery({
    queryKey: ['/api/customer/transactions', currentUser?.id],
    enabled: isAuthenticated && !!currentUser,
    select: (data: any) => Array.isArray(data) ? data : []
  });

  // Reward numbers query
  const { data: rewardNumbers = [], isLoading: rewardNumbersLoading } = useQuery({
    queryKey: ['/api/customer/reward-numbers', currentUser?.id],
    enabled: isAuthenticated && !!currentUser,
    select: (data: any) => Array.isArray(data) ? data : []
  });

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
      <div className="min-h-screen bg-gradient-to-br from-pink-50 via-rose-50 to-purple-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-lg shadow-2xl border-0">
          <CardHeader className="text-center bg-gradient-to-r from-pink-600 to-rose-600 text-white rounded-t-lg">
            <div className="w-20 h-20 bg-white/20 backdrop-blur-sm rounded-full mx-auto mb-4 flex items-center justify-center">
              <User className="w-10 h-10 text-white" />
            </div>
            <CardTitle className="text-3xl font-bold">Customer Portal</CardTitle>
            <p className="text-pink-100">KOMARCE Loyalty Dashboard</p>
          </CardHeader>
          <CardContent className="p-8">
            <form onSubmit={handleLogin} className="space-y-6">
              <div>
                <Label htmlFor="customer-email" className="text-sm font-semibold text-gray-700">Email Address</Label>
                <Input
                  id="customer-email"
                  type="email"
                  value={loginForm.email}
                  onChange={(e) => setLoginForm({...loginForm, email: e.target.value})}
                  placeholder="customer1@bd.komarce.com"
                  className="mt-2 h-12"
                  required
                  data-testid="input-customer-email"
                />
              </div>
              
              <div>
                <Label htmlFor="customer-password" className="text-sm font-semibold text-gray-700">Password</Label>
                <Input
                  id="customer-password"
                  type="password"
                  value={loginForm.password}
                  onChange={(e) => setLoginForm({...loginForm, password: e.target.value})}
                  placeholder="Enter your password"
                  className="mt-2 h-12"
                  required
                  data-testid="input-customer-password"
                />
              </div>

              <Button 
                type="submit" 
                className="w-full h-12 bg-gradient-to-r from-pink-600 to-rose-600 hover:from-pink-700 hover:to-rose-700 text-white font-semibold text-lg"
                disabled={loginMutation.isPending}
                data-testid="button-customer-login"
              >
                {loginMutation.isPending ? "Authenticating..." : "Access Customer Portal"}
              </Button>
            </form>
            
            <div className="mt-6 text-center text-sm text-gray-500">
              <p>Test Credentials:</p>
              <p>customer1@bd.komarce.com / customer123</p>
              <p>customer2@my.komarce.com / customer123</p>
              <p>customer3@ae.komarce.com / customer123</p>
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
              <div className="w-10 h-10 bg-gradient-to-r from-pink-600 to-rose-600 rounded-lg flex items-center justify-center">
                <User className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">Customer Portal</h1>
                <p className="text-sm text-gray-500">
                  {getCountryFlag(currentUser?.country || '')} Loyalty Member Dashboard
                </p>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              {customerProfile && (customerProfile as any).currentTier && (
                <Badge className={getTierColor((customerProfile as any).currentTier || 'bronze')}>
                  <Star className="w-4 h-4 mr-1" />
                  {((customerProfile as any).currentTier || 'bronze').toUpperCase()} MEMBER
                </Badge>
              )}
              
              <div className="flex items-center space-x-2 text-sm text-gray-600">
                <span>{currentUser?.firstName} {currentUser?.lastName}</span>
              </div>
              
              <Button onClick={handleLogout} variant="outline" size="sm" data-testid="button-customer-logout">
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
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="dashboard" data-testid="tab-dashboard">
              <BarChart3 className="w-4 h-4 mr-2" />
              Dashboard
            </TabsTrigger>
            <TabsTrigger value="rewards" data-testid="tab-rewards">
              <Trophy className="w-4 h-4 mr-2" />
              Reward Numbers
            </TabsTrigger>
            <TabsTrigger value="transactions" data-testid="tab-transactions">
              <DollarSign className="w-4 h-4 mr-2" />
              Transactions
            </TabsTrigger>
            <TabsTrigger value="qr-transfer" data-testid="tab-qr-transfer">
              <QrCode className="w-4 h-4 mr-2" />
              QR Transfer
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
                      <p className="text-sm font-medium text-gray-600">Total Points</p>
                      <p className="text-3xl font-bold text-pink-600">
                        {isDashboardLoading ? "..." : ((dashboardData as any)?.totalPoints?.toLocaleString() || 0)}
                      </p>
                    </div>
                    <Coins className="w-8 h-8 text-pink-500" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Accumulated Points</p>
                      <p className="text-3xl font-bold text-purple-600">
                        {isDashboardLoading ? "..." : ((dashboardData as any)?.accumulatedPoints?.toLocaleString() || 0)}
                      </p>
                    </div>
                    <TrendingUp className="w-8 h-8 text-purple-500" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Reward Numbers</p>
                      <p className="text-3xl font-bold text-blue-600">
                        {isDashboardLoading ? "..." : ((dashboardData as any)?.rewardNumbers || 0)}
                      </p>
                    </div>
                    <Trophy className="w-8 h-8 text-blue-500" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Total Orders</p>
                      <p className="text-3xl font-bold text-green-600">
                        {isDashboardLoading ? "..." : ((dashboardData as any)?.totalOrders || 0)}
                      </p>
                    </div>
                    <ShoppingBag className="w-8 h-8 text-green-500" />
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Member Profile */}
            {customerProfile && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <User className="w-5 h-5 mr-2 text-pink-600" />
                    Member Profile
                  </CardTitle>
                  <CardDescription>Your loyalty membership information and tier status</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Member Since</p>
                      <p className="text-lg font-semibold text-gray-900">
                        {new Date(currentUser?.createdAt || '').toLocaleDateString()}
                      </p>
                    </div>
                    
                    <div>
                      <p className="text-sm font-medium text-gray-600">Current Tier</p>
                      <Badge className={getTierColor(customerProfile.currentTier || 'bronze')}>
                        {(customerProfile.currentTier || 'bronze').toUpperCase()}
                      </Badge>
                    </div>
                    
                    <div>
                      <p className="text-sm font-medium text-gray-600">Points Balance</p>
                      <p className="text-lg font-semibold text-pink-600">
                        {customerProfile.totalPoints?.toLocaleString()} points
                      </p>
                    </div>
                    
                    <div>
                      <p className="text-sm font-medium text-gray-600">Lifetime Points</p>
                      <p className="text-lg font-semibold text-purple-600">
                        {customerProfile.accumulatedPoints?.toLocaleString()} points
                      </p>
                    </div>
                    
                    <div>
                      <p className="text-sm font-medium text-gray-600">Global Reward Numbers</p>
                      <p className="text-lg font-semibold text-blue-600">
                        {customerProfile.globalRewardNumbers || 0}
                      </p>
                    </div>
                    
                    <div>
                      <p className="text-sm font-medium text-gray-600">Local Reward Numbers</p>
                      <p className="text-lg font-semibold text-green-600">
                        {customerProfile.localRewardNumbers || 0}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Tier Progress */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Award className="w-5 h-5 mr-2 text-yellow-600" />
                  Tier Progression
                </CardTitle>
                <CardDescription>Your progress towards the next tier level</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between text-sm">
                    <span>Current: {(customerProfile?.currentTier || 'bronze').toUpperCase()}</span>
                    <span>Next: {customerProfile?.currentTier === 'gold' ? 'MAX TIER' : customerProfile?.currentTier === 'silver' ? 'GOLD' : 'SILVER'}</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-3">
                    <div 
                      className="bg-gradient-to-r from-yellow-400 to-yellow-600 h-3 rounded-full transition-all duration-300"
                      style={{ 
                        width: `${Math.min(100, ((customerProfile?.accumulatedPoints || 0) / 5000) * 100)}%` 
                      }}
                    ></div>
                  </div>
                  <p className="text-sm text-gray-600">
                    {5000 - (customerProfile?.accumulatedPoints || 0) > 0 
                      ? `${(5000 - (customerProfile?.accumulatedPoints || 0)).toLocaleString()} points to next tier`
                      : 'Congratulations! You\'ve reached the maximum tier.'}
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Reward Numbers Tab */}
          <TabsContent value="rewards" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>StepUp Reward Numbers</CardTitle>
                <CardDescription>Your active reward numbers and their completion status</CardDescription>
              </CardHeader>
              <CardContent>
                {rewardNumbersLoading ? (
                  <div className="text-center py-8">Loading reward numbers...</div>
                ) : rewardNumbers.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <Trophy className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                    <p>No reward numbers yet. Start shopping to earn your first StepUp reward!</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {rewardNumbers.map((reward: any) => (
                      <Card key={reward.id} className="border-2">
                        <CardHeader className="pb-3">
                          <div className="flex items-center justify-between">
                            <Badge className={reward.type === 'global' ? 'bg-blue-100 text-blue-800' : 'bg-green-100 text-green-800'}>
                              {reward.type.toUpperCase()}
                            </Badge>
                            <Badge variant="outline">
                              #{reward.rewardNumber}
                            </Badge>
                          </div>
                        </CardHeader>
                        <CardContent className="space-y-3">
                          <div>
                            <p className="text-sm text-gray-600">Serial Number</p>
                            <p className="font-mono text-sm">{reward.serialNumber}</p>
                          </div>
                          
                          <div className="grid grid-cols-3 gap-2 text-center">
                            <div className={`p-2 rounded ${reward.tier1Status === 'completed' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'}`}>
                              <p className="text-xs">Tier 1</p>
                              <p className="font-bold">{reward.tier1Amount || 0}</p>
                            </div>
                            <div className={`p-2 rounded ${reward.tier2Status === 'completed' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'}`}>
                              <p className="text-xs">Tier 2</p>
                              <p className="font-bold">{reward.tier2Amount || 0}</p>
                            </div>
                            <div className={`p-2 rounded ${reward.tier3Status === 'completed' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'}`}>
                              <p className="text-xs">Tier 3</p>
                              <p className="font-bold">{reward.tier3Amount || 0}</p>
                            </div>
                          </div>
                          
                          <div className="text-center">
                            {reward.completedAt ? (
                              <Badge className="bg-green-100 text-green-800">
                                <Trophy className="w-3 h-3 mr-1" />
                                Completed
                              </Badge>
                            ) : (
                              <Badge variant="secondary">In Progress</Badge>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
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