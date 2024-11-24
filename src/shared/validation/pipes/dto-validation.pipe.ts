import { PipeTransform, Injectable, ArgumentMetadata, BadRequestException } from '@nestjs/common';
import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { BaseErrorDto } from '../../dtos/base/base-error.dto';

@Injectable()
export class DtoValidationPipe implements PipeTransform<any> {
  async transform(value: any, { metatype }: ArgumentMetadata) {
    if (!metatype || !this.toValidate(metatype)) {
      return value;
    }

    const object = plainToInstance(metatype, value);
    const errors = await validate(object);

    if (errors.length > 0) {
      const validationError = new BaseErrorDto({
        code: 'VALIDATION_ERROR',
        category: 'Validation',
        message: 'Request validation failed',
        severity: 'ERROR',
        details: this.formatErrors(errors),
        metadata: {
          validationErrors: errors.map(error => ({
            property: error.property,
            constraints: error.constraints,
            value: error.value
          }))
        }
      });

      throw new BadRequestException(validationError);
    }

    return object;
  }

  private toValidate(metatype: Function): boolean {
    const types: Function[] = [String, Boolean, Number, Array, Object];
    return !types.includes(metatype);
  }

  private formatErrors(errors: any[]): string {
    return errors
      .map(error => {
        if (error.constraints) {
          return Object.values(error.constraints).join(', ');
        }
        return `Invalid value for ${error.property}`;
      })
      .join('; ');
  }
}
