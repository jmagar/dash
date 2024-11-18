export interface DockerContainer {
  id: string;
  hostId: string;
  name: string;
  image: string;
  command: string;
  created: number;  // Unix timestamp
  state: string;
  status: string;
  ports: DockerPort[];
  mounts: DockerMount[];
  networks: string[];
  labels: Record<string, string>;
  createdAt: Date;
  updatedAt: Date;
}

export interface DockerPort {
  privatePort: number;
  publicPort: number;
  protocol: string;
}

export interface DockerMount {
  type: string;
  source: string;
  destination: string;
  mode: string;
  rw: boolean;
}

export interface DockerNetwork {
  id: string;
  name: string;
  driver: string;
  scope: string;
  internal: boolean;
  attachable: boolean;
  ingress: boolean;
  ipam: {
    driver: string;
    config: {
      subnet: string;
      gateway: string;
    }[];
  };
}

export interface DockerVolume {
  name: string;
  driver: string;
  mountpoint: string;
  scope: string;
  labels: Record<string, string>;
}

export interface DockerStats {
  containers: number;
  cpuUsage: number;  // Percentage
  memoryUsage: number;  // Bytes
  diskUsage: number;  // Bytes
  networkRx: number;  // Bytes
  networkTx: number;  // Bytes
  timestamp: Date;
}

export interface DockerComposeConfig {
  name: string;
  content: string;
  version: string;
  services: Record<string, DockerComposeService>;
  createdAt: Date;
  updatedAt: Date;
}

export interface DockerComposeService {
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
  status: 'running' | 'stopped' | 'error';
  services: Record<string, {
    status: string;
    health: string;
    containers: DockerContainer[];
  }>;
}

// Re-export ContainerStats for backward compatibility
export type ContainerStats = DockerStats;
