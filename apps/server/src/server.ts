import 'dotenv/config';
import http from 'http';
import { createApp } from './app.js';
import { env } from './config/env.js';
import { createGateway } from './socket/index.js';

const app = createApp();
const httpServer = http.createServer(app);

createGateway(httpServer);

httpServer.listen(env.PORT, '127.0.0.1', () => {
  console.log(`Server running on port ${env.PORT} [${env.NODE_ENV}]`);
});

process.on('unhandledRejection', (reason: unknown) => {
  console.error('Unhandled rejection:', reason);
  process.exit(1);
});

process.on('uncaughtException', (err: Error) => {
  console.error('Uncaught exception:', err);
  process.exit(1);
});

function gracefulShutdown() {
  console.log('Shutting down gracefully...');
  httpServer.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
}

process.on('SIGTERM', gracefulShutdown);
process.on('SIGINT', gracefulShutdown);