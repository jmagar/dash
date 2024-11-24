import { ApiProperty, ApiPropertyOptional, ApiResponse, ApiExample } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
    IsString,
    IsNumber,
    IsOptional,
    IsObject,
    IsArray,
    ValidateNested,
    Min,
    Max,
    IsInt,
    IsDateString,
    IsEnum,
    IsBoolean,
    Matches,
    MaxLength
} from 'class-validator';
import { Command, CommandRequest, CommandResult } from '../../../../types/api-shared';
import { TerminalSize, TerminalOptions } from '../../../../types/terminal';
import { BaseResponseDto, PaginatedResponseDto } from './base.dto';
import { ConnectionStatus, CommandStatus, TerminalEventType, TerminalEventPayload } from './enums';

const ID_PATTERN = /^[a-zA-Z0-9-]+$/;
const MAX_ID_LENGTH = 36;

export class TerminalSizeDto implements TerminalSize {
    @ApiProperty({ description: 'Number of columns in the terminal', minimum: 1, example: 80 })
    @IsInt()
    @Min(1)
    @Max(500)
    cols: number;

    @ApiProperty({ description: 'Number of rows in the terminal', minimum: 1, example: 24 })
    @IsInt()
    @Min(1)
    @Max(500)
    rows: number;
}

export class TerminalOptionsDto implements Partial<TerminalOptions> {
    @ApiProperty({ description: 'Host ID for the terminal session', example: 'host-123' })
    @IsString()
    @Matches(ID_PATTERN)
    @MaxLength(MAX_ID_LENGTH)
    hostId: string;

    @ApiProperty({ description: 'Session ID for the terminal', example: 'session-123' })
    @IsString()
    @Matches(ID_PATTERN)
    @MaxLength(MAX_ID_LENGTH)
    sessionId: string;

    @ApiPropertyOptional({ description: 'Command to execute', example: 'ls -la' })
    @IsOptional()
    @IsString()
    @MaxLength(1000)
    command?: string;

    @ApiPropertyOptional({ description: 'Command arguments', example: ['-la', '/home'] })
    @IsOptional()
    @IsArray()
    @IsString({ each: true })
    @MaxLength(100, { each: true })
    args?: string[];

    @ApiPropertyOptional({ description: 'Working directory', example: '/home/user' })
    @IsOptional()
    @IsString()
    @MaxLength(1000)
    cwd?: string;

    @ApiPropertyOptional({ description: 'Environment variables' })
    @IsOptional()
    @IsObject()
    env?: Record<string, string>;

    @ApiProperty({ description: 'Terminal size configuration' })
    @ValidateNested()
    @Type(() => TerminalSizeDto)
    size: TerminalSizeDto;

    @ApiPropertyOptional({ description: 'Additional metadata' })
    @IsOptional()
    @IsObject()
    metadata?: Record<string, unknown>;
}

export class ExecuteCommandDto implements CommandRequest {
    @ApiProperty({ description: 'Command to execute', example: 'ls -la' })
    @IsString()
    @MaxLength(1000)
    command: string;

    @ApiPropertyOptional({ description: 'Working directory for command execution', example: '/home/user' })
    @IsOptional()
    @IsString()
    @MaxLength(1000)
    workingDirectory?: string;

    @ApiPropertyOptional({ description: 'Environment variables for command execution' })
    @IsOptional()
    @IsObject()
    environment?: Record<string, string>;

    @ApiPropertyOptional({ description: 'Command timeout in milliseconds', example: 30000 })
    @IsOptional()
    @IsNumber()
    @Min(0)
    @Max(3600000) // 1 hour
    timeout?: number;

    @ApiPropertyOptional({ description: 'Whether to run in shell', example: true })
    @IsOptional()
    @IsBoolean()
    shell?: boolean;

    @ApiPropertyOptional({ description: 'Whether to run with sudo', example: false })
    @IsOptional()
    @IsBoolean()
    sudo?: boolean;
}

export class CommandResultDto implements CommandResult {
    @ApiPropertyOptional({ description: 'Command standard output' })
    @IsOptional()
    @IsString()
    stdout?: string;

    @ApiPropertyOptional({ description: 'Command standard error' })
    @IsOptional()
    @IsString()
    stderr?: string;

    @ApiProperty({ description: 'Command exit code', example: 0 })
    @IsNumber()
    exitCode: number;

    @ApiPropertyOptional({ description: 'Error message if command failed' })
    @IsOptional()
    @IsString()
    error?: string;

    @ApiProperty({ description: 'Command execution duration in milliseconds', example: 100 })
    @IsNumber()
    duration: number;

    @ApiProperty({ description: 'Command execution status', enum: CommandStatus })
    @IsEnum(CommandStatus)
    status: CommandStatus;

    @ApiPropertyOptional({ description: 'Command start timestamp' })
    @IsOptional()
    @IsDateString()
    startedAt?: Date;

    @ApiPropertyOptional({ description: 'Command completion timestamp' })
    @IsOptional()
    @IsDateString()
    completedAt?: Date;
}

export class CreateTerminalSessionDto {
    @ApiProperty({ description: 'Host ID for the terminal session', example: 'host-123' })
    @IsString()
    @Matches(ID_PATTERN)
    @MaxLength(MAX_ID_LENGTH)
    hostId: string;

    @ApiPropertyOptional({ description: 'Initial command to execute', example: 'bash' })
    @IsOptional()
    @IsString()
    @MaxLength(1000)
    command?: string;

    @ApiPropertyOptional({ description: 'Working directory for the session', example: '/home/user' })
    @IsOptional()
    @IsString()
    @MaxLength(1000)
    cwd?: string;

    @ApiPropertyOptional({ description: 'Environment variables for the session' })
    @IsOptional()
    @IsObject()
    env?: Record<string, string>;

