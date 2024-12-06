import axios, { AxiosInstance, AxiosRequestConfig } from 'axios';
import socketIOClient from 'socket.io-client';
import { config } from '../config';
import { logger } from '../utils/frontendLogger';
import { ApiError } from './api';
import type { ApiResponse } from '../../types/express';

export interface BaseClientConfig {
  baseURL?: string;
  timeout?: number;
  headers?: Record<string, string>;
  socketURL?: string;
}

export type EndpointParams = string | number | boolean | null | undefined;
export type EndpointFunction = (...args: EndpointParams[]) => string;
export type Endpoint = string | EndpointFunction;

export class BaseApiClient<T extends Record<string, Endpoint>> {
  protected readonly api: AxiosInstance;
  protected readonly endpoints: T;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  protected readonly socket: any;

  constructor(endpoints: T, clientConfig?: BaseClientConfig) {
    this.endpoints = endpoints;
    this.api = axios.create({
      baseURL: clientConfig?.baseURL || config.apiUrl || 'http://localhost:3001',
      timeout: clientConfig?.timeout || 30000,
      headers: {
        'Content-Type': 'application/json',
        ...clientConfig?.headers,
      },
    });

    const socketUrl = clientConfig?.socketURL || config.socketUrl || 'http://localhost:3001';
    this.socket = socketIOClient(socketUrl, {
      autoConnect: true,
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
    });

    this.setupInterceptors();
    this.setupSocketHandlers();
  }

  private setupInterceptors(): void {
    this.api.interceptors.request.use(
      (config) => {
        const token = localStorage.getItem('token');
        if (token) {
          config.headers = config.headers || {};
          config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
      },
      (error: unknown) => {
        const errorMessage = error instanceof Error ? error.message : String(error);
        logger.error('Request interceptor error', {
          error: errorMessage,
          stack: error instanceof Error ? error.stack : undefined
        });
        throw new ApiError({
          message: errorMessage,
          code: 'REQUEST_ERROR'
        });
      }
    );

    this.api.interceptors.response.use(
      (response) => response,
      (error: unknown) => {
        if (axios.isAxiosError(error)) {
          logger.error('Response interceptor error', {
            status: error.response?.status,
            url: error.config?.url,
            error: error.message,
            stack: error.stack
          });
          throw new ApiError({
            message: error.message,
            status: error.response?.status,
            data: error.response?.data,
            code: 'RESPONSE_ERROR'
          });
        }

        const errorMessage = error instanceof Error ? error.message : String(error);
        logger.error('Unknown response error', {
          error: errorMessage,
          stack: error instanceof Error ? error.stack : undefined
        });
        throw new ApiError({
          message: errorMessage,
          code: 'UNKNOWN_ERROR'
        });
      }
    );
  }

  private setupSocketHandlers(): void {
    this.socket.on('connect', () => {
      logger.info('Socket connected', {
        id: this.socket.id || 'unknown'
      });
    });

    this.socket.on('disconnect', () => {
      logger.warn('Socket disconnected', {
        id: this.socket.id || 'unknown'
      });
    });

    this.socket.on('connect_error', (error: Error) => {
      logger.error('Socket connection error', {
        id: this.socket.id || 'unknown',
        error: error.message,
        stack: error.stack
      });
    });
  }

  protected async get<R>(endpoint: string, config?: AxiosRequestConfig): Promise<ApiResponse<R>> {
    const response = await this.api.get<ApiResponse<R>>(endpoint, config);
    return response.data;
  }

  protected async post<R>(
    endpoint: string, 
    data?: unknown, 
    config?: AxiosRequestConfig
  ): Promise<ApiResponse<R>> {
    const response = await this.api.post<ApiResponse<R>>(endpoint, data, config);
    return response.data;
  }

  protected async put<R>(
    endpoint: string, 
    data?: unknown, 
    config?: AxiosRequestConfig
  ): Promise<ApiResponse<R>> {
    const response = await this.api.put<ApiResponse<R>>(endpoint, data, config);
    return response.data;
  }

  protected async delete<R>(endpoint: string, config?: AxiosRequestConfig): Promise<ApiResponse<R>> {
    const response = await this.api.delete<ApiResponse<R>>(endpoint, config);
    return response.data;
  }

  protected getEndpoint(key: keyof T, ...params: EndpointParams[]): string {
    const endpoint = this.endpoints[key];
    if (typeof endpoint === 'function') {
      const result = endpoint(...params);
      if (!result) {
        throw new ApiError({
          message: `Invalid endpoint for key: ${String(key)}`,
          code: 'INVALID_ENDPOINT'
        });
      }
      return result;
    }
    if (!endpoint) {
      throw new ApiError({
        message: `Missing endpoint for key: ${String(key)}`,
        code: 'MISSING_ENDPOINT'
      });
    }
    return endpoint;
  }
}
