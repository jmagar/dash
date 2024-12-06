import { registerDecorator, ValidationOptions, ValidationArguments } from 'class-validator';

/**
 * Validator decorator to ensure a string is a valid file system path
 * Allows alphanumeric characters, underscores, hyphens, periods, and forward slashes
 * @param validationOptions - Options for the validation
 */
export function IsValidPath(validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      name: 'isValidPath',
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      validator: {
        validate(value: unknown): value is string {
          if (typeof value !== 'string') {
            return false;
          }
          // Allow alphanumeric characters, underscores, hyphens, periods, and forward slashes
          // Disallow consecutive slashes and trailing slashes
          const pathRegex = /^(?!.*\/\/)(?!.*\/$)[a-zA-Z0-9_\-./]+$/;
          return pathRegex.test(value);
        },
        defaultMessage(args: ValidationArguments) {
          return `${args.property} must be a valid path containing only alphanumeric characters, underscores, hyphens, periods, and forward slashes`;
        },
      },
    });
  };
}
