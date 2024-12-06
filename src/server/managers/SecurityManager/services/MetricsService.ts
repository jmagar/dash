import { Counter, Gauge } from 'prom-client';
import type { AuthMetrics } from '../types/auth.types';

export class MetricsService {
  private readonly metrics: {
    authAttempts: Counter;
    activeTokens: Gauge;
    failedLogins: Counter;
    blockedAttempts: Counter;
    passwordResetAttempts: Counter;
  };

  constructor() {
    this.metrics = {
      authAttempts: new Counter({
        name: 'security_auth_attempts_total',
        help: 'Total number of authentication attempts'
      }),
      activeTokens: new Gauge({
        name: 'security_active_tokens',
        help: 'Number of currently active tokens'
      }),
      failedLogins: new Counter({
        name: 'security_failed_logins_total',
        help: 'Total number of failed login attempts'
      }),
      blockedAttempts: new Counter({
        name: 'security_blocked_attempts_total',
        help: 'Total number of blocked authentication attempts'
      }),
      passwordResetAttempts: new Counter({
        name: 'security_password_reset_attempts_total',
        help: 'Total number of password reset attempts'
      })
    };
  }

  recordAuthAttempt(): void {
    this.metrics.authAttempts.inc();
  }

  updateActiveTokens(count: number): void {
    this.metrics.activeTokens.set(count);
  }

  recordFailedLogin(): void {
    this.metrics.failedLogins.inc();
  }

  recordBlockedAttempt(): void {
    this.metrics.blockedAttempts.inc();
  }

  recordPasswordResetAttempt(): void {
    this.metrics.passwordResetAttempts.inc();
  }

  getMetrics(): AuthMetrics {
    return {
      authAttempts: this.metrics.authAttempts.get(),
      activeTokens: this.metrics.activeTokens.get(),
      failedLogins: this.metrics.failedLogins.get(),
      blockedAttempts: this.metrics.blockedAttempts.get(),
      passwordResetAttempts: this.metrics.passwordResetAttempts.get()
    };
  }
}
