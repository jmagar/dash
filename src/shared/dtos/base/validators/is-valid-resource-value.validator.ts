import { registerDecorator, ValidationOptions, ValidationArguments } from 'class-validator';

/**
 * Validator decorator to ensure a number is a valid system resource value (CPU, memory, etc.)
 * Ensures the value is a non-negative finite number within reasonable bounds
 * @param options - Validation options including min and max values
 */
export function IsValidResourceValue(options: { min?: number; max?: number } = {}, validationOptions?: ValidationOptions) {
  const { min = 0, max = Number.MAX_SAFE_INTEGER } = options;

  return function (object: object, propertyName: string) {
    registerDecorator({
      name: 'isValidResourceValue',
      target: object.constructor,
      propertyName: propertyName,
      constraints: [min, max],
      options: validationOptions,
      validator: {
        validate(value: unknown): value is number {
          if (typeof value !== 'number') {
            return false;
          }
          return (
            Number.isFinite(value) &&
            value >= min &&
            value <= max
          );
        },
        defaultMessage(args: ValidationArguments) {
          const [min, max] = args.constraints;
          return `${args.property} must be a valid number between ${min} and ${max}`;
        },
      },
    });
  };
}
