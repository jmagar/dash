import { IsString, IsArray, ValidateNested, IsObject, IsBoolean, IsOptional, IsDate } from 'class-validator';
import { Type } from 'class-transformer';
import { Container, Stack } from '../../../types/models-shared';

export class DockerParams {
  @IsString()
  hostId: string;
}

export class ContainerDto {
  @IsString()
  id: string;

  @IsString()
  name: string;

  @IsString()
  image: string;

  @IsString()
  state: string;

  @IsString()
  status: string;

  @IsDate()
  created: Date;

  @IsOptional()
  @IsObject()
  ports?: Record<string, string[]>;

  @IsOptional()
  @IsObject()
  labels?: Record<string, string>;
}

export class StackDto {
  @IsString()
  id: string;

  @IsString()
  name: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ContainerDto)
  containers: ContainerDto[];

  @IsOptional()
  @IsObject()
  labels?: Record<string, string>;
}

export class ContainerResponse {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ContainerDto)
  containers: ContainerDto[];
}

export class StackResponse {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => StackDto)
  stacks: StackDto[];
}

export class CacheContainersDto {
  @IsString()
  hostId: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ContainerDto)
  containers: ContainerDto[];
}

export class CacheStacksDto {
  @IsString()
  hostId: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => StackDto)
  stacks: StackDto[];
}
