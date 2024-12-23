import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsEmail, IsNotEmpty, MinLength, MaxLength, Matches, IsBoolean, IsEnum, IsDate, IsOptional, IsUUID, IsObject, ValidateNested, IsArray } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiResult } from '../../../../types/error';
import { LogMetadata } from '../../../../types/logger';

/**
 * User role enum
 */
export enum UserRole {
  ADMIN = 'admin',
  USER = 'user',
  GUEST = 'guest'
}

/**
 * Auth metadata interface
 */
export interface AuthMetadata {
  userId?: string;
  username?: string;
  role?: UserRole;
  ipAddress?: string;
  userAgent?: string;
  deviceId?: string;
  lastLogin?: string;
  loginAttempts?: number;
  validationAttempts?: number;
}

/**
 * Base response type
 */
export class BaseResponse<T> {
  @ApiProperty({ description: 'Success status' })
  success = false;

  @ApiProperty({ description: 'Response data' })
  data?: T;

  @ApiProperty({ description: 'Error message if any' })
  error?: string;
}

/**
 * Base validation response class
 */
export class ValidationResponse<T> extends BaseResponse<T> {
  @ApiProperty({ description: 'Validation status' })
  valid = false;
}

/**
 * Auth response type
 */
export class AuthResponse<T> extends BaseResponse<T> {
  @ApiProperty({ description: 'Authentication status' })
  authenticated = false;
}

/**
 * DTO for user registration
 */
export class RegisterDto {
  @ApiProperty({ description: 'Username for registration' })
  @IsString()
  @IsNotEmpty()
  @MinLength(3)
  @MaxLength(20)
  @Matches(/^[a-zA-Z0-9_-]*$/, { message: 'Username can only contain letters, numbers, underscores and hyphens' })
  username = '';

  @ApiProperty({ description: 'Email address' })
  @IsEmail()
  @IsNotEmpty()
  email = '';

  @ApiProperty({ description: 'Password for the account' })
  @IsString()
  @IsNotEmpty()
  @MinLength(8)
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[a-zA-Z\d\w\W]{8,}$/, {
    message: 'Password must contain at least one uppercase letter, one lowercase letter, and one number',
  })
  password = '';

  @ApiProperty({ description: 'Confirm password' })
  @IsString()
  @IsNotEmpty()
  confirmPassword = '';

  @ApiPropertyOptional({ description: 'Registration metadata' })
  @IsOptional()
  @IsObject()
  metadata?: AuthMetadata;
}

/**
 * DTO for login request
 */
export class LoginDto {
  @ApiProperty({ description: 'Username or email' })
  @IsString()
  @IsNotEmpty()
  username = '';

  @ApiProperty({ description: 'Password' })
  @IsString()
  @IsNotEmpty()
  password = '';

  @ApiPropertyOptional({ description: 'Remember me option' })
  @IsOptional()
  @IsBoolean()
  rememberMe?: boolean;

  @ApiPropertyOptional({ description: 'Device ID for multi-device support' })
  @IsOptional()
  @IsString()
  deviceId?: string;

  @ApiPropertyOptional({ description: 'Login metadata' })
  @IsOptional()
  @IsObject()
  metadata?: AuthMetadata;
}

/**
 * DTO for refresh token request
 */
export class RefreshTokenRequestDto {
  @ApiProperty({ description: 'Refresh token' })
  @IsString()
  @IsNotEmpty()
  refreshToken = '';

  @ApiPropertyOptional({ description: 'Device ID for multi-device support' })
  @IsOptional()
  @IsString()
  deviceId?: string;

  @ApiPropertyOptional({ description: 'Refresh metadata' })
  @IsOptional()
  @IsObject()
  metadata?: AuthMetadata;
}

/**
 * DTO for user data
 */
export class UserDto {
  @ApiProperty({ description: 'Unique identifier' })
  @IsUUID()
  id = '';

  @ApiProperty({ description: 'Username' })
  @IsString()
  username = '';

  @ApiProperty({ description: 'Email address' })
  @IsEmail()
  email = '';

  @ApiProperty({ description: 'User role', enum: UserRole })
  @IsEnum(UserRole)
  role = UserRole.USER;

  @ApiProperty({ description: 'Account status' })
  @IsBoolean()
  is_active = false;