    @ApiProperty({ description: 'Terminal size configuration' })
    @ValidateNested()
    @Type(() => TerminalSizeDto)
    size: TerminalSizeDto;

    @ApiPropertyOptional({ description: 'Additional metadata' })
    @IsOptional()
    @IsObject()
    metadata?: Record<string, unknown>;
}

export class TerminalSessionResponseDto extends BaseResponseDto<{
    id: string;
    hostId: string;
    pid: number;
    title: string;
    status: ConnectionStatus;
    createdAt: Date;
    updatedAt: Date;
}> {
    @ApiProperty({ description: 'Session ID', example: 'session-123' })
    @IsString()
    @Matches(ID_PATTERN)
    @MaxLength(MAX_ID_LENGTH)
    id: string;

    @ApiProperty({ description: 'Host ID', example: 'host-123' })
    @IsString()
    @Matches(ID_PATTERN)
    @MaxLength(MAX_ID_LENGTH)
    hostId: string;

    @ApiProperty({ description: 'Process ID', example: 1234 })
    @IsNumber()
    pid: number;

    @ApiProperty({ description: 'Terminal title', example: 'bash' })
    @IsString()
    title: string;

    @ApiProperty({ description: 'Session status', enum: ConnectionStatus })
    @IsEnum(ConnectionStatus)
    status: ConnectionStatus;

    @ApiProperty({ description: 'Session creation timestamp' })
    @IsDateString()
    createdAt: Date;

    @ApiProperty({ description: 'Session last update timestamp' })
    @IsDateString()
    updatedAt: Date;
}

export class TerminalSessionListResponseDto extends PaginatedResponseDto<TerminalSessionResponseDto> {
    @ApiProperty({ description: 'List of terminal sessions', type: [TerminalSessionResponseDto] })
    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => TerminalSessionResponseDto)
    data: TerminalSessionResponseDto[];
}

export class TerminalDataDto {
    @ApiProperty({ description: 'Host ID', example: 'host-123' })
    @IsString()
    @Matches(ID_PATTERN)
    @MaxLength(MAX_ID_LENGTH)
    hostId: string;

    @ApiProperty({ description: 'Session ID', example: 'session-123' })
    @IsString()
    @Matches(ID_PATTERN)
    @MaxLength(MAX_ID_LENGTH)
    sessionId: string;

    @ApiProperty({ description: 'Terminal data content' })
    @IsString()
    data: string;
}

export class TerminalExitDto {
    @ApiProperty({ description: 'Host ID', example: 'host-123' })
    @IsString()
    @Matches(ID_PATTERN)
    @MaxLength(MAX_ID_LENGTH)
    hostId: string;

    @ApiProperty({ description: 'Session ID', example: 'session-123' })
    @IsString()
    @Matches(ID_PATTERN)
    @MaxLength(MAX_ID_LENGTH)
    sessionId: string;

    @ApiProperty({ description: 'Exit code', example: 0 })
    @IsNumber()
    code: number;
}

export class TerminalResizeDto extends TerminalSizeDto {
    @ApiProperty({ description: 'Host ID', example: 'host-123' })
    @IsString()
    @Matches(ID_PATTERN)
    @MaxLength(MAX_ID_LENGTH)
    hostId: string;

    @ApiProperty({ description: 'Session ID', example: 'session-123' })
    @IsString()
    @Matches(ID_PATTERN)
    @MaxLength(MAX_ID_LENGTH)
    sessionId: string;
}

export class TerminalSocketEventDto {
    @ApiProperty({ description: 'Event type', enum: TerminalEventType })
    @IsEnum(TerminalEventType)
    event: TerminalEventType;

    @ApiProperty({ description: 'Event payload' })
    @IsObject()
    @ValidateNested()
    payload: TerminalEventPayload;
}

export class TerminalSocketErrorDto {
    @ApiProperty({ description: 'Error code', example: 'CONN_ERROR' })
    @IsString()
    @MaxLength(50)
    code: string;

    @ApiProperty({ description: 'Error message' })
    @IsString()
    message: string;

    @ApiPropertyOptional({ description: 'Additional error details' })
    @IsOptional()
    @IsObject()
    details?: Record<string, unknown>;
}

export class TerminalStateDto {
    @ApiProperty({ description: 'Connection status', enum: ConnectionStatus })
    @IsEnum(ConnectionStatus)
    status: ConnectionStatus;

    @ApiProperty({ description: 'Loading state' })
    @IsBoolean()
    loading: boolean;

    @ApiPropertyOptional({ description: 'Error message if status is error' })
    @IsOptional()
    @IsString()
    error?: string;

    @ApiPropertyOptional({ description: 'Additional state information' })
    @IsOptional()
    @IsObject()
    metadata?: Record<string, unknown>;
}

export class TerminalConnectionDto {
    @ApiProperty({ description: 'Host ID', example: 'host-123' })
    @IsString()
    @Matches(ID_PATTERN)
    @MaxLength(MAX_ID_LENGTH)
    hostId: string;

    @ApiProperty({ description: 'Session ID', example: 'session-123' })
    @IsString()
    @Matches(ID_PATTERN)
    @MaxLength(MAX_ID_LENGTH)
    sessionId: string;

    @ApiProperty({ description: 'Connection status', enum: ConnectionStatus })
    @IsEnum(ConnectionStatus)
    status: ConnectionStatus;

    @ApiPropertyOptional({ description: 'Error message if status is error' })
    @IsOptional()
    @IsString()
    error?: string;

    @ApiPropertyOptional({ description: 'Additional connection metadata' })
    @IsOptional()
    @IsObject()
    metadata?: Record<string, unknown>;
}
