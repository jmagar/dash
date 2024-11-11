import { Router } from 'express';
import { Client } from 'ssh2';

import { createAuthHandler } from '../../types/express';
import {
  Package,
  PackageUpdate,
  CommandResult,
  PackageResponse,
  PackageRequest,
  RequestParams,
  HostConnection,
} from '../../types/packages';
import { SSHClient, SSHStream } from '../../types/ssh';
import { serverLogger as logger } from '../../utils/serverLogger';
import cache from '../cache';
import { query } from '../db';
import { authenticateToken } from '../middleware/auth';

const router = Router();

// Apply authentication middleware to all routes
router.use(authenticateToken);

// Execute package manager command
const executeCommand = async (host: HostConnection, command: string): Promise<CommandResult> => {
  return new Promise((resolve, reject) => {
    const conn = new Client() as SSHClient;
    let output = '';

    conn.on('ready', () => {
      conn.exec(command, (err, stream: SSHStream) => {
        if (err) {
          reject(err);
          return;
        }

        stream.on('data', (data: Buffer) => {
          output += data.toString();
        });

        stream.stderr.on('data', (data: Buffer) => {
          output += data.toString();
        });

        stream.on('close', (code: number) => {
          conn.end();
          resolve({ code, output });
        });
      });
    });

    conn.on('error', reject);

    conn.connect({
      host: host.hostname,
      port: host.port,
      username: host.username,
      privateKey: host.private_key,
      passphrase: host.passphrase,
    });
  });
};

// List installed packages
router.get(
  '/:hostId/list',
  createAuthHandler<RequestParams, PackageResponse>(async (req, res) => {
    try {
      // Check cache first
      const cachedPackages = await cache.redis.get(`packages:${req.params.hostId}`);
      if (cachedPackages) {
        return res.json({ success: true, data: JSON.parse(cachedPackages) as Package[] });
      }

      const result = await query<HostConnection>(
        'SELECT h.*, sk.private_key, sk.passphrase FROM hosts h LEFT JOIN ssh_keys sk ON h.ssh_key_id = sk.id WHERE h.id = $1',
        [req.params.hostId],
      );

      if (result.rows.length === 0) {
        return res.status(404).json({ success: false, error: 'Host not found' });
      }

      const host = result.rows[0];

      // Try apt first then fallback to yum
      const { code, output } = await executeCommand(host, 'which apt-get && dpkg -l || which yum && rpm -qa');

      const packages: Package[] = output
        .split('\n')
        .filter(line => line.trim())
        .map(line => {
          const parts = line.split(/\s+/);
          return {
            name: parts[1] || parts[0],
            version: parts[2] || '',
            description: parts.slice(3).join(' ') || '',
            installed: true,
          };
        });

      // Cache the results for 5 minutes
      await cache.redis.setex(`packages:${req.params.hostId}`, 300, JSON.stringify(packages));

      res.json({ success: true, data: packages });
    } catch (err) {
      logger.error('Error listing packages:', { error: (err as Error).message, stack: (err as Error).stack });
      res.status(500).json({ success: false, error: (err as Error).message });
    }
  }),
);

// Install package
router.post(
  '/:hostId/install',
  createAuthHandler<RequestParams, PackageResponse, PackageRequest>(async (req, res) => {
    const { name } = req.body;
    if (!name) {
      return res.status(400).json({ success: false, error: 'Package name required' });
    }

    try {
      const result = await query<HostConnection>(
        'SELECT h.*, sk.private_key, sk.passphrase FROM hosts h LEFT JOIN ssh_keys sk ON h.ssh_key_id = sk.id WHERE h.id = $1',
        [req.params.hostId],
      );

      if (result.rows.length === 0) {
        return res.status(404).json({ success: false, error: 'Host not found' });
      }

      const host = result.rows[0];

      // Try apt first then fallback to yum
      const { code, output } = await executeCommand(
        host,
        `which apt-get && sudo DEBIAN_FRONTEND=noninteractive apt-get install -y ${name} || which yum && sudo yum install -y ${name}`,
      );

      if (code !== 0) {
        throw new Error(`Installation failed: ${output}`);
      }

      // Invalidate package cache
      await cache.redis.del(`packages:${req.params.hostId}`);

      res.json({ success: true, data: { output } });
    } catch (err) {
      logger.error('Error installing package:', { error: (err as Error).message, stack: (err as Error).stack });
      res.status(500).json({ success: false, error: (err as Error).message });
    }
  }),
);

