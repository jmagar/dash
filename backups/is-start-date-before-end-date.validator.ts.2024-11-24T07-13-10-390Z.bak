import { registerDecorator, ValidationOptions, ValidationArguments, ValidatorConstraint, ValidatorConstraintInterface } from 'class-validator';

@ValidatorConstraint({ name: 'isStartDateBeforeEndDate', async: false })
export class IsStartDateBeforeEndDateConstraint implements ValidatorConstraintInterface {
  validate(startDate: Date, args: ValidationArguments) {
    if (!startDate || !(startDate instanceof Date)) return true; // Let @IsDate handle this
    
    const object = args.object as any;
    const endDate = object.endDate;
    if (!endDate || !(endDate instanceof Date)) return true; // Let @IsDate handle this

    return startDate.getTime() <= endDate.getTime();
  }

  defaultMessage(args: ValidationArguments) {
    return 'startDate must be before or equal to endDate';
  }
}

export function IsStartDateBeforeEndDate(validationOptions?: ValidationOptions) {
  return function (object: Object, propertyName: string) {
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
