import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsNumber, IsObject, IsOptional, IsString, IsNotEmpty, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { validate } from 'class-validator';

export enum MetricType {
  COUNTER = 'COUNTER',
  GAUGE = 'GAUGE',
  HISTOGRAM = 'HISTOGRAM',
  SUMMARY = 'SUMMARY',
}

export class MetricValue {
  @ApiProperty({ description: 'Current value of the metric' })
  @IsNumber()
  value!: number;

  @ApiProperty({ description: 'Metric type', enum: MetricType })
  @IsEnum(MetricType)
  type!: MetricType;

  @ApiProperty({ description: 'Unit of measurement', required: false })
  @IsString()
  @IsOptional()
  unit?: string;

  @ApiProperty({ description: 'Timestamp of the measurement' })
  @IsString()
  timestamp!: string;

  constructor(partial?: Partial<MetricValue>) {
    // Initialize with default values
    this.value = 0;
    this.type = MetricType.COUNTER;
    this.timestamp = new Date().toISOString();

    if (partial) {
      Object.assign(this, partial);
    }
  }
}

export class BaseMetricsDto {
  @ApiProperty({ description: 'Name of the metric' })
  @IsString()
  @IsNotEmpty()
  name!: string;

  @ApiProperty({ description: 'Description of what the metric measures' })
  @IsString()
  @IsNotEmpty()
  description!: string;

  @ApiProperty({ description: 'Current value of the metric', type: MetricValue })
  @IsNotEmpty()
  @ValidateNested()
  @Type(() => MetricValue)
  value!: MetricValue;

  @ApiProperty({ description: 'Labels/tags for the metric', required: false })
  @IsObject()
  @IsOptional()
  labels?: Record<string, string>;

  @ApiProperty({ description: 'Historical values', type: [MetricValue], required: false })
  @ValidateNested({ each: true })
  @Type(() => MetricValue)
  @IsOptional()
  history?: MetricValue[];

  @ApiProperty({ description: 'Additional metadata', required: false })
  @IsObject()
  @IsOptional()
  metadata?: Record<string, any>;

  constructor(partial?: Partial<BaseMetricsDto>) {
    // Set default values for optional fields only
    this.history = undefined;
    this.metadata = undefined;
    this.labels = undefined;

    if (partial) {
      Object.assign(this, {
        ...partial,
        value: partial.value ? new MetricValue(partial.value) : undefined,
        history: partial.history ? partial.history.map(h => new MetricValue(h)) : this.history,
        metadata: partial.metadata || this.metadata,
        labels: partial.labels || this.labels
      });
    }
  }

  async isValid(): Promise<boolean> {
    const errors = await validate(this);
    return errors.length === 0;
  }
}
