import React, { createContext, useContext, useEffect, useState } from 'react';
import { io } from 'socket.io-client';

const SocketContext = createContext(null);
const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000';

export const SocketProvider = ({ children }) => {
  const [socket, setSocket] = useState(null);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    const socketInstance = io(SOCKET_URL, {
      transports: ['websocket', 'polling'],
      autoConnect: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
    });

    socketInstance.on('connect', () => {
      console.log('⚡ Connected to WebSockets server:', socketInstance.id);
      setIsConnected(true);
    });

    socketInstance.on('disconnect', () => {
      console.log('🔌 Disconnected from WebSockets server');
      setIsConnected(false);
    });

    setSocket(socketInstance);

    return () => {
      socketInstance.disconnect();
    };
  }, []);

  const joinRoom = (sessionId, user) => {
    if (socket && sessionId) {
      socket.emit('join-room', { sessionId, user });
    }
  };

  const sendCodeChange = (sessionId, code, language, cursor) => {
    if (socket && sessionId) {
      socket.emit('code-change', { sessionId, code, language, cursor });
    }
  };

  const sendLanguageChange = (sessionId, language, starterCode) => {
    if (socket && sessionId) {
      socket.emit('language-change', { sessionId, language, starterCode });
    }
  };

  const sendChatMessage = (sessionId, message) => {
    if (socket && sessionId && message) {
      socket.emit('send-chat', { sessionId, message });
    }
  };

  return (
    <SocketContext.Provider
      value={{
        socket,
        isConnected,
        joinRoom,
        sendCodeChange,
        sendLanguageChange,
        sendChatMessage,
      }}
    >
      {children}
    </SocketContext.Provider>
  );
};

export const useSocket = () => {
  const context = useContext(SocketContext);
  if (!context) {
    throw new Error('useSocket must be used within a SocketProvider');
  }
  return context;
};
