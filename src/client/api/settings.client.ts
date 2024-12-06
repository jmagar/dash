import { BaseApiClient, type Endpoint } from './base.client';
import type { Settings, SettingsPath, SettingsValue, SettingsResponse } from '../../types/settings';

type SettingsEndpoints = Record<string, Endpoint> & {
  GET_USER: '/api/settings/user';
  UPDATE_USER: '/api/settings/user';
  RESET_USER: '/api/settings/user/reset';
  GET_ADMIN: '/api/settings/admin';
  UPDATE_ADMIN: '/api/settings/admin';
};

const SETTINGS_ENDPOINTS: SettingsEndpoints = {
  GET_USER: '/api/settings/user',
  UPDATE_USER: '/api/settings/user',
  RESET_USER: '/api/settings/user/reset',
  GET_ADMIN: '/api/settings/admin',
  UPDATE_ADMIN: '/api/settings/admin',
};

class SettingsClient extends BaseApiClient<SettingsEndpoints> {
  private static instance: SettingsClient;

  private constructor() {
    super(SETTINGS_ENDPOINTS);
  }

  public static getInstance(): SettingsClient {
    if (!SettingsClient.instance) {
      SettingsClient.instance = new SettingsClient();
    }
    return SettingsClient.instance;
  }

  // User Settings
  public async getUserSettings(): Promise<Settings['user']> {
    const response = await this.get<Settings['user']>(
      this.getEndpoint('GET_USER')
    );

    if (!response.data) {
      throw new Error('Failed to get user settings');
    }

    return response.data;
  }

  public async updateUserSettings(
    path: SettingsPath,
    value: SettingsValue
  ): Promise<SettingsResponse> {
    const response = await this.patch<SettingsResponse>(
      this.getEndpoint('UPDATE_USER'),
      { path, value }
    );

    if (!response.data) {
      throw new Error('Failed to update user settings');
    }

    return response.data;
  }

  public async resetUserSettings(): Promise<SettingsResponse> {
    const response = await this.post<SettingsResponse>(
      this.getEndpoint('RESET_USER')
    );

    if (!response.data) {
      throw new Error('Failed to reset user settings');
    }

    return response.data;
  }

  // Admin Settings
  public async getAdminSettings(): Promise<Settings['admin']> {
    const response = await this.get<Settings['admin']>(
      this.getEndpoint('GET_ADMIN')
    );

    if (!response.data) {
      throw new Error('Failed to get admin settings');
    }

    return response.data;
  }

  public async updateAdminSettings(
    path: SettingsPath,
    value: SettingsValue
  ): Promise<SettingsResponse> {
    const response = await this.patch<SettingsResponse>(
      this.getEndpoint('UPDATE_ADMIN'),
      { path, value }
    );

    if (!response.data) {
      throw new Error('Failed to update admin settings');
    }

    return response.data;
  }
}

export const settingsClient = SettingsClient.getInstance();
