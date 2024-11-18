import { ProcessServiceImpl } from './process-service';
import type { ProcessServiceOptions } from './types';
import type { Server } from 'socket.io';
import type { ServerToClientEvents, ClientToServerEvents, InterServerEvents } from '../../../types/socket-events';

// Export types but avoid duplicate exports
export type {
  ProcessCache,
  ProcessMonitor,
  ProcessMonitorOptions,
  ProcessServiceOptions,
  ProcessServiceEvents,
  ProcessMonitorFactory
} from './types';

export { ProcessServiceImpl as ProcessService };

export function createProcessService(
  io: Server<ClientToServerEvents, ServerToClientEvents, InterServerEvents>,
  options: ProcessServiceOptions
): ProcessServiceImpl {
  return new ProcessServiceImpl(io, options);
}
