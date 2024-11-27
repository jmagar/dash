import { registerDecorator, ValidationOptions, ValidationArguments, ValidatorConstraint, ValidatorConstraintInterface } from 'class-validator';
import { BaseTimeRangeDto } from '../base-time-range.dto';

@ValidatorConstraint({ name: 'isStartDateBeforeEndDate', async: false })
export class IsStartDateBeforeEndDateConstraint implements ValidatorConstraintInterface {
  validate(startDate: unknown, args: ValidationArguments): boolean {
    // First check if startDate is valid
    if (!startDate || !(startDate instanceof Date)) {
      return true; // Let @IsDate handle this
    }
    
    // Get the object and ensure it's a BaseTimeRangeDto
    const object = args.object as BaseTimeRangeDto;
    if (!(object instanceof BaseTimeRangeDto)) {
      return false;
    }

    const endDate = object.endDate;
    if (!endDate || !(endDate instanceof Date)) {
      return true; // Let @IsDate handle this
    }

    return startDate.getTime() <= endDate.getTime();
  }

  defaultMessage(args: ValidationArguments): string {
    return 'startDate must be before or equal to endDate';
  }
}

export function IsStartDateBeforeEndDate(validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string): void {
    registerDecorator({
      name: 'isStartDateBeforeEndDate',
      target: object.constructor,
      propertyName: propertyName,
      constraints: [],
      options: validationOptions,
      validator: IsStartDateBeforeEndDateConstraint,
    });
  };
}
