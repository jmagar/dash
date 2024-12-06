import { z } from 'zod';
import { VALIDATION_PATTERNS, VALIDATION_MESSAGES } from '../../../../shared/validation/validation.config';

export class EmailValidator {
  private static readonly schema = z.string()
    .regex(VALIDATION_PATTERNS.EMAIL, { 
      message: VALIDATION_MESSAGES.INVALID_EMAIL 
    });

  static validate(email: string): boolean {
    try {
      this.schema.parse(email);
      return true;
    } catch {
      return false;
    }
  }

  static parseOrThrow(email: string): string {
    return this.schema.parse(email);
  }
}
