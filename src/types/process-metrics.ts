export interface SystemMetrics {
  timestamp: Date;
  cpuUsage: number;
  cpu: {
    total: number;
    user: number;
    system: number;
    idle: number;
    iowait?: number;
    steal?: number;
    cores: number;
    threads: number;
  };
  memory: {
    total: number;
    used: number;
    free: number;
    shared: number;
    buffers?: number;
    cached?: number;
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
    bytesRecv: number;
    bytesSent: number;
    packetsRecv: number;
    packetsSent: number;
    errorsIn: number;
    errorsOut: number;
    dropsIn: number;
    dropsOut: number;
    connections: number;
    tcpConns: number;
    udpConns: number;
    listenPorts: number;
    interfaces: number;
    totalSpeed: number;
    averageSpeed: number;
  };
  loadAverage: number[];
  uptimeSeconds: number;
  diskTotal?: number;
  diskUsed?: number;
  diskFree?: number;
}

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
  fds?: number;
  ioStats?: {
    readCount: number;
    writeCount: number;
    readBytes: number;
    writeBytes: number;
  };
  createdAt: Date;
  updatedAt: Date;
}

export interface ProcessLimits {
  pid: number;
  cpuLimit?: number;
  memoryLimit?: number;
  ioLimit?: number;
  networkLimit?: number;
  fileDescriptorLimit?: number;
  threadLimit?: number;
  nice?: number;
  priority?: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface ProcessAlert {
  pid: number;
  type: 'cpu' | 'memory' | 'io' | 'network' | 'fileDescriptor' | 'thread';
  threshold: number;
  current: number;
  message: string;
  severity: 'info' | 'warning' | 'error';
  timestamp: Date;
}

export interface ProcessHistory {
  pid: number;
  metrics: ProcessMetrics[];
  alerts: ProcessAlert[];
  limits: ProcessLimits[];
  startTime: Date;
  endTime?: Date;
}
