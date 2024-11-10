import type {
  Container,
  Stack,
  Host,
  FileItem,
  User,
} from './models-shared';

// Re-export all shared types
export * from './api-shared';
export * from './models-shared';
export * from './logging';
export * from './logger';

// Additional type exports specific to frontend
export interface AuthResult {
  success: boolean;
  data?: User;
  token?: string;
  mfaRequired?: boolean;
  error?: string;
}

export interface UserRegistration {
  username: string;
  email: string;
  password: string;
  confirmPassword?: string;
}

// Type guard functions
export function isContainer(obj: unknown): obj is Container {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    'id' in obj &&
    'name' in obj &&
    'image' in obj &&
    'state' in obj
  );
}

export function isStack(obj: unknown): obj is Stack {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    'name' in obj &&
    'services' in obj &&
    'status' in obj
  );
}

export function isHost(obj: unknown): obj is Host {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    'id' in obj &&
    'name' in obj &&
    'hostname' in obj &&
    'port' in obj
  );
}

export function isFileItem(obj: unknown): obj is FileItem {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    'name' in obj &&
    'path' in obj &&
    'type' in obj &&
    'size' in obj
  );
}
