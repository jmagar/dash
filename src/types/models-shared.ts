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
  services: string;
  status: string;
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
  role: string;
  lastLogin?: Date;
  createdAt?: Date;
  currentPassword?: string;
  newPassword?: string;
}

export interface Package {
  name: string;
  version: string;
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
