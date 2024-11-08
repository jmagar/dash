const express = require('express');

const http = require('http');

const bodyParser = require('body-parser');

const fs = require('fs').promises;
const path = require('path');
const { promisify } = require('util');

const bcrypt = require('bcrypt');
const compression = require('compression');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const Redis = require('ioredis');
const jwt = require('jsonwebtoken');
const multer = require('multer');
const { Server } = require('socket.io');
const { Client } = require('ssh2');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: process.env.FRONTEND_URL,
    methods: ['GET', 'POST'],
  },
});

app.use(cors());
app.use(bodyParser.json());
app.use(compression());

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
});
app.use(limiter);

const redis = new Redis(process.env.REDIS_URL);

const upload = multer({ dest: 'uploads/' });

// Authentication middleware
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (token == null) return res.sendStatus(401);

  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) return res.sendStatus(403);
    req.user = user;
    next();
  });
};

// Helper function to create an SSH connection
const createSSHConnection = (host) => {
  return new Promise((resolve, reject) => {
    const conn = new Client();
    conn.on('ready', () => {
      resolve(conn);
    }).on('error', (err) => {
      reject(err);
    }).connect({
      host: host.ip,
      port: 22,
      username: host.username,
      privateKey: require('fs').readFileSync(host.privateKeyPath),
    });
  });
};

