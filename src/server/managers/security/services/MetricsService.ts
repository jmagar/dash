import { Counter, Gauge, Histogram } from 'prom-client';
import type { MetricsManager } from '../../MetricsManager';
import type { LoggingManager } from '../../LoggingManager';

export class SecurityMetricsService {
  private authAttempts: Counter;
  private activeTokens: Gauge;
  private authLatency: Histogram;
  private failedLogins: Counter;
  private blockedAttempts: Counter;
  private passwordResetAttempts: Counter;

  constructor(
    private readonly metricsManager: MetricsManager,
    private readonly loggingManager: LoggingManager
  ) {
    this.initializeMetrics();
  }

  private initializeMetrics(): void {
    this.authAttempts = new Counter({
      name: 'security_auth_attempts_total',
      help: 'Total number of authentication attempts',
      labelNames: ['success']
    });

    this.activeTokens = new Gauge({
      name: 'security_active_tokens',
      help: 'Number of currently active JWT tokens'
    });

    this.authLatency = new Histogram({
      name: 'security_auth_latency_seconds',
      help: 'Authentication request latency in seconds',
      buckets: [0.1, 0.5, 1, 2, 5]
    });

    this.failedLogins = new Counter({
      name: 'security_failed_logins_total',
      help: 'Total number of failed login attempts'
    });

    this.blockedAttempts = new Counter({
      name: 'security_blocked_attempts_total',
      help: 'Total number of blocked authentication attempts'
    });

    this.passwordResetAttempts = new Counter({
      name: 'security_password_reset_attempts_total',
      help: 'Total number of password reset attempts'
    });
  }

  recordAuthAttempt(success: boolean): void {
    this.authAttempts.inc({ success: success.toString() });
  }

  recordTokenCreation(): void {
    this.activeTokens.inc();
  }

  recordTokenDeletion(): void {
    this.activeTokens.dec();
  }

  recordAuthLatency(durationMs: number): void {
    this.authLatency.observe(durationMs / 1000);
  }

  recordFailedLogin(): void {
    this.failedLogins.inc();
  }

  recordBlockedAttempt(): void {
    this.blockedAttempts.inc();
  }

  recordPasswordResetAttempt(): void {
    this.passwordResetAttempts.inc();
  }

  async getMetrics(): Promise<Record<string, number>> {
    return {
      authAttempts: await this.authAttempts.get(),
      activeTokens: await this.activeTokens.get(),
      failedLogins: await this.failedLogins.get(),
      blockedAttempts: await this.blockedAttempts.get(),
      passwordResetAttempts: await this.passwordResetAttempts.get()
    };
  }
}
