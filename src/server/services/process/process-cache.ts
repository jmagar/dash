import type { ProcessInfo } from '../../../types/metrics';
import type { ProcessCache } from './types';

export class ProcessCacheImpl implements ProcessCache {
  private cache: Map<string, Map<number, ProcessInfo>> = new Map();

  get(hostId: string): Map<number, ProcessInfo> | undefined {
    return this.cache.get(hostId);
  }

  set(hostId: string, processes: Map<number, ProcessInfo>): void {
    this.cache.set(hostId, processes);
  }

  delete(hostId: string): void {
    this.cache.delete(hostId);
  }
}
