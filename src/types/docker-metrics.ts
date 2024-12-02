export interface DockerServiceMetrics {
  containers: number;
  images: number;
  memory_usage: number;
  cpu_usage: number;
}

export interface DockerContainerMetrics {
  id: string;
  name: string;
  image: string;
  status: string;
  created: string;
  state: string;
  memory_usage: number;
  cpu_usage: number;
  network_rx_bytes: number;
  network_tx_bytes: number;
}
