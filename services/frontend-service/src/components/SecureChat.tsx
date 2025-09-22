import React, { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Send, Users, Circle, MoreVertical, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import io, { Socket } from 'socket.io-client';

interface ChatUser {
  id: string;
  name: string;
  role: string;
  country?: string;
  email?: string;
  isOnline?: boolean;
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
  senderRole?: string;
}

interface Conversation {
  id: string;
  participant1Id: string;
  participant2Id: string;
  participant1Role: string;
  participant2Role: string;
  lastMessageAt: string | null;
  isActive: boolean;
  otherParticipant?: {
    id: string;
    name: string;
    role: string;
    country?: string;
  };
  unreadCount?: number;
}

interface SecureChatProps {
  currentUser: {
    id: string;
    name: string;
    role: string;
    token: string;
  };
}

export default function SecureChat({ currentUser }: SecureChatProps) {
  const [selectedConversation, setSelectedConversation] = useState<string | null>(null);
  const [selectedUser, setSelectedUser] = useState<ChatUser | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [onlineUsers, setOnlineUsers] = useState<string[]>([]);
  const [typingUsers, setTypingUsers] = useState<Set<string>>(new Set());
  const [socket, setSocket] = useState<Socket | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Fetch available chat users based on role hierarchy
  const { data: availableUsers = [], isLoading: usersLoading } = useQuery({
    queryKey: ['/api/chat/users'],
    enabled: !!currentUser.token,
    queryFn: async () => {
      const response = await fetch('/api/chat/users', {
        headers: { 'Authorization': `Bearer ${currentUser.token}` }
      });
      if (!response.ok) throw new Error('Failed to fetch users');
      return response.json();
    }
  });

  // Fetch user's conversations
  const { data: conversations = [], isLoading: conversationsLoading } = useQuery({
    queryKey: ['/api/chat/conversations'],
    enabled: !!currentUser.token,
    queryFn: async () => {
      const response = await fetch('/api/chat/conversations', {
        headers: { 'Authorization': `Bearer ${currentUser.token}` }
      });
      if (!response.ok) throw new Error('Failed to fetch conversations');
      return response.json();
    }
  });

  // Fetch messages for selected conversation
  const { data: conversationMessages = [], refetch: refetchMessages } = useQuery({
    queryKey: ['/api/chat/conversations', selectedConversation, 'messages'],
    enabled: !!selectedConversation && !!currentUser.token,
    queryFn: async () => {
      const response = await fetch(`/api/chat/conversations/${selectedConversation}/messages`, {
        headers: { 'Authorization': `Bearer ${currentUser.token}` }
      });
      if (!response.ok) throw new Error('Failed to fetch messages');
      return response.json();
    }
  });

  // Send message mutation
  const sendMessageMutation = useMutation({
    mutationFn: async (messageData: { conversationId: string; receiverId: string; receiverRole: string; message: string }) => {
      const response = await fetch('/api/chat/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${currentUser.token}`
        },
        body: JSON.stringify(messageData)
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to send message');
      }
      
      return response.json();
    },
    onSuccess: () => {
      setNewMessage('');
      queryClient.invalidateQueries({ queryKey: ['/api/chat/conversations'] });
      refetchMessages();
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to send message',
        variant: 'destructive'
      });
    }
  });

  // Create conversation mutation
  const createConversationMutation = useMutation({
    mutationFn: async (data: { receiverId: string; receiverRole: string }) => {
      const response = await fetch('/api/chat/conversation', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${currentUser.token}`
        },
        body: JSON.stringify(data)
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to create conversation');
      }
      
      return response.json();
    },
    onSuccess: (conversation: any) => {
      setSelectedConversation(conversation.id);
      queryClient.invalidateQueries({ queryKey: ['/api/chat/conversations'] });
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to create conversation',
        variant: 'destructive'
      });
    }
  });

  // Initialize WebSocket connection
  useEffect(() => {
    if (!currentUser.token) return;

    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const wsUrl = `${protocol}//${window.location.host}/ws`;
    const newSocket = io(wsUrl, {
      path: '/ws',
      transports: ['websocket', 'polling']
    });

    newSocket.on('connect', () => {
      console.log('Connected to chat server');
      newSocket.emit('authenticate', { token: currentUser.token });
    });

    newSocket.on('authenticated', (data) => {
      console.log('Socket authenticated:', data);
      newSocket.emit('getOnlineUsers');
    });

    newSocket.on('authError', (error) => {
      console.error('Socket auth error:', error);
      toast({
        title: 'Connection Error',
        description: 'Failed to authenticate with chat server',
        variant: 'destructive'
      });
    });

    newSocket.on('newMessage', (message: ChatMessage) => {
      setMessages(prev => [...prev, message]);
      queryClient.invalidateQueries({ queryKey: ['/api/chat/conversations'] });
      
      // Show notification for new message
      if (message.senderId !== currentUser.id) {
        toast({
          title: 'New Message',
          description: `${message.senderName}: ${message.message.substring(0, 50)}...`,
        });
      }
    });

    newSocket.on('messageConfirmed', (message: ChatMessage) => {
      setMessages(prev => [...prev, message]);
    });

    newSocket.on('userTyping', ({ senderId, isTyping }: { senderId: string; isTyping: boolean }) => {
      setTypingUsers(prev => {
        const newSet = new Set(prev);
        if (isTyping) {
          newSet.add(senderId);
        } else {
          newSet.delete(senderId);
        }
        return newSet;
      });
    });

    newSocket.on('onlineUsers', (users: string[]) => {
      setOnlineUsers(users);
    });

    newSocket.on('messageError', (error) => {
      toast({
        title: 'Message Error',
        description: error.error || 'Failed to send message',
        variant: 'destructive'
      });
    });

    setSocket(newSocket);

    return () => {
      newSocket.disconnect();
    };
  }, [currentUser.token, currentUser.id, toast, queryClient]);

  // Update messages when conversation messages are fetched
  useEffect(() => {
    if (Array.isArray(conversationMessages) && conversationMessages.length > 0) {
      setMessages(conversationMessages as ChatMessage[]);
    } else {
      setMessages([]);
    }
  }, [conversationMessages]);

  // Scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Handle sending messages
  const handleSendMessage = async () => {
    if (!newMessage.trim() || !selectedConversation || !selectedUser) return;

    try {
      // Send via API
      await sendMessageMutation.mutateAsync({
        conversationId: selectedConversation,
        receiverId: selectedUser.id,
        receiverRole: selectedUser.role,
        message: newMessage.trim()
      });

      // Also send via WebSocket for real-time updates
      if (socket) {
        socket.emit('sendMessage', {
          receiverId: selectedUser.id,
          message: newMessage.trim(),
          conversationId: selectedConversation
        });
      }
    } catch (error) {
      console.error('Send message error:', error);
    }
  };

  // Handle starting new conversation
  const handleStartConversation = async (user: ChatUser) => {
    try {
      await createConversationMutation.mutateAsync({
        receiverId: user.id,
        receiverRole: user.role
      });
      setSelectedUser(user);
    } catch (error) {
      console.error('Create conversation error:', error);
    }
  };

  // Handle selecting existing conversation
  const handleSelectConversation = (conversation: Conversation) => {
    setSelectedConversation(conversation.id);
    if (conversation.otherParticipant) {
      setSelectedUser({
        id: conversation.otherParticipant.id,
        name: conversation.otherParticipant.name,
        role: conversation.otherParticipant.role,
        country: conversation.otherParticipant.country,
        isOnline: onlineUsers.includes(conversation.otherParticipant.id)
      });
    }
  };

  // Handle typing indicators
  const handleTyping = (isTyping: boolean) => {
    if (socket && selectedUser) {
      socket.emit('typing', {
        receiverId: selectedUser.id,
        isTyping
      });
    }
  };

  // Filter available users based on search
  const filteredUsers = Array.isArray(availableUsers) 
    ? availableUsers.filter((user: any) =>
        user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        user.email?.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : [];

  // Get role badge color
  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'global_admin': return 'bg-red-100 text-red-800';
      case 'local_admin': return 'bg-blue-100 text-blue-800';
      case 'merchant': return 'bg-green-100 text-green-800';
      case 'customer': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  // Get role description for current user
  const getRoleDescription = (role: string) => {
    switch (role) {
      case 'global_admin': return 'Can message Local Admins';
      case 'local_admin': return 'Can message Global Admin & Merchants';
      case 'merchant': return 'Can message Local Admins & Customers';
      case 'customer': return 'Can message Merchants';
      default: return '';
    }
  };

  // Get no users message based on role
  const getNoUsersMessage = (role: string) => {
    switch (role) {
      case 'global_admin': return 'Local admins will appear here when available';
      case 'local_admin': return 'Global admins and merchants in your region will appear here';
      case 'merchant': return 'Local admins and customers who bought from you will appear here';
      case 'customer': return 'Merchants you\'ve purchased from will appear here';
      default: return '';
    }
  };

  if (usersLoading || conversationsLoading) {
    return (
      <div className="flex items-center justify-center h-96" data-testid="chat-loading">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="flex h-[600px] border rounded-lg overflow-hidden" data-testid="secure-chat-container">
      {/* Sidebar: Conversations and Available Users */}
      <div className="w-80 border-r bg-gray-50 dark:bg-gray-900 flex flex-col">
        <div className="p-4 border-b">
          <h3 className="font-semibold text-lg mb-2" data-testid="chat-title">Secure Messaging</h3>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input
              placeholder="Search users..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
              data-testid="input-search-users"
            />
          </div>
        </div>

        <ScrollArea className="flex-1">
          {/* Active Conversations */}
          {Array.isArray(conversations) && conversations.length > 0 && (
            <div className="p-4">
              <h4 className="text-sm font-medium text-gray-500 mb-2">Recent Conversations</h4>
              {conversations.map((conversation: Conversation) => (
                <div
                  key={conversation.id}
                  onClick={() => handleSelectConversation(conversation)}
                  className={`p-3 rounded-lg cursor-pointer mb-2 transition-colors ${
                    selectedConversation === conversation.id
                      ? 'bg-blue-100 dark:bg-blue-900'
                      : 'hover:bg-gray-100 dark:hover:bg-gray-800'
                  }`}
                  data-testid={`conversation-item-${conversation.id}`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="relative">
                        <Avatar className="h-8 w-8">
                          <AvatarFallback>
                            {conversation.otherParticipant?.name.substring(0, 2).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        {onlineUsers.includes(conversation.otherParticipant?.id || '') && (
                          <Circle className="absolute -bottom-1 -right-1 h-3 w-3 fill-green-500 text-green-500" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">
                          {conversation.otherParticipant?.name}
                        </p>
                        <Badge className={`text-xs ${getRoleBadgeColor(conversation.otherParticipant?.role || '')}`}>
                          {conversation.otherParticipant?.role}
                        </Badge>
                      </div>
                    </div>
                    {conversation.unreadCount && conversation.unreadCount > 0 && (
                      <Badge className="bg-red-500 text-white text-xs">
                        {conversation.unreadCount}
                      </Badge>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          <Separator />

          {/* Available Users */}
          <div className="p-4">
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-sm font-medium text-gray-500">Available Users</h4>
              <Badge variant="outline" className="text-xs">
                {getRoleDescription(currentUser.role)}
              </Badge>
            </div>
            {filteredUsers.length > 0 ? (
              filteredUsers.map((user: any) => (
                <div
                  key={user.id}
                  onClick={() => handleStartConversation(user)}
                  className="p-3 rounded-lg cursor-pointer mb-2 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors border border-transparent hover:border-blue-200"
                  data-testid={`user-item-${user.id}`}
                >
                  <div className="flex items-center space-x-3">
                    <div className="relative">
                      <Avatar className="h-8 w-8">
                        <AvatarFallback>
                          {user.name.substring(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      {onlineUsers.includes(user.id) && (
                        <Circle className="absolute -bottom-1 -right-1 h-3 w-3 fill-green-500 text-green-500" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{user.name}</p>
                      <div className="flex items-center space-x-2">
                        <Badge className={`text-xs ${getRoleBadgeColor(user.role)}`}>
                          {user.role.replace('_', ' ')}
                        </Badge>
                        {user.country && (
                          <Badge variant="outline" className="text-xs">
                            {user.country}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-4">
                <p className="text-sm text-gray-500 mb-2">
                  {searchQuery ? 'No users found' : 'No available users to chat with'}
                </p>
                <p className="text-xs text-gray-400">
                  {getNoUsersMessage(currentUser.role)}
                </p>
              </div>
            )}
          </div>
        </ScrollArea>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col">
        {selectedUser ? (
          <>
            {/* Chat Header */}
            <div className="p-4 border-b bg-white dark:bg-gray-900" data-testid="chat-header">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="relative">
                    <Avatar className="h-10 w-10">
                      <AvatarFallback>
                        {selectedUser.name.substring(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    {onlineUsers.includes(selectedUser.id) && (
                      <Circle className="absolute -bottom-1 -right-1 h-3 w-3 fill-green-500 text-green-500" />
                    )}
                  </div>
                  <div>
                    <h3 className="font-medium" data-testid="chat-recipient-name">{selectedUser.name}</h3>
                    <div className="flex items-center space-x-2">
                      <Badge className={`text-xs ${getRoleBadgeColor(selectedUser.role)}`}>
                        {selectedUser.role}
                      </Badge>
                      <span className="text-xs text-gray-500">
                        {onlineUsers.includes(selectedUser.id) ? 'Online' : 'Offline'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Messages Area */}
            <ScrollArea className="flex-1 p-4" data-testid="messages-area">
              <div className="space-y-4">
                {messages.map((message) => (
                  <div
                    key={message.id}
                    className={`flex ${message.senderId === currentUser.id ? 'justify-end' : 'justify-start'}`}
                    data-testid={`message-${message.id}`}
                  >
                    <div
                      className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                        message.senderId === currentUser.id
                          ? 'bg-blue-600 text-white'
                          : 'bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white'
                      }`}
                    >
                      <p className="text-sm">{message.message}</p>
                      <p className={`text-xs mt-1 ${
                        message.senderId === currentUser.id ? 'text-blue-100' : 'text-gray-500'
                      }`}>
                        {new Date(message.createdAt).toLocaleTimeString()}
                        {message.senderId === currentUser.id && !message.isRead && (
                          <span className="ml-1">•</span>
                        )}
                      </p>
                    </div>
                  </div>
                ))}
                
                {typingUsers.size > 0 && (
                  <div className="flex justify-start">
                    <div className="bg-gray-200 dark:bg-gray-700 px-4 py-2 rounded-lg">
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        {Array.from(typingUsers).length === 1 ? 'Someone is typing...' : 'Multiple people are typing...'}
                      </p>
                    </div>
                  </div>
                )}
                
                <div ref={messagesEndRef} />
              </div>
            </ScrollArea>

            {/* Message Input */}
            <div className="p-4 border-t bg-white dark:bg-gray-900" data-testid="message-input-area">
              <div className="flex space-x-2">
                <Input
                  placeholder="Type your message..."
                  value={newMessage}
                  onChange={(e) => {
                    setNewMessage(e.target.value);
                    handleTyping(e.target.value.length > 0);
                  }}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSendMessage();
                    }
                  }}
                  onBlur={() => handleTyping(false)}
                  className="flex-1"
                  data-testid="input-message"
                />
                <Button
                  onClick={handleSendMessage}
                  disabled={!newMessage.trim() || sendMessageMutation.isPending}
                  className="px-4"
                  data-testid="button-send"
                >
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center bg-gray-50 dark:bg-gray-900">
            <div className="text-center" data-testid="no-conversation-selected">
              <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                Select a conversation
              </h3>
              <p className="text-gray-600 dark:text-gray-400">
                Choose a user from the sidebar to start chatting
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}