import { Request, Response, NextFunction } from 'express';
import { sign, verify, JwtPayload } from 'jsonwebtoken';
import { hash, compare, genSalt } from 'bcrypt';
import { z } from 'zod';
import { Counter, Gauge, Histogram } from 'prom-client';
import { Injectable } from '@nestjs/common';

// Shared imports
import { VALIDATION_PATTERNS, VALIDATION_LIMITS, VALIDATION_MESSAGES } from '../../shared/validation/validation.config';
import { ApiResult } from '../../types/api-shared';
import { User } from '../../types/models-shared';

// Dependency Injection Interface
export interface SecurityManagerDependencies {
  configManager?: ConfigManager;
  metricsManager?: MetricsManager;
  loggingManager?: LoggingManager;
}

// Token Payload Type
interface TokenPayload extends JwtPayload {
  userId: string;
  role?: string;
}

@Injectable()
export class SecurityManager extends BaseService {
  private static instance: SecurityManager;
  
  // Dependency references
  private configManager: ConfigManager;
  private metricsManager: MetricsManager;
  private loggingManager: LoggingManager;

  private constructor() {
    // Private constructor to enforce singleton pattern
    super({
      name: 'SecurityManager',
      version: '1.0.0',
      dependencies: [
        'ConfigManager', 
        'MetricsManager', 
        'LoggingManager'
      ]
    });
  }

  public static getInstance(): SecurityManager {
    if (!SecurityManager.instance) {
      SecurityManager.instance = new SecurityManager();
    }
    return SecurityManager.instance;
  }

  // New initialization method to inject dependencies
  public initialize(deps: {
    configManager: ConfigManager;
    metricsManager: MetricsManager;
    loggingManager: LoggingManager;
  }): void {
    this.configManager = deps.configManager;
    this.metricsManager = deps.metricsManager;
    this.loggingManager = deps.loggingManager;
  }

  // Enhanced Security Configuration Schema with Shared Validation
  private static SecurityConfigSchema = z.object({
    jwtSecret: z.string()
      .min(VALIDATION_LIMITS.MIN_PASSWORD_LENGTH, { message: VALIDATION_MESSAGES.REQUIRED })
      .max(VALIDATION_LIMITS.MAX_PASSWORD_LENGTH),
    
    jwtExpiresIn: z.string().default('1h'),
    
    bcryptSaltRounds: z.number()
      .min(10, { message: 'Salt rounds must be at least 10' })
      .max(15, { message: 'Salt rounds must not exceed 15' })
      .default(12),
    
    rateLimitWindowMs: z.number()
      .positive({ message: 'Rate limit window must be positive' })
      .default(900000), // 15 minutes
    
    rateLimitMaxRequests: z.number()
      .positive({ message: 'Max requests must be positive' })
      .default(100),
    
    passwordPolicy: z.object({
      minLength: z.number()
        .min(VALIDATION_LIMITS.MIN_PASSWORD_LENGTH)
        .max(VALIDATION_LIMITS.MAX_PASSWORD_LENGTH)
        .default(VALIDATION_LIMITS.MIN_PASSWORD_LENGTH),
      
      requireSpecial: z.boolean().default(true),
      requireMixedCase: z.boolean().default(true),
      requireNumber: z.boolean().default(true)
    }).default({}),
    
    maxLoginAttempts: z.number()
      .min(3, { message: 'Minimum 3 login attempts' })
      .max(10, { message: 'Maximum 10 login attempts' })
      .default(5),
    
    lockoutDurationMs: z.number()
      .positive({ message: 'Lockout duration must be positive' })
      .default(900000), // 15 minutes
    
    twoFactorEnabled: z.boolean().default(false),
    
    passwordResetTokenExpiry: z.number()
      .positive({ message: 'Password reset token expiry must be positive' })
      .default(3600000) // 1 hour
  }).strict();

  // Authentication-related Schemas
  private static PasswordSchema = z.string()
    .regex(VALIDATION_PATTERNS.PASSWORD, { 
      message: VALIDATION_MESSAGES.INVALID_PASSWORD 
    });

  private static EmailSchema = z.string()
    .regex(VALIDATION_PATTERNS.EMAIL, { 
      message: VALIDATION_MESSAGES.INVALID_EMAIL 
    });

  private static LoginRequestSchema = z.object({
    email: EmailSchema,
    password: PasswordSchema,
    twoFactorCode: z.string().optional()
  });

  private static PasswordResetRequestSchema = z.object({
    email: EmailSchema,
    newPassword: PasswordSchema
  });

  // Metrics
  private authAttempts: Counter;
  private activeTokens: Gauge;
  private authLatency: Histogram;
  private failedLogins: Counter;
  private blockedAttempts: Counter;
  private passwordResetAttempts: Counter;

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

  public async init(): Promise<void> {
    try {
      // Initialize Metrics
      this.initializeMetrics();

      // Load and validate config
      const rawConfig = this.configManager.getConfig('security');
      const config = SecurityManager.SecurityConfigSchema.parse({
        jwtSecret: process.env.JWT_SECRET || this.generateSecureSecret(),
        jwtExpiresIn: process.env.JWT_EXPIRES_IN || '1h',
        ...rawConfig
      });

      this.loggingManager.info('SecurityManager initialized with enhanced security config', { 
        rateLimitWindow: config.rateLimitWindowMs,
        maxRequests: config.rateLimitMaxRequests,
        twoFactorEnabled: config.twoFactorEnabled
      });
    } catch (error) {
      this.loggingManager.error('Failed to initialize SecurityManager', { error });
      throw error;
    }
  }

