const express = require('express');
const { Client } = require('ssh2');
const path = require('path');
const { query } = require('../src/db');
const cache = require('../src/cache');
const router = express.Router();

// List directory contents
router.get('/:hostId/list', async (req, res) => {
  const { path: dirPath = '/' } = req.query;
  const normalizedPath = path.normalize(dirPath).replace(/^(\.\.[\/\\])+/, '');

  try {
    // Get host connection details
    const result = await query(
      'SELECT h.*, sk.private_key, sk.passphrase FROM hosts h LEFT JOIN ssh_keys sk ON h.ssh_key_id = sk.id WHERE h.id = $1',
      [req.params.hostId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Host not found' });
    }

    const host = result.rows[0];
    const conn = new Client();

    const listDirectory = new Promise((resolve, reject) => {
      conn.on('ready', () => {
        conn.sftp((err, sftp) => {
          if (err) {
            reject(err);
            return;
          }

          sftp.readdir(normalizedPath, (err, list) => {
            if (err) {
              reject(err);
              return;
            }

            const files = list.map(item => ({
              name: item.filename,
              path: path.join(normalizedPath, item.filename),
              type: item.attrs.isDirectory() ? 'directory' : 'file',
              size: item.attrs.size,
              modified: new Date(item.attrs.mtime * 1000),
              permissions: item.attrs.mode.toString(8).slice(-3),
            }));

            resolve(files);
            conn.end();
          });
        });
      });

      conn.on('error', reject);

      conn.connect({
        host: host.hostname,
        port: host.port,
        username: req.user.username,
        privateKey: host.private_key,
        passphrase: host.passphrase,
      });
    });

    const files = await listDirectory;
    res.json({ success: true, data: files });
  } catch (err) {
    console.error('Error listing directory:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// Download file
router.get('/:hostId/download', async (req, res) => {
  const { path: filePath } = req.query;
  if (!filePath) {
    return res.status(400).json({ success: false, error: 'File path required' });
  }

  const normalizedPath = path.normalize(filePath).replace(/^(\.\.[\/\\])+/, '');

  try {
    const result = await query(
      'SELECT h.*, sk.private_key, sk.passphrase FROM hosts h LEFT JOIN ssh_keys sk ON h.ssh_key_id = sk.id WHERE h.id = $1',
      [req.params.hostId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Host not found' });
    }

    const host = result.rows[0];
    const conn = new Client();

    conn.on('ready', () => {
      conn.sftp((err, sftp) => {
        if (err) {
          res.status(500).json({ success: false, error: err.message });
          return;
        }

        const readStream = sftp.createReadStream(normalizedPath);

        readStream.on('error', (err) => {
          res.status(500).json({ success: false, error: err.message });
          conn.end();
        });

        res.attachment(path.basename(normalizedPath));
        readStream.pipe(res);

        readStream.on('end', () => {
          conn.end();
        });
      });
    });

    conn.on('error', (err) => {
      res.status(500).json({ success: false, error: err.message });
    });

    conn.connect({
      host: host.hostname,
      port: host.port,
      username: req.user.username,
      privateKey: host.private_key,
      passphrase: host.passphrase,
    });
  } catch (err) {
    console.error('Error downloading file:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// Upload file
router.post('/:hostId/upload', async (req, res) => {
  const { path: uploadPath, content } = req.body;
  if (!uploadPath || !content) {
    return res.status(400).json({ success: false, error: 'Path and content required' });
  }

  const normalizedPath = path.normalize(uploadPath).replace(/^(\.\.[\/\\])+/, '');

  try {
    const result = await query(
      'SELECT h.*, sk.private_key, sk.passphrase FROM hosts h LEFT JOIN ssh_keys sk ON h.ssh_key_id = sk.id WHERE h.id = $1',
      [req.params.hostId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Host not found' });
    }

    const host = result.rows[0];
    const conn = new Client();

    const uploadFile = new Promise((resolve, reject) => {
      conn.on('ready', () => {
        conn.sftp((err, sftp) => {
          if (err) {
            reject(err);
            return;
          }

          const writeStream = sftp.createWriteStream(normalizedPath);

          writeStream.on('error', reject);
          writeStream.on('close', resolve);

          writeStream.write(content);
          writeStream.end();
        });
      });

      conn.on('error', reject);

      conn.connect({
        host: host.hostname,
        port: host.port,
        username: req.user.username,
        privateKey: host.private_key,
        passphrase: host.passphrase,
      });
    });

    await uploadFile;
    res.json({ success: true });
  } catch (err) {
    console.error('Error uploading file:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// Delete file/directory
router.delete('/:hostId', async (req, res) => {
  const { path: deletePath } = req.query;
  if (!deletePath) {
    return res.status(400).json({ success: false, error: 'Path required' });
  }

  const normalizedPath = path.normalize(deletePath).replace(/^(\.\.[\/\\])+/, '');

  try {
    const result = await query(
      'SELECT h.*, sk.private_key, sk.passphrase FROM hosts h LEFT JOIN ssh_keys sk ON h.ssh_key_id = sk.id WHERE h.id = $1',
      [req.params.hostId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Host not found' });
    }

    const host = result.rows[0];
    const conn = new Client();

    const deleteFile = new Promise((resolve, reject) => {
      conn.on('ready', () => {
        conn.sftp((err, sftp) => {
          if (err) {
            reject(err);
            return;
          }

          sftp.unlink(normalizedPath, (err) => {
            if (err) {
              // If file not found, try removing as directory
              if (err.code === 2) {
                sftp.rmdir(normalizedPath, (err) => {
                  if (err) {
                    reject(err);
                    return;
                  }
                  resolve();
                });
                return;
              }
              reject(err);
              return;
            }
            resolve();
          });
        });
      });

      conn.on('error', reject);

      conn.connect({
        host: host.hostname,
        port: host.port,
        username: req.user.username,
        privateKey: host.private_key,
        passphrase: host.passphrase,
      });
    });

    await deleteFile;
    res.json({ success: true });
  } catch (err) {
    console.error('Error deleting file:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
