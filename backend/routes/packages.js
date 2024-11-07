const express = require('express');
const { Client } = require('ssh2');
const { query } = require('../db');
const cache = require('../cache');
const router = express.Router();

// Execute package manager command
const executeCommand = async (host, command) => {
  return new Promise((resolve, reject) => {
    const conn = new Client();
    let output = '';

    conn.on('ready', () => {
      conn.exec(command, (err, stream) => {
        if (err) {
          reject(err);
          return;
        }

        stream.on('data', (data) => {
          output += data.toString();
        });

        stream.stderr.on('data', (data) => {
          output += data.toString();
        });

        stream.on('close', (code) => {
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
router.get('/:hostId/list', async (req, res) => {
  try {
    // Check cache first
    const cachedPackages = await cache.redis.get(`packages:${req.params.hostId}`);
    if (cachedPackages) {
      return res.json({ success: true, data: JSON.parse(cachedPackages) });
    }

    const result = await query(
      'SELECT h.*, sk.private_key, sk.passphrase FROM hosts h LEFT JOIN ssh_keys sk ON h.ssh_key_id = sk.id WHERE h.id = $1',
      [req.params.hostId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Host not found' });
    }

    const host = result.rows[0];

    // Try apt first, then fallback to yum
    let { code, output } = await executeCommand(host, 'which apt-get && dpkg -l || which yum && rpm -qa');

    const packages = output
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
    console.error('Error listing packages:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// Install package
router.post('/:hostId/install', async (req, res) => {
  const { name } = req.body;
  if (!name) {
    return res.status(400).json({ success: false, error: 'Package name required' });
  }

  try {
    const result = await query(
      'SELECT h.*, sk.private_key, sk.passphrase FROM hosts h LEFT JOIN ssh_keys sk ON h.ssh_key_id = sk.id WHERE h.id = $1',
      [req.params.hostId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Host not found' });
    }

    const host = result.rows[0];

    // Try apt first, then fallback to yum
    const { code, output } = await executeCommand(
      host,
      `which apt-get && sudo DEBIAN_FRONTEND=noninteractive apt-get install -y ${name} || which yum && sudo yum install -y ${name}`
    );

    if (code !== 0) {
      throw new Error(`Installation failed: ${output}`);
    }

    // Invalidate package cache
    await cache.redis.del(`packages:${req.params.hostId}`);

    res.json({ success: true, data: { output } });
  } catch (err) {
    console.error('Error installing package:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// Uninstall package
router.post('/:hostId/uninstall', async (req, res) => {
  const { name } = req.body;
  if (!name) {
    return res.status(400).json({ success: false, error: 'Package name required' });
  }

  try {
    const result = await query(
      'SELECT h.*, sk.private_key, sk.passphrase FROM hosts h LEFT JOIN ssh_keys sk ON h.ssh_key_id = sk.id WHERE h.id = $1',
      [req.params.hostId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Host not found' });
    }

    const host = result.rows[0];

    // Try apt first, then fallback to yum
    const { code, output } = await executeCommand(
      host,
      `which apt-get && sudo DEBIAN_FRONTEND=noninteractive apt-get remove -y ${name} || which yum && sudo yum remove -y ${name}`
    );

    if (code !== 0) {
      throw new Error(`Uninstallation failed: ${output}`);
    }

    // Invalidate package cache
    await cache.redis.del(`packages:${req.params.hostId}`);

    res.json({ success: true, data: { output } });
  } catch (err) {
    console.error('Error uninstalling package:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// Update package
router.post('/:hostId/update', async (req, res) => {
  const { name } = req.body;
  if (!name) {
    return res.status(400).json({ success: false, error: 'Package name required' });
  }

  try {
    const result = await query(
      'SELECT h.*, sk.private_key, sk.passphrase FROM hosts h LEFT JOIN ssh_keys sk ON h.ssh_key_id = sk.id WHERE h.id = $1',
      [req.params.hostId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Host not found' });
    }

    const host = result.rows[0];

    // Try apt first, then fallback to yum
    const { code, output } = await executeCommand(
      host,
      `which apt-get && sudo DEBIAN_FRONTEND=noninteractive apt-get upgrade -y ${name} || which yum && sudo yum update -y ${name}`
    );

    if (code !== 0) {
      throw new Error(`Update failed: ${output}`);
    }

    // Invalidate package cache
    await cache.redis.del(`packages:${req.params.hostId}`);

    res.json({ success: true, data: { output } });
  } catch (err) {
    console.error('Error updating package:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// Check for updates
router.get('/:hostId/updates', async (req, res) => {
  try {
    const result = await query(
      'SELECT h.*, sk.private_key, sk.passphrase FROM hosts h LEFT JOIN ssh_keys sk ON h.ssh_key_id = sk.id WHERE h.id = $1',
      [req.params.hostId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Host not found' });
    }

    const host = result.rows[0];

    // Try apt first, then fallback to yum
    const { code, output } = await executeCommand(
      host,
      `which apt-get && sudo apt-get update && apt list --upgradable || which yum && sudo yum check-update`
    );

    // yum check-update returns 100 when updates are available
    if (code !== 0 && code !== 100) {
      throw new Error(`Update check failed: ${output}`);
    }

    const updates = output
      .split('\n')
      .filter(line => line.includes('=>'))
      .map(line => {
        const [name, version] = line.split('=>').map(s => s.trim());
        return { name, version };
      });

    res.json({ success: true, data: updates });
  } catch (err) {
    console.error('Error checking updates:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
