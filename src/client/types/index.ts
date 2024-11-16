import type { LogEntry as ServerLogEntry, LogFilter as ServerLogFilter } from '../../types/socket.io';

export type LogEntry = ServerLogEntry;
export type LogFilter = ServerLogFilter;

export interface SystemMetrics {
  timestamp: Date;
  cpu: {
    total: number;
    user: number;
    system: number;
    idle: number;
    iowait: number;
    steal: number;
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
    tcpRetrans: number;
    tcpResets: number;
    averageSpeed: number;
  };
  uptimeSeconds: number;
  loadAverage: [number, number, number];
  createdAt: Date;
  updatedAt: Date;
}
