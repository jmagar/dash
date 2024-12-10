import { EventEmitter } from 'events';
import { SystemMetrics } from '../../../../types/metrics.types';
import { LoggingManager } from '../../../managers/LoggingManager';

export class MetricsService extends EventEmitter {
  private readonly metrics = new Map<string, SystemMetrics>();
  private readonly logger = LoggingManager.getInstance();

  public updateMetrics(agentId: string, metrics: SystemMetrics): void {
    this.metrics.set(agentId, metrics);
    this.emit('metrics:updated', { agentId, metrics });
  }

  public getMetricsForAgent(agentId: string): SystemMetrics | undefined {
    return this.metrics.get(agentId);
  }

  public clearMetrics(agentId: string): void {
    this.metrics.delete(agentId);
    this.emit('metrics:cleared', { agentId });
  }
}


