import { Router } from 'express';
import type { Socket } from 'socket.io/dist/socket';
import { Client } from 'ssh2';

import type { ApiResult } from '../../types/api-shared';
import type { CacheCommand } from '../../types/cache';
import { handleApiError } from '../../types/error';
import { type AuthenticatedRequestHandler, createAuthHandler } from '../../types/express';
import type { SSHClient, SSHStream } from '../../types/ssh';
import type {
  AuthenticatedSocket,
  TerminalData,
} from '../../types/terminal';
import { serverLogger as logger } from '../../utils/serverLogger';
import { redis, CACHE_KEYS } from '../cache';

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

interface TerminalRequestParams {
  hostId: string;
}

// Connect to SSH server
const connectSSH: AuthenticatedRequestHandler<
  TerminalRequestParams,
  ApiResult<void>,
  SSHConnectionRequest
> = async (req, res) => {
  const { hostId } = req.params;
  const { username, hostname, port, privateKey } = req.body;

  try {
    logger.info('Establishing SSH connection', { hostId, hostname, username });

    // Close existing connection if any
    const existingConnection = sshConnections.get(hostId);
    if (existingConnection) {
      logger.info('Closing existing connection', { hostId });
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
        username: process.env.DISABLE_AUTH === 'true' ? 'dev' : req.user?.username || username,
        privateKey,
      });
  } catch (error) {
    const errorResult = handleApiError<void>(error, 'connectSSH');
    res.status(500).json(errorResult);
  }
};

// Disconnect from SSH server
const disconnectSSH: AuthenticatedRequestHandler<
  TerminalRequestParams,
  ApiResult<void>
> = async (req, res) => {
  const { hostId } = req.params;

  try {
    logger.info('Disconnecting SSH connection', { hostId });
    const sshClient = sshConnections.get(hostId);
    if (sshClient) {
      sshClient.end();
      sshConnections.delete(hostId);
      logger.info('SSH connection closed', { hostId });
    }

    res.json({ success: true });
  } catch (error) {
    const errorResult = handleApiError<void>(error, 'disconnectSSH');
    res.status(500).json(errorResult);
  }
};

// Get command history
const getCommandHistory: AuthenticatedRequestHandler<
  TerminalRequestParams,
  ApiResult<CacheCommand[]>
> = async (req, res) => {
  const { hostId } = req.params;
  const userId = process.env.DISABLE_AUTH === 'true' ? 'dev' : req.user?.id;

  try {
    logger.info('Fetching command history', { hostId, userId });
    const client = await redis.getClient();
    if (!client) {
      logger.warn('Redis client not available', { hostId, userId });
      res.json({
        success: true,
        data: [],
      });
      return;
    }

    const commands = await client.get(`${CACHE_KEYS.COMMAND}${userId}:${hostId}`);
    const history = commands ? (JSON.parse(commands) as CacheCommand[]) : [];

    logger.info('Command history fetched successfully', {
      hostId,
      userId,
      count: history.length,
    });

    res.json({
      success: true,
      data: history,
    });
  } catch (error) {
    const errorResult = handleApiError<CacheCommand[]>(error, 'getCommandHistory');
    res.status(500).json(errorResult);
  }
};

// Register routes
router.post('/:hostId/connect', createAuthHandler(connectSSH));
router.post('/:hostId/disconnect', createAuthHandler(disconnectSSH));
router.get('/:hostId/history', createAuthHandler(getCommandHistory));

export default router;
