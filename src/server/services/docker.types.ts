export interface DockerServiceMetrics {
  containers: number;
  containersRunning: number;
  containersPaused: number;
  containersStopped: number;
  images: number;
  memoryLimit: number;
  cpuTotal: number;
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
  mounts: Array<{
    Type: string;
    Name?: string;
    Source: string;
    Destination: string;
    Driver?: string;
    Mode: string;
    RW: boolean;
  }>;
  labels: Record<string, string>;
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
  Image: string;
  Cmd?: string[];
  Env?: string[];
  ExposedPorts?: Record<string, {}>;
  HostConfig?: {
    Binds?: string[];
    PortBindings?: Record<string, Array<{ HostPort: string }>>;
    RestartPolicy?: {
      Name: string;
      MaximumRetryCount?: number;
    };
    NetworkMode?: string;
  };
  Labels?: Record<string, string>;
  name?: string;
}
