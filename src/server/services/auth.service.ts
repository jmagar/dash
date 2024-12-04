import { BaseService } from './base.service';
import { generateToken, generateRefreshToken, verifyToken } from '../utils/jwt';
import { cacheService } from '../cache/cache.service';
import { LoggingManager } from '../managers/utils/LoggingManager';
import { ApiError } from '../types/api-error';
import config from '../config';
import { PrismaClient, User } from '@prisma/client';
import { z } from 'zod';
import * as bcrypt from 'bcrypt';
import { validate, validateSafe, validateBatch } from '../utils/validation/validator';
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

// Zod schemas for validation
const LoginSchema = z.object({
  username: z.string().min(3, "Username must be at least 3 characters"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  rememberMe: z.boolean().optional().default(false)
});

const TokenSchema = z.object({
  token: z.string().min(1, "Token is required")
});

const RefreshTokenSchema = z.object({
  refreshToken: z.string().min(1, "Refresh token is required")
});

export class AuthService extends BaseService {
  private prisma: PrismaClient;
  private logger: LoggingManager;

  constructor() {
    super();
    this.prisma = new PrismaClient();
    this.logger = LoggingManager.getInstance();
  }

  // Centralized user validation method with Zod validation
  private async validateUserCredentials(
    loginData: z.infer<typeof LoginSchema>
  ): Promise<User> {
    // Validate input first
    const validatedData = validate(LoginSchema, loginData);

    const user = await this.prisma.user.findFirst({
      where: { OR: [
        { username: validatedData.username }, 
        { email: validatedData.username }
      ]}
    });

    if (!user) {
      this.logger.warn('Login attempt with non-existent user', { 
        username: validatedData.username 
      });
      throw new ApiError('Invalid credentials', 401);
    }

    const isValidPassword = await this.comparePasswords(
      validatedData.password, 
      user.password
    );

    if (!isValidPassword) {
      this.logger.warn('Failed login attempt', { 
        username: validatedData.username 
      });
      throw new ApiError('Invalid credentials', 401);
    }

    return user;
  }

  // Password comparison with consistent error handling
  private async comparePasswords(
    inputPassword: string, 
    storedHash: string
  ): Promise<boolean> {
    try {
      return await bcrypt.compare(inputPassword, storedHash);
    } catch (error) {
      this.logger.error('Password comparison failed', { 
        error: error instanceof Error ? error.message : 'Unknown error' 
      });
      throw new ApiError('Authentication error', 500);
    }
  }

  // Main login method with comprehensive validation
  async login(
    loginData: { 
      username: string; 
      password: string; 
      rememberMe?: boolean 
    }
  ): Promise<LoginResponseDto> {
    try {
      // Validate input
      const validatedLoginData = validate(LoginSchema, loginData);

      // Validate user credentials
      const user = await this.validateUserCredentials(validatedLoginData);

      // Create session and tokens
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
        expiresAt: validatedLoginData.rememberMe ? undefined : tokenExpiration
      };

      await cacheService.setSession(user.id, session);

      this.logger.info('User logged in successfully', { 
        username: user.username, 
        userId: user.id 
      });

      return {
        success: true,
        data: {
          token,
          refreshToken,
          tokenExpiration,
          ...user
        } as AuthenticatedUserDto
      };
    } catch (error) {
      this.logger.error('Login failed', { 
        error: error instanceof Error ? error.message : 'Unknown error' 
      });

      if (error instanceof ApiError) {
        throw error;
      }
      
      throw new ApiError('Login failed', 500);
    }
  }

  // Token validation with Zod validation
  async validateToken(tokenInput: { token: string }): Promise<ValidateResponseDto> {
    try {
      // Validate token format first
      const validatedToken = validate(TokenSchema, tokenInput);

      // Verify token
      const payload = await verifyToken(validatedToken.token);

      const user = await this.prisma.user.findUnique({
        where: { id: payload.userId }
      });

      if (!user) {
        throw new ApiError('User not found', 401);
      }

      return {
        success: true,
        data: {
          id: user.id,
          username: user.username,
          role: user.role as UserRole,
          is_active: user.is_active
        }
      };
    } catch (error) {
      this.logger.warn('Token validation failed', { 
        error: error instanceof Error ? error.message : 'Unknown error' 
      });

      throw new ApiError('Invalid token', 401);
    }
  }

  // Token refresh with Zod validation
  async refreshToken(
    refreshTokenInput: { refreshToken: string }
  ): Promise<RefreshTokenResponseDto> {
    try {
      // Validate refresh token format
      const validatedRefreshToken = validate(RefreshTokenSchema, refreshTokenInput);

      // Verify token
      const payload = await verifyToken(
        validatedRefreshToken.refreshToken, 
        true
      );

      const user = await this.prisma.user.findUnique({
        where: { id: payload.userId }
      });

      if (!user) {
        throw new ApiError('User not found', 401);
      }

      // Generate new access token
      const newTokenPayload: TokenPayloadDto = {
        id: user.id,
        userId: user.id,
        username: user.username,
        role: user.role as UserRole,
        is_active: user.is_active
      };

      const newAccessToken = await generateToken(newTokenPayload);

      this.logger.info('Token refreshed', { userId: user.id });

      return {
        success: true,
        data: {
          token: newAccessToken
        }
      };
    } catch (error) {
      this.logger.error('Token refresh failed', { 
        error: error instanceof Error ? error.message : 'Unknown error' 
      });

      throw new ApiError('Token refresh failed', 401);
    }
  }

  // Logout method
  async logout(userId: string): Promise<LogoutResponseDto> {
    try {
      await cacheService.deleteSession(userId);

      this.logger.info('User logged out', { userId });

      return {
        success: true
      };
    } catch (error) {
      this.logger.error('Logout failed', { 
        userId, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      });

      throw new ApiError('Logout failed', 500);
    }
  }
}

export const authService = new AuthService();
