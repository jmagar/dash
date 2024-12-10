export type Timestamp = string & { __brand: 'Timestamp' };

export function createTimestamp(): Timestamp {
  return new Date().toISOString() as Timestamp;
} 