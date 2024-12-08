import { EventEmitter } from 'events';
import { db } from '../../db';
import { LoggingManager } from '../../managers/LoggingManager';
import { MetricsService } from './metrics.service';
import { RulesService } from './rules.service';
import { AlertNotificationService } from './notification.service';
import type { 
  Alert, 
  AlertCreationOptions,
  AlertHistoryOptions,
  SystemMetrics, 
  ProcessMetrics,
} from './alerts.types';

export class AlertsService extends EventEmitter {
  private readonly CLEANUP_INTERVAL = 24 * 60 * 60 * 1000; // 24 hours
  private readonly logger = LoggingManager.getInstance();
  private static instance: AlertsService;
  private readonly metricsService: MetricsService;
  private readonly rulesService: RulesService;
  private readonly notificationService: AlertNotificationService;

  private constructor() {
    super();
    this.metricsService = MetricsService.getInstance();
    this.rulesService = RulesService.getInstance();
    this.notificationService = AlertNotificationService.getInstance();

    // Set up cleanup interval
    setInterval(() => {
      void this.cleanupOldAlerts();
    }, this.CLEANUP_INTERVAL);
  }

  public static getInstance(): AlertsService {
    if (!AlertsService.instance) {
      AlertsService.instance = new AlertsService();
    }
    return AlertsService.instance;
  }

  /**
   * Get alert history for a host within a specific time range
   */
  async getAlertHistory({ hostId, startTime, endTime }: AlertHistoryOptions): Promise<Alert[]> {
    try {
      const result = await db.query<Alert>(
        `SELECT * FROM alerts
        WHERE host_id = $1
        AND created_at BETWEEN $2 AND $3
        ORDER BY created_at DESC`,
        [hostId, startTime, endTime]
      );

      return result.rows;
    } catch (error) {
      this.logger.error('Failed to get alert history:', {
        error: error instanceof Error ? error.message : 'Unknown error',
        hostId,
        startTime,
        endTime
      });
      throw error;
    }
  }

  async checkMetrics(hostId: string, metrics: SystemMetrics, processes: ProcessMetrics[]): Promise<void> {
    try {
      const rules = await this.rulesService.getAlertRules(hostId);
      const activeAlerts = await this.getActiveAlerts(hostId);

      for (const rule of rules) {
        // Skip disabled rules
        if (!rule.enabled) continue;

        // Check cooldown if set
        if (rule.lastTriggered && 
            Date.now() - rule.lastTriggered.getTime() < (rule.cooldown ?? 0)) {
          continue;
        }

        // Convert metrics to Record<string, unknown> safely
        const metricsRecord: Record<string, unknown> = {
          cpu: metrics.cpu,
          memory: metrics.memory,
          storage: metrics.storage,
          network: metrics.network,
          timestamp: metrics.timestamp,
        };

        // Check if all conditions are met
        const allConditionsMet = rule.conditions.every((condition) => {
          const value = this.metricsService.getMetricValue(metricsRecord, condition.metric);
          return this.metricsService.evaluateCondition(condition, value);
        });

        if (allConditionsMet) {
          // Check if alert already exists
          const existingAlert = activeAlerts.find(a => a.ruleId === rule.id);

          if (!existingAlert) {
            // Create new alert
            const alertOptions: AlertCreationOptions = {
              hostId,
              ruleId: rule.id,
              category: rule.category,
              severity: rule.severity,
              status: 'active',
              title: rule.name,
              message: this.metricsService.generateAlertMessage(rule, metricsRecord),
              source: `rule:${rule.id}`,
              metadata: rule.metadata,
            };
            await this.createAlert(alertOptions);

            // Update last triggered timestamp
            await this.rulesService.updateLastTriggered(rule.id);
          }
        }
      }
    } catch (error) {
      this.logger.error('Failed to check metrics:', {
        error: error instanceof Error ? error.message : 'Unknown error',
        hostId,
        metrics,
        processes
      });
    }
  }

  private async cleanupOldAlerts(): Promise<void> {
    try {
      await db.query(
        `DELETE FROM alerts
         WHERE status = 'resolved'
         AND created_at < NOW() - INTERVAL '30 days'`
      );
    } catch (error) {
      this.logger.error('Failed to cleanup old alerts:', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  async createAlert(alert: AlertCreationOptions): Promise<Alert> {
    try {
      const result = await db.query<Alert>(
        `INSERT INTO alerts (
          host_id,
          rule_id,
          category,
          severity,
          status,
          title,
          message,
          source,
          metadata
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        RETURNING *`,
        [
          alert.hostId,
          alert.ruleId,
          alert.category,
          alert.severity,
          'active',
          alert.title,
          alert.message,
          alert.source,
          alert.metadata,
        ]
      );

      if (!result.rows || result.rows.length === 0) {
        throw new Error('Failed to create alert: No rows returned');
      }

      const created = result.rows[0];
      if (!created) {
        throw new Error('Failed to create alert: No rows returned');
      }

      // Create notification for the alert
      await this.notificationService.createAlertNotification(created);

      this.emit('alert:created', created);
      return created;
    } catch (error) {
      this.logger.error('Failed to create alert:', {
        error: error instanceof Error ? error.message : 'Unknown error',
        alert,
      });
      throw error;
    }
  }

  async getActiveAlerts(hostId: string): Promise<Alert[]> {
    try {
      const result = await db.query<Alert>(
        `SELECT * FROM alerts
        WHERE host_id = $1
        AND status = 'active'
        ORDER BY created_at DESC`,
        [hostId]
      );

      return result.rows || [];
    } catch (error) {
      this.logger.error('Failed to get active alerts:', {
        error: error instanceof Error ? error.message : 'Unknown error',
        hostId,
      });
      throw error;
    }
  }
}
