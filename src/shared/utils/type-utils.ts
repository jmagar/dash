/**
 * Utility functions for type conversion and type safety
 */

/**
 * Convert an unknown value to a string, handling various input types
 * @param value - The value to convert to a string
 * @returns A string representation or an error object
 */
export function toString(value: unknown): string {
  if (value === null || value === undefined) return '';
  if (typeof value === 'string') return value;
  if (value instanceof Error) return value.message;
  if (typeof value === 'object') {
    try {
      return JSON.stringify(value);
    } catch {
      return String(value);
    }
  }
  return String(value);
}

/**
 * Convert an unknown value to a string or error
 * @param value - The value to convert
 * @returns A string, an Error, or undefined
 */
export function toStringOrError(value: unknown): string | Error | undefined {
  if (value === null || value === undefined) return undefined;
  if (typeof value === 'string') return value;
  if (value instanceof Error) return value;
  try {
    return toString(value);
  } catch (err) {
    return new Error(String(value));
  }
}

/**
 * Type guard to check if a value is an agent connection
 * @param value - The value to check
 * @returns Boolean indicating if the value is an agent connection
 */
export function isAgentConnection(value: unknown): boolean {
  if (typeof value !== 'object' || value === null) return false;
  
  const obj = value as Record<string, unknown>;
  return (
    typeof obj.id === 'string' &&
    typeof obj.status === 'string' &&
    typeof obj.lastSeen === 'string'
  );
}

/**
 * Safely parse a JSON string
 * @param jsonString - The JSON string to parse
 * @returns Parsed object or undefined if parsing fails
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
 * @returns Boolean indicating if the value is a valid timestamp
 */
export function isValidTimestamp(value: unknown): boolean {
  if (typeof value !== 'string') return false;
  return !isNaN(Date.parse(value));
}

/**
 * Safely get a nested property from an object
 * @param obj - The object to search
 * @param path - Dot-separated path to the property
 * @returns The value of the nested property or undefined
 */
export function getNestedValue(obj: Record<string, unknown>, path: string): unknown {
  return path.split('.').reduce<unknown>((acc: unknown, part: string) => {
    if (acc === null || acc === undefined) return undefined;
    if (typeof acc !== 'object') return undefined;
    return (acc as Record<string, unknown>)[part];
  }, obj);
}
