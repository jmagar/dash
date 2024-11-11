import express, { Router } from 'express';
import { Client } from 'ssh2';

import { Cache, CacheCommand } from '../../types/cache';
import { createAuthHandler } from '../../types/express';
import { SSHClient, SSHHostConnection, SSHStream } from '../../types/ssh';
import {
  AuthenticatedSocket,
  CommandData,
  CommandHistory,
  CommandHistoryResponse,
  ResizeData,
  TerminalData,
  TerminalServer,
  TerminalState,
  convertToCache,
} from '../../types/terminal';
import { serverLogger as logger } from '../../utils/serverLogger';
import cacheModule from '../cache';
import { query } from '../db';

const router: Router = express.Router();
const cache = cacheModule as Cache;

// Initialize WebSocket handlers
export const initTerminalSocket = (io: TerminalServer): void => {
  const terminalNamespace = io.of('/terminal');

  terminalNamespace.on('connection', (socket: AuthenticatedSocket) => {
    const state: TerminalState = {
      sshClient: null,
      stream: null,
    };

    socket.on('init', async (data: TerminalData) => {
      try {
        const { hostId } = data;

        // Get host details with SSH key
        const result = await query<SSHHostConnection>(
          'SELECT h.*, sk.private_key, sk.passphrase FROM hosts h LEFT JOIN ssh_keys sk ON h.ssh_key_id = sk.id WHERE h.id = $1',
          [hostId],
        );

        if (result.rows.length === 0) {
          socket.emit('error', 'Host not found');
          return;
        }

        const host = result.rows[0];
        state.sshClient = new Client() as SSHClient;

        // Set up SSH connection
        state.sshClient.on('ready', () => {
          if (!state.sshClient) return;

          state.sshClient.shell({
            term: 'xterm-256color',
            rows: data.rows || 24,
            cols: data.cols || 80,
          }, (err: Error | undefined, sshStream: SSHStream) => {
            if (err) {
              logger.error('SSH stream error:', { error: err.message, stack: err.stack });
              socket.emit('error', err.message);
              return;
            }

            state.stream = sshStream;

            // Handle data from SSH server
            state.stream.on('data', (data: Buffer) => {
              socket.emit('data', data.toString('utf8'));
            });

            // Handle SSH stream close
            state.stream.on('close', () => {
              socket.emit('close');
              if (state.sshClient) {
                state.sshClient.end();
              }
            });

            socket.emit('ready');
          });
        });

        // Handle SSH errors
        state.sshClient.on('error', (err: Error) => {
          logger.error('SSH connection error:', { error: err.message, stack: err.stack });
          socket.emit('error', err.message);
          if (state.stream) {
            state.stream.end();
          }
          if (state.sshClient) {
            state.sshClient.end();
          }
        });

        // Connect to host
        state.sshClient.connect({
          host: host.hostname,
          port: host.port,
          username: socket.user.username,
          privateKey: host.private_key,
          passphrase: host.passphrase,
        });

      } catch (err) {
        logger.error('Terminal initialization error:', { error: (err as Error).message, stack: (err as Error).stack });
        socket.emit('error', (err as Error).message);
      }
    });

    // Handle data from client
    socket.on('data', (data: string) => {
      if (state.stream) {
        state.stream.write(data);
      }
    });

    // Handle resize events
    socket.on('resize', (data: ResizeData) => {
      if (state.stream) {
        state.stream.setWindow(data.rows, data.cols);
      }
    });

    // Handle command execution
    socket.on('execute', async (data: CommandData) => {
      try {
        const { hostId, command } = data;

        // Cache command in history
        await cache.cacheCommand(socket.user.id, hostId, {
          command,
          timestamp: new Date(),
        });

        // Log command to database
        await query(
          'INSERT INTO command_history (user_id, host_id, command, created_at) VALUES ($1, $2, $3, CURRENT_TIMESTAMP)',
          [socket.user.id, hostId, command],
        );

        if (state.stream) {
          state.stream.write(`${command}\n`);
        }
      } catch (err) {
        logger.error('Command execution error:', { error: (err as Error).message, stack: (err as Error).stack });
        socket.emit('error', (err as Error).message);
      }
    });

    // Handle client disconnect
    socket.on('disconnect', () => {
      if (state.stream) {
        state.stream.end();
      }
      if (state.sshClient) {
        state.sshClient.end();
      }
    });
  });
};

// Get command history
router.get(
  '/:hostId/history',
  createAuthHandler<{ hostId: string }, CommandHistoryResponse>(async (req, res) => {
    try {
      // Check cache first
      const cachedHistory: CacheCommand[] | null = await cache.getCommands(req.user.id, req.params.hostId);
      if (cachedHistory) {
        return res.json({ success: true, data: cachedHistory });
      }

      // Get from database
      const result = await query<CommandHistory>(
        `SELECT * FROM command_history
         WHERE user_id = $1 AND host_id = $2
         ORDER BY created_at DESC LIMIT 100`,
        [req.user.id, req.params.hostId],
      );

      const commands = result.rows;
      await cache.cacheCommand(req.user.id, req.params.hostId, commands.map(convertToCache));
      res.json({ success: true, data: commands });
    } catch (err) {
      logger.error('Error getting command history:', { error: (err as Error).message, stack: (err as Error).stack });
      res.status(500).json({ success: false, error: (err as Error).message });
    }
  }),
);

export { router };
