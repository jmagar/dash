export interface Host {
  id: string;
  user_id: string;
  name: string;
  hostname: string;
  port: number;
  username: string;
  password?: string;
  status: string;
  agent_status: string;
  agent_version?: string;
  agent_last_seen?: Date;
  environment?: string;
  metadata?: Record<string, any>;
  created_at: Date;
  updated_at: Date;
}

export interface CreateHostRequest {
  name: string;
  hostname: string;
  port: number;
  username: string;
  password?: string;
  environment?: string;
  install_agent?: boolean;
}

export type UpdateHostRequest = Partial<CreateHostRequest>;

export interface Command {
  id: string;
  command: string;
  args?: string[];
  cwd?: string;
  env?: Record<string, string>;
  status: 'pending' | 'running' | 'completed' | 'failed';
  exitCode?: number;
  stdout: string;
  stderr: string;
  startedAt: Date;
  completedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface CommandRequest {
  command: string;
  args?: string[];
  cwd?: string;
  env?: Record<string, string>;
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

export interface AgentMetrics {
  cpu_usage: number;
  memory_usage: number;
  disk_usage: number;
  load_average: number[];
  process_count: number;
  active_jobs: number;
  error_count: number;
  uptime_seconds: number;
  timestamp: Date;
}

export interface FileItem {
  name: string;
  path: string;
  type: 'file' | 'directory';
  size: number;
  modified: Date;
}

export interface Package {
  name: string;
  version: string;
  description?: string;
  installed: boolean;
  updateAvailable?: boolean;
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

// Base container interface with common properties
interface BaseContainer {
  id: string;
  name: string;
  image: string;
  status: string;
  state: string;
  createdAt: Date;
  labels: Record<string, string>;
}

// Simple container interface for basic usage
export interface Container extends BaseContainer {
  ports: string[];
}

// Extended container interface for Docker-specific features
export interface DockerContainer extends BaseContainer {
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
