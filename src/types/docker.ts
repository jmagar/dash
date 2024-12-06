export interface DockerContainer {
  id: string;
  name: string;
  image: string;
  command: string[];
  created: string;
  state: string;
  status: string;
  ports: Array<{
    hostPort: number;
    containerPort: number;
    protocol: string;
  }>;
  env: Array<{
    key: string;
    value: string;
  }>;
  hostId: string;
}

export type ContainerState =
  | 'created'
  | 'running'
  | 'paused'
  | 'restarting'
  | 'removing'
  | 'exited'
  | 'dead'
  | 'starting'
  | 'stopping'
  | 'error';

export interface ContainerUpdate {
  containerId: string;
  updates: Partial<DockerContainer>;
}

export interface DockerMetrics {
  containers: number;
  containersRunning: number;
  containersPaused: number;
  containersStopped: number;
  images: number;
  memTotal: number;
  ncpu: number;
  serverVersion: string;
}
