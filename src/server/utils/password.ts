import bcrypt from 'bcrypt';
import { logger } from './logger';

const SALT_ROUNDS = 10;

export async function hashPassword(password: string): Promise<string> {
  try {
    return await bcrypt.hash(password, SALT_ROUNDS);
  } catch (error) {
    logger.error('Password hashing failed:', {
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    throw new Error('Failed to hash password');
  }
}

export async function comparePassword(password: string, hash: string): Promise<boolean> {
  try {
    return await bcrypt.compare(password, hash);
  } catch (error) {
    logger.error('Password comparison failed:', {
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    throw new Error('Failed to compare password');
  }
}
