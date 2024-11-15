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

export type UpdateHostRequest = Partial<CreateHostRequest>

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

export interface DockerContainer {
  id: string;
  name: string;
  image: string;
  status: string;
  state: string;
  createdAt: Date;
  labels: Record<string, string>;
  compose?: {
    project: string;
    service: string;
    configFile: string;
  };
  ports: Array<{
    ip: string;
    external: number;
    internal: number;
    protocol: string;
  }>;
  networks: Array<{
    name: string;
    ipAddress: string;
  }>;
  volumes: Array<{
    source: string;
    destination: string;
  }>;
}

export interface DockerNetwork {
  id: string;
  name: string;
  driver: string;
  subnet: string;
  gateway: string;
  containers: Array<{
    id: string;
    name: string;
    ipAddress: string;
  }>;
}

export interface DockerVolume {
  id: string;
  name: string;
  driver: string;
  source: string;
  destination: string;
  containers: Array<{
    id: string;
    name: string;
  }>;
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
  role: 'admin' | 'user';
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

export interface CommandRequest {
  command: string;
  args?: string[];
  cwd?: string;
  env?: Record<string, string>;
}

export interface Command extends CommandRequest {
  id: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  exitCode?: number;
  stdout: string;
  stderr: string;
  startedAt: Date;
  completedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface CommandResult {
  command: Command;
  status: 'running' | 'completed' | 'failed';
  exitCode?: number;
  stdout: string;
  stderr: string;
  startedAt: Date;
  completedAt?: Date;
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
  cpu: {
    usage: number;
    cores: number;
  };
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
  uptime: number;
  loadAvg: [number, number, number];
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
