import { UserPreferences } from '@prisma/client';
import { BaseClient } from './base.client';

class PreferencesClient extends BaseClient {
  async getPreferences(): Promise<UserPreferences | null> {
    const response = await this.get<UserPreferences>('/api/preferences');
    return response;
  }

  async updatePreferences(data: {
    themeMode?: string;
    accentColor?: string;
  }): Promise<UserPreferences> {
    const response = await this.put<UserPreferences>('/api/preferences', data);
    return response;
  }
}

export const preferencesClient = new PreferencesClient();
