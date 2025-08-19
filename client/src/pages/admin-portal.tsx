import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { 
  Users, Crown, Globe, MapPin, Send, MessageCircle, 
  Plus, Settings, BarChart3, DollarSign, UserCheck,
  Shield, Award, Zap, TrendingUp, Phone, Mail,
  Calendar, Clock, CheckCircle, XCircle, AlertCircle
} from "lucide-react";
import { io, Socket } from "socket.io-client";

export default function AdminPortal() {
  const [adminType, setAdminType] = useState<"global" | "local" | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [socket, setSocket] = useState<Socket | null>(null);
  const [chatMessages, setChatMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [selectedChatUser, setSelectedChatUser] = useState<any>(null);
  const [showPointDistribution, setShowPointDistribution] = useState(false);
  const [showChatDialog, setShowChatDialog] = useState(false);
  
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Login form states
  const [loginForm, setLoginForm] = useState({
    email: "",
    password: "",
    adminType: "global" as "global" | "local"
  });

  // Initialize WebSocket connection
  useEffect(() => {
    if (isAuthenticated && currentUser) {
      const newSocket = io(`${window.location.protocol}//${window.location.host}`, {
        path: '/ws',
        query: { userId: currentUser.id }
      });

      newSocket.on('connect', () => {
        console.log('Connected to chat server');
      });

      newSocket.on('newMessage', (message) => {
        setChatMessages(prev => [...prev, message]);
      });

      newSocket.on('messageUpdate', (updatedMessage) => {
        setChatMessages(prev => 
          prev.map(msg => msg.id === updatedMessage.id ? updatedMessage : msg)
        );
      });

      setSocket(newSocket);

      return () => {
        newSocket.close();
      };
    }
  }, [isAuthenticated, currentUser]);

  // Fetch admin profile
  const { data: adminProfile } = useQuery({
    queryKey: ['/api/admin/profile'],
    enabled: isAuthenticated && currentUser?.role?.includes('admin'),
    retry: false
  });

  // Fetch point distributions
  const { data: pointDistributions } = useQuery({
    queryKey: ['/api/admin/point-distributions'],
    enabled: isAuthenticated && currentUser?.role?.includes('admin'),
    retry: false
  });

  // Fetch admins list (only for global admin)
  const { data: adminsList } = useQuery({
    queryKey: ['/api/admin/admins'],
    enabled: isAuthenticated && adminType === 'global',
    retry: false
  });

  // Fetch merchants list
  const { data: merchantsList } = useQuery({
    queryKey: ['/api/admin/merchants'],
    enabled: isAuthenticated && currentUser?.role?.includes('admin'),
    retry: false
  });

  // Fetch chat users
  const { data: chatUsers } = useQuery({
    queryKey: ['/api/admin/chat-users'],
    enabled: isAuthenticated,
    retry: false
  });

  // Login mutation
  const loginMutation = useMutation({
    mutationFn: async (credentials: typeof loginForm) => {
      const response = await apiRequest('/api/admin/login', {
        method: 'POST',
        body: JSON.stringify(credentials)
      });
      return response;
    },
    onSuccess: (data) => {
      setCurrentUser(data.user);
      setAdminType(data.user.role === 'global_admin' ? 'global' : 'local');
      setIsAuthenticated(true);
      localStorage.setItem('adminToken', data.token);
      toast({ title: "Login Successful", description: `Welcome ${data.user.firstName}!` });
    },
    onError: (error: Error) => {
      toast({ 
        title: "Login Failed", 
        description: error.message || "Invalid credentials",
        variant: "destructive" 
      });
    }
  });

  // Point distribution mutation
  const distributePointsMutation = useMutation({
    mutationFn: async (data: { toUserId: string; points: number; description: string }) => {
      return await apiRequest('/api/admin/distribute-points', {
        method: 'POST',
        body: JSON.stringify(data)
      });
    },
    onSuccess: () => {
      toast({ title: "Points Distributed", description: "Points have been distributed successfully!" });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/point-distributions'] });
      setShowPointDistribution(false);
    },
    onError: (error: Error) => {
      toast({ title: "Distribution Failed", description: error.message, variant: "destructive" });
    }
  });

  // Send message mutation
  const sendMessageMutation = useMutation({
    mutationFn: async (data: { receiverId: string; message: string }) => {
      return await apiRequest('/api/admin/send-message', {
        method: 'POST',
        body: JSON.stringify(data)
      });
    },
    onSuccess: () => {
      setNewMessage("");
      queryClient.invalidateQueries({ queryKey: ['/api/admin/chat-messages'] });
    }
  });

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    loginMutation.mutate(loginForm);
  };

  const handleSendMessage = () => {
    if (!newMessage.trim() || !selectedChatUser) return;
    
    if (socket) {
      socket.emit('sendMessage', {
        receiverId: selectedChatUser.id,
        message: newMessage.trim()
      });
    }
    
    sendMessageMutation.mutate({
      receiverId: selectedChatUser.id,
      message: newMessage.trim()
    });
  };

  // Login Form
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="w-16 h-16 bg-blue-600 rounded-full mx-auto mb-4 flex items-center justify-center">
              <Shield className="w-8 h-8 text-white" />
            </div>
            <CardTitle className="text-2xl font-bold">KOMARCE Admin Portal</CardTitle>
            <p className="text-gray-600">Secure access for administrators</p>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <Label htmlFor="email">Email Address</Label>
                <Input
                  id="email"
                  type="email"
                  value={loginForm.email}
                  onChange={(e) => setLoginForm({...loginForm, email: e.target.value})}
                  placeholder="Enter your email"
                  required
                />
              </div>
              
              <div>
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  value={loginForm.password}
                  onChange={(e) => setLoginForm({...loginForm, password: e.target.value})}
                  placeholder="Enter your password"
                  required
                />
              </div>

              <div>
                <Label htmlFor="adminType">Admin Type</Label>
                <Select 
                  value={loginForm.adminType} 
                  onValueChange={(value: "global" | "local") => setLoginForm({...loginForm, adminType: value})}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="global">Global Admin</SelectItem>
                    <SelectItem value="local">Local Admin</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Button 
                type="submit" 
                className="w-full"
                disabled={loginMutation.isPending}
              >
                {loginMutation.isPending ? "Signing In..." : "Sign In"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Admin Dashboard
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-4">
              <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                <Shield className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">KOMARCE Admin Portal</h1>
                <p className="text-sm text-gray-600">
                  {adminType === 'global' ? 'Global Administrator' : `Local Administrator - ${currentUser?.country}`}
                </p>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowChatDialog(true)}
              >
                <MessageCircle className="w-4 h-4 mr-2" />
                Chat
              </Button>
              
              <div className="text-right">
                <p className="text-sm font-medium">{currentUser?.firstName} {currentUser?.lastName}</p>
                <p className="text-xs text-gray-600">{currentUser?.email}</p>
              </div>
              
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => {
                  localStorage.removeItem('adminToken');
                  setIsAuthenticated(false);
                  setCurrentUser(null);
                  setAdminType(null);
                }}
              >
                Logout
              </Button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Tabs defaultValue="dashboard" className="space-y-6">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
            <TabsTrigger value="points">Point Distribution</TabsTrigger>
            <TabsTrigger value="users">User Management</TabsTrigger>
            <TabsTrigger value="analytics">Analytics</TabsTrigger>
            <TabsTrigger value="settings">Settings</TabsTrigger>
          </TabsList>

          {/* Dashboard Tab */}
          <TabsContent value="dashboard" className="space-y-6">
            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Points Balance</p>
                      <p className="text-3xl font-bold text-blue-600">
                        {adminProfile?.pointsBalance?.toLocaleString() || 0}
                      </p>
                    </div>
                    <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                      <Zap className="w-6 h-6 text-blue-600" />
                    </div>
                  </div>
                  <p className="text-xs text-green-600 mt-1">Available for distribution</p>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Total Distributed</p>
                      <p className="text-3xl font-bold text-green-600">
                        {adminProfile?.totalPointsDistributed?.toLocaleString() || 0}
                      </p>
                    </div>
                    <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                      <TrendingUp className="w-6 h-6 text-green-600" />
                    </div>
                  </div>
                  <p className="text-xs text-gray-600 mt-1">Points distributed to date</p>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">
                        {adminType === 'global' ? 'Local Admins' : 'Merchants'}
                      </p>
                      <p className="text-3xl font-bold text-purple-600">
                        {adminType === 'global' ? (adminsList?.length || 0) : (merchantsList?.length || 0)}
                      </p>
                    </div>
                    <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                      <Users className="w-6 h-6 text-purple-600" />
                    </div>
                  </div>
                  <p className="text-xs text-gray-600 mt-1">Active users under management</p>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Total Received</p>
                      <p className="text-3xl font-bold text-orange-600">
                        {adminProfile?.totalPointsReceived?.toLocaleString() || 0}
                      </p>
                    </div>
                    <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
                      <Award className="w-6 h-6 text-orange-600" />
                    </div>
                  </div>
                  <p className="text-xs text-gray-600 mt-1">Points received from higher level</p>
                </CardContent>
              </Card>
            </div>

            {/* Recent Distributions */}
            <Card>
              <CardHeader>
                <CardTitle>Recent Point Distributions</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>To</TableHead>
                      <TableHead>Points</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Description</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {pointDistributions?.slice(0, 5).map((distribution: any) => (
                      <TableRow key={distribution.id}>
                        <TableCell>
                          {new Date(distribution.createdAt).toLocaleDateString()}
                        </TableCell>
                        <TableCell>{distribution.toUser?.firstName} {distribution.toUser?.lastName}</TableCell>
                        <TableCell>{distribution.points.toLocaleString()}</TableCell>
                        <TableCell>
                          <Badge variant="outline">
                            {distribution.distributionType.replace('_', ' ')}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge 
                            variant={distribution.status === 'completed' ? 'default' : 
                                   distribution.status === 'pending' ? 'secondary' : 'destructive'}
                          >
                            {distribution.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="max-w-xs truncate">
                          {distribution.description}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Point Distribution Tab */}
          <TabsContent value="points" className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-bold">Point Distribution Management</h2>
              <Button onClick={() => setShowPointDistribution(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Distribute Points
              </Button>
            </div>

            <Card>
              <CardContent className="p-6">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>From</TableHead>
                      <TableHead>To</TableHead>
                      <TableHead>Points</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {pointDistributions?.map((distribution: any) => (
                      <TableRow key={distribution.id}>
                        <TableCell>
                          {new Date(distribution.createdAt).toLocaleDateString()}
                        </TableCell>
                        <TableCell>{distribution.fromUser?.firstName} {distribution.fromUser?.lastName}</TableCell>
                        <TableCell>{distribution.toUser?.firstName} {distribution.toUser?.lastName}</TableCell>
                        <TableCell>{distribution.points.toLocaleString()}</TableCell>
                        <TableCell>
                          <Badge variant="outline">
                            {distribution.distributionType.replace('_', ' ')}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge 
                            variant={distribution.status === 'completed' ? 'default' : 
                                   distribution.status === 'pending' ? 'secondary' : 'destructive'}
                          >
                            {distribution.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Button variant="outline" size="sm">
                            View Details
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* User Management Tab */}
          <TabsContent value="users" className="space-y-6">
            <h2 className="text-2xl font-bold">User Management</h2>
            
            {adminType === 'global' && (
              <Card>
                <CardHeader>
                  <CardTitle>Local Administrators</CardTitle>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Country</TableHead>
                        <TableHead>Points Balance</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {adminsList?.map((admin: any) => (
                        <TableRow key={admin.id}>
                          <TableCell>{admin.user?.firstName} {admin.user?.lastName}</TableCell>
                          <TableCell>{admin.user?.email}</TableCell>
                          <TableCell>{admin.country}</TableCell>
                          <TableCell>{admin.pointsBalance?.toLocaleString()}</TableCell>
                          <TableCell>
                            <Badge variant={admin.isActive ? 'default' : 'secondary'}>
                              {admin.isActive ? 'Active' : 'Inactive'}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Button variant="outline" size="sm" className="mr-2">
                              <MessageCircle className="w-4 h-4" />
                            </Button>
                            <Button variant="outline" size="sm">
                              <Send className="w-4 h-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            )}

            <Card>
              <CardHeader>
                <CardTitle>Merchants</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Business Name</TableHead>
                      <TableHead>Owner</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Country</TableHead>
                      <TableHead>Points Balance</TableHead>
                      <TableHead>Tier</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {merchantsList?.map((merchant: any) => (
                      <TableRow key={merchant.id}>
                        <TableCell>{merchant.businessName}</TableCell>
                        <TableCell>{merchant.user?.firstName} {merchant.user?.lastName}</TableCell>
                        <TableCell>{merchant.user?.email}</TableCell>
                        <TableCell>{merchant.user?.country}</TableCell>
                        <TableCell>{merchant.availablePoints?.toLocaleString()}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{merchant.tier}</Badge>
                        </TableCell>
                        <TableCell>
                          <Button variant="outline" size="sm" className="mr-2">
                            <MessageCircle className="w-4 h-4" />
                          </Button>
                          <Button variant="outline" size="sm">
                            <Send className="w-4 h-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Analytics Tab */}
          <TabsContent value="analytics" className="space-y-6">
            <h2 className="text-2xl font-bold">Analytics & Reports</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Point Distribution Trends</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-64 bg-gray-100 rounded-lg flex items-center justify-center">
                    <p className="text-gray-500">Chart will be implemented here</p>
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader>
                  <CardTitle>User Growth</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-64 bg-gray-100 rounded-lg flex items-center justify-center">
                    <p className="text-gray-500">Chart will be implemented here</p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Settings Tab */}
          <TabsContent value="settings" className="space-y-6">
            <h2 className="text-2xl font-bold">Settings</h2>
            <Card>
              <CardHeader>
                <CardTitle>Profile Settings</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>First Name</Label>
                    <Input value={currentUser?.firstName} readOnly />
                  </div>
                  <div>
                    <Label>Last Name</Label>
                    <Input value={currentUser?.lastName} readOnly />
                  </div>
                </div>
                <div>
                  <Label>Email</Label>
                  <Input value={currentUser?.email} readOnly />
                </div>
                <div>
                  <Label>Admin Type</Label>
                  <Input value={adminType === 'global' ? 'Global Administrator' : 'Local Administrator'} readOnly />
                </div>
                {adminType === 'local' && (
                  <div>
                    <Label>Country</Label>
                    <Input value={currentUser?.country} readOnly />
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Point Distribution Dialog */}
      <Dialog open={showPointDistribution} onOpenChange={setShowPointDistribution}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Distribute Points</DialogTitle>
          </DialogHeader>
          <PointDistributionForm 
            adminType={adminType}
            onSuccess={() => setShowPointDistribution(false)}
            mutation={distributePointsMutation}
          />
        </DialogContent>
      </Dialog>

      {/* Chat Dialog */}
      <Dialog open={showChatDialog} onOpenChange={setShowChatDialog}>
        <DialogContent className="max-w-4xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle>Real-time Chat</DialogTitle>
          </DialogHeader>
          <ChatInterface 
            currentUser={currentUser}
            socket={socket}
            chatUsers={chatUsers}
            selectedUser={selectedChatUser}
            onSelectUser={setSelectedChatUser}
            messages={chatMessages}
            newMessage={newMessage}
            setNewMessage={setNewMessage}
            onSendMessage={handleSendMessage}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Point Distribution Form Component
function PointDistributionForm({ 
  adminType, 
  onSuccess, 
  mutation 
}: { 
  adminType: "global" | "local" | null;
  onSuccess: () => void;
  mutation: any;
}) {
  const [form, setForm] = useState({
    toUserId: "",
    points: "",
    description: ""
  });

  const { data: recipients } = useQuery({
    queryKey: adminType === 'global' ? ['/api/admin/local-admins'] : ['/api/admin/merchants'],
    retry: false
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    mutation.mutate({
      toUserId: form.toUserId,
      points: parseInt(form.points),
      description: form.description
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <Label>Recipient</Label>
        <Select value={form.toUserId} onValueChange={(value) => setForm({...form, toUserId: value})}>
          <SelectTrigger>
            <SelectValue placeholder={`Select ${adminType === 'global' ? 'Local Admin' : 'Merchant'}`} />
          </SelectTrigger>
          <SelectContent>
            {recipients?.map((recipient: any) => (
              <SelectItem key={recipient.id} value={recipient.userId}>
                {recipient.businessName || `${recipient.user?.firstName} ${recipient.user?.lastName}`}
                {recipient.user?.email && ` (${recipient.user.email})`}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div>
        <Label>Points</Label>
        <Input
          type="number"
          value={form.points}
          onChange={(e) => setForm({...form, points: e.target.value})}
          placeholder="Enter points to distribute"
          required
        />
      </div>

      <div>
        <Label>Description</Label>
        <Textarea
          value={form.description}
          onChange={(e) => setForm({...form, description: e.target.value})}
          placeholder="Reason for distribution"
          required
        />
      </div>

      <div className="flex justify-end space-x-2">
        <Button type="button" variant="outline" onClick={onSuccess}>
          Cancel
        </Button>
        <Button type="submit" disabled={mutation.isPending}>
          {mutation.isPending ? "Distributing..." : "Distribute Points"}
        </Button>
      </div>
    </form>
  );
}

// Chat Interface Component
function ChatInterface({
  currentUser,
  socket,
  chatUsers,
  selectedUser,
  onSelectUser,
  messages,
  newMessage,
  setNewMessage,
  onSendMessage
}: any) {
  return (
    <div className="grid grid-cols-3 gap-4 h-96">
      {/* Users List */}
      <div className="border-r pr-4">
        <h3 className="font-semibold mb-4">Available Users</h3>
        <ScrollArea className="h-80">
          {chatUsers?.map((user: any) => (
            <div
              key={user.id}
              className={`p-3 rounded-lg cursor-pointer mb-2 ${
                selectedUser?.id === user.id ? 'bg-blue-100' : 'hover:bg-gray-100'
              }`}
              onClick={() => onSelectUser(user)}
            >
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-gray-300 rounded-full flex items-center justify-center">
                  {user.role === 'merchant' ? '🏪' : user.role?.includes('admin') ? '👑' : '👤'}
                </div>
                <div>
                  <p className="font-medium text-sm">{user.firstName} {user.lastName}</p>
                  <p className="text-xs text-gray-600">{user.role}</p>
                </div>
              </div>
            </div>
          ))}
        </ScrollArea>
      </div>

      {/* Chat Area */}
      <div className="col-span-2">
        {selectedUser ? (
          <>
            <div className="border-b pb-2 mb-4">
              <h3 className="font-semibold">
                Chat with {selectedUser.firstName} {selectedUser.lastName}
              </h3>
              <p className="text-sm text-gray-600">{selectedUser.role}</p>
            </div>

            <ScrollArea className="h-64 mb-4">
              <div className="space-y-2">
                {messages
                  .filter((msg: any) => 
                    (msg.senderId === currentUser.id && msg.receiverId === selectedUser.id) ||
                    (msg.senderId === selectedUser.id && msg.receiverId === currentUser.id)
                  )
                  .map((message: any) => (
                    <div
                      key={message.id}
                      className={`flex ${message.senderId === currentUser.id ? 'justify-end' : 'justify-start'}`}
                    >
                      <div
                        className={`max-w-xs p-3 rounded-lg ${
                          message.senderId === currentUser.id
                            ? 'bg-blue-600 text-white'
                            : 'bg-gray-100 text-gray-900'
                        }`}
                      >
                        <p className="text-sm">{message.message}</p>
                        <p className="text-xs opacity-75 mt-1">
                          {new Date(message.createdAt).toLocaleTimeString()}
                        </p>
                      </div>
                    </div>
                  ))}
              </div>
            </ScrollArea>

            <div className="flex space-x-2">
              <Input
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                placeholder="Type your message..."
                onKeyPress={(e) => e.key === 'Enter' && onSendMessage()}
              />
              <Button onClick={onSendMessage}>
                <Send className="w-4 h-4" />
              </Button>
            </div>
          </>
        ) : (
          <div className="flex items-center justify-center h-full text-gray-500">
            Select a user to start chatting
          </div>
        )}
      </div>
    </div>
  );
}