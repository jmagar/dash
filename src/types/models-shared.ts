import type { DockerContainer, DockerNetwork, DockerVolume, DockerStats, DockerPort } from './docker';

export { DockerContainer, DockerNetwork, DockerVolume, DockerStats };

export interface CommandRequest {
  command: string;
  args?: string[];
  cwd?: string;
  env?: Record<string, string>;
  timeout?: number;
  shell?: boolean;
  sudo?: boolean;
}

export interface CommandResult {
  exitCode: number;
  stdout: string;
  stderr: string;
  duration: number;
  error?: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  startedAt?: Date;
  completedAt?: Date;
}

export interface Command {
  id: string;
  hostId: string;
  command: string;
  args?: string[];
  cwd?: string;
  env?: Record<string, string>;
  request: CommandRequest;
  result?: CommandResult;
  status: 'pending' | 'running' | 'completed' | 'failed';
  createdAt: Date;
  startedAt?: Date;
  completedAt?: Date;
  updatedAt: Date;
}

export interface CreateHostRequest {
  name: string;
  hostname: string;
  port: number;
  username: string;
  password?: string;
  install_agent?: boolean;
  environment?: string;
  tags?: string[];
  metadata?: Record<string, unknown>;
}

export type UpdateHostRequest = Partial<CreateHostRequest>

export interface Host {
  id: string;
  name: string;
  hostname: string;
  port: number;
  username: string;
  password?: string;
  privateKey?: string;
  passphrase?: string;
  environment?: string;
  tags?: string[];
  status: 'online' | 'offline' | 'error';
  lastSeen?: Date;
  agentStatus?: 'installed' | 'error' | null;
  agentVersion?: string;
  metadata?: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

export interface HostGroup {
  id: string;
  name: string;
  description?: string;
  hosts: Host[];
  tags?: string[];
  metadata?: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

export interface HostStats {
  total: number;
  online: number;
  offline: number;
  error: number;
  byOs: {
    [key: string]: number;
  };
  byStatus: {
    [key: string]: number;
  };
  byFeature: {
    [key: string]: number;
  };
}

export interface HostFilter {
  search?: string;
  status?: Host['status'][];
  os?: string[];
  features?: string[];
  tags?: string[];
  groupId?: string;
}

export interface HostSort {
  field: keyof Host;
  direction: 'asc' | 'desc';
}

export interface HostUpdate {
  name?: string;
  hostname?: string;
  port?: number;
  username?: string;
  tags?: string[];
  metadata?: Record<string, unknown>;
}

export interface Package {
  name: string;
  version: string;
  description?: string;
  installed: boolean;
  updateAvailable: boolean;
  latestVersion?: string;
  size?: number;
  dependencies?: string[];
  repository?: string;
  license?: string;
  homepage?: string;
  metadata?: Record<string, unknown>;
}

export interface FileItem {
  name: string;
  path: string;
  type: 'file' | 'directory' | 'symlink';
  size?: number;
  permissions?: string;
  owner?: string;
  group?: string;
  modifiedTime?: Date;
  isHidden?: boolean;
  metadata?: Record<string, unknown>;
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  meta?: {
    page?: number;
    limit?: number;
    total?: number;
    [key: string]: unknown;
  };
}

export interface SSHConfig {
  host: string;
  port: number;
  username: string;
  password?: string;
  privateKey?: string;
  passphrase?: string;
}

export interface Container extends DockerContainer {
  hostId: string;
  stackId?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Stack {
  id: string;
  name: string;
  hostId: string;
  status: 'running' | 'stopped' | 'error';
  config: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface SystemStats {
  id: string;
  hostId: string;
  cpuUsage: number;
  memoryUsage: number;
  diskUsage: number;
  networkUsage: {
    bytesRecv: number;
    bytesSent: number;
    packetsRecv: number;
    packetsSent: number;
    errorsIn: number;
    errorsOut: number;
    dropsIn: number;
    dropsOut: number;
    connections: number;
    tcpConns: number;
    udpConns: number;
    listenPorts: number;
    interfaces: string[];
    totalSpeed: number;
    averageSpeed: number;
  };
  timestamp: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface DockerComposeConfig {
  name: string;
  content: string;
  version: string;
  services: Record<string, {
    image: string;
    ports?: string[];
    environment?: Record<string, string>;
    volumes?: string[];
    depends_on?: string[];
  }>;
  createdAt: Date;
  updatedAt: Date;
}

export interface UserRegistration {
  username: string;
  email: string;
  password: string;
  role: 'admin' | 'user';
}

export interface User {
  id: string;
  username: string;
  email: string;
  role: 'admin' | 'user';
  permissions: string[];
  createdAt: Date;
  updatedAt: Date;
}
