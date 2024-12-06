import { BaseApiClient, type Endpoint } from './base.client';

// Basic type until we create proper shared DTOs
interface UserPreferences {
  theme: 'light' | 'dark' | 'system';
  language: string;
  notifications: boolean;
  timezone: string;
  dateFormat: string;
  customizations?: Record<string, unknown>;
}

type PreferencesEndpoints = Record<string, Endpoint> & {
  GET: '/api/preferences';
  UPDATE: '/api/preferences';
};

const PREFERENCES_ENDPOINTS: PreferencesEndpoints = {
  GET: '/api/preferences',
  UPDATE: '/api/preferences',
};

class PreferencesClient extends BaseApiClient<PreferencesEndpoints> {
  constructor() {
    super(PREFERENCES_ENDPOINTS);
  }

  /**
   * Fetches the user's preferences.
   * 
   * @throws {Error} If the response is null.
   */
  async getPreferences(): Promise<UserPreferences> {
    const response = await this.get<UserPreferences>(
      this.getEndpoint('GET')
    );
    
    if (!response.data) {
      throw new Error('Failed to fetch preferences');
    }

    return response.data;
  }

  /**
   * Updates the user's preferences.
   * 
   * @param {Partial<UserPreferences>} preferences The preferences to update.
   * @throws {Error} If the response is null.
   */
  async updatePreferences(preferences: Partial<UserPreferences>): Promise<UserPreferences> {
    const response = await this.put<UserPreferences>(
      this.getEndpoint('UPDATE'),
      preferences
    );

    if (!response.data) {
      throw new Error('Failed to update preferences');
    }

    return response.data;
  }
}

// Create a single instance
const preferencesClient = new PreferencesClient();

// Export bound methods
export const { getPreferences, updatePreferences } = preferencesClient;
