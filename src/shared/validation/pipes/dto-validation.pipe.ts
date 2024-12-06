import { ArgumentMetadata, Injectable, PipeTransform, BadRequestException } from '@nestjs/common';
import { validate } from 'class-validator';
import { plainToInstance, ClassConstructor } from 'class-transformer';

@Injectable()
export class DtoValidationPipe implements PipeTransform<unknown> {
  private readonly options: {
    whitelist: boolean;
    forbidNonWhitelisted: boolean;
    transform: boolean;
  };

  constructor(options = { whitelist: true, forbidNonWhitelisted: true, transform: true }) {
    this.options = options;
  }

  /**
   * Transform and validate incoming data
   * @param value - The value to transform and validate
   * @param metadata - Metadata about the value
   * @returns The transformed and validated value
   * @throws BadRequestException if validation fails
   */
  async transform(value: unknown, metadata: ArgumentMetadata): Promise<unknown> {
    const { metatype } = metadata;
    if (!metatype || !this.toValidate(metatype)) {
      return value;
    }

    const object = plainToInstance(metatype, value);
    const errors = await validate(object, {
      whitelist: this.options.whitelist,
      forbidNonWhitelisted: this.options.forbidNonWhitelisted,
    });

    if (errors.length > 0) {
      const messages = errors.map(error => {
        const constraints = error.constraints || {};
        return Object.values(constraints).join(', ');
      });

      throw new BadRequestException({
        message: 'Validation failed',
        errors: messages,
      });
    }

    return object;
  }

  /**
   * Check if a type should be validated
   * @param metatype - The type to check
   * @returns True if the type should be validated
   */
  private toValidate(metatype: ClassConstructor<unknown>): boolean {
    const types: ClassConstructor<unknown>[] = [
      String,
      Boolean,
      Number,
      Array,
      Object,
    ];
    return !types.includes(metatype);
  }
}
