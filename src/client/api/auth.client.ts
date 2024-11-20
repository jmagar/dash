import { BaseApiClient } from './base.client';
import type { LoginRequest, LoginResponse, ValidateResponse, AuthenticatedUser } from '../../types/auth';
import type { ApiResponse } from '../../types/express';

const AUTH_ENDPOINTS = {
  LOGIN: '/auth/login',
  LOGOUT: '/auth/logout',
  VALIDATE: '/auth/validate',
  UPDATE: '/auth/update',
} as const;

class AuthClient extends BaseApiClient {
  constructor() {
    super(AUTH_ENDPOINTS);
  }

  login = async (request: LoginRequest): Promise<LoginResponse> => {
    const response = await this.post<LoginResponse>(this.getEndpoint('LOGIN'), request);
    if (!response.data) {
      throw new Error('Login failed: No response data');
    }
    return response.data;
  };

  logout = async (): Promise<void> => {
    await this.post<void>(this.getEndpoint('LOGOUT'));
  };

  validate = async (): Promise<ValidateResponse> => {
    const response = await this.get<ValidateResponse>(this.getEndpoint('VALIDATE'));
    if (!response.data) {
      throw new Error('Validation failed: No response data');
    }
    return response.data;
  };

  updateUser = async (user: Partial<AuthenticatedUser>): Promise<AuthenticatedUser> => {
    const response = await this.post<AuthenticatedUser>(this.getEndpoint('UPDATE'), user);
    if (!response.data) {
      throw new Error('Update user failed: No response data');
    }
    return response.data;
  };
}

// Create a single instance
const authClient = new AuthClient();

// Export bound methods
export const login = authClient.login;
export const logout = authClient.logout;
export const validate = authClient.validate;
export const updateUser = authClient.updateUser;

// Export client instance
export { authClient };
