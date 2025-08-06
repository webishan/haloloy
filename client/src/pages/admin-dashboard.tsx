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

export default function AdminDashboard() {
  const { user } = useAuth();
  const [selectedCountry, setSelectedCountry] = useState<string>('');

  const { data: globalStats = {}, isLoading: globalLoading } = useQuery({
    queryKey: ['/api/analytics/global'],
    enabled: !!user && user.role === 'admin'
  });

  const { data: countryStats = {}, isLoading: countryLoading } = useQuery({
    queryKey: ['/api/analytics/country', selectedCountry],
    enabled: !!user && user.role === 'admin' && !!selectedCountry
  });

  const countries = [
    { code: 'BD', name: 'Bangladesh', flag: '🇧🇩' },
    { code: 'MY', name: 'Malaysia', flag: '🇲🇾' },
    { code: 'AE', name: 'UAE', flag: '🇦🇪' },
    { code: 'PH', name: 'Philippines', flag: '🇵🇭' }
  ];

  const stats = selectedCountry && countryStats ? countryStats : globalStats;
  const isLoading = selectedCountry ? countryLoading : globalLoading;

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
    <div className="pt-32 min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                {selectedCountry ? `${countries.find(c => c.code === selectedCountry)?.name} Admin Dashboard` : 'Global Admin Dashboard'}
              </h1>
              <p className="text-gray-600">Manage the entire KOMARCE ecosystem</p>
            </div>
            <div className="flex items-center space-x-4">
              <Select value={selectedCountry} onValueChange={setSelectedCountry}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="Global View" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">🌍 Global View</SelectItem>
                  {countries.map((country) => (
                    <SelectItem key={country.code} value={country.code}>
                      {country.flag} {country.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="merchants">Merchants</TabsTrigger>
            <TabsTrigger value="customers">Customers</TabsTrigger>
            <TabsTrigger value="analytics">Analytics</TabsTrigger>
            <TabsTrigger value="settings">Settings</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            {/* Stats Overview */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600">Total Merchants</p>
                      <p className="text-3xl font-bold text-primary">{stats?.totalMerchants || 0}</p>
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
                      <p className="text-3xl font-bold text-blue-600">{stats?.totalCustomers || 0}</p>
                      <p className="text-sm text-green-600">+8% from last month</p>
                    </div>
                    <div className="p-3 bg-blue-100 rounded-lg">
                      <Users className="w-8 h-8 text-blue-600" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600">{selectedCountry ? 'Country' : 'Global'} Sales</p>
                      <p className="text-3xl font-bold text-green-600">${stats?.totalSales || '0.00'}</p>
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
                      <p className="text-3xl font-bold text-accent">{stats?.totalPointsDistributed || 0}</p>
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

          <TabsContent value="analytics">
            <div className="space-y-6">
              <div className="grid lg:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2">
                      <TrendingUp className="w-5 h-5" />
                      <span>Revenue Growth</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="flex justify-between items-center">
                        <span className="text-gray-600">This Month</span>
                        <span className="text-2xl font-bold text-green-600">$2.8M</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-gray-600">Last Month</span>
                        <span className="text-gray-600">$2.4M</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-gray-600">Growth Rate</span>
                        <span className="text-green-600 font-semibold">+16.7%</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2">
                      <Target className="w-5 h-5" />
                      <span>Key Metrics</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="flex justify-between items-center">
                        <span className="text-gray-600">Conversion Rate</span>
                        <span className="text-2xl font-bold text-blue-600">3.2%</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-gray-600">Customer Retention</span>
                        <span className="text-2xl font-bold text-purple-600">89%</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-gray-600">NPS Score</span>
                        <span className="text-2xl font-bold text-green-600">72</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              <Card>
                <CardHeader>
                  <CardTitle>Platform Health</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid md:grid-cols-3 gap-6">
                    <div className="text-center">
                      <div className="text-3xl font-bold text-green-600 mb-2">99.9%</div>
                      <p className="text-gray-600">Uptime</p>
                    </div>
                    <div className="text-center">
                      <div className="text-3xl font-bold text-blue-600 mb-2">1.2s</div>
                      <p className="text-gray-600">Avg. Response Time</p>
                    </div>
                    <div className="text-center">
                      <div className="text-3xl font-bold text-purple-600 mb-2">0.1%</div>
                      <p className="text-gray-600">Error Rate</p>
                    </div>
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
        </Tabs>
      </div>
    </div>
  );
}
