import { Router, Request, Response, NextFunction } from 'express';
import { ParamsDictionary } from 'express-serve-static-core';
import { Client } from 'ssh2';

import { createAuthHandler } from '../../types/express';
import { serverLogger as logger } from '../../utils/serverLogger';
import {
  getHostStatus,
  cacheHostStatus,
  invalidateHostCache,
} from '../cache';
import { query, transaction } from '../db';
import { authenticateToken, checkRole, type AuthenticatedRequest } from '../middleware/auth';

const router: Router = Router();

// Apply authentication middleware to all routes unless auth is disabled
if (process.env.DISABLE_AUTH !== 'true') {
  router.use(authenticateToken);
}

interface Host {
    id: string;
    name: string;
    hostname: string;
    port: number;
    ip: string;
    ssh_key_id?: string;
    is_active?: boolean;
    private_key?: string;
    passphrase?: string;
}

interface HostResponse {
  success: boolean;
  data?: Host | Host[];
  error?: string;
}

interface RequestParams extends ParamsDictionary {
  id: string;
}

// Create default localhost host if none exists
const ensureDefaultHost = async (): Promise<void> => {
  if (process.env.DISABLE_AUTH !== 'true') {
    return;
  }

  try {
    const result = await query<Host>('SELECT id FROM hosts WHERE hostname = $1', ['localhost']);

    if (result.rows.length === 0) {
      logger.info('Creating default localhost host');
      await query(
        'INSERT INTO hosts (name, hostname, port, ip, is_active) VALUES ($1, $2, $3, $4, $5)',
        ['localhost', 'localhost', 22, '127.0.0.1', true],
      );
    }
  } catch (err) {
    logger.error('Error ensuring default host:', { error: (err as Error).message, stack: (err as Error).stack });
  }
};

// Ensure default host exists when the route is loaded
void ensureDefaultHost();

// List hosts
router.get('/', async (_req: Request, res: Response<HostResponse>) => {
  try {
    // Ensure default host exists before listing
    await ensureDefaultHost();

    const cachedHosts = await getHostStatus('all');
    if (cachedHosts) {
      return res.json({ success: true, data: cachedHosts as Host[] });
    }

    const result = await query<Host>(
      'SELECT * FROM hosts ORDER BY name',
      [],
    );

    const hosts = result.rows;
    await cacheHostStatus('all', hosts);
    res.json({ success: true, data: hosts });
  } catch (err) {
    logger.error('Error listing hosts:', { error: (err as Error).message, stack: (err as Error).stack });
    res.status(500).json({ success: false, error: 'Failed to list hosts' });
  }
});

// Get host details
router.get('/:id', async (req: Request<RequestParams>, res: Response<HostResponse>) => {
  try {
    const cachedHost = await getHostStatus(req.params.id);
    if (cachedHost) {
      return res.json({ success: true, data: cachedHost as Host });
    }

    const result = await query<Host>(
      'SELECT h.*, sk.name as key_name FROM hosts h LEFT JOIN ssh_keys sk ON h.ssh_key_id = sk.id WHERE h.id = $1',
      [req.params.id],
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Host not found' });
    }

    const host = result.rows[0];
    await cacheHostStatus(req.params.id, host);
    res.json({ success: true, data: host });
  } catch (err) {
    logger.error('Error getting host:', { error: (err as Error).message, stack: (err as Error).stack });
    res.status(500).json({ success: false, error: 'Failed to get host' });
  }
});

interface CreateHostRequest {
  name: string;
  hostname: string;
  port: number;
  ip: string;
  sshKeyId?: string;
}

// Create host
router.post(
  '/',
  process.env.DISABLE_AUTH !== 'true' ? checkRole(['admin']) : (_req: Request, _res: Response, next: NextFunction): void => next(),
  createAuthHandler<ParamsDictionary, HostResponse, CreateHostRequest>(async (req, res) => {
    const { name, hostname, port, ip, sshKeyId } = req.body;

    try {
      const result = await transaction(async (client) => {
        // Check if host already exists
        const existing = await client.query(
          'SELECT id FROM hosts WHERE hostname = $1 AND port = $2',
          [hostname, port],
        );

        if (existing.rows.length > 0) {
          throw new Error('Host already exists');
        }

        // Create new host
        const result = await client.query<Host>(
          'INSERT INTO hosts (name, hostname, port, ip, ssh_key_id) VALUES ($1, $2, $3, $4, $5) RETURNING *',
          [name, hostname, port, ip, sshKeyId],
        );

        return result.rows[0];
      });

      await invalidateHostCache('all');
      res.json({ success: true, data: result });
    } catch (err) {
      logger.error('Error creating host:', { error: (err as Error).message, stack: (err as Error).stack });
      res.status(500).json({ success: false, error: (err as Error).message });
    }
  }),
);

