import { registerDecorator, ValidationOptions, ValidationArguments } from 'class-validator';

/**
 * Validator decorator to ensure a string is valid for notes/descriptions
 * Allows alphanumeric characters, basic punctuation, and common whitespace
 * @param validationOptions - Options for the validation
 */
export function IsValidNotes(validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      name: 'isValidNotes',
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      validator: {
        validate(value: unknown): value is string {
          if (typeof value !== 'string') {
            return false;
          }
          // Allow letters, numbers, punctuation, and common whitespace
          // Disallow control characters and excessive whitespace
          const notesRegex = /^[\p{L}\p{N}\p{P}\s]{1,1000}$/u;
          return notesRegex.test(value.trim());
        },
        defaultMessage(args: ValidationArguments) {
          return `${args.property} must be a valid text containing only letters, numbers, punctuation, and reasonable whitespace (max 1000 characters)`;
        },
      },
    });
  };
}
