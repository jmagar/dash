import type { Server } from 'socket.io';
import { ProcessService } from './process-service';
import type { ProcessServiceOptions } from './types';

export * from './types';
export * from './process-parser';
export * from './process-monitor';
export * from './process-service';

export function createProcessService(io: Server, options: Omit<ProcessServiceOptions, 'io'> = {}): ProcessService {
  return new ProcessService({ io, ...options });
}
