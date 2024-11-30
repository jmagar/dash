import type { LogEntry, LogLevel } from './logger';

// Base format interface
export interface FormatWrap {
  transform: (info: LogEntry) => LogEntry;
  options?: FormatOptions;
}

// Format options interface
export interface FormatOptions {
  level?: boolean;
  message?: boolean;
  raw?: boolean;
  timestamp?: boolean | (() => string);
  colorize?: boolean | {
    level?: boolean;
    message?: boolean;
    colors?: {
      [key in LogLevel]?: string;
    };
  };
  align?: boolean;
  padLevels?: boolean;
  stringify?: boolean | ((obj: unknown) => string);
  depth?: number;
  humanReadableUnhandledException?: boolean;
}

// Format function types
export type FormatFunction = (info: LogEntry) => LogEntry;
export type FormatBuilder = (options?: FormatOptions) => FormatWrap;

// Built-in format types
export interface BuiltInFormats {
  simple: FormatBuilder;
  json: FormatBuilder;
  label: FormatBuilder;
  timestamp: FormatBuilder;
  colorize: FormatBuilder;
  align: FormatBuilder;
  cli: FormatBuilder;
  padLevels: FormatBuilder;
  prettyPrint: FormatBuilder;
  printf: (fn: FormatFunction) => FormatWrap;
  splat: () => FormatWrap;
  errors: (options?: { stack?: boolean }) => FormatWrap;
  combine: (...formats: FormatWrap[]) => FormatWrap;
}

// Format metadata interface
export interface FormatMetadata {
  level: LogLevel;
  message: string;
  timestamp?: string;
  [key: string]: unknown;
}

// Custom format builder type
export type CustomFormatBuilder = (options?: FormatOptions) => FormatWrap;

// Format utility functions
export function isFormatWrap(obj: unknown): obj is FormatWrap {
  if (!obj || typeof obj !== 'object') return false;
  const format = obj as Partial<FormatWrap>;
  return typeof format.transform === 'function';
}

export function isFormatOptions(obj: unknown): obj is FormatOptions {
  if (!obj || typeof obj !== 'object') return false;
  const opts = obj as Record<string, unknown>;

  // Check each possible option type
  if ('level' in opts && typeof opts.level !== 'boolean') return false;
  if ('message' in opts && typeof opts.message !== 'boolean') return false;
  if ('raw' in opts && typeof opts.raw !== 'boolean') return false;
  if ('timestamp' in opts && 
      typeof opts.timestamp !== 'boolean' && 
      typeof opts.timestamp !== 'function') return false;
  if ('colorize' in opts) {
    const colorize = opts.colorize;
    if (typeof colorize !== 'boolean' && typeof colorize !== 'object') return false;
    if (typeof colorize === 'object' && colorize !== null) {
      const colorizeOpts = colorize as Record<string, unknown>;
      if ('level' in colorizeOpts && typeof colorizeOpts.level !== 'boolean') return false;
      if ('message' in colorizeOpts && typeof colorizeOpts.message !== 'boolean') return false;
      if ('colors' in colorizeOpts) {
        const colors = colorizeOpts.colors as Record<string, unknown>;
        if (typeof colors !== 'object' || colors === null) return false;
        for (const [level, color] of Object.entries(colors)) {
          if (typeof color !== 'string') return false;
        }
      }
    }
  }
  if ('align' in opts && typeof opts.align !== 'boolean') return false;
  if ('padLevels' in opts && typeof opts.padLevels !== 'boolean') return false;
  if ('stringify' in opts && 
      typeof opts.stringify !== 'boolean' && 
      typeof opts.stringify !== 'function') return false;
  if ('depth' in opts && typeof opts.depth !== 'number') return false;
  if ('humanReadableUnhandledException' in opts && 
      typeof opts.humanReadableUnhandledException !== 'boolean') return false;

  return true;
}

// Format error types
export class FormatError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly formatName?: string
  ) {
    super(message);
    this.name = 'FormatError';
  }

  static readonly ErrorCodes = {
    INVALID_FORMAT: 'INVALID_FORMAT',
    INVALID_OPTIONS: 'INVALID_OPTIONS',
    TRANSFORM_ERROR: 'TRANSFORM_ERROR',
    COMBINE_ERROR: 'COMBINE_ERROR',
  } as const;
}

// Default format configurations
export const DEFAULT_FORMAT_CONFIG: FormatOptions = {
  timestamp: true,
  colorize: {
    level: true,
    message: false,
    colors: {
      error: 'red',
      warn: 'yellow',
      info: 'cyan',
      debug: 'gray',
      critical: 'magenta'
    }
  },
  align: true,
  padLevels: true,
  humanReadableUnhandledException: true,
} as const;

// Format utility types
export type FormatLevel = 'format' | 'transform' | 'final';
export type FormatPriority = 'high' | 'medium' | 'low';

export interface FormatMetrics {
  transformTime: number;
  outputSize: number;
  errorCount: number;
}
