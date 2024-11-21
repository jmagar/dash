import { BaseApiClient } from './base.client';

interface UserPreferences {
  id: string;
  userId: string;
  themeMode: string;
  accentColor?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

const ENDPOINTS = {
  getPreferences: '/api/preferences',
  updatePreferences: '/api/preferences',
};

class PreferencesClient extends BaseApiClient {
  constructor() {
    super(ENDPOINTS);
  }

  async getPreferences(): Promise<UserPreferences | null> {
    const response = await this.get<UserPreferences>(this.getEndpoint('getPreferences'));
    return response.data || null;
  }

  async updatePreferences(data: {
    themeMode?: string;
    accentColor?: string;
  }): Promise<UserPreferences> {
    const response = await this.put<UserPreferences>(this.getEndpoint('updatePreferences'), data);
    if (!response.data) {
      throw new Error('Failed to update preferences');
    }
    return response.data;
  }
}

export const preferencesClient = new PreferencesClient();
