import { Server } from 'socket.io';
import jwt from 'jsonwebtoken';
import { env } from './env';

type UserPayload = {
  userId: string;
  businessId: string;
  role: string;
  email: string;
};

let io: Server | null = null;

export const initWebSocket = (server: any) => {
  io = new Server(server, {
    cors: {
      origin: '*'
    }
  });

  io.use((socket, next) => {
    const token = socket.handshake.auth?.token as string | undefined;

    if (!token) {
      return next(new Error('Unauthorized'));
    }

    try {
      const decoded = jwt.verify(token, env.JWT_SECRET) as UserPayload;
      (socket.data as any).user = decoded;
      const businessId = decoded.businessId;
      socket.join(`business:${businessId}`);
      next();
    } catch {
      next(new Error('Unauthorized'));
    }
  });

  io.on('connection', socket => {
    const user = (socket.data as any).user;
    if (user?.businessId) {
      socket.join(`business:${user.businessId}`);
    }
  });

  return io;
};

export const emitToBusiness = (businessId: string, event: string, data: any) => {
  if (!io) return;
  io.to(`business:${businessId}`).emit(event, data);
};

