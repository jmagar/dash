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
    ioStats?: {
      readCount: number;
      writeCount: number;
      readBytes: number;
      writeBytes: number;
      ioTime: number;
    };
  };
  network: {
    bytesSent: number;
    bytesRecv: number;
    packetsSent: number;
    packetsRecv: number;
    errorsIn: number;
    errorsOut: number;
    dropsIn: number;
    dropsOut: number;
    connections: number;
    tcpConns: number;
    udpConns: number;
    listenPorts: number;
    interfaces: string[];
    totalSpeed: number;
    averageSpeed: number;
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
  name: string;
  command: string;
  username: string;
  status: string;
  cpuUsage: number;
  memoryUsage: number;
  memoryRss: number;
  memoryVms: number;
  threads: number;
  fds: number;
  createdAt: Date;
  updatedAt: Date;
}
