import axios from 'axios';
import { User, ApiResult, AuthResult, UserRegistration } from '../types';
import { handleApiError, API_ENDPOINTS, BASE_URL } from '../types/api';

export const login = async (
  username: string,
  password: string,
  mfaToken?: string
): Promise<AuthResult> => {
  try {
    const { data } = await axios.post<AuthResult>(
      `${BASE_URL}${API_ENDPOINTS.AUTH.LOGIN}`,
      { username, password, mfaToken }
    );
    return data;
  } catch (error) {
    return handleApiError<User>(error);
  }
};

export const registerUser = async (
  registration: UserRegistration
): Promise<ApiResult<User>> => {
  try {
    const { data } = await axios.post<User>(
      `${BASE_URL}${API_ENDPOINTS.AUTH.REGISTER}`,
      registration
    );
    return {
      success: true,
      data,
    };
  } catch (error) {
    return handleApiError<User>(error);
  }
};

export const validateToken = async (
  token: string
): Promise<ApiResult<User>> => {
  try {
    const { data } = await axios.post<User>(
      `${BASE_URL}${API_ENDPOINTS.AUTH.VALIDATE}`,
      { token }
    );
    return {
      success: true,
      data,
    };
  } catch (error) {
    return handleApiError<User>(error);
  }
};

export const refreshToken = async (): Promise<ApiResult<string>> => {
  try {
    const { data } = await axios.post<{ token: string }>(
      `${BASE_URL}${API_ENDPOINTS.AUTH.REFRESH}`
    );
    return {
      success: true,
      data: data.token,
    };
  } catch (error) {
    return handleApiError<string>(error);
  }
};

export const logout = async (): Promise<ApiResult<void>> => {
  try {
    await axios.post(`${BASE_URL}${API_ENDPOINTS.AUTH.LOGOUT}`);
    return {
      success: true,
    };
  } catch (error) {
    return handleApiError<void>(error);
  }
};

export const updateUser = async (
  userId: number,
  updates: Partial<User>
): Promise<ApiResult<User>> => {
  try {
    const { data } = await axios.patch<User>(
      `${BASE_URL}${API_ENDPOINTS.AUTH.UPDATE(userId)}`,
      updates
    );
    return {
      success: true,
      data,
    };
  } catch (error) {
    return handleApiError<User>(error);
  }
};

export const verifyMfa = async (
  token: string,
  mfaCode: string
): Promise<ApiResult<User>> => {
  try {
    const { data } = await axios.post<User>(
      `${BASE_URL}${API_ENDPOINTS.AUTH.VERIFY_MFA}`,
      { token, mfaCode }
    );
    return {
      success: true,
      data,
    };
  } catch (error) {
    return handleApiError<User>(error);
  }
};

export const setupMfa = async (): Promise<ApiResult<{ qrCode: string; secret: string }>> => {
  try {
    const { data } = await axios.post<{ qrCode: string; secret: string }>(
      `${BASE_URL}${API_ENDPOINTS.AUTH.SETUP_MFA}`
    );
    return {
      success: true,
      data,
    };
  } catch (error) {
    return handleApiError<{ qrCode: string; secret: string }>(error);
  }
};

export const disableMfa = async (): Promise<ApiResult<void>> => {
  try {
    await axios.post(`${BASE_URL}${API_ENDPOINTS.AUTH.DISABLE_MFA}`);
    return {
      success: true,
    };
  } catch (error) {
    return handleApiError<void>(error);
  }
};
