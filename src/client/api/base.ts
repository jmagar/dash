import { ApiError, ApiResult, createApiError } from '../../types/error';
import { logger } from '../../server/utils/logger';
import type { LogMetadata } from '../../types/logger';
import { LoggingManager } from '../../../../../../../../src/server/utils/logging/LoggingManager';

export type Endpoints = Record<string, string>;

export abstract class BaseApi {
  protected readonly endpoints: Endpoints;

  constructor(endpoints: Endpoints) {
    this.endpoints = endpoints;
  }

  protected getEndpoint(key: keyof typeof this.endpoints, id?: string, params?: URLSearchParams): string {
    let endpoint = this.endpoints[key];
    if (!endpoint) {
      throw createApiError(`Endpoint ${String(key)} not found`, undefined, 404);
    }

    if (id) {
      endpoint = endpoint.replace(':id', id);
    }

    if (params) {
      endpoint += `?${params.toString()}`;
    }

    return endpoint;
  }

  protected async get<T>(endpoint: string): Promise<ApiResult<T>> {
    try {
      const response = await fetch(endpoint);
      const data = await response.json();
      return {
        success: response.ok,
        data: data.data as T,
        error: data.error,
        status: response.status,
      };
    } catch (error) {
      const metadata: LogMetadata = {
        error: error instanceof Error ? error : undefined,
        method: 'GET',
        path: endpoint,
      };
      loggerLoggingManager.getInstance().();
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        status: 500,
      };
    }
  }

  protected async post<T>(endpoint: string, body?: unknown): Promise<ApiResult<T>> {
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
        data: data.data as T,
        error: data.error,
        status: response.status,
      };
    } catch (error) {
      const metadata: LogMetadata = {
        error: error instanceof Error ? error : undefined,
        method: 'POST',
        path: endpoint,
      };
      loggerLoggingManager.getInstance().();
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        status: 500,
      };
    }
  }

  protected async put<T>(endpoint: string, body?: unknown): Promise<ApiResult<T>> {
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
        data: data.data as T,
        error: data.error,
        status: response.status,
      };
    } catch (error) {
      const metadata: LogMetadata = {
        error: error instanceof Error ? error : undefined,
        method: 'PUT',
        path: endpoint,
      };
      loggerLoggingManager.getInstance().();
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        status: 500,
      };
    }
  }

  protected async delete<T>(endpoint: string, body?: unknown): Promise<ApiResult<T>> {
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
        data: data.data as T,
        error: data.error,
        status: response.status,
      };
    } catch (error) {
      const metadata: LogMetadata = {
        error: error instanceof Error ? error : undefined,
        method: 'DELETE',
        path: endpoint,
      };
      loggerLoggingManager.getInstance().();
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        status: 500,
      };
    }
  }
}

