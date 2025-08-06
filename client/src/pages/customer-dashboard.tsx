import { useState } from 'react';
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
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from 'recharts';

export default function CustomerDashboard() {
  const { user, profile } = useAuth();
  const [activeTab, setActiveTab] = useState('overview');

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
    <div className="pt-20 min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-cyan-50">
      <div className="container mx-auto px-4 py-12">
        <div className="mb-12 flex items-center justify-between">
          <div className="flex items-center space-x-6">
            <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-3xl flex items-center justify-center shadow-2xl">
              <LayoutDashboard className="w-10 h-10 text-white" />
            </div>
            <div>
              <h1 className="text-6xl font-black text-gray-900 mb-2">
                Customer <span className="bg-gradient-to-r from-blue-500 to-indigo-600 bg-clip-text text-transparent">Dashboard</span>
              </h1>
              <p className="text-2xl text-gray-600 font-medium">Welcome back, {user?.firstName} {user?.lastName}!</p>
            </div>
          </div>
          <div className="text-right bg-white/80 backdrop-blur-sm rounded-3xl p-8 border-2 border-blue-200 shadow-xl">
            <p className="text-xl text-gray-600 font-semibold mb-2">💰 Total Points</p>
            <p className="text-5xl font-black bg-gradient-to-r from-blue-500 to-indigo-600 bg-clip-text text-transparent">{customer?.rewardPoints || 0}</p>
          </div>
        </div>
        <div className="grid lg:grid-cols-4 gap-8">
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
                  <button onClick={() => setActiveTab('overview')} className={`w-full flex items-center space-x-3 p-3 rounded-lg transition-colors text-left ${activeTab === 'overview' ? 'bg-primary/10 text-primary' : 'text-gray-600 hover:bg-gray-50'}`}>
                    <LayoutDashboard className="w-5 h-5" />
                    <span>Dashboard</span>
                  </button>
                  <button onClick={() => setActiveTab('orders')} className={`w-full flex items-center space-x-3 p-3 rounded-lg transition-colors text-left ${activeTab === 'orders' ? 'bg-primary/10 text-primary' : 'text-gray-600 hover:bg-gray-50'}`}>
                    <ShoppingBag className="w-5 h-5" />
                    <span>Orders</span>
                  </button>
                  <button onClick={() => setActiveTab('rewards')} className={`w-full flex items-center space-x-3 p-3 rounded-lg transition-colors text-left ${activeTab === 'rewards' ? 'bg-primary/10 text-primary' : 'text-gray-600 hover:bg-gray-50'}`}>
                    <Coins className="w-5 h-5" />
                    <span>Rewards</span>
                  </button>
                  <button onClick={() => setActiveTab('profile')} className={`w-full flex items-center space-x-3 p-4 rounded-2xl transition-all text-left font-semibold text-lg ${activeTab === 'profile' ? 'bg-gradient-to-r from-blue-500 to-indigo-600 text-white shadow-lg' : 'text-gray-600 hover:bg-blue-50 hover:text-blue-600'}`}>
                    <Settings className="w-6 h-6" />
                    <span>Profile</span>
                  </button>
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

            <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
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
                <Card className="bg-white/80 backdrop-blur-sm border-2 border-blue-200 shadow-2xl">
                  <CardHeader>
                    <CardTitle className="text-3xl font-black bg-gradient-to-r from-blue-500 to-indigo-600 bg-clip-text text-transparent">
                      Customer Profile Settings
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <label className="text-sm font-semibold text-gray-700 mb-2 block">First Name</label>
                        <input 
                          type="text" 
                          defaultValue={user?.firstName} 
                          className="w-full px-4 py-3 rounded-xl border-2 border-blue-100 focus:border-blue-400 focus:outline-none text-lg"
                        />
                      </div>
                      <div>
                        <label className="text-sm font-semibold text-gray-700 mb-2 block">Last Name</label>
                        <input 
                          type="text" 
                          defaultValue={user?.lastName} 
                          className="w-full px-4 py-3 rounded-xl border-2 border-blue-100 focus:border-blue-400 focus:outline-none text-lg"
                        />
                      </div>
                      <div className="md:col-span-2">
                        <label className="text-sm font-semibold text-gray-700 mb-2 block">Email</label>
                        <input 
                          type="email" 
                          defaultValue={user?.email} 
                          className="w-full px-4 py-3 rounded-xl border-2 border-blue-100 focus:border-blue-400 focus:outline-none text-lg"
                        />
                      </div>
                      <div>
                        <label className="text-sm font-semibold text-gray-700 mb-2 block">Country</label>
                        <select 
                          defaultValue={user?.country} 
                          className="w-full px-4 py-3 rounded-xl border-2 border-blue-100 focus:border-blue-400 focus:outline-none text-lg"
                        >
                          <option value="">Select Country</option>
                          <option value="BD">🇧🇩 Bangladesh</option>
                          <option value="MY">🇲🇾 Malaysia</option>
                          <option value="AE">🇦🇪 UAE</option>
                          <option value="PH">🇵🇭 Philippines</option>
                        </select>
                      </div>
                      <div>
                        <label className="text-sm font-semibold text-gray-700 mb-2 block">Phone Number</label>
                        <input 
                          type="tel" 
                          placeholder="Enter phone number"
                          className="w-full px-4 py-3 rounded-xl border-2 border-blue-100 focus:border-blue-400 focus:outline-none text-lg"
                        />
                      </div>
                      {customer?.referralCode && (
                        <div className="md:col-span-2">
                          <label className="text-sm font-semibold text-gray-700 mb-2 block">Referral Code</label>
                          <div className="flex items-center space-x-3">
                            <input 
                              type="text" 
                              value={customer.referralCode}
                              className="flex-1 px-4 py-3 rounded-xl border-2 border-blue-100 bg-gray-50 text-lg font-mono"
                              disabled
                            />
                            <Button className="h-12 px-6 bg-gradient-to-r from-blue-500 to-indigo-600">
                              Copy
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>
                    
                    <div className="pt-4 border-t border-blue-100">
                      <h3 className="text-xl font-bold text-gray-800 mb-4">Security Settings</h3>
                      <div className="space-y-4">
                        <div>
                          <label className="text-sm font-semibold text-gray-700 mb-2 block">New Password</label>
                          <input 
                            type="password" 
                            placeholder="Enter new password"
                            className="w-full px-4 py-3 rounded-xl border-2 border-blue-100 focus:border-blue-400 focus:outline-none text-lg"
                          />
                        </div>
                        <div>
                          <label className="text-sm font-semibold text-gray-700 mb-2 block">Confirm Password</label>
                          <input 
                            type="password" 
                            placeholder="Confirm new password"
                            className="w-full px-4 py-3 rounded-xl border-2 border-blue-100 focus:border-blue-400 focus:outline-none text-lg"
                          />
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex space-x-4 pt-6">
                      <Button className="flex-1 h-14 text-lg font-semibold bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700">
                        Save Changes
                      </Button>
                      <Button variant="outline" className="h-14 px-8 text-lg font-semibold border-2 border-blue-200">
                        Cancel
                      </Button>
                    </div>
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
