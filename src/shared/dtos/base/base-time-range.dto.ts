import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsDate, IsOptional, IsString } from 'class-validator';

export class BaseTimeRangeDto {
  @ApiProperty({ description: 'Start date of the time range' })
  @Type(() => Date)
  @IsDate()
  startDate: Date;

  @ApiProperty({ description: 'End date of the time range' })
  @Type(() => Date)
  @IsDate()
  endDate: Date;

  @ApiProperty({ description: 'Timezone for the time range', required: false })
  @IsString()
  @IsOptional()
  timezone?: string;

  @ApiProperty({ description: 'Time range granularity (e.g., hour, day, month)', required: false })
  @IsString()
  @IsOptional()
  granularity?: string;

  constructor(partial: Partial<BaseTimeRangeDto>) {
    Object.assign(this, partial);
  }
}
