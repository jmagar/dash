import type { Request, Response } from 'express';
import { generateToken, generateRefreshToken, verifyToken } from '../../../utils/jwt';
import { logger } from '../../../utils/logger';
import { ApiError } from '../../../types/error';
import { cacheService } from '../../../cache/CacheService';
import config from '../../../config';
import type { 
  LoginDto, 
  RefreshTokenRequestDto,
  AuthenticatedUserDto,
  ValidateResponseDto,
  RefreshTokenResponseDto,
  AccessTokenPayloadDto,
  RefreshTokenPayloadDto,
  UserRole
} from './dto/auth.dto';
import type { 
  AuthenticatedRequest,
  ApiResponse 
} from '../../../types/express';
import { UserRole } from './dto/auth.dto';

/**
 * Handle user login
 */
export class AuthController {
  /**
   * Handle user login
   */
  async login(
    req: AuthenticatedRequest<Record<string, never>, ApiResponse<AuthenticatedUserDto>, LoginDto>,
    res: Response<ApiResponse<AuthenticatedUserDto>>
  ): Promise<void> {
    try {
      const { username, password } = req.body;

      // Generate tokens
      const payload: AccessTokenPayloadDto = {
        id: req.user!.id,
        userId: req.user!.id,
        username: req.user!.username,
        role: req.user!.role,
        is_active: req.user!.is_active,
        type: 'access'
      };

      const token = await generateToken(payload);
      const refreshToken = await generateRefreshToken({
        ...payload,
        type: 'refresh'
      } as RefreshTokenPayloadDto);

      const authenticatedUser: AuthenticatedUserDto = {
        ...req.user!,
        token,
        refreshToken
      };

      res.json({
        success: true,
        data: authenticatedUser
      });
    } catch (error) {
      logger.error('Login failed:', error);
      throw ApiError.internal('Login failed');
    }
  }

  /**
   * Handle user logout
   */
  async logout(
    req: AuthenticatedRequest<Record<string, never>>,
    res: Response<ApiResponse<void>>
  ): Promise<void> {
    try {
      const token = req.headers.authorization?.split(' ')[1];
      if (!token) {
        throw new ApiError('No token provided', undefined, 401);
      }

      await cacheService.removeSession(token);
      res.json({
        success: true
      });
    } catch (error) {
      logger.error('Logout failed:', error);
      throw ApiError.internal('Logout failed');
    }
  }

  /**
   * Validate token
   */
  async validate(
    req: AuthenticatedRequest<Record<string, never>>,
    res: Response<ApiResponse<ValidateResponseDto>>
  ): Promise<void> {
    try {
      const token = req.headers.authorization?.split(' ')[1];
      if (!token) {
        throw new ApiError('No token provided', undefined, 401);
      }

      const rawSessionData = await cacheService.getSession(token);
      if (!rawSessionData || typeof rawSessionData !== 'object') {
        throw new ApiError('Invalid session', undefined, 401);
      }

      const sessionData = rawSessionData as {
        userId: string;
        username: string;
        role: 'admin' | 'user';
        is_active: boolean;
        refreshToken: string;
        expiresAt: string;
      };

      const user = {
        id: sessionData.userId,
        username: sessionData.username,
        email: 'user@example.com',
        role: sessionData.role,
        is_active: sessionData.is_active,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      const authenticatedUser: AuthenticatedUserDto = {
        ...user,
        token,
        refreshToken: sessionData.refreshToken,
        tokenExpiration: new Date(sessionData.expiresAt)
      };

      res.json({
        success: true,
        data: {
          valid: true,
          data: authenticatedUser
        }
      });
    } catch (error) {
      logger.error('Validation failed:', error);
      throw ApiError.internal('Validation failed');
    }
  }

  /**
   * Refresh token
   */
  async refresh(
    req: AuthenticatedRequest<Record<string, never>, ApiResponse<RefreshTokenResponseDto>, RefreshTokenRequestDto>,
    res: Response<ApiResponse<RefreshTokenResponseDto>>
  ): Promise<void> {
    try {
      const { refreshToken } = req.body;
      if (!refreshToken) {
        throw new ApiError('No refresh token provided', undefined, 401);
      }

      const decoded = await verifyToken(refreshToken) as RefreshTokenPayloadDto;
      if (!decoded || decoded.type !== 'refresh') {
        throw new ApiError('Invalid refresh token', undefined, 401);
      }

      // Mock user lookup - replace with actual DB lookup
      const user = {
        id: decoded.id,
        username: decoded.username,
        email: 'user@example.com',
        role: decoded.role,
        is_active: decoded.is_active,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      // Generate new tokens
      const payload: AccessTokenPayloadDto = {
        id: user.id,
        userId: user.id,
        username: user.username,
        role: user.role,
        is_active: user.is_active,
        type: 'access'
      };
      const newToken = await generateToken(payload);

      const refreshPayload: RefreshTokenPayloadDto = {
        ...payload,
        type: 'refresh'
      };
      const newRefreshToken = await generateRefreshToken(refreshPayload);

      const expiresAt = new Date(Date.now() + config.server.security.sessionMaxAge);

      // Update session
      await cacheService.setSession(newToken, user, newRefreshToken);

      const authenticatedUser: AuthenticatedUserDto = {
        token: newToken,
        refreshToken: newRefreshToken,
        tokenExpiration: expiresAt,
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role as UserRole,
        is_active: user.is_active,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt
      };

      res.json({
        success: true,
        data: {
          data: authenticatedUser
        }
      });
    } catch (error) {
      logger.error('Refresh failed:', error);
      throw ApiError.internal('Refresh failed');
    }
  }
}
