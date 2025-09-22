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
  Store, LogOut, TrendingUp, Users, DollarSign, BarChart3, MessageCircle, Settings,
  Coins, ShoppingBag, Star, Award, QrCode, Gift
} from "lucide-react";
import SecureChat from "@/components/SecureChat";
import QRTransferComponent from "@/components/QRTransferComponent";

interface MerchantUser {
  id: string;
  username: string;
  email: string;
  firstName: string;
  lastName: string;
  role: 'merchant';
  country: string;
  isActive: boolean;
  createdAt: string;
}

export default function MerchantPortal() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [currentUser, setCurrentUser] = useState<MerchantUser | null>(null);
  const [activeTab, setActiveTab] = useState("dashboard");
  
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Login form state
  const [loginForm, setLoginForm] = useState({
    email: "",
    password: ""
  });

  // Points distribution form
  const [distributeForm, setDistributeForm] = useState({
    customerId: "",
    points: "",
    transactionType: "cashback",
    description: ""
  });

  // Check authentication on mount
  useEffect(() => {
    const token = localStorage.getItem('merchantToken');
    const user = localStorage.getItem('merchantUser');
    
    if (token && user) {
      setIsAuthenticated(true);
      setCurrentUser(JSON.parse(user));
    }
  }, []);

  // Login mutation
  const loginMutation = useMutation({
    mutationFn: async (credentials: { email: string; password: string; role: string }) => {
      const response = await fetch('/api/merchant/login', {
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
      localStorage.setItem('merchantToken', data.token);
      localStorage.setItem('merchantUser', JSON.stringify(data.user));
      setIsAuthenticated(true);
      setCurrentUser(data.user);
      toast({ title: "Welcome!", description: "Successfully logged into Merchant Portal" });
    },
    onError: (error: Error) => {
      toast({ title: "Login Failed", description: error.message, variant: "destructive" });
    }
  });

  // Dashboard data query
  const { data: dashboardData, isLoading: isDashboardLoading } = useQuery({
    queryKey: ['/api/merchant/dashboard', currentUser?.id],
    enabled: isAuthenticated && !!currentUser,
    select: (data: any) => data || {}
  });

  // Merchant profile query
  const { data: merchantProfile, isLoading: profileLoading } = useQuery({
    queryKey: ['/api/merchant/profile', currentUser?.id],
    enabled: isAuthenticated && !!currentUser,
    select: (data: any) => data || {}
  });

  // Customer transactions query
  const { data: transactions = [], isLoading: transactionsLoading } = useQuery({
    queryKey: ['/api/merchant/transactions', currentUser?.id],
    enabled: isAuthenticated && !!currentUser,
    select: (data: any) => Array.isArray(data) ? data : []
  });

  // Points distribution mutation
  const distributePointsMutation = useMutation({
    mutationFn: async (data: { customerId: string; points: number; transactionType: string; description: string }) => {
      const response = await fetch('/api/merchant/distribute-points', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('merchantToken')}`
        },
        body: JSON.stringify(data)
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Point distribution failed');
      }
      
      return response.json();
    },
    onSuccess: () => {
      toast({ title: "Points Distributed", description: "Points have been distributed to customer successfully!" });
      queryClient.invalidateQueries({ queryKey: ['/api/merchant/dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['/api/merchant/transactions'] });
      setDistributeForm({ customerId: "", points: "", transactionType: "cashback", description: "" });
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
    
    // Development testing bypass - works immediately
    if (loginForm.password === 'merchant123') {
      const mockUser = {
        id: '1',
        username: loginForm.email.split('@')[0],
        email: loginForm.email,
        firstName: 'Test',
        lastName: 'Merchant',
        role: 'merchant',
        country: 'BD'
      };
      const mockToken = 'dev-token-' + Date.now();
      
      localStorage.setItem('merchantToken', mockToken);
      localStorage.setItem('merchantUser', JSON.stringify(mockUser));
      setIsAuthenticated(true);
      setCurrentUser(mockUser);
      toast({ title: "Welcome!", description: "Successfully logged into Merchant Portal" });
      return;
    }
    
    loginMutation.mutate({ ...loginForm, role: 'merchant' });
  };

  const handleLogout = () => {
    localStorage.removeItem('merchantToken');
    localStorage.removeItem('merchantUser');
    setIsAuthenticated(false);
    setCurrentUser(null);
    setActiveTab("dashboard");
    toast({ title: "Logged Out", description: "You have been logged out successfully." });
  };

  const handleDistributePoints = () => {
    if (!distributeForm.customerId || !distributeForm.points || !distributeForm.description) {
      toast({ title: "Error", description: "Please fill in all fields", variant: "destructive" });
      return;
    }
    
    distributePointsMutation.mutate({
      customerId: distributeForm.customerId,
      points: parseInt(distributeForm.points),
      transactionType: distributeForm.transactionType,
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

  const getTierColor = (tier: string) => {
    return tier === 'gold' ? 'bg-yellow-100 text-yellow-800' :
           tier === 'silver' ? 'bg-gray-100 text-gray-800' :
           'bg-orange-100 text-orange-800';
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-lg shadow-2xl border-0">
          <CardHeader className="text-center bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-t-lg">
            <div className="w-20 h-20 bg-white/20 backdrop-blur-sm rounded-full mx-auto mb-4 flex items-center justify-center">
              <Store className="w-10 h-10 text-white" />
            </div>
            <CardTitle className="text-3xl font-bold">Merchant Portal</CardTitle>
            <p className="text-blue-100">KOMARCE Business Dashboard</p>
          </CardHeader>
          <CardContent className="p-8">
            <form onSubmit={handleLogin} className="space-y-6">
              <div>
                <Label htmlFor="merchant-email" className="text-sm font-semibold text-gray-700">Email Address</Label>
                <Input
                  id="merchant-email"
                  type="email"
                  value={loginForm.email}
                  onChange={(e) => setLoginForm({...loginForm, email: e.target.value})}
                  placeholder="merchant1@bd.komarce.com"
                  className="mt-2 h-12"
                  required
                  data-testid="input-merchant-email"
                />
              </div>
              
              <div>
                <Label htmlFor="merchant-password" className="text-sm font-semibold text-gray-700">Password</Label>
                <Input
                  id="merchant-password"
                  type="password"
                  value={loginForm.password}
                  onChange={(e) => setLoginForm({...loginForm, password: e.target.value})}
                  placeholder="Enter your password"
                  className="mt-2 h-12"
                  required
                  data-testid="input-merchant-password"
                />
              </div>

              <Button 
                type="submit" 
                className="w-full h-12 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-semibold text-lg"
                disabled={loginMutation.isPending}
                data-testid="button-merchant-login"
              >
                {loginMutation.isPending ? "Authenticating..." : "Access Merchant Portal"}
              </Button>
            </form>
            
            <div className="mt-6 text-center text-sm text-gray-500">
              <p>Test Credentials:</p>
              <p>merchant1@bd.komarce.com / merchant123</p>
              <p>merchant2@my.komarce.com / merchant123</p>
              <p>merchant3@ae.komarce.com / merchant123</p>
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
                <Store className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">Merchant Portal</h1>
                <p className="text-sm text-gray-500">
                  {getCountryFlag(currentUser?.country || '')} {(merchantProfile as any)?.businessName || 'Your Business'}
                </p>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              {merchantProfile && (merchantProfile as any).tier && (
                <Badge className={getTierColor((merchantProfile as any).tier)}>
                  <Award className="w-4 h-4 mr-1" />
                  {(merchantProfile as any).tier.toUpperCase()} TIER
                </Badge>
              )}
              
              <div className="flex items-center space-x-2 text-sm text-gray-600">
                <span>{currentUser?.firstName} {currentUser?.lastName}</span>
              </div>
              
              <Button onClick={handleLogout} variant="outline" size="sm" data-testid="button-merchant-logout">
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
            <TabsTrigger value="customers" data-testid="tab-customers">
              <Users className="w-4 h-4 mr-2" />
              Customers
            </TabsTrigger>
            <TabsTrigger value="distribute" data-testid="tab-distribute">
              <Gift className="w-4 h-4 mr-2" />
              Distribute Points
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
                      <p className="text-sm font-medium text-gray-600">Points Balance</p>
                      <p className="text-3xl font-bold text-blue-600">
                        {isDashboardLoading ? "..." : ((dashboardData as any)?.availablePoints?.toLocaleString() || 0)}
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
                      <p className="text-sm font-medium text-gray-600">Total Customers</p>
                      <p className="text-3xl font-bold text-green-600">
                        {isDashboardLoading ? "..." : ((dashboardData as any)?.totalCustomers || 0)}
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
                        {isDashboardLoading ? "..." : ((dashboardData as any)?.totalPointsDistributed?.toLocaleString() || 0)}
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
                      <p className="text-sm font-medium text-gray-600">This Month Sales</p>
                      <p className="text-3xl font-bold text-orange-600">
                        ${isDashboardLoading ? "..." : (dashboardData?.monthlySales?.toLocaleString() || 0)}
                      </p>
                    </div>
                    <ShoppingBag className="w-8 h-8 text-orange-500" />
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Business Profile */}
            {merchantProfile && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Store className="w-5 h-5 mr-2 text-blue-600" />
                    Business Profile
                  </CardTitle>
                  <CardDescription>Your merchant account information and tier status</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Business Name</p>
                      <p className="text-lg font-semibold text-gray-900">{merchantProfile.businessName}</p>
                    </div>
                    
                    <div>
                      <p className="text-sm font-medium text-gray-600">Business Type</p>
                      <p className="text-lg font-semibold text-gray-900">{merchantProfile.businessType}</p>
                    </div>
                    
                    <div>
                      <p className="text-sm font-medium text-gray-600">Merchant Tier</p>
                      <Badge className={getTierColor(merchantProfile.tier)}>
                        {merchantProfile.tier.toUpperCase()}
                      </Badge>
                    </div>
                    
                    <div>
                      <p className="text-sm font-medium text-gray-600">Points Available</p>
                      <p className="text-lg font-semibold text-blue-600">
                        {merchantProfile.availablePoints?.toLocaleString()} points
                      </p>
                    </div>
                    
                    <div>
                      <p className="text-sm font-medium text-gray-600">Total Distributed</p>
                      <p className="text-lg font-semibold text-green-600">
                        {merchantProfile.totalPointsDistributed?.toLocaleString()} points
                      </p>
                    </div>
                    
                    <div>
                      <p className="text-sm font-medium text-gray-600">Account Status</p>
                      <Badge className="bg-green-100 text-green-800">Active</Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Customers Tab */}
          <TabsContent value="customers" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Customer Transactions</CardTitle>
                <CardDescription>Recent point distributions to customers</CardDescription>
              </CardHeader>
              <CardContent>
                {transactionsLoading ? (
                  <div className="text-center py-8">Loading transactions...</div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead>Customer</TableHead>
                        <TableHead>Points</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Description</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {transactions.slice(0, 20).map((transaction: any) => (
                        <TableRow key={transaction.id}>
                          <TableCell>{new Date(transaction.createdAt).toLocaleDateString()}</TableCell>
                          <TableCell>{transaction.customerName || 'Customer'}</TableCell>
                          <TableCell className="font-medium text-blue-600">
                            +{transaction.points}
                          </TableCell>
                          <TableCell>
                            <Badge variant="secondary">
                              {transaction.transactionType.replace('_', ' ')}
                            </Badge>
                          </TableCell>
                          <TableCell>{transaction.description}</TableCell>
                          <TableCell>
                            <Badge className="bg-green-100 text-green-800">Completed</Badge>
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
                  <Gift className="w-5 h-5 mr-2 text-blue-600" />
                  Distribute Points to Customers
                </CardTitle>
                <CardDescription>
                  Reward your customers with loyalty points for purchases and engagement
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="customer-id">Customer ID or Email</Label>
                      <Input
                        id="customer-id"
                        placeholder="Enter customer ID or email"
                        value={distributeForm.customerId}
                        onChange={(e) => setDistributeForm(prev => ({ ...prev, customerId: e.target.value }))}
                        data-testid="input-customer-id"
                      />
                    </div>

                    <div>
                      <Label htmlFor="merchant-distribute-points">Points Amount</Label>
                      <Input
                        id="merchant-distribute-points"
                        type="number"
                        placeholder="Enter points amount"
                        value={distributeForm.points}
                        onChange={(e) => setDistributeForm(prev => ({ ...prev, points: e.target.value }))}
                        min="1"
                        data-testid="input-merchant-distribute-points"
                      />
                    </div>

                    <div>
                      <Label htmlFor="transaction-type">Transaction Type</Label>
                      <select
                        id="transaction-type"
                        value={distributeForm.transactionType}
                        onChange={(e) => setDistributeForm(prev => ({ ...prev, transactionType: e.target.value }))}
                        className="w-full h-10 px-3 rounded-md border border-gray-300 bg-white"
                        data-testid="select-transaction-type"
                      >
                        <option value="cashback">Purchase Cashback</option>
                        <option value="referral_commission">Referral Bonus</option>
                        <option value="admin_manual">Manual Bonus</option>
                      </select>
                    </div>

                    <div>
                      <Label htmlFor="merchant-distribute-description">Description</Label>
                      <Input
                        id="merchant-distribute-description"
                        placeholder="Reason for points distribution"
                        value={distributeForm.description}
                        onChange={(e) => setDistributeForm(prev => ({ ...prev, description: e.target.value }))}
                        data-testid="input-merchant-distribute-description"
                      />
                    </div>

                    <Button
                      onClick={handleDistributePoints}
                      disabled={distributePointsMutation.isPending || !distributeForm.customerId || !distributeForm.points || !distributeForm.description}
                      className="w-full"
                      data-testid="button-merchant-distribute-points"
                    >
                      {distributePointsMutation.isPending ? "Distributing..." : "Distribute Points"}
                    </Button>
                  </div>

                  <div className="space-y-4">
                    <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg">
                      <h4 className="font-semibold text-blue-800 mb-2">Available Points</h4>
                      <p className="text-2xl font-bold text-blue-600">
                        {merchantProfile?.availablePoints?.toLocaleString() || 0} Points
                      </p>
                      <p className="text-sm text-blue-600 mt-1">Current balance</p>
                    </div>

                    <div className="bg-green-50 border border-green-200 p-4 rounded-lg">
                      <h4 className="font-semibold text-green-800 mb-2">Distribution Guidelines</h4>
                      <ul className="text-sm text-green-700 space-y-1">
                        <li>• Cashback: 1-15% of purchase amount</li>
                        <li>• Referral Bonus: Fixed amount for successful referrals</li>
                        <li>• Manual Bonus: Discretionary rewards</li>
                        <li>• Points are distributed instantly</li>
                      </ul>
                    </div>
                  </div>
                </div>
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
                  Merchant Secure Chat
                </CardTitle>
                <CardDescription>
                  Communicate with local administrators and customers
                </CardDescription>
              </CardHeader>
              <CardContent>
                {currentUser && (
                  <SecureChat 
                    currentUser={{
                      id: currentUser.id,
                      name: `${currentUser.firstName} ${currentUser.lastName}`,
                      role: currentUser.role,
                      token: localStorage.getItem('merchantToken') || ''
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