import { useEffect, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuthStore } from '@/services/auth';

export const useSocket = () => {
  const [isConnected, setIsConnected] = useState(false);
  const [socket, setSocket] = useState<Socket | null>(null);
  
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
  const isAuthenticated = useAuthStore(state => state.isAuthenticated);
  const user = useAuthStore(state => state.user);

  useEffect(() => {
    // Only connect if we have a token and user is authenticated
    if (!isAuthenticated || !token || !user) {
      if (socket) {
        socket.disconnect();
        setSocket(null);
      }
      return;
    }

    if (!socket) {
      const url = process.env.NEXT_PUBLIC_API_URL?.replace('/api/v1', '') || 'http://localhost:3001';
      
      const nextSocket = io(url, {
        transports: ['websocket'],
        reconnection: true,
      });

      nextSocket.on('connect', () => {
        setIsConnected(true);
        // Personal-only accounts may use sale-specific customer rooms, but
        // only merchants may subscribe to merchant-wide sale notifications.
        if (user.role === 'merchant') {
          nextSocket.emit('join-merchant-room', user.id);
        }
      });

      nextSocket.on('disconnect', () => {
        setIsConnected(false);
      });

      setSocket(nextSocket);
    }

    return () => {
      // Cleanup happens when component using the global hook unmounts 
      // (Typically in root Layout so it stays alive)
    };
  }, [token, isAuthenticated, socket, user]);

  return { socket, isConnected };
};
