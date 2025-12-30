import { createContext, useContext, useEffect, useState, useRef } from 'react';
import { AuthContext } from '../Authentication/AuthProvider';
import { io } from 'socket.io-client';

const WebSocketContext = createContext();

const API_BASE = (import.meta.env.VITE_API_URL || 'http://localhost:5000').replace(/\/$/, '');

export function WebSocketProvider({ children }) {
  const { user } = useContext(AuthContext);
  const [socket, setSocket] = useState(null);
  const [connected, setConnected] = useState(false);
  const socketRef = useRef(null);

  useEffect(() => {
    if (!user?.uid) {
      if (socketRef.current) {
        socketRef.current.disconnect();
        setSocket(null);
        setConnected(false);
      }
      return;
    }

    // Initialize Socket.io connection
    const newSocket = io(API_BASE, {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 5,
    });

    newSocket.on('connect', () => {
      console.log('🔌 WebSocket connected');
      setConnected(true);
      // Join user room
      newSocket.emit('join_user', user.uid);
    });

    newSocket.on('disconnect', () => {
      console.log('🔌 WebSocket disconnected');
      setConnected(false);
    });

    newSocket.on('connect_error', (error) => {
      console.error('❌ WebSocket connection error:', error);
      setConnected(false);
    });

    setSocket(newSocket);
    socketRef.current = newSocket;

    return () => {
      if (newSocket) {
        newSocket.disconnect();
      }
    };
  }, [user?.uid]);

  // Send message via WebSocket
  const sendMessage = (data) => {
    if (socket && connected) {
      socket.emit('message:send', data);
    } else {
      console.warn('WebSocket not connected, message not sent');
    }
  };

  // Send typing indicator
  const sendTyping = (recipientId, typing = true) => {
    if (socket && connected) {
      socket.emit(typing ? 'typing:start' : 'typing:stop', {
        recipientId,
        senderId: user?.uid,
      });
    }
  };

  // Mark messages as read
  const markMessagesRead = (conversationId, senderId) => {
    if (socket && connected) {
      socket.emit('message:read', {
        conversationId,
        userId: user?.uid,
        senderId,
      });
    }
  };

  return (
    <WebSocketContext.Provider
      value={{
        socket,
        connected,
        sendMessage,
        sendTyping,
        markMessagesRead,
      }}
    >
      {children}
    </WebSocketContext.Provider>
  );
}

export function useWebSocket() {
  const context = useContext(WebSocketContext);
  if (!context) {
    throw new Error('useWebSocket must be used within WebSocketProvider');
  }
  return context;
}

