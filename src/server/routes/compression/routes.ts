import { createRouter, logRouteAccess } from '../routeUtils';
import { Router } from 'express';
import { compressionService } from '../../services/compression.service';
import { requireAuth } from '../../middleware/auth';

export const router = createRouter();

// Compress files
router.post(
  '/compress',
  requireAuth,
  async (req, res) => {
    try {
      const { hostId, sourcePaths, targetPath } = req.body;

      logRouteAccess('Compressing files:', {
        userId: req.user!.id,
        hostId,
        sourcePaths,
        targetPath,
      });

      await compressionService.compressFiles(hostId, sourcePaths, targetPath);
      res.json({ success: true });
    } catch (error) {
      logRouteAccess('Compression failed:', {
        error: error instanceof Error ? error.message : 'Unknown error',
        userId: req.user!.id,
      });
      res.status(500).json({ 
        success: false, 
        error: 'Compression failed' 
      });
    }
  }
);

// Extract files
router.post(
  '/extract',
  requireAuth,
  async (req, res) => {
    try {
      const { hostId, sourcePath, targetPath } = req.body;

      logRouteAccess('Extracting files:', {
        userId: req.user!.id,
        hostId,
        sourcePath,
        targetPath,
      });

      await compressionService.extractFiles(hostId, sourcePath, targetPath);
      res.json({ success: true });
    } catch (error) {
      logRouteAccess('Extraction failed:', {
        error: error instanceof Error ? error.message : 'Unknown error',
        userId: req.user!.id,
      });
      res.status(500).json({ 
        success: false, 
        error: 'Extraction failed' 
      });
    }
  }
);

// List archive contents
router.get(
  '/list/:hostId/*',
  requireAuth,
  async (req, res) => {
    try {
      const hostId = req.params.hostId;
      const archivePath = req.params[0];

      logRouteAccess('Listing archive contents:', {
        userId: req.user!.id,
        hostId,
        archivePath,
      });

      const contents = await compressionService.listArchiveContents(hostId, archivePath);
      res.json({ contents });
    } catch (error) {
      logRouteAccess('Failed to list archive contents:', {
        error: error instanceof Error ? error.message : 'Unknown error',
        userId: req.user!.id,
      });
      res.status(500).json({ 
        success: false, 
        error: 'Failed to list archive contents' 
      });
    }
  }
);
