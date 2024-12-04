import { Request, Response, NextFunction } from 'express';
import { sign, verify } from 'jsonwebtoken';
import { hash, compare, genSalt } from 'bcrypt';
import { z } from 'zod';
import { Counter, Gauge, Histogram } from 'prom-client';
import { BaseService } from './base/BaseService';
import { MetricsManager } from './MetricsManager';
import { ConfigManager } from './ConfigManager';
import { StateManager } from './StateManager';
import { LoggingManager } from './LoggingManager';
import { ServiceHealth, ServiceStatus } from './base/types';
import { createHash, randomBytes } from 'crypto';
import ms from 'ms';

// Enhanced Zod schemas with more detailed validation
const SecurityConfigSchema = z.object({
  jwtSecret: z.string().min(32, "JWT secret must be at least 32 characters"),
  jwtExpiresIn: z.string().default('1h'),
  bcryptSaltRounds: z.number().min(10).max(15).default(12),
  rateLimitWindowMs: z.number().positive().default(900000), // 15 minutes
  rateLimitMaxRequests: z.number().positive().default(100),
  passwordMinLength: z.number().min(8).max(128).default(12),
  passwordRequireSpecial: z.boolean().default(true),
  passwordRequireMixedCase: z.boolean().default(true),
  passwordRequireNumber: z.boolean().default(true),
  maxLoginAttempts: z.number().min(3).max(10).default(5),
  lockoutDurationMs: z.number().positive().default(900000), // 15 minutes
  twoFactorEnabled: z.boolean().default(false),
  passwordResetTokenExpiry: z.number().positive().default(3600000), // 1 hour
});

// Dependency Injection Interface
export interface SecurityManagerDependencies {
  configManager?: ConfigManager;
  metricsManager?: MetricsManager;
  stateManager?: StateManager;
  loggingManager?: LoggingManager;
}

type SecurityConfig = z.infer<typeof SecurityConfigSchema>;

interface TokenPayload {
  userId: string;
  role: string;
  permissions: string[];
  exp: number;
}

interface UserSession {
  userId: string;
  expiresAt: number;
  role: string;
  permissions: string[];
}

interface LoginAttempt {
  count: number;
  lastAttempt: number;
  lockedUntil?: number;
}

export class SecurityManager extends BaseService {
  private static instance: SecurityManager;
  private config: SecurityConfig;
  private metricsManager: MetricsManager;
  private configManager: ConfigManager;
  private stateManager: StateManager;
  private logger: LoggingManager;
  
  // Metrics
  private authAttempts: Counter;
  private activeTokens: Gauge;
  private authLatency: Histogram;
  private failedLogins: Counter;
  private blockedAttempts: Counter;
  private passwordResetAttempts: Counter;
  
  // State Management
  private activeSessions: Map<string, UserSession>;
  private loginAttempts: Map<string, LoginAttempt>;
  private blockedIPs: Map<string, number>;
  private passwordResetTokens: Map<string, { userId: string; expiresAt: number }>;

  private constructor(private dependencies?: SecurityManagerDependencies) {
    super({
      name: 'SecurityManager',
      version: '1.0.0',
      dependencies: ['MetricsManager', 'ConfigManager', 'StateManager', 'LoggingManager']
    });

    this.initializeMetrics();
    this.initializeState();
  }

  public static getInstance(dependencies?: SecurityManagerDependencies): SecurityManager {
    if (!SecurityManager.instance) {
      SecurityManager.instance = new SecurityManager(dependencies);
    }
    return SecurityManager.instance;
  }

  async init(): Promise<void> {
    // Use injected dependencies or fallback to singleton instances
    this.logger = this.dependencies?.loggingManager ?? LoggingManager.getInstance();
    this.metricsManager = this.dependencies?.metricsManager ?? MetricsManager.getInstance();
    this.configManager = this.dependencies?.configManager ?? ConfigManager.getInstance();
    this.stateManager = this.dependencies?.stateManager ?? StateManager.getInstance();

    // Load and validate config
    const rawConfig = await this.configManager.getConfig('security');
    this.config = SecurityConfigSchema.parse({
      jwtSecret: process.env.JWT_SECRET || this.generateSecureSecret(),
      jwtExpiresIn: process.env.JWT_EXPIRES_IN || '1h',
      ...rawConfig
    });

    this.logger.info('SecurityManager initialized with enhanced security config', { 
      rateLimitWindow: this.config.rateLimitWindowMs,
      maxRequests: this.config.rateLimitMaxRequests,
      twoFactorEnabled: this.config.twoFactorEnabled
    });
  }

