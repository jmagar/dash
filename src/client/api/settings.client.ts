import type { Settings, SettingsPath, SettingsValue, SettingsResponse } from '../../types/settings';
import { apiClient } from './api.client';

class SettingsClient {
  private static instance: SettingsClient;

  private constructor() {}

  public static getInstance(): SettingsClient {
    if (!SettingsClient.instance) {
      SettingsClient.instance = new SettingsClient();
    }
    return SettingsClient.instance;
  }

  // User Settings
  public async getUserSettings(): Promise<Settings['user']> {
    const response = await apiClient.get<Settings['user']>('/api/settings/user');
    return response.data;
  }

  public async updateUserSettings(
    path: SettingsPath,
    value: SettingsValue
  ): Promise<SettingsResponse> {
    const response = await apiClient.patch<SettingsResponse>('/api/settings/user', {
      path,
      value
    });
    return response.data;
  }

  public async resetUserSettings(): Promise<SettingsResponse> {
    const response = await apiClient.post<SettingsResponse>('/api/settings/user/reset');
    return response.data;
  }

  // Admin Settings
  public async getAdminSettings(): Promise<Settings['admin']> {
    const response = await apiClient.get<Settings['admin']>('/api/settings/admin');
    return response.data;
  }

  public async updateAdminSettings(
    path: SettingsPath,
    value: SettingsValue
  ): Promise<SettingsResponse> {
    const response = await apiClient.patch<SettingsResponse>('/api/settings/admin', {
      path,
      value
    });
    return response.data;
  }
}

export const settingsClient = SettingsClient.getInstance();
