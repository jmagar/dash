import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
    IsString,
    IsUUID,
    IsOptional,
    IsBoolean,
    IsDate,
    IsNumber,
    IsEnum,
    IsArray,
    Min,
    Max,
    ValidateNested
} from 'class-validator';

export enum NotificationType {
    ALERT = 'alert',
    INFO = 'info',
    SUCCESS = 'success',
    WARNING = 'warning',
    ERROR = 'error'
}

export class GetNotificationsQueryDto {
    @ApiProperty({ description: 'User ID to get notifications for' })
    @IsUUID()
    userId: string;

    @ApiPropertyOptional({ description: 'Filter by notification types', enum: NotificationType, isArray: true })
    @IsOptional()
    @IsArray()
    @IsEnum(NotificationType, { each: true })
    type?: NotificationType[];

    @ApiPropertyOptional({ description: 'Filter by read status' })
    @IsOptional()
    @IsBoolean()
    read?: boolean;

    @ApiPropertyOptional({ description: 'Filter by start date' })
    @IsOptional()
    @Type(() => Date)
    @IsDate()
    startDate?: Date;

    @ApiPropertyOptional({ description: 'Filter by end date' })
    @IsOptional()
    @Type(() => Date)
    @IsDate()
    endDate?: Date;

    @ApiPropertyOptional({ description: 'Maximum number of notifications to return', minimum: 1, maximum: 100 })
    @IsOptional()
    @IsNumber()
    @Min(1)
    @Max(100)
    limit?: number;

    @ApiPropertyOptional({ description: 'Number of notifications to skip', minimum: 0 })
    @IsOptional()
    @IsNumber()
    @Min(0)
    offset?: number;
}

export class CreateNotificationDto {
    @ApiProperty({ description: 'User ID to create notification for' })
    @IsUUID()
    userId: string;

    @ApiProperty({ description: 'Notification type', enum: NotificationType })
    @IsEnum(NotificationType)
    type: NotificationType;

    @ApiProperty({ description: 'Notification title' })
    @IsString()
    title: string;

    @ApiProperty({ description: 'Notification message' })
    @IsString()
    message: string;

    @ApiPropertyOptional({ description: 'Additional metadata for the notification' })
    @IsOptional()
    metadata?: Record<string, unknown>;
}

export class UpdateNotificationDto {
    @ApiProperty({ description: 'Notification ID to update' })
    @IsUUID()
    id: string;

    @ApiPropertyOptional({ description: 'New read status' })
    @IsOptional()
    @IsBoolean()
    read?: boolean;

    @ApiPropertyOptional({ description: 'New notification type', enum: NotificationType })
    @IsOptional()
    @IsEnum(NotificationType)
    type?: NotificationType;

    @ApiPropertyOptional({ description: 'New notification title' })
    @IsOptional()
    @IsString()
    title?: string;

    @ApiPropertyOptional({ description: 'New notification message' })
    @IsOptional()
    @IsString()
    message?: string;

    @ApiPropertyOptional({ description: 'Updated metadata' })
    @IsOptional()
    metadata?: Record<string, unknown>;
}

export class DeleteNotificationsDto {
    @ApiProperty({ description: 'IDs of notifications to delete' })
    @IsArray()
    @IsUUID('4', { each: true })
    ids: string[];
}

export class NotificationResponseDto {
    @ApiProperty({ description: 'Notification ID' })
    @IsUUID()
    id: string;

    @ApiProperty({ description: 'User ID the notification belongs to' })
    @IsUUID()
    userId: string;

    @ApiProperty({ description: 'Notification type', enum: NotificationType })
    @IsEnum(NotificationType)
    type: NotificationType;

    @ApiProperty({ description: 'Notification title' })
    @IsString()
    title: string;

    @ApiProperty({ description: 'Notification message' })
    @IsString()
    message: string;

    @ApiProperty({ description: 'Whether the notification has been read' })
    @IsBoolean()
    read: boolean;

    @ApiProperty({ description: 'When the notification was created' })
    @Type(() => Date)
    @IsDate()
    createdAt: Date;

    @ApiPropertyOptional({ description: 'When the notification was last updated' })
    @Type(() => Date)
    @IsDate()
    updatedAt: Date;

    @ApiPropertyOptional({ description: 'Additional metadata' })
    @IsOptional()
    metadata?: Record<string, unknown>;
}

export class NotificationsResponseDto {
    @ApiProperty({ description: 'List of notifications', type: [NotificationResponseDto] })
    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => NotificationResponseDto)
    notifications: NotificationResponseDto[];

    @ApiProperty({ description: 'Total number of notifications matching the query' })
    @IsNumber()
    total: number;
}
