import { useEffect, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useToast } from './use-toast';
import io, { Socket } from 'socket.io-client';

interface BalanceUpdate {
  type: 'global_admin_balance' | 'local_admin_balance';
  newBalance: number;
  change: number;
  reason: string;
  timestamp: string;
}

interface RequestStatusUpdate {
  requestId: string;
  status: 'approved' | 'rejected';
  points: number;
  approvedBy?: string;
  rejectedBy?: string;
  timestamp: string;
}

interface Notification {
  type: 'success' | 'error' | 'info';
  title: string;
  message: string;
  timestamp: string;
}

export const useRealtimeBalance = (userId?: string, token?: string) => {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  useEffect(() => {
    if (!userId || !token) return;

    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const wsUrl = `${protocol}//${window.location.host}/ws`;
    const newSocket = io(wsUrl);

    newSocket.on('connect', () => {
      setIsConnected(true);
      newSocket.emit('authenticate', {
        userId,
        token
      });
    });

    newSocket.on('authenticated', () => {
      console.log('Socket authenticated for real-time balance updates');
    });

    newSocket.on('balanceUpdate', (data: BalanceUpdate) => {
      console.log('Received balance update:', data);
      
      // Update the balance query cache immediately
      queryClient.setQueryData(['/api/admin/balance'], (oldData: any) => ({
        ...oldData,
        balance: data.newBalance
      }));

      // Invalidate related queries to refresh UI
      queryClient.invalidateQueries({ queryKey: ['/api/admin/dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/transactions'] });

      // Show toast notification
      toast({
        title: data.change > 0 ? 'Balance Increased' : 'Balance Updated',
        description: `${data.change > 0 ? '+' : ''}${data.change.toLocaleString()} points. New balance: ${data.newBalance.toLocaleString()}`,
        variant: data.change > 0 ? 'default' : 'destructive'
      });
    });

    newSocket.on('requestStatusUpdate', (data: RequestStatusUpdate) => {
      console.log('Received request status update:', data);
      
      // Invalidate pending requests query
      queryClient.invalidateQueries({ queryKey: ['/api/admin/pending-point-requests'] });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/point-generation-requests'] });
    });

    newSocket.on('notification', (data: Notification) => {
      console.log('Received notification:', data);
      
      toast({
        title: data.title,
        description: data.message,
        variant: data.type === 'error' ? 'destructive' : 'default'
      });
    });

    newSocket.on('disconnect', () => {
      setIsConnected(false);
    });

    setSocket(newSocket);

    return () => {
      newSocket.disconnect();
    };
  }, [userId, token, queryClient, toast]);

  return {
    socket,
    isConnected
  };
};