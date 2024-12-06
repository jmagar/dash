import { BaseApiClient, type Endpoint } from './base.client';
import { ApiError } from './api';
import type { 
  LoginRequest, 
  LoginResponse,
  LogoutResponse, 
  ValidateResponse,
  AuthenticatedUserDto,
  RegisterRequest,
  RegisterResponse,
  RefreshTokenRequest,
  RefreshTokenResponse
} from '../../types/auth';

type AuthEndpoints = Record<string, Endpoint> & {
  LOGIN: '/auth/login';
  LOGOUT: '/auth/logout';
  VALIDATE: '/auth/validate';
  REGISTER: '/auth/register';
  REFRESH: '/auth/refresh';
  UPDATE: '/auth/update';
};

const AUTH_ENDPOINTS: AuthEndpoints = {
  LOGIN: '/auth/login',
  LOGOUT: '/auth/logout',
  VALIDATE: '/auth/validate',
  REGISTER: '/auth/register',
  REFRESH: '/auth/refresh',
  UPDATE: '/auth/update',
};

class AuthClient extends BaseApiClient<AuthEndpoints> {
  constructor() {
    super(AUTH_ENDPOINTS);
  }

  async login(request: LoginRequest): Promise<AuthenticatedUserDto> {
    const response = await this.post<LoginResponse>(
      this.getEndpoint('LOGIN'),
      request
    );

    if (!response.data?.success || !response.data?.user) {
      throw new ApiError({
        message: response.data?.error || 'Login failed',
        code: 'AUTH_LOGIN_FAILED'
      });
    }

    return response.data.user;
  }

  async logout(): Promise<void> {
    const response = await this.post<LogoutResponse>(
      this.getEndpoint('LOGOUT')
    );

    if (!response.data?.success) {
      throw new ApiError({
        message: response.data?.error || 'Logout failed',
        code: 'AUTH_LOGOUT_FAILED'
      });
    }
  }

  async validate(): Promise<ValidateResponse> {
    const response = await this.get<ValidateResponse>(
      this.getEndpoint('VALIDATE')
    );

    if (!response.data?.success) {
      throw new ApiError({
        message: response.data?.error || 'Token validation failed',
        code: 'AUTH_VALIDATION_FAILED'
      });
    }

    return response.data;
  }

  async register(request: RegisterRequest): Promise<AuthenticatedUserDto> {
    const response = await this.post<RegisterResponse>(
      this.getEndpoint('REGISTER'),
      request
    );

    if (!response.data?.success || !response.data?.user) {
      throw new ApiError({
        message: response.data?.error || 'Registration failed',
        code: 'AUTH_REGISTRATION_FAILED'
      });
    }

    return response.data.user;
  }

  async refreshToken(request: RefreshTokenRequest): Promise<RefreshTokenResponse> {
    const response = await this.post<RefreshTokenResponse>(
      this.getEndpoint('REFRESH'),
      request
    );

    if (!response.data?.success) {
      throw new ApiError({
        message: response.data?.error || 'Token refresh failed',
        code: 'AUTH_REFRESH_FAILED'
      });
    }

    return response.data;
  }

  async updateUser(user: Partial<AuthenticatedUserDto>): Promise<AuthenticatedUserDto> {
    interface UpdateUserResponse {
      success: boolean;
      user: AuthenticatedUserDto;
      error?: string;
    }

    const response = await this.post<UpdateUserResponse>(
      this.getEndpoint('UPDATE'),
      user
    );

    if (!response.data?.success || !response.data?.user) {
      throw new ApiError({
        message: response.data?.error || 'Update user failed',
        code: 'AUTH_UPDATE_FAILED'
      });
    }

    return response.data.user;
  }
}

// Create a single instance
const authClient = new AuthClient();

// Export bound methods
export const {
  login,
  logout,
  validate,
  register,
  refreshToken,
  updateUser,
} = authClient;
