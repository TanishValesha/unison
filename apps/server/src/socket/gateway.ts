import { Server as HttpServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import { env } from '../config/env';
import { registerHandlers } from './handler';

let io: SocketIOServer | null = null;

/**
 * Create and attach a Socket.IO server to the HTTP server.
 */
export function createGateway(httpServer: HttpServer): SocketIOServer {
  io = new SocketIOServer(httpServer, {
    cors: {
      origin: env.CORS_ORIGIN,
      methods: ['GET', 'POST'],
    },
    pingTimeout: 30000,
    pingInterval: 10000,
  });

  io.on('connection', (socket) => {
    console.log(`[WS] Client connected: ${socket.id}`);
    registerHandlers(socket, io!);

    socket.on('disconnect', (reason) => {
      console.log(`[WS] Client disconnected: ${socket.id} (${reason})`);
    });
  });

  console.log('[WS] Socket.IO gateway initialized');
  return io;
}

/**
 * Get the Socket.IO server instance.
 */
export function getIO(): SocketIOServer | null {
  return io;
}