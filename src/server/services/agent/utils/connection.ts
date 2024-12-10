import { z } from 'zod';

// Adjust the ConnectionId type to ensure it includes the __brand property
export type ConnectionId = string & { readonly __brand: 'ConnectionId' };

const connectionIdSchema = z.string().min(1).brand<'ConnectionId'>();

export function validateConnectionId(value: unknown): ConnectionId {
  return connectionIdSchema.parse(value);
}

export function isValidConnectionId(value: unknown): value is ConnectionId {
  return connectionIdSchema.safeParse(value).success;
}

// Add your connection utility functions and types here

export const validateConnectionIdUtil = (id: string): ConnectionId => {
  // Implement validation logic
  return id as ConnectionId; // Cast to ConnectionId after validation
};
