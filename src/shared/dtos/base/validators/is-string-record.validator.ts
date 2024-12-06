import { registerDecorator, ValidationOptions, ValidationArguments } from 'class-validator';

export function IsStringRecord(validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      name: 'isStringRecord',
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      validator: {
        validate(value: unknown, args: ValidationArguments): boolean {
          if (value === null || value === undefined || typeof value !== 'object' || Array.isArray(value)) {
            return false;
          }
          return Object.values(value as Record<string, unknown>).every((item) => typeof item === 'string');
        },
        defaultMessage(args: ValidationArguments): string {
          return `${args.property} must be an object with string values`;
        },
      },
    });
  };
}
