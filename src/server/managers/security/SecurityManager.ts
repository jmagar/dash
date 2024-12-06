import { Injectable } from '@nestjs/common';
import type { Request, Response, NextFunction } from 'express';
import { BaseService } from '../base/BaseService';
import { ServiceStatus } from '../base/types';
import type { ServiceHealth } from '../base/types';
import type { ConfigManager } from '../ConfigManager';
import type { MetricsManager } from '../MetricsManager';
import type { LoggingManager } from '../LoggingManager';

import { TokenService } from './services/TokenService';
import { PasswordService } from './services/PasswordService';
import { MetricsService } from './services/MetricsService';
import { EmailValidator } from './validators/EmailValidator';
import { PasswordValidator } from './validators/PasswordValidator';
import type { SecurityConfig } from './types/config.types';
import type { TokenPayload, LoginRequest, AuthMetrics } from './types/auth.types';

@Injectable()
export class SecurityManager extends BaseService {
  private static instance: SecurityManager;
  private version = '1.0.0';
  
  // Services
  private tokenService: TokenService;
  private passwordService: PasswordService;
  private metricsService: MetricsService;
  private passwordValidator: PasswordValidator;
  
  // Dependencies
  private configManager?: ConfigManager;
  private metricsManager?: MetricsManager;
  private loggingManager?: LoggingManager;

  private constructor() {
    super({
      name: 'SecurityManager',
      version: '1.0.0',
      dependencies: ['ConfigManager', 'MetricsManager', 'LoggingManager']
    });
  }

  public static getInstance(): SecurityManager {
    if (!SecurityManager.instance) {
      SecurityManager.instance = new SecurityManager();
    }
    return SecurityManager.instance;
  }

  public initialize(deps: {
    configManager: ConfigManager;
    metricsManager: MetricsManager;
    loggingManager: LoggingManager;
  }): void {
    this.configManager = deps.configManager;
    this.metricsManager = deps.metricsManager;
    this.loggingManager = deps.loggingManager;

    // Initialize services with config
    const config = this.getSecurityConfig();
    this.tokenService = new TokenService(config);
    this.passwordService = new PasswordService(config);
    this.metricsService = new MetricsService();
    this.passwordValidator = new PasswordValidator(config);
  }

  private getSecurityConfig(): SecurityConfig {
    if (!this.configManager) {
      throw new Error('ConfigManager not initialized');
    }

    // Get config from configManager or use defaults
    const config = this.configManager.getConfig('security');
    return {
      jwtSecret: process.env.JWT_SECRET || 'default-secret-change-me',
      jwtExpiresIn: '1h',
      bcryptSaltRounds: 12,
      rateLimitWindowMs: 900000,
      rateLimitMaxRequests: 100,
      passwordPolicy: {
        minLength: 8,
        requireSpecial: true,
        requireMixedCase: true,
        requireNumber: true
      },
      maxLoginAttempts: 5,
      lockoutDurationMs: 900000,
      twoFactorEnabled: false,
      passwordResetTokenExpiry: 3600000,
      ...config
    };
  }

  public async cleanup(): Promise<void> {
    this.loggingManager?.info('SecurityManager cleanup started');
    // Cleanup code here
    this.loggingManager?.info('SecurityManager cleanup completed');
  }

  public async getHealth(): Promise<ServiceHealth> {
    try {
      return {
        status: ServiceStatus.HEALTHY,
        version: this.version,
        details: {
          metrics: await this.metricsService.getMetrics()
        }
      };
    } catch (error) {
      this.loggingManager?.error('Health check failed', { error });
      return {
        status: ServiceStatus.UNHEALTHY,
        version: this.version,
        details: {
          error: error instanceof Error ? error.message : 'Unknown error'
        }
      };
    }
  }

  async generateToken(userId: string, role?: string): Promise<string> {
    const payload: TokenPayload = { userId, role };
    return this.tokenService.generateToken(payload);
  }

  verifyToken(token: string): TokenPayload {
    return this.tokenService.verifyToken(token);
  }

  async hashPassword(password: string): Promise<string> {
    return this.passwordService.hashPassword(password);
  }

  async validatePassword(password: string, hash: string): Promise<boolean> {
    return this.passwordService.comparePassword(password, hash);
  }

  validatePasswordStrength(password: string): { isValid: boolean; errors: string[] } {
    return this.passwordValidator.validate(password);
  }

  validateEmail(email: string): boolean {
    return EmailValidator.validate(email);
  }

  async authenticate(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const token = this.extractTokenFromRequest(req);
      if (!token) {
        throw new Error('No token provided');
      }

      const decoded = this.verifyToken(token);
      req['user'] = decoded;
      this.metricsService.recordAuthAttempt();
      next();
    } catch (error) {
      this.metricsService.recordFailedLogin();
      res.status(401).json({ error: 'Authentication failed' });
    }
  }

  private extractTokenFromRequest(req: Request): string | null {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      return authHeader.substring(7);
    }
    return null;
  }

  async login(loginRequest: LoginRequest): Promise<{ success: boolean; token?: string; error?: string }> {
    this.metricsService.recordAuthAttempt();
    
    if (!this.validateEmail(loginRequest.email)) {
      this.metricsService.recordFailedLogin();
      return { success: false, error: 'Invalid email format' };
    }

    // Note: You would typically lookup the user and their hash from a database here
    // This is just a placeholder for the actual implementation
    const mockUserHash = await this.hashPassword('mockpassword');
    const isValid = await this.validatePassword(loginRequest.password, mockUserHash);

    if (!isValid) {
      this.metricsService.recordFailedLogin();
      return { success: false, error: 'Invalid credentials' };
    }

    const token = await this.generateToken('mock-user-id', 'user');
    return { success: true, token };
  }

  getMetrics(): AuthMetrics {
    return this.metricsService.getMetrics();
  }
}
