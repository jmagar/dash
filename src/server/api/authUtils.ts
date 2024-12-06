import { compare } from 'bcrypt';
import { sign, verify } from 'jsonwebtoken';
import { randomUUID } from 'crypto';
import type {
  TokenPayload,
  AccessTokenPayload,
  RefreshTokenPayload,
  UserRole,
} from '../../types/auth';
import config from '../config';
import { LoggingManager } from '../managers/LoggingManager';
import type { DatabaseInterface } from '../db/types';

export interface UserRecord {
  id: string;
  username: string;
  email: string;
  role: UserRole;
  is_active: boolean;
  password_hash: string;
  created_at: Date;
  updated_at: Date;
}

interface AuthDatabase extends Omit<DatabaseInterface, 'chatSessions' | 'chatMessages' | 'cache'> {
  users: {
    findOne(query: { where: { username: string } | { id: string } }): Promise<UserRecord | null>;
  };
}

export class AuthUtils {
  private readonly db: AuthDatabase;
  private readonly logger: LoggingManager;

  constructor(database: AuthDatabase, logger: LoggingManager) {
    this.db = database;
    this.logger = logger;
  }

  private isValidTokenPayload(payload: unknown): payload is TokenPayload {
    if (!payload || typeof payload !== 'object') {
      return false;
    }

    const { type, userId, username } = payload as Partial<TokenPayload>;
    return (
      typeof type === 'string' &&
      typeof userId === 'string' &&
      typeof username === 'string' &&
      (type === 'access' || type === 'refresh')
    );
  }

  async validateUserCredentials(
    username: string,
    password: string
  ): Promise<UserRecord | null> {
    try {
      const user = await this.db.users.findOne({ where: { username } });
      if (!user?.password_hash) {
        return null;
      }

      const isValid = await compare(password, user.password_hash);
      if (!isValid) {
        return null;
      }

      return user;
    } catch (error) {
      this.logger.error('Error validating credentials:', { error: error instanceof Error ? error.message : 'Unknown error' });
      return null;
    }
  }

  generateAccessToken(user: UserRecord): string {
    const payload: AccessTokenPayload = {
      id: user.id,
      userId: user.id,
      username: user.username,
      role: user.role,
      is_active: user.is_active,
      type: 'access'
    };

    return sign(payload, config.jwt.secret, { 
      expiresIn: config.jwt.expiry 
    });
  }

  generateRefreshToken(user: UserRecord): string {
    const payload: RefreshTokenPayload = {
      id: user.id,
      userId: user.id,
      tokenId: randomUUID(),
      username: user.username,
      role: user.role,
      is_active: user.is_active,
      type: 'refresh'
    };

    return sign(payload, config.jwt.secret, { 
      expiresIn: config.jwt.refreshExpiry 
    });
  }

  verifyToken(token: string): TokenPayload {
    try {
      const secret = config.jwt.secret;
      const decodedToken = verify(token, secret) as unknown;
      
      if (!this.isValidTokenPayload(decodedToken)) {
        throw new Error('Invalid token payload');
      }

      return decodedToken;
    } catch (error) {
      this.logger.error('Token verification failed', { 
        error: error instanceof Error ? error.message : 'Unknown error' 
      });
      throw new Error('Invalid or expired token');
    }
  }

  invalidateToken(token: string): void {
    try {
      // Verify the token is valid before invalidating
      const payload = this.verifyToken(token);
      
      // Add token to blacklist or implement your token invalidation logic
      this.logger.info('Token invalidated', { userId: payload.userId });
    } catch (error) {
      this.logger.error('Token invalidation failed', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  }
}
