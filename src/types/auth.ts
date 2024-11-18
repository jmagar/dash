export interface User {
  id: string;
  username: string;
  email: string;
  role: 'admin' | 'user';
  is_active: boolean;
  password_hash?: string;
  createdAt: Date;
  updatedAt: Date;
}

// Base token payload contains common fields
export interface TokenPayload {
  id: string;
  userId: string;
  username: string;
  role: 'admin' | 'user';
  is_active: boolean;
  type: 'access' | 'refresh';
}

// Access token payload
export interface AccessTokenPayload extends TokenPayload {
  type: 'access';
}

// Refresh token payload
export interface RefreshTokenPayload extends TokenPayload {
  type: 'refresh';
}

// Full user data with tokens for client-side use
export interface AuthenticatedUser extends User {
  token: string;
  refreshToken: string;
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
  token: string;
  refreshToken: string;
  user: AuthenticatedUser;
  error?: string;
}

export interface LogoutResponse {
  success: boolean;
  error?: string;
}

export interface ValidateResponse {
  success: boolean;
  valid: boolean;
  user: AuthenticatedUser;
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

export interface RefreshTokenRequest {
  refreshToken: string;
}

export interface RefreshTokenResponse {
  success: boolean;
  token: string;
  refreshToken: string;
  error?: string;
}
