import { SystemMetrics, ProcessMetrics } from '../../../types/metrics.types';
import { AlertRule, AlertCondition } from '../../../types/metrics-alerts';
import { LoggingManager } from '../../managers/LoggingManager';

export class MetricsService {
  private static instance: MetricsService;
  private logger = LoggingManager.getInstance();

  /**
   * Private constructor to enforce singleton pattern
   * @private
   */
  private constructor() {
    // Initialize service
    this.logger.debug('Initializing MetricsService');
  }

  public checkSystemMetrics(metrics: SystemMetrics): boolean {
    try {
      return this.evaluateMetrics(metrics);
    } catch (error) {
      this.logger.error('Error checking system metrics:', {
        error: error instanceof Error ? error.message : 'Unknown error',
        metrics
      });
      return false;
    }
  }

  public checkProcessMetrics(metrics: ProcessMetrics): boolean {
    try {
      return this.evaluateMetrics(metrics);
    } catch (error) {
      this.logger.error('Error checking process metrics:', {
        error: error instanceof Error ? error.message : 'Unknown error',
        metrics
      });
      return false;
    }
  }

  private evaluateMetrics(metrics: SystemMetrics | ProcessMetrics): boolean {
    // Implement basic health checks
    if ('cpu' in metrics) {
      const cpuMetrics = metrics.cpu;
      if (typeof cpuMetrics === 'object' && 'usage' in cpuMetrics) {
        const cpuUsage = cpuMetrics.usage;
        if (cpuUsage > 90) {
          this.logger.warn('High CPU usage detected', { usage: cpuUsage });
          return false;
        }
      }
    }

    if ('memory' in metrics) {
      const memoryMetrics = metrics.memory;
      if (typeof memoryMetrics === 'object' && 'usage' in memoryMetrics) {
        const memoryUsage = memoryMetrics.usage;
        if (memoryUsage > 90) {
          this.logger.warn('High memory usage detected', { usage: memoryUsage });
          return false;
        }
      }
    }

    return true;
  }

  public evaluateCondition(condition: AlertCondition, value: number): boolean {
    switch (condition.operator) {
      case 'gt':
        return value > condition.value;
      case 'lt':
        return value < condition.value;
      case 'gte':
        return value >= condition.value;
      case 'lte':
        return value <= condition.value;
      case 'eq':
        return value === condition.value;
      case 'neq':
        return value !== condition.value;
      default:
        this.logger.warn('Unknown operator:', { operator: condition.operator });
        return false;
    }
  }

  public evaluateRule(rule: AlertRule, metrics: Record<string, unknown>): boolean {
    try {
      const results = rule.conditions.map(condition => {
        const metricValue = this.getMetricValue(metrics, condition.metric);
        this.logger.debug('Evaluating metric:', {
          metric: condition.metric,
          operator: condition.operator,
          value: condition.value,
          currentValue: metricValue
        });
        return this.evaluateCondition(condition, metricValue);
      });

      this.logger.debug('Rule evaluation results:', {
        ruleName: rule.name,
        results: results.join(', ')
      });

      return results.every(r => r);
    } catch (error) {
      this.logger.error('Error evaluating rule:', {
        error: error instanceof Error ? error.message : 'Unknown error',
        rule
      });
      return false;
    }
  }

  public getMetricValue(metrics: Record<string, unknown>, path: string): number {
    const value = path.split('.').reduce<unknown>((obj: unknown, key: string) => {
      if (obj && typeof obj === 'object') {
        return (obj as Record<string, unknown>)[key];
      }
      return undefined;
    }, metrics);

    if (typeof value !== 'number') {
      throw new Error(`Invalid metric value for path: ${path}`);
    }
    return value;
  }

  public generateAlertMessage(rule: AlertRule, metrics: Record<string, unknown>): string {
    try {
      const conditions = rule.conditions.map(condition => {
        const value = this.getMetricValue(metrics, condition.metric);
        return `${condition.metric} is ${value} ${condition.operator} ${condition.value}`;
      });
      return `Alert triggered: ${rule.name}\nConditions:\n${conditions.join('\n')}`;
    } catch (error) {
      this.logger.error('Error generating alert message:', {
        error: error instanceof Error ? error.message : 'Unknown error',
        rule,
        metrics
      });
      return `Alert triggered: ${rule.name}`;
    }
  }

  public static getInstance(): MetricsService {
    if (!MetricsService.instance) {
      MetricsService.instance = new MetricsService();
    }
    return MetricsService.instance;
  }
}

export const metricsService = MetricsService.getInstance();
