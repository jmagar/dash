import { ApiError, ApiResult, createApiError } from '../../types/error';
import { logger } from '../utils/frontendLogger';
import type { LogMetadata } from '../../types/logger';

export type EndpointParams = string | number;
export type Endpoint = string | ((...args: EndpointParams[]) => string);

export abstract class BaseApi<T extends Record<string, Endpoint>> {
  protected readonly endpoints: T;

  constructor(endpoints: T) {
    this.endpoints = endpoints;
  }

  protected getEndpoint(key: keyof T, ...args: EndpointParams[]): string {
    const endpoint = this.endpoints[key];
    if (!endpoint) {
      throw createApiError(`Endpoint ${String(key)} not found`, undefined, 404);
    }

    if (typeof endpoint === 'function') {
      return endpoint(...args);
    }

    return endpoint;
  }

  protected async get<R>(endpoint: string, params?: URLSearchParams): Promise<ApiResult<R>> {
    try {
      const url = params ? `${endpoint}?${params.toString()}` : endpoint;
      const response = await fetch(url);
      const data = await response.json();
      return {
        success: response.ok,
        data: data.data as R,
        error: data.error,
        status: response.status,
      };
    } catch (error) {
      const metadata: LogMetadata = {
        error: error instanceof Error ? error : undefined,
        method: 'GET',
        path: endpoint,
      };
      logger.error('API GET request failed', metadata);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        status: 500,
      };
    }
  }

  protected async post<R>(endpoint: string, body?: unknown): Promise<ApiResult<R>> {
    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: body ? JSON.stringify(body) : undefined,
      });
      const data = await response.json();
      return {
        success: response.ok,
        data: data.data as R,
        error: data.error,
        status: response.status,
      };
    } catch (error) {
      const metadata: LogMetadata = {
        error: error instanceof Error ? error : undefined,
        method: 'POST',
        path: endpoint,
      };
      logger.error('API POST request failed', metadata);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        status: 500,
      };
    }
  }

  protected async put<R>(endpoint: string, body?: unknown): Promise<ApiResult<R>> {
    try {
      const response = await fetch(endpoint, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: body ? JSON.stringify(body) : undefined,
      });
      const data = await response.json();
      return {
        success: response.ok,
        data: data.data as R,
        error: data.error,
        status: response.status,
      };
    } catch (error) {
      const metadata: LogMetadata = {
        error: error instanceof Error ? error : undefined,
        method: 'PUT',
        path: endpoint,
      };
      logger.error('API PUT request failed', metadata);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        status: 500,
      };
    }
  }

  protected async delete<R>(endpoint: string, body?: unknown): Promise<ApiResult<R>> {
    try {
      const response = await fetch(endpoint, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: body ? JSON.stringify(body) : undefined,
      });
      const data = await response.json();
      return {
        success: response.ok,
        data: data.data as R,
        error: data.error,
        status: response.status,
      };
    } catch (error) {
      const metadata: LogMetadata = {
        error: error instanceof Error ? error : undefined,
        method: 'DELETE',
        path: endpoint,
      };
      logger.error('API DELETE request failed', metadata);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        status: 500,
      };
    }
  }
}
