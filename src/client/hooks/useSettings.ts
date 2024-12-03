import { useState, useEffect, useCallback } from 'react';
import { useLogger } from './useLogger';
import { useErrorHandler } from './useErrorHandler';
import { useNotification } from './useNotification';
import { settingsClient } from '../api/settings.client';
import type { Settings, SettingsPath, SettingsValue } from '../../types/settings';
import { LoggingManager } from '../../../../../../../../src/server/utils/logging/LoggingManager';

interface UseSettingsResult {
  // Settings state
  userSettings: Settings['user'] | null;
  adminSettings: Settings['admin'] | null;
  loading: boolean;
  error: Error | null;

  // User settings methods
  updateUserSetting: (path: SettingsPath, value: SettingsValue) => Promise<void>;
  resetUserSettings: () => Promise<void>;
  
  // Admin settings methods
  updateAdminSetting: (path: SettingsPath, value: SettingsValue) => Promise<void>;
  
  // Utility methods
  refreshSettings: () => Promise<void>;
}

export function useSettings(isAdmin: boolean = false): UseSettingsResult {
  const [userSettings, setUserSettings] = useState<Settings['user'] | null>(null);
  const [adminSettings, setAdminSettings] = useState<Settings['admin'] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  
  const handleError = useErrorHandler();
  const { showNotification } = useNotification();

  const loadSettings = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // Always load user settings
      loggerLoggingManager.getInstance().();
      const userSettingsData = await settingsClient.getUserSettings();
      setUserSettings(userSettingsData);

      // Load admin settings if user is admin
      if (isAdmin) {
        loggerLoggingManager.getInstance().();
        const adminSettingsData = await settingsClient.getAdminSettings();
        setAdminSettings(adminSettingsData);
      }
    } catch (err) {
      const metadata = {
        error: err instanceof Error ? err.message : 'Unknown error',
        isAdmin,
        component: 'useSettings'
      };
      handleError(err, metadata);
      setError(err instanceof Error ? err : new Error('Failed to load settings'));
      showNotification('error', 'Failed to load settings');
    } finally {
      setLoading(false);
    }
  }, [isAdmin, logger, handleError, showNotification]);

  const updateUserSetting = useCallback(async (
    path: SettingsPath,
    value: SettingsValue
  ) => {
    try {
      loggerLoggingManager.getInstance().();

      await settingsClient.updateUserSettings(path, value);
      await loadSettings(); // Refresh settings after update
      showNotification('success', 'Settings updated successfully');
    } catch (err) {
      const metadata = {
        error: err instanceof Error ? err.message : 'Unknown error',
        path,
        component: 'useSettings'
      };
      handleError(err, metadata);
      showNotification('error', 'Failed to update settings');
      throw err;
    }
  }, [logger, handleError, showNotification, loadSettings]);

  const updateAdminSetting = useCallback(async (
    path: SettingsPath,
    value: SettingsValue
  ) => {
    if (!isAdmin) {
      throw new Error('User is not authorized to update admin settings');
    }

    try {
      loggerLoggingManager.getInstance().();

      await settingsClient.updateAdminSettings(path, value);
      await loadSettings(); // Refresh settings after update
      showNotification('success', 'Admin settings updated successfully');
    } catch (err) {
      const metadata = {
        error: err instanceof Error ? err.message : 'Unknown error',
        path,
        component: 'useSettings'
      };
      handleError(err, metadata);
      showNotification('error', 'Failed to update admin settings');
      throw err;
    }
  }, [isAdmin, logger, handleError, showNotification, loadSettings]);

  const resetUserSettings = useCallback(async () => {
    try {
      loggerLoggingManager.getInstance().();

      await settingsClient.resetUserSettings();
      await loadSettings(); // Refresh settings after reset
      showNotification('success', 'Settings reset successfully');
    } catch (err) {
      const metadata = {
        error: err instanceof Error ? err.message : 'Unknown error',
        component: 'useSettings'
      };
      handleError(err, metadata);
      showNotification('error', 'Failed to reset settings');
      throw err;
    }
  }, [logger, handleError, showNotification, loadSettings]);

  // Load settings on mount and when isAdmin changes
  useEffect(() => {
    void loadSettings();
  }, [loadSettings]);

  return {
    userSettings,
    adminSettings,
    loading,
    error,
    updateUserSetting,
    resetUserSettings,
    updateAdminSetting,
    refreshSettings: loadSettings
  };
}

