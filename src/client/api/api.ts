import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';
import { logger } from '../utils/frontendLogger';

export class ApiError extends Error {
  constructor(
    public readonly details: {
      status?: number;
      data?: unknown;
      message: string;
      code?: string;
    }
  ) {
    super(details.message);
    this.name = 'ApiError';
    Object.setPrototypeOf(this, ApiError.prototype);
  }
}

export const api = axios.create({
  baseURL: process.env.REACT_APP_API_URL || 'http://localhost:3001',
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add request interceptor
api.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error: unknown) => {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logger.error('API request error:', { error: errorMessage });
    throw new ApiError({
      message: errorMessage,
      code: 'REQUEST_ERROR'
    });
  }
);

// Add response interceptor
api.interceptors.response.use(
  (response) => response,
  (error: unknown) => {
    if (axios.isAxiosError(error)) {
      const axiosError = error as AxiosError;
      logger.error('API response error:', {
        status: axiosError.response?.status,
        data: axiosError.response?.data,
        message: axiosError.message
      });
      throw new ApiError({
        message: axiosError.message,
        status: axiosError.response?.status,
        data: axiosError.response?.data,
        code: 'RESPONSE_ERROR'
      });
    }

    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logger.error('Unknown API error:', { error: errorMessage });
    throw new ApiError({
      message: errorMessage,
      code: 'UNKNOWN_ERROR'
    });
  }
);

// Export types
export type { AxiosError };
