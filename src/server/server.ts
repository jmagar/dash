import { createServer } from 'http';

import { Server } from 'socket.io';

import cors from 'cors';
import express from 'express';

import { errorHandler } from './middleware/errorHandler';
import { requestTracer } from './middleware/requestTracer';
import routes from './routes';
import { logger } from './utils/logger';

// Create Express app
export const app = express();

// Create HTTP server
export const server = createServer(app);

// Create Socket.IO server
export const io = new Server(server, {
  cors: {
    origin: process.env.CLIENT_URL || 'http://localhost:3000',
    methods: ['GET', 'POST'],
  },
});

// Configure middleware
app.use(cors());
app.use(express.json());
app.use(requestTracer);

// Register routes
app.use('/api', routes);

// Error handling
app.use(errorHandler);

// Socket.IO connection handling
io.on('connection', (socket) => {
  logger.info('Client connected', { socketId: socket.id });

  socket.on('disconnect', () => {
    logger.info('Client disconnected', { socketId: socket.id });
  });
});

export default server;
