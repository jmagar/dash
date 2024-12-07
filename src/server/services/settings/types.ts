import type { JsonValue, JsonObject } from '../../managers/types/manager.types';
import type { Settings, UserPreferences, AdminSettings } from '../../../types/settings';

export interface SettingsRow {
  id: string;
  category: string;
  subcategory?: string;
  value: unknown;
  created_at: Date;
  updated_at: Date;
}

export interface AdminSettingsRow {
  id: string;
  category: string;
  settings: JsonObject;
}

export type UserSettingsMap = {
  [K in keyof Settings['user']]: UserPreferences[K];
};

export type AdminSettingsMap = {
  [K in keyof Settings['admin']]: AdminSettings[K];
};

export interface CacheOptions {
  ttl?: number;
  prefix?: string;
}

export interface SettingsServiceConfig {
  cacheTTL: number;
}

export { JsonValue, JsonObject };
