import { Request, Response } from 'express';
import type {
  LoginRequest,
  LoginResponse,
  LogoutResponse,
  ValidateResponse,
  RefreshTokenRequest,
  RefreshTokenResponse,
  AuthenticatedUser
} from '../../types/auth';
import { LoggingManager } from '../managers/LoggingManager';
import { AuthUtils, UserRecord } from './authUtils';
import { DatabaseInterface } from '../db/types';
import { db } from '../db';

const logger = LoggingManager.getInstance();

// Create a custom interface that extends DatabaseInterface for auth-specific operations
interface AuthDatabaseInterface extends Omit<DatabaseInterface, 'chatSessions' | 'chatMessages' | 'cache'> {
  users: {
    findOne(query: { where: { username: string } | { id: string } }): Promise<UserRecord | null>;
  };
}

// Cast db to unknown first to avoid type conflicts
const authDb = db as unknown as AuthDatabaseInterface;
const authUtils = new AuthUtils(authDb, logger);

interface ErrorResponse {
  success: false;
  error: string;
}

function mapUserToAuthResponse(user: UserRecord, token: string, refreshToken: string): LoginResponse {
  const authUser: AuthenticatedUser = {
    id: user.id,
    username: user.username,
    email: user.email,
    role: user.role,
    is_active: user.is_active,
    createdAt: user.created_at,
    updatedAt: user.updated_at,
  };

  return {
    success: true,
    user: authUser,
    token,
    refreshToken,
  };
}

export async function login(
  req: Request<unknown, LoginResponse | ErrorResponse, LoginRequest>,
  res: Response<LoginResponse | ErrorResponse>
): Promise<Response> {
  try {
    const { username, password } = req.body;
    const user = await authUtils.validateUserCredentials(username, password);

    if (!user) {
      logger.warn('Login failed: Invalid credentials', { username });
      return res.status(401).json({ success: false, error: 'Invalid credentials' });
    }

    const token = authUtils.generateAccessToken(user);
    const refreshToken = authUtils.generateRefreshToken(user);

    return res.json(mapUserToAuthResponse(user, token, refreshToken));
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Login failed';
    logger.error('Login error:', { error: errorMessage });
    return res.status(500).json({ success: false, error: errorMessage });
  }
}

export function logout(
  req: Request<unknown, LogoutResponse>,
  res: Response<LogoutResponse>
): Response {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (token) {
      authUtils.invalidateToken(token);
    }
    return res.json({ success: true });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Logout failed';
    logger.error('Logout error:', { error: errorMessage });
    return res.status(500).json({ success: false, error: errorMessage });
  }
}

export async function validate(
  req: Request<unknown, ValidateResponse | ErrorResponse>,
  res: Response<ValidateResponse | ErrorResponse>
): Promise<Response> {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    
    if (!token) {
      return res.status(401).json({ success: false, error: 'No token provided' });
    }

    const payload = authUtils.verifyToken(token);
    const user = await authDb.users.findOne({ where: { id: payload.userId } });
    
    if (!user) {
      return res.status(401).json({ success: false, error: 'Invalid token' });
    }

    const authUser: AuthenticatedUser = {
      id: user.id,
      username: user.username,
      email: user.email,
      role: user.role,
      is_active: user.is_active
    };

    return res.json({
      success: true,
      valid: true,
      user: authUser
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Validation failed';
    logger.error('Token validation error:', { error: errorMessage });
    return res.status(500).json({ success: false, error: errorMessage });
  }
}

export async function refresh(
  req: Request<unknown, RefreshTokenResponse | ErrorResponse, RefreshTokenRequest>,
  res: Response<RefreshTokenResponse | ErrorResponse>
): Promise<Response> {
  try {
    const { refreshToken } = req.body;
    
    if (!refreshToken) {
      return res.status(400).json({ success: false, error: 'No refresh token provided' });
    }

    const payload = authUtils.verifyToken(refreshToken);
    
    if (payload.type !== 'refresh') {
      return res.status(400).json({ success: false, error: 'Invalid token type' });
    }

    const user = await authDb.users.findOne({ where: { id: payload.userId } });
    
    if (!user) {
      return res.status(401).json({ success: false, error: 'User not found' });
    }

    const newToken = authUtils.generateAccessToken(user);
    const newRefreshToken = authUtils.generateRefreshToken(user);

    return res.json({
      success: true,
      token: newToken,
      refreshToken: newRefreshToken
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Token refresh failed';
    logger.error('Token refresh error:', { error: errorMessage });
    return res.status(500).json({ success: false, error: errorMessage });
  }
}
