import jwt from 'jsonwebtoken';

import { createApiError } from '../../types/error';

const JWT_SECRET = process.env.JWT_SECRET || 'development-secret';
const JWT_EXPIRATION = process.env.JWT_EXPIRATION || '1h';

interface TokenPayload {
  id: string;
  username: string;
  role: string;
  [key: string]: unknown;
}

export function generateToken(payload: TokenPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRATION });
}

export function verifyToken(token: string): TokenPayload {
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    if (!isValidToken(decoded)) {
      throw createApiError('Invalid token format', 401);
    }
    return decoded;
  } catch (error) {
    throw createApiError(
      error instanceof Error ? error.message : 'Invalid token',
      401,
    );
  }
}

export function isValidToken(payload: unknown): payload is TokenPayload {
  if (!payload || typeof payload !== 'object') return false;

  const requiredFields: (keyof TokenPayload)[] = ['id', 'username', 'role'];
  return requiredFields.every(field =>
    field in payload && typeof (payload as TokenPayload)[field] === 'string',
  );
}

export function decodeToken(token: string): TokenPayload | null {
  try {
    const decoded = jwt.decode(token);
    if (!decoded || typeof decoded !== 'object') return null;
    if (!isValidToken(decoded)) return null;
    return decoded;
  } catch {
    return null;
  }
}
