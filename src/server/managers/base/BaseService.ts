import type { ServiceHealth } from './types';

export interface ServiceConfig {
  name: string;
  version: string;
  dependencies: string[];
}

export abstract class BaseService {
  protected config: ServiceConfig;

  constructor(config: ServiceConfig) {
    this.config = config;
  }

  abstract cleanup(): Promise<void>;
  abstract getHealth(): Promise<ServiceHealth>;
}
