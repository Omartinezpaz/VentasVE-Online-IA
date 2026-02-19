'use client';

import { io, Socket } from 'socket.io-client';
import { getAccessToken } from '../auth/storage';

let socket: Socket | null = null;

export const getSocket = () => {
  if (!socket) {
    const token = getAccessToken();
    socket = io(process.env.NEXT_PUBLIC_WS_URL || 'http://localhost:3001', {
      auth: { token },
      transports: ['websocket']
    });

    socket.on('connect', () => {
      console.log('WebSocket conectado');
    });

    socket.on('disconnect', () => {
      console.log('WebSocket desconectado');
    });
  }
  return socket;
};

export const disconnectSocket = () => {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
};

