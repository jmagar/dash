// Use type instead of enum for better string literal support
export type UserRole = 'admin' | 'user';

export interface User {
  id: string;
  username: string;
  email: string;
  role: UserRole;
  is_active: boolean;
  password_hash?: string;
  createdAt: Date;
  updatedAt: Date;
}

// Make base token payload compatible with Record<string, unknown>
export interface BaseTokenPayload extends Record<string, unknown> {
  userId: string;
  username: string;
  role: UserRole;
  is_active: boolean;
  permissions?: string[];
}

export interface AccessTokenPayload extends BaseTokenPayload {
  type: 'access';
  id: string;
}

export interface RefreshTokenPayload extends BaseTokenPayload {
  type: 'refresh';
  tokenId: string;
  id: string;
}

export type TokenPayload = AccessTokenPayload | RefreshTokenPayload;

// Made permissions optional since it's not always provided
export interface AuthenticatedUser {
  id: string;
  username: string;
  email: string;
  role: UserRole;
  is_active: boolean;
  permissions?: string[];
  token?: string;
  refreshToken?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface AuthContextType {
  user: AuthenticatedUser | null;
  login: (username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshSession: () => Promise<void>;
  loading: boolean;
  error: string | null;
}

export interface LoginRequest {
  username: string;
  password: string;
}

export interface LoginResponse {
  success: boolean;
  user: AuthenticatedUser;
  token: string;
  refreshToken: string;
  error?: string;
}

export interface RefreshTokenRequest {
  refreshToken: string;
}

export interface RefreshTokenResponse {
  success: boolean;
  token: string;
  refreshToken: string;
  error?: string;
}

export interface ValidateResponse {
  success: boolean;
  valid?: boolean;
  user?: AuthenticatedUser;
  error?: string;
}

export interface RegisterRequest {
  username: string;
  email: string;
  password: string;
  confirmPassword: string;
}

export interface RegisterResponse {
  success: boolean;
  user: AuthenticatedUser;
  error?: string;
}

export interface LogoutResponse {
  success: boolean;
  error?: string;
}

export interface JWTConfig {
  secret: string;
  refreshSecret: string;
  accessTokenExpiry: string;
  refreshTokenExpiry: string;
}

export interface DecodedToken {
  id: string;
  userId: string;
  username: string;
  role: UserRole;
  is_active: boolean;
  permissions?: string[];
  type: 'access' | 'refresh';
  iat: number;
  exp: number;
}

export type TokenType = 'access' | 'refresh';

export interface TokenMetadata {
  type: TokenType;
  expiresIn: number;
  issuer: string;
  audience: string;
}

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
  metadata: {
    access: TokenMetadata;
    refresh: TokenMetadata;
  };
}

// Type guards
export function isAccessTokenPayload(payload: TokenPayload): payload is AccessTokenPayload {
  return payload.type === 'access';
}

export function isRefreshTokenPayload(payload: TokenPayload): payload is RefreshTokenPayload {
  return payload.type === 'refresh';
}

export function isAuthenticatedUser(obj: unknown): obj is AuthenticatedUser {
  return obj !== null &&
    typeof obj === 'object' &&
    'id' in obj &&
    'username' in obj &&
    'email' in obj &&
    'role' in obj &&
    'is_active' in obj;
}

// Backward compatibility type aliases
export type LoginResponseDto = LoginResponse;
export type AuthenticatedUserDto = AuthenticatedUser;
export type AccessTokenPayloadDto = AccessTokenPayload;
export type RefreshTokenPayloadDto = RefreshTokenPayload;
export type TokenPayloadDto = TokenPayload;
export type LoginDto = LoginRequest;
export type RefreshTokenRequestDto = RefreshTokenRequest;
export type ValidateResponseDto = ValidateResponse;
export type RefreshTokenResponseDto = RefreshTokenResponse;
