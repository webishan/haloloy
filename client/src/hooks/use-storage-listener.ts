import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';

export const useStorageListener = (queryKeys: string[]) => {
  const queryClient = useQueryClient();

  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      // Listen for changes to localStorage that might indicate data updates
      if (e.key === 'lastDataUpdate' || e.key?.includes('update')) {
        queryKeys.forEach(key => {
          queryClient.invalidateQueries({ queryKey: [key] });
          queryClient.refetchQueries({ queryKey: [key] });
        });
      }
    };

    // Listen for custom events that can be dispatched from other components
    const handleCustomUpdate = () => {
      queryKeys.forEach(key => {
        queryClient.invalidateQueries({ queryKey: [key] });
        queryClient.refetchQueries({ queryKey: [key] });
      });
    };

    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('dataUpdate', handleCustomUpdate);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('dataUpdate', handleCustomUpdate);
    };
  }, [queryKeys, queryClient]);
};
