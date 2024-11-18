export interface SystemMetrics {
  timestamp: Date;
  cpu: {
    usage: number;
    user: number;
    system: number;
    idle: number;
    iowait: number;
    steal: number;
    cores: number;
    threads: number;
    total: number;
  };
  memory: {
    total: number;
    used: number;
    free: number;
    shared: number;
    buffers: number;
    cached: number;
    available: number;
    swap_total: number;
    swap_used: number;
    swap_free: number;
    usage: number;
  };
  storage: {
    total: number;
    used: number;
    free: number;
    usage: number;
    read_bytes: number;
    write_bytes: number;
    read_count: number;
    write_count: number;
    health: string;
    ioStats: {
      readBytes: number;
      writeBytes: number;
      readCount: number;
      writeCount: number;
      readTime: number;
      writeTime: number;
      ioTime: number;
    };
  };
  network: {
    bytesRecv: number;
    bytesSent: number;
    packetsRecv: number;
    packetsSent: number;
    errorsIn: number;
    errorsOut: number;
    dropsIn: number;
    dropsOut: number;
    tx_bytes: number;
    rx_bytes: number;
    tx_packets: number;
    rx_packets: number;
    rx_errors: number;
    tx_errors: number;
    rx_dropped: number;
    tx_dropped: number;
    tcp_conns: number;
    udp_conns: number;
    listen_ports: number;
    average_speed: number;
    total_speed: number;
    health: number;
    interfaces: {
      name: string;
      bytesRecv: number;
      bytesSent: number;
      packetsRecv: number;
      packetsSent: number;
      errorsIn: number;
      errorsOut: number;
      dropsIn: number;
      dropsOut: number;
    }[];
  };
  uptime: number;
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
  status: string;
  user: string;
  username: string;
  cpu: number;
  cpuUsage: number;
  memory: number;
  memoryUsage: number;
  memoryRss: number;
  memoryVms: number;
  threads: number;
  fds: number;
  startTime: Date;
  children?: ProcessInfo[];
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

export interface ProcessMetrics {
  id: string;
  hostId: string;
  pid: number;
  cpu: number;
  cpuUsage: number;
  memory: number;
  memoryUsage: number;
  memoryRss: number;
  memoryVms: number;
  diskRead: number;
  diskWrite: number;
  netRead: number;
  netWrite: number;
  threads: number;
  fds: number;
  timestamp: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface MetricsFilter {
  startTime?: Date;
  endTime?: Date;
  interval?: string;
  metrics?: string[];
}
