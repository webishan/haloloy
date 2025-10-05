import { useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';

export const useRealtimeUpdates = (queryKeys: string[], interval: number = 2000) => {
  const queryClient = useQueryClient();
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    // Clear any existing interval
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }

    // Set up aggressive polling
    intervalRef.current = setInterval(() => {
      queryKeys.forEach(key => {
        // Force invalidate and refetch
        queryClient.invalidateQueries({ queryKey: [key] });
        queryClient.refetchQueries({ queryKey: [key] });
      });
    }, interval);

    // Cleanup on unmount
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [queryKeys, interval, queryClient]);

  const forceUpdate = () => {
    queryKeys.forEach(key => {
      queryClient.invalidateQueries({ queryKey: [key] });
      queryClient.refetchQueries({ queryKey: [key] });
    });
  };

  return { forceUpdate };
};
