import bcrypt from 'bcrypt';
import type { SecurityConfig } from '../types/config.types';

export class PasswordService {
  private readonly config: SecurityConfig;

  constructor(config: SecurityConfig) {
    this.config = config;
  }

  async hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, this.config.bcryptSaltRounds);
  }

  async comparePassword(password: string, hash: string): Promise<boolean> {
    return bcrypt.compare(password, hash);
  }

  async validatePasswordStrength(password: string): Promise<boolean> {
    const { minLength, requireSpecial, requireMixedCase, requireNumber } = this.config.passwordPolicy;

    if (password.length < minLength) {
      return false;
    }

    if (requireSpecial && !/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
      return false;
    }

    if (requireMixedCase && !(/[a-z]/.test(password) && /[A-Z]/.test(password))) {
      return false;
    }

    if (requireNumber && !/\d/.test(password)) {
      return false;
    }

    return true;
  }
}
