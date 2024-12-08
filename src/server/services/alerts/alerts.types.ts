import type {
  Alert,
  AlertRule,
  AlertCondition,
  AlertSeverity,
  AlertStatus,
  AlertCategory,
  DEFAULT_ALERT_RULES,
} from '../../../types/metrics-alerts';
import type { SystemMetrics, ProcessMetrics } from '../../../types/metrics.types';

export type {
  Alert,
  AlertRule,
  AlertCondition,
  AlertSeverity,
  AlertStatus,
  AlertCategory,
  DEFAULT_ALERT_RULES,
  SystemMetrics,
  ProcessMetrics,
};

export interface AlertCreationOptions extends Omit<Alert, 'id' | 'createdAt' | 'updatedAt'> {
  hostId: string;
  ruleId: string;
  category: AlertCategory;
  severity: AlertSeverity;
  status: AlertStatus;
  title: string;
  message: string;
  source: string;
  metadata?: Record<string, unknown>;
}

export interface AlertHistoryOptions {
  hostId: string;
  startTime: Date;
  endTime: Date;
}
