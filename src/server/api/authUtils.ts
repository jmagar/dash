import { compare } from 'bcrypt';
import { sign, verify } from 'jsonwebtoken';
import type {
  AccessTokenPayloadDto,
  RefreshTokenPayloadDto,
  LoginResponseDto,
  LogoutResponseDto,
  ValidateResponseDto,
  RefreshTokenResponseDto,
} from '../types/auth';
import config from '../config';
import { db } from '../db';
import { LoggingManager } from '../managers/utils/LoggingManager';

export interface UserRecord {
  id: string;
  username: string;
  email: string;
  role: 'admin' | 'user';
  is_active: boolean;
  password_hash: string;
  created_at: Date;
  updated_at: Date;
}

export function isValidTokenPayload(payload: unknown): payload is AccessTokenPayloadDto | RefreshTokenPayloadDto {
  return (
    typeof payload === 'object' &&
    payload !== null &&
    'id' in payload &&
    'username' in payload &&
    'role' in payload &&
    'is_active' in payload &&
    'type' in payload &&
    typeof payload.id === 'string' &&
    typeof payload.username === 'string' &&
    (payload.role === 'admin' || payload.role === 'user') &&
    typeof payload.is_active === 'boolean' &&
    (payload.type === 'access' || payload.type === 'refresh')
  );
}

export async function validateUserCredentials(username: string, password: string): Promise<UserRecord | null> {
  const user = await db.users.findByUsername(username);
  if (!user) return null;

  const isPasswordValid = await compare(password, user.password_hash);
  return isPasswordValid ? user : null;
}

export function generateAccessToken(user: UserRecord): string {
  const payload: AccessTokenPayloadDto = {
    id: user.id,
    username: user.username,
    role: user.role,
    is_active: user.is_active,
    type: 'access'
  };

  return sign(payload, config.jwt.secret, { 
    expiresIn: config.jwt.accessTokenExpiry 
  });
}

export function generateRefreshToken(user: UserRecord): string {
  const payload: RefreshTokenPayloadDto = {
    id: user.id,
    username: user.username,
    role: user.role,
    is_active: user.is_active,
    type: 'refresh'
  };

  return sign(payload, config.jwt.refreshSecret, { 
    expiresIn: config.jwt.refreshTokenExpiry 
  });
}

export function verifyToken(token: string, isRefresh = false): AccessTokenPayloadDto | RefreshTokenPayloadDto {
  try {
    const secret = isRefresh ? config.jwt.refreshSecret : config.jwt.secret;
    const payload = verify(token, secret);
    
    if (!isValidTokenPayload(payload)) {
      throw new Error('Invalid token payload');
    }

    return payload;
  } catch (error) {
    LoggingManager.getInstance().error('Token verification failed', { 
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
    throw new Error('Invalid or expired token');
  }
}

export function invalidateToken(token: string): void {
  // Implement token blacklisting or revocation logic
  // This could involve adding the token to a Redis blacklist or database
}
