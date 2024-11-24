import { registerDecorator, ValidationOptions, ValidationArguments } from 'class-validator';
import { VALIDATION_PATTERNS, VALIDATION_MESSAGES, VALIDATION_LIMITS } from '../validation.config';

export function IsValidTenantId(validationOptions?: ValidationOptions) {
  return function (object: Object, propertyName: string) {
    registerDecorator({
      name: 'isValidTenantId',
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      validator: {
        validate(value: any) {
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
  return function (object: Object, propertyName: string) {
    registerDecorator({
      name: 'isValidMetadata',
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      validator: {
        validate(value: any) {
          if (!value || typeof value !== 'object') return false;
          try {
            JSON.stringify(value);
            return true;
          } catch {
            return false;
          }
        },
        defaultMessage(args: ValidationArguments) {
          return `${args.property} must be a valid JSON object`;
        },
      },
    });
  };
}

export function IsValidTags(validationOptions?: ValidationOptions) {
  return function (object: Object, propertyName: string) {
    registerDecorator({
      name: 'isValidTags',
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      validator: {
        validate(value: any) {
          if (!Array.isArray(value)) return false;
          if (value.length > VALIDATION_LIMITS.MAX_ARRAY_LENGTH) return false;
          return value.every(tag => typeof tag === 'string' && tag.length <= VALIDATION_LIMITS.MAX_STRING_LENGTH);
        },
        defaultMessage(args: ValidationArguments) {
          return `${args.property} must be an array of strings with max length ${VALIDATION_LIMITS.MAX_ARRAY_LENGTH}`;
        },
      },
    });
  };
}

export function IsValidVersion(validationOptions?: ValidationOptions) {
  return function (object: Object, propertyName: string) {
    registerDecorator({
      name: 'isValidVersion',
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      validator: {
        validate(value: any) {
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
  return function (object: Object, propertyName: string) {
    registerDecorator({
      name: 'isValidPriority',
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      validator: {
        validate(value: any) {
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
  return function (object: Object, propertyName: string) {
    registerDecorator({
      name: 'isValidTimeoutMs',
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      validator: {
        validate(value: any) {
          if (typeof value !== 'number') return false;
          return value >= 0 && value <= 300000; // Max 5 minutes
        },
        defaultMessage(args: ValidationArguments) {
          return `${args.property} must be between 0 and 300000 milliseconds`;
        },
      },
    });
  };
}
