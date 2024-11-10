const express = require('express');
const { Client } = require('ssh2');
const { query } = require('../src/db');
const cache = require('../src/cache');
const router = express.Router();

// Initialize WebSocket handlers
const initTerminalSocket = (io) => {
  const terminalNamespace = io.of('/terminal');

  terminalNamespace.on('connection', async (socket) => {
    let sshClient = null;
    let stream = null;

    socket.on('init', async (data) => {
      try {
        const { hostId } = data;

        // Get host details with SSH key
        const result = await query(
          'SELECT h.*, sk.private_key, sk.passphrase FROM hosts h LEFT JOIN ssh_keys sk ON h.ssh_key_id = sk.id WHERE h.id = $1',
          [hostId]
        );

        if (result.rows.length === 0) {
          socket.emit('error', 'Host not found');
          return;
        }

        const host = result.rows[0];
        sshClient = new Client();

        // Set up SSH connection
        sshClient.on('ready', () => {
          sshClient.shell({
            term: 'xterm-256color',
            rows: 24,
            cols: 80,
          }, (err, sshStream) => {
            if (err) {
              socket.emit('error', err.message);
              return;
            }

            stream = sshStream;

            // Handle data from SSH server
            stream.on('data', (data) => {
              socket.emit('data', data.toString('utf8'));
            });

            // Handle SSH stream close
            stream.on('close', () => {
              socket.emit('close');
              sshClient.end();
            });

            socket.emit('ready');
          });
        });

        // Handle SSH errors
        sshClient.on('error', (err) => {
          socket.emit('error', err.message);
          if (stream) stream.end();
          sshClient.end();
        });

        // Connect to host
        sshClient.connect({
          host: host.hostname,
          port: host.port,
          username: socket.user.username,
          privateKey: host.private_key,
          passphrase: host.passphrase,
        });

      } catch (err) {
        console.error('Terminal initialization error:', err);
        socket.emit('error', err.message);
      }
    });

    // Handle data from client
    socket.on('data', (data) => {
      if (stream) {
        stream.write(data);
      }
    });

    // Handle resize events
    socket.on('resize', (data) => {
      if (stream) {
        stream.setWindow(data.rows, data.cols);
      }
    });

    // Handle command execution
    socket.on('execute', async (data) => {
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
          [socket.user.id, hostId, command]
        );

        if (stream) {
          stream.write(`${command}\n`);
        }
      } catch (err) {
        console.error('Command execution error:', err);
        socket.emit('error', err.message);
      }
    });

    // Handle client disconnect
    socket.on('disconnect', () => {
      if (stream) {
        stream.end();
      }
      if (sshClient) {
        sshClient.end();
      }
    });
  });
};

// Get command history
router.get('/:hostId/history', async (req, res) => {
  try {
    // Check cache first
    const cachedHistory = await cache.getCommands(req.user.id, req.params.hostId);
    if (cachedHistory) {
      return res.json({ success: true, data: cachedHistory });
    }

    // Get from database
    const result = await query(
      `SELECT * FROM command_history
       WHERE user_id = $1 AND host_id = $2
       ORDER BY created_at DESC LIMIT 100`,
      [req.user.id, req.params.hostId]
    );

    const commands = result.rows;
    await cache.cacheCommand(req.user.id, req.params.hostId, commands);
    res.json({ success: true, data: commands });
  } catch (err) {
    console.error('Error getting command history:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = {
  router,
  initTerminalSocket,
};
