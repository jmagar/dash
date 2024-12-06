import { z } from 'zod';
import { VALIDATION_LIMITS, VALIDATION_MESSAGES } from '../../../../shared/validation/validation.config';

export const SecurityConfigSchema = z.object({
  jwtSecret: z.string()
    .min(VALIDATION_LIMITS.MIN_PASSWORD_LENGTH, { message: VALIDATION_MESSAGES.REQUIRED })
    .max(VALIDATION_LIMITS.MAX_PASSWORD_LENGTH),
  
  jwtExpiresIn: z.string().default('1h'),
  
  bcryptSaltRounds: z.number()
    .min(10, { message: 'Salt rounds must be at least 10' })
    .max(15, { message: 'Salt rounds must not exceed 15' })
    .default(12),
  
  rateLimitWindowMs: z.number()
    .positive({ message: 'Rate limit window must be positive' })
    .default(900000), // 15 minutes
  
  rateLimitMaxRequests: z.number()
    .positive({ message: 'Max requests must be positive' })
    .default(100),
  
  passwordPolicy: z.object({
    minLength: z.number()
      .min(VALIDATION_LIMITS.MIN_PASSWORD_LENGTH)
      .max(VALIDATION_LIMITS.MAX_PASSWORD_LENGTH)
      .default(VALIDATION_LIMITS.MIN_PASSWORD_LENGTH),
    
    requireSpecial: z.boolean().default(true),
    requireMixedCase: z.boolean().default(true),
    requireNumber: z.boolean().default(true)
  }).default({}),
  
  maxLoginAttempts: z.number()
    .min(3, { message: 'Minimum 3 login attempts' })
    .max(10, { message: 'Maximum 10 login attempts' })
    .default(5),
  
  lockoutDurationMs: z.number()
    .positive({ message: 'Lockout duration must be positive' })
    .default(900000), // 15 minutes
  
  twoFactorEnabled: z.boolean().default(false),
  
  passwordResetTokenExpiry: z.number()
    .positive({ message: 'Password reset token expiry must be positive' })
    .default(3600000) // 1 hour
}).strict();

export type SecurityConfig = z.infer<typeof SecurityConfigSchema>;
