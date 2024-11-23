import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsOptional, IsEnum, IsNumber, IsBoolean, IsObject, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

/**
 * Host connection type enum
 */
export enum HostConnectionType {
  SSH = 'ssh',
  AGENT = 'agent',
  LOCAL = 'local'
}

/**
 * SSH credentials DTO
 */
export class SSHCredentialsDto {
  @ApiProperty({ description: 'SSH host address' })
  @IsString()
  @IsNotEmpty()
  host: string;

  @ApiProperty({ description: 'SSH port' })
  @IsNumber()
  port: number;

  @ApiProperty({ description: 'SSH username' })
  @IsString()
  @IsNotEmpty()
  username: string;

  @ApiPropertyOptional({ description: 'SSH password' })
  @IsOptional()
  @IsString()
  password?: string;

  @ApiPropertyOptional({ description: 'SSH private key' })
  @IsOptional()
  @IsString()
  privateKey?: string;

  @ApiPropertyOptional({ description: 'SSH private key passphrase' })
  @IsOptional()
  @IsString()
  passphrase?: string;
}

/**
 * Agent credentials DTO
 */
export class AgentCredentialsDto {
  @ApiProperty({ description: 'Agent endpoint URL' })
  @IsString()
  @IsNotEmpty()
  endpoint: string;

  @ApiProperty({ description: 'Agent API key' })
  @IsString()
  @IsNotEmpty()
  apiKey: string;
}

/**
 * Create host request DTO
 */
export class CreateHostDto {
  @ApiProperty({ description: 'Host name' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ description: 'Host description' })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({ description: 'Host connection type', enum: HostConnectionType })
  @IsEnum(HostConnectionType)
  type: HostConnectionType;

  @ApiPropertyOptional({ description: 'SSH credentials', type: () => SSHCredentialsDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => SSHCredentialsDto)
  sshCredentials?: SSHCredentialsDto;

  @ApiPropertyOptional({ description: 'Agent credentials', type: () => AgentCredentialsDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => AgentCredentialsDto)
  agentCredentials?: AgentCredentialsDto;

  @ApiPropertyOptional({ description: 'Host tags' })
  @IsOptional()
  @IsString({ each: true })
  tags?: string[];

  @ApiPropertyOptional({ description: 'Host metadata' })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;
}

/**
 * Update host request DTO
 */
export class UpdateHostDto extends CreateHostDto {
  @ApiPropertyOptional({ description: 'Host enabled status' })
  @IsOptional()
  @IsBoolean()
  enabled?: boolean;
}
