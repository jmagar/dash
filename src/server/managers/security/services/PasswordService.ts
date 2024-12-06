import { hash, compare, genSalt } from 'bcrypt';
import type { ConfigManager } from '../../ConfigManager';
import type { LoggingManager } from '../../LoggingManager';

export class PasswordService {
  constructor(
    private readonly configManager: ConfigManager,
    private readonly loggingManager: LoggingManager
  ) {}

  async hashPassword(password: string): Promise<string> {
    const salt = await genSalt(this.configManager.getConfig('security').bcryptSaltRounds);
    return hash(password, salt);
  }

  async comparePassword(plainPassword: string, hashedPassword: string): Promise<boolean> {
    return compare(plainPassword, hashedPassword);
  }

  validatePasswordStrength(password: string): void {
    const passwordPolicy = this.configManager.getConfig('security').passwordPolicy;
    
    if (password.length < passwordPolicy.minLength) {
      throw new Error(`Password must be at least ${passwordPolicy.minLength} characters`);
    }

    if (passwordPolicy.requireSpecial && !/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
      throw new Error('Password must contain at least one special character');
    }

    if (passwordPolicy.requireMixedCase && 
        (!/[A-Z]/.test(password) || !/[a-z]/.test(password))) {
      throw new Error('Password must contain both uppercase and lowercase letters');
    }

    if (passwordPolicy.requireNumber && !/[0-9]/.test(password)) {
      throw new Error('Password must contain at least one number');
    }
  }
}
