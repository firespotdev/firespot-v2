import { useEffect, useRef, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuthStore } from '@/services/auth';

export const useSocket = () => {
  const [isConnected, setIsConnected] = useState(false);
  const socketRef = useRef<Socket | null>(null);
  
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
  const isAuthenticated = useAuthStore(state => state.isAuthenticated);
  const user = useAuthStore(state => state.user);

  useEffect(() => {
    // Only connect if we have a token and user is authenticated
    if (!isAuthenticated || !token || !user) {
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
      return;
    }

    if (!socketRef.current) {
      const url = process.env.NEXT_PUBLIC_API_URL?.replace('/api/v1', '') || 'http://localhost:3001';
      
      const socket = io(url, {
        transports: ['websocket'],
        reconnection: true,
      });

      socket.on('connect', () => {
        setIsConnected(true);
        // Join merchant specific room using their user.id
        socket.emit('join-merchant-room', user.id);
      });

      socket.on('disconnect', () => {
        setIsConnected(false);
      });

      socketRef.current = socket;
    }

    return () => {
      // Cleanup happens when component using the global hook unmounts 
      // (Typically in root Layout so it stays alive)
    };
  }, [token, isAuthenticated, user]);

  return { socket: socketRef.current, isConnected };
};
