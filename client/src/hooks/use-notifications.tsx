import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useQuery } from '@tanstack/react-query';

interface NotificationData {
  id: string;
  type: 'message' | 'system' | 'alert';
  title: string;
  message: string;
  isRead: boolean;
  createdAt: string;
  senderId?: string;
  senderName?: string;
  conversationId?: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
}

interface NotificationContextType {
  notifications: NotificationData[];
  unreadCount: number;
  messageNotifications: NotificationData[];
  unreadMessageCount: number;
  markAsRead: (notificationId: string) => void;
  markAllAsRead: () => void;
  addNotification: (notification: Omit<NotificationData, 'id' | 'createdAt' | 'isRead'>) => void;
  removeNotification: (notificationId: string) => void;
  clearAll: () => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

interface NotificationProviderProps {
  children: ReactNode;
  currentUser?: {
    id: string;
    token: string;
    role: string;
  };
}

export function NotificationProvider({ children, currentUser }: NotificationProviderProps) {
  const [notifications, setNotifications] = useState<NotificationData[]>([]);

  // Fetch unread messages count from API
  const { data: unreadMessagesData } = useQuery({
    queryKey: ['/api/chat/unread-count'],
    enabled: !!currentUser?.token,
    refetchInterval: 30000, // Check every 30 seconds
    queryFn: async () => {
      const response = await fetch('/api/chat/unread-count', {
        headers: { 'Authorization': `Bearer ${currentUser?.token}` }
      });
      if (!response.ok) throw new Error('Failed to fetch unread count');
      return response.json();
    }
  });

  // Fetch recent unread messages for notifications
  const { data: unreadMessages = [] } = useQuery({
    queryKey: ['/api/chat/unread-messages'],
    enabled: !!currentUser?.token,
    refetchInterval: 30000, // Check every 30 seconds
    queryFn: async () => {
      const response = await fetch('/api/chat/unread-messages', {
        headers: { 'Authorization': `Bearer ${currentUser?.token}` }
      });
      if (!response.ok) throw new Error('Failed to fetch unread messages');
      return response.json();
    }
  });

  // Convert unread messages to notifications
  useEffect(() => {
    if (unreadMessages && Array.isArray(unreadMessages)) {
      const messageNotifications: NotificationData[] = unreadMessages.map((msg: any) => ({
        id: `msg-${msg.id}`,
        type: 'message' as const,
        title: 'New Message',
        message: `${msg.senderName}: ${msg.message.substring(0, 50)}${msg.message.length > 50 ? '...' : ''}`,
        isRead: false,
        createdAt: msg.createdAt,
        senderId: msg.senderId,
        senderName: msg.senderName,
        conversationId: msg.conversationId,
        priority: 'medium' as const
      }));

      // Update notifications, keeping non-message notifications
      setNotifications(prev => [
        ...prev.filter(n => n.type !== 'message'),
        ...messageNotifications
      ]);
    }
  }, [unreadMessages]);

  const addNotification = (notification: Omit<NotificationData, 'id' | 'createdAt' | 'isRead'>) => {
    const newNotification: NotificationData = {
      ...notification,
      id: `notif-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      createdAt: new Date().toISOString(),
      isRead: false
    };

    setNotifications(prev => [newNotification, ...prev]);
  };

  const markAsRead = (notificationId: string) => {
    setNotifications(prev =>
      prev.map(n => n.id === notificationId ? { ...n, isRead: true } : n)
    );
  };

  const markAllAsRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
  };

  const removeNotification = (notificationId: string) => {
    setNotifications(prev => prev.filter(n => n.id !== notificationId));
  };

  const clearAll = () => {
    setNotifications([]);
  };

  // Calculate counts
  const unreadCount = notifications.filter(n => !n.isRead).length;
  const messageNotifications = notifications.filter(n => n.type === 'message');
  const unreadMessageCount = unreadMessagesData?.count || 0;

  const value: NotificationContextType = {
    notifications,
    unreadCount,
    messageNotifications,
    unreadMessageCount,
    markAsRead,
    markAllAsRead,
    addNotification,
    removeNotification,
    clearAll
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  const context = useContext(NotificationContext);
  if (context === undefined) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
}

// Hook for getting notification badge color based on priority and count
export function useNotificationBadge() {
  const { unreadCount, unreadMessageCount, notifications } = useNotifications();

  const getBadgeColor = (count: number, hasUrgent = false) => {
    if (count === 0) return '';
    if (hasUrgent) return 'bg-red-500 text-white';
    if (count > 10) return 'bg-red-500 text-white';
    if (count > 5) return 'bg-orange-500 text-white';
    return 'bg-blue-500 text-white';
  };

  const hasUrgentNotifications = notifications.some(n => !n.isRead && n.priority === 'urgent');

  return {
    totalCount: unreadCount,
    messageCount: unreadMessageCount,
    hasUrgent: hasUrgentNotifications,
    getBadgeColor,
    totalBadgeColor: getBadgeColor(unreadCount, hasUrgentNotifications),
    messageBadgeColor: getBadgeColor(unreadMessageCount, false)
  };
}