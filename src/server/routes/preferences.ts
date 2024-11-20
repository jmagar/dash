import { Router } from 'express';
import { preferencesService } from '../services/preferences.service';
import { asyncHandler } from '../middleware/async';
import { requireAuth } from '../middleware/auth';
import { logger } from '../utils/logger';

const router = Router();

// Get user preferences
router.get(
  '/',
  requireAuth,
  asyncHandler(async (req, res) => {
    const preferences = await preferencesService.getPreferences(req.user!.id);
    res.json(preferences);
  })
);

// Update user preferences
router.put(
  '/',
  requireAuth,
  asyncHandler(async (req, res) => {
    const { themeMode, accentColor } = req.body;

    logger.info('Updating user preferences:', {
      userId: req.user!.id,
      themeMode,
      accentColor,
    });

    const preferences = await preferencesService.updatePreferences(req.user!.id, {
      themeMode,
      accentColor,
    });

    res.json(preferences);
  })
);

export default router;
