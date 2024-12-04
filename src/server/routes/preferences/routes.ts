import { createRouter, logRouteAccess } from '../routeUtils';
import { preferencesService } from '../../services/preferences.service';
import { requireAuth } from '../../middleware/auth';

export const router = createRouter();

// Get user preferences
router.get(
  '/',
  requireAuth,
  async (req, res) => {
    try {
      if (!req.user) {
        throw new Error('User not authenticated');
      }

      logRouteAccess('Retrieving user preferences', {
        userId: req.user.id,
      });

      const preferences = await preferencesService.getPreferences(req.user.id);
      
      logRouteAccess('User preferences retrieved successfully', {
        userId: req.user.id,
      });

      res.json({
        success: true,
        data: preferences,
      });
    } catch (error) {
      logRouteAccess('Failed to retrieve user preferences', {
        error: error instanceof Error ? error.message : 'Unknown error',
        userId: req.user?.id,
      });

      res.status(500).json({
        success: false,
        error: 'Failed to retrieve user preferences',
      });
    }
  }
);

// Update user preferences
router.put(
  '/',
  requireAuth,
  async (req, res) => {
    try {
      if (!req.user) {
        throw new Error('User not authenticated');
      }

      const { themeMode, accentColor } = req.body;

      logRouteAccess('Updating user preferences', {
        userId: req.user.id,
        themeMode,
        accentColor,
      });

      const preferences = await preferencesService.updatePreferences(req.user.id, {
        themeMode,
        accentColor,
      });

      logRouteAccess('User preferences updated successfully', {
        userId: req.user.id,
      });

      res.json({
        success: true,
        data: preferences,
      });
    } catch (error) {
      logRouteAccess('Failed to update user preferences', {
        error: error instanceof Error ? error.message : 'Unknown error',
        userId: req.user?.id,
      });

      res.status(500).json({
        success: false,
        error: 'Failed to update user preferences',
      });
    }
  }
);
