import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsBoolean, IsDate, IsEnum, IsOptional, IsString } from 'class-validator';

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
  @ApiProperty({ description: 'Notification type', enum: NotificationType })
  @IsEnum(NotificationType)
  type: NotificationType;

  @ApiProperty({ description: 'Notification priority', enum: NotificationPriority })
  @IsEnum(NotificationPriority)
  priority: NotificationPriority;

  @ApiProperty({ description: 'Notification title' })
  @IsString()
  title: string;

  @ApiProperty({ description: 'Notification message' })
  @IsString()
  message: string;

  @ApiProperty({ description: 'Target users/groups', type: [String] })
  @IsArray()
  @IsString({ each: true })
  recipients: string[];

  @ApiProperty({ description: 'Notification status', enum: NotificationStatus })
  @IsEnum(NotificationStatus)
  status: NotificationStatus = NotificationStatus.PENDING;

  @ApiProperty({ description: 'When the notification was created' })
  @IsDate()
  createdAt: Date = new Date();

  @ApiProperty({ description: 'When the notification expires', required: false })
  @IsOptional()
  @IsDate()
  expiresAt?: Date;

  @ApiProperty({ description: 'Whether the notification is read' })
  @IsBoolean()
  isRead: boolean = false;

  @ApiProperty({ description: 'Action URL for the notification', required: false })
  @IsString()
  @IsOptional()
  actionUrl?: string;

  @ApiProperty({ description: 'Additional notification data', required: false })
  @IsOptional()
  metadata?: Record<string, any>;

  constructor(partial: Partial<BaseNotificationDto>) {
    Object.assign(this, partial);
  }
}
