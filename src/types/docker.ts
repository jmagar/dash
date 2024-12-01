import { BaseEntity } from './base';
import { ServiceStatus } from './status';
import { ServiceEvent } from './events';

export interface DockerContainer extends BaseEntity {
  hostId: string;
  name: string;
  image: string;
  command: string;
  created: number;  // Unix timestamp
  state: ServiceStatus;
  status: string;
  ports: DockerPort[];
  mounts: DockerMount[];
  networks: string[];
  labels: Record<string, string>;
  createdAt: Date;
  updatedAt: Date;
}

export interface DockerEvent extends ServiceEvent {
  type: 'docker:container' | 'docker:network' | 'docker:volume';
  payload: {
    action: 'create' | 'start' | 'stop' | 'destroy' | 'update';
    container?: DockerContainer;
    network?: DockerNetwork;
    volume?: DockerVolume;
  };
}

export interface DockerPort extends BaseEntity {
  privatePort: number;
  publicPort: number;
  protocol: string;
}

export interface DockerMount extends BaseEntity {
  type: string;
  source: string;
  destination: string;
  mode: string;
  rw: boolean;
}

export interface DockerNetwork extends BaseEntity {
  name: string;
  driver: string;
  scope: string;
  internal: boolean;
  attachable: boolean;
  ingress: boolean;
  ipam: DockerIpam;
  createdAt: Date;
  updatedAt: Date;
}

export interface DockerIpam extends BaseEntity {
  driver: string;
  config: DockerIpamConfig[];
}

export interface DockerIpamConfig extends BaseEntity {
  subnet: string;
  gateway: string;
}

export interface DockerVolume extends BaseEntity {
  name: string;
  driver: string;
  mountpoint: string;
  scope: string;
  labels: Record<string, string>;
  createdAt: Date;
  updatedAt: Date;
}

export interface DockerStats extends BaseEntity {
  hostId: string;
  containers: number;
  cpuUsage: number;  // Percentage
  memoryUsage: number;  // Bytes
  diskUsage: number;  // Bytes
  networkRx: number;  // Bytes
  networkTx: number;  // Bytes
  timestamp: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface DockerComposeConfig extends BaseEntity {
  name: string;
  content: string;
  version: string;
  services: Record<string, DockerComposeService>;
  createdAt: Date;
  updatedAt: Date;
}

export interface DockerComposeService extends BaseEntity {
  image: string;
  ports?: string[];
  environment?: Record<string, string>;
  volumes?: string[];
  depends_on?: string[];
  command?: string;
  entrypoint?: string;
  restart?: string;
  networks?: string[];
  labels?: Record<string, string>;
}

export interface DockerComposeState {
  status: ServiceStatus;
  services: Record<string, {
    status: ServiceStatus;
    health: ServiceStatus;
    containers: DockerContainer[];
  }>;
}

// Type guards
export function isDockerContainer(obj: unknown): obj is DockerContainer {
  return obj !== null &&
    typeof obj === 'object' &&
    'id' in obj &&
    'hostId' in obj &&
    'name' in obj &&
    'image' in obj;
}

export function isDockerNetwork(obj: unknown): obj is DockerNetwork {
  return obj !== null &&
    typeof obj === 'object' &&
    'id' in obj &&
    'name' in obj &&
    'driver' in obj;
}

export function isDockerVolume(obj: unknown): obj is DockerVolume {
  return obj !== null &&
    typeof obj === 'object' &&
    'id' in obj &&
    'name' in obj &&
    'driver' in obj &&
    'mountpoint' in obj;
}

export function isDockerStats(obj: unknown): obj is DockerStats {
  return obj !== null &&
    typeof obj === 'object' &&
    'id' in obj &&
    'hostId' in obj &&
    'containers' in obj &&
    'cpuUsage' in obj &&
    'memoryUsage' in obj;
}

export function isDockerComposeConfig(obj: unknown): obj is DockerComposeConfig {
  return obj !== null &&
    typeof obj === 'object' &&
    'id' in obj &&
    'name' in obj &&
    'content' in obj &&
    'version' in obj &&
    'services' in obj;
}

// Re-export ContainerStats for backward compatibility
export type ContainerStats = DockerStats;
