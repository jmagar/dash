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

export interface DockerContainerMetrics {
  name: string;
  image: string;
  ports: Array<{
    hostPort: number;
    containerPort: number;
    protocol: string;
  }>;
  env: Array<{
    key: string;
    value: string;
  }>;
  command: string[];
  status: string;
  created: string;
  state: string;
}
