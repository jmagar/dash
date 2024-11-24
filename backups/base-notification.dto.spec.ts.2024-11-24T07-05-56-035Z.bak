import { validate } from 'class-validator';
import { BaseNotificationDto } from '../base-notification.dto';
import { NotificationType, NotificationPriority, NotificationStatus } from '../enums';

describe('BaseNotificationDto', () => {
  describe('Type Safety', () => {
    it('should enforce required fields', async () => {
      const dto = new BaseNotificationDto({} as any);
      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      
      const constraints = errors.reduce((acc, err) => ({
        ...acc,
        [err.property]: Object.keys(err.constraints || {})
      }), {});
      
      expect(constraints).toHaveProperty('type');
      expect(constraints).toHaveProperty('priority');
      expect(constraints).toHaveProperty('title');
      expect(constraints).toHaveProperty('message');
      expect(constraints).toHaveProperty('recipients');
    });

    it('should validate notification type enum', async () => {
      const dto = new BaseNotificationDto({
        type: 'INVALID' as any,
        priority: NotificationPriority.MEDIUM,
        title: 'Test',
        message: 'Test message',
        recipients: ['user1']
      });
      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].property).toBe('type');
      expect(errors[0].constraints).toHaveProperty('isEnum');
    });

    it('should validate notification priority enum', async () => {
      const dto = new BaseNotificationDto({
        type: NotificationType.SYSTEM,
        priority: 'INVALID' as any,
        title: 'Test',
        message: 'Test message',
        recipients: ['user1']
      });
      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].property).toBe('priority');
      expect(errors[0].constraints).toHaveProperty('isEnum');
    });

    it('should validate recipients as string array', async () => {
      const dto = new BaseNotificationDto({
        type: NotificationType.SYSTEM,
        priority: NotificationPriority.HIGH,
        title: 'Test',
        message: 'Test message',
        recipients: [123] as any
      });
      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].property).toBe('recipients');
    });
  });

  describe('Status Management', () => {
    it('should initialize with PENDING status', () => {
      const dto = new BaseNotificationDto({
        type: NotificationType.SYSTEM,
        priority: NotificationPriority.HIGH,
        title: 'Test',
        message: 'Test message',
        recipients: ['user1']
      });
      
      expect(dto.status).toBe(NotificationStatus.PENDING);
    });

    it('should allow status override', async () => {
      const dto = new BaseNotificationDto({
        type: NotificationType.SYSTEM,
        priority: NotificationPriority.HIGH,
        title: 'Test',
        message: 'Test message',
        recipients: ['user1'],
        status: NotificationStatus.DELIVERED
      });
      
      const errors = await validate(dto);
      expect(errors.length).toBe(0);
      expect(dto.status).toBe(NotificationStatus.DELIVERED);
    });
  });

  describe('Performance', () => {
    it('should validate within 1ms', async () => {
      const dto = new BaseNotificationDto({
        type: NotificationType.SYSTEM,
        priority: NotificationPriority.HIGH,
        title: 'Test',
        message: 'Test message',
        recipients: ['user1', 'user2'],
        actionUrl: 'https://example.com',
        metadata: {
          source: 'test',
          category: 'test'
        }
      });

      const start = process.hrtime();
      await validate(dto);
      const [seconds, nanoseconds] = process.hrtime(start);
      const milliseconds = seconds * 1000 + nanoseconds / 1000000;
      
      expect(milliseconds).toBeLessThan(1);
    });

    it('should have memory footprint less than 2KB', () => {
      const dto = new BaseNotificationDto({
        type: NotificationType.SYSTEM,
        priority: NotificationPriority.HIGH,
        title: 'Test Notification',
        message: 'This is a test notification message',
        recipients: ['user1', 'user2', 'user3'],
        status: NotificationStatus.PENDING,
        createdAt: new Date(),
        expiresAt: new Date(),
        isRead: false,
        actionUrl: 'https://example.com/action',
        metadata: {
          source: 'test-suite',
          category: 'test',
          tags: ['important', 'test']
        }
      });

      const size = Buffer.byteLength(JSON.stringify(dto));
      expect(size).toBeLessThan(2048); // 2KB in bytes
    });
  });

  describe('Serialization', () => {
    it('should properly serialize and deserialize with all fields', () => {
      const createdAt = new Date();
      const expiresAt = new Date(createdAt.getTime() + 86400000); // +1 day
      
      const original = new BaseNotificationDto({
        type: NotificationType.SYSTEM,
        priority: NotificationPriority.HIGH,
        title: 'Test',
        message: 'Test message',
        recipients: ['user1', 'user2'],
        status: NotificationStatus.PENDING,
        createdAt,
        expiresAt,
        isRead: false,
        actionUrl: 'https://example.com',
        metadata: { test: true }
      });

      const serialized = JSON.stringify(original);
      const deserialized = new BaseNotificationDto(JSON.parse(serialized));

      expect(deserialized).toBeInstanceOf(BaseNotificationDto);
      expect(deserialized.type).toBe(original.type);
      expect(deserialized.priority).toBe(original.priority);
      expect(deserialized.title).toBe(original.title);
      expect(deserialized.message).toBe(original.message);
      expect(deserialized.recipients).toEqual(original.recipients);
      expect(new Date(deserialized.createdAt).getTime()).toBe(createdAt.getTime());
      expect(new Date(deserialized.expiresAt!).getTime()).toBe(expiresAt.getTime());
    });

    it('should handle optional fields correctly', () => {
      const original = new BaseNotificationDto({
        type: NotificationType.SYSTEM,
        priority: NotificationPriority.LOW,
        title: 'Test',
        message: 'Test message',
        recipients: ['user1']
      });

      const serialized = JSON.stringify(original);
      const deserialized = new BaseNotificationDto(JSON.parse(serialized));

      expect(deserialized.expiresAt).toBeUndefined();
      expect(deserialized.actionUrl).toBeUndefined();
      expect(deserialized.metadata).toBeUndefined();
    });
  });

  describe('Read Status', () => {
    it('should initialize as unread', () => {
      const dto = new BaseNotificationDto({
        type: NotificationType.SYSTEM,
        priority: NotificationPriority.HIGH,
        title: 'Test',
        message: 'Test message',
        recipients: ['user1']
      });
      
      expect(dto.isRead).toBe(false);
    });

    it('should allow marking as read', async () => {
      const dto = new BaseNotificationDto({
        type: NotificationType.SYSTEM,
        priority: NotificationPriority.HIGH,
        title: 'Test',
        message: 'Test message',
        recipients: ['user1'],
        isRead: true
      });
      
      const errors = await validate(dto);
      expect(errors.length).toBe(0);
      expect(dto.isRead).toBe(true);
    });
  });
});
