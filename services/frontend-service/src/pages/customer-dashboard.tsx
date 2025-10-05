import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState, useEffect } from 'react';
import { Link } from 'wouter';
import { useAuth } from '@/hooks/use-auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import { 
  User, Wallet, Coins, TrendingUp, History, QrCode, Send, 
  Download, Gift, Crown, Star, Award, Calendar, Eye, Settings, 
  Target, Copy, ArrowUpRight, ArrowDownRight, Filter, Search, 
  MoreHorizontal, Bell, Menu, X as XIcon, Home, Plus, Edit,
  Smartphone, Mail, Lock, Shield, CheckCircle, AlertCircle,
  Building2, Package, ShoppingCart, BarChart, PieChart, LineChart,
  Zap, Percent, Recycle, Heart, ArrowRight, ArrowLeft
} from 'lucide-react';
import { ResponsiveContainer, LineChart as RechartsLine, Line, XAxis, YAxis, CartesianGrid, Tooltip, 
         BarChart as RechartsBar, Bar, PieChart as RechartsPie, Pie, Cell } from 'recharts';
import AccumulatedPointsDisplay from '@/components/AccumulatedPointsDisplay';

export default function CustomerDashboard() {
  const { user, profile } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [activeSection, setActiveSection] = useState('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showTransferDialog, setShowTransferDialog] = useState(false);
  const [showQRDialog, setShowQRDialog] = useState(false);
  const [showProfileDialog, setShowProfileDialog] = useState(false);

  const { data: dashboardData = {}, isLoading } = useQuery({
    queryKey: ['/api/customer/dashboard'],
    enabled: !!user && user.role === 'customer'
  });

  const { data: customerProfile = {} } = useQuery({
    queryKey: ['/api/customer/profile'],
    enabled: !!user && user.role === 'customer'
  });

  const { data: walletData = {} } = useQuery({
    queryKey: ['/api/customer/wallet'],
    enabled: !!user && user.role === 'customer'
  });

  const { data: transactions = [] } = useQuery({
    queryKey: ['/api/customer/transactions'],
    enabled: !!user && user.role === 'customer'
  });

  const { data: transfers = [] } = useQuery({
    queryKey: ['/api/customer/transfers'],
    enabled: !!user && user.role === 'customer'
  });

  const { data: purchases = [] } = useQuery({
    queryKey: ['/api/customer/purchases'],
    enabled: !!user && user.role === 'customer'
  });

  const { data: serialNumber = {} } = useQuery({
    queryKey: ['/api/customer/serial-number'],
    enabled: !!user && user.role === 'customer'
  });

  // Advanced reward system data
  const { data: rewardDashboard = {} } = useQuery({
    queryKey: ['/api/customer/dashboard'],
    enabled: !!user && user.role === 'customer'
  });

  const { data: rewards = [] } = useQuery({
    queryKey: ['/api/customer/rewards'],
    enabled: !!user && user.role === 'customer'
  });

  const { data: affiliateLink = {} } = useQuery({
    queryKey: ['/api/customer/affiliate-link'],
    enabled: !!user && user.role === 'customer'
  });

  const { data: referrals = [] } = useQuery({
    queryKey: ['/api/customer/referrals'],
    enabled: !!user && user.role === 'customer'
  });

  const { data: vouchers = [] } = useQuery({
    queryKey: ['/api/customer/vouchers'],
    enabled: !!user && user.role === 'customer'
  });

  const { data: rewardStatus = {} } = useQuery({
    queryKey: ['/api/customer/status'],
    enabled: !!user && user.role === 'customer'
  });

  // Three Wallet System data
  const { data: walletOverview = {} } = useQuery({
    queryKey: ['/api/customer/wallet-overview'],
    enabled: !!user && user.role === 'customer'
  });

  const { data: walletTransactions = [] } = useQuery({
    queryKey: ['/api/customer/transactions'],
    enabled: !!user && user.role === 'customer'
  });

  const { data: walletTransfers = [] } = useQuery({
    queryKey: ['/api/customer/transfers'],
    enabled: !!user && user.role === 'customer'
  });

  const { data: referralCommissions = [] } = useQuery({
    queryKey: ['/api/customer/referral-commissions'],
    enabled: !!user && user.role === 'customer'
  });

  const { data: wasteManagementRewards = [] } = useQuery({
    queryKey: ['/api/customer/waste-management'],
    enabled: !!user && user.role === 'customer'
  });

  const { data: medicalBenefits = [] } = useQuery({
    queryKey: ['/api/customer/medical-benefits'],
    enabled: !!user && user.role === 'customer'
  });

  // Mock data for demonstration
  const customerData = {
    fullName: customerProfile.fullName || 'John Doe',
    accountNumber: customerProfile.uniqueAccountNumber || 'KOM00000001',
    mobileNumber: customerProfile.mobileNumber || '+8801234567890',
    email: customerProfile.email || 'john.doe@example.com',
    tier: customerProfile.tier || 'bronze',
    pointsBalance: walletData.pointsBalance || 1250,
    totalEarned: walletData.totalPointsEarned || 2500,
    totalSpent: walletData.totalPointsSpent || 800,
    totalTransferred: walletData.totalPointsTransferred || 450,
    globalSerialNumber: serialNumber.globalSerialNumber || 1,
    localSerialNumber: serialNumber.localSerialNumber || 1,
    profileComplete: customerProfile.profileComplete || false,
    qrCode: customerProfile.qrCode
  };

  // Render Dashboard Section
  const renderDashboard = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">Customer Dashboard</h2>
        <div className="flex items-center space-x-2">
          <Badge variant="outline" className="bg-blue-100 text-blue-800">
            {customerData.tier.toUpperCase()}
          </Badge>
          {customerData.globalSerialNumber && (
            <Badge variant="outline" className="bg-green-100 text-green-800">
              Serial #{customerData.globalSerialNumber}
            </Badge>
          )}
        </div>
      </div>

                {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  <Card>
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between">
                        <div>
                <p className="text-sm font-medium text-gray-600">Current Balance</p>
                <p className="text-2xl font-bold text-green-600">{customerData.pointsBalance.toLocaleString()}</p>
                <p className="text-xs text-gray-500">Points</p>
                        </div>
              <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                <Coins className="w-6 h-6 text-green-600" />
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between">
                        <div>
                <p className="text-sm font-medium text-gray-600">Total Earned</p>
                <p className="text-2xl font-bold text-blue-600">{customerData.totalEarned.toLocaleString()}</p>
                <p className="text-xs text-gray-500">Points</p>
                        </div>
              <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-blue-600" />
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between">
                        <div>
                <p className="text-sm font-medium text-gray-600">Total Spent</p>
                <p className="text-2xl font-bold text-orange-600">{customerData.totalSpent.toLocaleString()}</p>
                <p className="text-xs text-gray-500">Points</p>
                        </div>
              <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center">
                <ShoppingCart className="w-6 h-6 text-orange-600" />
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between">
                        <div>
                <p className="text-sm font-medium text-gray-600">Total Transferred</p>
                <p className="text-2xl font-bold text-purple-600">{customerData.totalTransferred.toLocaleString()}</p>
                <p className="text-xs text-gray-500">Points</p>
                        </div>
              <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center">
                <Send className="w-6 h-6 text-purple-600" />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card>
                  <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <QrCode className="w-5 h-5" />
              <span>QR Code</span>
            </CardTitle>
                  </CardHeader>
                  <CardContent>
            <p className="text-sm text-gray-600 mb-4">
              Share your QR code for easy point transfers
            </p>
            <Button onClick={() => setShowQRDialog(true)} className="w-full">
              <QrCode className="w-4 h-4 mr-2" />
              Show QR Code
            </Button>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Send className="w-5 h-5" />
              <span>Transfer Points</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
            <p className="text-sm text-gray-600 mb-4">
              Send points to other customers
            </p>
            <Button onClick={() => setShowTransferDialog(true)} className="w-full">
              <Send className="w-4 h-4 mr-2" />
              Transfer Points
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <User className="w-5 h-5" />
              <span>Profile</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-600 mb-4">
              {customerData.profileComplete ? 'Profile Complete' : 'Complete Profile for Withdrawals'}
            </p>
            <Button 
              onClick={() => setShowProfileDialog(true)} 
              variant={customerData.profileComplete ? "outline" : "default"}
              className="w-full"
            >
              <User className="w-4 h-4 mr-2" />
              {customerData.profileComplete ? 'View Profile' : 'Complete Profile'}
            </Button>
          </CardContent>
        </Card>
                            </div>

      {/* Recent Transactions */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Transactions</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Points</TableHead>
                <TableHead>Balance</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {transactions.slice(0, 5).map((transaction: any) => (
                <TableRow key={transaction.id}>
                  <TableCell>{new Date(transaction.createdAt).toLocaleDateString()}</TableCell>
                  <TableCell>
                            <Badge variant={
                      transaction.transactionType === 'earned' ? 'default' :
                      transaction.transactionType === 'spent' ? 'destructive' :
                      'secondary'
                    }>
                      {transaction.transactionType}
                            </Badge>
                  </TableCell>
                  <TableCell>{transaction.description}</TableCell>
                  <TableCell className={transaction.points > 0 ? 'text-green-600' : 'text-red-600'}>
                    {transaction.points > 0 ? '+' : ''}{transaction.points}
                  </TableCell>
                  <TableCell>{transaction.balanceAfter.toLocaleString()}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
                      </div>

      {/* Accumulated Points System */}
      <AccumulatedPointsDisplay currentUser={user} />
  );

  // Render Wallet Section
  const renderWallet = () => (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-900">My Wallet</h2>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Wallet Summary</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Current Balance</span>
              <span className="text-2xl font-bold text-green-600">{customerData.pointsBalance.toLocaleString()}</span>
                      </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Total Earned</span>
              <span className="text-lg font-semibold">{customerData.totalEarned.toLocaleString()}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Total Spent</span>
              <span className="text-lg font-semibold">{customerData.totalSpent.toLocaleString()}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Total Transferred</span>
              <span className="text-lg font-semibold">{customerData.totalTransferred.toLocaleString()}</span>
            </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
            <CardTitle>Account Information</CardTitle>
                  </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Account Number</span>
              <span className="font-mono">{customerData.accountNumber}</span>
                              </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Mobile Number</span>
              <span>{customerData.mobileNumber}</span>
                            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Tier</span>
              <Badge variant="outline" className="bg-blue-100 text-blue-800">
                {customerData.tier.toUpperCase()}
              </Badge>
                              </div>
            {customerData.globalSerialNumber && (
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Serial Number</span>
                <span className="font-semibold">#{customerData.globalSerialNumber}</span>
                            </div>
            )}
          </CardContent>
        </Card>
                          </div>
    </div>
  );

  // Render Transactions Section
  const renderTransactions = () => (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-900">Transaction History</h2>
      
      <Card>
        <CardHeader>
          <CardTitle>All Transactions</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Points</TableHead>
                <TableHead>Balance</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {transactions.map((transaction: any) => (
                <TableRow key={transaction.id}>
                  <TableCell>{new Date(transaction.createdAt).toLocaleDateString()}</TableCell>
                  <TableCell>
                    <Badge variant={
                      transaction.transactionType === 'earned' ? 'default' :
                      transaction.transactionType === 'spent' ? 'destructive' :
                      'secondary'
                    }>
                      {transaction.transactionType}
                    </Badge>
                  </TableCell>
                  <TableCell>{transaction.description}</TableCell>
                  <TableCell className={transaction.points > 0 ? 'text-green-600' : 'text-red-600'}>
                    {transaction.points > 0 ? '+' : ''}{transaction.points}
                  </TableCell>
                  <TableCell>{transaction.balanceAfter.toLocaleString()}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
                      </div>
  );

  // Render Transfers Section
  const renderTransfers = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">Point Transfers</h2>
        <Button onClick={() => setShowTransferDialog(true)}>
          <Send className="w-4 h-4 mr-2" />
          Transfer Points
                        </Button>
                      </div>
      
      <Card>
        <CardHeader>
          <CardTitle>Transfer History</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Recipient/Sender</TableHead>
                <TableHead>Points</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {transfers.map((transfer: any) => (
                <TableRow key={transfer.id}>
                  <TableCell>{new Date(transfer.createdAt).toLocaleDateString()}</TableCell>
                  <TableCell>
                    {transfer.fromCustomerId === customerData.accountNumber ? 'Sent' : 'Received'}
                  </TableCell>
                  <TableCell>
                    {transfer.fromCustomerId === customerData.accountNumber ? 
                      `To: ${transfer.toCustomerId}` : 
                      `From: ${transfer.fromCustomerId}`
                    }
                  </TableCell>
                  <TableCell>{transfer.points}</TableCell>
                  <TableCell>
                    <Badge variant={
                      transfer.status === 'completed' ? 'default' :
                      transfer.status === 'pending' ? 'secondary' :
                      'destructive'
                    }>
                      {transfer.status}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
                  </CardContent>
                </Card>
    </div>
  );

  // Render Profile Section
  const renderProfile = () => (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-900">Profile Settings</h2>
      
                <Card>
                  <CardHeader>
          <CardTitle>Personal Information</CardTitle>
                  </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="fullName">Full Name</Label>
              <Input id="fullName" value={customerData.fullName} readOnly />
                              </div>
                              <div>
              <Label htmlFor="email">Email</Label>
              <Input id="email" value={customerData.email} readOnly />
                              </div>
                            </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="mobileNumber">Mobile Number</Label>
              <Input id="mobileNumber" value={customerData.mobileNumber} readOnly />
                          </div>
            <div>
              <Label htmlFor="accountNumber">Account Number</Label>
              <Input id="accountNumber" value={customerData.accountNumber} readOnly />
                      </div>
                      </div>
        </CardContent>
      </Card>

      {!customerData.profileComplete && (
        <Card className="border-orange-200 bg-orange-50">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2 text-orange-800">
              <AlertCircle className="w-5 h-5" />
              <span>Complete Profile for Withdrawals</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-orange-700 mb-4">
              To withdraw any type of income, you must complete your profile with the following mandatory details:
            </p>
            <ul className="list-disc list-inside text-orange-700 space-y-2">
              <li>Father's Name</li>
              <li>Mother's Name</li>
              <li>National ID (NID) card number or Passport number</li>
              <li>Blood Group</li>
              <li>Nominee Details</li>
            </ul>
            <Button 
              onClick={() => setShowProfileDialog(true)} 
              className="mt-4 bg-orange-600 hover:bg-orange-700"
            >
              Complete Profile
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );

  // Render Rewards Section
  const renderRewards = () => (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-900">Reward System</h2>
      
      {/* Reward Status */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Crown className="w-5 h-5 text-yellow-600" />
              <span>Global Serial</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <p className="text-sm text-gray-600">Current Step</p>
              <p className="text-2xl font-bold text-yellow-600">
                {rewardStatus.rewardProgress?.global || 0}/4
              </p>
              <p className="text-xs text-gray-500">
                {rewardStatus.hasGlobalSerial ? `Serial #${rewardStatus.globalSerialNumber}` : 'No serial assigned'}
              </p>
            </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Star className="w-5 h-5 text-blue-600" />
              <span>Local Serial</span>
                    </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <p className="text-sm text-gray-600">Current Step</p>
              <p className="text-2xl font-bold text-blue-600">
                {rewardStatus.rewardProgress?.local || 0}/4
              </p>
              <p className="text-xs text-gray-500">
                {rewardStatus.hasLocalSerial ? `Serial #${rewardStatus.localSerialNumber}` : 'No serial assigned'}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Zap className="w-5 h-5 text-purple-600" />
              <span>Serial Activation</span>
            </CardTitle>
                  </CardHeader>
                  <CardContent>
            <div className="space-y-2">
              <p className="text-sm text-gray-600">Points Required</p>
              <p className="text-2xl font-bold text-purple-600">6,000</p>
              <p className="text-xs text-gray-500">
                {rewardStatus.canActivateSerial ? 'Ready to activate' : 'Need more points'}
              </p>
            </div>
                  </CardContent>
                </Card>
      </div>

      {/* Reward Structure */}
      <Card>
        <CardHeader>
          <CardTitle>Reward Structure</CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="global" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="global">Global Serial (6/5/4/4)</TabsTrigger>
              <TabsTrigger value="local">Local Serial (5/4/3/3)</TabsTrigger>
            </TabsList>
            
            <TabsContent value="global" className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {[
                  { step: 1, multiplier: '6x', points: 800, cash: 800 },
                  { step: 2, multiplier: '30x', points: 1500, cash: 1500 },
                  { step: 3, multiplier: '120x', points: 3500, cash: 3500 },
                  { step: 4, multiplier: '480x', points: 32200, cash: 32200 }
                ].map((reward) => (
                  <div key={reward.step} className="p-4 border rounded-lg">
                    <div className="text-center">
                      <p className="text-sm text-gray-600">Step {reward.step}</p>
                      <p className="text-lg font-bold text-yellow-600">{reward.multiplier}</p>
                      <p className="text-sm font-semibold">{reward.points.toLocaleString()} pts</p>
                      <p className="text-xs text-gray-500">{reward.cash.toLocaleString()} BDT</p>
                    </div>
                  </div>
                ))}
              </div>
              </TabsContent>

            <TabsContent value="local" className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {[
                  { step: 1, multiplier: '5x', points: 300, cash: 300 },
                  { step: 2, multiplier: '20x', points: 500, cash: 500 },
                  { step: 3, multiplier: '60x', points: 1200, cash: 1200 },
                  { step: 4, multiplier: '180x', points: 3000, cash: 3000 }
                ].map((reward) => (
                  <div key={reward.step} className="p-4 border rounded-lg">
                    <div className="text-center">
                      <p className="text-sm text-gray-600">Step {reward.step}</p>
                      <p className="text-lg font-bold text-blue-600">{reward.multiplier}</p>
                      <p className="text-sm font-semibold">{reward.points.toLocaleString()} pts</p>
                      <p className="text-xs text-gray-500">{reward.cash.toLocaleString()} BDT</p>
                    </div>
                  </div>
                ))}
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Recent Rewards */}
      <Card>
                  <CardHeader>
          <CardTitle>Recent Rewards</CardTitle>
                  </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Step</TableHead>
                <TableHead>Points</TableHead>
                <TableHead>Cash Value</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rewards.slice(0, 10).map((reward: any) => (
                <TableRow key={reward.id}>
                  <TableCell>{new Date(reward.createdAt).toLocaleDateString()}</TableCell>
                  <TableCell>
                    <Badge variant={reward.rewardType === 'global_serial' ? 'default' : 'secondary'}>
                      {reward.rewardType.replace('_', ' ')}
                    </Badge>
                  </TableCell>
                  <TableCell>{reward.rewardStep || '-'}</TableCell>
                  <TableCell>{reward.pointsAwarded.toLocaleString()}</TableCell>
                  <TableCell>{parseFloat(reward.cashValue || '0').toLocaleString()} BDT</TableCell>
                  <TableCell>
                    <Badge variant={
                      reward.status === 'awarded' ? 'default' :
                      reward.status === 'distributed' ? 'secondary' :
                      'outline'
                    }>
                      {reward.status}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );

  // Render Referrals Section
  const renderReferrals = () => (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-900">Referral System</h2>
      
      {/* Affiliate Link */}
      <Card>
        <CardHeader>
          <CardTitle>Your Affiliate Link</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
                      <div>
              <Label htmlFor="affiliate-link">Share this link to earn 5% commission</Label>
              <div className="flex space-x-2">
                <Input 
                  id="affiliate-link" 
                  value={affiliateLink.affiliateUrl || 'https://komarce.com/register?ref=AFF123456'} 
                  readOnly 
                />
                <Button onClick={() => {
                  navigator.clipboard.writeText(affiliateLink.affiliateUrl || '');
                  toast({ title: "Affiliate link copied to clipboard" });
                }}>
                  <Copy className="w-4 h-4" />
                </Button>
                      </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="text-center p-4 bg-blue-50 rounded-lg">
                <p className="text-2xl font-bold text-blue-600">{affiliateLink.totalClicks || 0}</p>
                <p className="text-sm text-gray-600">Total Clicks</p>
              </div>
              <div className="text-center p-4 bg-green-50 rounded-lg">
                <p className="text-2xl font-bold text-green-600">{affiliateLink.totalRegistrations || 0}</p>
                <p className="text-sm text-gray-600">Registrations</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Referral Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
                      <div>
                <p className="text-sm font-medium text-gray-600">Total Referrals</p>
                <p className="text-2xl font-bold text-blue-600">{referrals.length}</p>
                      </div>
              <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                <Target className="w-6 h-6 text-blue-600" />
                      </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
                      <div>
                <p className="text-sm font-medium text-gray-600">Total Commission</p>
                <p className="text-2xl font-bold text-green-600">
                  {referrals.reduce((sum: number, r: any) => sum + parseFloat(r.totalCommissionEarned.toString()), 0).toLocaleString()} BDT
                </p>
                      </div>
              <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                <Coins className="w-6 h-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
                      <div>
                <p className="text-sm font-medium text-gray-600">Commission Rate</p>
                <p className="text-2xl font-bold text-purple-600">5%</p>
                <p className="text-xs text-gray-500">On all referred customer points</p>
                      </div>
              <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center">
                <Percent className="w-6 h-6 text-purple-600" />
                          </div>
                        </div>
          </CardContent>
        </Card>
                    </div>
                    
      {/* Referral List */}
      <Card>
        <CardHeader>
          <CardTitle>Your Referrals</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Referred Customer</TableHead>
                <TableHead>Registration Date</TableHead>
                <TableHead>Points Earned</TableHead>
                <TableHead>Commission Earned</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {referrals.map((referral: any) => (
                <TableRow key={referral.id}>
                  <TableCell>{referral.referredId}</TableCell>
                  <TableCell>{new Date(referral.createdAt).toLocaleDateString()}</TableCell>
                  <TableCell>{referral.totalPointsEarned.toLocaleString()}</TableCell>
                  <TableCell>{parseFloat(referral.totalCommissionEarned.toString()).toLocaleString()} BDT</TableCell>
                  <TableCell>
                    <Badge variant={referral.isActive ? 'default' : 'secondary'}>
                      {referral.isActive ? 'Active' : 'Inactive'}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );

  // Render Vouchers Section
  const renderVouchers = () => (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-900">Shopping Vouchers</h2>
      
      {/* Voucher Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
                        <div>
                <p className="text-sm font-medium text-gray-600">Active Vouchers</p>
                <p className="text-2xl font-bold text-green-600">
                  {vouchers.filter((v: any) => v.status === 'active').length}
                </p>
                        </div>
              <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                <Package className="w-6 h-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
                        <div>
                <p className="text-sm font-medium text-gray-600">Total Value</p>
                <p className="text-2xl font-bold text-blue-600">
                  {vouchers
                    .filter((v: any) => v.status === 'active')
                    .reduce((sum: number, v: any) => sum + parseFloat(v.voucherValue.toString()), 0)
                    .toLocaleString()} BDT
                </p>
                        </div>
              <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                <Coins className="w-6 h-6 text-blue-600" />
                      </div>
                    </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Used Vouchers</p>
                <p className="text-2xl font-bold text-orange-600">
                  {vouchers.filter((v: any) => v.status === 'used').length}
                </p>
              </div>
              <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center">
                <CheckCircle className="w-6 h-6 text-orange-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Voucher List */}
      <Card>
        <CardHeader>
          <CardTitle>Your Vouchers</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Voucher Code</TableHead>
                <TableHead>Merchant</TableHead>
                <TableHead>Value</TableHead>
                <TableHead>Expires</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {vouchers.map((voucher: any) => (
                <TableRow key={voucher.id}>
                  <TableCell className="font-mono">{voucher.voucherCode}</TableCell>
                  <TableCell>{voucher.merchantId}</TableCell>
                  <TableCell>{parseFloat(voucher.voucherValue.toString()).toLocaleString()} BDT</TableCell>
                  <TableCell>{new Date(voucher.expiresAt).toLocaleDateString()}</TableCell>
                  <TableCell>
                    <Badge variant={
                      voucher.status === 'active' ? 'default' :
                      voucher.status === 'used' ? 'secondary' :
                      'destructive'
                    }>
                      {voucher.status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {voucher.status === 'active' && (
                      <Button 
                        size="sm" 
                        onClick={() => {
                          navigator.clipboard.writeText(voucher.voucherCode);
                          toast({ title: "Voucher code copied to clipboard" });
                        }}
                      >
                        <Copy className="w-4 h-4" />
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );

  // Render Three Wallets Section
  const renderThreeWallets = () => (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-900">Three Wallet System</h2>
      
      {/* Wallet Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Reward Point Wallet */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Gift className="w-5 h-5 text-purple-600" />
              <span>Reward Point Wallet</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="text-center">
                <p className="text-3xl font-bold text-purple-600">
                  {walletOverview.rewardPointBalance?.toLocaleString() || 0}
                </p>
                <p className="text-sm text-gray-600">Points</p>
              </div>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-gray-600">Total Earned</p>
                  <p className="font-semibold">{walletOverview.totalRewardPointsEarned?.toLocaleString() || 0}</p>
                </div>
                <div>
                  <p className="text-gray-600">Total Spent</p>
                  <p className="font-semibold">{walletOverview.totalRewardPointsSpent?.toLocaleString() || 0}</p>
                </div>
              </div>
              <div className="space-y-2">
                <p className="text-xs text-gray-500">Sources:</p>
                <div className="flex flex-wrap gap-1">
                  <Badge variant="outline" className="text-xs">Purchase Rewards</Badge>
                  <Badge variant="outline" className="text-xs">Waste Management</Badge>
                  <Badge variant="outline" className="text-xs">Daily Login</Badge>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Income Wallet */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <TrendingUp className="w-5 h-5 text-green-600" />
              <span>Income Wallet</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="text-center">
                <p className="text-3xl font-bold text-green-600">
                  {parseFloat(walletOverview.incomeBalance?.toString() || '0').toLocaleString()} BDT
                </p>
                <p className="text-sm text-gray-600">Balance</p>
              </div>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-gray-600">Total Earned</p>
                  <p className="font-semibold">{parseFloat(walletOverview.totalIncomeEarned?.toString() || '0').toLocaleString()} BDT</p>
                </div>
                <div>
                  <p className="text-gray-600">Total Spent</p>
                  <p className="font-semibold">{parseFloat(walletOverview.totalIncomeSpent?.toString() || '0').toLocaleString()} BDT</p>
                </div>
              </div>
              <div className="space-y-2">
                <p className="text-xs text-gray-500">Sources:</p>
                <div className="flex flex-wrap gap-1">
                  <Badge variant="outline" className="text-xs">Serial Income</Badge>
                  <Badge variant="outline" className="text-xs">Affiliation</Badge>
                  <Badge variant="outline" className="text-xs">Medical Benefits</Badge>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Commerce Wallet (MFS) */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Coins className="w-5 h-5 text-blue-600" />
              <span>Commerce Wallet (MFS)</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="text-center">
                <p className="text-3xl font-bold text-blue-600">
                  {parseFloat(walletOverview.commerceBalance?.toString() || '0').toLocaleString()} BDT
                </p>
                <p className="text-sm text-gray-600">Balance</p>
              </div>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-gray-600">Total Added</p>
                  <p className="font-semibold">{parseFloat(walletOverview.totalCommerceAdded?.toString() || '0').toLocaleString()} BDT</p>
                </div>
                <div>
                  <p className="text-gray-600">Total Withdrawn</p>
                  <p className="font-semibold">{parseFloat(walletOverview.totalCommerceWithdrawn?.toString() || '0').toLocaleString()} BDT</p>
                </div>
              </div>
              <div className="space-y-2">
                <p className="text-xs text-gray-500">Features:</p>
                <div className="flex flex-wrap gap-1">
                  <Badge variant="outline" className="text-xs">Bank Transfer</Badge>
                  <Badge variant="outline" className="text-xs">MFS</Badge>
                  <Badge variant="outline" className="text-xs">Purchases</Badge>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Wallet Transfer Section */}
      <Card>
        <CardHeader>
          <CardTitle>Transfer Between Wallets</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label htmlFor="from-wallet">From Wallet</Label>
                <Select>
                  <SelectTrigger>
                    <SelectValue placeholder="Select source wallet" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="reward_point">Reward Point Wallet</SelectItem>
                    <SelectItem value="income">Income Wallet</SelectItem>
                    <SelectItem value="commerce">Commerce Wallet</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="to-wallet">To Wallet</Label>
                <Select>
                  <SelectTrigger>
                    <SelectValue placeholder="Select destination wallet" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="reward_point">Reward Point Wallet</SelectItem>
                    <SelectItem value="income">Income Wallet</SelectItem>
                    <SelectItem value="commerce">Commerce Wallet</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="transfer-amount">Amount</Label>
                <Input id="transfer-amount" type="number" placeholder="Enter amount" />
              </div>
            </div>
            <div className="bg-yellow-50 p-4 rounded-lg">
              <div className="flex items-center space-x-2">
                <AlertCircle className="w-5 h-5 text-yellow-600" />
                <p className="text-sm text-yellow-800">
                  <strong>Note:</strong> 12.5% VAT and service charge will be applied when transferring from Income Wallet to Commerce Wallet.
                </p>
              </div>
            </div>
            <Button className="w-full">
              <ArrowRight className="w-4 h-4 mr-2" />
              Transfer Funds
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Recent Wallet Transactions */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Wallet Transactions</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Wallet</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Balance After</TableHead>
                <TableHead>Description</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {walletTransactions.slice(0, 10).map((transaction: any) => (
                <TableRow key={transaction.id}>
                  <TableCell>{new Date(transaction.createdAt).toLocaleDateString()}</TableCell>
                  <TableCell>
                    <Badge variant={
                      transaction.walletType === 'reward_point' ? 'default' :
                      transaction.walletType === 'income' ? 'secondary' :
                      'outline'
                    }>
                      {transaction.walletType.replace('_', ' ')}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant={transaction.transactionType === 'credit' ? 'default' : 'destructive'}>
                      {transaction.transactionType}
                    </Badge>
                  </TableCell>
                  <TableCell className={transaction.transactionType === 'credit' ? 'text-green-600' : 'text-red-600'}>
                    {transaction.transactionType === 'credit' ? '+' : ''}{transaction.amount}
                  </TableCell>
                  <TableCell>{transaction.balanceAfter}</TableCell>
                  <TableCell>{transaction.description}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );

  // Render Waste Management Section
  const renderWasteManagement = () => (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-900">Waste Management Rewards</h2>
      
      {/* Waste Management Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {[
          { type: 'plastic', rate: 5, color: 'bg-blue-100 text-blue-600' },
          { type: 'paper', rate: 3, color: 'bg-green-100 text-green-600' },
          { type: 'metal', rate: 8, color: 'bg-gray-100 text-gray-600' },
          { type: 'electronic', rate: 15, color: 'bg-purple-100 text-purple-600' }
        ].map((waste) => (
          <Card key={waste.type}>
            <CardContent className="p-6">
              <div className="text-center">
                <div className={`w-12 h-12 rounded-full ${waste.color} flex items-center justify-center mx-auto mb-4`}>
                  <Recycle className="w-6 h-6" />
                </div>
                <p className="text-sm font-medium text-gray-600 capitalize">{waste.type}</p>
                <p className="text-2xl font-bold">{waste.rate} pts/kg</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Process Waste Reward */}
      <Card>
        <CardHeader>
          <CardTitle>Process Waste Reward</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="waste-type">Waste Type</Label>
                <Select>
                  <SelectTrigger>
                    <SelectValue placeholder="Select waste type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="plastic">Plastic (5 pts/kg)</SelectItem>
                    <SelectItem value="paper">Paper (3 pts/kg)</SelectItem>
                    <SelectItem value="metal">Metal (8 pts/kg)</SelectItem>
                    <SelectItem value="organic">Organic (2 pts/kg)</SelectItem>
                    <SelectItem value="electronic">Electronic (15 pts/kg)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="waste-quantity">Quantity (kg)</Label>
                <Input id="waste-quantity" type="number" placeholder="Enter quantity" />
              </div>
            </div>
            <Button className="w-full">
              <Recycle className="w-4 h-4 mr-2" />
              Process Waste Reward
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Waste Management History */}
      <Card>
        <CardHeader>
          <CardTitle>Waste Management History</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Waste Type</TableHead>
                <TableHead>Quantity</TableHead>
                <TableHead>Rate</TableHead>
                <TableHead>Points Awarded</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {wasteManagementRewards.map((reward: any) => (
                <TableRow key={reward.id}>
                  <TableCell>{new Date(reward.createdAt).toLocaleDateString()}</TableCell>
                  <TableCell className="capitalize">{reward.wasteType}</TableCell>
                  <TableCell>{reward.quantity} kg</TableCell>
                  <TableCell>{reward.rewardRate} pts/kg</TableCell>
                  <TableCell className="font-semibold text-green-600">{reward.pointsAwarded} pts</TableCell>
                  <TableCell>
                    <Badge variant={reward.status === 'awarded' ? 'default' : 'secondary'}>
                      {reward.status}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );

  // Render Medical Benefits Section
  const renderMedicalBenefits = () => (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-900">Medical Facility Benefits</h2>
      
      {/* Medical Benefits Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Available Benefits</p>
                <p className="text-2xl font-bold text-green-600">
                  {medicalBenefits.filter((b: any) => b.status === 'available').length}
                </p>
              </div>
              <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                <Heart className="w-6 h-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Used Benefits</p>
                <p className="text-2xl font-bold text-blue-600">
                  {medicalBenefits.filter((b: any) => b.status === 'used').length}
                </p>
              </div>
              <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                <CheckCircle className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Value</p>
                <p className="text-2xl font-bold text-purple-600">
                  {medicalBenefits
                    .filter((b: any) => b.status === 'available')
                    .reduce((sum: number, b: any) => sum + parseFloat(b.benefitAmount.toString()), 0)
                    .toLocaleString()} BDT
                </p>
              </div>
              <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center">
                <Coins className="w-6 h-6 text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Medical Benefits List */}
      <Card>
        <CardHeader>
          <CardTitle>Your Medical Benefits</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Benefit Type</TableHead>
                <TableHead>Facility</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Expires</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {medicalBenefits.map((benefit: any) => (
                <TableRow key={benefit.id}>
                  <TableCell className="capitalize">{benefit.benefitType}</TableCell>
                  <TableCell>
                    <div>
                      <p className="font-medium">{benefit.facilityName}</p>
                      <p className="text-sm text-gray-500 capitalize">{benefit.facilityType}</p>
                    </div>
                  </TableCell>
                  <TableCell>{parseFloat(benefit.benefitAmount.toString()).toLocaleString()} BDT</TableCell>
                  <TableCell>{new Date(benefit.expiresAt).toLocaleDateString()}</TableCell>
                  <TableCell>
                    <Badge variant={
                      benefit.status === 'available' ? 'default' :
                      benefit.status === 'used' ? 'secondary' :
                      'destructive'
                    }>
                      {benefit.status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {benefit.status === 'available' && (
                      <Button size="sm">
                        <Heart className="w-4 h-4 mr-1" />
                        Use
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Top Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <h1 className="text-xl font-semibold text-gray-900">KOMARCE Customer Portal</h1>
            </div>
            <div className="flex items-center space-x-4">
              <Button variant="outline" size="sm">
                <Bell className="w-4 h-4" />
              </Button>
              <Button variant="outline" size="sm" asChild>
                <Link to="/logout">Logout</Link>
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col lg:flex-row gap-8">
          {/* Sidebar */}
          <div className="lg:w-64 flex-shrink-0">
            <div className="bg-white rounded-lg shadow-sm border p-6">
              <nav className="space-y-2">
                <Button
                  variant={activeSection === "dashboard" ? "default" : "ghost"}
                  className="w-full justify-start"
                  onClick={() => setActiveSection("dashboard")}
                >
                  <Home className="w-4 h-4 mr-2" />
                  Dashboard
                </Button>
                
                <Button
                  variant={activeSection === "wallet" ? "default" : "ghost"}
                  className="w-full justify-start"
                  onClick={() => setActiveSection("wallet")}
                >
                  <Wallet className="w-4 h-4 mr-2" />
                  My Wallet
                </Button>
                
                <Button
                  variant={activeSection === "transactions" ? "default" : "ghost"}
                  className="w-full justify-start"
                  onClick={() => setActiveSection("transactions")}
                >
                  <History className="w-4 h-4 mr-2" />
                  Transactions
                </Button>
                
                <Button
                  variant={activeSection === "transfers" ? "default" : "ghost"}
                  className="w-full justify-start"
                  onClick={() => setActiveSection("transfers")}
                >
                  <Send className="w-4 h-4 mr-2" />
                  Transfers
                </Button>
                
                <Button
                  variant={activeSection === "profile" ? "default" : "ghost"}
                  className="w-full justify-start"
                  onClick={() => setActiveSection("profile")}
                >
                  <User className="w-4 h-4 mr-2" />
                  Profile
                </Button>
                
                <Button
                  variant={activeSection === "rewards" ? "default" : "ghost"}
                  className="w-full justify-start"
                  onClick={() => setActiveSection("rewards")}
                >
                  <Gift className="w-4 h-4 mr-2" />
                  Rewards
                </Button>
                
                <Button
                  variant={activeSection === "referrals" ? "default" : "ghost"}
                  className="w-full justify-start"
                  onClick={() => setActiveSection("referrals")}
                >
                  <Target className="w-4 h-4 mr-2" />
                  Referrals
                </Button>
                
                <Button
                  variant={activeSection === "vouchers" ? "default" : "ghost"}
                  className="w-full justify-start"
                  onClick={() => setActiveSection("vouchers")}
                >
                  <Package className="w-4 h-4 mr-2" />
                  Vouchers
                </Button>
                
                <Button
                  variant={activeSection === "three-wallets" ? "default" : "ghost"}
                  className="w-full justify-start"
                  onClick={() => setActiveSection("three-wallets")}
                >
                  <Wallet className="w-4 h-4 mr-2" />
                  Three Wallets
                </Button>
                
                <Button
                  variant={activeSection === "waste-management" ? "default" : "ghost"}
                  className="w-full justify-start"
                  onClick={() => setActiveSection("waste-management")}
                >
                  <Recycle className="w-4 h-4 mr-2" />
                  Waste Management
                </Button>
                
                <Button
                  variant={activeSection === "medical-benefits" ? "default" : "ghost"}
                  className="w-full justify-start"
                  onClick={() => setActiveSection("medical-benefits")}
                >
                  <Heart className="w-4 h-4 mr-2" />
                  Medical Benefits
                </Button>
              </nav>
            </div>
          </div>

          {/* Main Content */}
          <div className="flex-1">
            {activeSection === 'dashboard' && renderDashboard()}
            {activeSection === 'wallet' && renderWallet()}
            {activeSection === 'transactions' && renderTransactions()}
            {activeSection === 'transfers' && renderTransfers()}
            {activeSection === 'profile' && renderProfile()}
            {activeSection === 'rewards' && renderRewards()}
            {activeSection === 'referrals' && renderReferrals()}
            {activeSection === 'vouchers' && renderVouchers()}
            {activeSection === 'three-wallets' && renderThreeWallets()}
            {activeSection === 'waste-management' && renderWasteManagement()}
            {activeSection === 'medical-benefits' && renderMedicalBenefits()}
          </div>
        </div>
      </div>

      {/* Transfer Points Dialog */}
      <Dialog open={showTransferDialog} onOpenChange={setShowTransferDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Transfer Points</DialogTitle>
          </DialogHeader>
          <form onSubmit={(e) => {
            e.preventDefault();
            const formData = new FormData(e.target as HTMLFormElement);
            const toCustomerId = formData.get('toCustomerId') as string;
            const points = parseInt(formData.get('points') as string);
            const description = formData.get('description') as string;
            
            // Here you would call the API to transfer points
            toast({ 
              title: "Transfer Successful", 
              description: `Transferred ${points} points to ${toCustomerId}` 
            });
            setShowTransferDialog(false);
          }} className="space-y-4">
            <div>
              <Label htmlFor="toCustomerId">Recipient Account Number</Label>
              <Input name="toCustomerId" required placeholder="KOM00000002" />
            </div>
            <div>
              <Label htmlFor="points">Points to Transfer</Label>
              <Input name="points" type="number" required min="1" max={customerData.pointsBalance} />
              <p className="text-sm text-gray-500 mt-1">
                Available: {customerData.pointsBalance.toLocaleString()} points
              </p>
            </div>
            <div>
              <Label htmlFor="description">Description (Optional)</Label>
              <Textarea name="description" placeholder="Reason for transfer..." />
            </div>
            <div className="flex justify-end space-x-2">
              <Button type="button" variant="outline" onClick={() => setShowTransferDialog(false)}>
                        Cancel
                      </Button>
              <Button type="submit">
                Transfer Points
              </Button>
                    </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* QR Code Dialog */}
      <Dialog open={showQRDialog} onOpenChange={setShowQRDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>My QR Code</DialogTitle>
          </DialogHeader>
          <div className="text-center space-y-4">
            <div className="w-64 h-64 bg-gray-100 rounded-lg flex items-center justify-center mx-auto">
              <QrCode className="w-32 h-32 text-gray-400" />
          </div>
            <p className="text-sm text-gray-600">
              Share this QR code with others for easy point transfers
            </p>
            <Button onClick={() => {
              navigator.clipboard.writeText(customerData.qrCode);
              toast({ title: "QR Code copied to clipboard" });
            }}>
              <Copy className="w-4 h-4 mr-2" />
              Copy QR Code
            </Button>
        </div>
        </DialogContent>
      </Dialog>

      {/* Profile Dialog */}
      <Dialog open={showProfileDialog} onOpenChange={setShowProfileDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Complete Profile</DialogTitle>
          </DialogHeader>
          <form onSubmit={(e) => {
            e.preventDefault();
            const formData = new FormData(e.target as HTMLFormElement);
            const fathersName = formData.get('fathersName') as string;
            const mothersName = formData.get('mothersName') as string;
            const nidNumber = formData.get('nidNumber') as string;
            const bloodGroup = formData.get('bloodGroup') as string;
            const nomineeDetails = formData.get('nomineeDetails') as string;
            
            // Here you would call the API to update profile
            toast({ 
              title: "Profile Updated", 
              description: "Your profile has been completed successfully" 
            });
            setShowProfileDialog(false);
          }} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="fathersName">Father's Name *</Label>
                <Input name="fathersName" required />
      </div>
              <div>
                <Label htmlFor="mothersName">Mother's Name *</Label>
                <Input name="mothersName" required />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="nidNumber">NID Number *</Label>
                <Input name="nidNumber" required />
              </div>
              <div>
                <Label htmlFor="bloodGroup">Blood Group *</Label>
                <Select name="bloodGroup" required>
                  <option value="A+">A+</option>
                  <option value="A-">A-</option>
                  <option value="B+">B+</option>
                  <option value="B-">B-</option>
                  <option value="AB+">AB+</option>
                  <option value="AB-">AB-</option>
                  <option value="O+">O+</option>
                  <option value="O-">O-</option>
                </Select>
              </div>
            </div>
            <div>
              <Label htmlFor="nomineeDetails">Nominee Details *</Label>
              <Textarea name="nomineeDetails" required placeholder="Name, relationship, contact information..." />
            </div>
            <div className="flex justify-end space-x-2">
              <Button type="button" variant="outline" onClick={() => setShowProfileDialog(false)}>
                Cancel
              </Button>
              <Button type="submit">
                Complete Profile
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}