  public async getHealth(): Promise<ServiceHealth> {
    try {
      return {
        status: ServiceStatus.HEALTHY,
        version: this.version,
        details: {
          configuration: {
            twoFactorEnabled: this.configManager.getConfig('security').twoFactorEnabled,
            rateLimitMaxRequests: this.configManager.getConfig('security').rateLimitMaxRequests
          },
          metrics: {
            authAttempts: await this.authAttempts.get(),
            activeTokens: await this.activeTokens.get(),
            failedLogins: await this.failedLogins.get(),
            blockedAttempts: await this.blockedAttempts.get(),
            passwordResetAttempts: await this.passwordResetAttempts.get()
          }
        }
      };
    } catch (error) {
      this.loggingManager.error('SecurityManager health check failed', { error });
      return {
        status: ServiceStatus.UNHEALTHY,
        version: this.version,
        details: {
          error: error instanceof Error ? error.message : 'Unknown error'
        }
      };
    }
  }

  public async cleanup(): Promise<void> {
    try {
      // Perform any necessary cleanup operations
      this.loggingManager.info('SecurityManager cleaned up successfully');
    } catch (error) {
      this.loggingManager.error('Error during SecurityManager cleanup', { error });
      throw error;
    }
  }

  // Utility methods
  private generateSecureSecret(): string {
    return randomBytes(64).toString('hex');
  }

  async generateToken(userId: string, role: string, permissions: string[]): Promise<string> {
    const startTime = process.hrtime();

    const token = sign(
      { userId, role, permissions },
      this.configManager.getJwtSecret(),
      { expiresIn: this.configManager.getConfig('security').jwtExpiresIn }
    );

    const expiresAt = Date.now() + ms(this.configManager.getConfig('security').jwtExpiresIn);
    this.activeTokens.inc({ role });

    const [seconds, nanoseconds] = process.hrtime(startTime);
    this.authLatency.observe({ method: 'token_generation' }, seconds + nanoseconds / 1e9);

    this.loggingManager.info('Token generated', { 
      userId, 
      role, 
      expiresAt: new Date(expiresAt).toISOString() 
    });

    return token;
  }

  async validateToken(token: string): Promise<TokenPayload | null> {
    try {
      const payload = verify(token, this.configManager.getJwtSecret()) as TokenPayload;
      
      // Additional token validation logic
      if (!payload.userId) {
        this.loggingManager?.warn('Invalid token: No user ID', { payload });
        return null;
      }

      // Optional: Track token validation metrics
      this.metricsManager?.incrementCounter('token_validations', { status: 'success' });
      
      return payload;
    } catch (error) {
      this.loggingManager?.error('Token validation failed', { error });
      this.metricsManager?.incrementCounter('token_validations', { status: 'failure' });
      return null;
    }
  }

  async hashPassword(password: string): Promise<string> {
    // Validate password strength
    this.validatePasswordStrength(password);

    const salt = await genSalt(this.configManager.getConfig('security').bcryptSaltRounds);
    return hash(password, salt);
  }

  private validatePasswordStrength(password: string): void {
    const passwordPolicy = this.configManager.getConfig('security').passwordPolicy;
    if (password.length < passwordPolicy.minLength) {
      throw new Error(`Password must be at least ${passwordPolicy.minLength} characters`);
    }

    if (passwordPolicy.requireSpecial && !/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
      throw new Error('Password must contain at least one special character');
    }

    if (passwordPolicy.requireMixedCase && 
        (!/[A-Z]/.test(password) || !/[a-z]/.test(password))) {
      throw new Error('Password must contain both uppercase and lowercase letters');
    }

    if (passwordPolicy.requireNumber && !/[0-9]/.test(password)) {
      throw new Error('Password must contain at least one number');
    }
  }

  async comparePassword(plainPassword: string, hashedPassword: string): Promise<boolean> {
    return compare(plainPassword, hashedPassword);
  }

  async generatePasswordResetToken(email: string): Promise<string | null> {
    try {
      // Validate email first
      SecurityManager.EmailSchema.parse(email);

      // Generate a secure random token
      const token = randomBytes(32).toString('hex');
      
      // Optional: Store token in a secure manner (e.g., with expiration)
      // This is a placeholder - actual implementation depends on your token storage strategy
      const resetTokenData = {
        email,
        token,
        expiresAt: Date.now() + this.configManager.getConfig('security').passwordResetTokenExpiry
      };

      // Optional: Log token generation
      this.loggingManager?.info('Password reset token generated', { email });

      return token;
    } catch (error) {
      this.loggingManager?.error('Password reset token generation failed', { error, email });
      return null;
    }
  }

  async validatePasswordResetToken(email: string, token: string): Promise<boolean> {
    try {
      // Validate email and token format
      SecurityManager.EmailSchema.parse(email);

      // Placeholder for actual token validation logic
      // In a real implementation, you'd check against stored tokens
      const isValid = this.isValidResetToken(email, token);

      if (isValid) {
        this.loggingManager?.info('Password reset token validated', { email });
        return true;
      }

      return false;
    } catch (error) {
      this.loggingManager?.error('Password reset token validation failed', { error, email });
      return false;
    }
  }

  // Placeholder method for token validation
  private isValidResetToken(email: string, token: string): boolean {
    // Implement actual token validation logic
    // This is a stub and should be replaced with actual implementation
    return token.length > 10 && email.includes('@');
  }

  async recordLoginAttempt(email: string, ip: string, success: boolean): Promise<void> {
    try {
      // Validate email format
      SecurityManager.EmailSchema.parse(email);

      // Log login attempt
      this.loggingManager?.info('Login attempt recorded', { 
        email, 
        ip, 
        success 
      });

      // Increment metrics
      if (!success) {
        this.metricsManager?.incrementCounter('login_failures', { email });
      }
    } catch (error) {
      this.loggingManager?.error('Login attempt recording failed', { error, email });
    }
  }
}

export default SecurityManager.getInstance();
