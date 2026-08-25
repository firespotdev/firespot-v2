import { useEffect } from 'react';
import { io, Socket } from 'socket.io-client';
import { create } from 'zustand';
import { useAuthStore } from '@/services/auth';

interface SocketState {
  socket: Socket | null;
  isConnected: boolean;
}

const useSocketState = create<SocketState>(() => ({
  socket: null,
  isConnected: false,
}));

let sharedSocket: Socket | null = null;
let merchantRoomId: string | null = null;

const getSharedSocket = () => {
  if (sharedSocket) return sharedSocket;

  const url =
    process.env.NEXT_PUBLIC_API_URL?.replace('/api/v1', '') ||
    'http://localhost:3001';
  sharedSocket = io(url, {
    transports: ['websocket'],
    reconnection: true,
  });
  sharedSocket.on('connect', () => {
    if (merchantRoomId) {
      sharedSocket?.emit('join-merchant-room', merchantRoomId);
    }
  });

  return sharedSocket;
};

export const useSocket = () => {
  const { socket, isConnected } = useSocketState();
  const token = useAuthStore(state => state.token);
  const isAuthenticated = useAuthStore(state => state.isAuthenticated);
  const user = useAuthStore(state => state.user);

  useEffect(() => {
    // Only connect if we have a token and user is authenticated
    if (!isAuthenticated || !token || !user) {
      if (sharedSocket) {
        sharedSocket.disconnect();
        sharedSocket = null;
      }
      merchantRoomId = null;
      useSocketState.setState({ socket: null, isConnected: false });
      return;
    }

    merchantRoomId = user.role === 'merchant' ? user.id : null;
    const nextSocket = getSharedSocket();
    const handleConnect = () =>
      useSocketState.setState({ socket: nextSocket, isConnected: true });
    const handleDisconnect = () =>
      useSocketState.setState({ socket: nextSocket, isConnected: false });

    nextSocket.on('connect', handleConnect);
    nextSocket.on('disconnect', handleDisconnect);
    useSocketState.setState({
      socket: nextSocket,
      isConnected: nextSocket.connected,
    });

    if (nextSocket.connected && merchantRoomId) {
      nextSocket.emit('join-merchant-room', merchantRoomId);
    }

    return () => {
      nextSocket.off('connect', handleConnect);
      nextSocket.off('disconnect', handleDisconnect);
    };
  }, [token, isAuthenticated, user]);

  return { socket, isConnected };
};
