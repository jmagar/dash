/**
 * Metrics model type definitions
 */

export interface SystemMetrics {
  timestamp: string;
  cpu: {
    usage: number;
    temperature?: number;
    cores: number[];
  };
  memory: {
    total: number;
    used: number;
    free: number;
    cached?: number;
    buffers?: number;
    swap?: {
      total: number;
      used: number;
      free: number;
    };
  };
  disk: {
    total: number;
    used: number;
    free: number;
    reads: number;
    writes: number;
  };
  network: {
    interfaces: {
      name: string;
      rx: number;
      tx: number;
      rxErrors: number;
      txErrors: number;
    }[];
  };
}

export interface MetricDataPoint {
  timestamp: string;
  value: number;
}

export interface MetricSeries {
  name: string;
  unit: string;
  data: MetricDataPoint[];
}

export interface MetricQuery {
  metric: string;
  start: string;
  end: string;
  interval: string;
  aggregation?: 'avg' | 'sum' | 'min' | 'max';
}

export interface MetricAlert {
  id: string;
  metric: string;
  condition: '>' | '<' | '>=' | '<=' | '==' | '!=';
  threshold: number;
  duration: string;
  severity: 'info' | 'warning' | 'error' | 'critical';
  enabled: boolean;
  lastTriggered?: string;
}
