import jwt from 'jsonwebtoken';
import { promisify } from 'util';
import ms from 'ms';
import config from '../config';
import { logger } from './logger';
import type { TokenPayload as AuthTokenPayload } from '../../types/auth';

export type TokenPayload = AuthTokenPayload & {
  iat?: number;
  exp?: number;
};

const signAsync = promisify<Record<string, unknown>, string, jwt.SignOptions, string>(jwt.sign);
const verifyAsync = promisify<string, string, jwt.VerifyOptions, object>(jwt.verify);

export async function generateToken(
  payload: Omit<TokenPayload, 'iat' | 'exp'>,
  options?: { expiresIn: string }
): Promise<string> {
  try {
    const expiresIn = options?.expiresIn || (payload.type === 'access' ? config.jwt.expiry : config.jwt.refreshExpiry);
    return await signAsync(payload as Record<string, unknown>, config.jwt.secret, {
      expiresIn,
    });
  } catch (error) {
    logger.error('Failed to generate token:', {
      error: error instanceof Error ? error.message : 'Unknown error',
      payload,
    });
    throw error;
  }
}

export async function generateRefreshToken(
  payload: Omit<TokenPayload, 'iat' | 'exp' | 'type'>,
): Promise<string> {
  return generateToken(
    { ...payload, type: 'refresh' }
  );
}

export async function verifyToken(token: string): Promise<TokenPayload> {
  try {
    const decoded = await verifyAsync(token, config.jwt.secret, {
      complete: false,
    });
    return decoded as TokenPayload;
  } catch (error) {
    logger.error('Failed to verify token:', {
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    throw error;
  }
}

export function getTokenExpiry(type: 'access' | 'refresh'): string {
  return type === 'access' ? config.jwt.expiry : config.jwt.refreshExpiry;
}

export function getTokenExpiryMs(type: 'access' | 'refresh'): number {
  return ms(getTokenExpiry(type));
}
