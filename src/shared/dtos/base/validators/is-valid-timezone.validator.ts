import { ValidatorConstraint, ValidatorConstraintInterface, ValidationArguments } from 'class-validator';

@ValidatorConstraint({ name: 'isValidTimezone', async: false })
export class IsValidTimezone implements ValidatorConstraintInterface {
  validate(timezone: string, args: ValidationArguments) {
    if (!timezone) return true; // Optional field
    try {
      // Test if timezone is valid by attempting to format a date with it
      Intl.DateTimeFormat(undefined, { timeZone: timezone });
      return true;
    } catch (e) {
      return false;
    }
  }

  defaultMessage(args: ValidationArguments) {
    return `${args.property} must be a valid IANA timezone identifier`;
  }
}
