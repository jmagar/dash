import express from 'express';
import { Client } from 'ssh2';

import cache from '../cache';
import { query, transaction } from '../db.js';
import { checkRole } from '../middleware/auth.js';
import { serverLogger as logger } from '../utils/serverLogger';

const router = express.Router();

// List hosts
router.get('/', async (req, res) => {
  try {
    const cachedHosts = await cache.getHostStatus('all');
    if (cachedHosts) {
      return res.json({ success: true, data: cachedHosts });
    }

    const result = await query(
      'SELECT * FROM hosts ORDER BY name',
      [],
      { cache: true, ttl: 60 },
    );

    const hosts = result.rows;
    await cache.cacheHostStatus('all', hosts);
    res.json({ success: true, data: hosts });
  } catch (err) {
    logger.error('Error listing hosts:', { error: err.message, stack: err.stack });
    res.status(500).json({ success: false, error: 'Failed to list hosts' });
  }
});

// Get host details
router.get('/:id', async (req, res) => {
  try {
    const cachedHost = await cache.getHostStatus(req.params.id);
    if (cachedHost) {
      return res.json({ success: true, data: cachedHost });
    }

    const result = await query(
      'SELECT h.*, sk.name as key_name FROM hosts h LEFT JOIN ssh_keys sk ON h.ssh_key_id = sk.id WHERE h.id = $1',
      [req.params.id],
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Host not found' });
    }

    const host = result.rows[0];
    await cache.cacheHostStatus(req.params.id, host);
    res.json({ success: true, data: host });
  } catch (err) {
    logger.error('Error getting host:', { error: err.message, stack: err.stack });
    res.status(500).json({ success: false, error: 'Failed to get host' });
  }
});

// Create host
router.post('/', checkRole(['admin']), async (req, res) => {
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
      const result = await client.query(
        'INSERT INTO hosts (name, hostname, port, ip, ssh_key_id) VALUES ($1, $2, $3, $4, $5) RETURNING *',
        [name, hostname, port, ip, sshKeyId],
      );

      return result.rows[0];
    });

    await cache.invalidateHostCache('all');
    res.json({ success: true, data: result });
  } catch (err) {
    logger.error('Error creating host:', { error: err.message, stack: err.stack });
    res.status(500).json({ success: false, error: err.message });
  }
});

// Update host
router.patch('/:id', checkRole(['admin']), async (req, res) => {
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

      const result = await client.query(
        `UPDATE hosts
         SET name = $1, hostname = $2, port = $3, ip = $4, ssh_key_id = $5, is_active = $6, updated_at = CURRENT_TIMESTAMP
         WHERE id = $7
         RETURNING *`,
        [name, hostname, port, ip, sshKeyId, isActive, req.params.id],
      );

      return result.rows[0];
    });

    await cache.invalidateHostCache(req.params.id);
    await cache.invalidateHostCache('all');
    res.json({ success: true, data: result });
  } catch (err) {
    logger.error('Error updating host:', { error: err.message, stack: err.stack });
    res.status(500).json({ success: false, error: err.message });
  }
});

// Delete host
router.delete('/:id', checkRole(['admin']), async (req, res) => {
  try {
    await transaction(async (client) => {
      // Check for active connections or dependencies
      const activeCommands = await client.query(
        'SELECT COUNT(*) FROM command_history WHERE host_id = $1 AND created_at > NOW() - INTERVAL \'5 minutes\'',
        [req.params.id],
      );

      if (activeCommands.rows[0].count > 0) {
        throw new Error('Host has active connections');
      }

      await client.query('DELETE FROM hosts WHERE id = $1', [req.params.id]);
    });

    await cache.invalidateHostCache(req.params.id);
    await cache.invalidateHostCache('all');
    res.json({ success: true });
  } catch (err) {
    logger.error('Error deleting host:', { error: err.message, stack: err.stack });
    res.status(500).json({ success: false, error: err.message });
  }
});

// Test connection
router.post('/:id/test', async (req, res) => {
  try {
    const result = await query(
      'SELECT h.*, sk.private_key, sk.passphrase FROM hosts h LEFT JOIN ssh_keys sk ON h.ssh_key_id = sk.id WHERE h.id = $1',
      [req.params.id],
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Host not found' });
    }

    const host = result.rows[0];
    const conn = new Client();

    const testConnection = new Promise((resolve, reject) => {
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
        username: req.user.username,
        privateKey: host.private_key,
        passphrase: host.passphrase,
      });
    });

    await testConnection;
    res.json({ success: true });
  } catch (err) {
    logger.error('Error testing connection:', { error: err.message, stack: err.stack });
    res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
