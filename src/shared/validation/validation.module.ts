import { Module, ValidationPipe } from '@nestjs/common';
import { APP_PIPE } from '@nestjs/core';
import { validationConfig } from './validation.config';
import { DtoValidationPipe } from './pipes/dto-validation.pipe';

@Module({
  providers: [
    {
      provide: APP_PIPE,
      useFactory: () => {
        return new DtoValidationPipe();
      },
    },
    {
      provide: ValidationPipe,
      useFactory: () => {
        return new ValidationPipe(validationConfig);
      },
    },
  ],
  exports: [ValidationPipe],
})
export class ValidationModule {}
