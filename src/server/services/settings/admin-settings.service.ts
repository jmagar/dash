import { Pool } from 'pg';
import type { Settings, SettingsResponse, AdminSettings } from '../../../types/settings';
import type { JsonObject, JsonValue, JsonPrimitive } from '../../managers/types/manager.types';
import { SettingsCache } from './cache';
import { BaseSettingsService } from './base-settings.service';

export class AdminSettingsService extends BaseSettingsService {
  private readonly ADMIN_CACHE_KEY = 'settings:admin';

  constructor(
    private readonly pool: Pool,
    private readonly settingsCache: SettingsCache
  ) {
    super();
  }

  public async getAdminSettings(): Promise<Settings['admin']> {
    try {
      // Get settings from cache first
      const cachedSettings = await this.settingsCache.getFromCache<JsonObject>(this.ADMIN_CACHE_KEY);
      if (cachedSettings) {
        return this.convertFromJson(cachedSettings);
      }

      // Get settings from database
      const query = `
        SELECT category, settings
        FROM admin_settings
      `;
      const { rows } = await this.pool.query<{ category: string; settings: JsonObject }>(query);
      
      // Transform rows into settings object
      const settings = this.getDefaultSettings().admin;

      rows.forEach((row) => {
        const category = row.category as keyof AdminSettings;
        if (category in settings) {
          settings[category] = this.convertFromJson(row.settings);
        }
      });

      // Cache settings
      await this.settingsCache.setInCache(this.ADMIN_CACHE_KEY, this.convertToJson(settings));

      return settings;
    } catch (error) {
      this.logger.error('Failed to get admin settings', { 
        error: error instanceof Error ? error.message : String(error) 
      });
      throw error;
    }
  }

  public async updateAdminSettings(
    category: keyof AdminSettings,
    value: AdminSettings[keyof AdminSettings]
  ): Promise<SettingsResponse> {
    const metadata = { category };
    try {
      // Convert to JSON-safe object
      const jsonValue = this.convertToJson(value);

      // Validate settings
      const validationError = this.validateSettings(['admin', category], jsonValue);
      if (validationError) {
        return { success: false, message: validationError.message };
      }

      // Update database
      const query = `
        INSERT INTO admin_settings (category, settings)
        VALUES ($1, $2)
        ON CONFLICT (category)
        DO UPDATE SET settings = $2
      `;
      await this.pool.query(query, [category, jsonValue]);

      // Invalidate cache
      await this.settingsCache.removeFromCache(this.ADMIN_CACHE_KEY);

      return { success: true };
    } catch (error) {
      this.logger.error('Failed to update admin settings', { 
        ...metadata, 
        error: error instanceof Error ? error.message : String(error) 
      });
      return { success: false, message: 'Failed to update settings' };
    }
  }

  private convertToJson<T>(value: T): JsonObject {
    // First convert to a plain object to remove any class/prototype info
    const plainObj = JSON.parse(JSON.stringify(value)) as Record<string, unknown>;
    // Convert to a proper JsonObject with index signature
    const jsonObj: JsonObject = {};
    for (const [key, val] of Object.entries(plainObj)) {
      jsonObj[key] = this.toJsonValue(val);
    }
    return jsonObj;
  }

  private toJsonValue(value: unknown): JsonValue {
    if (value === null) return null;
    if (['string', 'number', 'boolean'].includes(typeof value)) return value as JsonPrimitive;
    if (Array.isArray(value)) return value.map(v => this.toJsonValue(v));
    if (typeof value === 'object') {
      const obj: JsonObject = {};
      for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
        obj[k] = this.toJsonValue(v);
      }
      return obj;
    }
    throw new Error(`Cannot convert value of type ${typeof value} to JsonValue`);
  }

  private convertFromJson<T>(json: JsonObject): T {
    return json as unknown as T;
  }
}
