export interface ProcessLimits {
  cpu?: {
    percentage: number;  // CPU usage percentage limit (0-100)
    action: 'notify' | 'kill' | 'renice';  // Action to take when limit is exceeded
    duration?: number;  // Duration in seconds the limit must be exceeded before action
  };
  memory?: {
    percentage: number;  // Memory usage percentage limit (0-100)
    bytes?: number;     // Absolute memory limit in bytes
    action: 'notify' | 'kill' | 'limit';  // Action to take when limit is exceeded
    duration?: number;  // Duration in seconds the limit must be exceeded before action
  };
  children?: {
    count: number;      // Maximum number of child processes
    action: 'notify' | 'kill';  // Action to take when limit is exceeded
  };
}

export interface ProcessLimitViolation {
  pid: number;
  processName: string;
  limitType: 'cpu' | 'memory' | 'children';
  currentValue: number;
  limitValue: number;
  duration: number;
  action: string;
  timestamp: Date;
}

export interface ProcessLimitConfig {
  enabled: boolean;
  globalLimits?: ProcessLimits;
  processLimits: Record<string, ProcessLimits>;  // Process name -> limits
  userLimits: Record<string, ProcessLimits>;     // Username -> limits
}