// Login API
app.post('/api/login', async (req, res) => {
  const { username, password } = req.body;
  try {
    const user = await getUserByUsername(username);
    if (user && await bcrypt.compare(password, user.password)) {
      const token = jwt.sign({ id: user.id, username: user.username }, process.env.JWT_SECRET, { expiresIn: '1h' });
      res.json({ token });
    } else {
      res.status(401).json({ error: 'Invalid credentials' });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Hosts API
app.get('/api/hosts', authenticateToken, async (req, res) => {
  try {
    const cachedHosts = await redis.get('hosts');
    if (cachedHosts) {
      return res.json(JSON.parse(cachedHosts));
    }
    const hosts = await getHosts();
    await redis.set('hosts', JSON.stringify(hosts), 'EX', 300);
    res.json(hosts);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// File Explorer API
app.post('/api/sftp/list', authenticateToken, async (req, res) => {
  const { hostId, path } = req.body;
  try {
    const host = await getHostById(hostId);
    const conn = await createSSHConnection(host);
    const sftp = promisify(conn.sftp.bind(conn));
    const sftpClient = await sftp();
    const readdir = promisify(sftpClient.readdir.bind(sftpClient));
    const list = await readdir(path);
    conn.end();
    res.json(list.map(item => ({
      name: item.filename,
      isDirectory: item.attrs.isDirectory(),
      size: item.attrs.size,
      modifyTime: new Date(item.attrs.mtime * 1000).toISOString(),
    })));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/sftp/download', authenticateToken, async (req, res) => {
  const { hostId, path, files } = req.body;
  try {
    const host = await getHostById(hostId);
    const conn = await createSSHConnection(host);
    const sftp = promisify(conn.sftp.bind(conn));
    const sftpClient = await sftp();
    const readFile = promisify(sftpClient.readFile.bind(sftpClient));

    const fileContents = await Promise.all(files.map(async (file) => {
      const content = await readFile(path + '/' + file);
      return { name: file, content };
    }));

    conn.end();
    res.json(fileContents);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/sftp/upload', authenticateToken, upload.single('file'), async (req, res) => {
  const { hostId, path } = req.body;
  const file = req.file;

  try {
    const host = await getHostById(hostId);
    const conn = await createSSHConnection(host);
    const sftp = promisify(conn.sftp.bind(conn));
    const sftpClient = await sftp();
    const writeFile = promisify(sftpClient.writeFile.bind(sftpClient));

    await writeFile(path + '/' + file.originalname, await fs.readFile(file.path));

    conn.end();
    await fs.unlink(file.path);
    res.json({ message: 'File uploaded successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/sftp/delete', authenticateToken, async (req, res) => {
  const { hostId, path, files } = req.body;
  try {
    const host = await getHostById(hostId);
    const conn = await createSSHConnection(host);
    const sftp = promisify(conn.sftp.bind(conn));
    const sftpClient = await sftp();
    const remove = promisify(sftpClient.unlink.bind(sftpClient));

    await Promise.all(files.map(file => remove(path + '/' + file)));

    conn.end();
    res.json({ message: 'Files deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Package Manager API
app.post('/api/packages/list', authenticateToken, async (req, res) => {
  const { hostId } = req.body;
  try {
    const host = await getHostById(hostId);
    const conn = await createSSHConnection(host);
    const exec = promisify(conn.exec.bind(conn));
    const output = await exec('dpkg-query -W -f=\'${Package} ${Version} ${Description}\n\'');
    conn.end();

    const packages = output.split('\n')
      .filter(line => line.trim() !== '')
      .map(line => {
        const [name, version, ...descParts] = line.split(' ');
        return { name, version, description: descParts.join(' ') };
      });

    res.json(packages);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/packages/:action', authenticateToken, async (req, res) => {
  const { action } = req.params;
  const { hostId, packageName } = req.body;
  try {
    const host = await getHostById(hostId);
    const conn = await createSSHConnection(host);
    const exec = promisify(conn.exec.bind(conn));

    let command;
    switch (action) {
      case 'install':
        command = `sudo apt-get install -y ${packageName}`;
        break;
      case 'uninstall':
        command = `sudo apt-get remove -y ${packageName}`;
        break;
      case 'update':
        command = `sudo apt-get update && sudo apt-get upgrade -y ${packageName}`;
        break;
      default:
        throw new Error('Invalid action');
    }

    const output = await exec(command);
    conn.end();
    res.json({ message: `Package ${action} completed`, output });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Remote Execution API
app.post('/api/remote-execution', authenticateToken, upload.single('file'), async (req, res) => {
  const { command, hostIds } = req.body;
  const file = req.file;

  try {
    const results = await Promise.all(hostIds.map(async (hostId) => {
      const host = await getHostById(hostId);
      const conn = await createSSHConnection(host);
      const sftp = promisify(conn.sftp.bind(conn));
      const exec = promisify(conn.exec.bind(conn));

      if (file) {
        const sftpClient = await sftp();
        const writeFile = promisify(sftpClient.writeFile.bind(sftpClient));
        await writeFile(`/tmp/${file.originalname}`, await fs.readFile(file.path));
      }

      const output = await exec(command);
      conn.end();

      return { hostId, output };
    }));

    if (file) {
      await fs.unlink(file.path);
    }

    res.json(results);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// WebSocket for Terminal
io.use((socket, next) => {
  const token = socket.handshake.auth.token;
  jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
    if (err) return next(new Error('Authentication error'));
    socket.decoded = decoded;
    next();
  });
});

io.on('connection', (socket) => {
  console.log('A user connected');

  socket.on('terminal.init', async ({ hostId }) => {
    try {
      const host = await getHostById(hostId);
      const conn = await createSSHConnection(host);

      conn.shell((err, stream) => {
        if (err) throw err;

        socket.on('terminal.input', (data) => {
          stream.write(data);
        });

        stream.on('data', (data) => {
          socket.emit('terminal.output', data.toString('utf-8'));
        });

        stream.on('close', () => {
          conn.end();
          socket.disconnect(true);
        });
      });
    } catch (error) {
      socket.emit('terminal.error', error.message);
    }
  });

  socket.on('disconnect', () => {
    console.log('A user disconnected');
  });
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

// Helper functions (implement these)
async function getHosts() {
  // In a real application, you would fetch this from a database
  return [
    { id: 1, name: 'Host 1', status: 'Connected', ip: '192.168.1.100', username: 'user1', privateKeyPath: '/path/to/private/key1' },
    { id: 2, name: 'Host 2', status: 'Disconnected', ip: '192.168.1.101', username: 'user2', privateKeyPath: '/path/to/private/key2' },
  ];
}

async function getHostById(hostId) {
  const hosts = await getHosts();
  const host = hosts.find(h => h.id === parseInt(hostId));
  if (!host) throw new Error('Host not found');
  return host;
}

async function getUserByUsername(username) {
  // In a real application, you would fetch this from a database
  const users = [
    { id: 1, username: 'admin', password: await bcrypt.hash('password', 10) },
  ];
  return users.find(u => u.username === username);
}