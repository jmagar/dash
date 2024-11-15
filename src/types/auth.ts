export interface User {
  id: string;
  username: string;
  email: string;
  role: 'admin' | 'user';
  is_active: boolean;
  password_hash?: string;
  createdAt?: Date;
  lastLogin?: Date;
}

// Token payload contains only the necessary authentication info
export interface TokenPayload {
  id: string;
  username: string;
  role: 'admin' | 'user';
}

// Full user data with token for client-side use
export interface AuthenticatedUser extends User {
  token: string;
}

export interface AuthContextType {
  user: User | null;
  login: (username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
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
