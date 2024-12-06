export enum ServiceStatus {
  HEALTHY = 'HEALTHY',
  UNHEALTHY = 'UNHEALTHY',
  DEGRADED = 'DEGRADED'
}

export interface ServiceHealth {
  status: ServiceStatus;
  version: string;
  details?: Record<string, unknown>;
}
