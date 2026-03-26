'use client';

import { useEffect } from 'react';
import { useSocket } from '@/hooks/useSocket';
import { useQueryClient } from '@tanstack/react-query';
import { showNotificationToast } from '@/components/ui';

export function GlobalSocket() {
  const { socket } = useSocket();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!socket) return;

    const handleSalePending = (sale: any) => {
      showNotificationToast({
        message: 'A customer clicked to transfer money. Record sale now!',
        duration: 5000,
      });
      
      // Invalidate sales queries to refetch
      queryClient.invalidateQueries({ queryKey: ['sales'] });
      queryClient.invalidateQueries({ queryKey: ['sales-stats'] });
    };

    socket.on('sale.pending', handleSalePending);

    return () => {
      socket.off('sale.pending', handleSalePending);
    };
  }, [socket, queryClient]);

  return null;
}
