// Host-related types
export interface Host {
  id: number;
  uuid: string;
  name: string;
  hostname: string;
  ip: string;
  port: number;
  username: string;
  privateKeyPath?: string;
  status: 'connected' | 'disconnected' | 'error';
  isActive: boolean;
  lastConnected?: Date;
  error?: string;
}

export interface SystemStats {
  cpu: number;
  memory: {
    used: number;
    total: number;
  };
  disk: {
    used: number;
    total: number;
  };
  network: {
    rx: number;
    tx: number;
  };
}

// File system types
export interface FileItem {
  name: string;
  path: string;
  type: 'file' | 'directory';
  size: number;
  permissions: string;
  modified: Date;
  modifyTime: string;
  owner: string;
  group: string;
  isSymlink?: boolean;
  linkTarget?: string;
  isDirectory: boolean;
}

export interface DownloadedFile {
  name: string;
  content: string;
  encoding: string;
  size: number;
  modified: Date;
}

export interface FileOperationResult {
  success: boolean;
  error?: string;
  path?: string;
  message?: string;
}

// Package management types
export interface Package {
  name: string;
  version: string;
  description?: string;
  installed: boolean;
  updateAvailable: boolean;
  dependencies?: Record<string, string>;
  size?: number;
  license?: string;
  repository?: string;
  homepage?: string;
  author?: string;
  maintainers?: string[];
  keywords?: string[];
  lastUpdated?: Date;
}

export interface PackageOperation {
  type: 'install' | 'uninstall' | 'update';
  package: string;
  version?: string;
  status: 'pending' | 'in-progress' | 'completed' | 'failed';
  error?: string;
  output?: string;
}

// Remote execution types
export interface Command {
  id: string;
  command: string;
  workingDirectory?: string;
  environment?: Record<string, string>;
  timeout?: number;
}

export interface CommandResult {
  id: string;
  command: string;
  output: string;
  exitCode: number;
  duration: number;
  error?: string;
}

export interface CommandHistory extends CommandResult {
  timestamp: Date;
}

export interface SavedCommand {
  id: string;
  name: string;
  command: string;
  description?: string;
  tags?: string[];
  lastUsed?: Date;
  useCount?: number;
}

// Terminal types
export interface TerminalSession {
  id: string;
  hostId: number;
  type: 'ssh' | 'container';
  containerId?: string;
  status: 'connected' | 'disconnected' | 'error';
  error?: string;
}

export interface TerminalSize {
  rows: number;
  cols: number;
}

// Docker types
export interface Container {
  id: string;
  name: string;
  image: string;
  status: string;
  state: 'running' | 'stopped' | 'exited' | 'created' | 'paused';
  ports: Record<string, string[]>;
  created: Date;
  networks: string[];
  mounts: Mount[];
}

export interface Mount {
  type: 'bind' | 'volume' | 'tmpfs';
  source: string;
  destination: string;
  mode: 'ro' | 'rw';
}

export interface ComposeStack {
  name: string;
  status: 'running' | 'partial' | 'stopped' | 'error';
  services: Record<string, ComposeService>;
  error?: string;
}

export interface ComposeService {
  name: string;
  image: string;
  status: string;
  containerId?: string;
  ports: Record<string, string[]>;
  volumes: string[];
  environment: Record<string, string>;
}

// User and authentication types
export interface User {
  id: number;
  uuid: string;
  username: string;
  email: string;
  role: 'admin' | 'user' | 'viewer';
  preferredLanguage: string;
  isActive: boolean;
  lastLogin?: Date;
  mfaEnabled: boolean;
  gdprCompliant: boolean;
  preferences: UserPreferences;
}

export interface UserPreferences {
  theme: 'light' | 'dark' | 'system';
  language: string;
  terminalFontSize: number;
  terminalFontFamily: string;
  terminalColorScheme: string;
  defaultHostId?: number;
  sshKeyPath?: string;
}

// Default user preferences
export const DEFAULT_USER_PREFERENCES: UserPreferences = {
  theme: 'system',
  language: 'en',
  terminalFontSize: 14,
  terminalFontFamily: 'monospace',
  terminalColorScheme: 'default',
};

export interface AuthToken {
  token: string;
  expiresAt: Date;
  refreshToken?: string;
}

// Error and logging types
export interface SystemError {
  code: string;
  message: string;
  details?: unknown;
  timestamp: Date;
  context?: Record<string, unknown>;
}

export interface LogEntry {
  level: 'debug' | 'info' | 'warn' | 'error';
  message: string;
  timestamp: Date;
  context?: Record<string, unknown>;
  error?: Error;
}

// Utility types
export type Status = 'idle' | 'loading' | 'success' | 'error';

export type SortOrder = 'asc' | 'desc';

export type SortDirection = 1 | -1;

export interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface TimeRange {
  start: Date;
  end: Date;
}

// API response types
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export type ApiResult<T> = Promise<ApiResponse<T>>;
