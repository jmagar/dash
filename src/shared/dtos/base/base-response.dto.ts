import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsOptional, IsString } from 'class-validator';

export class BaseResponseDto<T = unknown> {
  @ApiProperty({ description: 'Indicates if the operation was successful' })
  @IsBoolean()
  success!: boolean;

  @ApiProperty({ description: 'Response data', required: false })
  @IsOptional()
  data?: T;

  @ApiProperty({ description: 'Message describing the response', required: false })
  @IsString()
  @IsOptional()
  message?: string;

  @ApiProperty({ description: 'Timestamp of the response' })
  @IsString()
  timestamp: string = new Date().toISOString();

  @ApiProperty({ description: 'Error message', required: false })
  @IsOptional()
  error?: string;

  constructor(partial: Partial<BaseResponseDto<T>>) {
    this.success = false;
    Object.assign(this, partial);
  }
}
