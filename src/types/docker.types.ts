import { BaseEntity } from './base';
import { ServiceStatus } from './status';
import { ServiceEvent } from './events';

export interface DockerContainer extends BaseEntity {
  hostId: string;
  stackId?: string;
  name: string;
  image: string;
  command: string;
  status: ServiceStatus;
  state: string;
  created: Date;
  started?: Date;
  finished?: Date;
  ports: {
    internal: number;
    external: number;
    protocol: string;
  }[];
  mounts: {
    source: string;
    destination: string;
    mode: string;
  }[];
  networks: string[];
  labels: Record<string, string>;
  env: string[];
}

export interface DockerNetwork extends BaseEntity {
  hostId: string;
  name: string;
  driver: string;
  scope: string;
  internal: boolean;
  ipam: {
    driver: string;
    config: {
      subnet: string;
      gateway: string;
    }[];
  };
  labels: Record<string, string>;
}

export interface DockerVolume extends BaseEntity {
  hostId: string;
  name: string;
  driver: string;
  mountpoint: string;
  scope: string;
  labels: Record<string, string>;
}

export interface DockerStats {
  container_id: string;
  name: string;
  cpu: {
    usage: number;
    system: number;
    user: number;
  };
  memory: {
    usage: number;
    limit: number;
    max: number;
  };
  network: {
    rx_bytes: number;
    tx_bytes: number;
    rx_packets: number;
    tx_packets: number;
  };
  block_io: {
    read: number;
    write: number;
  };
  timestamp: Date;
}

export interface DockerComposeConfig {
  version: string;
  services: Record<string, {
    image?: string;
    build?: {
      context: string;
      dockerfile?: string;
      args?: Record<string, string>;
    };
    command?: string;
    environment?: Record<string, string>;
    ports?: string[];
    volumes?: string[];
    networks?: string[];
    depends_on?: string[];
    restart?: string;
    labels?: Record<string, string>;
  }>;
  networks?: Record<string, {
    driver?: string;
    external?: boolean;
    labels?: Record<string, string>;
  }>;
  volumes?: Record<string, {
    driver?: string;
    external?: boolean;
    labels?: Record<string, string>;
  }>;
}

// Type guards
export function isDockerContainer(obj: unknown): obj is DockerContainer {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    'hostId' in obj &&
    'name' in obj &&
    'image' in obj &&
    'command' in obj &&
    'status' in obj &&
    'state' in obj &&
    'created' in obj
  );
}

export function isDockerNetwork(obj: unknown): obj is DockerNetwork {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    'hostId' in obj &&
    'name' in obj &&
    'driver' in obj &&
    'scope' in obj &&
    'internal' in obj &&
    'ipam' in obj
  );
}

export function isDockerVolume(obj: unknown): obj is DockerVolume {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    'hostId' in obj &&
    'name' in obj &&
    'driver' in obj &&
    'mountpoint' in obj &&
    'scope' in obj
  );
}

export function isDockerStats(obj: unknown): obj is DockerStats {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    'container_id' in obj &&
    'name' in obj &&
    'cpu' in obj &&
    'memory' in obj &&
    'network' in obj &&
    'block_io' in obj &&
    'timestamp' in obj
  );
}
