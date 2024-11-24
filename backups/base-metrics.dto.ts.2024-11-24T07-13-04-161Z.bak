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
    Object.assign(this, partial);
  }
}
