import axios, { AxiosInstance, AxiosError, AxiosRequestConfig } from 'axios';
import io from 'socket.io-client';
import type { Socket } from 'socket.io-client/build/esm/socket';
import { config } from '../config';
import { logger } from '../utils/frontendLogger';
import { createApiError } from '../../types/error';
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

interface ServerToClientEvents {
  connect: () => void;
  disconnect: () => void;
  connect_error: (error: Error) => void;
}

interface ClientToServerEvents {
  ping: () => void;
  subscribe: (channel: string) => void;
  unsubscribe: (channel: string) => void;
}

export class BaseApiClient<T extends Record<string, Endpoint>> {
  protected readonly api: AxiosInstance;
  protected readonly endpoints: T;
  protected readonly socket: Socket<ServerToClientEvents, ClientToServerEvents>;

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
    }) as unknown as Socket<ServerToClientEvents, ClientToServerEvents>;

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
        logger.error('Request interceptor error', {
          error: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined
        });
        return Promise.reject(error);
      }
    );

    this.api.interceptors.response.use(
      (response) => response,
      (error: unknown) => {
        if (this.isAxiosError(error)) {
          logger.error('Response interceptor error', {
            status: error.response?.status,
            url: error.config?.url,
            error: error.message,
            stack: error.stack
          });
        } else {
          logger.error('Unknown response error', {
            error: error instanceof Error ? error.message : String(error),
            stack: error instanceof Error ? error.stack : undefined
          });
        }
        return Promise.reject(error);
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

  private isAxiosError(error: unknown): error is AxiosError {
    return axios.isAxiosError(error);
  }

  protected async get<R>(endpoint: string, config?: AxiosRequestConfig): Promise<ApiResponse<R>> {
    try {
      const response = await this.api.get<ApiResponse<R>>(endpoint, config);
      return response.data;
    } catch (error) {
      throw createApiError(`GET request failed: ${endpoint}`, error);
    }
  }

  protected async post<R>(
    endpoint: string, 
    data?: unknown, 
    config?: AxiosRequestConfig
  ): Promise<ApiResponse<R>> {
    try {
      const response = await this.api.post<ApiResponse<R>>(endpoint, data, config);
      return response.data;
    } catch (error) {
      throw createApiError(`POST request failed: ${endpoint}`, error);
    }
  }

  protected async put<R>(
    endpoint: string, 
    data?: unknown, 
    config?: AxiosRequestConfig
  ): Promise<ApiResponse<R>> {
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

  protected getEndpoint(key: keyof T, ...params: EndpointParams[]): string {
    const endpoint = this.endpoints[key];
    if (typeof endpoint === 'function') {
      return endpoint(...params) || '';
    }
    return endpoint || '';
  }
}