  @ApiProperty({ description: 'Account creation date' })
  @IsDate()
  @Type(() => Date)
  createdAt = new Date();

  @ApiProperty({ description: 'Account last update date' })
  @IsDate()
  @Type(() => Date)
  updatedAt = new Date();

  @ApiPropertyOptional({ description: 'User preferences' })
  @IsOptional()
  @IsObject()
  preferences?: Record<string, unknown>;

  @ApiPropertyOptional({ description: 'User metadata' })
  @IsOptional()
  @IsObject()
  metadata?: AuthMetadata;
}

/**
 * DTO for authenticated user response
 */
export class AuthenticatedUserDto extends UserDto {
  @ApiProperty({ description: 'JWT access token' })
  @IsString()
  token = '';

  @ApiProperty({ description: 'JWT refresh token' })
  @IsString()
  refreshToken = '';

  @ApiPropertyOptional({ description: 'Token expiration' })
  @IsOptional()
  @IsDate()
  @Type(() => Date)
  tokenExpiration?: Date;

  @ApiPropertyOptional({ description: 'Refresh token expiration' })
  @IsOptional()
  @IsDate()
  @Type(() => Date)
  refreshTokenExpiration?: Date;
}

/**
 * DTO for login response
 */
export class LoginResponseDto extends AuthResponse<AuthenticatedUserDto> {
  @ApiPropertyOptional({ description: 'Error message if login failed' })
  error?: string;

  toValidationResponse(): ValidationResponse<AuthenticatedUserDto> {
    const response = new ValidationResponse<AuthenticatedUserDto>();
    response.success = this.success;
    response.data = this.data;
    response.error = this.error;
    response.valid = this.success;
    return response;
  }
}

/**
 * DTO for logout response
 */
export class LogoutResponseDto extends AuthResponse<null> {
  @ApiPropertyOptional({ description: 'Error message if logout failed' })
  error?: string;

  toValidationResponse(): ValidationResponse<null> {
    const response = new ValidationResponse<null>();
    response.success = this.success;
    response.error = this.error;
    response.valid = this.success;
    return response;
  }
}

/**
 * Base token payload DTO
 */
export class TokenPayloadDto {
  @ApiProperty({ description: 'Token ID' })
  @IsUUID()
  id = '';

  @ApiProperty({ description: 'User ID' })
  @IsUUID()
  userId = '';

  @ApiProperty({ description: 'Username' })
  @IsString()
  @IsNotEmpty()
  username = '';

  @ApiProperty({ description: 'User role', enum: UserRole })
  @IsEnum(UserRole)
  role = UserRole.USER;

  @ApiProperty({ description: 'Account status' })
  @IsBoolean()
  is_active = false;
}

/**
 * DTO for access token payload
 */
export class AccessTokenPayloadDto extends TokenPayloadDto {
  @ApiProperty({ description: 'Token type' })
  @IsEnum(['access'])
  type = 'access';

