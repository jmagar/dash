import { isObject } from 'class-validator';

/**
 * Type definition for AgentConnection
 */
interface AgentConnection {
  id: string;
  hostId: string;
  status: string;
  lastSeen: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * Convert an unknown value to a string, handling various input types
 * @param value - The value to convert to string
 * @returns The string representation of the value
 */
export function toString(value: unknown): string {
  if (value === null || value === undefined) {
    return '';
  }
  if (typeof value === 'string') {
    return value;
  }
  if (value instanceof Error) {
    return value.message;
  }
  if (value instanceof Date) {
    return value.toISOString();
  }
  return String(value);
}

/**
 * Convert an unknown value to a string or error
 * @param value - The value to convert
 * @returns The string representation, Error object, or undefined
 */
export function toStringOrError(value: unknown): string | Error | undefined {
  if (value === null || value === undefined) {
    return undefined;
  }
  if (value instanceof Error) {
    return value;
  }
  return toString(value);
}

/**
 * Type guard to check if a value is an AgentConnection
 * @param value - The value to check
 * @returns True if value is an AgentConnection
 */
export function isAgentConnection(value: unknown): value is AgentConnection {
  if (!isObject(value)) {
    return false;
  }
  const obj = value as Record<string, unknown>;
  return (
    typeof obj.id === 'string' &&
    typeof obj.hostId === 'string' &&
    typeof obj.status === 'string' &&
    typeof obj.lastSeen === 'string' &&
    typeof obj.createdAt === 'string' &&
    typeof obj.updatedAt === 'string'
  );
}

/**
 * Safely parse JSON string with error handling
 * @param jsonString - The JSON string to parse
 * @returns The parsed value or undefined if invalid
 */
export function safeJsonParse(jsonString: string): unknown {
  try {
    return JSON.parse(jsonString);
  } catch {
    return undefined;
  }
}

/**
 * Check if a value is a valid timestamp
 * @param value - The value to check
 * @returns True if value is a valid timestamp
 */
export function isValidTimestamp(value: unknown): boolean {
  if (typeof value === 'number') {
    return !isNaN(value) && isFinite(value);
  }
  if (value instanceof Date) {
    return !isNaN(value.getTime());
  }
  if (typeof value === 'string') {
    const timestamp = Date.parse(value);
    return !isNaN(timestamp);
  }
  return false;
}

/**
 * Get a nested value from an object using dot notation
 * @param obj - The object to traverse
 * @param path - The path to the value (e.g. 'a.b.c')
 * @returns The value at the path or undefined
 */
export function getNestedValue(obj: Record<string, unknown>, path: string): unknown {
  return path.split('.').reduce<unknown>((acc: unknown, part: string) => {
    if (acc === null || acc === undefined || typeof acc !== 'object') {
      return undefined;
    }
    return (acc as Record<string, unknown>)[part];
  }, obj);
}

/**
 * Type guard to check if a value is a Record<string, string>
 * @param value - The value to check
 * @returns True if value is a Record<string, string>
 */
export function isStringRecord(value: unknown): value is Record<string, string> {
  if (!isObject(value)) {
    return false;
  }
  return Object.values(value).every(val => typeof val === 'string');
}

/**
 * Type guard to check if a value is a valid ISO date string
 * @param value - The value to check
 * @returns True if value is a valid ISO date string
 */
export function isIsoDateString(value: unknown): value is string {
  if (typeof value !== 'string') {
    return false;
  }
  const isoDateRegex = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{3})?Z$/;
  return isoDateRegex.test(value) && !isNaN(Date.parse(value));
}
