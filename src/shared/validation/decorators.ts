import { registerDecorator, ValidationOptions, ValidationArguments } from 'class-validator';
import { VALIDATION_PATTERNS } from './validation.config';

export function IsUUID(validationOptions?: ValidationOptions) {
  return function (object: Object, propertyName: string) {
    registerDecorator({
      name: 'isUUID',
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      validator: {
        validate(value: any) {
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
  return function (object: Object, propertyName: string) {
    registerDecorator({
      name: 'isHostname',
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      validator: {
        validate(value: any) {
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
  return function (object: Object, propertyName: string) {
    registerDecorator({
      name: 'isIpAddress',
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      validator: {
        validate(value: any) {
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
  return function (object: Object, propertyName: string) {
    registerDecorator({
      name: 'isStrongPassword',
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      validator: {
        validate(value: any) {
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
  return function (object: Object, propertyName: string) {
    registerDecorator({
      name: 'isValidUsername',
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      validator: {
        validate(value: any) {
          return typeof value === 'string' && VALIDATION_PATTERNS.USERNAME.test(value);
        },
        defaultMessage(args: ValidationArguments) {
          return `${args.property} must be a valid username`;
        },
      },
    });
  };
}
