import type { SecurityConfig } from '../types/config.types';

export class PasswordValidator {
  private readonly config: SecurityConfig;

  constructor(config: SecurityConfig) {
    this.config = config;
  }

  validate(password: string): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];
    const { minLength, requireSpecial, requireMixedCase, requireNumber } = this.config.passwordPolicy;

    if (password.length < minLength) {
      errors.push(`Password must be at least ${minLength} characters long`);
    }

    if (requireSpecial && !/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
      errors.push('Password must contain at least one special character');
    }

    if (requireMixedCase && !(/[a-z]/.test(password) && /[A-Z]/.test(password))) {
      errors.push('Password must contain both uppercase and lowercase letters');
    }

    if (requireNumber && !/\d/.test(password)) {
      errors.push('Password must contain at least one number');
    }

    // Check for common weak patterns
    if (/(.)\1{2,}/.test(password)) {
      errors.push('Password contains too many repeated characters');
    }

    if (/^(123|abc|qwerty|password|admin)/i.test(password)) {
      errors.push('Password contains common weak patterns');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  static sanitize(password: string): string {
    // Remove leading/trailing whitespace
    return password.trim();
  }
}
