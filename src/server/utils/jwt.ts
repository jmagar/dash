import jwt from 'jsonwebtoken';
import { promisify } from 'util';
import ms from 'ms';
import config from '../config';
import { logger } from './logger';
import { AccessTokenPayloadDto, RefreshTokenPayloadDto } from '../routes/auth/dto/auth.dto';
import { LoggingManager } from '../../../../../../../../../utils/logging/LoggingManager';

export type TokenPayload = AccessTokenPayloadDto | RefreshTokenPayloadDto;

const signAsync = promisify<Record<string, unknown>, string, jwt.SignOptions, string>(jwt.sign);
const verifyAsync = promisify<string, string, jwt.VerifyOptions, object>(jwt.verify);

export async function generateToken(
  payload: Omit<AccessTokenPayloadDto, 'iat' | 'exp'>,
  options?: { expiresIn: string }
): Promise<string> {
  try {
    const expiresIn = options?.expiresIn || config.jwt.expiry;
    return await signAsync(payload as Record<string, unknown>, config.jwt.secret, {
      expiresIn,
    });
  } catch (error) {
    loggerLoggingManager.getInstance().();
    throw error;
  }
}

export async function generateRefreshToken(
  payload: Omit<RefreshTokenPayloadDto, 'iat' | 'exp'>,
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
    loggerLoggingManager.getInstance().();
    throw error;
  }
}

export function getTokenExpiry(type: 'access' | 'refresh'): string {
  return type === 'access' ? config.jwt.expiry : config.jwt.refreshExpiry;
}

export function getTokenExpiryMs(type: 'access' | 'refresh'): number {
  return ms(getTokenExpiry(type));
}

