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
    passphrase?: string;
  };
  isActive?: boolean;
  sshKeyId?: string;
}

export interface CreateHostRequest {
  name: string;
  hostname: string;
  port: number;
  username: string;
  credentials?: {
    password?: string;
    privateKey?: string;
    passphrase?: string;
  };
  sshKeyId?: string;
}

export interface UpdateHostRequest extends CreateHostRequest {
  isActive?: boolean;
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

export interface Stack {
  name: string;
  services: number;
  status: 'running' | 'partial' | 'stopped';
  created: Date;
}

export interface FileItem {
  name: string;
  path: string;
  type: 'file' | 'directory';
  size: number;
  modified: Date;
}

export interface User {
  id: string | number;
  username: string;
  email?: string;
  password?: string;
  password_hash?: string;
  role: string;
  is_active: boolean;
  lastLogin?: Date;
  last_login?: Date;
  createdAt?: Date;
  currentPassword?: string;
  newPassword?: string;
}

export interface Package {
  name: string;
  version: string;
  description?: string;
  installed: boolean;
  updateAvailable?: boolean;
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

export interface SSHConfig {
  host: string;
  port: number;
  username?: string;
  password?: string;
  privateKey?: string;
  passphrase?: string;
  readyTimeout?: number;
  keepaliveInterval?: number;
  keepaliveCountMax?: number;
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

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}
