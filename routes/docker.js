const express = require('express');
const Docker = require('dockerode');
const cache = require('../cache');
const router = express.Router();

const docker = new Docker({
  socketPath: process.env.DOCKER_HOST,
});

// Get all containers
router.get('/containers', async (req, res) => {
  try {
    // Check cache first
    const cachedContainers = await cache.getDockerState('local');
    if (cachedContainers) {
      return res.json(cachedContainers);
    }

    // Get fresh data from Docker
    const containers = await docker.listContainers({ all: true });
    const formattedContainers = containers.map(container => ({
      id: container.Id,
      name: container.Names[0].replace(/^\//, ''),
      image: container.Image,
      status: container.Status,
      state: container.State,
      created: container.Created * 1000, // Convert to milliseconds
      ports: container.Ports.map(port =>
        `${port.IP || ''}:${port.PublicPort || ''}->${port.PrivatePort}/${port.Type}`
      ).filter(Boolean),
    }));

    // Cache the results
    await cache.cacheDockerState('local', formattedContainers);
    res.json(formattedContainers);
  } catch (err) {
    console.error('Error listing containers:', err);
    res.status(500).json({ error: 'Failed to list containers' });
  }
});

// Start container
router.post('/containers/:id/start', async (req, res) => {
  try {
    const container = docker.getContainer(req.params.id);
    await container.start();
    await cache.invalidateHostCache('local');
    res.json({ success: true });
  } catch (err) {
    console.error('Error starting container:', err);
    res.status(500).json({ error: 'Failed to start container' });
  }
});

// Stop container
router.post('/containers/:id/stop', async (req, res) => {
  try {
    const container = docker.getContainer(req.params.id);
    await container.stop();
    await cache.invalidateHostCache('local');
    res.json({ success: true });
  } catch (err) {
    console.error('Error stopping container:', err);
    res.status(500).json({ error: 'Failed to stop container' });
  }
});

// Delete container
router.delete('/containers/:id', async (req, res) => {
  try {
    const container = docker.getContainer(req.params.id);
    await container.remove({ force: true });
    await cache.invalidateHostCache('local');
    res.json({ success: true });
  } catch (err) {
    console.error('Error removing container:', err);
    res.status(500).json({ error: 'Failed to remove container' });
  }
});

// Get container logs
router.get('/containers/:id/logs', async (req, res) => {
  try {
    const container = docker.getContainer(req.params.id);
    const logs = await container.logs({
      stdout: true,
      stderr: true,
      tail: 100,
      timestamps: true,
    });
    res.send(logs);
  } catch (err) {
    console.error('Error getting container logs:', err);
    res.status(500).json({ error: 'Failed to get container logs' });
  }
});

// Get container stats
router.get('/containers/:id/stats', async (req, res) => {
  try {
    const container = docker.getContainer(req.params.id);
    const stats = await container.stats({ stream: false });
    res.json(stats);
  } catch (err) {
    console.error('Error getting container stats:', err);
    res.status(500).json({ error: 'Failed to get container stats' });
  }
});

// List stacks (docker compose)
router.get('/stacks', async (req, res) => {
  try {
    // Check cache first
    const cachedStacks = await cache.getDockerState('stacks');
    if (cachedStacks) {
      return res.json(cachedStacks);
    }

    const containers = await docker.listContainers();
    const stacks = new Map();

    containers.forEach(container => {
      const labels = container.Labels;
      const stackName = labels['com.docker.compose.project'];
      if (stackName) {
        if (!stacks.has(stackName)) {
          stacks.set(stackName, {
            name: stackName,
            services: 0,
            status: 'running',
            created: container.Created * 1000,
          });
        }
        const stack = stacks.get(stackName);
        stack.services++;
        if (container.State !== 'running') {
          stack.status = 'partial';
        }
      }
    });

    const stackList = Array.from(stacks.values());
    await cache.cacheDockerState('stacks', stackList);
    res.json(stackList);
  } catch (err) {
    console.error('Error listing stacks:', err);
    res.status(500).json({ error: 'Failed to list stacks' });
  }
});

module.exports = router;
