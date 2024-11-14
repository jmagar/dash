// Re-export all shared types
export * from './api';
export * from './auth';
export * from './cache';
export * from './config';
export * from './error';
export * from './logger';
export * from './models-shared';

// Re-export logger types with explicit names to avoid conflicts
export type {
  Logger as BaseLogger,
  LogLevel,
  LogMetadata,
} from './logger';

// Re-export logging configuration types
export type {
  LogConfig,
  LogFormatter,
  LogTransport,
  LoggerOptions,
} from './logging';

// Note: xterm-addons.d.ts is a declaration file and doesn't need to be exported
// as its types are automatically available to TypeScript
