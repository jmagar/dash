import { z } from 'zod';
import { VALIDATION_PATTERNS, VALIDATION_MESSAGES } from '../../../../shared/validation/validation.config';

export class PasswordValidator {
  private static readonly schema = z.string()
    .regex(VALIDATION_PATTERNS.PASSWORD, { 
      message: VALIDATION_MESSAGES.INVALID_PASSWORD 
    });

  static validate(password: string): boolean {
    try {
      this.schema.parse(password);
      return true;
    } catch {
      return false;
    }
  }

  static parseOrThrow(password: string): string {
    return this.schema.parse(password);
  }
}
