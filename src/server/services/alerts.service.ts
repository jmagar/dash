import { EventEmitter } from 'events';
import { db } from '../db';
import { LoggingManager } from '../utils/logging/LoggingManager';
import { notificationsService } from './notifications.service';
import { metricsStorageService } from './metrics-storage.service';
import type {
  Alert,
  AlertRule,
  AlertCondition,
  AlertSeverity,
  AlertStatus,
  AlertCategory,
  DEFAULT_ALERT_RULES,
} from '../../types/metrics-alerts';
import type { SystemMetrics, ProcessMetrics } from '../../types/metrics.types';

class AlertsService extends EventEmitter {
  private readonly CLEANUP_INTERVAL = 24 * 60 * 60 * 1000; // 24 hours

  constructor() {
    super();
    setInterval(() => this.cleanup(), this.CLEANUP_INTERVAL);
  }

  /**
   * Create a new alert
   */
  async createAlert(alert: Omit<Alert, 'id' | 'createdAt' | 'updatedAt'>): Promise<Alert> {
    try {
      const result = await db.query<Alert>(
        `INSERT INTO alerts (
          host_id,
          category,
          severity,
          status,
          title,
          message,
          source,
          metric,
          value,
          threshold,
          metadata
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
        RETURNING *`,
        [
          alert.hostId,
          alert.category,
          alert.severity,
          'active',
          alert.title,
          alert.message,
          alert.source,
          alert.metric,
          alert.value,
          alert.threshold,
          alert.metadata,
        ]
      );

      const created = result.rows[0];

      // Create notification for the alert
      await notificationsService.createNotification(
        alert.hostId,
        'alert',
        alert.title,
        alert.message,
        {
          alert: created,
          metadata: alert.metadata,
        }
      );

      this.emit('alert:created', created);
      return created;
    } catch (error) {
      LoggingManager.getInstance().error('Failed to create alert:', {
        error: error instanceof Error ? error.message : 'Unknown error',
        alert,
      });
      throw error;
    }
  }

  /**
   * Get active alerts for a host
   */
  async getActiveAlerts(hostId: string): Promise<Alert[]> {
    try {
      const result = await db.query<Alert>(
        `SELECT * FROM alerts
        WHERE host_id = $1
        AND status = 'active'
        ORDER BY created_at DESC`,
        [hostId]
      );

      return result.rows;
    } catch (error) {
      LoggingManager.getInstance().error('Failed to get active alerts:', {
        error: error instanceof Error ? error.message : 'Unknown error',
        hostId,
      });
      throw error;
    }
  }