  @ApiPropertyOptional({ description: 'Access token permissions' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  permissions?: string[];
}

/**
 * DTO for refresh token payload
 */
export class RefreshTokenPayloadDto extends TokenPayloadDto {
  @ApiProperty({ description: 'Token type' })
  @IsEnum(['refresh'])
  type = 'refresh';

  @ApiPropertyOptional({ description: 'Original access token ID' })
  @IsOptional()
  @IsUUID()
  accessTokenId?: string;
}

/**
 * Base token type
 */
export abstract class BaseTokenDto {
  @ApiProperty({ description: 'Token ID' })
  @IsUUID()
  id = '';

  @ApiProperty({ description: 'User ID' })
  @IsUUID()
  userId = '';

  @ApiProperty({ description: 'Username' })
  @IsString()
  @IsNotEmpty()
  username = '';

  @ApiProperty({ description: 'User role', enum: UserRole })
  @IsEnum(UserRole)
  role = UserRole.USER;

  @ApiProperty({ description: 'Account status' })
  @IsBoolean()
  is_active = false;

  abstract type: 'access' | 'refresh';
}

/**
 * Access token DTO
 */
export class AccessTokenDto extends BaseTokenDto {
  @ApiProperty({ description: 'Token type' })
  type = 'access' as const;
}

/**
 * Refresh token DTO
 */
export class RefreshTokenDto extends BaseTokenDto {
  @ApiProperty({ description: 'Token type' })
  type = 'refresh' as const;
}

/**
 * DTO for token validation response
 */
export class ValidateResponseDto extends ValidationResponse<AuthenticatedUserDto> {
  @ApiPropertyOptional({ description: 'Error message if validation failed' })
  error?: string;
}

/**
 * DTO for refresh token response
 */
export class RefreshTokenResponseDto extends AuthResponse<AuthenticatedUserDto> {
  @ApiPropertyOptional({ description: 'Error message if refresh failed' })
  error?: string;

  toValidationResponse(): ValidationResponse<AuthenticatedUserDto> {
    const response = new ValidationResponse<AuthenticatedUserDto>();
    response.success = this.success;
    response.data = this.data;
    response.error = this.error;
    response.valid = this.success;
    return response;
  }
}

/**
 * Device information DTO
 */
export class DeviceInfo {
  @ApiProperty({ description: 'Device ID' })
  @IsString()
  @IsNotEmpty()
  id = '';

  @ApiProperty({ description: 'Device type' })
  @IsString()
  @IsNotEmpty()
  type = '';

  @ApiProperty({ description: 'Device name' })
  @IsString()
  @IsNotEmpty()
  name = '';

  @ApiProperty({ description: 'Device platform' })
  @IsString()
  @IsNotEmpty()
  platform = '';

  @ApiProperty({ description: 'Browser information' })
  @IsString()
  @IsNotEmpty()
  browser = '';
}

/**
 * DTO for session data
 */
export class SessionDto {
  @ApiProperty({ description: 'Session ID' })
  @IsUUID()
  id = '';

  @ApiProperty({ description: 'User ID' })
  @IsUUID()
  userId = '';

  @ApiProperty({ description: 'Username' })
  @IsString()
  @IsNotEmpty()
  username = '';

  @ApiProperty({ description: 'User role', enum: UserRole })
  @IsEnum(UserRole)
  role = UserRole.USER;

  @ApiProperty({ description: 'Account status' })
  @IsBoolean()
  is_active = false;

  @ApiProperty({ description: 'Refresh token' })
  @IsString()
  refreshToken = '';

  @ApiProperty({ description: 'Session creation date' })
  @IsDate()
  @Type(() => Date)
  createdAt = new Date();

  @ApiProperty({ description: 'Session last activity date' })
  @IsDate()
  @Type(() => Date)
  lastActivity = new Date();

  @ApiPropertyOptional({ description: 'Session expiration date' })
  @IsOptional()
  @IsDate()
  @Type(() => Date)
  expiresAt?: Date;

  @ApiPropertyOptional({ description: 'Device information' })
  @IsOptional()
  @ValidateNested()
  @Type(() => DeviceInfo)
  device?: DeviceInfo;

  @ApiPropertyOptional({ description: 'Session metadata' })
  @IsOptional()
  @IsObject()
  metadata?: AuthMetadata;
}

/**
 * DTO for update user request
 */
export class UpdateUserDto {
  @ApiPropertyOptional({ description: 'New email address' })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiPropertyOptional({ description: 'New password' })
  @IsOptional()
  @IsString()
  @MinLength(8)
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[a-zA-Z\d\w\W]{8,}$/, {
    message: 'Password must contain at least one uppercase letter, one lowercase letter, and one number',
  })
  password?: string;

  @ApiPropertyOptional({ description: 'Current password for verification' })
  @IsOptional()
  @IsString()
  currentPassword?: string;

  @ApiPropertyOptional({ description: 'User preferences' })
  @IsOptional()
  @IsObject()
  preferences?: Record<string, unknown>;

  @ApiPropertyOptional({ description: 'Update metadata' })
  @IsOptional()
  @IsObject()
  metadata?: AuthMetadata;
}

/**
 * DTO for update user response
 */
export class UpdateUserResponseDto extends AuthResponse<UserDto> {
  @ApiPropertyOptional({ description: 'Error message if update failed' })
  error?: string;

  toValidationResponse(): ValidationResponse<UserDto> {
    const response = new ValidationResponse<UserDto>();
    response.success = this.success;
    response.data = this.data;
    response.error = this.error;
    response.valid = this.success;
    return response;
  }
}
