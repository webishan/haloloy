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
import { useRealtimeBalance } from "@/hooks/use-realtime-balance";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { 
  Shield, Crown, LogOut, Users, DollarSign, BarChart3, Star, Settings, MessageCircle,
  TrendingUp, Coins, CheckCircle, Send, Plus, AlertCircle, Check, X, Menu, X as XIcon,
  Building2, UserCheck, Award, CreditCard, Globe, FileText, Headphones, 
  Database, BarChart, UserPlus, Building, Calendar, Download, Star as StarIcon,
  Percent, Calculator, Eye, EyeOff, Edit, Trash2, Save, RefreshCw, Filter, Search, Bell
} from "lucide-react";
import { HolyloyLogo } from "@/components/ui/holyloy-logo";
import io from "socket.io-client";
import SecureChat from "@/components/SecureChat";
import PointsManagementPanel from "@/components/PointsManagementPanel";
import { useStorageListener } from "@/hooks/use-storage-listener";
import { NotificationProvider } from "@/hooks/use-notifications";
import NotificationBadge, { NotificationWrapper, MessageNotificationBadge } from "@/components/NotificationBadge";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from "recharts";

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

// Global Admin Cashback Management Component
function GlobalAdminCashbackManagement() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedTab, setSelectedTab] = useState("overview");
  const [rankFormData, setRankFormData] = useState({
    rank: "",
    rankName: "",
    minSalesAmount: "",
    maxSalesAmount: "",
    bonusPercentage: "",
    priority: "",
    description: ""
  });

  // Fetch platform cashback overview
  const { data: overview, isLoading: overviewLoading } = useQuery({
    queryKey: ['/api/admin/cashback/overview'],
    select: (data: any) => data || {}
  });

  // Fetch monthly distributions
  const { data: distributions = [] } = useQuery({
    queryKey: ['/api/admin/cashback/monthly-distributions'],
    select: (data: any) => data?.distributions || []
  });

  // Fetch voucher cash-out requests
  const { data: voucherRequests = [] } = useQuery({
    queryKey: ['/api/admin/cashback/voucher-requests'],
    select: (data: any) => data?.requests || []
  });

  // Fetch rank conditions
  const { data: rankConditions = [] } = useQuery({
    queryKey: ['/api/admin/cashback/rank-conditions'],
    select: (data: any) => data?.conditions || []
  });

  // Approve voucher cash-out
  const approveCashOutMutation = useMutation({
    mutationFn: async (requestId: string) => {
      const response = await fetch(`/api/admin/cashback/voucher-requests/${requestId}/approve`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('globalAdminToken')}`
        }
      });
      if (!response.ok) throw new Error('Failed to approve request');
      return response.json();
    },
    onSuccess: () => {
      toast({ title: "Request Approved", description: "Voucher cash-out approved successfully" });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/cashback/voucher-requests'] });
    }
  });

  // Reject voucher cash-out
  const rejectCashOutMutation = useMutation({
    mutationFn: async ({ requestId, reason }: { requestId: string; reason: string }) => {
      const response = await fetch(`/api/admin/cashback/voucher-requests/${requestId}/reject`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('globalAdminToken')}`
        },
        body: JSON.stringify({ rejectionReason: reason })
      });
      if (!response.ok) throw new Error('Failed to reject request');
      return response.json();
    },
    onSuccess: () => {
      toast({ title: "Request Rejected", description: "Voucher cash-out rejected" });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/cashback/voucher-requests'] });
    }
  });

  // Run monthly distribution
  const runDistributionMutation = useMutation({
    mutationFn: async ({ month, year }: { month: string; year: number }) => {
      const response = await fetch('/api/admin/cashback/run-monthly-distribution', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('globalAdminToken')}`
        },
        body: JSON.stringify({ month, year })
      });
      if (!response.ok) throw new Error('Failed to run distribution');
      return response.json();
    },
    onSuccess: () => {
      toast({ title: "Distribution Complete", description: "Monthly cashback distribution completed" });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/cashback/monthly-distributions'] });
    }
  });

  // Save rank condition
  const saveRankMutation = useMutation({
    mutationFn: async (rankData: any) => {
      const response = await fetch('/api/admin/cashback/rank-conditions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('globalAdminToken')}`
        },
        body: JSON.stringify(rankData)
      });
      if (!response.ok) throw new Error('Failed to save rank');
      return response.json();
    },
    onSuccess: () => {
      toast({ title: "Rank Saved", description: "Rank condition saved successfully" });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/cashback/rank-conditions'] });
      setRankFormData({
        rank: "",
        rankName: "",
        minSalesAmount: "",
        maxSalesAmount: "",
        bonusPercentage: "",
        priority: "",
        description: ""
      });
    }
  });

  const handleSaveRank = () => {
    if (!rankFormData.rank || !rankFormData.rankName || !rankFormData.minSalesAmount || !rankFormData.bonusPercentage) {
      toast({ title: "Missing Fields", description: "Please fill in all required fields", variant: "destructive" });
      return;
    }
    saveRankMutation.mutate({
      ...rankFormData,
      minSalesAmount: parseFloat(rankFormData.minSalesAmount),
      maxSalesAmount: rankFormData.maxSalesAmount ? parseFloat(rankFormData.maxSalesAmount) : null,
      bonusPercentage: parseFloat(rankFormData.bonusPercentage),
      priority: parseInt(rankFormData.priority) || 0
    });
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center text-2xl">
            <DollarSign className="w-6 h-6 mr-2 text-green-600" />
            Merchant Cashback Management
          </CardTitle>
          <CardDescription>
            Manage platform-wide cashback system, distributions, and merchant incentives
          </CardDescription>
        </CardHeader>
      </Card>

      <Tabs value={selectedTab} onValueChange={setSelectedTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Platform Overview</TabsTrigger>
          <TabsTrigger value="distributions">Monthly Distributions</TabsTrigger>
          <TabsTrigger value="vouchers">Voucher Approvals</TabsTrigger>
          <TabsTrigger value="ranks">Rank Management</TabsTrigger>
        </TabsList>

        {/* Platform Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          {overviewLoading ? (
            <div className="text-center py-8 text-gray-500">Loading platform data...</div>
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium text-gray-600">Total Merchants</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold">{overview?.totalMerchants || 0}</div>
                    <p className="text-xs text-gray-500 mt-1">Active merchants</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium text-gray-600">Total Cashback Distributed</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold text-green-600">{overview?.totalCashbackDistributed?.toFixed(2) || '0.00'}</div>
                    <p className="text-xs text-gray-500 mt-1">All time points</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium text-gray-600">Monthly Pool</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold text-blue-600">{overview?.currentMonthlyPool?.toFixed(2) || '0.00'}</div>
                    <p className="text-xs text-gray-500 mt-1">This month</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium text-gray-600">Pending Vouchers</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold text-orange-600">{overview?.pendingVoucherRequests || 0}</div>
                    <p className="text-xs text-gray-500 mt-1">Awaiting approval</p>
                  </CardContent>
                </Card>
              </div>

              <Card>
                <CardHeader>
                  <CardTitle>Cashback Type Distribution</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-sm">Instant Cashback (10%)</span>
                      <span className="font-semibold">{overview?.byType?.instant?.toFixed(2) || '0.00'} pts</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm">Affiliate Commission (2%)</span>
                      <span className="font-semibold">{overview?.byType?.affiliate?.toFixed(2) || '0.00'} pts</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm">Monthly Distribution (1%)</span>
                      <span className="font-semibold">{overview?.byType?.monthly?.toFixed(2) || '0.00'} pts</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm">Shopping Vouchers</span>
                      <span className="font-semibold">{overview?.byType?.vouchers?.toFixed(2) || '0.00'} pts</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm">Rank Incentives</span>
                      <span className="font-semibold">{overview?.byType?.rankIncentives?.toFixed(2) || '0.00'} pts</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </>
          )}
        </TabsContent>

        {/* Monthly Distributions Tab */}
        <TabsContent value="distributions" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Monthly Distribution History</span>
                <Button onClick={() => {
                  const now = new Date();
                  runDistributionMutation.mutate({
                    month: String(now.getMonth() + 1).padStart(2, '0'),
                    year: now.getFullYear()
                  });
                }}>
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Run This Month's Distribution
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Month/Year</TableHead>
                    <TableHead>Pool Amount</TableHead>
                    <TableHead>Distributed</TableHead>
                    <TableHead>Merchants</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {distributions.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8 text-gray-500">
                        No distributions yet
                      </TableCell>
                    </TableRow>
                  ) : (
                    distributions.map((dist: any) => (
                      <TableRow key={dist.id}>
                        <TableCell className="font-medium">{dist.month}/{dist.year}</TableCell>
                        <TableCell>{dist.totalPoolAmount.toFixed(2)} pts</TableCell>
                        <TableCell>{dist.totalDistributed.toFixed(2)} pts</TableCell>
                        <TableCell>{dist.merchantCount}</TableCell>
                        <TableCell>
                          <Badge variant={dist.status === 'completed' ? 'default' : 'outline'}>
                            {dist.status}
                          </Badge>
                        </TableCell>
                        <TableCell>{new Date(dist.processedAt).toLocaleDateString()}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Voucher Approvals Tab */}
        <TabsContent value="vouchers" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Pending Voucher Cash-Out Requests</CardTitle>
              <CardDescription>
                Review and approve merchant requests to convert shopping vouchers to cash
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Merchant</TableHead>
                    <TableHead>Amount Requested</TableHead>
                    <TableHead>Current Balance</TableHead>
                    <TableHead>Requested Date</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {voucherRequests.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-8 text-gray-500">
                        No pending requests
                      </TableCell>
                    </TableRow>
                  ) : (
                    voucherRequests.map((req: any) => (
                      <TableRow key={req.id}>
                        <TableCell className="font-medium">{req.merchantId?.slice(0, 8)}...</TableCell>
                        <TableCell className="text-green-600 font-semibold">
                          {req.requestedAmount.toFixed(2)} pts
                        </TableCell>
                        <TableCell>{req.currentVoucherBalance.toFixed(2)} pts</TableCell>
                        <TableCell>{new Date(req.requestedAt).toLocaleDateString()}</TableCell>
                        <TableCell>
                          <div className="flex space-x-2">
                            <Button
                              size="sm"
                              onClick={() => approveCashOutMutation.mutate(req.id)}
                              disabled={approveCashOutMutation.isPending}
                            >
                              <Check className="w-4 h-4 mr-1" />
                              Approve
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => rejectCashOutMutation.mutate({
                                requestId: req.id,
                                reason: "Administrative decision"
                              })}
                              disabled={rejectCashOutMutation.isPending}
                            >
                              <X className="w-4 h-4 mr-1" />
                              Reject
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Rank Management Tab */}
        <TabsContent value="ranks" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Configure Merchant Ranks</CardTitle>
              <CardDescription>
                Define sales thresholds and bonus percentages for different merchant ranks
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Rank Code</Label>
                  <Input
                    placeholder="BRONZE, SILVER, GOLD"
                    value={rankFormData.rank}
                    onChange={(e) => setRankFormData({...rankFormData, rank: e.target.value.toUpperCase()})}
                  />
                </div>
                <div>
                  <Label>Rank Name</Label>
                  <Input
                    placeholder="Bronze Merchant"
                    value={rankFormData.rankName}
                    onChange={(e) => setRankFormData({...rankFormData, rankName: e.target.value})}
                  />
                </div>
                <div>
                  <Label>Min Sales Amount ($)</Label>
                  <Input
                    type="number"
                    placeholder="0.00"
                    value={rankFormData.minSalesAmount}
                    onChange={(e) => setRankFormData({...rankFormData, minSalesAmount: e.target.value})}
                  />
                </div>
                <div>
                  <Label>Max Sales Amount ($)</Label>
                  <Input
                    type="number"
                    placeholder="Optional"
                    value={rankFormData.maxSalesAmount}
                    onChange={(e) => setRankFormData({...rankFormData, maxSalesAmount: e.target.value})}
                  />
                </div>
                <div>
                  <Label>Bonus Percentage (%)</Label>
                  <Input
                    type="number"
                    step="0.1"
                    placeholder="0.5"
                    value={rankFormData.bonusPercentage}
                    onChange={(e) => setRankFormData({...rankFormData, bonusPercentage: e.target.value})}
                  />
                </div>
                <div>
                  <Label>Priority (Lower = Higher)</Label>
                  <Input
                    type="number"
                    placeholder="1"
                    value={rankFormData.priority}
                    onChange={(e) => setRankFormData({...rankFormData, priority: e.target.value})}
                  />
                </div>
                <div className="col-span-2">
                  <Label>Description</Label>
                  <Input
                    placeholder="Entry-level merchant rank"
                    value={rankFormData.description}
                    onChange={(e) => setRankFormData({...rankFormData, description: e.target.value})}
                  />
                </div>
              </div>
              <Button onClick={handleSaveRank} disabled={saveRankMutation.isPending} className="w-full">
                <Save className="w-4 h-4 mr-2" />
                {saveRankMutation.isPending ? "Saving..." : "Save Rank Condition"}
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Current Rank Conditions</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Rank</TableHead>
                    <TableHead>Sales Range</TableHead>
                    <TableHead>Bonus %</TableHead>
                    <TableHead>Priority</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rankConditions.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-8 text-gray-500">
                        No rank conditions configured
                      </TableCell>
                    </TableRow>
                  ) : (
                    rankConditions.map((rank: any) => (
                      <TableRow key={rank.id}>
                        <TableCell className="font-medium">{rank.rankName}</TableCell>
                        <TableCell>
                          ${rank.minSalesAmount.toFixed(2)} - ${rank.maxSalesAmount ? rank.maxSalesAmount.toFixed(2) : '∞'}
                        </TableCell>
                        <TableCell>{rank.bonusPercentage}%</TableCell>
                        <TableCell>{rank.priority}</TableCell>
                        <TableCell>
                          <Badge variant={rank.isActive ? 'default' : 'outline'}>
                            {rank.isActive ? 'Active' : 'Inactive'}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default function GlobalAdminPortal() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [currentUser, setCurrentUser] = useState<GlobalAdminUser | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("dashboard");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [timeFilter, setTimeFilter] = useState("daily");
  const [socket, setSocket] = useState<any>(null);
  const [selectedChatUser, setSelectedChatUser] = useState<any>(null);
  const [newMessage, setNewMessage] = useState("");
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  
  const { toast } = useToast();
  const queryClient = useQueryClient();
  // Pending requests from local admins
  const { data: pendingRequests = [] } = useQuery({
    queryKey: ['/api/admin/pending-point-requests'],
    enabled: isAuthenticated,
    queryFn: async () => {
      const res = await fetch('/api/admin/pending-point-requests', {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('globalAdminToken')}` }
      });
      if (!res.ok) throw new Error('Failed to fetch pending requests');
      return res.json();
    }
  });

  const approveMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/admin/approve-point-request/${id}`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${localStorage.getItem('globalAdminToken')}` }
      });
      if (!res.ok) throw new Error('Approve failed');
      return res.json();
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/pending-point-requests'] });
      // Optimistically set new balance if backend returned it
      if (data?.newGlobalBalance !== undefined) {
        queryClient.setQueryData(['/api/admin/balance'], (prev: any) => ({
          ...(prev || {}),
          balance: data.newGlobalBalance
        }));
      }
      // Force immediate refresh of balance and dashboard everywhere
      queryClient.invalidateQueries({ queryKey: ['/api/admin/balance'] });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/dashboard'] });
      // Broadcast a custom event so other tabs/components refresh now
      window.dispatchEvent(new CustomEvent('dataUpdate'));
      localStorage.setItem('lastAdminUpdate', Date.now().toString());
    }
  });

  const rejectMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/admin/reject-point-request/${id}`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${localStorage.getItem('globalAdminToken')}` }
      });
      if (!res.ok) throw new Error('Reject failed');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/pending-point-requests'] });
    }
  });

  // Login form state
  const [loginForm, setLoginForm] = useState({
    email: "",
    password: ""
  });
  
  // Password reset state
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [forgotPasswordLoading, setForgotPasswordLoading] = useState(false);
  const [verificationLoading, setVerificationLoading] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);
  
  // Debug logging
  console.log('Current showForgotPassword state:', showForgotPassword);
  const [forgotPasswordStep, setForgotPasswordStep] = useState<'email' | 'verification' | 'reset'>('email');
  const [forgotPasswordForm, setForgotPasswordForm] = useState({
    email: "",
    phone: "",
    verificationCode: "",
    newPassword: "",
    confirmPassword: ""
  });
  const [verificationSent, setVerificationSent] = useState(false);
  const [verificationMethod, setVerificationMethod] = useState<'email' | 'phone'>('email');
  const [showPassword, setShowPassword] = useState(false);

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

  // Check authentication on mount - always verify with server
  useEffect(() => {
    const verifyAuth = async () => {
      setAuthLoading(true);
      const token = localStorage.getItem('globalAdminToken');
      
      if (!token) {
        setIsAuthenticated(false);
        setCurrentUser(null);
        setAuthLoading(false);
        return;
      }

      try {
        const response = await fetch('/api/admin/balance', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (response.ok) {
          const user = localStorage.getItem('globalAdminUser');
          if (user) {
            const userData = JSON.parse(user);
            if (userData.role === 'global_admin') {
              setIsAuthenticated(true);
              setCurrentUser(userData);
            } else {
              setIsAuthenticated(false);
              setCurrentUser(null);
            }
          } else {
            setIsAuthenticated(false);
            setCurrentUser(null);
          }
        } else {
          // Token is invalid, clear everything and force re-login
          console.log('Token validation failed, clearing storage');
          localStorage.clear(); // Clear all localStorage
          setIsAuthenticated(false);
          setCurrentUser(null);
          toast({ 
            title: "Session Expired", 
            description: "Please log in again",
            variant: "destructive" 
          });
        }
      } catch (error) {
        console.log('Auth verification error:', error);
        localStorage.clear(); // Clear all localStorage
        setIsAuthenticated(false);
        setCurrentUser(null);
      }
      
      setAuthLoading(false);
    };

    verifyAuth();
  }, []);

  // Real-time balance updates
  const { isConnected: balanceSocketConnected } = useRealtimeBalance(
    currentUser?.id,
    localStorage.getItem('globalAdminToken') || undefined
  );

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
      const response = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...credentials, adminType: 'global' })
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        if (errorData.requiresPasswordReset) {
          throw new Error('PASSWORD_RESET_REQUIRED');
        }
        throw new Error(errorData.message || 'Invalid credentials');
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
      if (error.message === 'PASSWORD_RESET_REQUIRED') {
        toast({ 
          title: "Password Reset Required", 
          description: "You must reset your password before logging in. Please use the 'Forgot Password?' option.",
          variant: "destructive" 
        });
        setShowForgotPassword(true);
      } else {
        toast({ 
          title: "Login Failed", 
          description: error.message || "Invalid credentials",
          variant: "destructive" 
        });
      }
    }
  });

  // Data queries
  const { data: dashboardData, isLoading: isDashboardLoading } = useQuery({
    queryKey: ['/api/admin/dashboard'],
    enabled: isAuthenticated,
    retry: false,
    refetchInterval: 30000
  });

  // Global Admin specific data queries
  const { data: merchantStats } = useQuery({
    queryKey: ['/api/admin/merchant-stats'],
    enabled: isAuthenticated,
    queryFn: async () => {
      const res = await fetch('/api/admin/merchant-stats', {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('globalAdminToken')}` }
      });
      if (!res.ok) throw new Error('Failed to fetch merchant stats');
      return res.json();
    }
  });

  const { data: customerStats } = useQuery({
    queryKey: ['/api/admin/customer-stats'],
    enabled: isAuthenticated,
    queryFn: async () => {
      const res = await fetch('/api/admin/customer-stats', {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('globalAdminToken')}` }
      });
      if (!res.ok) throw new Error('Failed to fetch customer stats');
      return res.json();
    }
  });

  const { data: rewardStats } = useQuery({
    queryKey: ['/api/admin/reward-stats'],
    enabled: isAuthenticated,
    queryFn: async () => {
      const res = await fetch('/api/admin/reward-stats', {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('globalAdminToken')}` }
      });
      if (!res.ok) throw new Error('Failed to fetch reward stats');
      return res.json();
    }
  });

  const { data: withdrawalStats } = useQuery({
    queryKey: ['/api/admin/withdrawal-stats'],
    enabled: isAuthenticated,
    queryFn: async () => {
      const res = await fetch('/api/admin/withdrawal-stats', {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('globalAdminToken')}` }
      });
      if (!res.ok) throw new Error('Failed to fetch withdrawal stats');
      return res.json();
    }
  });

  const { data: topCustomers } = useQuery({
    queryKey: ['/api/admin/top-customers'],
    enabled: isAuthenticated,
    queryFn: async () => {
      const res = await fetch('/api/admin/top-customers', {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('globalAdminToken')}` }
      });
      if (!res.ok) throw new Error('Failed to fetch top customers');
      return res.json();
    }
  });

  const { data: globalMerchants } = useQuery({
    queryKey: ['/api/admin/global-merchants'],
    enabled: isAuthenticated,
    queryFn: async () => {
      const res = await fetch('/api/admin/global-merchants', {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('globalAdminToken')}` }
      });
      if (!res.ok) throw new Error('Failed to fetch global merchants');
      return res.json();
    }
  });

  const { data: globalCustomers } = useQuery({
    queryKey: ['/api/admin/global-customers'],
    enabled: isAuthenticated,
    queryFn: async () => {
      const res = await fetch('/api/admin/global-customers', {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('globalAdminToken')}` }
      });
      if (!res.ok) throw new Error('Failed to fetch global customers');
      return res.json();
    }
  });

  // Get local admins from database
  const { data: localAdminsFromDB } = useQuery({
    queryKey: ['/api/admin/admins'],
    enabled: isAuthenticated,
    retry: false
  });

  // Use local admins from database for dropdown
  const adminsList = localAdminsFromDB || [];

  const { data: chatUsers } = useQuery({
    queryKey: ['/api/admin/chat-users'],
    enabled: isAuthenticated,
    retry: false
  });

  // Real-time admin balance from database
  const { data: adminBalance, refetch: refetchBalance } = useQuery({
    queryKey: ['/api/admin/balance'],
    enabled: isAuthenticated,
    refetchInterval: 30000, // Poll every 30 seconds
    retry: false,
    staleTime: 0, // Always fetch fresh data
    cacheTime: 0 // Don't cache the results
  });

  // Infinity Rewards from cycles
  const { data: infinityRewards } = useQuery({
    queryKey: ['/api/admin/global/infinity-rewards'],
    enabled: isAuthenticated,
    refetchInterval: 60000 // Refresh every minute
  });

  // Shopping Vouchers overview
  const { data: shoppingVouchers } = useQuery({
    queryKey: ['/api/admin/global/shopping-vouchers'],
    enabled: isAuthenticated,
    refetchInterval: 60000 // Refresh every minute
  });

  // Listen for storage/custom events to force immediate refresh
  useStorageListener(['/api/admin/balance','/api/admin/dashboard']);

  // Transaction history from database
  const { data: transactionHistory, refetch: refetchTransactions } = useQuery({
    queryKey: ['/api/admin/transactions'],
    enabled: isAuthenticated,
    refetchInterval: 30000, // Poll every 30 seconds
    retry: false
  });

  // Global Analytics Data
  const { data: globalAnalytics, isLoading: analyticsLoading } = useQuery({
    queryKey: ['/api/admin/global/analytics', timeFilter],
    enabled: isAuthenticated,
    refetchInterval: 60000, // Refresh every minute
    queryFn: async () => {
      const token = localStorage.getItem('globalAdminToken');
      if (!token) throw new Error('No authentication token');
      
      const response = await fetch(`/api/admin/global/analytics?period=${timeFilter}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch analytics data');
      }
      
      return response.json();
    }
  });

  // Point generation mutation (global admin only)
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
        const error = await response.json();
        throw new Error(error.message || 'Failed to generate points');
      }
      
      return response.json();
    },
    onSuccess: (data) => {
      toast({ 
        title: "Points Generated Successfully", 
        description: `${data.points?.toLocaleString()} points added to your balance` 
      });
      
      // Refresh balance and transaction history
      refetchBalance();
      refetchTransactions();
      queryClient.invalidateQueries({ queryKey: ['/api/admin/dashboard'] });
      
      setAddPointsForm({ points: "", description: "" });
    },
    onError: (error: Error) => {
      toast({ title: "Point Generation Failed", description: error.message, variant: "destructive" });
    }
  });

  // Remove localStorage dependency - now using database

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
        const error = await response.json();
        throw new Error(error.message || 'Failed to distribute points');
      }
      
      return response.json();
    },
    onSuccess: (data) => {
      toast({ 
        title: "Points Distributed Successfully", 
        description: `${data.distribution?.points?.toLocaleString()} points distributed. Remaining balance: ${data.remainingBalance?.toLocaleString()}` 
      });
      
      // Refresh my balance and dashboard
      refetchBalance();
      refetchTransactions();
      queryClient.invalidateQueries({ queryKey: ['/api/admin/dashboard'] });
      
      // Notify other tabs (e.g., local admin) to refresh immediately
      window.dispatchEvent(new CustomEvent('dataUpdate'));
      localStorage.setItem('lastAdminUpdate', Date.now().toString());
      
      setDistributePointsForm({ toUserId: "", points: "", description: "" });
    },
    onError: (error: Error) => {
      toast({ title: "Point Distribution Failed", description: error.message, variant: "destructive" });
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
    // Navigate to main home page
    window.location.href = "/";
  };

  // Password reset functions
  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!forgotPasswordForm.email) {
      toast({ title: "Error", description: "Please enter your email address", variant: "destructive" });
      return;
    }
    
    if (verificationMethod === 'phone' && !forgotPasswordForm.phone) {
      toast({ title: "Error", description: "Please enter your phone number", variant: "destructive" });
      return;
    }
    
    setForgotPasswordLoading(true);
    try {
      const response = await fetch('/api/admin/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          email: forgotPasswordForm.email,
          phone: forgotPasswordForm.phone,
          method: verificationMethod
        })
      });
      
      if (response.ok) {
        setVerificationSent(true);
        setForgotPasswordStep('verification');
        toast({ title: "Success", description: `Verification code sent to your ${verificationMethod}` });
      } else {
        const errorData = await response.json();
        toast({ title: "Error", description: errorData.message || "Failed to send verification code", variant: "destructive" });
      }
    } catch (error) {
      toast({ title: "Error", description: "Network error. Please try again.", variant: "destructive" });
    } finally {
      setForgotPasswordLoading(false);
    }
  };

  const handleVerification = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!forgotPasswordForm.verificationCode) {
      toast({ title: "Error", description: "Please enter the verification code", variant: "destructive" });
      return;
    }
    
    setVerificationLoading(true);
    try {
      const response = await fetch('/api/admin/verify-reset-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          email: forgotPasswordForm.email,
          phone: forgotPasswordForm.phone,
          code: forgotPasswordForm.verificationCode,
          method: verificationMethod
        })
      });
      
      if (response.ok) {
        setForgotPasswordStep('reset');
        toast({ title: "Success", description: "Code verified. Please set your new password." });
      } else {
        const errorData = await response.json();
        toast({ title: "Error", description: errorData.message || "Invalid verification code", variant: "destructive" });
      }
    } catch (error) {
      toast({ title: "Error", description: "Network error. Please try again.", variant: "destructive" });
    } finally {
      setVerificationLoading(false);
    }
  };

  const handlePasswordReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (forgotPasswordForm.newPassword !== forgotPasswordForm.confirmPassword) {
      toast({ title: "Error", description: "Passwords do not match", variant: "destructive" });
      return;
    }
    
    if (forgotPasswordForm.newPassword.length < 8) {
      toast({ title: "Error", description: "Password must be at least 8 characters long", variant: "destructive" });
      return;
    }
    
    setResetLoading(true);
    try {
      const response = await fetch('/api/admin/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          email: forgotPasswordForm.email,
          phone: forgotPasswordForm.phone,
          code: forgotPasswordForm.verificationCode,
          newPassword: forgotPasswordForm.newPassword,
          method: verificationMethod
        })
      });
      
      if (response.ok) {
        toast({ title: "Success", description: "Password reset successfully. Please login with your new password." });
        setShowForgotPassword(false);
        setForgotPasswordStep('email');
        setForgotPasswordForm({
          email: "",
          phone: "",
          verificationCode: "",
          newPassword: "",
          confirmPassword: ""
        });
        setVerificationSent(false);
      } else {
        toast({ title: "Error", description: "Failed to reset password", variant: "destructive" });
      }
    } catch (error) {
      toast({ title: "Error", description: "Network error. Please try again.", variant: "destructive" });
    } finally {
      setResetLoading(false);
    }
  };

  const resetForgotPasswordFlow = () => {
    setShowForgotPassword(false);
    setForgotPasswordStep('email');
    setForgotPasswordForm({
      email: "",
      phone: "",
      verificationCode: "",
      newPassword: "",
      confirmPassword: ""
    });
    setVerificationSent(false);
  };

  // Export functionality
  const exportData = (format: 'csv' | 'excel' | 'pdf') => {
    if (!transactionHistory?.transactions) {
      toast({
        title: "No data to export",
        description: "There are no transactions to export.",
        variant: "destructive",
      });
      return;
    }

    const transactions = transactionHistory.transactions;
    const timestamp = new Date().toISOString().split('T')[0];
    
    if (format === 'csv') {
      const headers = ['Date', 'Type', 'Description', 'Amount', 'Balance After', 'Status'];
      const csvContent = [
        headers.join(','),
        ...transactions.map(t => [
          new Date(t.createdAt).toLocaleString(),
          t.type === 'credit' ? 'Generated' : 'Distributed',
          `"${t.description || 'No description'}"`,
          t.amount || 0,
          t.balanceAfter || 0,
          'Completed'
        ].join(','))
      ].join('\n');
      
      const blob = new Blob([csvContent], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `point-history-${timestamp}.csv`;
      a.click();
      window.URL.revokeObjectURL(url);
    } else if (format === 'excel') {
      const headers = ['Date', 'Type', 'Description', 'Amount', 'Balance After', 'Status'];
      const csvContent = [
        headers.join('\t'),
        ...transactions.map(t => [
          new Date(t.createdAt).toLocaleString(),
          t.type === 'credit' ? 'Generated' : 'Distributed',
          t.description || 'No description',
          t.amount || 0,
          t.balanceAfter || 0,
          'Completed'
        ].join('\t'))
      ].join('\n');
      
      const blob = new Blob([csvContent], { type: 'application/vnd.ms-excel' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `point-history-${timestamp}.xls`;
      a.click();
      window.URL.revokeObjectURL(url);
    } else if (format === 'pdf') {
      const printWindow = window.open('', '_blank');
      if (printWindow) {
        const htmlContent = `
          <html>
            <head>
              <title>Point History Report</title>
              <style>
                body { font-family: Arial, sans-serif; margin: 20px; }
                table { width: 100%; border-collapse: collapse; margin-top: 20px; }
                th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
                th { background-color: #f2f2f2; }
                .header { text-align: center; margin-bottom: 20px; }
              </style>
            </head>
            <body>
              <div class="header">
                <h1>Point History Report</h1>
                <p>Generated on: ${new Date().toLocaleString()}</p>
              </div>
              <table>
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Type</th>
                    <th>Description</th>
                    <th>Amount</th>
                    <th>Balance After</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  ${transactions.map(t => `
                    <tr>
                      <td>${new Date(t.createdAt).toLocaleString()}</td>
                      <td>${t.type === 'credit' ? 'Generated' : 'Distributed'}</td>
                      <td>${t.description || 'No description'}</td>
                      <td>${t.amount || 0}</td>
                      <td>${t.balanceAfter || 0}</td>
                      <td>Completed</td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            </body>
          </html>
        `;
        printWindow.document.write(htmlContent);
        printWindow.document.close();
        printWindow.print();
      }
    }
    
    toast({
      title: "Export successful",
      description: `Point history exported as ${format.toUpperCase()} file.`,
    });
  };

  const handleAddPoints = () => {
    if (!addPointsForm.points || !addPointsForm.description) {
      toast({ title: "Error", description: "Please fill in all fields", variant: "destructive" });
      return;
    }
    
    const points = parseInt(addPointsForm.points);
    if (points <= 0) {
      toast({ title: "Error", description: "Points must be greater than 0", variant: "destructive" });
      return;
    }
    
    addPointsMutation.mutate({
      points: points,
      description: addPointsForm.description
    });
  };

  const handleDistributePoints = () => {
    if (!distributePointsForm.toUserId || !distributePointsForm.points || !distributePointsForm.description) {
      toast({ title: "Error", description: "Please fill in all fields", variant: "destructive" });
      return;
    }
    
    const points = parseInt(distributePointsForm.points);
    const availableBalance = (adminBalance as any)?.balance || 0;
    
    if (points <= 0) {
      toast({ title: "Error", description: "Points must be greater than 0", variant: "destructive" });
      return;
    }
    
    if (points > availableBalance) {
      toast({ 
        title: "Insufficient Balance", 
        description: `You only have ${availableBalance.toLocaleString()} points available. Please enter a lower amount.`,
        variant: "destructive" 
      });
      return;
    }
    
    distributePointsMutation.mutate({
      toUserId: distributePointsForm.toUserId,
      points: points,
      description: distributePointsForm.description
    });
  };

  // Show loading state while checking authentication
  if (authLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-lg shadow-2xl border-0">
          <CardContent className="p-8 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Verifying authentication...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Password Reset Forms - Check this BEFORE authentication check
  if (showForgotPassword) {
    console.log('Rendering password reset form');
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 via-white to-red-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-lg shadow-2xl border-0">
          <CardHeader className="text-center bg-gradient-to-r from-red-600 to-red-500 text-white rounded-t-lg">
            <div className="w-20 h-20 bg-white rounded-full mx-auto mb-4 flex items-center justify-center shadow-lg">
              <img 
                src="/images/holyloy-logo.png" 
                alt="HOLYLOY Logo" 
                className="w-14 h-14 object-contain"
              />
            </div>
            <CardTitle className="text-3xl font-bold">
              {forgotPasswordStep === 'email' && 'Reset Password'}
              {forgotPasswordStep === 'verification' && 'Verify Code'}
              {forgotPasswordStep === 'reset' && 'Set New Password'}
            </CardTitle>
            <p className="text-red-100">
              {forgotPasswordStep === 'email' && 'Enter your email to receive verification code'}
              {forgotPasswordStep === 'verification' && 'Enter the verification code sent to your email'}
              {forgotPasswordStep === 'reset' && 'Create a new secure password'}
            </p>
          </CardHeader>
          <CardContent className="p-8">
            {forgotPasswordStep === 'email' && (
              <form onSubmit={handleForgotPassword} className="space-y-6">
                <div>
                  <Label className="text-sm font-semibold text-gray-700">Verification Method</Label>
                  <div className="mt-2 flex space-x-4">
                    <Button
                      type="button"
                      variant={verificationMethod === 'email' ? 'default' : 'outline'}
                      onClick={() => setVerificationMethod('email')}
                      className={`flex-1 ${verificationMethod === 'email' ? 'bg-red-600 text-white hover:bg-red-700' : 'border-red-200 text-red-600 hover:bg-red-50'}`}
                    >
                      📧 Email
                    </Button>
                    <Button
                      type="button"
                      variant={verificationMethod === 'phone' ? 'default' : 'outline'}
                      onClick={() => setVerificationMethod('phone')}
                      className={`flex-1 ${verificationMethod === 'phone' ? 'bg-red-600 text-white hover:bg-red-700' : 'border-red-200 text-red-600 hover:bg-red-50'}`}
                    >
                      📱 SMS
                    </Button>
                  </div>
                </div>

                <div>
                  <Label htmlFor="reset-email" className="text-sm font-semibold text-gray-700">
                    {verificationMethod === 'email' ? 'Email Address' : 'Phone Number'}
                  </Label>
                  {verificationMethod === 'email' ? (
                    <Input
                      id="reset-email"
                      type="email"
                      value={forgotPasswordForm.email}
                      onChange={(e) => setForgotPasswordForm({...forgotPasswordForm, email: e.target.value})}
                      className="mt-1"
                      placeholder="Enter your email address"
                      required
                    />
                  ) : (
                    <Input
                      id="reset-phone"
                      type="tel"
                      value={forgotPasswordForm.phone}
                      onChange={(e) => setForgotPasswordForm({...forgotPasswordForm, phone: e.target.value})}
                      className="mt-1"
                      placeholder="Enter your phone number"
                      required
                    />
                  )}
                </div>

                <div className="flex space-x-3">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={resetForgotPasswordFlow}
                    className="flex-1 border-red-200 text-red-600 hover:bg-red-50"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    className="flex-1 bg-red-600 text-white hover:bg-red-700"
                    disabled={forgotPasswordLoading}
                  >
                    {forgotPasswordLoading ? "Sending..." : "Send Verification Code"}
                  </Button>
                </div>
              </form>
            )}

            {forgotPasswordStep === 'verification' && (
              <form onSubmit={handleVerification} className="space-y-6">
                <div>
                  <Label htmlFor="verification-code" className="text-sm font-semibold text-gray-700">
                    Verification Code
                  </Label>
                  <Input
                    id="verification-code"
                    type="text"
                    value={forgotPasswordForm.verificationCode}
                    onChange={(e) => setForgotPasswordForm({...forgotPasswordForm, verificationCode: e.target.value})}
                    className="mt-1"
                    placeholder="Enter the 6-digit code"
                    maxLength={6}
                    required
                  />
                  <p className="text-sm text-gray-500 mt-1">
                    Enter the verification code sent to {verificationMethod === 'email' ? forgotPasswordForm.email : forgotPasswordForm.phone}
                  </p>
                </div>

                <div className="flex space-x-3">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setForgotPasswordStep('email')}
                    className="flex-1 border-red-200 text-red-600 hover:bg-red-50"
                  >
                    Back
                  </Button>
                  <Button
                    type="submit"
                    className="flex-1 bg-red-600 text-white hover:bg-red-700"
                    disabled={verificationLoading}
                  >
                    {verificationLoading ? "Verifying..." : "Verify Code"}
                  </Button>
                </div>
              </form>
            )}

            {forgotPasswordStep === 'reset' && (
              <form onSubmit={handlePasswordReset} className="space-y-6">
                <div>
                  <Label htmlFor="new-password" className="text-sm font-semibold text-gray-700">
                    New Password
                  </Label>
                  <Input
                    id="new-password"
                    type="password"
                    value={forgotPasswordForm.newPassword}
                    onChange={(e) => setForgotPasswordForm({...forgotPasswordForm, newPassword: e.target.value})}
                    className="mt-1"
                    placeholder="Enter your new password"
                    required
                    minLength={8}
                  />
                </div>

                <div>
                  <Label htmlFor="confirm-password" className="text-sm font-semibold text-gray-700">
                    Confirm New Password
                  </Label>
                  <Input
                    id="confirm-password"
                    type="password"
                    value={forgotPasswordForm.confirmPassword}
                    onChange={(e) => setForgotPasswordForm({...forgotPasswordForm, confirmPassword: e.target.value})}
                    className="mt-1"
                    placeholder="Confirm your new password"
                    required
                    minLength={8}
                  />
                </div>

                <Button
                  type="submit"
                  className="w-full bg-red-600 text-white hover:bg-red-700"
                  disabled={resetLoading}
                >
                  {resetLoading ? "Resetting Password..." : "Reset Password"}
                </Button>
              </form>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 via-white to-red-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-lg shadow-2xl border-0">
          <CardHeader className="text-center bg-gradient-to-r from-red-600 to-red-500 text-white rounded-t-lg">
            <div className="w-20 h-20 bg-white rounded-full mx-auto mb-4 flex items-center justify-center shadow-lg">
              <img 
                src="/images/holyloy-logo.png" 
                alt="HOLYLOY Logo" 
                className="w-14 h-14 object-contain"
              />
            </div>
            <CardTitle className="text-3xl font-bold">Global Admin Portal</CardTitle>
            <p className="text-red-100">Holyloy Global Administration</p>
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
                  placeholder="tkhanishan@gmail.com"
                  className="mt-2 h-12 w-full"
                  required
                  data-testid="input-global-admin-email"
                />
              </div>
              
              <div>
                <Label htmlFor="password" className="text-sm font-semibold text-gray-700">Password</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    value={loginForm.password}
                    onChange={(e) => setLoginForm({...loginForm, password: e.target.value})}
                    placeholder="Enter your secure password"
                    className="mt-2 h-12 w-full pr-10"
                    required
                    data-testid="input-global-admin-password"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-2 h-full px-3 hover:bg-transparent"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4 text-gray-400" />
                    ) : (
                      <Eye className="h-4 w-4 text-gray-400" />
                    )}
                  </Button>
                </div>
              </div>

              <Button 
                type="submit" 
                className="w-full h-12 bg-gradient-to-r from-red-600 to-red-500 hover:from-red-700 hover:to-red-600 text-white font-semibold text-lg"
                disabled={loginMutation.isPending}
                data-testid="button-global-admin-login"
              >
                {loginMutation.isPending ? "Authenticating..." : "Access Global Portal"}
              </Button>
            </form>
            
            <div className="mt-4 text-center">
              <Button
                type="button"
                variant="link"
                className="text-red-600 hover:text-red-700 font-medium"
                onClick={() => {
                  console.log('Forgot Password button clicked');
                  setShowForgotPassword(true);
                  console.log('showForgotPassword set to true');
                }}
                data-testid="button-forgot-password"
              >
                Forgot Password?
              </Button>
            </div>
            
            <div className="mt-6 text-center text-sm text-gray-500">
              <p>Test Credentials:</p>
              <p>Email: tkhanishan@gmail.com</p>
              <p>Password: holyloy123</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <NotificationProvider 
      currentUser={currentUser ? {
        id: currentUser.id,
        token: localStorage.getItem('globalAdminToken') || '',
        role: currentUser.role
      } : undefined}
    >
      <div className="min-h-screen bg-gradient-to-br from-white via-red-50 to-white">
      {/* Header */}
      <div className="komarce-nav">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className="lg:hidden"
              >
                <Menu className="w-5 h-5" />
              </Button>
              <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center shadow-md border border-gray-200">
                <img 
                  src="/images/holyloy-logo.png" 
                  alt="HOLYLOY Logo" 
                  className="w-6 h-6 object-contain"
                />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">Global Admin Portal</h1>
                <p className="text-sm text-gray-500">Holyloy Global Administration</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              {/* Message Icon */}
              <NotificationWrapper badgeProps={{ type: 'messages' }}>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setActiveTab("chat")}
                  className="relative"
                >
                  <MessageCircle className="w-5 h-5 text-gray-600" />
                </Button>
              </NotificationWrapper>
              
              <div className="flex items-center space-x-2 text-sm text-gray-600">
                <span>{currentUser?.firstName} {currentUser?.lastName}</span>
              </div>
              
              <Button 
                onClick={handleLogout} 
                variant="default" 
                size="sm" 
                className="bg-red-600 hover:bg-red-700 text-white flex items-center"
                data-testid="button-global-admin-logout"
              >
                <LogOut className="w-4 h-4 mr-2" />
                Logout
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="flex">
        {/* Sidebar */}
        <div className={`${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} fixed inset-y-0 left-0 z-50 w-64 bg-white shadow-lg transform transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static lg:inset-0`}>
          <div className="flex items-center justify-between h-16 px-4 border-b">
            <h2 className="text-lg font-semibold text-gray-900">Navigation</h2>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSidebarOpen(false)}
              className="lg:hidden"
            >
              <XIcon className="w-5 h-5" />
            </Button>
          </div>
          
          <ScrollArea className="h-[calc(100vh-4rem)]">
            <nav className="p-4 space-y-2 text-gray-700">
              <Button
                variant={activeTab === "dashboard" ? "default" : "ghost"}
                className={`w-full justify-start transition-colors duration-200 ${
                  activeTab === "dashboard" 
                    ? "bg-red-600 text-white hover:bg-red-700" 
                    : "text-gray-700 hover:bg-red-50 hover:text-red-600"
                }`}
                onClick={() => setActiveTab("dashboard")}
              >
                <BarChart3 className={`w-4 h-4 mr-2 ${activeTab === "dashboard" ? "text-white" : "text-gray-600"}`} />
                Dashboard Overview
              </Button>
              
              <Button
                variant={activeTab === "merchants" ? "default" : "ghost"}
                className={`w-full justify-start transition-colors duration-200 ${
                  activeTab === "merchants" 
                    ? "bg-red-600 text-white hover:bg-red-700" 
                    : "text-gray-700 hover:bg-red-50 hover:text-red-600"
                }`}
                onClick={() => setActiveTab("merchants")}
              >
                <Building2 className={`w-4 h-4 mr-2 ${activeTab === "merchants" ? "text-white" : "text-gray-600"}`} />
                Global Merchants
              </Button>
              
              <Button
                variant={activeTab === "customers" ? "default" : "ghost"}
                className={`w-full justify-start transition-colors duration-200 ${
                  activeTab === "customers" 
                    ? "bg-red-600 text-white hover:bg-red-700" 
                    : "text-gray-700 hover:bg-red-50 hover:text-red-600"
                }`}
                onClick={() => setActiveTab("customers")}
              >
                <Users className={`w-4 h-4 mr-2 ${activeTab === "customers" ? "text-white" : "text-gray-600"}`} />
                Global Customers
              </Button>
              
              <Button
                variant={activeTab === "cofounder-staff" ? "default" : "ghost"}
                className={`w-full justify-start transition-colors duration-200 ${
                  activeTab === "cofounder-staff" 
                    ? "bg-red-600 text-white hover:bg-red-700" 
                    : "text-gray-700 hover:bg-red-50 hover:text-red-600"
                }`}
                onClick={() => setActiveTab("cofounder-staff")}
              >
                <UserCheck className={`w-4 h-4 mr-2 ${activeTab === "cofounder-staff" ? "text-white" : "text-gray-600"}`} />
                Co-Founder & Staff
              </Button>
              
              <Button
                variant={activeTab === "reward-points" ? "default" : "ghost"}
                className={`w-full justify-start transition-colors duration-200 ${
                  activeTab === "reward-points" 
                    ? "bg-red-600 text-white hover:bg-red-700" 
                    : "text-gray-700 hover:bg-red-50 hover:text-red-600"
                }`}
                onClick={() => setActiveTab("reward-points")}
              >
                <Award className={`w-4 h-4 mr-2 ${activeTab === "reward-points" ? "text-white" : "text-gray-600"}`} />
                Reward Points
              </Button>
              
              <Button
                variant={activeTab === "withdrawals" ? "default" : "ghost"}
                className={`w-full justify-start transition-colors duration-200 ${
                  activeTab === "withdrawals" 
                    ? "bg-red-600 text-white hover:bg-red-700" 
                    : "text-gray-700 hover:bg-red-50 hover:text-red-600"
                }`}
                onClick={() => setActiveTab("withdrawals")}
              >
                <CreditCard className={`w-4 h-4 mr-2 ${activeTab === "withdrawals" ? "text-white" : "text-gray-600"}`} />
                Withdrawals
              </Button>
              
              <Button
                variant={activeTab === "commission-settings" ? "default" : "ghost"}
                className={`w-full justify-start transition-colors duration-200 ${
                  activeTab === "commission-settings" 
                    ? "bg-red-600 text-white hover:bg-red-700" 
                    : "text-gray-700 hover:bg-red-50 hover:text-red-600"
                }`}
                onClick={() => setActiveTab("commission-settings")}
              >
                <Percent className={`w-4 h-4 mr-2 ${activeTab === "commission-settings" ? "text-white" : "text-gray-600"}`} />
                Commission Settings
              </Button>
              
              <Button
                variant={activeTab === "cashback-management" ? "default" : "ghost"}
                className={`w-full justify-start transition-colors duration-200 ${
                  activeTab === "cashback-management" 
                    ? "bg-red-600 text-white hover:bg-red-700" 
                    : "text-gray-700 hover:bg-red-50 hover:text-red-600"
                }`}
                onClick={() => setActiveTab("cashback-management")}
              >
                <DollarSign className={`w-4 h-4 mr-2 ${activeTab === "cashback-management" ? "text-white" : "text-gray-600"}`} />
                Cashback Management
              </Button>
              
              <Button
                variant={activeTab === "merchant-list" ? "default" : "ghost"}
                className={`w-full justify-start transition-colors duration-200 ${
                  activeTab === "merchant-list" 
                    ? "bg-red-600 text-white hover:bg-red-700" 
                    : "text-gray-700 hover:bg-red-50 hover:text-red-600"
                }`}
                onClick={() => setActiveTab("merchant-list")}
              >
                <Building className={`w-4 h-4 mr-2 ${activeTab === "merchant-list" ? "text-white" : "text-gray-600"}`} />
                Merchant List
              </Button>
              
              <Button
                variant={activeTab === "customer-list" ? "default" : "ghost"}
                className={`w-full justify-start transition-colors duration-200 ${
                  activeTab === "customer-list" 
                    ? "bg-red-600 text-white hover:bg-red-700" 
                    : "text-gray-700 hover:bg-red-50 hover:text-red-600"
                }`}
                onClick={() => setActiveTab("customer-list")}
              >
                <Users className={`w-4 h-4 mr-2 ${activeTab === "customer-list" ? "text-white" : "text-gray-600"}`} />
                Customer List
              </Button>
              
              <Button
                variant={activeTab === "header-footer" ? "default" : "ghost"}
                className={`w-full justify-start transition-colors duration-200 ${
                  activeTab === "header-footer" 
                    ? "bg-red-600 text-white hover:bg-red-700" 
                    : "text-gray-700 hover:bg-red-50 hover:text-red-600"
                }`}
                onClick={() => setActiveTab("header-footer")}
              >
                <Globe className={`w-4 h-4 mr-2 ${activeTab === "header-footer" ? "text-white" : "text-gray-600"}`} />
                Header & Footer
              </Button>
              
              <Button
                variant={activeTab === "user-roles" ? "default" : "ghost"}
                className={`w-full justify-start transition-colors duration-200 ${
                  activeTab === "user-roles" 
                    ? "bg-red-600 text-white hover:bg-red-700" 
                    : "text-gray-700 hover:bg-red-50 hover:text-red-600"
                }`}
                onClick={() => setActiveTab("user-roles")}
              >
                <Shield className={`w-4 h-4 mr-2 ${activeTab === "user-roles" ? "text-white" : "text-gray-600"}`} />
                User Roles
              </Button>
              
              <Button
                variant={activeTab === "customer-care" ? "default" : "ghost"}
                className={`w-full justify-start transition-colors duration-200 ${
                  activeTab === "customer-care" 
                    ? "bg-red-600 text-white hover:bg-red-700" 
                    : "text-gray-700 hover:bg-red-50 hover:text-red-600"
                }`}
                onClick={() => setActiveTab("customer-care")}
              >
                <Headphones className={`w-4 h-4 mr-2 ${activeTab === "customer-care" ? "text-white" : "text-gray-600"}`} />
                Customer Care
              </Button>
              
              <Button
                variant={activeTab === "vat-service" ? "default" : "ghost"}
                className={`w-full justify-start transition-colors duration-200 ${
                  activeTab === "vat-service" 
                    ? "bg-red-600 text-white hover:bg-red-700" 
                    : "text-gray-700 hover:bg-red-50 hover:text-red-600"
                }`}
                onClick={() => setActiveTab("vat-service")}
              >
                <Calculator className={`w-4 h-4 mr-2 ${activeTab === "vat-service" ? "text-white" : "text-gray-600"}`} />
                VAT & Service Charge
              </Button>
              
              <Button
                variant={activeTab === "analytics" ? "default" : "ghost"}
                className={`w-full justify-start transition-colors duration-200 ${
                  activeTab === "analytics" 
                    ? "bg-red-600 text-white hover:bg-red-700" 
                    : "text-gray-700 hover:bg-red-50 hover:text-red-600"
                }`}
                onClick={() => setActiveTab("analytics")}
              >
                <BarChart className={`w-4 h-4 mr-2 ${activeTab === "analytics" ? "text-white" : "text-gray-600"}`} />
                Analytics & Reporting
              </Button>
              
              <Button
                variant={activeTab === "acquisition" ? "default" : "ghost"}
                className={`w-full justify-start transition-colors duration-200 ${
                  activeTab === "acquisition" 
                    ? "bg-red-600 text-white hover:bg-red-700" 
                    : "text-gray-700 hover:bg-red-50 hover:text-red-600"
                }`}
                onClick={() => setActiveTab("acquisition")}
              >
                <UserPlus className={`w-4 h-4 mr-2 ${activeTab === "acquisition" ? "text-white" : "text-gray-600"}`} />
                Acquisition Reports
              </Button>
              
              <Button
                variant={activeTab === "backup" ? "default" : "ghost"}
                className={`w-full justify-start transition-colors duration-200 ${
                  activeTab === "backup" 
                    ? "bg-red-600 text-white hover:bg-red-700" 
                    : "text-gray-700 hover:bg-red-50 hover:text-red-600"
                }`}
                onClick={() => setActiveTab("backup")}
              >
                <Database className={`w-4 h-4 mr-2 ${activeTab === "backup" ? "text-white" : "text-gray-600"}`} />
                Backup System
              </Button>
              
              <Button
                variant={activeTab === "nps" ? "default" : "ghost"}
                className={`w-full justify-start transition-colors duration-200 ${
                  activeTab === "nps" 
                    ? "bg-red-600 text-white hover:bg-red-700" 
                    : "text-gray-700 hover:bg-red-50 hover:text-red-600"
                }`}
                onClick={() => setActiveTab("nps")}
              >
                <StarIcon className={`w-4 h-4 mr-2 ${activeTab === "nps" ? "text-white" : "text-gray-600"}`} />
                NPS Setup
              </Button>
              
              <Button
                variant={activeTab === "generate-points" ? "default" : "ghost"}
                className={`w-full justify-start transition-colors duration-200 ${
                  activeTab === "generate-points" 
                    ? "bg-red-600 text-white hover:bg-red-700" 
                    : "text-gray-700 hover:bg-red-50 hover:text-red-600"
                }`}
                onClick={() => setActiveTab("generate-points")}
              >
              <Plus className={`w-4 h-4 mr-2 ${activeTab === "generate-points" ? "text-white" : "text-gray-600"}`} />
              Generate Points
              </Button>
              
              <Button
                variant={activeTab === "distribute" ? "default" : "ghost"}
                className={`w-full justify-start transition-colors duration-200 ${
                  activeTab === "distribute" 
                    ? "bg-red-600 text-white hover:bg-red-700" 
                    : "text-gray-700 hover:bg-red-50 hover:text-red-600"
                }`}
                onClick={() => setActiveTab("distribute")}
              >
              <DollarSign className={`w-4 h-4 mr-2 ${activeTab === "distribute" ? "text-white" : "text-gray-600"}`} />
              Distribute Points
              </Button>
              
              <NotificationWrapper badgeProps={{ type: 'custom', size: 'sm', count: pendingRequests?.length || 0 }}>
                <Button
                  variant={activeTab === "requests" ? "default" : "ghost"}
                  className={`w-full justify-start transition-colors duration-200 ${
                    activeTab === "requests" 
                      ? "bg-red-600 text-white hover:bg-red-700" 
                      : "text-gray-700 hover:bg-red-50 hover:text-red-600"
                  }`}
                  onClick={() => setActiveTab("requests")}
                >
                  <Send className={`w-4 h-4 mr-2 ${activeTab === "requests" ? "text-white" : "text-gray-600"}`} />
                  Manage Requests
                </Button>
              </NotificationWrapper>
              
              <NotificationWrapper badgeProps={{ type: 'messages' }}>
                <Button
                  variant={activeTab === "chat" ? "default" : "ghost"}
                  className={`w-full justify-start transition-colors duration-200 ${
                    activeTab === "chat" 
                      ? "bg-red-600 text-white hover:bg-red-700" 
                      : "text-gray-700 hover:bg-red-50 hover:text-red-600"
                  }`}
                  onClick={() => setActiveTab("chat")}
                >
                <MessageCircle className={`w-4 h-4 mr-2 ${activeTab === "chat" ? "text-white" : "text-gray-600"}`} />
                  Secure Chat
                </Button>
              </NotificationWrapper>
            </nav>
          </ScrollArea>
        </div>

        {/* Main Content */}
        <div className="flex-1 lg:ml-0">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            {/* Time Filter */}
            <div className="mb-6 flex justify-between items-center">
              <div className="flex space-x-2">
                <Button
                  variant={timeFilter === "daily" ? "default" : "outline"}
                  size="sm"
                  className={`${timeFilter === "daily" ? 'rounded-full px-4' : 'rounded-full px-4 text-gray-700'} `}
                  onClick={() => setTimeFilter("daily")}
                >
                  Daily
                </Button>
                <Button
                  variant={timeFilter === "weekly" ? "default" : "outline"}
                  size="sm"
                  className={`${timeFilter === "weekly" ? 'rounded-full px-4' : 'rounded-full px-4 text-gray-700'}`}
                  onClick={() => setTimeFilter("weekly")}
                >
                  Weekly
                </Button>
                <Button
                  variant={timeFilter === "monthly" ? "default" : "outline"}
                  size="sm"
                  className={`${timeFilter === "monthly" ? 'rounded-full px-4' : 'rounded-full px-4 text-gray-700'}`}
                  onClick={() => setTimeFilter("monthly")}
                >
                  Monthly
                </Button>
                <Button
                  variant={timeFilter === "yearly" ? "default" : "outline"}
                  size="sm"
                  className={`${timeFilter === "yearly" ? 'rounded-full px-4' : 'rounded-full px-4 text-gray-700'}`}
                  onClick={() => setTimeFilter("yearly")}
                >
                  Yearly
                </Button>
              </div>
              <Button
                variant="outline"
                size="sm"
                className="rounded-full px-4 text-gray-700 hover:text-red-600"
                onClick={() => queryClient.invalidateQueries()}
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Refresh
              </Button>
            </div>

            {/* Content based on active tab */}
            {activeTab === "dashboard" && (
              <div className="space-y-6">
                {/* Global Admin Balance Card - Prominent Display */}
                <Card className="border-2 border-green-200 bg-gradient-to-r from-green-50 to-emerald-50">
                  <CardContent className="p-8">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center mb-2">
                          <Crown className="w-6 h-6 text-green-600 mr-2" />
                          <h2 className="text-2xl font-bold text-green-800">Global Admin Balance</h2>
                        </div>
                        <p className="text-4xl font-bold text-green-600 mb-2">
                          {adminBalance?.balance ? adminBalance.balance.toLocaleString() : '0'} Points
                        </p>
                        <p className="text-green-700 text-lg">
                          Available for distribution to local admins
                        </p>
                        <div className="flex items-center mt-3 space-x-4">
                          <div className="flex items-center">
                            <div className="w-3 h-3 bg-green-500 rounded-full mr-2 animate-pulse"></div>
                            <span className="text-sm text-green-600 font-medium">Live Balance</span>
                          </div>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => refetchBalance()}
                            className="text-green-600 border-green-300 hover:bg-green-50"
                          >
                            <RefreshCw className="w-3 h-3 mr-1" />
                            Refresh
                          </Button>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Recent Balance Transactions */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      <TrendingUp className="w-5 h-5 mr-2" />
                      Recent Balance Activity
                    </CardTitle>
                    <CardDescription>
                      Latest point generation and distribution activities
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {transactionHistory?.transactions && transactionHistory.transactions.length > 0 ? (
                      <div className="space-y-3">
                        {transactionHistory.transactions.slice(0, 5).map((transaction: any) => (
                          <div key={transaction.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                            <div className="flex items-center">
                              {transaction.type === 'credit' ? (
                                <Plus className="w-4 h-4 text-green-600 mr-2" />
                              ) : (
                                <Send className="w-4 h-4 text-blue-600 mr-2" />
                              )}
                              <div>
                                <p className="font-medium text-gray-900">
                                  {transaction.type === 'credit' ? 'Points Generated' : 'Points Distributed'}
                                </p>
                                <p className="text-sm text-gray-500">
                                  {new Date(transaction.createdAt).toLocaleString()}
                                </p>
                              </div>
                            </div>
                            <div className="text-right">
                              <p className={`font-bold ${transaction.type === 'credit' ? 'text-green-600' : 'text-blue-600'}`}>
                                {transaction.type === 'credit' ? '+' : '-'}{transaction.amount?.toLocaleString() || '0'} Points
                              </p>
                              <p className="text-sm text-gray-500">
                                Balance: {transaction.balanceAfter?.toLocaleString() || '0'}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-8 text-gray-500">
                        <TrendingUp className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                        <p>No recent transactions</p>
                        <p className="text-sm">Generate or distribute points to see activity here</p>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Dashboard Overview Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                          <p className="text-sm font-medium text-gray-600">Total Global Merchants</p>
                      <p className="text-3xl font-bold text-blue-600">
                            {merchantStats?.totalMerchants || 0}
                          </p>
                          <p className="text-xs text-gray-500 mt-1">
                            {merchantStats?.regularMerchants || 0} Regular • {merchantStats?.eMerchants || 0} E-Merchants
                      </p>
                    </div>
                        <Building2 className="w-8 h-8 text-blue-500" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                          <p className="text-sm font-medium text-gray-600">Total Global Customers</p>
                      <p className="text-3xl font-bold text-green-600">
                            {customerStats?.totalCustomers || 0}
                          </p>
                          <p className="text-xs text-gray-500 mt-1">
                            {customerStats?.activeCustomers || 0} Active
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
                          <p className="text-sm font-medium text-gray-600">Reward Points</p>
                      <p className="text-3xl font-bold text-purple-600">
                            {rewardStats?.totalPoints || 0}
                          </p>
                          <p className="text-xs text-gray-500 mt-1">
                            {rewardStats?.distributedPoints || 0} Distributed
                      </p>
                    </div>
                        <Award className="w-8 h-8 text-purple-500" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                          <p className="text-sm font-medium text-gray-600">Withdrawal Amount</p>
                      <p className="text-3xl font-bold text-orange-600">
                            ${withdrawalStats?.totalWithdrawals || 0}
                          </p>
                          <p className="text-xs text-gray-500 mt-1">
                            {withdrawalStats?.pendingWithdrawals || 0} Pending
                      </p>
                    </div>
                        <CreditCard className="w-8 h-8 text-orange-500" />
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Infinity & Shopping Vouchers Row */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card className="border-2 border-yellow-200 bg-gradient-to-r from-yellow-50 to-amber-50">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-yellow-700">Infinity Rewards Earned</p>
                      <p className="text-3xl font-bold text-yellow-600">
                        {infinityRewards?.totalRewards?.toLocaleString() || 0} Points
                      </p>
                      <p className="text-xs text-yellow-600 mt-1">
                        From {infinityRewards?.count || 0} infinity cycles
                      </p>
                    </div>
                    <Award className="w-8 h-8 text-yellow-500" />
                  </div>
                </CardContent>
              </Card>

              <Card className="border-2 border-blue-200 bg-gradient-to-r from-blue-50 to-cyan-50">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-blue-700">Shopping Vouchers</p>
                      <p className="text-3xl font-bold text-blue-600">
                        {shoppingVouchers?.totalVoucherValue?.toLocaleString() || 0} Points
                      </p>
                      <p className="text-xs text-blue-600 mt-1">
                        {shoppingVouchers?.activeVouchers || 0} active • {shoppingVouchers?.totalVouchers || 0} total
                      </p>
                    </div>
                    <CreditCard className="w-8 h-8 text-blue-500" />
                  </div>
                </CardContent>
              </Card>
            </div>

                {/* Top 10 Customers Leaderboard */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      <Star className="w-5 h-5 mr-2" />
                      Top 10 Customers Leaderboard
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Rank</TableHead>
                          <TableHead>Customer</TableHead>
                          <TableHead>Country</TableHead>
                          <TableHead>Points</TableHead>
                          <TableHead>Referrals</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {topCustomers?.slice(0, 10).map((customer: any, index: number) => (
                          <TableRow key={customer.id}>
                            <TableCell>
                              <Badge variant={index < 3 ? "default" : "secondary"}>
                                #{index + 1}
                              </Badge>
                            </TableCell>
                            <TableCell>{customer.firstName} {customer.lastName}</TableCell>
                            <TableCell>{customer.country}</TableCell>
                            <TableCell>{customer.totalPoints?.toLocaleString() || 0}</TableCell>
                            <TableCell>{customer.referralCount || 0}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>

                {/* Country-wise Statistics */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <Card>
                    <CardHeader>
                      <CardTitle>Country-wise Merchant Distribution</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        {merchantStats?.countryStats?.map((stat: any) => (
                          <div key={stat.country} className="flex justify-between items-center">
                            <span className="font-medium">{stat.country}</span>
                            <div className="flex items-center space-x-2">
                              <div className="w-32 bg-gray-200 rounded-full h-2">
                                <div 
                                  className="bg-blue-600 h-2 rounded-full" 
                                  style={{ width: `${(stat.count / (merchantStats?.totalMerchants || 1)) * 100}%` }}
                                ></div>
                              </div>
                              <span className="text-sm text-gray-600">{stat.count}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle>Country-wise Customer Distribution</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        {customerStats?.countryStats?.map((stat: any) => (
                          <div key={stat.country} className="flex justify-between items-center">
                            <span className="font-medium">{stat.country}</span>
                            <div className="flex items-center space-x-2">
                              <div className="w-32 bg-gray-200 rounded-full h-2">
                                <div 
                                  className="bg-green-600 h-2 rounded-full" 
                                  style={{ width: `${(stat.count / (customerStats?.totalCustomers || 1)) * 100}%` }}
                                ></div>
                              </div>
                              <span className="text-sm text-gray-600">{stat.count}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </div>
            )}

            {/* Analytics & Reporting Tab */}
            {activeTab === "analytics" && (
              <div className="space-y-6">
                {/* Time Period Selector */}
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-2xl font-bold text-gray-900">Analytics & Reporting Dashboard</h2>
                  <div className="flex space-x-2">
                    <Button 
                      variant={timeFilter === "daily" ? "default" : "outline"}
                      size="sm"
                      onClick={() => setTimeFilter("daily")}
                    >
                      Daily
                    </Button>
                    <Button 
                      variant={timeFilter === "weekly" ? "default" : "outline"}
                      size="sm"
                      onClick={() => setTimeFilter("weekly")}
                    >
                      Weekly
                    </Button>
                    <Button 
                      variant={timeFilter === "monthly" ? "default" : "outline"}
                      size="sm"
                      onClick={() => setTimeFilter("monthly")}
                    >
                      Monthly
                    </Button>
                    <Button 
                      variant={timeFilter === "yearly" ? "default" : "outline"}
                      size="sm"
                      onClick={() => setTimeFilter("yearly")}
                    >
                      Yearly
                    </Button>
                  </div>
                </div>

                {/* Global Analytics Metrics */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                  <Card className="bg-gradient-to-br from-blue-50 to-indigo-50 border-2 border-blue-200">
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-semibold text-blue-800">Global Sales</p>
                          <p className="text-3xl font-bold text-blue-900">
                            ${globalAnalytics?.totalSales?.toLocaleString() || '0'}
                          </p>
                          <p className="text-sm text-green-600">
                            +{globalAnalytics?.salesGrowth || 0}% vs last period
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
                            {globalAnalytics?.totalPointsDistributed?.toLocaleString() || '0'}
                          </p>
                          <p className="text-sm text-green-600">
                            +{globalAnalytics?.pointsGrowth || 0}% vs last period
                          </p>
                        </div>
                        <div className="p-3 bg-green-200 rounded-xl">
                          <Award className="w-8 h-8 text-green-700" />
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
                            {globalAnalytics?.totalSerialNumbers?.toLocaleString() || '0'}
                          </p>
                          <p className="text-sm text-green-600">
                            +{globalAnalytics?.serialGrowth || 0}% vs last period
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
                            ${globalAnalytics?.totalVATService?.toLocaleString() || '0'}
                          </p>
                          <p className="text-sm text-green-600">
                            +{globalAnalytics?.vatGrowth || 0}% vs last period
                          </p>
                        </div>
                        <div className="p-3 bg-orange-200 rounded-xl">
                          <TrendingUp className="w-8 h-8 text-orange-700" />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Charts Section */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Global Sales Performance Chart */}
                  <Card className="bg-white/80 backdrop-blur-sm border-2 border-blue-200 shadow-xl">
                    <CardHeader>
                      <CardTitle className="text-xl font-bold text-gray-800">Global Sales Performance</CardTitle>
                      <p className="text-sm text-gray-600">Total sales to all merchants by period</p>
                    </CardHeader>
                    <CardContent>
                      {globalAnalytics?.chartData && globalAnalytics.chartData.length > 0 ? (
                        <div className="h-64">
                          <LineChart data={globalAnalytics.chartData}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="period" />
                            <YAxis />
                            <Tooltip />
                            <Legend />
                            <Line type="monotone" dataKey="globalSales" stroke="#3b82f6" strokeWidth={2} name="Global Sales" />
                          </LineChart>
                        </div>
                      ) : (
                        <div className="h-64 flex items-center justify-center text-gray-500">
                          <div className="text-center">
                            <BarChart className="w-12 h-12 mx-auto mb-2 text-gray-300" />
                            <p>Sales performance chart will be displayed here</p>
                            <p className="text-sm">Data: {globalAnalytics?.totalSales || 0} total sales</p>
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  {/* Points Distribution Chart */}
                  <Card className="bg-white/80 backdrop-blur-sm border-2 border-green-200 shadow-xl">
                    <CardHeader>
                      <CardTitle className="text-xl font-bold text-gray-800">Points Distribution</CardTitle>
                      <p className="text-sm text-gray-600">Reward points distributed by type</p>
                    </CardHeader>
                    <CardContent>
                      {globalAnalytics?.chartData && globalAnalytics.chartData.length > 0 ? (
                        <div className="h-64">
                          <LineChart data={globalAnalytics.chartData}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="period" />
                            <YAxis />
                            <Tooltip />
                            <Legend />
                            <Line type="monotone" dataKey="distributedPoints" stroke="#10b981" strokeWidth={2} name="Points Distributed" />
                          </LineChart>
                        </div>
                      ) : (
                        <div className="h-64 flex items-center justify-center text-gray-500">
                          <div className="text-center">
                            <Award className="w-12 h-12 mx-auto mb-2 text-gray-300" />
                            <p>Points distribution chart will be displayed here</p>
                            <p className="text-sm">Data: {globalAnalytics?.totalPointsDistributed || 0} points distributed</p>
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </div>

                {/* Point History Panel */}
                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="flex items-center">
                        <TrendingUp className="w-5 h-5 mr-2" />
                        Point History & Transactions
                      </CardTitle>
                      <div className="flex space-x-2">
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => exportData('csv')}
                          className="flex items-center"
                        >
                          <Download className="w-4 h-4 mr-2" />
                          Export CSV
                        </Button>
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => exportData('excel')}
                          className="flex items-center"
                        >
                          <Download className="w-4 h-4 mr-2" />
                          Export Excel
                        </Button>
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => exportData('pdf')}
                          className="flex items-center"
                        >
                          <Download className="w-4 h-4 mr-2" />
                          Export PDF
                        </Button>
                      </div>
                    </div>
                    <CardDescription>
                      Complete history of all point generation and distribution activities
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {transactionHistory?.transactions && transactionHistory.transactions.length > 0 ? (
                      <div className="space-y-3">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Date & Time</TableHead>
                              <TableHead>Type</TableHead>
                              <TableHead>Description</TableHead>
                              <TableHead>Amount</TableHead>
                              <TableHead>Status</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {transactionHistory.transactions.map((transaction: any) => (
                              <TableRow key={transaction.id}>
                                <TableCell className="font-medium">
                                  {new Date(transaction.createdAt).toLocaleString()}
                                </TableCell>
                                <TableCell>
                                  <Badge 
                                    variant={transaction.type === 'credit' ? 'default' : 'secondary'}
                                    className={transaction.type === 'credit' ? 'bg-green-100 text-green-800' : 'bg-blue-100 text-blue-800'}
                                  >
                                    {transaction.type === 'credit' ? 'Generated' : 'Distributed'}
                                  </Badge>
                                </TableCell>
                                <TableCell>{transaction.description || 'No description'}</TableCell>
                                <TableCell className={`font-semibold ${
                                  transaction.type === 'credit' ? 'text-green-600' : 'text-blue-600'
                                }`}>
                                  {transaction.type === 'credit' ? '+' : '-'}{transaction.amount?.toLocaleString() || '0'} Points
                                </TableCell>
                                <TableCell>
                                  <Badge variant="outline" className="bg-green-50 text-green-700">
                                    Completed
                                  </Badge>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    ) : (
                      <div className="text-center py-8 text-gray-500">
                        <TrendingUp className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                        <p>No transaction history available</p>
                        <p className="text-sm">Generate or distribute points to see activity here</p>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Country-wise Analytics */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <Card>
                    <CardHeader>
                      <CardTitle>Top Performing Countries</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        {globalAnalytics?.topCountries?.map((country: any, index: number) => (
                          <div key={country.name} className="flex justify-between items-center">
                            <div className="flex items-center">
                              <Badge variant={index < 3 ? "default" : "secondary"} className="mr-2">
                                #{index + 1}
                              </Badge>
                              <span className="font-medium">{country.name}</span>
                            </div>
                            <div className="text-right">
                              <p className="font-semibold">${country.sales?.toLocaleString() || 0}</p>
                              <p className="text-sm text-gray-500">{country.merchants || 0} merchants</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle>Merchant Performance</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        {globalAnalytics?.topMerchants?.map((merchant: any, index: number) => (
                          <div key={merchant.id} className="flex justify-between items-center">
                            <div className="flex items-center">
                              <Badge variant={index < 3 ? "default" : "secondary"} className="mr-2">
                                #{index + 1}
                              </Badge>
                              <span className="font-medium">{merchant.name}</span>
                            </div>
                            <div className="text-right">
                              <p className="font-semibold">${merchant.sales?.toLocaleString() || 0}</p>
                              <p className="text-sm text-gray-500">{merchant.country}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </div>
            )}

            {/* Global Merchants Tab */}
            {activeTab === "merchants" && (
              <div className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      <Building2 className="w-5 h-5 mr-2" />
                      Global Merchant Statistics
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      <div className="text-center p-4 bg-blue-50 rounded-lg">
                        <Building2 className="w-8 h-8 text-blue-600 mx-auto mb-2" />
                        <p className="text-2xl font-bold text-blue-600">{merchantStats?.regularMerchants || 0}</p>
                        <p className="text-sm text-gray-600">Regular Merchants</p>
                      </div>
                      <div className="text-center p-4 bg-green-50 rounded-lg">
                        <Building className="w-8 h-8 text-green-600 mx-auto mb-2" />
                        <p className="text-2xl font-bold text-green-600">{merchantStats?.eMerchants || 0}</p>
                        <p className="text-sm text-gray-600">E-Merchants</p>
                      </div>
                      <div className="text-center p-4 bg-purple-50 rounded-lg">
                        <Star className="w-8 h-8 text-purple-600 mx-auto mb-2" />
                        <p className="text-2xl font-bold text-purple-600">{merchantStats?.starMerchants || 0}</p>
                        <p className="text-sm text-gray-600">Star Merchants</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Merchant Tiers Distribution</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="flex justify-between items-center">
                        <span className="font-medium">Star Merchants</span>
                        <div className="flex items-center space-x-2">
                          <div className="w-32 bg-gray-200 rounded-full h-2">
                            <div 
                              className="bg-yellow-500 h-2 rounded-full" 
                              style={{ width: `${(merchantStats?.starMerchants || 0) / (merchantStats?.totalMerchants || 1) * 100}%` }}
                            ></div>
                          </div>
                          <span className="text-sm text-gray-600">{merchantStats?.starMerchants || 0}</span>
                        </div>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="font-medium">Double Star Merchants</span>
                        <div className="flex items-center space-x-2">
                          <div className="w-32 bg-gray-200 rounded-full h-2">
                            <div 
                              className="bg-orange-500 h-2 rounded-full" 
                              style={{ width: `${(merchantStats?.doubleStarMerchants || 0) / (merchantStats?.totalMerchants || 1) * 100}%` }}
                            ></div>
                          </div>
                          <span className="text-sm text-gray-600">{merchantStats?.doubleStarMerchants || 0}</span>
                        </div>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="font-medium">Triple Star Merchants</span>
                        <div className="flex items-center space-x-2">
                          <div className="w-32 bg-gray-200 rounded-full h-2">
                            <div 
                              className="bg-red-500 h-2 rounded-full" 
                              style={{ width: `${(merchantStats?.tripleStarMerchants || 0) / (merchantStats?.totalMerchants || 1) * 100}%` }}
                            ></div>
                          </div>
                          <span className="text-sm text-gray-600">{merchantStats?.tripleStarMerchants || 0}</span>
                        </div>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="font-medium">Executive Merchants</span>
                        <div className="flex items-center space-x-2">
                          <div className="w-32 bg-gray-200 rounded-full h-2">
                            <div 
                              className="bg-purple-500 h-2 rounded-full" 
                              style={{ width: `${(merchantStats?.executiveMerchants || 0) / (merchantStats?.totalMerchants || 1) * 100}%` }}
                            ></div>
                          </div>
                          <span className="text-sm text-gray-600">{merchantStats?.executiveMerchants || 0}</span>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Global Customers Tab */}
            {activeTab === "customers" && (
              <div className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      <Users className="w-5 h-5 mr-2" />
                      Global Customer Statistics
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="text-center p-4 bg-blue-50 rounded-lg">
                        <Users className="w-8 h-8 text-blue-600 mx-auto mb-2" />
                        <p className="text-2xl font-bold text-blue-600">{customerStats?.totalCustomers || 0}</p>
                        <p className="text-sm text-gray-600">Total Customers</p>
                      </div>
                      <div className="text-center p-4 bg-green-50 rounded-lg">
                        <UserCheck className="w-8 h-8 text-green-600 mx-auto mb-2" />
                        <p className="text-2xl font-bold text-green-600">{customerStats?.activeCustomers || 0}</p>
                        <p className="text-sm text-gray-600">Active Customers</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Top 10 Customers by Global Number</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Rank</TableHead>
                          <TableHead>Customer</TableHead>
                          <TableHead>Global Number</TableHead>
                          <TableHead>Country</TableHead>
                          <TableHead>Points</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {topCustomers?.slice(0, 10).map((customer: any, index: number) => (
                          <TableRow key={customer.id}>
                            <TableCell>
                              <Badge variant={index < 3 ? "default" : "secondary"}>
                                #{index + 1}
                              </Badge>
                            </TableCell>
                            <TableCell>{customer.firstName} {customer.lastName}</TableCell>
                            <TableCell>{customer.serialNumber || `SN-${customer.id.slice(0, 8)}`}</TableCell>
                            <TableCell>{customer.country}</TableCell>
                            <TableCell>{customer.totalPoints?.toLocaleString() || 0}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Manage Requests Tab */}
            {activeTab === "requests" && (
              <div className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Pending Point Generation Requests</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Date</TableHead>
                          <TableHead>Requester</TableHead>
                          <TableHead>Country</TableHead>
                          <TableHead>Points</TableHead>
                          <TableHead>Reason</TableHead>
                          <TableHead>Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {pendingRequests.map((r: any) => (
                          <TableRow key={r.id}>
                            <TableCell>{new Date(r.createdAt).toLocaleString()}</TableCell>
                            <TableCell>{r.requesterId?.slice(0,8)}</TableCell>
                            <TableCell>{r.requesterCountry}</TableCell>
                            <TableCell>{r.pointsRequested.toLocaleString()}</TableCell>
                            <TableCell>{r.reason || '-'}</TableCell>
                            <TableCell className="space-x-2">
                              <Button size="sm" onClick={() => approveMutation.mutate(r.id)}>
                                <Check className="w-4 h-4 mr-1" /> Approve
                              </Button>
                              <Button size="sm" variant="destructive" onClick={() => rejectMutation.mutate(r.id)}>
                                <X className="w-4 h-4 mr-1" /> Reject
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Commission & Percentage Settings Tab */}
            {activeTab === "commission-settings" && (
              <div className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      <Percent className="w-5 h-5 mr-2" />
                      Global Commission & Percentage Settings
                    </CardTitle>
                    <CardDescription>
                      Configure global commission rates and percentage settings. Confirm password before saving changes.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="bg-yellow-50 border border-yellow-200 p-4 rounded-lg">
                      <div className="flex items-center">
                        <AlertCircle className="w-5 h-5 text-yellow-600 mr-2" />
                        <div>
                          <p className="font-semibold text-yellow-800">Password Confirmation Required</p>
                          <p className="text-sm text-yellow-700">
                            You must confirm your password before saving any commission settings.
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                      {/* Customer Benefits */}
                      <Card>
                        <CardHeader>
                          <CardTitle className="text-lg">Customer Benefits</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                          <div className="space-y-2">
                            <Label>Stepup Reward (%)</Label>
                            <Input type="number" placeholder="5" />
                          </div>
                          <div className="space-y-2">
                            <Label>Infinity Reward (%)</Label>
                            <Input type="number" placeholder="10" />
                          </div>
                          <div className="space-y-2">
                            <Label>Affiliate Reward (%)</Label>
                            <Input type="number" placeholder="15" />
                          </div>
                          <div className="space-y-2">
                            <Label>Ripple Reward (%)</Label>
                            <Input type="number" placeholder="20" />
                          </div>
                          <div className="space-y-2">
                            <Label>Shopping Voucher (%)</Label>
                            <Input type="number" placeholder="25" />
                          </div>
                        </CardContent>
                      </Card>

                      {/* Merchant Benefits */}
                      <Card>
                        <CardHeader>
                          <CardTitle className="text-lg">Merchant Benefits</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                          <div className="space-y-2">
                            <Label>Instant Cashback (%)</Label>
                            <Input type="number" placeholder="3" />
                          </div>
                          <div className="space-y-2">
                            <Label>Affiliate Cashback (%)</Label>
                            <Input type="number" placeholder="5" />
                          </div>
                          <div className="space-y-2">
                            <Label>Profit Share Cashback (%)</Label>
                            <Input type="number" placeholder="7" />
                          </div>
                          <div className="space-y-2">
                            <Label>Shopping Voucher (%)</Label>
                            <Input type="number" placeholder="10" />
                          </div>
                          <div className="space-y-2">
                            <Label>Rank Incentive (%)</Label>
                            <Input type="number" placeholder="12" />
                          </div>
                        </CardContent>
                      </Card>

                      {/* Co-founder Benefits */}
                      <Card>
                        <CardHeader>
                          <CardTitle className="text-lg">Co-founder Benefits</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                          <div className="space-y-2">
                            <Label>Instant Cashback (%)</Label>
                            <Input type="number" placeholder="5" />
                          </div>
                          <div className="space-y-2">
                            <Label>Affiliate Cashback (%)</Label>
                            <Input type="number" placeholder="8" />
                          </div>
                          <div className="space-y-2">
                            <Label>Profit Share Cashback (%)</Label>
                            <Input type="number" placeholder="10" />
                          </div>
                          <div className="space-y-2">
                            <Label>Shopping Voucher (%)</Label>
                            <Input type="number" placeholder="15" />
                          </div>
                          <div className="space-y-2">
                            <Label>Rank Incentive (%)</Label>
                            <Input type="number" placeholder="18" />
                          </div>
                          <div className="space-y-2">
                            <Label>Partnership Commission (%)</Label>
                            <Input type="number" placeholder="20" />
                          </div>
                          <div className="space-y-2">
                            <Label>All Partnership Commission (%)</Label>
                            <Input type="number" placeholder="25" />
                          </div>
                        </CardContent>
                      </Card>
                    </div>

                    <div className="flex justify-end space-x-4">
                      <Button variant="outline">Reset to Default</Button>
                      <Button className="bg-blue-600 hover:bg-blue-700">
                        <Save className="w-4 h-4 mr-2" />
                        Save Settings
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Cashback Management Tab */}
            {activeTab === "cashback-management" && (
              <GlobalAdminCashbackManagement />
            )}

            {/* VAT & Service Charge Tab */}
            {activeTab === "vat-service" && (
              <div className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      <Calculator className="w-5 h-5 mr-2" />
                      Global VAT & Service Charge Management
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      <Card>
                        <CardHeader>
                          <CardTitle>Total Global VAT & Service Charge</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="space-y-4">
                            <div className="text-center p-4 bg-blue-50 rounded-lg">
                              <p className="text-2xl font-bold text-blue-600">$12,450.00</p>
                              <p className="text-sm text-gray-600">Total Global VAT</p>
                            </div>
                            <div className="text-center p-4 bg-green-50 rounded-lg">
                              <p className="text-2xl font-bold text-green-600">$8,230.00</p>
                              <p className="text-sm text-gray-600">Total Service Charge</p>
                            </div>
                            <div className="text-center p-4 bg-purple-50 rounded-lg">
                              <p className="text-2xl font-bold text-purple-600">$20,680.00</p>
                              <p className="text-sm text-gray-600">Combined Total</p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>

                      <Card>
                        <CardHeader>
                          <CardTitle>VAT & Service Charge by Country</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="space-y-4">
                            <div className="flex justify-between items-center">
                              <span className="font-medium">United States</span>
                              <div className="text-right">
                                <p className="text-sm font-semibold">$5,200.00</p>
                                <p className="text-xs text-gray-500">VAT: $3,100 • Service: $2,100</p>
                              </div>
                            </div>
                            <div className="flex justify-between items-center">
                              <span className="font-medium">United Kingdom</span>
                              <div className="text-right">
                                <p className="text-sm font-semibold">$4,800.00</p>
                                <p className="text-xs text-gray-500">VAT: $2,900 • Service: $1,900</p>
                              </div>
                            </div>
                            <div className="flex justify-between items-center">
                              <span className="font-medium">Canada</span>
                              <div className="text-right">
                                <p className="text-sm font-semibold">$3,200.00</p>
                                <p className="text-xs text-gray-500">VAT: $1,800 • Service: $1,400</p>
                              </div>
                            </div>
                            <div className="flex justify-between items-center">
                              <span className="font-medium">Australia</span>
                              <div className="text-right">
                                <p className="text-sm font-semibold">$2,900.00</p>
                                <p className="text-xs text-gray-500">VAT: $1,700 • Service: $1,200</p>
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </div>

                    <div className="flex space-x-2">
                      <Button variant="outline">Daily</Button>
                      <Button variant="outline">Weekly</Button>
                      <Button variant="default">Monthly</Button>
                      <Button variant="outline">Yearly</Button>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

          {/* Generate Points Tab */}
            {activeTab === "generate-points" && (
              <div className="space-y-6">
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
                      className="w-full bg-blue-600 hover:bg-blue-700"
                      data-testid="button-generate-points"
                    >
                      {addPointsMutation.isPending ? "Generating Points..." : "Generate Points"}
                    </Button>
                  </div>

                  <div className="space-y-4">
                    <div className="bg-green-50 border border-green-200 p-4 rounded-lg">
                      <h4 className="font-semibold text-green-800 mb-2">Current Balance</h4>
                      <p className="text-2xl font-bold text-green-600">
                        {adminBalance?.balance ? adminBalance.balance.toLocaleString() : '0'} Points
                      </p>
                      <p className="text-sm text-green-600 mt-1">Available for distribution</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
              </div>
            )}

          {/* Distribute Points Tab */}
            {activeTab === "distribute" && (
              <div className="space-y-6">
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
                        <SelectContent className="bg-white border border-gray-200 shadow-lg">
                          {adminsList?.map((admin: any) => (
                            <SelectItem 
                              key={admin.id || admin.userId} 
                              value={admin.id || admin.userId}
                              className="text-gray-900 hover:bg-blue-50 hover:text-blue-900 focus:bg-blue-50 focus:text-blue-900 cursor-pointer"
                            >
                              {admin.user?.firstName || admin.firstName} {admin.user?.lastName || admin.lastName} ({admin.user?.country || admin.country}) - {admin.user?.email || 'No email'}
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
                        {adminBalance ? (adminBalance as any).balance.toLocaleString() : 0} Points
                      </p>
                      <p className="text-sm text-blue-600 mt-1">Ready for distribution</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
              </div>
            )}

            {/* Global Merchant List Tab */}
            {activeTab === "merchant-list" && (
              <div className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      <Building className="w-5 h-5 mr-2" />
                      Global Merchant List & E-Merchant List
                    </CardTitle>
                    <CardDescription>
                      View and manage all global merchants with indication for E-merchants
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex justify-between items-center mb-4">
                      <div className="flex space-x-2">
                        <Input placeholder="Search merchants..." className="w-64" />
                        <Button variant="outline">
                          <Search className="w-4 h-4 mr-2" />
                          Search
                        </Button>
                      </div>
                      <div className="flex space-x-2">
                        <Button variant="outline">
                          <Filter className="w-4 h-4 mr-2" />
                          Filter
                        </Button>
                        <Button variant="outline">
                          <Download className="w-4 h-4 mr-2" />
                          Export
                        </Button>
                      </div>
                    </div>
                    
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Merchant</TableHead>
                          <TableHead>Type</TableHead>
                          <TableHead>Country</TableHead>
                          <TableHead>Tier</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {globalMerchants?.map((merchant: any) => (
                          <TableRow key={merchant.id}>
                            <TableCell>
                              <div>
                                <p className="font-medium">{merchant.businessName}</p>
                                <p className="text-sm text-gray-500">{merchant.contactEmail}</p>
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge variant={merchant.isEMerchant ? "default" : "secondary"}>
                                {merchant.isEMerchant ? "E-Merchant" : "Regular"}
                              </Badge>
                            </TableCell>
                            <TableCell>{merchant.country}</TableCell>
                            <TableCell>
                              <Badge variant="outline">
                                {merchant.tier || "Standard"}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <Badge variant={merchant.isActive ? "default" : "destructive"}>
                                {merchant.isActive ? "Active" : "Inactive"}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <div className="flex space-x-2">
                                <Button size="sm" variant="outline">
                                  <Eye className="w-4 h-4" />
                                </Button>
                                <Button size="sm" variant="outline">
                                  <Edit className="w-4 h-4" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Global Customer List Tab */}
            {activeTab === "customer-list" && (
              <div className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      <Users className="w-5 h-5 mr-2" />
                      Global Customer List
                    </CardTitle>
                    <CardDescription>
                      View and manage all global customers
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex justify-between items-center mb-4">
                      <div className="flex space-x-2">
                        <Input placeholder="Search customers..." className="w-64" />
                        <Button variant="outline">
                          <Search className="w-4 h-4 mr-2" />
                          Search
                        </Button>
                      </div>
                      <div className="flex space-x-2">
                        <Button variant="outline">
                          <Filter className="w-4 h-4 mr-2" />
                          Filter
                        </Button>
                        <Button variant="outline">
                          <Download className="w-4 h-4 mr-2" />
                          Export
                        </Button>
                      </div>
                    </div>
                    
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Customer</TableHead>
                          <TableHead>Global Number</TableHead>
                          <TableHead>Country</TableHead>
                          <TableHead>Points</TableHead>
                          <TableHead>Referrals</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {globalCustomers?.map((customer: any) => (
                          <TableRow key={customer.id}>
                            <TableCell>
                              <div>
                                <p className="font-medium">{customer.firstName} {customer.lastName}</p>
                                <p className="text-sm text-gray-500">{customer.email}</p>
                              </div>
                            </TableCell>
                            <TableCell>{customer.serialNumber || `SN-${customer.id.slice(0, 8)}`}</TableCell>
                            <TableCell>{customer.country}</TableCell>
                            <TableCell>{customer.totalPoints?.toLocaleString() || 0}</TableCell>
                            <TableCell>{customer.referralCount || 0}</TableCell>
                            <TableCell>
                              <Badge variant={customer.isActive ? "default" : "destructive"}>
                                {customer.isActive ? "Active" : "Inactive"}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <div className="flex space-x-2">
                                <Button size="sm" variant="outline">
                                  <Eye className="w-4 h-4" />
                                </Button>
                                <Button size="sm" variant="outline">
                                  <Edit className="w-4 h-4" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              </div>
            )}

          {/* Chat Tab */}
            {activeTab === "chat" && (
              <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <MessageCircle className="w-5 h-5 mr-2" />
                  Global Admin Secure Chat
                </CardTitle>
                <CardDescription>
                  Communicate with local administrators across all regions with end-to-end security
                </CardDescription>
              </CardHeader>
              <CardContent>
                {currentUser && (
                  <SecureChat 
                    currentUser={{
                      id: currentUser.id,
                      name: `${currentUser.firstName} ${currentUser.lastName}`,
                      role: currentUser.role,
                      token: localStorage.getItem('globalAdminToken') || ''
                    }}
                  />
                )}
              </CardContent>
            </Card>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
    </NotificationProvider>
  );
}