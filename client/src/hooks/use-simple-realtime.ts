import { useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';

export const useSimpleRealtime = (queryKeys: string[], interval: number = 1000) => {
  const queryClient = useQueryClient();
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    // Clear any existing interval
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }

    // Set up simple polling
    intervalRef.current = setInterval(() => {
      queryKeys.forEach(key => {
        // Force refetch without cache
        queryClient.refetchQueries({ 
          queryKey: [key],
          type: 'active'
        });
      });
    }, interval);

    // Cleanup on unmount
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [queryKeys, interval, queryClient]);

  const forceRefresh = () => {
    queryKeys.forEach(key => {
      queryClient.refetchQueries({ 
        queryKey: [key],
        type: 'active'
      });
    });
  };

  return { forceRefresh };
};
