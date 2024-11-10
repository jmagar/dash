export interface ApiResult<T> {
  success: boolean;
  data?: T;
  error?: string;
}

export interface Command {
  command: string;
  workingDirectory?: string;
  environment?: Record<string, string>;
  timeout?: number;
}

export interface CommandResult {
  stdout?: string;
  stderr?: string;
  exitCode: number;
  error?: string;
}

export interface SystemStats {
  cpu: number;
  memory: {
    used: number;
    total: number;
  };
  disk: {
    used: number;
    total: number;
  };
  network: {
    rx: number;
    tx: number;
  };
}

export interface ContainerStats {
  cpu: number;
  memory: {
    used: number;
    limit: number;
  };
  network: {
    rx: number;
    tx: number;
  };
}

export interface ExecutionResult {
  output: string;
  exitCode: number;
  error?: string;
}
