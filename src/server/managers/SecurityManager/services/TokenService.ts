import jwt from 'jsonwebtoken';
import type { TokenPayload } from '../types/auth.types';
import type { SecurityConfig } from '../types/config.types';

export class TokenService {
  private readonly config: SecurityConfig;

  constructor(config: SecurityConfig) {
    this.config = config;
  }

  generateToken(payload: Omit<TokenPayload, 'iat' | 'exp'>): string {
    return jwt.sign(payload, this.config.jwtSecret, {
      expiresIn: this.config.jwtExpiresIn
    });
  }

  verifyToken(token: string): TokenPayload {
    return jwt.verify(token, this.config.jwtSecret) as TokenPayload;
  }

  generatePasswordResetToken(userId: string): string {
    return jwt.sign({ userId, purpose: 'password-reset' }, this.config.jwtSecret, {
      expiresIn: this.config.passwordResetTokenExpiry
    });
  }

  verifyPasswordResetToken(token: string): { userId: string } {
    const decoded = jwt.verify(token, this.config.jwtSecret) as TokenPayload & { purpose?: string };
    if (decoded.purpose !== 'password-reset') {
      throw new Error('Invalid token purpose');
    }
    return { userId: decoded.userId };
  }
}
