import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsNumber, IsObject, IsOptional, IsString } from 'class-validator';

export enum MetricType {
  COUNTER = 'COUNTER',
  GAUGE = 'GAUGE',
  HISTOGRAM = 'HISTOGRAM',
  SUMMARY = 'SUMMARY',
}

export class MetricValue {
  @ApiProperty({ description: 'Current value of the metric' })
  @IsNumber()
  value: number;

  @ApiProperty({ description: 'Metric type', enum: MetricType })
  @IsEnum(MetricType)
  type: MetricType;

  @ApiProperty({ description: 'Unit of measurement', required: false })
  @IsString()
  @IsOptional()
  unit?: string;

  @ApiProperty({ description: 'Timestamp of the measurement' })
  @IsString()
  timestamp: string = new Date().toISOString();

  constructor(partial: Partial<MetricValue>) {
    this.value = 0;
    this.type = MetricType.COUNTER;
    this.timestamp = new Date().toISOString();
    Object.assign(this, partial);
  }
}

export class BaseMetricsDto {
  @ApiProperty({ description: 'Name of the metric' })
  @IsString()
  name: string;

  @ApiProperty({ description: 'Description of what the metric measures' })
  @IsString()
  description: string;

  @ApiProperty({ description: 'Labels/tags for the metric', required: false })
  @IsObject()
  @IsOptional()
  labels?: Record<string, string>;

  @ApiProperty({ description: 'Current metric value', type: MetricValue })
  value: MetricValue;

  @ApiProperty({ description: 'Historical values', type: [MetricValue], required: false })
  @IsOptional()
  history?: MetricValue[];

  @ApiProperty({ description: 'Additional metric metadata', required: false })
  @IsObject()
  @IsOptional()
  metadata?: Record<string, any>;

  constructor(partial: Partial<BaseMetricsDto>) {
    this.name = '';
    this.description = '';
    this.value = new MetricValue({});
    Object.assign(this, partial);

    // Ensure value is properly instantiated
    if (partial.value) {
      this.value = new MetricValue(partial.value);
    }

    // Convert any history items to proper MetricValue instances
    if (partial.history) {
      this.history = partial.history.map(h => new MetricValue(h));
    }
  }
}
