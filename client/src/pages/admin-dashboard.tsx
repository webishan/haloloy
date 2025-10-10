import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  LayoutDashboard, Users, Store, DollarSign, Coins, TrendingUp, 
  BarChart, Globe, MapPin, Award, UserPlus, ShoppingCart, Calendar,
  Settings, PieChart, Activity, Target, Star
} from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart as RechartsBar, Bar, PieChart as RechartsPie, Pie, Cell } from 'recharts';

export default function AdminDashboard() {
  const { user } = useAuth();
  const [selectedCountry, setSelectedCountry] = useState<string>('global');

  const { data: globalStats = {}, isLoading: globalLoading } = useQuery({
    queryKey: ['/api/analytics/global'],
    enabled: !!user && user.role === 'admin'
  });

  const { data: countryStats = {}, isLoading: countryLoading } = useQuery({
    queryKey: ['/api/analytics/country', selectedCountry],
    enabled: !!user && user.role === 'admin' && !!selectedCountry && selectedCountry !== 'global'
  });

  const countries = [
    // Africa
    { code: 'KE', name: 'Kenya', flag: '🇰🇪' },
    { code: 'MU', name: 'Mauritius', flag: '🇲🇺' },
    { code: 'RW', name: 'Rwanda', flag: '🇷🇼' },
    { code: 'UG', name: 'Uganda', flag: '🇺🇬' },
    
    // Asia & Middle East
    { code: 'BH', name: 'Bahrain', flag: '🇧🇭' },
    { code: 'BD', name: 'Bangladesh', flag: '🇧🇩' },
    { code: 'IN', name: 'India', flag: '🇮🇳' },
    { code: 'ID', name: 'Indonesia', flag: '🇮🇩' },
    { code: 'MY', name: 'Malaysia', flag: '🇲🇾' },
    { code: 'PK', name: 'Pakistan', flag: '🇵🇰' },
    { code: 'PH', name: 'Philippines', flag: '🇵🇭' },
    { code: 'QA', name: 'Qatar', flag: '🇶🇦' },
    { code: 'SG', name: 'Singapore', flag: '🇸🇬' },
    { code: 'LK', name: 'Sri Lanka', flag: '🇱🇰' },
    { code: 'TH', name: 'Thailand', flag: '🇹🇭' },
    { code: 'TR', name: 'Turkey', flag: '🇹🇷' },
    { code: 'AE', name: 'UAE', flag: '🇦🇪' }
  ];

  const { data: merchants = [] } = useQuery({
    queryKey: ['/api/merchants', selectedCountry],
    enabled: !!user && user.role === 'admin'
  });

  const { data: customers = [] } = useQuery({
    queryKey: ['/api/customers', selectedCountry], 
    enabled: !!user && user.role === 'admin'
  });

  const stats = selectedCountry && selectedCountry !== 'global' && countryStats ? countryStats : globalStats;
  const isLoading = selectedCountry && selectedCountry !== 'global' ? countryLoading : globalLoading;

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

  return (
    <div className="pt-20 min-h-screen bg-gradient-to-br from-red-50 via-white to-red-50">
      <div className="container mx-auto px-4 py-12">
        <div className="mb-12">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-6">
              <div className="w-20 h-20 bg-gradient-to-br from-red-600 to-red-500 rounded-3xl flex items-center justify-center shadow-2xl">
                <LayoutDashboard className="w-10 h-10 text-white" />
              </div>
              <div>
                <h1 className="text-6xl font-black text-gray-900 mb-2">
                  {selectedCountry && selectedCountry !== 'global' ? `${countries.find(c => c.code === selectedCountry)?.flag} ${countries.find(c => c.code === selectedCountry)?.name}` : 'Global'}{' '}
                  <span className="bg-gradient-to-r from-red-600 to-red-500 bg-clip-text text-transparent">Admin</span>
                </h1>
                <p className="text-2xl text-gray-600 font-medium">Manage the entire Holyloy ecosystem</p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <Select value={selectedCountry} onValueChange={setSelectedCountry}>
                <SelectTrigger className="w-64 h-14 bg-white/80 backdrop-blur-sm border-2 border-red-200 rounded-2xl text-lg font-semibold">
                  <SelectValue placeholder="🌍 Select Country" />
                </SelectTrigger>
                <SelectContent className="rounded-2xl border-2 border-red-200">
                  <SelectItem value="global" className="text-lg font-semibold">🌍 Global View</SelectItem>
                  {countries.map((country) => (
                    <SelectItem key={country.code} value={country.code} className="text-lg font-semibold">
                      {country.flag} {country.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        <Tabs defaultValue="overview" className="space-y-8">
          <TabsList className="grid w-full grid-cols-5 lg:w-[600px] bg-white/80 backdrop-blur-sm border-2 border-red-200 rounded-2xl p-2 mx-auto items-center justify-center">
            <TabsTrigger value="overview" className="text-lg font-semibold">Overview</TabsTrigger>
            <TabsTrigger value="merchants" className="text-lg font-semibold">Merchants</TabsTrigger>
            <TabsTrigger value="customers" className="text-lg font-semibold">Customers</TabsTrigger>
            <TabsTrigger value="analytics" className="text-lg font-semibold">Analytics</TabsTrigger>
            <TabsTrigger value="profile" className="text-lg font-semibold">Profile</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            {/* Stats Overview */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600">Total Merchants</p>
                      <p className="text-3xl font-bold text-primary">{selectedCountry && selectedCountry !== 'global' ? (merchants as any[])?.length || 0 : (stats as any)?.totalMerchants || 0}</p>
                      <p className="text-sm text-green-600">+12% from last month</p>
                    </div>
                    <div className="p-3 bg-primary/10 rounded-lg">
                      <Store className="w-8 h-8 text-primary" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600">Total Customers</p>
                      <p className="text-3xl font-bold text-red-600">{selectedCountry && selectedCountry !== 'global' ? (customers as any[])?.length || 0 : (stats as any)?.totalCustomers || 0}</p>
                      <p className="text-sm text-green-600">+8% from last month</p>
                    </div>
                    <div className="p-3 bg-red-100 rounded-lg">
                      <Users className="w-8 h-8 text-red-600" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600">{selectedCountry && selectedCountry !== 'global' ? 'Country' : 'Global'} Sales</p>
                      <p className="text-3xl font-bold text-green-600">${(stats as any)?.totalSales || '0.00'}</p>
                      <p className="text-sm text-green-600">+15% from last month</p>
                    </div>
                    <div className="p-3 bg-green-100 rounded-lg">
                      <DollarSign className="w-8 h-8 text-green-600" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600">Points Distributed</p>
                      <p className="text-3xl font-bold text-accent">{((stats as any)?.totalPointsDistributed || 0).toLocaleString()}</p>
                      <p className="text-sm text-green-600">+22% from last month</p>
                    </div>
                    <div className="p-3 bg-accent/10 rounded-lg">
                      <Coins className="w-8 h-8 text-accent" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Country Performance (Global View Only) */}
            {!selectedCountry && (
              <div className="grid lg:grid-cols-2 gap-8">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2">
                      <Globe className="w-5 h-5" />
                      <span>Country Performance</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {countries.map((country, index) => {
                        const performance = ['$1.2M', '$890K', '$560K', '$150K'][index];
                        const growth = ['+18%', '+25%', '+12%', '+35%'][index];
                        const status = ['Primary Market', 'Growing Market', 'Premium Market', 'Emerging Market'][index];
                        
                        return (
                          <div key={country.code} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                            <div className="flex items-center space-x-3">
                              <span className="text-xl">{country.flag}</span>
                              <div>
                                <p className="font-medium">{country.name}</p>
                                <p className="text-sm text-gray-600">{status}</p>
                              </div>
                            </div>
                            <div className="text-right">
                              <p className="font-semibold">{performance}</p>
                              <p className="text-sm text-green-600">{growth}</p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2">
                      <Star className="w-5 h-5" />
                      <span>Merchant Categories</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <div className="w-3 h-3 bg-primary rounded-full"></div>
                          <span>Star Merchant</span>
                        </div>
                        <span className="font-semibold">847</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <div className="w-3 h-3 bg-accent rounded-full"></div>
                          <span>Double Star</span>
                        </div>
                        <span className="font-semibold">234</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <div className="w-3 h-3 bg-blue-600 rounded-full"></div>
                          <span>Triple Star</span>
                        </div>
                        <span className="font-semibold">98</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <div className="w-3 h-3 bg-purple-600 rounded-full"></div>
                          <span>Executive</span>
                        </div>
                        <span className="font-semibold">68</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Recent Activities */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Activity className="w-5 h-5" />
                  <span>Recent Activities</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center space-x-4 p-4 border-l-4 border-primary bg-primary/5 rounded-r-lg">
                    <div className="p-2 bg-primary rounded-lg">
                      <UserPlus className="w-4 h-4 text-white" />
                    </div>
                    <div className="flex-1">
                      <p className="font-medium">New merchant registered</p>
                      <p className="text-sm text-gray-600">TechStore BD joined the platform</p>
                    </div>
                    <span className="text-sm text-gray-500">2 hours ago</span>
                  </div>
                  
                  <div className="flex items-center space-x-4 p-4 border-l-4 border-green-600 bg-green-50 rounded-r-lg">
                    <div className="p-2 bg-green-600 rounded-lg">
                      <DollarSign className="w-4 h-4 text-white" />
                    </div>
                    <div className="flex-1">
                      <p className="font-medium">High value transaction</p>
                      <p className="text-sm text-gray-600">$2,500 order from Malaysia</p>
                    </div>
                    <span className="text-sm text-gray-500">4 hours ago</span>
                  </div>

                  <div className="flex items-center space-x-4 p-4 border-l-4 border-blue-600 bg-blue-50 rounded-r-lg">
                    <div className="p-2 bg-blue-600 rounded-lg">
                      <Award className="w-4 h-4 text-white" />
                    </div>
                    <div className="flex-1">
                      <p className="font-medium">Merchant tier upgrade</p>
                      <p className="text-sm text-gray-600">Fashion Hub achieved Triple Star status</p>
                    </div>
                    <span className="text-sm text-gray-500">6 hours ago</span>
                  </div>

                  <div className="flex items-center space-x-4 p-4 border-l-4 border-purple-600 bg-purple-50 rounded-r-lg">
                    <div className="p-2 bg-purple-600 rounded-lg">
                      <Coins className="w-4 h-4 text-white" />
                    </div>
                    <div className="flex-1">
                      <p className="font-medium">Milestone reached</p>
                      <p className="text-sm text-gray-600">1 million points distributed this month</p>
                    </div>
                    <span className="text-sm text-gray-500">1 day ago</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="merchants">
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Merchant Management</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid md:grid-cols-3 gap-6 mb-8">
                    <div className="text-center p-6 bg-primary/5 rounded-lg">
                      <h3 className="text-2xl font-bold text-primary mb-2">95%</h3>
                      <p className="text-gray-600">Active Merchants</p>
                    </div>
                    <div className="text-center p-6 bg-green-50 rounded-lg">
                      <h3 className="text-2xl font-bold text-green-600 mb-2">$2.1M</h3>
                      <p className="text-gray-600">Monthly GMV</p>
                    </div>
                    <div className="text-center p-6 bg-blue-50 rounded-lg">
                      <h3 className="text-2xl font-bold text-blue-600 mb-2">4.8</h3>
                      <p className="text-gray-600">Average Rating</p>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h4 className="font-semibold text-gray-900">Top Performing Merchants</h4>
                    {[
                      { name: 'TechStore Pro', tier: 'Executive', sales: '$45K', growth: '+25%' },
                      { name: 'Fashion Hub', tier: 'Triple Star', sales: '$38K', growth: '+18%' },
                      { name: 'Home Essentials', tier: 'Double Star', sales: '$32K', growth: '+22%' },
                      { name: 'Sports World', tier: 'Star', sales: '$28K', growth: '+15%' },
                    ].map((merchant, index) => (
                      <div key={index} className="flex items-center justify-between p-4 border rounded-lg">
                        <div className="flex items-center space-x-4">
                          <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                            <Store className="w-5 h-5 text-primary" />
                          </div>
                          <div>
                            <h5 className="font-medium">{merchant.name}</h5>
                            <Badge variant="outline">{merchant.tier}</Badge>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-semibold">{merchant.sales}</p>
                          <p className="text-sm text-green-600">{merchant.growth}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="customers">
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Customer Analytics</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid md:grid-cols-4 gap-6 mb-8">
                    <div className="text-center p-6 bg-blue-50 rounded-lg">
                      <h3 className="text-2xl font-bold text-blue-600 mb-2">98%</h3>
                      <p className="text-gray-600">Satisfaction Rate</p>
                    </div>
                    <div className="text-center p-6 bg-green-50 rounded-lg">
                      <h3 className="text-2xl font-bold text-green-600 mb-2">$156</h3>
                      <p className="text-gray-600">Avg. Order Value</p>
                    </div>
                    <div className="text-center p-6 bg-purple-50 rounded-lg">
                      <h3 className="text-2xl font-bold text-purple-600 mb-2">73%</h3>
                      <p className="text-gray-600">Repeat Purchase Rate</p>
                    </div>
                    <div className="text-center p-6 bg-accent/10 rounded-lg">
                      <h3 className="text-2xl font-bold text-accent mb-2">2.3M</h3>
                      <p className="text-gray-600">Total Points Earned</p>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h4 className="font-semibold text-gray-900">Top Customers by Points</h4>
                    {[
                      { name: 'Sarah Johnson', points: '15,420', tier: 'Tier 4', orders: 28 },
                      { name: 'Mike Chen', points: '12,850', tier: 'Tier 3', orders: 24 },
                      { name: 'Emma Wilson', points: '9,680', tier: 'Tier 3', orders: 19 },
                      { name: 'David Kim', points: '8,350', tier: 'Tier 2', orders: 16 },
                    ].map((customer, index) => (
                      <div key={index} className="flex items-center justify-between p-4 border rounded-lg">
                        <div className="flex items-center space-x-4">
                          <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                            <Users className="w-5 h-5 text-blue-600" />
                          </div>
                          <div>
                            <h5 className="font-medium">{customer.name}</h5>
                            <Badge>{customer.tier}</Badge>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-semibold">{customer.points} pts</p>
                          <p className="text-sm text-gray-600">{customer.orders} orders</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="analytics" className="space-y-6">
            {/* Time Period Selector */}
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-gray-900">Analytics & Reporting Dashboard</h2>
              <div className="flex space-x-2">
                <Button variant="outline" size="sm">Daily</Button>
                <Button variant="default" size="sm">Weekly</Button>
                <Button variant="outline" size="sm">Monthly</Button>
                <Button variant="outline" size="sm">Yearly</Button>
              </div>
            </div>

            {/* Global Admin Metrics based on Document Requirements */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              <Card className="bg-gradient-to-br from-blue-50 to-indigo-50 border-2 border-blue-200">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-semibold text-blue-800">Global Sales</p>
                      <p className="text-3xl font-bold text-blue-900">
                        ${stats?.totalSales ? (stats.totalSales / 1000000).toFixed(1) + 'M' : '0'}
                      </p>
                      <p className="text-sm text-green-600">
                        +{stats?.salesGrowth || 0}% vs last period
                      </p>
                    </div>
                    <div className="p-3 bg-blue-200 rounded-xl">
                      <DollarSign className="w-8 h-8 text-blue-700" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-green-50 to-emerald-50 border-2 border-green-200">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-semibold text-green-800">Points Distributed</p>
                      <p className="text-3xl font-bold text-green-900">
                        {stats?.totalPointsDistributed ? (stats.totalPointsDistributed / 1000000).toFixed(1) + 'M' : '0'}
                      </p>
                      <p className="text-sm text-green-600">
                        +{stats?.pointsGrowth || 0}% vs last period
                      </p>
                    </div>
                    <div className="p-3 bg-green-200 rounded-xl">
                      <Coins className="w-8 h-8 text-green-700" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-purple-50 to-violet-50 border-2 border-purple-200">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-semibold text-purple-800">Global Serial Numbers</p>
                      <p className="text-3xl font-bold text-purple-900">
                        {stats?.totalSerialNumbers?.toLocaleString() || '0'}
                      </p>
                      <p className="text-sm text-green-600">
                        +{stats?.serialGrowth || 0}% vs last period
                      </p>
                    </div>
                    <div className="p-3 bg-purple-200 rounded-xl">
                      <Award className="w-8 h-8 text-purple-700" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-orange-50 to-amber-50 border-2 border-orange-200">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-semibold text-orange-800">VAT & Service</p>
                      <p className="text-3xl font-bold text-orange-900">
                        ${stats?.totalVATService ? (stats.totalVATService / 1000).toFixed(0) + 'K' : '0'}
                      </p>
                      <p className="text-sm text-green-600">
                        +{stats?.vatGrowth || 0}% vs last period
                      </p>
                    </div>
                    <div className="p-3 bg-orange-200 rounded-xl">
                      <TrendingUp className="w-8 h-8 text-orange-700" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Charts Section - Based on Document Analytics Requirements */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Global Sales Performance Chart */}
              <Card className="bg-white/80 backdrop-blur-sm border-2 border-blue-200 shadow-xl">
                <CardHeader>
                  <CardTitle className="text-xl font-bold text-gray-800">Global Sales Performance</CardTitle>
                  <p className="text-sm text-gray-600">Total sales to all merchants by period</p>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={stats?.chartData || [
                      { period: 'Jul', globalSales: 0, distributedPoints: 0 },
                      { period: 'Aug', globalSales: 0, distributedPoints: 0 },
                      { period: 'Sep', globalSales: 0, distributedPoints: 0 },
                      { period: 'Oct', globalSales: 0, distributedPoints: 0 },
                      { period: 'Nov', globalSales: 0, distributedPoints: 0 },
                      { period: 'Dec', globalSales: 0, distributedPoints: 0 }
                    ]}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e0e7ff" />
                      <XAxis dataKey="period" />
                      <YAxis />
                      <Tooltip />
                      <Line type="monotone" dataKey="globalSales" stroke="#3b82f6" strokeWidth={3} name="Global Sales ($)" />
                      <Line type="monotone" dataKey="distributedPoints" stroke="#10b981" strokeWidth={2} name="Points Distributed" />
                    </LineChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              {/* Merchant Tier Distribution */}
              <Card className="bg-white/80 backdrop-blur-sm border-2 border-blue-200 shadow-xl">
                <CardHeader>
                  <CardTitle className="text-xl font-bold text-gray-800">Merchant Tier Distribution</CardTitle>
                  <p className="text-sm text-gray-600">Star, Double Star, Triple Star, Executive</p>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <RechartsBar data={[
                      { tier: 'Regular', count: 45, percentage: 62 },
                      { tier: '⭐ Star', count: 18, percentage: 25 },
                      { tier: '⭐⭐ Double', count: 7, percentage: 10 },
                      { tier: '⭐⭐⭐ Triple', count: 2, percentage: 3 },
                      { tier: '👑 Executive', count: 1, percentage: 1 }
                    ]}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e0e7ff" />
                      <XAxis dataKey="tier" />
                      <YAxis />
                      <Tooltip />
                      <Bar dataKey="count" fill="#3b82f6" name="Merchant Count" />
                    </RechartsBar>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>

            {/* Additional Analytics Cards */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-6">
              {/* Withdrawal Analytics */}
              <Card className="bg-gradient-to-br from-red-50 to-pink-50 border-2 border-red-200">
                <CardHeader>
                  <CardTitle className="text-lg font-bold text-red-800">Total Withdrawal Amount</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-red-700 font-medium">Total Withdrawals</span>
                      <span className="text-2xl font-bold text-red-800">$425K</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-red-600">Merchants</span>
                      <span className="font-semibold text-red-700">$285K</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-red-600">Customers</span>
                      <span className="font-semibold text-red-700">$140K</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-red-600">Withdrawable but not withdrawn</span>
                      <span className="font-semibold text-red-700">$89K</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Customer Acquisition Sources */}
              <Card className="bg-gradient-to-br from-indigo-50 to-blue-50 border-2 border-indigo-200">
                <CardHeader>
                  <CardTitle className="text-lg font-bold text-indigo-800">Customer Acquisition</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between p-2 bg-indigo-100 rounded-lg">
                      <span className="font-medium text-indigo-800">Customer Referral</span>
                      <span className="font-bold text-indigo-900">2,345</span>
                    </div>
                    <div className="flex items-center justify-between p-2 bg-indigo-100 rounded-lg">
                      <span className="font-medium text-indigo-800">Merchant Signup</span>
                      <span className="font-bold text-indigo-900">1,892</span>
                    </div>
                    <div className="flex items-center justify-between p-2 bg-indigo-100 rounded-lg">
                      <span className="font-medium text-indigo-800">E-merchant Signup</span>
                      <span className="font-bold text-indigo-900">756</span>
                    </div>
                    <div className="flex items-center justify-between p-2 bg-indigo-100 rounded-lg">
                      <span className="font-medium text-indigo-800">Self Signup</span>
                      <span className="font-bold text-indigo-900">1,234</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Top Customers by Serial Number */}
              <Card className="bg-gradient-to-br from-amber-50 to-yellow-50 border-2 border-amber-200">
                <CardHeader>
                  <CardTitle className="text-lg font-bold text-amber-800">Top 10 Customers by SN</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {[
                      { name: 'Sarah Johnson', sn: 'SN-001', points: 45620, rank: 1 },
                      { name: 'Mike Chen', sn: 'SN-003', points: 38950, rank: 2 },
                      { name: 'Emma Wilson', sn: 'SN-007', points: 34210, rank: 3 }
                    ].map((customer) => (
                      <div key={customer.sn} className="flex items-center justify-between p-2 bg-amber-100 rounded-lg">
                        <div>
                          <div className="font-semibold text-amber-800">#{customer.rank} {customer.name}</div>
                          <div className="text-sm text-amber-600">{customer.sn}</div>
                        </div>
                        <div className="text-right">
                          <div className="font-bold text-amber-800">{customer.points.toLocaleString()}</div>
                          <div className="text-sm text-amber-600">points</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="settings">
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Settings className="w-5 h-5" />
                    <span>Platform Settings</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-6">
                    <div>
                      <h4 className="font-semibold mb-4">Reward System Configuration</h4>
                      <div className="grid md:grid-cols-2 gap-6">
                        <div className="space-y-4">
                          <div className="flex justify-between items-center p-3 border rounded-lg">
                            <span>Points per $1 spent</span>
                            <Badge>1 point</Badge>
                          </div>
                          <div className="flex justify-between items-center p-3 border rounded-lg">
                            <span>Tier 1 Reward</span>
                            <Badge>800 points</Badge>
                          </div>
                          <div className="flex justify-between items-center p-3 border rounded-lg">
                            <span>Tier 2 Reward</span>
                            <Badge>1,500 points</Badge>
                          </div>
                        </div>
                        <div className="space-y-4">
                          <div className="flex justify-between items-center p-3 border rounded-lg">
                            <span>Tier 3 Reward</span>
                            <Badge>3,500 points</Badge>
                          </div>
                          <div className="flex justify-between items-center p-3 border rounded-lg">
                            <span>Tier 4 Reward</span>
                            <Badge>32,200 points</Badge>
                          </div>
                          <div className="flex justify-between items-center p-3 border rounded-lg">
                            <span>VAT & Service Charge</span>
                            <Badge>12.5%</Badge>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div>
                      <h4 className="font-semibold mb-4">Merchant Cashback Rates</h4>
                      <div className="space-y-3">
                        <div className="flex justify-between items-center p-3 border rounded-lg">
                          <span>Instant Cashback</span>
                          <Badge variant="outline">15%</Badge>
                        </div>
                        <div className="flex justify-between items-center p-3 border rounded-lg">
                          <span>Affiliate Commission</span>
                          <Badge variant="outline">2%</Badge>
                        </div>
                        <div className="flex justify-between items-center p-3 border rounded-lg">
                          <span>Profit Share</span>
                          <Badge variant="outline">1%</Badge>
                        </div>
                      </div>
                    </div>

                    <div className="flex space-x-4">
                      <Button>Save Changes</Button>
                      <Button variant="outline">Reset to Default</Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="profile" className="space-y-8">
            <div className="max-w-2xl">
              <Card className="bg-white/80 backdrop-blur-sm border-2 border-blue-200 shadow-2xl">
                <CardHeader>
                  <CardTitle className="text-3xl font-black bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                    Admin Profile Settings
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
                    <div className="md:col-span-2">
                      <label className="text-sm font-semibold text-gray-700 mb-2 block">Username</label>
                      <input 
                        type="text" 
                        defaultValue={user?.username} 
                        className="w-full px-4 py-3 rounded-xl border-2 border-blue-100 focus:border-blue-400 focus:outline-none text-lg"
                        disabled
                      />
                    </div>
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
                    <Button className="flex-1 h-14 text-lg font-semibold bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700">
                      Save Changes
                    </Button>
                    <Button variant="outline" className="h-14 px-8 text-lg font-semibold border-2 border-blue-200">
                      Cancel
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
