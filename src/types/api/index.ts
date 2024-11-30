// Re-export all API types
export * from './base';
export * from './host';
export * from './process';

// Export combined endpoints
import { hostEndpoints } from './host';
import { processEndpoints } from './process';

export const API_ENDPOINTS = {
  hosts: hostEndpoints,
  processes: processEndpoints,
} as const;

// Export endpoint paths
export const API_PATHS = {
  hosts: {
    base: '/hosts',
    create: '/hosts',
    update: (id: string) => `/hosts/${id}`,
    delete: (id: string) => `/hosts/${id}`,
    get: (id: string) => `/hosts/${id}`,
    list: '/hosts',
  },
  processes: {
    list: (hostId: string) => `/hosts/${hostId}/processes`,
    get: (hostId: string, pid: number) => `/hosts/${hostId}/processes/${pid}`,
    metrics: (hostId: string, pid: number) => `/hosts/${hostId}/processes/${pid}/metrics`,
    kill: (hostId: string, pid: number) => `/hosts/${hostId}/processes/${pid}/kill`,
  },
} as const;