// Uninstall package
router.post(
  '/:hostId/uninstall',
  createAuthHandler<RequestParams, PackageResponse, PackageRequest>(async (req, res) => {
    const { name } = req.body;
    if (!name) {
      return res.status(400).json({ success: false, error: 'Package name required' });
    }

    try {
      const result = await query<HostConnection>(
        'SELECT h.*, sk.private_key, sk.passphrase FROM hosts h LEFT JOIN ssh_keys sk ON h.ssh_key_id = sk.id WHERE h.id = $1',
        [req.params.hostId],
      );

      if (result.rows.length === 0) {
        return res.status(404).json({ success: false, error: 'Host not found' });
      }

      const host = result.rows[0];

      // Try apt first then fallback to yum
      const { code, output } = await executeCommand(
        host,
        `which apt-get && sudo DEBIAN_FRONTEND=noninteractive apt-get remove -y ${name} || which yum && sudo yum remove -y ${name}`,
      );

      if (code !== 0) {
        throw new Error(`Uninstallation failed: ${output}`);
      }

      // Invalidate package cache
      await cache.redis.del(`packages:${req.params.hostId}`);

      res.json({ success: true, data: { output } });
    } catch (err) {
      logger.error('Error uninstalling package:', { error: (err as Error).message, stack: (err as Error).stack });
      res.status(500).json({ success: false, error: (err as Error).message });
    }
  }),
);

// Update package
router.post(
  '/:hostId/update',
  createAuthHandler<RequestParams, PackageResponse, PackageRequest>(async (req, res) => {
    const { name } = req.body;
    if (!name) {
      return res.status(400).json({ success: false, error: 'Package name required' });
    }

    try {
      const result = await query<HostConnection>(
        'SELECT h.*, sk.private_key, sk.passphrase FROM hosts h LEFT JOIN ssh_keys sk ON h.ssh_key_id = sk.id WHERE h.id = $1',
        [req.params.hostId],
      );

      if (result.rows.length === 0) {
        return res.status(404).json({ success: false, error: 'Host not found' });
      }

      const host = result.rows[0];

      // Try apt first then fallback to yum
      const { code, output } = await executeCommand(
        host,
        `which apt-get && sudo DEBIAN_FRONTEND=noninteractive apt-get upgrade -y ${name} || which yum && sudo yum update -y ${name}`,
      );

      if (code !== 0) {
        throw new Error(`Update failed: ${output}`);
      }

      // Invalidate package cache
      await cache.redis.del(`packages:${req.params.hostId}`);

      res.json({ success: true, data: { output } });
    } catch (err) {
      logger.error('Error updating package:', { error: (err as Error).message, stack: (err as Error).stack });
      res.status(500).json({ success: false, error: (err as Error).message });
    }
  }),
);

// Check for updates
router.get(
  '/:hostId/updates',
  createAuthHandler<RequestParams, PackageResponse>(async (req, res) => {
    try {
      const result = await query<HostConnection>(
        'SELECT h.*, sk.private_key, sk.passphrase FROM hosts h LEFT JOIN ssh_keys sk ON h.ssh_key_id = sk.id WHERE h.id = $1',
        [req.params.hostId],
      );

      if (result.rows.length === 0) {
        return res.status(404).json({ success: false, error: 'Host not found' });
      }

      const host = result.rows[0];

      // Try apt first then fallback to yum
      const { code, output } = await executeCommand(
        host,
        `which apt-get && sudo apt-get update && apt list --upgradable || which yum && sudo yum check-update`,
      );

      // yum check-update returns 100 when updates are available
      if (code !== 0 && code !== 100) {
        throw new Error(`Update check failed: ${output}`);
      }

      const updates: PackageUpdate[] = output
        .split('\n')
        .filter(line => line.includes('=>'))
        .map(line => {
          const [name, version] = line.split('=>').map(s => s.trim());
          return { name, version };
        });

      res.json({ success: true, data: updates });
    } catch (err) {
      logger.error('Error checking updates:', { error: (err as Error).message, stack: (err as Error).stack });
      res.status(500).json({ success: false, error: (err as Error).message });
    }
  }),
);

export default router;
