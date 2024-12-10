import { ServiceStatus } from './status';
import { ServiceEvent } from './events';
import { ServiceConfig } from './service-config';

/**
 * Base entity interface for all persistent domain objects
 */
export interface BaseEntity {
  id: string;
  createdAt: Date;
  updatedAt: Date;
  version?: number;
  metadata?: Record<string, unknown>;
}

/**
 * Base interface for all services
 */
export interface IService {
  readonly name: string;
  readonly version: string;
  readonly status: ServiceStatus;
  readonly config: ServiceConfig;
  
  start(): Promise<void>;
  stop(): Promise<void>;
  restart(): Promise<void>;
  
  on(eventName: string, handler: (event: ServiceEvent) => void): void;
  off(eventName: string, handler: (event: ServiceEvent) => void): void;
  emit(event: ServiceEvent): void;
}

/**
 * Base interface for service metadata
 */
export interface ServiceMetadata {
  name: string;
  version: string;
  description?: string;
  dependencies?: string[];
  tags?: string[];
}

/**
 * Base interface for service state
 */
export interface ServiceState {
  status: ServiceStatus;
  startTime?: Date;
  stopTime?: Date;
  lastError?: Error;
  metadata: ServiceMetadata;
}

/**
 * Base interface for service operations
 */
export interface ServiceOperation<TInput = void, TOutput = void> {
  name: string;
  execute(input: TInput): Promise<TOutput>;
  validate?(input: TInput): Promise<boolean>;
  rollback?(): Promise<void>;
}

/**
 * Base interface for service dependencies
 */
export interface ServiceDependency {
  name: string;
  required: boolean;
  service?: IService;
  status: ServiceStatus;
}

/**
 * Base interface for service capabilities
 */
export interface ServiceCapability<TConfig = Record<string, unknown>, TInput = void, TOutput = void> {
  name: string;
  enabled: boolean;
  configure?(config: TConfig): Promise<void>;
  execute(input: TInput): Promise<TOutput>;
}
