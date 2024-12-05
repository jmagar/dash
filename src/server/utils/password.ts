import bcrypt from 'bcrypt';
import { LoggingManager } from '../managers/LoggingManager';
import { LoggerAdapter } from './logging/logger.adapter';

const SALT_ROUNDS = 10;
const logger = new LoggerAdapter(LoggingManager.getInstance(), {
  component: 'PasswordUtils',
  service: 'Security'
});

/**
 * Hashes a password using bcrypt with a salt.
 * @param password - Plain text password to hash
 * @returns Promise resolving to the hashed password
 * @throws Error if hashing fails
 */
export async function hashPassword(password: string): Promise<string> {
  try {
    return await bcrypt.hash(password, SALT_ROUNDS);
  } catch (error) {
    logger.error('Failed to hash password', {
      error: error instanceof Error ? error.message : String(error)
    });
    throw new Error('Failed to hash password');
  }
}

/**
 * Compares a plain text password with a hashed password.
 * @param password - Plain text password to compare
 * @param hash - Hashed password to compare against
 * @returns Promise resolving to true if passwords match, false otherwise
 * @throws Error if comparison fails
 */
export async function comparePassword(password: string, hash: string): Promise<boolean> {
  try {
    return await bcrypt.compare(password, hash);
  } catch (error) {
    logger.error('Failed to compare password', {
      error: error instanceof Error ? error.message : String(error)
    });
    throw new Error('Failed to compare password');
  }
}
