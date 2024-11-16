import { Router } from 'express';
import { z } from 'zod';
import { notificationsService } from '../services/notifications.service';
import { validateRequest } from '../middleware/validation';
import { requireAuth } from '../middleware/auth';
import { logger } from '../utils/logger';
import type { AuthenticatedRequest } from '../../types/express';
import type { ApiResult } from '../../types/api-shared';
import type { NotificationType } from '../../types/notifications';

const router = Router();

const notificationTypeEnum = z.enum(['alert', 'info', 'success', 'warning', 'error']);

// Get notifications
const getNotificationsSchema = z.object({
  query: z.object({
    userId: z.string().uuid(),
    type: notificationTypeEnum.optional(),
    read: z.coerce.boolean().optional(),
    startDate: z.coerce.date().optional(),
    endDate: z.coerce.date().optional(),
    limit: z.coerce.number().int().min(1).max(100).optional(),
    offset: z.coerce.number().int().min(0).optional(),
  }),
});

router.get(
  '/',
  requireAuth,
  validateRequest(getNotificationsSchema),
  async (req: AuthenticatedRequest, res) => {
    try {
      if (!req.user) {
        throw new Error('User not authenticated');
      }

      const notifications = await notificationsService.getNotifications({
        userId: req.query.userId as string,
        type: req.query.type as NotificationType | undefined,
        read: req.query.read as boolean | undefined,
        startDate: req.query.startDate ? new Date(req.query.startDate as string) : undefined,
        endDate: req.query.endDate ? new Date(req.query.endDate as string) : undefined,
        limit: req.query.limit ? Number(req.query.limit) : undefined,
        offset: req.query.offset ? Number(req.query.offset) : undefined,
      });

      const response: ApiResult<typeof notifications> = {
        success: true,
        data: notifications,
      };
      res.json(response);
    } catch (error) {
      logger.error('Failed to get notifications:', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      res.status(500).json({
        success: false,
        error: 'Failed to get notifications',
      });
    }
  }
);

// Get notification counts
router.get(
  '/count',
  requireAuth,
  validateRequest(z.object({
    query: z.object({
      userId: z.string().uuid(),
    }),
  })),
  async (req: AuthenticatedRequest, res) => {
    try {
      if (!req.user) {
        throw new Error('User not authenticated');
      }

      const counts = await notificationsService.getNotificationCount(
        req.query.userId as string
      );

      const response: ApiResult<typeof counts> = {
        success: true,
        data: counts,
      };
      res.json(response);
    } catch (error) {
      logger.error('Failed to get notification counts:', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      res.status(500).json({
        success: false,
        error: 'Failed to get notification counts',
      });
    }
  }
);

// Mark notification as read
router.post(
  '/:id/read',
  requireAuth,
  validateRequest(z.object({
    params: z.object({
      id: z.string().uuid(),
    }),
  })),
  async (req: AuthenticatedRequest, res) => {
    try {
      if (!req.user) {
        throw new Error('User not authenticated');
      }

      await notificationsService.markAsRead(req.user.id, [req.params.id]);
      res.json({ success: true });
    } catch (error) {
      logger.error('Failed to mark notification as read:', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      res.status(500).json({
        success: false,
        error: 'Failed to mark notification as read',
      });
    }
  }
);

// Mark multiple notifications as read
const readAllSchema = z.object({
  notificationIds: z.array(z.string().uuid()),
});

router.post(
  '/read-all',
  requireAuth,
  validateRequest(z.object({ body: readAllSchema })),
  async (req: AuthenticatedRequest, res) => {
    try {
      if (!req.user) {
        throw new Error('User not authenticated');
      }

      const { notificationIds } = readAllSchema.parse(req.body);
      await notificationsService.markAsRead(req.user.id, notificationIds);
      res.json({ success: true });
    } catch (error) {
      logger.error('Failed to mark notifications as read:', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      res.status(500).json({
        success: false,
        error: 'Failed to mark notifications as read',
      });
    }
  }
);

// Delete notifications
const deleteSchema = z.object({
  notificationIds: z.array(z.string().uuid()),
});

router.delete(
  '/',
  requireAuth,
  validateRequest(z.object({ body: deleteSchema })),
  async (req: AuthenticatedRequest, res) => {
    try {
      if (!req.user) {
        throw new Error('User not authenticated');
      }

      const { notificationIds } = deleteSchema.parse(req.body);
      await notificationsService.deleteNotifications(req.user.id, notificationIds);
      res.json({ success: true });
    } catch (error) {
      logger.error('Failed to delete notifications:', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      res.status(500).json({
        success: false,
        error: 'Failed to delete notifications',
      });
    }
  }
);

// Get notification preferences
router.get(
  '/preferences',
  requireAuth,
  async (req: AuthenticatedRequest, res) => {
    try {
      if (!req.user) {
        throw new Error('User not authenticated');
      }

      const preferences = await notificationsService.getPreferences(req.user.id);
      const response: ApiResult<typeof preferences> = {
        success: true,
        data: preferences,
      };
      res.json(response);
    } catch (error) {
      logger.error('Failed to get notification preferences:', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      res.status(500).json({
        success: false,
        error: 'Failed to get notification preferences',
      });
    }
  }
);

// Update notification preferences
const alertTypesSchema = z.object({
  alert: z.boolean(),
  info: z.boolean(),
  success: z.boolean(),
  warning: z.boolean(),
  error: z.boolean(),
});

const updatePreferencesSchema = z.object({
  webEnabled: z.boolean(),
  gotifyEnabled: z.boolean(),
  desktopEnabled: z.boolean(),
  alertTypes: alertTypesSchema,
  mutedUntil: z.string().datetime().optional(),
});

router.put(
  '/preferences',
  requireAuth,
  validateRequest(z.object({ body: updatePreferencesSchema })),
  async (req: AuthenticatedRequest, res) => {
    try {
      if (!req.user) {
        throw new Error('User not authenticated');
      }

      const preferences = updatePreferencesSchema.parse(req.body);
      await notificationsService.updatePreferences(req.user.id, {
        userId: req.user.id,
        webEnabled: preferences.webEnabled,
        gotifyEnabled: preferences.gotifyEnabled,
        desktopEnabled: preferences.desktopEnabled,
        alertTypes: preferences.alertTypes,
        mutedUntil: preferences.mutedUntil ? new Date(preferences.mutedUntil) : undefined,
      });
      res.json({ success: true });
    } catch (error) {
      logger.error('Failed to update notification preferences:', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      res.status(500).json({
        success: false,
        error: 'Failed to update notification preferences',
      });
    }
  }
);

export default router;
