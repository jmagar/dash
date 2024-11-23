import { Pool } from 'pg';
import { logger } from '../utils/logger';
import { BaseService } from './base.service';
import type { Settings, SettingsPath, SettingsValue, SettingsResponse, SettingsError, UserPreferences, AdminSettings } from '../../types/settings';
import { db } from '../db';
import { redis } from '../redis';
import { NotFoundError, ValidationError } from '../errors';

export class SettingsService extends BaseService {
  private pool: Pool;
  private static instance: SettingsService;

  private constructor() {
    super();
    this.pool = db;
  }

  public static getInstance(): SettingsService {
    if (!SettingsService.instance) {
      SettingsService.instance = new SettingsService();
    }
    return SettingsService.instance;
  }

  async cleanup(): Promise<void> {
    // Close database connection
    await this.pool.end();
  }

  // Cache helpers
  private async getCacheKey(userId: string, category: string, subcategory: string): Promise<string> {
    return `settings:${userId}:${category}:${subcategory}`;
  }

  private async getFromCache(cacheKey: string): Promise<any | null> {
    try {
      const cached = await redis.get(cacheKey);
      return cached ? JSON.parse(cached) : null;
    } catch (error) {
      logger.warn('Failed to get settings from cache', {
        error: error instanceof Error ? error.message : 'Unknown error',
        cacheKey,
        component: 'SettingsService'
      });
      return null;
    }
  }

  private async setInCache(cacheKey: string, value: any, ttl: number = 3600): Promise<void> {
    try {
      await redis.setex(cacheKey, ttl, JSON.stringify(value));
    } catch (error) {
      logger.warn('Failed to set settings in cache', {
        error: error instanceof Error ? error.message : 'Unknown error',
        cacheKey,
        component: 'SettingsService'
      });
    }
  }

  // User Settings
  public async getUserSettings(userId: string): Promise<Settings['user']> {
    try {
      logger.info('Getting user settings', {
        userId,
        component: 'SettingsService'
      });

      const query = `
        SELECT category, subcategory, settings
        FROM settings_store
        WHERE user_id = $1
      `;

      const { rows } = await this.pool.query(query, [userId]);
      
      // Transform rows into settings object
      const settings: Settings['user'] = {
        interface: {} as UserPreferences['interface'],
        fileExplorer: {} as UserPreferences['fileExplorer'],
        operations: {} as UserPreferences['operations'],
        personal: {} as UserPreferences['personal']
      };

      rows.forEach(row => {
        if (row.category in settings) {
          settings[row.category] = {
            ...settings[row.category],
            [row.subcategory]: row.settings
          };
        }
      });

      return settings;
    } catch (error) {
      const metadata = {
        error: error instanceof Error ? error.message : 'Unknown error',
        userId,
        component: 'SettingsService'
      };
      this.handleError(error, metadata);
      throw error;
    }
  }

  public async updateUserSettings(
    userId: string,
    path: SettingsPath,
    value: SettingsValue
  ): Promise<SettingsResponse> {
    try {
      logger.info('Updating user settings', {
        userId,
        path,
        component: 'SettingsService'
      });

      const [category, subcategory, ...rest] = path;
      
      // Validate path
      if (!category || !subcategory) {
        throw new ValidationError('Invalid settings path');
      }

      const query = `
        INSERT INTO settings_store (user_id, category, subcategory, settings)
        VALUES ($1, $2, $3, $4)
        ON CONFLICT (user_id, category, subcategory)
        DO UPDATE SET settings = settings_store.settings || $4::jsonb
        RETURNING *
      `;

      // Create nested object from remaining path
      let settingsValue = value;
      for (let i = rest.length - 1; i >= 0; i--) {
        settingsValue = { [rest[i]]: settingsValue };
      }

      const { rows } = await this.pool.query(query, [
        userId,
        category,
        subcategory,
        settingsValue
      ]);

      // Invalidate cache
      const cacheKey = await this.getCacheKey(userId, category, subcategory);
      await redis.del(cacheKey);

      return {
        success: true,
        message: 'Settings updated successfully',
        data: rows[0]
      };
    } catch (error) {
      const metadata = {
        error: error instanceof Error ? error.message : 'Unknown error',
        userId,
        path,
        component: 'SettingsService'
      };
      this.handleError(error, metadata);
      throw error;
    }
  }

  // Admin Settings
  public async getAdminSettings(): Promise<Settings['admin']> {
    try {
      logger.info('Getting admin settings', {
        component: 'SettingsService'
      });

      const query = `
        SELECT category, settings
        FROM admin_settings
      `;

      const { rows } = await this.pool.query(query);
      
      // Transform rows into settings object
      const settings: Settings['admin'] = {
        system: {} as AdminSettings['system'],
        userManagement: {} as AdminSettings['userManagement'],
        hostManagement: {} as AdminSettings['hostManagement'],
        storageManagement: {} as AdminSettings['storageManagement']
      };

      rows.forEach(row => {
        if (row.category in settings) {
          settings[row.category] = row.settings;
        }
      });

      return settings;
    } catch (error) {
      const metadata = {
        error: error instanceof Error ? error.message : 'Unknown error',
        component: 'SettingsService'
      };
      this.handleError(error, metadata);
      throw error;
    }
  }

  public async updateAdminSettings(
    path: SettingsPath,
    value: SettingsValue
  ): Promise<SettingsResponse> {
    try {
      logger.info('Updating admin settings', {
        path,
        component: 'SettingsService'
      });

      const [category, ...rest] = path;
      
      // Validate path
      if (!category) {
        throw new ValidationError('Invalid settings path');
      }

      const query = `
        INSERT INTO admin_settings (category, settings)
        VALUES ($1, $2)
        ON CONFLICT (category)
        DO UPDATE SET settings = admin_settings.settings || $2::jsonb
        RETURNING *
      `;

      // Create nested object from remaining path
      let settingsValue = value;
      for (let i = rest.length - 1; i >= 0; i--) {
        settingsValue = { [rest[i]]: settingsValue };
      }

      const { rows } = await this.pool.query(query, [category, settingsValue]);

      // Invalidate cache
      const cacheKey = `admin:settings:${category}`;
      await redis.del(cacheKey);

      return {
        success: true,
        message: 'Admin settings updated successfully',
        data: rows[0]
      };
    } catch (error) {
      const metadata = {
        error: error instanceof Error ? error.message : 'Unknown error',
        path,
        component: 'SettingsService'
      };
      this.handleError(error, metadata);
      throw error;
    }
  }

  // Utility methods
  public async resetUserSettings(userId: string): Promise<SettingsResponse> {
    try {
      logger.info('Resetting user settings', {
        userId,
        component: 'SettingsService'
      });

      const query = `
        DELETE FROM settings_store
        WHERE user_id = $1
      `;

      await this.pool.query(query, [userId]);

      // Clear all user's cached settings
      const cachePattern = `settings:${userId}:*`;
      const keys = await redis.keys(cachePattern);
      if (keys.length > 0) {
        await redis.del(keys);
      }

      return {
        success: true,
        message: 'Settings reset successfully'
      };
    } catch (error) {
      const metadata = {
        error: error instanceof Error ? error.message : 'Unknown error',
        userId,
        component: 'SettingsService'
      };
      this.handleError(error, metadata);
      throw error;
    }
  }

  public async validateSettings(
    path: SettingsPath,
    value: SettingsValue
  ): Promise<SettingsError | null> {
    // Add validation logic here based on settings type
    return null;
  }
}

export const settingsService = SettingsService.getInstance();
