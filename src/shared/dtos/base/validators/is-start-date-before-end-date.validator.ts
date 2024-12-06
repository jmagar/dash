import { registerDecorator, ValidationOptions, ValidationArguments } from 'class-validator';
import { isIsoDateString } from '../../../utils/type-utils';

/**
 * Validator decorator to ensure start date is before end date
 * @param endDateField - Name of the end date field to compare against
 * @param validationOptions - Options for the validation
 */
export function IsStartDateBeforeEndDate(endDateField: string, validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      name: 'isStartDateBeforeEndDate',
      target: object.constructor,
      propertyName: propertyName,
      constraints: [endDateField],
      options: validationOptions,
      validator: {
        validate(startDate: unknown, args: ValidationArguments): boolean {
          if (!isIsoDateString(startDate)) {
            return false;
          }

          const [endDateField] = args.constraints;
          const endDate = (args.object as Record<string, unknown>)[endDateField];

          if (!isIsoDateString(endDate)) {
            return false;
          }

          const startTimestamp = new Date(startDate).getTime();
          const endTimestamp = new Date(endDate).getTime();

          return startTimestamp < endTimestamp;
        },
        defaultMessage(args: ValidationArguments) {
          const [endDateField] = args.constraints;
          return `${args.property} must be before ${endDateField}`;
        },
      },
    });
  };
}
