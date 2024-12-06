import { sign, verify } from 'jsonwebtoken';
import ms from 'ms';
import { randomBytes } from 'crypto';
import type { ConfigManager } from '../../ConfigManager';
import type { LoggingManager } from '../../LoggingManager';
import type { TokenPayload } from '../types/auth.types';

export class TokenService {
  constructor(
    private readonly configManager: ConfigManager,
    private readonly loggingManager: LoggingManager
  ) {}

  async generateToken(userId: string, role: string, permissions: string[]): Promise<string> {
    const token = sign(
      { userId, role, permissions },
      this.configManager.getJwtSecret(),
      { expiresIn: this.configManager.getConfig('security').jwtExpiresIn }
    );

    const expiresAt = Date.now() + ms(this.configManager.getConfig('security').jwtExpiresIn);

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
      
      if (!payload.userId) {
        this.loggingManager.warn('Invalid token: No user ID', { payload });
        return null;
      }
      
      return payload;
    } catch (error) {
      this.loggingManager.error('Token validation failed', { error });
      return null;
    }
  }

  generatePasswordResetToken(): string {
    return randomBytes(32).toString('hex');
  }
}
