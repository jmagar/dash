export interface User {
  id: number;
  uuid: string;
  username: string;
  email: string;
  role: 'admin' | 'user' | 'viewer';
  preferredLanguage: string;
  isActive: boolean;
  lastLogin: Date;
  mfaEnabled: boolean;
  gdprCompliant: boolean;
  preferences: UserPreferences;
}

export interface UserPreferences {
  theme: 'light' | 'dark' | 'system';
  language: string;
  terminalFontFamily: string;
  terminalFontSize: number;
}

export const DEFAULT_USER_PREFERENCES: UserPreferences = {
  theme: 'system',
  language: 'en',
  terminalFontFamily: 'monospace',
  terminalFontSize: 14,
};

export interface Host {
  id: number;
  name: string;
  hostname: string;
  port: number;
  ip: string;
  isActive: boolean;
}

export interface Package {
  name: string;
  version: string;
  description?: string;
  installed: boolean;
  updateAvailable: boolean;
}

export interface FileItem {
  name: string;
  path: string;
  type: 'file' | 'directory';
  size: number;
  modified: Date;
  permissions: string;
}

export interface SystemStats {
  cpu: number;
  memory: {
    total: number;
    used: number;
    free: number;
  };
  disk: {
    total: number;
    used: number;
    free: number;
  };
  network: {
    rx: number;
    tx: number;
  };
}

export interface CommandHistory {
  id: string;
  command: string;
  output: string;
  exitCode: number;
  duration: number;
  error?: string;
  timestamp: Date;
}

export interface ApiResult<T> {
  success: boolean;
  data?: T;
  error?: string;
}

export interface AuthResult extends ApiResult<User> {
  token?: string;
  mfaRequired?: boolean;
}

export interface UserRegistration {
  username: string;
  email: string;
  password: string;
  confirmPassword: string;
  gdprConsent: boolean;
}

export interface UseDockerUpdatesOptions {
  enabled?: boolean;
  onUpdate?: (data: any) => void;
}

export interface Container {
  id: string;
  name: string;
  image: string;
  status: string;
  state: 'running' | 'stopped' | 'exited' | 'created';
  ports: string[];
  created: Date;
}

export interface Stack {
  name: string;
  services: number;
  status: 'running' | 'partial' | 'stopped';
  created: Date;
}
