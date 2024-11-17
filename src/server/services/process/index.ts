import type { Server } from 'socket.io';
import { ProcessServiceImpl } from './process-service-impl';
import type { ProcessServiceOptions } from './types';
import type { ServerToClientEvents, ClientToServerEvents, InterServerEvents } from '../../../types/socket.io';

// Export types but avoid duplicate exports
export type {
  ProcessCache,
  ProcessMonitor,
  ProcessMonitorOptions,
  ProcessService,
  ProcessServiceOptions,
  ProcessServiceEvents,
  ProcessMonitorFactory
} from './types';

export function createProcessService(
  options: ProcessServiceOptions
): ProcessServiceImpl {
  return new ProcessServiceImpl(options);
}
