export interface Host {
  id: number;
  name: string;
  hostname: string;
  port: number;
  username: string;
  password?: string;
  status: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateHostRequest {
  name: string;
  hostname: string;
  port: number;
  username: string;
  password?: string;
}

export type UpdateHostRequest = CreateHostRequest

export interface Container {
  id: string;
  name: string;
  image: string;
  status: string;
  state: string;
  createdAt: Date;
  ports: string[];
  labels: Record<string, string>;
}

export interface Stack {
  name: string;
  services: string[];
  status: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface FileItem {
  name: string;
  path: string;
  type: 'file' | 'directory';
  size: number;
  modified: Date;
}

export interface User {
  id: string;
  username: string;
  email: string;
  role: string;
  is_active: boolean;
  password_hash?: string;
  createdAt: Date;
  updatedAt: Date;
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

export interface ContainerStats {
  cpu: number;
  memory: {
    usage: number;
    limit: number;
    percent: number;
  };
  network: {
    rx_bytes: number;
    tx_bytes: number;
  };
  blockio: {
    read_bytes: number;
    write_bytes: number;
  };
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}
