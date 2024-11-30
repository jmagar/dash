import { BaseService } from './base.service';
import { generateToken, generateRefreshToken, verifyToken } from '../utils/jwt';
import { cacheService } from '../cache/cache.service';
import { logger } from '../utils/logger';
import { ApiError } from '../types/api-error';
import config from '../config';
import { PrismaClient } from '@prisma/client';
import { z } from 'zod';
import { 
  UserRole, 
  AuthenticatedUserDto, 
  ValidateResponseDto,
  RefreshTokenResponseDto,
  LoginResponseDto,
  LogoutResponseDto,
  TokenPayloadDto,
  AccessTokenPayloadDto,
  RefreshTokenPayloadDto,
  SessionDto,
  BaseTokenDto,
  ValidationResponse
} from '../routes/auth/dto/auth.dto';

const sessionSchema = z.object({
  id: z.string().uuid(),
  userId: z.string().uuid(),
  username: z.string(),
  role: z.enum(['admin', 'user', 'guest']),
  is_active: z.boolean(),
  refreshToken: z.string(),
  createdAt: z.date(),
  lastActivity: z.date(),
  expiresAt: z.date().optional(),
  device: z.object({
    id: z.string(),
    type: z.string(),
    name: z.string(),
    platform: z.string(),
    browser: z.string()
  }).optional(),
  metadata: z.record(z.unknown()).optional()
});

export class AuthService extends BaseService {
  private prisma: PrismaClient;

  constructor() {
    super();
    this.prisma = new PrismaClient();
  }

  async login(username: string, password: string, rememberMe = false): Promise<LoginResponseDto> {
    try {
      const user = await this.prisma.user.findFirst({
        where: { OR: [{ username }, { email: username }] }
      });

      if (!user) {
        throw new ApiError('Invalid credentials', 401);
      }

      const isValidPassword = await this.validatePassword(password, user.password);
      if (!isValidPassword) {
        throw new ApiError('Invalid credentials', 401);
      }

      const tokenPayload: TokenPayloadDto = {
        id: user.id,
        userId: user.id,
        username: user.username,
        role: user.role as UserRole,
        is_active: user.is_active
      };

      const token = await generateToken(tokenPayload);
      const refreshToken = await generateRefreshToken(tokenPayload);
      const tokenExpiration = new Date(Date.now() + config.security.tokenExpiration);

      const session: SessionDto = {
        id: user.id,
        userId: user.id,
        username: user.username,
        role: user.role as UserRole,
        is_active: user.is_active,
        refreshToken,
        createdAt: new Date(),
        lastActivity: new Date(),
        expiresAt: rememberMe ? undefined : tokenExpiration
      };

      await cacheService.setSession(user.id, session);

      const response = new LoginResponseDto();
      response.success = true;
      response.data = {
        token,
        refreshToken,
        tokenExpiration,
        ...user
      } as AuthenticatedUserDto;

      return response;
    } catch (error) {
      logger.error('Login failed', { error });
      const response = new LoginResponseDto();
      response.success = false;
      response.error = error instanceof ApiError ? error.message : 'Login failed';
      return response;
    }
  }

  async validate(token: string): Promise<ValidateResponseDto> {
    try {
      const decoded = await verifyToken(token);
      const session = await cacheService.getSession(decoded.userId);

      if (!session) {
        throw new ApiError('Invalid session', 401);
      }

      const sessionData = sessionSchema.parse(session);
      const tokenExpiration = new Date(Date.now() + config.security.tokenExpiration);

      const response: ValidateResponseDto = {
        success: true,
        valid: true,
        data: {
          token,
          refreshToken: sessionData.refreshToken,
          tokenExpiration,
          ...decoded
        }
      };

      return response;
    } catch (error) {
      logger.error('Token validation failed', { error });
      return {
        success: false,
        valid: false,
        error: error instanceof ApiError ? error.message : 'Token validation failed'
      };
    }
  }

  async refresh(refreshToken: string): Promise<RefreshTokenResponseDto> {
    try {
      const decoded = await verifyToken(refreshToken);
      const session = await cacheService.getSession(decoded.userId);

      if (!session || session.refreshToken !== refreshToken) {
        throw new ApiError('Invalid refresh token', 401);
      }

      const tokenPayload: TokenPayloadDto = {
        id: decoded.id,
        userId: decoded.userId,
        username: decoded.username,
        role: decoded.role as UserRole,
        is_active: decoded.is_active
      };

      const newToken = await generateToken(tokenPayload);
      const newRefreshToken = await generateRefreshToken(tokenPayload);
      const tokenExpiration = new Date(Date.now() + config.security.tokenExpiration);

      const updatedSession: SessionDto = {
        ...session,
        refreshToken: newRefreshToken,
        lastActivity: new Date(),
        expiresAt: session.expiresAt
      };

      await cacheService.setSession(decoded.userId, updatedSession);

      const response = new RefreshTokenResponseDto();
      response.success = true;
      response.data = {
        token: newToken,
        refreshToken: newRefreshToken,
        tokenExpiration,
        ...decoded
      } as AuthenticatedUserDto;

      return response;
    } catch (error) {
      logger.error('Token refresh failed', { error });
      const response = new RefreshTokenResponseDto();
      response.success = false;
      response.error = error instanceof ApiError ? error.message : 'Token refresh failed';
      return response;
    }
  }

  async logout(userId: string): Promise<LogoutResponseDto> {
    try {
      await cacheService.removeSession(userId);
      
      const response = new LogoutResponseDto();
      response.success = true;
      return response;
    } catch (error) {
      logger.error('Logout failed', { error });
      const response = new LogoutResponseDto();
      response.success = false;
      response.error = error instanceof ApiError ? error.message : 'Logout failed';
      return response;
    }
  }

  private async validatePassword(password: string, hashedPassword: string): Promise<boolean> {
    // Implement password validation logic here
    return true; // Placeholder
  }
}

export const authService = new AuthService();
