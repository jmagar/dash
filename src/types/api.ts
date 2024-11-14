export interface ApiResult<T> {
  success: boolean;
  data?: T;
  error?: string;
}

export interface ApiError {
  status: number;
  message: string;
  details?: unknown;
}

export interface JsonResponseBody {
  success: boolean;
  data?: unknown;
  error?: string;
}

export interface ApiEndpoints {
  AUTH: {
    LOGIN: string;
    LOGOUT: string;
    REGISTER: string;
    VALIDATE: string;
    REFRESH: string;
    UPDATE: (id: string) => string;
  };
  DOCKER: {
    CONTAINERS: string;
    CONTAINER: (id: string) => string;
    CONTAINER_LOGS: (id: string) => string;
    CONTAINER_STATS: (id: string) => string;
    STACKS: string;
    STACK: (name: string) => string;
    STACK_START: (name: string) => string;
    STACK_STOP: (name: string) => string;
  };
  HOSTS: {
    LIST: string;
    GET: (id: string) => string;
    CREATE: string;
    UPDATE: (id: string) => string;
    DELETE: (id: string) => string;
    TEST: (id: string) => string;
  };
}
