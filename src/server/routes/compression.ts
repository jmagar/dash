import { Router } from 'express';
import { compressionService } from '../services/compression.service';
import { asyncHandler } from '../middleware/async';
import { requireAuth } from '../middleware/auth';
import { LoggingManager } from '../utils/logging/LoggingManager';

const router = Router();

// Compress files
router.post(
  '/compress',
  requireAuth,
  asyncHandler(async (req, res) => {
    const { hostId, sourcePaths, targetPath } = req.body;

    LoggingManager.getInstance().info('Compressing files:', {
      userId: req.user!.id,
      hostId,
      sourcePaths,
      targetPath,
    });

    await compressionService.compressFiles(hostId, sourcePaths, targetPath);
    res.json({ success: true });
  })
);

// Extract files
router.post(
  '/extract',
  requireAuth,
  asyncHandler(async (req, res) => {
    const { hostId, sourcePath, targetPath } = req.body;

    LoggingManager.getInstance().info('Extracting files:', {
      userId: req.user!.id,
      hostId,
      sourcePath,
      targetPath,
    });

    await compressionService.extractFiles(hostId, sourcePath, targetPath);
    res.json({ success: true });
  })
);

// List archive contents
router.get(
  '/list/:hostId/*',
  requireAuth,
  asyncHandler(async (req, res) => {
    const hostId = req.params.hostId;
    const archivePath = req.params[0];

    LoggingManager.getInstance().info('Listing archive contents:', {
      userId: req.user!.id,
      hostId,
      archivePath,
    });

    const contents = await compressionService.listArchiveContents(hostId, archivePath);
    res.json({ contents });
  })
);

export default router;

