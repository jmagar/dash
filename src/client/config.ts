// Client-side configuration
export const BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:4000/api';

export const APP_CONFIG = {
  // Default theme settings
  theme: {
    defaultMode: 'light' as const,
    storageKey: 'theme-mode',
  },
  // Authentication settings
  auth: {
    tokenStorageKey: 'token',
    refreshInterval: 5 * 60 * 1000, // 5 minutes
  },
  // API settings
  api: {
    baseUrl: BASE_URL,
    timeout: 30000, // 30 seconds
    retryAttempts: 3,
  },
  // Feature flags
  features: {
    enableMFA: true,
    enableDarkMode: true,
    enableFileExplorer: true,
    enableDockerManager: true,
  },
};