  private generateSecureSecret(): string {
    return randomBytes(64).toString('hex');
  }

  private initializeMetrics(): void {
    const metrics = this.metricsManager;
    
    this.authAttempts = metrics.createCounter({
      name: 'security_auth_attempts_total',
      help: 'Total number of authentication attempts',
      labelNames: ['status', 'method']
    });

    this.activeTokens = metrics.createGauge({
      name: 'security_active_tokens',
      help: 'Number of currently active JWT tokens',
      labelNames: ['role']
    });

    this.authLatency = metrics.createHistogram({
      name: 'security_auth_latency_seconds',
      help: 'Authentication operation latency in seconds',
      labelNames: ['method'],
      buckets: [0.1, 0.5, 1, 2, 5]
    });

    this.failedLogins = metrics.createCounter({
      name: 'security_failed_logins_total',
      help: 'Total number of failed login attempts',
      labelNames: ['reason']
    });

    this.blockedAttempts = metrics.createCounter({
      name: 'security_blocked_attempts_total',
      help: 'Total number of blocked authentication attempts',
      labelNames: ['type']
    });

    this.passwordResetAttempts = metrics.createCounter({
      name: 'security_password_reset_attempts_total',
      help: 'Total number of password reset attempts',
      labelNames: ['status']
    });
  }

  private initializeState(): void {
    this.activeSessions = new Map();
    this.loginAttempts = new Map();
    this.blockedIPs = new Map();
    this.passwordResetTokens = new Map();
  }

  async getHealth(): Promise<ServiceHealth> {
    const activeSessionCount = this.activeSessions.size;
    const blockedIPCount = this.blockedIPs.size;

    return {
      status: ServiceStatus.HEALTHY,
      version: this.version,
      details: {
        activeSessions: activeSessionCount,
        blockedIPs: blockedIPCount,
        metrics: {
          authAttempts: await this.authAttempts.get(),
          activeTokens: await this.activeTokens.get(),
          failedLogins: await this.failedLogins.get(),
          blockedAttempts: await this.blockedAttempts.get(),
          passwordResetAttempts: await this.passwordResetAttempts.get()
        },
        configuration: {
          twoFactorEnabled: this.config.twoFactorEnabled,
          rateLimitMaxRequests: this.config.rateLimitMaxRequests
        }
      }
    };
  }

  async cleanup(): Promise<void> {
    const now = Date.now();

    // Cleanup expired sessions
    for (const [token, session] of this.activeSessions.entries()) {
      if (session.expiresAt < now) {
        this.activeSessions.delete(token);
        this.activeTokens.dec({ role: session.role });
      }
    }

    // Cleanup expired IP blocks
    for (const [ip, unblockTime] of this.blockedIPs.entries()) {
      if (unblockTime < now) {
        this.blockedIPs.delete(ip);
      }
    }

    // Cleanup old login attempts
    for (const [ip, attempts] of this.loginAttempts.entries()) {
      if (attempts.lastAttempt + this.config.lockoutDurationMs < now) {
        this.loginAttempts.delete(ip);
      }
    }

    // Cleanup expired password reset tokens
    for (const [token, details] of this.passwordResetTokens.entries()) {
      if (details.expiresAt < now) {
        this.passwordResetTokens.delete(token);
      }
    }

    this.logger.info('SecurityManager cleanup completed', {
      activeSessions: this.activeSessions.size,
      blockedIPs: this.blockedIPs.size,
      passwordResetTokens: this.passwordResetTokens.size
    });
  }

