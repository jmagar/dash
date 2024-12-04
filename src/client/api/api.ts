import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';

import { logger } from '../utils/frontendLogger';
import { LoggingManager } from '../../server/utils/logging/LoggingManager';

interface ApiError {
  status?: number;
  data?: unknown;
  message: string;
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
    const apiError: ApiError = {
      message: error instanceof Error ? error.message : 'Unknown error',
    };
    loggerLoggingManager.getInstance().();
    return Promise.reject(error);
  }
);

// Add response interceptor
api.interceptors.response.use(
  (response) => response,
  (error: unknown) => {
    const axiosError = error as AxiosError;
    const apiError: ApiError = {
      message: axiosError instanceof Error ? axiosError.message : 'Unknown error',
      status: axiosError.response?.status,
      data: axiosError.response?.data,
    };
    loggerLoggingManager.getInstance().();
    return Promise.reject(error);
  }
);

