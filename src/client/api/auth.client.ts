import axios from 'axios';

import type { User, ApiResult, AuthResult, UserRegistration } from '../../types';
import { API_ENDPOINTS } from '../../types/api-shared';
import { handleApiError } from '../../types/error';
import { BASE_URL } from '../config';

export async function login(
  username: string,
  password: string,
): Promise<ApiResult<AuthResult>> {
  try {
    const response = await axios.post(`${BASE_URL}${API_ENDPOINTS.AUTH.LOGIN}`, {
      username,
      password,
    });
    return response.data;
  } catch (error) {
    return handleApiError<AuthResult>(error);
  }
}

export async function logout(): Promise<ApiResult<void>> {
  try {
    const response = await axios.post(`${BASE_URL}${API_ENDPOINTS.AUTH.LOGOUT}`);
    return response.data;
  } catch (error) {
    return handleApiError(error);
  }
}

export async function register(data: UserRegistration): Promise<ApiResult<AuthResult>> {
  try {
    const response = await axios.post(`${BASE_URL}${API_ENDPOINTS.AUTH.REGISTER}`, data);
    return response.data;
  } catch (error) {
    return handleApiError<AuthResult>(error);
  }
}

export async function updateUser(data: Partial<User>): Promise<ApiResult<User>> {
  try {
    const response = await axios.put(
      `${BASE_URL}${API_ENDPOINTS.AUTH.UPDATE(data.id as number)}`,
      data,
    );
    return response.data;
  } catch (error) {
    return handleApiError<User>(error);
  }
}

export async function validateToken(): Promise<ApiResult<User>> {
  try {
    const response = await axios.get(`${BASE_URL}${API_ENDPOINTS.AUTH.VALIDATE}`);
    return response.data;
  } catch (error) {
    return handleApiError<User>(error);
  }
}

export async function refreshToken(): Promise<ApiResult<{ token: string }>> {
  try {
    const response = await axios.post(`${BASE_URL}${API_ENDPOINTS.AUTH.REFRESH}`);
    return response.data;
  } catch (error) {
    return handleApiError<{ token: string }>(error);
  }
}