  async generateToken(userId: string, role: string, permissions: string[]): Promise<string> {
    const startTime = process.hrtime();

    const token = sign(
      { userId, role, permissions },
      this.config.jwtSecret,
      { expiresIn: this.config.jwtExpiresIn }
    );

    const expiresAt = Date.now() + ms(this.config.jwtExpiresIn);
    this.activeSessions.set(token, { userId, expiresAt, role, permissions });
    this.activeTokens.inc({ role });

    const [seconds, nanoseconds] = process.hrtime(startTime);
    this.authLatency.observe({ method: 'token_generation' }, seconds + nanoseconds / 1e9);

    this.logger.info('Token generated', { 
      userId, 
      role, 
      expiresAt: new Date(expiresAt).toISOString() 
    });

    return token;
  }

  async validateToken(token: string): Promise<TokenPayload | null> {
    try {
      const payload = verify(token, this.config.jwtSecret) as TokenPayload;
      
      // Additional validation
      const session = this.activeSessions.get(token);
      if (!session || session.expiresAt < Date.now()) {
        return null;
      }

      return payload;
    } catch (error) {
      this.logger.warn('Token validation failed', { error });
      return null;
    }
  }

  async hashPassword(password: string): Promise<string> {
    // Validate password strength
    this.validatePasswordStrength(password);

    const salt = await genSalt(this.config.bcryptSaltRounds);
    return hash(password, salt);
  }

  private validatePasswordStrength(password: string): void {
    if (password.length < this.config.passwordMinLength) {
      throw new Error(`Password must be at least ${this.config.passwordMinLength} characters`);
    }

    if (this.config.passwordRequireSpecial && !/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
      throw new Error('Password must contain at least one special character');
    }

    if (this.config.passwordRequireMixedCase && 
        (!/[A-Z]/.test(password) || !/[a-z]/.test(password))) {
      throw new Error('Password must contain both uppercase and lowercase letters');
    }

    if (this.config.passwordRequireNumber && !/[0-9]/.test(password)) {
      throw new Error('Password must contain at least one number');
    }
  }

  async comparePassword(plainPassword: string, hashedPassword: string): Promise<boolean> {
    return compare(plainPassword, hashedPassword);
  }

  async generatePasswordResetToken(userId: string): Promise<string> {
    const token = randomBytes(32).toString('hex');
    const expiresAt = Date.now() + this.config.passwordResetTokenExpiry;

    this.passwordResetTokens.set(token, { userId, expiresAt });
    this.passwordResetAttempts.inc({ status: 'generated' });

    this.logger.info('Password reset token generated', { 
      userId, 
      expiresAt: new Date(expiresAt).toISOString() 
    });

    return token;
  }

  async validatePasswordResetToken(token: string): Promise<string | null> {
    const tokenDetails = this.passwordResetTokens.get(token);
    
    if (!tokenDetails || tokenDetails.expiresAt < Date.now()) {
      this.passwordResetAttempts.inc({ status: 'invalid' });
      return null;
    }

    return tokenDetails.userId;
  }

  async invalidatePasswordResetToken(token: string): Promise<void> {
    this.passwordResetTokens.delete(token);
  }

  // Rate limiting and brute force protection
  async recordLoginAttempt(ip: string): Promise<boolean> {
    const now = Date.now();
    const attempt = this.loginAttempts.get(ip) || { count: 0, lastAttempt: now };

    // Check if IP is currently blocked
    const blockedUntil = this.blockedIPs.get(ip);
    if (blockedUntil && blockedUntil > now) {
      this.blockedAttempts.inc({ type: 'ip_blocked' });
      return false;
    }

    // Reset count if outside the rate limit window
    if (now - attempt.lastAttempt > this.config.rateLimitWindowMs) {
      attempt.count = 0;
    }

    attempt.count++;
    attempt.lastAttempt = now;

    // Block IP if max attempts exceeded
    if (attempt.count >= this.config.maxLoginAttempts) {
      const blockUntil = now + this.config.lockoutDurationMs;
      this.blockedIPs.set(ip, blockUntil);
      this.blockedAttempts.inc({ type: 'max_attempts' });
      
      this.logger.warn('IP blocked due to excessive login attempts', { 
        ip, 
        blockUntil: new Date(blockUntil).toISOString() 
      });

      return false;
    }

    this.loginAttempts.set(ip, attempt);
    return true;
  }
}

export default SecurityManager.getInstance();
