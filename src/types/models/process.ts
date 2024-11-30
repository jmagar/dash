/**
 * Process model type definitions
 */

export type ProcessStatus = 'running' | 'stopped' | 'error';

export interface ProcessMetrics {
  cpu: number;
  memory: number;
  threads: number;
  fileDescriptors: number;
}

export interface ProcessConfig {
  autoRestart: boolean;
  maxRestarts: number;
  restartDelay: number;
  logRotation: {
    enabled: boolean;
    maxSize: number;
    maxFiles: number;
  };
}

export interface Process {
  id: string;
  hostId: string;
  name: string;
  command: string;
  args: string[];
  cwd: string;
  pid?: number;
  status: ProcessStatus;
  startTime?: string;
  stopTime?: string;
  exitCode?: number;
  metrics?: ProcessMetrics;
  config?: ProcessConfig;
  env?: Record<string, string>;
}
