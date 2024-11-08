export interface User {
  id: number;
  username: string;
  email: string;
  role?: string;
  lastLogin?: Date;
  createdAt?: Date;
}

export interface AuthResult {
  success: boolean;
  data?: User;
  token?: string;
  mfaRequired?: boolean;
  error?: string;
}

export interface UserRegistration {
  username: string;
  email: string;
  password: string;
  confirmPassword?: string;
}

export interface Host {
  id: number;
  name: string;
  hostname: string;
  port: number;
  username: string;
  status: 'connected' | 'disconnected' | 'error';
  lastConnected?: Date;
  credentials?: {
    password?: string;
    privateKey?: string;
  };
  ip?: string;
  isActive?: boolean;
}

export interface Package {
  name: string;
  version: string;
  installed: boolean;
  updateAvailable?: boolean;
}

export interface Command {
  command: string;
  workingDirectory?: string;
  environment?: Record<string, string>;
  timeout?: number;
}

export interface CommandResult {
  stdout?: string;
  stderr?: string;
  exitCode: number;
  error?: string;
}

export interface ApiResult<T> {
  success: boolean;
  data?: T;
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

export interface Stack {
  name: string;
  services: string;
  status: string;
  created: Date;
}

export interface Container {
  id: string;
  name: string;
  image: string;
  status: string;
  state: 'running' | 'stopped' | 'paused';
  created: Date;
  ports?: string[];
}

export interface FileItem {
  name: string;
  path: string;
  type: 'file' | 'directory';
  size: number;
  modified: Date;
}
