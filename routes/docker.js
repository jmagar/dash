const express = require('express');
const { Client } = require('ssh2');
const fs = require('fs').promises;
const path = require('path');

const router = express.Router();

module.exports = (pool, logger, io) => {
  // Helper functions (getSSHCredentials, createSSHConnection, executeDockerCommand) remain the same

  // Containers
  router.get('/containers', async (req, res, next) => {
    const { hostId } = req.query;
    try {
      const conn = await createSSHConnection(hostId);
      const result = await executeDockerCommand(conn, 'container ls -a --format "{{json .}}"');
      const containers = result.trim().split('\n').map(JSON.parse);
      res.json(containers);
    } catch (error) {
      logger.error('Error fetching containers:', error);
      next(error);
    }
  });

  router.post('/containers/:id/:action', async (req, res, next) => {
    const { id, action } = req.params;
    const { hostId } = req.body;
    try {
      const conn = await createSSHConnection(hostId);
      await executeDockerCommand(conn, `container ${action} ${id}`);
      res.sendStatus(200);
    } catch (error) {
      logger.error(`Error ${action} container:`, error);
      next(error);
    }
  });

  // Images
  router.get('/images', async (req, res, next) => {
    const { hostId } = req.query;
    try {
      const conn = await createSSHConnection(hostId);
      const result = await executeDockerCommand(conn, 'image ls --format "{{json .}}"');
      const images = result.trim().split('\n').map(JSON.parse);
      res.json(images);
    } catch (error) {
      logger.error('Error fetching images:', error);
      next(error);
    }
  });

  router.post('/images/:action', async (req, res, next) => {
    const { action } = req.params;
    const { hostId, imageId } = req.body;
    try {
      const conn = await createSSHConnection(hostId);
      await executeDockerCommand(conn, `image ${action} ${imageId}`);
      res.sendStatus(200);
    } catch (error) {
      logger.error(`Error ${action} image:`, error);
      next(error);
    }
  });

  // Volumes
  router.get('/volumes', async (req, res, next) => {
    const { hostId } = req.query;
    try {
      const conn = await createSSHConnection(hostId);
      const result = await executeDockerCommand(conn, 'volume ls --format "{{json .}}"');
      const volumes = result.trim().split('\n').map(JSON.parse);
      res.json(volumes);
    } catch (error) {
      logger.error('Error fetching volumes:', error);
      next(error);
    }
  });

  router.post('/volumes/:action', async (req, res, next) => {
    const { action } = req.params;
    const { hostId, volumeName } = req.body;
    try {
      const conn = await createSSHConnection(hostId);
      await executeDockerCommand(conn, `volume ${action} ${volumeName}`);
      res.sendStatus(200);
    } catch (error) {
      logger.error(`Error ${action} volume:`, error);
      next(error);
    }
  });

  // Networks
  router.get('/networks', async (req, res, next) => {
    const { hostId } = req.query;
    try {
      const conn = await createSSHConnection(hostId);
      const result = await executeDockerCommand(conn, 'network ls --format "{{json .}}"');
      const networks = result.trim().split('\n').map(JSON.parse);
      res.json(networks);
    } catch (error) {
      logger.error('Error fetching networks:', error);
      next(error);
    }
  });

  router.post('/networks/:action', async (req, res, next) => {
    const { action } = req.params;
    const { hostId, networkName } = req.body;
    try {
      const conn = await createSSHConnection(hostId);
      await executeDockerCommand(conn, `network ${action} ${networkName}`);
      res.sendStatus(200);
    } catch (error) {
      logger.error(`Error ${action} network:`, error);
      next(error);
    }
  });

  // Docker Compose
  router.get('/compose/:stackName', async (req, res, next) => {
    const { stackName } = req.params;
    const { hostId } = req.query;
    try {
      const conn = await createSSHConnection(hostId);
      const result = await executeDockerCommand(conn, `compose -p ${stackName} ps --format json`);
      const services = result.trim().split('\n').map(JSON.parse);
      res.json(services);
    } catch (error) {
      logger.error('Error fetching compose stack:', error);
      next(error);
    }
  });

  router.post('/compose/:stackName/:action', async (req, res, next) => {
    const { stackName, action } = req.params;
    const { hostId, composeFile } = req.body;
    try {
      const conn = await createSSHConnection(hostId);
      if (action === 'up' || action === 'down') {
        const tempFilePath = path.join('/tmp', `docker-compose-${stackName}.yml`);
        await fs.writeFile(tempFilePath, composeFile);
        await executeDockerCommand(conn, `compose -f ${tempFilePath} -p ${stackName} ${action} -d`);
        await fs.unlink(tempFilePath);
      } else {
        throw new Error(`Invalid action: ${action}`);
      }
      res.sendStatus(200);
    } catch (error) {
      logger.error(`Error ${action} compose stack:`, error);
      next(error);
    }
  });

  // Terminal (remains the same as in the previous response)

  return router;
};