import { registerDecorator, ValidationOptions, ValidationArguments } from 'class-validator';
import { VALIDATION_PATTERNS } from './validation.config';

export function IsUUID(validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      name: 'isUUID',
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      validator: {
        validate(value: string): boolean {
          return typeof value === 'string' && VALIDATION_PATTERNS.UUID.test(value);
        },
        defaultMessage(args: ValidationArguments) {
          return `${args.property} must be a valid UUID`;
        },
      },
    });
  };
}

export function IsHostname(validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      name: 'isHostname',
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      validator: {
        validate(value: string): boolean {
          return typeof value === 'string' && VALIDATION_PATTERNS.HOSTNAME.test(value);
        },
        defaultMessage(args: ValidationArguments) {
          return `${args.property} must be a valid hostname`;
        },
      },
    });
  };
}

export function IsIpAddress(validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      name: 'isIpAddress',
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      validator: {
        validate(value: string): boolean {
          return typeof value === 'string' && VALIDATION_PATTERNS.IP_ADDRESS.test(value);
        },
        defaultMessage(args: ValidationArguments) {
          return `${args.property} must be a valid IP address`;
        },
      },
    });
  };
}

export function IsStrongPassword(validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      name: 'isStrongPassword',
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      validator: {
        validate(value: string): boolean {
          return typeof value === 'string' && VALIDATION_PATTERNS.PASSWORD.test(value);
        },
        defaultMessage(args: ValidationArguments) {
          return `${args.property} must be a strong password`;
        },
      },
    });
  };
}

export function IsValidUsername(validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      name: 'isValidUsername',
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      validator: {
        validate(value: string): boolean {
          return typeof value === 'string' && VALIDATION_PATTERNS.USERNAME.test(value);
        },
        defaultMessage(args: ValidationArguments) {
          return `${args.property} must be a valid username`;
        },
      },
    });
  };
}

export function IsValidId(validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      name: 'isValidId',
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      validator: {
        validate(value: string | number): boolean {
          if (typeof value === 'string') {
            return /^[a-zA-Z0-9_-]+$/.test(value);
          }
          if (typeof value === 'number') {
            return Number.isInteger(value) && value > 0;
          }
          return false;
        },
      },
    });
  };
}

export function IsValidName(validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      name: 'isValidName',
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      validator: {
        validate(value: string): boolean {
          return typeof value === 'string' && /^[a-zA-Z0-9_\- ]+$/.test(value);
        },
      },
    });
  };
}

export function IsValidPath(validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      name: 'isValidPath',
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      validator: {
        validate(value: string): boolean {
          return typeof value === 'string' && /^[a-zA-Z0-9_\-/.]+$/.test(value);
        },
      },
    });
  };
}

export function IsValidEmail(validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      name: 'isValidEmail',
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      validator: {
        validate(value: string): boolean {
          return typeof value === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
        },
      },
    });
  };
}

export function IsValidPassword(validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      name: 'isValidPassword',
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      validator: {
        validate(value: string): boolean {
          return typeof value === 'string' && value.length >= 8;
        },
      },
    });
  };
}
