import { registerDecorator, ValidationOptions, ValidationArguments, ValidatorConstraint, ValidatorConstraintInterface } from 'class-validator';
import { AuditInfo } from '../base-entity.dto';

@ValidatorConstraint({ name: 'isAuditDatesValid', async: false })
export class IsAuditDatesValidConstraint implements ValidatorConstraintInterface {
  validate(audit: AuditInfo, args: ValidationArguments) {
    if (!audit) return false;

    // Check if dates are valid Date objects
    if (!(audit.createdAt instanceof Date) || !(audit.updatedAt instanceof Date)) {
      return false;
    }

    // Check if deletedAt is a valid Date if provided
    if (audit.deletedAt && !(audit.deletedAt instanceof Date)) {
      return false;
    }

    // Check if updatedAt is after or equal to createdAt
    if (audit.updatedAt.getTime() < audit.createdAt.getTime()) {
      return false;
    }

    // If deletedAt is provided, check if it's after or equal to updatedAt
    if (audit.deletedAt && audit.deletedAt.getTime() < audit.updatedAt.getTime()) {
      return false;
    }

    return true;
  }

  defaultMessage(args: ValidationArguments) {
    return 'Audit dates are invalid. Ensure that: ' +
      '1) createdAt and updatedAt are valid dates, ' +
      '2) updatedAt is after or equal to createdAt, ' +
      '3) deletedAt (if provided) is after or equal to updatedAt';
  }
}

export function IsAuditDatesValid(validationOptions?: ValidationOptions) {
  return function (object: Object, propertyName: string) {
    registerDecorator({
      name: 'isAuditDatesValid',
      target: object.constructor,
      propertyName: propertyName,
      constraints: [],
      options: validationOptions,
      validator: IsAuditDatesValidConstraint,
    });
  };
}
