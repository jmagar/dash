import { db } from '../../db';
import { redis } from '../../cache/redis.client';
import { SettingsCache } from './cache';
import { UserSettingsService } from './user-settings.service';
import { AdminSettingsService } from './admin-settings.service';
import type { Settings, SettingsResponse } from '../../../types/settings';
import type { JsonValue } from '../../managers/types/manager.types';
import type { Pool } from 'pg';

export class SettingsService {
  private static instance: SettingsService;
  private readonly userSettings: UserSettingsService;
  private readonly adminSettings: AdminSettingsService;

  private constructor() {
    const cache = new SettingsCache(redis);
    this.userSettings = new UserSettingsService(db as unknown as Pool, cache);
    this.adminSettings = new AdminSettingsService(db as unknown as Pool, cache);
  }

  public static getInstance(): SettingsService {
    if (!SettingsService.instance) {
      SettingsService.instance = new SettingsService();
    }
    return SettingsService.instance;
  }

  // User Settings
  public getUserSettings(userId: string): Promise<Settings> {
    return this.userSettings.getUserSettings(userId);
  }

  public updateUserSettings(
    userId: string,
    category: keyof Settings['user'],
    subcategory: string,
    value: JsonValue
  ): Promise<SettingsResponse> {
    return this.userSettings.updateUserSettings(userId, category, subcategory, value);
  }

  public resetUserSettings(userId: string): Promise<SettingsResponse> {
    return this.userSettings.resetUserSettings(userId);
  }

  // Admin Settings
  public getAdminSettings(): Promise<Settings['admin']> {
    return this.adminSettings.getAdminSettings();
  }

  public updateAdminSettings(
    category: keyof Settings['admin'],
    value: Settings['admin'][keyof Settings['admin']]
  ): Promise<SettingsResponse> {
    return this.adminSettings.updateAdminSettings(category, value);
  }
}

// Export singleton instance
export const settingsService = SettingsService.getInstance();

// Re-export types
export * from './types';
export type { JsonValue, JsonObject } from '../../managers/types/manager.types';
