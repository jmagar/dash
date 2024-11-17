export interface ProcessMetrics {
  pid: number;
  timestamp: Date;
  name: string;
  command: string;
  username: string;
  cpuUsage: number;
  memoryUsage: number;
  memoryRss: number;
  memoryVms: number;
  threads: number;
  fds: number;
  ioStats?: {
    readCount: number;
    writeCount: number;
    readBytes: number;
    writeBytes: number;
    ioTime: number;
  };
  createdAt: Date;
  updatedAt: Date;
}

export interface SystemMetrics {
  timestamp: Date;
  cpu: {
    user: number;
    system: number;
    idle: number;
    iowait: number;
    steal: number;
    total: number;
    cores: number;
    threads: number;
  };
  memory: {
    total: number;
    used: number;
    free: number;
    shared: number;
    buffers: number;
    cached: number;
    available: number;
    swapTotal: number;
    swapUsed: number;
    swapFree: number;
    usage: number;
  };
  storage: {
    total: number;
    used: number;
    free: number;
    usage: number;
    read_bytes: number;
    write_bytes: number;
    ioStats?: {
      readCount: number;
      writeCount: number;
      readBytes: number;
      writeBytes: number;
      ioTime: number;
    };
  };
  network: {
    rx_bytes: number;
    tx_bytes: number;
    rx_packets: number;
    tx_packets: number;
    rx_errors: number;
    tx_errors: number;
    rx_dropped: number;
    tx_dropped: number;
    connections: number;
    tcp_conns: number;
    udp_conns: number;
    listen_ports: number;
    interfaces: string[];
    total_speed: number;
    average_speed: number;
    health: number;
  };
  uptimeSeconds: number;
  loadAverage: [number, number, number];
  history?: SystemMetrics[];
  createdAt: Date;
  updatedAt: Date;
}

export interface ProcessInfo {
  pid: number;
  ppid: number;
  name: string;
  command: string;
  args: string[];
  user: string;
  username: string;
  cpu: number;
  memory: number;
  cpuUsage: number;
  memoryUsage: number;
  memoryRss: number;
  memoryVms: number;
  status: 'running' | 'sleeping' | 'stopped' | 'zombie' | 'unknown';
  startTime: Date;
  threads: number;
  fds: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface MetricsAlert {
  id: string;
  hostId: string;
  type: 'cpu' | 'memory' | 'disk' | 'network' | 'process';
  level: 'info' | 'warning' | 'error';
  message: string;
  threshold: number;
  value: number;
  timestamp: Date;
  acknowledged: boolean;
  acknowledgedBy?: string;
  acknowledgedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface MetricsThreshold {
  id: string;
  hostId: string;
  type: 'cpu' | 'memory' | 'disk' | 'network' | 'process';
  level: 'info' | 'warning' | 'error';
  operator: '>' | '<' | '>=' | '<=' | '==' | '!=';
  value: number;
  duration: number;
  enabled: boolean;
  createdAt: Date;
  updatedAt: Date;
}
