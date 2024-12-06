import { registerDecorator, type ValidationOptions, type ValidationArguments } from 'class-validator';
import { VALIDATION_PATTERNS, VALIDATION_LIMITS } from '../validation.config';

export function IsValidTenantId(validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      name: 'isValidTenantId',
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      validator: {
        validate(value: unknown): boolean {
          return typeof value === 'string' && VALIDATION_PATTERNS.UUID.test(value);
        },
        defaultMessage(args: ValidationArguments) {
          return `${args.property} must be a valid tenant ID`;
        },
      },
    });
  };
}

export function IsValidMetadata(validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      name: 'isValidMetadata',
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      validator: {
        validate(value: unknown): boolean {
          if (!value || typeof value !== 'object') return false;
          try {
            const str = JSON.stringify(value);
            return str.length <= VALIDATION_LIMITS.MAX_STRING_LENGTH;
          } catch {
            return false;
          }
        },
        defaultMessage(args: ValidationArguments) {
          return `${args.property} must be a valid JSON object within size limits`;
        },
      },
    });
  };
}

export function IsValidTags(validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      name: 'isValidTags',
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      validator: {
        validate(value: unknown): boolean {
          if (!Array.isArray(value)) return false;
          if (value.length > VALIDATION_LIMITS.MAX_ARRAY_LENGTH) return false;
          return value.every(tag => typeof tag === 'string' && tag.length <= VALIDATION_LIMITS.MAX_STRING_LENGTH);
        },
        defaultMessage(args: ValidationArguments) {
          return `${args.property} must be an array of strings within size limits`;
        },
      },
    });
  };
}

export function IsValidVersion(validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      name: 'isValidVersion',
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      validator: {
        validate(value: unknown): boolean {
          if (typeof value !== 'number') return false;
          return Number.isInteger(value) && value >= 0;
        },
        defaultMessage(args: ValidationArguments) {
          return `${args.property} must be a non-negative integer`;
        },
      },
    });
  };
}

export function IsValidPriority(validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      name: 'isValidPriority',
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      validator: {
        validate(value: unknown): boolean {
          if (typeof value !== 'string') return false;
          return ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'].includes(value);
        },
        defaultMessage(args: ValidationArguments) {
          return `${args.property} must be one of: LOW, MEDIUM, HIGH, CRITICAL`;
        },
      },
    });
  };
}

export function IsValidTimeoutMs(validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      name: 'isValidTimeoutMs',
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      validator: {
        validate(value: unknown): boolean {
          if (typeof value !== 'number') return false;
          return value >= 0 && value <= 300000; // Max 5 minutes
        },
        defaultMessage(args: ValidationArguments) {
          return `${args.property} must be between 0 and 300000 milliseconds (5 minutes)`;
        },
      },
    });
  };
}
