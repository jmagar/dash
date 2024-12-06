import { registerDecorator, ValidationOptions, ValidationArguments } from 'class-validator';
import { isStringRecord } from '../../../utils/type-utils';

/**
 * Validator decorator to ensure an object is a Record<string, string>
 * @param validationOptions - Options for the validation
 */
export function IsStringRecord(validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      name: 'isStringRecord',
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      validator: {
        validate(value: unknown): value is Record<string, string> {
          return isStringRecord(value);
        },
        defaultMessage(args: ValidationArguments) {
          return `${args.property} must be an object with string values`;
        },
      },
    });
  };
}
