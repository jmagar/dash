import { z } from 'zod';
import { NotificationType, NotificationChannel } from '../../types/notifications';

const channelConfigSchema = z.object({
  web: z.object({
    desktop: z.boolean(),
    sound: z.boolean(),
    timeout: z.number().optional(),
  }),
  gotify: z.object({
    priority: z.number().optional(),
    serverUrl: z.string().url().optional(),
  }),
  desktop: z.object({
    sound: z.boolean(),
    position: z.enum(['top-right', 'top-left', 'bottom-right', 'bottom-left']).optional(),
    duration: z.number().optional(),
  }),
});

const channelSchema = z.object({
  enabled: z.boolean(),
  types: z.array(z.nativeEnum(NotificationType)),
  config: channelConfigSchema.optional(),
});

const quietHoursSchema = z.object({
  enabled: z.boolean(),
  start: z.string().regex(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/).optional(),
  end: z.string().regex(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/).optional(),
  days: z.array(z.number().min(0).max(6)).optional(),
});

export const notificationPreferencesSchema = z.object({
  userId: z.string().uuid(),
  channels: z.record(z.nativeEnum(NotificationChannel), channelSchema),
  muted: z.boolean(),
  mutedUntil: z.date().optional(),
  alertTypes: z.record(z.nativeEnum(NotificationType), z.boolean()),
  globalConfig: z.object({
    batchNotifications: z.boolean().optional(),
    batchInterval: z.number().min(1000).max(3600000).optional(), // 1 second to 1 hour
    quietHours: quietHoursSchema.optional(),
  }).optional(),
});

export type ValidatedNotificationPreferences = z.infer<typeof notificationPreferencesSchema>;

export function validateNotificationPreferences(preferences: unknown): ValidatedNotificationPreferences {
  return notificationPreferencesSchema.parse(preferences);
}

export function validatePartialNotificationPreferences(preferences: unknown): Partial<ValidatedNotificationPreferences> {
  return notificationPreferencesSchema.partial().parse(preferences);
}
