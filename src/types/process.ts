export interface ProcessInfo {
  pid: number;
  name: string;
  status: string;
  cpu: number;
  memory: number;
  command?: string;
  user?: string;
  startTime?: string;
  threads?: number;
}

export interface ProcessStats {
  totalCpu: number;
  totalMemory: number;
  processCount: number;
  threadCount: number;
  timestamp: string;
}
