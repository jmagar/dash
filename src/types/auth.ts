import { 
  UserRole, 
  AuthenticatedUserDto, 
  LoginDto, 
  RefreshTokenRequestDto, 
  ValidateResponseDto, 
  RefreshTokenResponseDto,
  TokenPayloadDto,
  AccessTokenPayloadDto,
  RefreshTokenPayloadDto
} from '../server/routes/auth/dto/auth.dto';

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

export { TokenPayloadDto, AccessTokenPayloadDto, RefreshTokenPayloadDto };

export interface AuthContextType {
  user: AuthenticatedUserDto | null;
  login: (username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshSession: () => Promise<void>;
  loading: boolean;
  error: string | null;
}

export type LoginRequest = LoginDto;
export type RefreshTokenRequest = RefreshTokenRequestDto;
export type ValidateResponse = ValidateResponseDto;
export type RefreshTokenResponse = RefreshTokenResponseDto;

export type RegisterRequest = {
  username: string;
  email: string;
  password: string;
  confirmPassword: string;
}

export type RegisterResponse = {
  success: boolean;
  user: AuthenticatedUserDto;
  error?: string;
}

export type LogoutResponse = {
  success: boolean;
  error?: string;
}
