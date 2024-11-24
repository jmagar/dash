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

  @ApiProperty({ description: 'Creation timestamp' })
  @IsDate()
  createdAt: Date = new Date();

  @ApiProperty({ description: 'Expiration timestamp', required: false })
  @IsDate()
  @IsOptional()
  expiresAt?: Date;

  @ApiProperty({ description: 'Is notification read', required: false })
  @IsBoolean()
  @IsOptional()
  isRead?: boolean = false;

  @ApiProperty({ description: 'Additional metadata', required: false })
  @IsOptional()
  metadata?: Record<string, any>;

  constructor(partial: Partial<BaseNotificationDto>) {
    this.type = NotificationType.INFO;
    this.priority = NotificationPriority.LOW;
    this.title = '';
    this.message = '';
    this.recipients = [];
    this.status = NotificationStatus.PENDING;
    this.createdAt = new Date();
    this.isRead = false;
    
    Object.assign(this, partial);
  }
}