  /**
   * Get alert history for a host
   */
  async getAlertHistory(
    hostId: string,
    startTime: Date,
    endTime: Date
  ): Promise<Alert[]> {
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
      LoggingManager.getInstance().error('Failed to get alert history:', {
        error: error instanceof Error ? error.message : 'Unknown error',
        hostId,
      });
      throw error;
    }
  }

  /**
   * Acknowledge an alert
   */
  async acknowledgeAlert(alertId: string, userId: string): Promise<Alert> {
    try {
      const result = await db.query<Alert>(
        `UPDATE alerts
        SET status = 'acknowledged',
        acknowledged_at = NOW(),
        acknowledged_by = $2,
        updated_at = NOW()
        WHERE id = $1
        RETURNING *`,
        [alertId, userId]
      );

      if (result.rows.length === 0) {
        throw new Error(`Alert ${alertId} not found`);
      }

      const updated = result.rows[0];
      this.emit('alert:acknowledged', updated);
      return updated;
    } catch (error) {
      LoggingManager.getInstance().error('Failed to acknowledge alert:', {
        error: error instanceof Error ? error.message : 'Unknown error',
        alertId,
        userId,
      });
      throw error;
    }
  }

  /**
   * Resolve an alert
   */
  async resolveAlert(alertId: string, userId: string): Promise<Alert> {
    try {
      const result = await db.query<Alert>(
        `UPDATE alerts
        SET status = 'resolved',
        resolved_at = NOW(),
        resolved_by = $2,
        updated_at = NOW()
        WHERE id = $1
        RETURNING *`,
        [alertId, userId]
      );

      if (result.rows.length === 0) {
        throw new Error(`Alert ${alertId} not found`);
      }

      const updated = result.rows[0];
      this.emit('alert:resolved', updated);
      return updated;
    } catch (error) {
      LoggingManager.getInstance().error('Failed to resolve alert:', {
        error: error instanceof Error ? error.message : 'Unknown error',
        alertId,
        userId,
      });
      throw error;
    }
  }

  /**
   * Create or update alert rules for a host
   */
  async upsertAlertRules(hostId: string, rules: Omit<AlertRule, 'id'>[]): Promise<AlertRule[]> {
    try {
      const values = rules.map(rule => [
        hostId,
        rule.name,
        rule.enabled,
        rule.category,
        rule.severity,
        rule.conditions,
        rule.actions,
        rule.cooldown,
        rule.metadata,
      ]);

      const result = await db.query<AlertRule>(
        `INSERT INTO alert_rules (
          host_id,
          name,
          enabled,
          category,
          severity,
          conditions,
          actions,
          cooldown,
          metadata
        )
        VALUES ${values.map((_, i) => `($${i * 9 + 1}, $${i * 9 + 2}, $${i * 9 + 3}, $${i * 9 + 4}, $${i * 9 + 5}, $${i * 9 + 6}, $${i * 9 + 7}, $${i * 9 + 8}, $${i * 9 + 9})`).join(',')}
        ON CONFLICT (host_id, name)
        DO UPDATE SET
          enabled = EXCLUDED.enabled,
          category = EXCLUDED.category,
          severity = EXCLUDED.severity,
          conditions = EXCLUDED.conditions,
          actions = EXCLUDED.actions,
          cooldown = EXCLUDED.cooldown,
          metadata = EXCLUDED.metadata,
          updated_at = NOW()
        RETURNING *`,
        values.flat()
      );

      return result.rows;
    } catch (error) {
      LoggingManager.getInstance().error('Failed to upsert alert rules:', {
        error: error instanceof Error ? error.message : 'Unknown error',
        hostId,
      });
      throw error;
    }
  }

  /**
   * Get alert rules for a host
   */
  async getAlertRules(hostId: string): Promise<AlertRule[]> {
    try {
      const result = await db.query<AlertRule>(
        'SELECT * FROM alert_rules WHERE host_id = $1',
        [hostId]
      );

      return result.rows;
    } catch (error) {
      LoggingManager.getInstance().error('Failed to get alert rules:', {
        error: error instanceof Error ? error.message : 'Unknown error',
        hostId,
      });
      throw error;
    }
  }

  /**
   * Check metrics against alert rules
   */
  async checkMetrics(hostId: string, metrics: SystemMetrics, processes: ProcessMetrics[]): Promise<void> {
    try {
      const rules = await this.getAlertRules(hostId);
      const activeAlerts = await this.getActiveAlerts(hostId);

      for (const rule of rules) {
        if (!rule.enabled) continue;

        // Skip if in cooldown
        if (rule.lastTriggered && 
            (Date.now() - rule.lastTriggered.getTime()) < rule.cooldown * 1000) {
          continue;
        }

        // Check if all conditions are met
        const allConditionsMet = rule.conditions.every(condition => {
          const value = this.getMetricValue(metrics, processes, condition.metric);
          return this.evaluateCondition(condition, value);
        });

        if (allConditionsMet) {
          // Check if there's already an active alert for this rule
          const existingAlert = activeAlerts.find(
            alert => alert.source === `rule:${rule.id}`
          );

          if (!existingAlert) {
            await this.createAlert({
              hostId,
              category: rule.category,
              severity: rule.severity,
              status: 'active',
              title: rule.name,
              message: this.generateAlertMessage(rule, metrics, processes),
              source: `rule:${rule.id}`,
              metadata: rule.metadata,
            });

            // Update last triggered timestamp
            await db.query(
              'UPDATE alert_rules SET last_triggered = NOW() WHERE id = $1',
              [rule.id]
            );
          }
        }
      }
    } catch (error) {
      LoggingManager.getInstance().error('Failed to check metrics:', {
        error: error instanceof Error ? error.message : 'Unknown error',
        hostId,
      });
    }
  }

  /**
   * Get metric value from system or process metrics
   */
  private getMetricValue(
    metrics: SystemMetrics,
    processes: ProcessMetrics[],
    metricPath: string
  ): number {
    const parts = metricPath.split('.');
    let value: any = metrics;

    // Special handling for process metrics
    if (parts[0] === 'process') {
      const [, pid, field] = parts;
      const process = processes.find(p => p.pid === parseInt(pid, 10));
      if (!process) return 0;
      value = process;
      parts.shift();
      parts.shift();
    }

    for (const part of parts) {
      value = value[part];
      if (value === undefined) return 0;
    }

    return typeof value === 'number' ? value : 0;
  }

  /**
   * Evaluate a condition against a value
   */
  private evaluateCondition(condition: AlertCondition, value: number): boolean {
    switch (condition.operator) {
      case 'gt':
        return value > condition.value;
      case 'lt':
        return value < condition.value;
      case 'eq':
        return value === condition.value;
      case 'neq':
        return value !== condition.value;
      case 'gte':
        return value >= condition.value;
      case 'lte':
        return value <= condition.value;
      default:
        return false;
    }
  }

  /**
   * Generate alert message from rule and metrics
   */
  private generateAlertMessage(
    rule: AlertRule,
    metrics: SystemMetrics,
    processes: ProcessMetrics[]
  ): string {
    const conditions = rule.conditions.map(condition => {
      const value = this.getMetricValue(metrics, processes, condition.metric);
      return `${condition.metric} is ${value} ${condition.operator} ${condition.value}`;
    });

    return `Alert triggered: ${rule.name}\nConditions:\n${conditions.join('\n')}`;
  }

  /**
   * Clean up old resolved alerts
   */
  private async cleanup(): Promise<void> {
    try {
      await db.query(
        `DELETE FROM alerts
        WHERE status = 'resolved'
        AND resolved_at < NOW() - INTERVAL '30 days'`
      );
    } catch (error) {
      LoggingManager.getInstance().error('Failed to clean up old alerts:', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }
}

export const alertsService = new AlertsService();

