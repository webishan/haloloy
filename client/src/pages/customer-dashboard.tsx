import { useQuery } from '@tanstack/react-query';
import { Link } from 'wouter';
import { useAuth } from '@/hooks/use-auth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import RewardProgress from '@/components/reward-progress';
import { 
  LayoutDashboard, ShoppingBag, Coins, Heart, Settings, 
  Package, DollarSign, Award, TrendingUp, Star, Calendar
} from 'lucide-react';

export default function CustomerDashboard() {
  const { user, profile } = useAuth();

  const { data: dashboardData, isLoading } = useQuery({
    queryKey: ['/api/dashboard/customer'],
    enabled: !!user && user.role === 'customer'
  });

  const { data: orders = [] } = useQuery({
    queryKey: ['/api/orders'],
    enabled: !!user && user.role === 'customer'
  });

  const { data: rewardTransactions = [] } = useQuery({
    queryKey: ['/api/rewards/transactions'],
    enabled: !!user && user.role === 'customer'
  });

  const { data: rewardNumbers } = useQuery({
    queryKey: ['/api/rewards/numbers'],
    enabled: !!user && user.role === 'customer'
  });

  if (isLoading) {
    return (
      <div className="pt-32 min-h-screen bg-gray-50">
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

  const customer = dashboardData?.customer || profile;
  const recentOrders = dashboardData?.recentOrders || orders.slice(0, 5) || [];

  // Calculate stats
  const totalSavings = recentOrders.reduce((sum: number, order: any) => {
    const orderTotal = parseFloat(order.totalAmount);
    const originalTotal = orderTotal * 1.2; // Assume 20% savings on average
    return sum + (originalTotal - orderTotal);
  }, 0);

  const progressToNextTier = customer ? (customer.accumulatedPoints / 1500) * 100 : 0;
  const pointsToNext = customer ? 1500 - customer.accumulatedPoints : 1500;

  return (
    <div className="pt-32 min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        <div className="grid lg:grid-cols-4 gap-6">
          {/* Sidebar */}
          <div className="lg:col-span-1">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center space-x-3 mb-6">
                  <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center">
                    <span className="text-primary font-bold">
                      {user?.firstName?.charAt(0)}{user?.lastName?.charAt(0)}
                    </span>
                  </div>
                  <div>
                    <h3 className="font-semibold">{user?.firstName} {user?.lastName}</h3>
                    <p className="text-sm text-gray-600">Customer</p>
                  </div>
                </div>

                <nav className="space-y-2">
                  <a href="#" className="flex items-center space-x-3 p-3 bg-primary/10 text-primary rounded-lg">
                    <LayoutDashboard className="w-5 h-5" />
                    <span>Dashboard</span>
                  </a>
                  <a href="#orders" className="flex items-center space-x-3 p-3 text-gray-600 hover:bg-gray-50 rounded-lg transition-colors">
                    <ShoppingBag className="w-5 h-5" />
                    <span>Orders</span>
                  </a>
                  <a href="#rewards" className="flex items-center space-x-3 p-3 text-gray-600 hover:bg-gray-50 rounded-lg transition-colors">
                    <Coins className="w-5 h-5" />
                    <span>Rewards</span>
                  </a>
                  <Link href="/wishlist" className="flex items-center space-x-3 p-3 text-gray-600 hover:bg-gray-50 rounded-lg transition-colors">
                    <Heart className="w-5 h-5" />
                    <span>Wishlist</span>
                  </Link>
                  <a href="#settings" className="flex items-center space-x-3 p-3 text-gray-600 hover:bg-gray-50 rounded-lg transition-colors">
                    <Settings className="w-5 h-5" />
                    <span>Settings</span>
                  </a>
                </nav>
              </CardContent>
            </Card>
          </div>

          {/* Main Content */}
          <div className="lg:col-span-3">
            <div className="mb-8">
              <h1 className="text-3xl font-bold text-gray-900">Welcome back, {user?.firstName}!</h1>
              <p className="text-gray-600">Here's your KOMARCE dashboard overview</p>
            </div>

            <Tabs defaultValue="overview" className="space-y-6">
              <TabsList>
                <TabsTrigger value="overview">Overview</TabsTrigger>
                <TabsTrigger value="orders">Orders</TabsTrigger>
                <TabsTrigger value="rewards">Rewards</TabsTrigger>
                <TabsTrigger value="profile">Profile</TabsTrigger>
              </TabsList>

              <TabsContent value="overview" className="space-y-6">
                {/* Stats Cards */}
                <div className="grid md:grid-cols-4 gap-4">
                  <Card>
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm text-gray-600">Total Points</p>
                          <p className="text-2xl font-bold text-primary">{customer?.totalPoints || 0}</p>
                        </div>
                        <div className="p-3 bg-primary/10 rounded-lg">
                          <Coins className="w-6 h-6 text-primary" />
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm text-gray-600">Current Tier</p>
                          <p className="text-2xl font-bold text-accent">
                            {customer?.currentTier?.replace('_', ' ').toUpperCase() || 'Tier 1'}
                          </p>
                        </div>
                        <div className="p-3 bg-accent/10 rounded-lg">
                          <Award className="w-6 h-6 text-accent" />
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm text-gray-600">Orders</p>
                          <p className="text-2xl font-bold text-blue-600">{customer?.totalOrders || 0}</p>
                        </div>
                        <div className="p-3 bg-blue-100 rounded-lg">
                          <Package className="w-6 h-6 text-blue-600" />
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm text-gray-600">Savings</p>
                          <p className="text-2xl font-bold text-green-600">${totalSavings.toFixed(2)}</p>
                        </div>
                        <div className="p-3 bg-green-100 rounded-lg">
                          <DollarSign className="w-6 h-6 text-green-600" />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Reward Progress */}
                <Card>
                  <CardHeader>
                    <CardTitle>Reward Progress</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">Progress to Next Tier</span>
                        <span className="text-sm text-gray-600">{pointsToNext} points to go</span>
                      </div>
                      <Progress value={progressToNextTier} className="h-3" />
                      <div className="flex justify-between text-sm text-gray-600">
                        <span>Current: {customer?.accumulatedPoints || 0} pts</span>
                        <span>Next Reward: 1,500 pts</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Recent Orders */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                      <span>Recent Orders</span>
                      <Button variant="ghost" size="sm">View All</Button>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {recentOrders.length > 0 ? (
                      <div className="space-y-4">
                        {recentOrders.map((order: any) => (
                          <div key={order.id} className="flex items-center space-x-4 p-4 border rounded-lg">
                            <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center">
                              <Package className="w-6 h-6 text-gray-600" />
                            </div>
                            <div className="flex-1">
                              <h4 className="font-medium">Order #{order.orderNumber}</h4>
                              <p className="text-sm text-gray-600">
                                {new Date(order.createdAt).toLocaleDateString()}
                              </p>
                            </div>
                            <div className="text-right">
                              <p className="font-semibold">${order.totalAmount}</p>
                              <p className="text-sm text-primary">+{order.pointsEarned} pts</p>
                            </div>
                            <Badge variant={
                              order.status === 'delivered' ? 'default' :
                              order.status === 'shipped' ? 'secondary' :
                              order.status === 'confirmed' ? 'outline' : 'destructive'
                            }>
                              {order.status}
                            </Badge>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-8">
                        <Package className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                        <p className="text-gray-500 mb-4">No orders yet</p>
                        <Button asChild>
                          <Link href="/marketplace">Start Shopping</Link>
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="orders">
                <Card>
                  <CardHeader>
                    <CardTitle>Order History</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {orders?.length > 0 ? (
                      <div className="space-y-4">
                        {orders.map((order: any) => (
                          <div key={order.id} className="flex items-center justify-between p-4 border rounded-lg">
                            <div className="flex items-center space-x-4">
                              <Package className="w-8 h-8 text-gray-600" />
                              <div>
                                <h4 className="font-medium">Order #{order.orderNumber}</h4>
                                <p className="text-sm text-gray-600">
                                  {new Date(order.createdAt).toLocaleDateString()}
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center space-x-4">
                              <div className="text-right">
                                <p className="font-semibold">${order.totalAmount}</p>
                                <p className="text-sm text-primary">+{order.pointsEarned} pts</p>
                              </div>
                              <Badge>{order.status}</Badge>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-12">
                        <Package className="w-16 h-16 mx-auto mb-4 text-gray-400" />
                        <h3 className="text-lg font-medium mb-2">No orders found</h3>
                        <p className="text-gray-500 mb-4">You haven't placed any orders yet.</p>
                        <Button asChild>
                          <Link href="/marketplace">Start Shopping</Link>
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="rewards">
                <RewardProgress customer={customer} />
                
                {/* Reward Transactions */}
                <Card>
                  <CardHeader>
                    <CardTitle>Recent Reward Activity</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {rewardTransactions?.length > 0 ? (
                      <div className="space-y-4 max-h-64 overflow-y-auto">
                        {rewardTransactions.slice(0, 10).map((transaction: any) => (
                          <div key={transaction.id} className="flex items-center justify-between p-3 border-l-4 border-primary/20 bg-gray-50 rounded-r-lg">
                            <div className="flex items-center space-x-3">
                              <div className={`p-2 rounded-lg ${
                                transaction.type === 'earn' ? 'bg-green-100' : 
                                transaction.type === 'redeem' ? 'bg-red-100' : 'bg-blue-100'
                              }`}>
                                {transaction.type === 'earn' ? (
                                  <TrendingUp className="w-4 h-4 text-green-600" />
                                ) : transaction.type === 'redeem' ? (
                                  <Coins className="w-4 h-4 text-red-600" />
                                ) : (
                                  <Award className="w-4 h-4 text-blue-600" />
                                )}
                              </div>
                              <div>
                                <p className="font-medium text-sm">{transaction.description || `${transaction.category} ${transaction.type}`}</p>
                                <p className="text-xs text-gray-600">
                                  {new Date(transaction.createdAt).toLocaleDateString()}
                                </p>
                              </div>
                            </div>
                            <span className={`font-semibold ${
                              transaction.type === 'earn' ? 'text-green-600' : 
                              transaction.type === 'redeem' ? 'text-red-600' : 'text-blue-600'
                            }`}>
                              {transaction.type === 'earn' ? '+' : '-'}{transaction.amount} pts
                            </span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-8">
                        <Coins className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                        <p className="text-gray-500">No reward activity yet</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="profile">
                <Card>
                  <CardHeader>
                    <CardTitle>Profile Information</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-sm font-medium text-gray-600">First Name</label>
                        <p className="font-medium">{user?.firstName}</p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-600">Last Name</label>
                        <p className="font-medium">{user?.lastName}</p>
                      </div>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-600">Email</label>
                      <p className="font-medium">{user?.email}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-600">Country</label>
                      <p className="font-medium">{user?.country}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-600">Member Since</label>
                      <p className="font-medium">{new Date(user?.createdAt || '').toLocaleDateString()}</p>
                    </div>
                    {customer?.referralCode && (
                      <div>
                        <label className="text-sm font-medium text-gray-600">Referral Code</label>
                        <p className="font-medium font-mono bg-gray-100 p-2 rounded">{customer.referralCode}</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </div>
    </div>
  );
}
