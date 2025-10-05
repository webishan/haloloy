import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { MessageCircle, Send, Users, Package, TrendingUp, DollarSign, Star } from "lucide-react";
import io from "socket.io-client";
import SecureChat from "@/components/SecureChat";

interface User {
  id: string;
  username: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  country: string;
}

interface ChatMessage {
  id: string;
  senderId: string;
  receiverId: string;
  message: string;
  messageType: string;
  isRead: boolean;
  createdAt: string;
  senderName?: string;
}

interface MerchantDashboard {
  merchant: {
    id: string;
    businessName: string;
    tier: string;
    loyaltyPointsBalance: number;
    totalSales: string;
    totalOrders: number;
    activeProducts: number;
  };
  recentOrders: any[];
  topProducts: any[];
}

export default function MerchantPanel() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [loginData, setLoginData] = useState({ username: "", password: "" });
  const [socket, setSocket] = useState<any>(null);
  
  // Chat states
  const [selectedChatUser, setSelectedChatUser] = useState<User | null>(null);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState("");

  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Check authentication
  useEffect(() => {
    const token = localStorage.getItem('merchantToken');
    const user = localStorage.getItem('merchantUser');
    if (token && user) {
      setIsAuthenticated(true);
      setCurrentUser(JSON.parse(user));
    }
  }, []);

  // Socket connection for real-time chat
  useEffect(() => {
    if (isAuthenticated && currentUser) {
      const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
      const wsUrl = `${protocol}//${window.location.host}/ws`;
      const newSocket = io(wsUrl);

      newSocket.on('connect', () => {
        console.log('Connected to merchant chat server');
        newSocket.emit('authenticate', {
          userId: currentUser.userId,
          role: currentUser.role,
          token: localStorage.getItem('merchantToken')
        });
      });

      newSocket.on('authenticated', (data) => {
        console.log('Merchant socket authenticated:', data);
        setSocket(newSocket);
      });

      newSocket.on('authError', (error) => {
        console.error('Merchant socket auth error:', error);
        toast({ title: "Chat Error", description: "Failed to connect to chat", variant: "destructive" });
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

      newSocket.on('messageConfirmed', (message: ChatMessage) => {
        if (selectedChatUser && (message.senderId === selectedChatUser.id || message.receiverId === selectedChatUser.id)) {
          setChatMessages(prev => [...prev, message]);
        }
      });

      return () => {
        newSocket.disconnect();
      };
    }
  }, [isAuthenticated, currentUser, selectedChatUser]);

  // Login mutation
  const loginMutation = useMutation({
    mutationFn: async (credentials: { username: string; password: string }) => {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(credentials)
      });
      
      if (!response.ok) {
        const error = await response.text();
        throw new Error(error);
      }
      
      return response.json();
    },
    onSuccess: (data) => {
      if (data.user.role === 'merchant') {
        localStorage.setItem('merchantToken', data.token);
        localStorage.setItem('merchantUser', JSON.stringify(data.user));
        setIsAuthenticated(true);
        setCurrentUser(data.user);
        toast({ title: "Login Successful", description: "Welcome to Merchant Panel!" });
      } else {
        throw new Error("Access denied. Merchant role required.");
      }
    },
    onError: (error: Error) => {
      console.error('Merchant login error:', error);
      toast({ 
        title: "Login Failed", 
        description: error.message || "Invalid credentials",
        variant: "destructive" 
      });
    }
  });

  // Data queries
  const { data: dashboardData, isLoading: isDashboardLoading } = useQuery({
    queryKey: ['/api/merchant/dashboard'],
    enabled: isAuthenticated,
    retry: false,
    refetchInterval: 30000
  });

  const { data: chatUsers } = useQuery({
    queryKey: ['/api/merchant/chat-users'],
    enabled: isAuthenticated,
    retry: false
  });

  // Fetch chat messages for selected user
  const { data: messagesForSelectedUser = [], refetch: refetchMessages } = useQuery({
    queryKey: ['/api/merchant/chat-messages', selectedChatUser?.id],
    queryFn: async () => {
      if (!selectedChatUser) return [];
      const response = await fetch(`/api/merchant/chat-messages?partnerId=${selectedChatUser.id}`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('merchantToken')}` }
      });
      if (!response.ok) throw new Error('Failed to fetch messages');
      return response.json();
    },
    enabled: !!selectedChatUser,
    retry: false
  });

  // Send message mutation
  const sendMessageMutation = useMutation({
    mutationFn: async (data: { receiverId: string; message: string }) => {
      const response = await fetch('/api/merchant/send-message', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('merchantToken')}`
        },
        body: JSON.stringify(data)
      });
      
      if (!response.ok) {
        const error = await response.text();
        throw new Error(error);
      }
      
      return response.json();
    },
    onSuccess: () => {
      setNewMessage("");
      queryClient.invalidateQueries({ queryKey: ['/api/merchant/chat-messages'] });
      refetchMessages();
    },
    onError: (error: Error) => {
      toast({ title: "Message Failed", description: error.message, variant: "destructive" });
    }
  });

  // Set chat messages when user selected
  useEffect(() => {
    if (selectedChatUser && messagesForSelectedUser) {
      setChatMessages(messagesForSelectedUser);
    } else {
      setChatMessages([]);
    }
  }, [selectedChatUser, messagesForSelectedUser]);

  const handleLogin = () => {
    if (!loginData.username || !loginData.password) {
      toast({ title: "Error", description: "Please fill in all fields", variant: "destructive" });
      return;
    }
    loginMutation.mutate(loginData);
  };

  const handleLogout = () => {
    localStorage.removeItem('merchantToken');
    localStorage.removeItem('merchantUser');
    setIsAuthenticated(false);
    setCurrentUser(null);
    if (socket) {
      socket.disconnect();
      setSocket(null);
    }
  };

  const handleSendMessage = () => {
    if (!selectedChatUser || !newMessage.trim()) return;
    
    sendMessageMutation.mutate({
      receiverId: selectedChatUser.id,
      message: newMessage.trim()
    });

    if (socket) {
      socket.emit('sendMessage', {
        receiverId: selectedChatUser.id,
        message: newMessage.trim(),
        messageType: 'text'
      });
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl font-bold text-gray-800">Merchant Portal</CardTitle>
            <CardDescription>Sign in to access your merchant dashboard</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Input
                placeholder="Username"
                value={loginData.username}
                onChange={(e) => setLoginData(prev => ({ ...prev, username: e.target.value }))}
                data-testid="input-username"
              />
              <Input
                type="password"
                placeholder="Password"
                value={loginData.password}
                onChange={(e) => setLoginData(prev => ({ ...prev, password: e.target.value }))}
                onKeyPress={(e) => e.key === 'Enter' && handleLogin()}
                data-testid="input-password"
              />
            </div>
            <Button 
              onClick={handleLogin} 
              className="w-full" 
              disabled={loginMutation.isPending}
              data-testid="button-login"
            >
              {loginMutation.isPending ? "Signing In..." : "Sign In"}
            </Button>
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
          <div className="flex justify-between items-center py-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Merchant Portal</h1>
              <p className="text-sm text-gray-600">Welcome, {currentUser?.firstName} {currentUser?.lastName}</p>
            </div>
            <Button variant="outline" onClick={handleLogout} data-testid="button-logout">
              Logout
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Tabs defaultValue="dashboard" className="space-y-6">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="dashboard" data-testid="tab-dashboard">Dashboard</TabsTrigger>
            <TabsTrigger value="chat" data-testid="tab-chat">
              <MessageCircle className="w-4 h-4 mr-2" />
              Chat
            </TabsTrigger>
          </TabsList>

          <TabsContent value="dashboard" className="space-y-6">
            {isDashboardLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {[...Array(4)].map((_, i) => (
                  <Card key={i} className="animate-pulse">
                    <CardContent className="p-6">
                      <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                      <div className="h-8 bg-gray-200 rounded w-1/2"></div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : dashboardData ? (
              <>
                {/* Stats Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  <Card>
                    <CardContent className="p-6">
                      <div className="flex items-center">
                        <Star className="h-8 w-8 text-yellow-600" />
                        <div className="ml-4">
                          <p className="text-sm font-medium text-gray-600">Points Balance</p>
                          <p className="text-2xl font-bold text-gray-900" data-testid="text-points-balance">
                            {dashboardData.merchant.loyaltyPointsBalance || 0}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardContent className="p-6">
                      <div className="flex items-center">
                        <DollarSign className="h-8 w-8 text-green-600" />
                        <div className="ml-4">
                          <p className="text-sm font-medium text-gray-600">Total Sales</p>
                          <p className="text-2xl font-bold text-gray-900" data-testid="text-total-sales">
                            ${dashboardData.merchant.totalSales}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardContent className="p-6">
                      <div className="flex items-center">
                        <TrendingUp className="h-8 w-8 text-blue-600" />
                        <div className="ml-4">
                          <p className="text-sm font-medium text-gray-600">Total Orders</p>
                          <p className="text-2xl font-bold text-gray-900" data-testid="text-total-orders">
                            {dashboardData.merchant.totalOrders}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardContent className="p-6">
                      <div className="flex items-center">
                        <Package className="h-8 w-8 text-purple-600" />
                        <div className="ml-4">
                          <p className="text-sm font-medium text-gray-600">Active Products</p>
                          <p className="text-2xl font-bold text-gray-900" data-testid="text-active-products">
                            {dashboardData.merchant.activeProducts}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Business Info */}
                <Card>
                  <CardHeader>
                    <CardTitle>Business Information</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm font-medium text-gray-600">Business Name</p>
                        <p className="text-lg font-semibold" data-testid="text-business-name">
                          {dashboardData.merchant.businessName}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-600">Tier</p>
                        <Badge variant="secondary" data-testid="badge-tier">
                          {dashboardData.merchant.tier}
                        </Badge>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </>
            ) : (
              <div className="text-center py-8">
                <p className="text-gray-500">Failed to load dashboard data</p>
              </div>
            )}
          </TabsContent>

          <TabsContent value="chat" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[600px]">
              {/* Chat Users List */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Users className="w-5 h-5 mr-2" />
                    Contacts
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <ScrollArea className="h-[500px]">
                    {chatUsers?.map((user: User) => (
                      <div
                        key={user.id}
                        className={`p-4 cursor-pointer hover:bg-gray-50 border-b ${
                          selectedChatUser?.id === user.id ? 'bg-blue-50 border-l-4 border-l-blue-500' : ''
                        }`}
                        onClick={() => setSelectedChatUser(user)}
                        data-testid={`user-${user.id}`}
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-medium text-gray-900">
                              {user.firstName} {user.lastName}
                            </p>
                            <p className="text-sm text-gray-500">{user.email}</p>
                          </div>
                          <Badge variant={user.role === 'local_admin' ? 'default' : 'secondary'}>
                            {user.role === 'local_admin' ? 'Admin' : 'Customer'}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </ScrollArea>
                </CardContent>
              </Card>

              {/* Chat Messages */}
              <Card className="lg:col-span-2">
                <CardHeader>
                  <CardTitle>
                    {selectedChatUser ? (
                      <div className="flex items-center">
                        <MessageCircle className="w-5 h-5 mr-2" />
                        Chat with {selectedChatUser.firstName} {selectedChatUser.lastName}
                      </div>
                    ) : (
                      "Select a contact to start chatting"
                    )}
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  {selectedChatUser ? (
                    <>
                      <ScrollArea className="h-[400px] p-4">
                        <div className="space-y-4">
                          {chatMessages.map((message) => (
                            <div
                              key={message.id}
                              className={`flex ${
                                message.senderId === currentUser?.userId ? 'justify-end' : 'justify-start'
                              }`}
                            >
                              <div
                                className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                                  message.senderId === currentUser?.userId
                                    ? 'bg-blue-500 text-white'
                                    : 'bg-gray-100 text-gray-900'
                                }`}
                                data-testid={`message-${message.id}`}
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
                      <Separator />
                      <div className="p-4">
                        <div className="flex space-x-2">
                          <Input
                            placeholder="Type your message..."
                            value={newMessage}
                            onChange={(e) => setNewMessage(e.target.value)}
                            onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                            disabled={sendMessageMutation.isPending}
                            data-testid="input-message"
                          />
                          <Button
                            onClick={handleSendMessage}
                            disabled={!newMessage.trim() || sendMessageMutation.isPending}
                            data-testid="button-send-message"
                          >
                            <Send className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    </>
                  ) : (
                    <div className="h-[500px] flex items-center justify-center text-gray-500">
                      Select a contact to start messaging
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Enhanced Secure Chat */}
              <Card className="mt-6">
                <CardHeader>
                  <CardTitle>Enhanced Secure Messaging</CardTitle>
                  <CardDescription>
                    Real-time communication with customers and administrators
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {currentUser && (
                    <SecureChat 
                      currentUser={{
                        id: currentUser.userId,
                        name: `${currentUser.firstName} ${currentUser.lastName}`,
                        role: 'merchant',
                        token: localStorage.getItem('merchantToken') || ''
                      }}
                    />
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}