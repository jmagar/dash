import { Request, Response } from 'express';
import { ApiError, ApiResponse } from '../../../types/api-error';
import { authService } from '../../services/auth.service';
import { LogMetadata } from '../../../types/logger';
import { 
  LoginDto, 
  RefreshTokenRequestDto,
  AuthenticatedUserDto,
  AccessTokenPayloadDto,
  RefreshTokenPayloadDto,
  ValidateResponseDto,
  RefreshTokenResponseDto,
  LoginResponseDto
} from './dto/auth.dto';

// Extend Express Request to include authenticated user
interface AuthenticatedRequest extends Request {
  user?: AccessTokenPayloadDto | RefreshTokenPayloadDto;
}

export async function login(req: Request, res: Response): Promise<void> {
  try {
    // Type assertion with runtime validation
    const loginDto = req.body as LoginDto;
    if (!loginDto.username || !loginDto.password) {
      throw new ApiError('Invalid login credentials', 400);
    }

    const metadata: LogMetadata = {
      operation: 'login',
      userId: loginDto.username,
      context: { deviceId: loginDto.deviceId }
    };

    const result = await authService.login(loginDto.username, loginDto.password, loginDto.rememberMe);

    res.json(result);
  } catch (error) {
    const apiError = error instanceof ApiError ? error : new ApiError(
      error instanceof Error ? error.message : 'Login failed',
      401,
      { operation: 'login' }
    );
    
    res.status(apiError.statusCode).json({
      success: false,
      error: {
        message: apiError.message,
        context: apiError.context
      }
    });
  }
}

export async function logout(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    // Type assertion with runtime validation
    const { deviceId } = req.body as { deviceId?: string };

    const metadata: LogMetadata = {
      operation: 'logout',
      userId: req.user?.userId,
      context: { deviceId }
    };

    const result = await authService.logout(req.user?.userId || '');
    res.json(result);
  } catch (error) {
    const apiError = error instanceof ApiError ? error : new ApiError(
      error instanceof Error ? error.message : 'Logout failed',
      401,
      { operation: 'logout' }
    );

    res.status(apiError.statusCode).json({
      success: false,
      error: {
        message: apiError.message,
        context: apiError.context
      }
    });
  }
}

export async function validateToken(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    // Type assertion with runtime validation
    const { token } = req.body as { token: string };
    if (!token) {
      throw new ApiError('Token is required', 400);
    }

    const metadata: LogMetadata = {
      operation: 'validateToken',
      userId: req.user?.userId,
      context: { token }
    };

    const result = await authService.validate(token);
    res.json(result);
  } catch (error) {
    const apiError = error instanceof ApiError ? error : new ApiError(
      error instanceof Error ? error.message : 'Token validation failed',
      401,
      { operation: 'validateToken' }
    );

    res.status(apiError.statusCode).json({
      success: false,
      error: {
        message: apiError.message,
        context: apiError.context
      }
    });
  }
}

export async function refreshToken(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    // Type assertion with runtime validation
    const refreshTokenDto = req.body as RefreshTokenRequestDto;
    if (!refreshTokenDto.refreshToken) {
      throw new ApiError('Refresh token is required', 400);
    }

    const metadata: LogMetadata = {
      operation: 'refreshToken',
      userId: req.user?.userId,
      context: { deviceId: refreshTokenDto.deviceId }
    };

    const result = await authService.refresh(refreshTokenDto.refreshToken);
    res.json(result);
  } catch (error) {
    const apiError = error instanceof ApiError ? error : new ApiError(
      error instanceof Error ? error.message : 'Token refresh failed',
      401,
      { operation: 'refreshToken' }
    );

    res.status(apiError.statusCode).json({
      success: false,
      error: {
        message: apiError.message,
        context: apiError.context
      }
    });
  }
}
