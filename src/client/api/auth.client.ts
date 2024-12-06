import { BaseApiClient, type Endpoint, type EndpointParams } from './base.client';
import type { 
  LoginRequest, 
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
    const response = await this.post<AuthenticatedUserDto>(
      this.getEndpoint('LOGIN'),
      { data: request }
    );

    if (!response.data) {
      throw new Error('Login failed');
    }

    return response.data;
  }

  async logout(): Promise<LogoutResponse> {
    const response = await this.post<LogoutResponse>(
      this.getEndpoint('LOGOUT')
    );

    if (!response.success) {
      throw new Error('Logout failed');
    }

    return response;
  }

  async validate(): Promise<ValidateResponse> {
    const response = await this.get<ValidateResponse>(
      this.getEndpoint('VALIDATE')
    );

    if (!response.data) {
      throw new Error('Token validation failed');
    }

    return response.data;
  }

  async register(request: RegisterRequest): Promise<RegisterResponse> {
    const response = await this.post<RegisterResponse>(
      this.getEndpoint('REGISTER'),
      { data: request }
    );

    if (!response.data) {
      throw new Error('Registration failed');
    }

    return response.data;
  }

  async refreshToken(request: RefreshTokenRequest): Promise<RefreshTokenResponse> {
    const response = await this.post<RefreshTokenResponse>(
      this.getEndpoint('REFRESH'),
      { data: request }
    );

    if (!response.data) {
      throw new Error('Token refresh failed');
    }

    return response.data;
  }

  async updateUser(user: Partial<AuthenticatedUserDto>): Promise<AuthenticatedUserDto> {
    const response = await this.post<AuthenticatedUserDto>(this.getEndpoint('UPDATE'), { data: user });
    if (!response.data) {
      throw new Error('Update user failed');
    }
    return response.data;
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