interface UpdateHostRequest extends CreateHostRequest {
  isActive?: boolean;
}

// Update host
router.patch(
  '/:id',
  process.env.DISABLE_AUTH !== 'true' ? checkRole(['admin']) : (_req: Request, _res: Response, next: NextFunction): void => next(),
  createAuthHandler<RequestParams, HostResponse, UpdateHostRequest>(async (req, res) => {
    const { name, hostname, port, ip, sshKeyId, isActive } = req.body;

    try {
      const result = await transaction(async (client) => {
        const existing = await client.query(
          'SELECT id FROM hosts WHERE id = $1',
          [req.params.id],
        );

        if (existing.rows.length === 0) {
          throw new Error('Host not found');
        }

        const result = await client.query<Host>(
          `UPDATE hosts
           SET name = $1, hostname = $2, port = $3, ip = $4, ssh_key_id = $5, is_active = $6, updated_at = CURRENT_TIMESTAMP
           WHERE id = $7
           RETURNING *`,
          [name, hostname, port, ip, sshKeyId, isActive, req.params.id],
        );

        return result.rows[0];
      });

      await invalidateHostCache(req.params.id);
      await invalidateHostCache('all');
      res.json({ success: true, data: result });
    } catch (err) {
      logger.error('Error updating host:', { error: (err as Error).message, stack: (err as Error).stack });
      res.status(500).json({ success: false, error: (err as Error).message });
    }
  }),
);

interface DeleteHostResponse {
  success: boolean;
  error?: string;
}

// Delete host
router.delete(
  '/:id',
  process.env.DISABLE_AUTH !== 'true' ? checkRole(['admin']) : (_req: Request, _res: Response, next: NextFunction): void => next(),
  createAuthHandler<RequestParams, DeleteHostResponse>(async (req, res) => {
    try {
      await transaction(async (client) => {
        // Check for active connections or dependencies
        const activeCommands = await client.query<{ count: string }>(
          'SELECT COUNT(*) FROM command_history WHERE host_id = $1 AND created_at > NOW() - INTERVAL \'5 minutes\'',
          [req.params.id],
        );

        if (parseInt(activeCommands.rows[0].count) > 0) {
          throw new Error('Host has active connections');
        }

        await client.query('DELETE FROM hosts WHERE id = $1', [req.params.id]);
      });

      await invalidateHostCache(req.params.id);
      await invalidateHostCache('all');
      res.json({ success: true });
    } catch (err) {
      logger.error('Error deleting host:', { error: (err as Error).message, stack: (err as Error).stack });
      res.status(500).json({ success: false, error: (err as Error).message });
    }
  }),
);

// Test connection
router.post(
  '/:id/test',
  createAuthHandler<RequestParams, DeleteHostResponse>(async (req, res) => {
    try {
      const result = await query<Host>(
        'SELECT h.*, sk.private_key, sk.passphrase FROM hosts h LEFT JOIN ssh_keys sk ON h.ssh_key_id = sk.id WHERE h.id = $1',
        [req.params.id],
      );

      if (result.rows.length === 0) {
        return res.status(404).json({ success: false, error: 'Host not found' });
      }

      const host = result.rows[0];
      const conn = new Client();

      const testConnection = new Promise<void>((resolve, reject) => {
        conn.on('ready', () => {
          conn.end();
          resolve();
        });

        conn.on('error', (err) => {
          reject(err);
        });

        conn.connect({
          host: host.hostname,
          port: host.port,
          username: process.env.DISABLE_AUTH === 'true' ? 'dev' : (req as AuthenticatedRequest).user?.username || 'dev',
          privateKey: host.private_key,
          passphrase: host.passphrase,
        });
      });

      await testConnection;
      res.json({ success: true });
    } catch (err) {
      logger.error('Error testing connection:', { error: (err as Error).message, stack: (err as Error).stack });
      res.status(500).json({ success: false, error: (err as Error).message });
    }
  }),
);

export default router;
