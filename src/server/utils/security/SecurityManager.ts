import { Request, Response, NextFunction } from 'express';
import { sign, verify } from 'jsonwebtoken';
import { hash, compare } from 'bcrypt';
import { z } from 'zod';
import { MetricsManager } from '../metrics/MetricsManager';
import { ConfigManager } from '../config/ConfigManager';
import { StateManager } from '../state/StateManager';
import { logger } from '../logger';
import { LoggingManager } from '../../../../../../../../../../utils/logging/LoggingManager';

export class SecurityManager {
  private static instance: SecurityManager;
  private metricsManager: MetricsManager;
  private configManager: ConfigManager;
  private stateManager: StateManager;
  private activeSessions: Map<string, { userId: string; expiresAt: number }>;

  private constructor() {
    this.metricsManager = MetricsManager.getInstance();
    this.configManager = ConfigManager.getInstance();
    this.stateManager = StateManager.getInstance();
    this.activeSessions = new Map();

    // Initialize security metrics
    this.metricsManager.createCounter('auth_attempts_total', 'Total authentication attempts');
    this.metricsManager.createCounter('auth_failures_total', 'Total authentication failures');
    this.metricsManager.createGauge('active_sessions_total', 'Total active sessions');
  }

  public static getInstance(): SecurityManager {
    if (!SecurityManager.instance) {
      SecurityManager.instance = new SecurityManager();
    }
    return SecurityManager.instance;
  }

  public async hashPassword(password: string): Promise<string> {
    const saltRounds = this.configManager.get<number>('security.saltRounds');
    return hash(password, saltRounds);
  }

  public async verifyPassword(password: string, hash: string): Promise<boolean> {
    return compare(password, hash);
  }

  public generateToken(payload: object, type: 'access' | 'refresh' = 'access'): string {
    const secret = this.configManager.get<string>(`security.${type}TokenSecret`);
    const expiresIn = this.configManager.get<string>(`security.${type}TokenExpiry`);
    
    return sign(payload, secret, { expiresIn });
  }

  public verifyToken(token: string, type: 'access' | 'refresh' = 'access'): any {
    const secret = this.configManager.get<string>(`security.${type}TokenSecret`);
    return verify(token, secret);
  }

  public authenticate() {
    return async (req: Request, res: Response, next: NextFunction) => {
      try {
        const token = this.extractToken(req);
        if (!token) {
          throw new Error('No token provided');
        }

        const decoded = this.verifyToken(token);
        req.user = decoded;

        // Update session if needed
        await this.refreshSession(decoded.userId);
        next();
      } catch (error) {
        this.metricsManager.incrementCounter('auth_failures_total');
        res.status(401).json({
          success: false,
          error: 'Authentication failed'
        });
      }
    };
  }

  public authorize(roles: string[]) {
    return (req: Request, res: Response, next: NextFunction) => {
      if (!req.user || !roles.includes(req.user.role)) {
        this.metricsManager.incrementCounter('auth_failures_total');
        res.status(403).json({
          success: false,
          error: 'Unauthorized'
        });
        return;
      }
      next();
    };
  }

  private extractToken(req: Request): string | null {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      return authHeader.substring(7);
    }
    return null;
  }

  public async createSession(userId: string): Promise<string> {
    const sessionId = crypto.randomUUID();
    const expiresAt = Date.now() + this.configManager.get<number>('security.sessionExpiry');
    
    this.activeSessions.set(sessionId, { userId, expiresAt });
    this.metricsManager.setGauge('active_sessions_total', this.activeSessions.size);

    await this.stateManager.set(`session:${sessionId}`, {
      userId,
      expiresAt,
      createdAt: Date.now()
    });

    return sessionId;
  }

  private async refreshSession(userId: string): Promise<void> {
    const sessions = Array.from(this.activeSessions.entries())
      .filter(([_, session]) => session.userId === userId);

    for (const [sessionId, session] of sessions) {
      session.expiresAt = Date.now() + this.configManager.get<number>('security.sessionExpiry');
      await this.stateManager.set(`session:${sessionId}`, {
        userId,
        expiresAt: session.expiresAt,
        lastAccessed: Date.now()
      });
    }
  }

  public async invalidateSession(sessionId: string): Promise<void> {
    this.activeSessions.delete(sessionId);
    this.metricsManager.setGauge('active_sessions_total', this.activeSessions.size);
    await this.stateManager.delete(`session:${sessionId}`);
  }

  public setupSecurityMiddleware(app: any) {
    const helmet = require('helmet');
    const cors = require('cors');
    
    // Basic security headers
    app.use(helmet());

    // CORS configuration
    app.use(cors({
      origin: this.configManager.get<string[]>('cors.origins'),
      methods: this.configManager.get<string[]>('cors.methods'),
      allowedHeaders: this.configManager.get<string[]>('cors.allowedHeaders'),
      credentials: true
    }));

    // Rate limiting
    const rateLimit = require('express-rate-limit');
    app.use(rateLimit({
      windowMs: this.configManager.get<number>('security.rateLimit.windowMs'),
      max: this.configManager.get<number>('security.rateLimit.max')
    }));

    // Body parser with size limits
    const bodyParser = require('body-parser');
    app.use(bodyParser.json({ limit: '1mb' }));
    app.use(bodyParser.urlencoded({ extended: true, limit: '1mb' }));

    loggerLoggingManager.getInstance().();
  }
}

export default SecurityManager.getInstance();

