import { useState } from 'react';
import { useNotificationPreferences } from '../hooks/useNotificationPreferences';
import type { NotificationType, NotificationPreferences } from '@/types/notifications';
import { logger } from '../utils/frontendLogger';

interface NotificationSettingsProps {
  userId: string;
}

interface NotificationChannel {
  id: 'web' | 'gotify' | 'desktop';
  name: string;
  description: string;
}

interface NotificationEvent {
  type: NotificationType;
  name: string;
  description: string;
}

const NOTIFICATION_CHANNELS: NotificationChannel[] = [
  {
    id: 'web',
    name: 'In-App Notifications',
    description: 'Receive notifications within the application',
  },
  {
    id: 'gotify',
    name: 'Gotify',
    description: 'Receive notifications via Gotify push service',
  },
  {
    id: 'desktop',
    name: 'Desktop Notifications',
    description: 'Receive browser desktop notifications',
  },
];

const NOTIFICATION_EVENTS: NotificationEvent[] = [
  {
    type: 'alert',
    name: 'System Alerts',
    description: 'Important system events and alerts',
  },
  {
    type: 'error',
    name: 'Errors',
    description: 'Error notifications and failures',
  },
  {
    type: 'warning',
    name: 'Warnings',
    description: 'Warning messages and potential issues',
  },
  {
    type: 'info',
    name: 'Information',
    description: 'General information and updates',
  },
  {
    type: 'success',
    name: 'Success',
    description: 'Successful operations and completions',
  },
];

export function NotificationSettings({ userId }: NotificationSettingsProps) {
  const {
    preferences,
    loading,
    error,
    updatePreferences,
  } = useNotificationPreferences<NotificationPreferences>({ userId });

  const [isSaving, setIsSaving] = useState(false);

  if (loading) {
    return (
      <div className="p-4">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-1/4"></div>
          <div className="space-y-3 mt-4">
            <div className="h-8 bg-gray-200 rounded"></div>
            <div className="h-8 bg-gray-200 rounded"></div>
            <div className="h-8 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !preferences) {
    return (
      <div className="p-4 text-red-500">
        Failed to load notification preferences
      </div>
    );
  }

  const handleChannelToggle = async (channel: 'web' | 'gotify' | 'desktop') => {
    try {
      setIsSaving(true);
      // If the channel is enabled, we want to keep all current types, otherwise clear them
      const isEnabled = preferences[`${channel}Enabled`];
      const types = isEnabled ? [] : preferences[channel];
      await updatePreferences(channel, types);
    } catch (error) {
      logger.error('Failed to toggle notification channel:', {
        error: error instanceof Error ? error.message : 'Unknown error',
        channelId: channel
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleEventToggle = async (eventType: NotificationType) => {
    try {
      setIsSaving(true);
      // Update all enabled channels with the new event type
      const channels: Array<'web' | 'gotify' | 'desktop'> = ['web', 'gotify', 'desktop'];

      for (const channel of channels) {
        const isEnabled = preferences[`${channel}Enabled`];
        if (isEnabled) {
          const currentTypes = preferences[channel];
          const hasType = currentTypes.includes(eventType);
          const updatedTypes = hasType
            ? currentTypes.filter(t => t !== eventType)
            : [...currentTypes, eventType];
          await updatePreferences(channel, updatedTypes);
        }
      }
    } catch (error) {
      logger.error('Failed to toggle notification event:', {
        error: error instanceof Error ? error.message : 'Unknown error',
        eventId: eventType
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-4 space-y-8">
      <div>
        <h2 className="text-lg font-semibold mb-4">Notification Channels</h2>
        <div className="space-y-4">
          {NOTIFICATION_CHANNELS.map(channel => (
            <div
              key={channel.id}
              className="flex items-start p-4 bg-white rounded-lg shadow"
            >
              <div className="flex-1">
                <h3 className="font-medium">{channel.name}</h3>
                <p className="text-sm text-gray-500">{channel.description}</p>
              </div>
              <div className="ml-4">
                <button
                  type="button"
                  className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                    preferences[`${channel.id}Enabled`]
                      ? 'bg-blue-600'
                      : 'bg-gray-200'
                  } ${isSaving ? 'opacity-50 cursor-not-allowed' : ''}`}
                  disabled={isSaving}
                  onClick={() => handleChannelToggle(channel.id)}
                >
                  <span
                    className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                      preferences[`${channel.id}Enabled`]
                        ? 'translate-x-5'
                        : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div>
        <h2 className="text-lg font-semibold mb-4">Notification Types</h2>
        <div className="space-y-4">
          {NOTIFICATION_EVENTS.map(event => (
            <div
              key={event.type}
              className="flex items-start p-4 bg-white rounded-lg shadow"
            >
              <div className="flex-1">
                <h3 className="font-medium">{event.name}</h3>
                <p className="text-sm text-gray-500">{event.description}</p>
              </div>
              <div className="ml-4">
                <button
                  type="button"
                  className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                    preferences.alertTypes[event.type]
                      ? 'bg-blue-600'
                      : 'bg-gray-200'
                  } ${isSaving ? 'opacity-50 cursor-not-allowed' : ''}`}
                  disabled={isSaving}
                  onClick={() => handleEventToggle(event.type)}
                >
                  <span
                    className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                      preferences.alertTypes[event.type]
                        ? 'translate-x-5'
                        : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
