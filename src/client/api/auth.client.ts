import axios from 'axios';

import { User, ApiResult, AuthResult, UserRegistration } from '../types';
import { handleApiError, API_ENDPOINTS, BASE_URL } from '../types/api';

const storage = typeof localStorage !== 'undefined' ? localStorage : sessionStorage;

export const login = async (
  username: string,
  password: string,
  remember = false,
): Promise<ApiResult<AuthResult>> => {
  try {
    const { data } = await axios.post<AuthResult>(
      `${BASE_URL}${API_ENDPOINTS.AUTH.LOGIN}`,
      { username, password },
    );

    if (data.token) {
      if (remember) {
        localStorage.setItem('token', data.token);
      } else {
        sessionStorage.setItem('token', data.token);
      }
    }

    return {
      success: true,
      data,
    };
  } catch (error) {
    return handleApiError<AuthResult>(error);
  }
};

export const register = async (userData: UserRegistration): Promise<ApiResult<User>> => {
  try {
    const { data } = await axios.post<User>(
      `${BASE_URL}${API_ENDPOINTS.AUTH.REGISTER}`,
      userData,
    );
    return {
      success: true,
      data,
    };
  } catch (error) {
    return handleApiError<User>(error);
  }
};

export const logout = async (): Promise<ApiResult<void>> => {
  try {
    await axios.post(`${BASE_URL}${API_ENDPOINTS.AUTH.LOGOUT}`);
    localStorage.removeItem('token');
    sessionStorage.removeItem('token');
    return {
      success: true,
    };
  } catch (error) {
    return handleApiError<void>(error);
  }
};

interface UpdateUserData {
  email?: string;
  currentPassword?: string;
  newPassword?: string;
}

export const updateUser = async (userData: UpdateUserData): Promise<ApiResult<User>> => {
  try {
    const { data } = await axios.put<User>(
      `${BASE_URL}${API_ENDPOINTS.AUTH.UPDATE}`,
      userData,
    );
    return {
      success: true,
      data,
    };
  } catch (error) {
    return handleApiError<User>(error);
  }
};

export const validateToken = async (): Promise<ApiResult<User>> => {
  try {
    const { data } = await axios.get<User>(
      `${BASE_URL}${API_ENDPOINTS.AUTH.VALIDATE}`,
    );
    return {
      success: true,
      data,
    };
  } catch (error) {
    return handleApiError<User>(error);
  }
};

export const refreshToken = async (): Promise<ApiResult<AuthResult>> => {
  try {
    const { data } = await axios.post<AuthResult>(
      `${BASE_URL}${API_ENDPOINTS.AUTH.REFRESH}`,
    );
    return {
      success: true,
      data,
    };
  } catch (error) {
    return handleApiError<AuthResult>(error);
  }
};
