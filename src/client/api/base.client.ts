import axios, { AxiosInstance, AxiosError, AxiosRequestConfig } from 'axios';
import { config } from '../config';
import { logger } from '../utils/logger';
import { createApiError } from '../../types/error';
import type { ApiResponse } from '../../types/express';

export interface BaseClientConfig {
  baseURL?: string;
  timeout?: number;
  headers?: Record<string, string>;
}

export class BaseApiClient {
  protected api: AxiosInstance;
  protected endpoints: Record<string, string | ((id: string) => string)>;

  constructor(endpoints: Record<string, string | ((id: string) => string)>, clientConfig?: BaseClientConfig) {
    this.endpoints = endpoints;
    this.api = axios.create({
      baseURL: clientConfig?.baseURL || config.apiUrl,
      timeout: clientConfig?.timeout || 30000,
      headers: {
        'Content-Type': 'application/json',
        ...clientConfig?.headers,
      },
    });

    this.setupInterceptors();
  }

  private setupInterceptors() {
    // Request interceptor for auth token
    this.api.interceptors.request.use(
      (config) => {
        const token = localStorage.getItem('token');
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
      },
      (error) => {
        logger.error('API request error:', {
          error: error instanceof Error ? error.message : 'Unknown error',
        });
        return Promise.reject(error);
      }
    );

    // Response interceptor for error handling
    this.api.interceptors.response.use(
      (response) => response,
      (error: unknown) => {
        const axiosError = error as AxiosError;
        logger.error('API response error:', {
          message: axiosError.message,
          status: axiosError.response?.status,
          data: axiosError.response?.data,
        });
        return Promise.reject(error);
      }
    );
  }

  protected async get<T>(endpoint: string, config?: AxiosRequestConfig): Promise<ApiResponse<T>> {
    try {
      const response = await this.api.get<ApiResponse<T>>(endpoint, config);
      return response.data;
    } catch (error) {
      throw createApiError(`GET request failed: ${endpoint}`, error);
    }
  }

  protected async post<T>(endpoint: string, data?: unknown, config?: AxiosRequestConfig): Promise<ApiResponse<T>> {
    try {
      const response = await this.api.post<ApiResponse<T>>(endpoint, data, config);
      return response.data;
    } catch (error) {
      throw createApiError(`POST request failed: ${endpoint}`, error);
    }
  }

  protected async put<T>(endpoint: string, data?: unknown, config?: AxiosRequestConfig): Promise<ApiResponse<T>> {
    try {
      const response = await this.api.put<ApiResponse<T>>(endpoint, data, config);
      return response.data;
    } catch (error) {
      throw createApiError(`PUT request failed: ${endpoint}`, error);
    }
  }

  protected async delete<T>(endpoint: string, config?: AxiosRequestConfig): Promise<ApiResponse<T>> {
    try {
      const response = await this.api.delete<ApiResponse<T>>(endpoint, config);
      return response.data;
    } catch (error) {
      throw createApiError(`DELETE request failed: ${endpoint}`, error);
    }
  }

  protected getEndpoint(key: string, ...params: string[]): string {
    const endpoint = this.endpoints[key];
    if (typeof endpoint === 'function') {
      return endpoint(...params);
    }
    return endpoint;
  }
}
