export interface DockerServiceMetrics {
  containers: number;
  containersRunning: number;
  containersPaused: number;
  containersStopped: number;
  images: number;
  memoryTotal: number;
  cpuCount: number;
  version: string;
}

export interface DockerContainerMetrics {
  id: string;
  name: string;
  image: string;
  status: string;
  state: string;
  created: number;
  ports: Array<{
    IP?: string;
    PrivatePort: number;
    PublicPort?: number;
    Type: string;
  }>;
  networks: string[];
}

export interface DockerVolumeMetrics {
  name: string;
  driver: string;
  mountpoint: string;
  labels: Record<string, string>;
  scope: string;
  status: Record<string, unknown>;
}

export interface DockerNetworkMetrics {
  id: string;
  name: string;
  driver: string;
  scope: string;
  ipam: {
    driver: string;
    config: Array<{
      subnet?: string;
      gateway?: string;
    }>;
  };
  internal: boolean;
  attachable: boolean;
  ingress: boolean;
  containers: Record<string, {
    name: string;
    endpointId: string;
    macAddress: string;
    ipv4Address: string;
    ipv6Address: string;
  }>;
  options: Record<string, string>;
  labels: Record<string, string>;
}

export interface DockerEventMetrics {
  type: string;
  action: string;
  actor: {
    id: string;
    attributes: Record<string, string>;
  };
  time: number;
  timeNano: number;
}

export interface DockerError {
  code: string;
  message: string;
  details?: unknown;
}

export interface DockerConfig {
  socketPath?: string;
  host?: string;
  port?: number;
  ca?: string;
  cert?: string;
  key?: string;
}

export interface DockerContainerCreateOptions {
  name?: string;
  image: string;
  command?: readonly string[];
  ports?: Readonly<Record<string, string>>;
  env?: Readonly<Record<string, string>>;
}

export interface DockerInfo {
  Containers: number;
  ContainersRunning: number;
  ContainersPaused: number;
  ContainersStopped: number;
  Images: number;
  MemTotal: number;
  NCPU: number;
  ServerVersion: string;
}

export interface DockerCommandResult {
  stdout: string;
  stderr: string;
  exitCode: number;
  data?: Record<string, unknown>;
}
