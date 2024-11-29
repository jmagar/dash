import { IsString, IsBoolean, IsOptional, IsArray, ValidateNested, IsEnum } from 'class-validator';
import { Type } from 'class-transformer';

export enum ServiceStatus {
  UP = 'up',
  DOWN = 'down',
  DEGRADED = 'degraded'
}

export class ServiceError {
  @IsString()
  message: string;

  @IsOptional()
  @IsString()
  code?: string;

  @IsOptional()
  @IsString()
  details?: string;
}

export class ServiceInfo {
  @IsString()
  name: string;

  @IsEnum(ServiceStatus)
  status: ServiceStatus;

  @IsOptional()
  @ValidateNested()
  @Type(() => ServiceError)
  error?: ServiceError;

  @IsOptional()
  @IsString()
  version?: string;

  @IsOptional()
  @IsString()
  uptime?: string;
}

export class DatabaseStatus {
  @IsBoolean()
  connected: boolean;

  @IsOptional()
  @ValidateNested()
  @Type(() => ServiceError)
  error?: ServiceError;

  @IsOptional()
  @IsString()
  version?: string;

  @IsOptional()
  @IsString()
  latency?: string;
}

export class CacheStatus {
  @IsBoolean()
  connected: boolean;

  @IsOptional()
  @ValidateNested()
  @Type(() => ServiceError)
  error?: ServiceError;

  @IsOptional()
  @IsString()
  size?: string;

  @IsOptional()
  @IsString()
  hitRate?: string;
}

export class StatusInfo {
  @ValidateNested()
  @Type(() => DatabaseStatus)
  database: DatabaseStatus;

  @ValidateNested()
  @Type(() => CacheStatus)
  cache: CacheStatus;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ServiceInfo)
  services: ServiceInfo[];
}

export class StatusResponse {
  @IsBoolean()
  success: boolean;

  @ValidateNested()
  @Type(() => StatusInfo)
  status: StatusInfo;
}
