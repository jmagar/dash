import { db } from '../../db';
import { LoggingManager } from '../../managers/LoggingManager';
import type { AlertRule } from './alerts.types';

export class AlertRulesService {
  private readonly logger = LoggingManager.getInstance();

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
        JSON.stringify(rule.conditions),
        JSON.stringify(rule.actions),
        rule.cooldown,
        JSON.stringify(rule.metadata || {}),
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

      return result.rows || [];
    } catch (error) {
      this.logger.error('Failed to upsert alert rules:', {
        error: error instanceof Error ? error.message : 'Unknown error',
        hostId,
        rules,
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
        `SELECT * FROM alert_rules
        WHERE host_id = $1
        AND enabled = true
        ORDER BY created_at ASC`,
        [hostId]
      );

      return result.rows || [];
    } catch (error) {
      this.logger.error('Failed to get alert rules:', {
        error: error instanceof Error ? error.message : 'Unknown error',
        hostId,
      });
      throw error;
    }
  }

  /**
   * Update rule's last triggered timestamp
   */
  async updateLastTriggered(ruleId: string): Promise<void> {
    try {
      await db.query(
        'UPDATE alert_rules SET last_triggered = NOW() WHERE id = $1',
        [ruleId]
      );
    } catch (error) {
      this.logger.error('Failed to update rule last triggered:', {
        error: error instanceof Error ? error.message : 'Unknown error',
        ruleId,
      });
      throw error;
    }
  }
}

export class RulesService {
  private static instance: RulesService;
  private readonly logger = LoggingManager.getInstance();
  private readonly alertRulesService = new AlertRulesService();

  /**
   * Private constructor to enforce singleton pattern
   * @private
   */
  private constructor() {
    // Initialize service
    this.logger.debug('Initializing RulesService');
  }

  public static getInstance(): RulesService {
    if (!RulesService.instance) {
      RulesService.instance = new RulesService();
    }
    return RulesService.instance;
  }

  /**
   * Get alert rules for a host
   */
  async getAlertRules(hostId: string): Promise<AlertRule[]> {
    return this.alertRulesService.getAlertRules(hostId);
  }

  /**
   * Update the last triggered timestamp for a rule
   */
  async updateLastTriggered(ruleId: string): Promise<void> {
    try {
      await db.query(
        `UPDATE alert_rules
        SET last_triggered = NOW()
        WHERE id = $1`,
        [ruleId]
      );
    } catch (error) {
      this.logger.error('Failed to update last triggered timestamp:', {
        error: error instanceof Error ? error.message : 'Unknown error',
        ruleId,
      });
      throw error;
    }
  }
}

export const alertRulesService = new AlertRulesService();
export default RulesService.getInstance();
