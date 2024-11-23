// Admin Settings Types
export interface SystemConfig {
  serverSettings: {
    logLevel: 'debug' | 'info' | 'warn' | 'error';
    maxConcurrentOperations: number;
    tempFileLifetime: number; // in hours
  };
  databaseSettings: {
    connectionPoolSize: number;
    statementTimeout: number; // in seconds
    idleTimeout: number; // in seconds
  };
  securitySettings: {
    sessionTimeout: number; // in minutes
    maxLoginAttempts: number;
    passwordPolicy: {
      minLength: number;
      requireNumbers: boolean;
      requireSpecialChars: boolean;
      requireUppercase: boolean;
      requireLowercase: boolean;
    };
  };
}

export interface UserManagementConfig {
  defaultRole: string;
  roles: {
    name: string;
    permissions: string[];
  }[];
  passwordExpiryDays: number;
  inactivityLockoutDays: number;
}

export interface HostManagementConfig {
  sshDefaults: {
    port: number;
    timeout: number;
    keepaliveInterval: number;
    compression: boolean;
  };
  agentDefaults: {
    updateInterval: number;
    healthCheckInterval: number;
    logRetentionDays: number;
  };
  securityPolicies: {
    allowPasswordAuth: boolean;
    requirePublicKey: boolean;
    allowedKeyTypes: string[];
  };
}

export interface StorageManagementConfig {
  backupSettings: {
    enabled: boolean;
    interval: number; // in hours
    retention: number; // in days
    location: string;
  };
  cacheSettings: {
    maxSize: number; // in MB
    ttl: number; // in minutes
    cleanupInterval: number; // in minutes
  };
  quotas: {
    defaultUserQuota: number; // in MB
    maxFileSize: number; // in MB
    warningThreshold: number; // percentage
  };
}

export interface AdminSettings {
  system: SystemConfig;
  userManagement: UserManagementConfig;
  hostManagement: HostManagementConfig;
  storageManagement: StorageManagementConfig;
}

// User Preferences Types
export interface InterfacePreferences {
  theme: 'light' | 'dark' | 'system';
  accentColor: string;
  language: string;
  layout: {
    density: 'comfortable' | 'compact' | 'standard';
    sidebarWidth: number;
    sidebarCollapsed: boolean;
    terminalHeight: number;
  };
  fonts: {
    size: number;
    useCustomMonoFont: boolean;
    customMonoFont?: string;
  };
}

export interface FileExplorerPreferences {
  viewMode: 'list' | 'grid';
  sortBy: {
    field: 'name' | 'size' | 'modified' | 'type';
    direction: 'asc' | 'desc';
  };
  showHiddenFiles: boolean;
  previewPane: {
    enabled: boolean;
    position: 'right' | 'bottom';
    width: number;
  };
  fileAssociations: {
    extension: string;
    previewType: string;
    defaultApp?: string;
  }[];
  gridSettings: {
    itemSize: 'small' | 'medium' | 'large';
    showLabels: boolean;
  };
}

export interface OperationPreferences {
  compression: {
    defaultFormat: 'zip' | 'tar' | 'tar.gz' | 'tar.bz2';
    preserveStructure: boolean;
    defaultLocation: string;
  };
  confirmations: {
    delete: boolean;
    move: boolean;
    overwrite: boolean;
    compress: boolean;
  };
  search: {
    saveHistory: boolean;
    maxHistoryItems: number;
    caseSensitive: boolean;
    useRegex: boolean;
  };
  defaultLocations: {
    downloads: string;
    uploads: string;
    extracts: string;
  };
}

export interface PersonalPreferences {
  shortcuts: {
    [key: string]: string;
  };
  notifications: {
    enabled: boolean;
    sound: boolean;
    operationComplete: boolean;
    errors: boolean;
  };
  favorites: {
    locations: string[];
    hosts: string[];
  };
  tags: {
    id: string;
    name: string;
    color: string;
  }[];
  recentLimit: number;
}

export interface UserPreferences {
  interface: InterfacePreferences;
  fileExplorer: FileExplorerPreferences;
  operations: OperationPreferences;
  personal: PersonalPreferences;
}

// Combined Settings Type
export interface Settings {
  admin: AdminSettings;
  user: UserPreferences;
}

// Settings Update Types
export type SettingsPath = (keyof Settings | string)[]; // e.g. ['user', 'interface', 'theme']
export type SettingsValue = any; // TODO: Make this more specific based on path

export interface SettingsUpdate {
  path: SettingsPath;
  value: SettingsValue;
}

// Settings Service Response Types
export interface SettingsResponse {
  success: boolean;
  message?: string;
  data?: Partial<Settings>;
}

export interface SettingsError {
  code: string;
  message: string;
  path?: SettingsPath;
}
