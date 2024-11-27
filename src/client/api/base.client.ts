import axios, { AxiosInstance, AxiosError, AxiosRequestConfig } from 'axios';
import { Socket, io } from 'socket.io-client';
import { config } from '../config';
import { logger } from '../utils/logger';
import { createApiError } from '../../types/error';
import type { ApiResponse } from '../../types/express';

export interface BaseClientConfig {
  baseURL?: string;
  timeout?: number;
  headers?: Record<string, string>;
  socketURL?: string;
}

export type EndpointFunction = (...args: any[]) => string;
export type Endpoint = string | EndpointFunction;

export class BaseApiClient<T extends Record<string, Endpoint>> {
  protected api: AxiosInstance;
  protected endpoints: T;
  protected socket: Socket;

  constructor(endpoints: T, clientConfig?: BaseClientConfig) {
    this.endpoints = endpoints;
    this.api = axios.create({
      baseURL: clientConfig?.baseURL || config.apiUrl,
      timeout: clientConfig?.timeout || 30000,
      headers: {
        'Content-Type': 'application/json',
        ...clientConfig?.headers,
      },
    });

    this.socket = io(clientConfig?.socketURL || config.socketUrl, {
      autoConnect: true,
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
    });

    this.setupInterceptors();
    this.setupSocketHandlers();
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

  private setupSocketHandlers() {
    this.socket.on('connect', () => {
      logger.info('Socket connected');
    });

    this.socket.on('disconnect', (reason) => {
      logger.warn('Socket disconnected:', { reason });
    });

    this.socket.on('connect_error', (error) => {
      logger.error('Socket connection error:', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    });
  }

  protected async get<R>(endpoint: string, config?: AxiosRequestConfig): Promise<ApiResponse<R>> {
    try {
      const response = await this.api.get<ApiResponse<R>>(endpoint, config);
      return response.data;
    } catch (error) {
      throw createApiError(`GET request failed: ${endpoint}`, error);
    }
  }

  protected async post<R>(endpoint: string, data?: unknown, config?: AxiosRequestConfig): Promise<ApiResponse<R>> {
    try {
      const response = await this.api.post<ApiResponse<R>>(endpoint, data, config);
      return response.data;
    } catch (error) {
      throw createApiError(`POST request failed: ${endpoint}`, error);
    }
  }

  protected async put<R>(endpoint: string, data?: unknown, config?: AxiosRequestConfig): Promise<ApiResponse<R>> {
    try {
      const response = await this.api.put<ApiResponse<R>>(endpoint, data, config);
      return response.data;
    } catch (error) {
      throw createApiError(`PUT request failed: ${endpoint}`, error);
    }
  }

  protected async delete<R>(endpoint: string, config?: AxiosRequestConfig): Promise<ApiResponse<R>> {
    try {
      const response = await this.api.delete<ApiResponse<R>>(endpoint, config);
      return response.data;
    } catch (error) {
      throw createApiError(`DELETE request failed: ${endpoint}`, error);
    }
  }

  protected getEndpoint(key: keyof T, ...params: any[]): string {
    const endpoint = this.endpoints[key];
    if (typeof endpoint === 'function') {
      return endpoint(...params);
    }
    return endpoint;
  }
}
