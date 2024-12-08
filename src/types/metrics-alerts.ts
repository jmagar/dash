// Re-export types from metrics.types
export type { SystemMetrics, ProcessMetrics } from './metrics.types';

export type AlertSeverity = 'info' | 'warning' | 'error' | 'critical';
export type AlertStatus = 'active' | 'resolved' | 'acknowledged';
export type AlertCategory = 'system' | 'process' | 'network' | 'storage' | 'security';

export interface Alert {
  id: string;
  hostId: string;
  category: AlertCategory;
  severity: AlertSeverity;
  status: AlertStatus;
  title: string;
  message: string;
  source: string;
  ruleId?: string;
  metric?: string;
  value?: number;
  threshold?: number;
  metadata?: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
  acknowledgedAt?: Date;
  acknowledgedBy?: string;
  resolvedAt?: Date;
  resolvedBy?: string;
}

export interface AlertRule {
  id: string;
  hostId: string;
  name: string;
  enabled: boolean;
  category: AlertCategory;
  severity: AlertSeverity;
  conditions: AlertCondition[];
  actions: AlertAction[];
  cooldown: number; // seconds
  lastTriggered?: Date;
  metadata?: Record<string, unknown>;
}

export interface AlertCondition {
  metric: string;
  operator: 'gt' | 'lt' | 'eq' | 'neq' | 'gte' | 'lte';
  value: number;
  duration?: number; // seconds to persist before triggering
}

export interface AlertAction {
  type: 'email' | 'webhook' | 'slack' | 'notification';
  config: {
    recipients?: string[];
    url?: string;
    channel?: string;
    template?: string;
  };
}

// Default thresholds for system metrics
export const DEFAULT_ALERT_THRESHOLDS = {
  system: {
    cpu: {
      warning: 80,
      critical: 90,
    },
    memory: {
      warning: 80,
      critical: 90,
    },
    storage: {
      warning: 80,
      critical: 90,
    },
    load: {
      warning: 'cores * 1',
      critical: 'cores * 2',
    },
  },
  process: {
    cpu: {
      warning: 50,
      critical: 80,
    },
    memory: {
      warning: 30,
      critical: 50,
    },
  },
  network: {
    errors: {
      warning: 100,
      critical: 1000,
    },
    drops: {
      warning: 100,
      critical: 1000,
    },
  },
} as const;

// Default alert rules
export const DEFAULT_ALERT_RULES: Omit<AlertRule, 'id' | 'hostId'>[] = [
  {
    name: 'High CPU Usage',
    enabled: true,
    category: 'system',
    severity: 'warning',
    conditions: [
      {
        metric: 'cpu.total',
        operator: 'gte',
        value: DEFAULT_ALERT_THRESHOLDS.system.cpu.warning,
        duration: 300, // 5 minutes
      },
    ],
    actions: [
      {
        type: 'notification',
        config: {},
      },
    ],
    cooldown: 3600, // 1 hour
  },
  {
    name: 'Critical CPU Usage',
    enabled: true,
    category: 'system',
    severity: 'critical',
    conditions: [
      {
        metric: 'cpu.total',
        operator: 'gte',
        value: DEFAULT_ALERT_THRESHOLDS.system.cpu.critical,
        duration: 300,
      },
    ],
    actions: [
      {
        type: 'notification',
        config: {},
      },
      {
        type: 'email',
        config: {},
      },
    ],
    cooldown: 1800, // 30 minutes
  },
  {
    name: 'High Memory Usage',
    enabled: true,
    category: 'system',
    severity: 'warning',
    conditions: [
      {
        metric: 'memory.usage',
        operator: 'gte',
        value: DEFAULT_ALERT_THRESHOLDS.system.memory.warning,
        duration: 300,
      },
    ],
    actions: [
      {
        type: 'notification',
        config: {},
      },
    ],
    cooldown: 3600,
  },
  {
    name: 'Critical Memory Usage',
    enabled: true,
    category: 'system',
    severity: 'critical',
    conditions: [
      {
        metric: 'memory.usage',
        operator: 'gte',
        value: DEFAULT_ALERT_THRESHOLDS.system.memory.critical,
        duration: 300,
      },
    ],
    actions: [
      {
        type: 'notification',
        config: {},
      },
      {
        type: 'email',
        config: {},
      },
    ],
    cooldown: 1800,
  },
  {
    name: 'High Storage Usage',
    enabled: true,
    category: 'storage',
    severity: 'warning',
    conditions: [
      {
        metric: 'storage.usage',
        operator: 'gte',
        value: DEFAULT_ALERT_THRESHOLDS.system.storage.warning,
        duration: 300,
      },
    ],
    actions: [
      {
        type: 'notification',
        config: {},
      },
    ],
    cooldown: 3600,
  },
  {
    name: 'Critical Storage Usage',
    enabled: true,
    category: 'storage',
    severity: 'critical',
    conditions: [
      {
        metric: 'storage.usage',
        operator: 'gte',
        value: DEFAULT_ALERT_THRESHOLDS.system.storage.critical,
        duration: 300,
      },
    ],
    actions: [
      {
        type: 'notification',
        config: {},
      },
      {
        type: 'email',
        config: {},
      },
    ],
    cooldown: 1800,
  },
  {
    name: 'High Network Errors',
    enabled: true,
    category: 'network',
    severity: 'warning',
    conditions: [
      {
        metric: 'network.errorsIn',
        operator: 'gte',
        value: DEFAULT_ALERT_THRESHOLDS.network.errors.warning,
        duration: 300,
      },
      {
        metric: 'network.errorsOut',
        operator: 'gte',
        value: DEFAULT_ALERT_THRESHOLDS.network.errors.warning,
        duration: 300,
      },
    ],
    actions: [
      {
        type: 'notification',
        config: {},
      },
    ],
    cooldown: 3600,
  },
];
