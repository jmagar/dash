import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsBoolean, IsDate, IsEnum, IsNotEmpty, IsOptional, IsObject, IsString } from 'class-validator';
import { Type } from 'class-transformer';

export enum NotificationType {
  INFO = 'INFO',
  SUCCESS = 'SUCCESS',
  WARNING = 'WARNING',
  ERROR = 'ERROR',
  SYSTEM = 'SYSTEM',
}

export enum NotificationPriority {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  URGENT = 'URGENT',
}

export enum NotificationStatus {
  PENDING = 'PENDING',
  DELIVERED = 'DELIVERED',
  READ = 'READ',
  ARCHIVED = 'ARCHIVED',
}

export class BaseNotificationDto {
  @ApiProperty({ enum: NotificationType, description: 'Notification type' })
  @IsEnum(NotificationType)
  type!: NotificationType;

  @ApiProperty({ enum: NotificationPriority, description: 'Notification priority' })
  @IsEnum(NotificationPriority)
  priority!: NotificationPriority;

  @ApiProperty({ description: 'Notification title' })
  @IsString()
  @IsNotEmpty()
  title!: string;

  @ApiProperty({ description: 'Notification message' })
  @IsString()
  @IsNotEmpty()
  message!: string;

  @ApiProperty({ type: [String], description: 'Target users/groups' })
  @IsArray()
  @IsString({ each: true })
  recipients!: string[];

  @ApiProperty({ enum: NotificationStatus, description: 'Notification status' })
  @IsEnum(NotificationStatus)
  status!: NotificationStatus;

  @ApiProperty({ description: 'Creation timestamp' })
  @IsDate()
  @Type(() => Date)
  createdAt!: Date;

  @ApiProperty({ description: 'Expiration timestamp', required: false })
  @IsDate()
  @IsOptional()
  @Type(() => Date)
  expiresAt?: Date;

  @ApiProperty({ description: 'Has the notification been read' })
  @IsBoolean()
  @IsOptional()
  isRead?: boolean;

  @ApiProperty({ description: 'Additional metadata', required: false })
  @IsObject()
  @IsOptional()
  metadata?: Record<string, unknown>;

  constructor(partial?: Partial<BaseNotificationDto>) {
    // Set default values for optional fields only
    this.type = NotificationType.INFO;
    this.priority = NotificationPriority.LOW;
    this.status = NotificationStatus.PENDING;
    this.isRead = false;
    this.metadata = {};
    this.createdAt = new Date();

    if (partial) {
      Object.assign(this, {
        ...partial,
        createdAt: partial.createdAt ? new Date(partial.createdAt) : this.createdAt,
        expiresAt: partial.expiresAt ? new Date(partial.expiresAt) : undefined,
        metadata: partial.metadata || this.metadata,
        type: partial.type || this.type,
        priority: partial.priority || this.priority,
        status: partial.status || this.status,
        isRead: partial.isRead !== undefined ? partial.isRead : this.isRead
      });
    }
  }
}
