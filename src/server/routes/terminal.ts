import { Router, Request } from 'express';
import type { Socket } from 'socket.io/dist/socket';
import { Client } from 'ssh2';

import type { CacheCommand } from '../../types/cache';
import type { SSHClient, SSHStream } from '../../types/ssh';
import type {
  AuthenticatedSocket,
  TerminalData,
} from '../../types/terminal';
import { serverLogger as logger } from '../../utils/serverLogger';
import { redis, CACHE_KEYS } from '../cache';
import { type AuthenticatedRequest } from '../middleware/auth';

const router: Router = Router();
let ioServer: any;

// Store active SSH connections
const sshConnections = new Map<string, SSHClient>();

// Initialize Socket.IO
export const initializeSocketIO = async (socketIO: any): Promise<void> => {
  ioServer = socketIO;

  ioServer.on('connection', (socket: Socket) => {
    const authenticatedSocket = socket as AuthenticatedSocket;
    logger.info('Socket connected', { id: authenticatedSocket.id });

    authenticatedSocket.on('disconnect', () => {
      logger.info('Socket disconnected', { id: authenticatedSocket.id });
    });

    authenticatedSocket.on('terminal:data', (data: TerminalData) => {
      const { hostId } = data;
      const sshClient = sshConnections.get(hostId);

      if (sshClient && data.data) {
        (sshClient as unknown as { write: (data: string) => void }).write(data.data);
      }
    });

    authenticatedSocket.on('terminal:resize', (data: TerminalData) => {
      const { hostId, rows, cols } = data;
      const sshClient = sshConnections.get(hostId);

      if (sshClient && rows && cols) {
        (sshClient as unknown as { setWindow: (rows: number, cols: number) => void })
          .setWindow(rows, cols);
      }
    });
  });
};

interface SSHConnectionRequest {
  username: string;
  hostname: string;
  port: number;
  privateKey: string;
}

// Connect to SSH server
router.post(
  '/:hostId/connect',
  async (req: Request | AuthenticatedRequest, res) => {
    const { hostId } = req.params;
    const { username, hostname, port, privateKey } = req.body;

    try {
      // Close existing connection if any
      const existingConnection = sshConnections.get(hostId);
      if (existingConnection) {
        existingConnection.end();
        sshConnections.delete(hostId);
      }

      const sshClient = new Client() as SSHClient;

      sshClient
        .on('ready', () => {
          logger.info('SSH connection established', {
            hostId,
            hostname,
            username,
          });

          sshClient.shell({ term: 'xterm-256color' }, (err, stream: SSHStream) => {
            if (err) {
              logger.error('Failed to create shell', {
                error: err.message,
                stack: err.stack,
                hostId,
              });
              res.status(500).json({
                success: false,
                error: 'Failed to create shell',
              });
              return;
            }

            stream.on('data', (data: Buffer) => {
              ioServer.emit(`terminal:data:${hostId}`, data.toString('utf8'));
            });

            stream.on('close', () => {
              logger.info('Shell stream closed', { hostId });
              sshClient.end();
              sshConnections.delete(hostId);
              ioServer.emit(`terminal:close:${hostId}`);
            });

            sshConnections.set(hostId, sshClient);
            res.json({ success: true });
          });
        })
        .on('error', (err) => {
          logger.error('SSH connection error', {
            error: err.message,
            stack: err.stack,
            hostId,
          });
          res.status(500).json({
            success: false,
            error: err.message,
          });
        })
        .connect({
          host: hostname,
          port,
          username: process.env.DISABLE_AUTH === 'true' ? 'dev' : (req as AuthenticatedRequest).user?.username || username,
          privateKey,
        });
    } catch (error) {
      logger.error('Failed to establish SSH connection', {
        error: (error as Error).message,
        stack: (error as Error).stack,
        hostId,
      });
      res.status(500).json({
        success: false,
        error: 'Failed to establish SSH connection',
      });
    }
  },
);

// Disconnect from SSH server
router.post(
  '/:hostId/disconnect',
  async (req, res) => {
    const { hostId } = req.params;

    try {
      const sshClient = sshConnections.get(hostId);
      if (sshClient) {
        sshClient.end();
        sshConnections.delete(hostId);
        logger.info('SSH connection closed', { hostId });
      }

      res.json({ success: true });
    } catch (error) {
      logger.error('Failed to close SSH connection', {
        error: (error as Error).message,
        stack: (error as Error).stack,
        hostId,
      });
      res.status(500).json({
        success: false,
        error: 'Failed to close SSH connection',
      });
    }
  },
);

// Get command history
router.get(
  '/:hostId/history',
  async (req: Request | AuthenticatedRequest, res) => {
    const { hostId } = req.params;
    const userId = process.env.DISABLE_AUTH === 'true' ? 'dev' : (req as AuthenticatedRequest).user?.id;

    try {
      const commands = await redis.get(`${CACHE_KEYS.COMMAND}${userId}:${hostId}`);
      const history = commands ? (JSON.parse(commands) as CacheCommand[]) : [];

      res.json({
        success: true,
        data: history,
      });
    } catch (error) {
      logger.error('Failed to get command history', {
        error: (error as Error).message,
        stack: (error as Error).stack,
        hostId,
        userId,
      });
      res.status(500).json({
        success: false,
        error: 'Failed to get command history',
      });
    }
  },
);

export default router;
