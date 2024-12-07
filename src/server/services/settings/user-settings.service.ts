import { Pool } from 'pg';
import type { Settings, SettingsResponse, UserPreferences } from '../../../types/settings';
import type { JsonObject, JsonValue } from '../../managers/types/manager.types';
import { SettingsCache } from './cache';
import { BaseSettingsService } from './base-settings.service';

export class UserSettingsService extends BaseSettingsService {
  constructor(
    private readonly pool: Pool,
    private readonly settingsCache: SettingsCache
  ) {
    super();
  }

  public async getUserSettings(userId: string): Promise<Settings> {
    const metadata = { userId, operation: 'getUserSettings' };
    try {
      // Get settings from cache first
      const cacheKey = this.settingsCache.getCacheKey(userId);
      const cachedSettings = await this.settingsCache.getFromCache<JsonObject>(cacheKey);
      if (cachedSettings) {
        return this.convertFromJson<Settings>(cachedSettings);
      }

      // Get settings from database
      const query = 'SELECT category, subcategory, settings FROM user_settings WHERE user_id = $1';
      const result = await this.pool.query<{ category: string; subcategory: string; settings: JsonObject }>(query, [userId]);

      // Initialize settings with default values
      const settings: Settings = this.getDefaultSettings();

      // Update settings with database values
      for (const row of result.rows) {
        if (row.category && row.subcategory && row.settings) {
          const category = row.category as keyof Settings;
          const subcategory = row.subcategory as keyof Settings[typeof category];
          if (settings[category] && typeof settings[category] === 'object') {
            Object.assign(settings[category][subcategory], row.settings);
          }
        }
      }

      // Cache settings
      await this.settingsCache.setInCache(cacheKey, this.convertToJson(settings));

      return settings;
    } catch (error) {
      this.logger.error('Failed to get user settings', { ...metadata, error: error instanceof Error ? error : String(error) });
      throw error;
    }
  }

  public async updateUserSettings(
    userId: string,
    category: keyof UserPreferences,
    subcategory: string,
    value: JsonValue
  ): Promise<SettingsResponse> {
    const metadata = { userId, category, subcategory, operation: 'updateUserSettings' };
    try {
      // Validate settings
      const validationError = this.validateSettings([category, subcategory], value);
      if (validationError) {
        return { success: false, message: validationError.message };
      }

      // Update database
      const query = `
        INSERT INTO user_settings (user_id, category, subcategory, settings)
        VALUES ($1, $2, $3, $4)
        ON CONFLICT (user_id, category, subcategory)
        DO UPDATE SET settings = $4
      `;
      await this.pool.query(query, [userId, category, subcategory, value]);

      // Invalidate cache
      const cacheKey = this.settingsCache.getCacheKey(userId);
      await this.settingsCache.removeFromCache(cacheKey);

      return { success: true };
    } catch (error) {
      this.logger.error('Failed to update user settings', { ...metadata, error: error instanceof Error ? error : String(error) });
      return { success: false, message: 'Failed to update settings' };
    }
  }

  public async resetUserSettings(userId: string): Promise<SettingsResponse> {
    const metadata = { userId, operation: 'resetUserSettings' };
    try {
      // Delete from database
      const query = 'DELETE FROM user_settings WHERE user_id = $1';
      await this.pool.query(query, [userId]);

      // Invalidate cache
      const cacheKey = this.settingsCache.getCacheKey(userId);
      await this.settingsCache.removeFromCache(cacheKey);

      return { success: true };
    } catch (error) {
      this.logger.error('Failed to reset user settings', { ...metadata, error: error instanceof Error ? error : String(error) });
      return { success: false, message: 'Failed to reset settings' };
    }
  }

  private convertToJson<T>(value: T): JsonValue {
    return JSON.parse(JSON.stringify(value)) as JsonValue;
  }

  private convertFromJson<T>(value: JsonValue): T {
    return value as unknown as T;
  }
}
