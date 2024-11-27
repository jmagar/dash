import { validate, ValidationError } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { BaseNotificationDto, NotificationType, NotificationPriority, NotificationStatus } from '../base-notification.dto';

describe('BaseNotificationDto', () => {
    describe('validation', () => {
        it('should enforce required fields with proper error messages', async () => {
            const dto = new BaseNotificationDto({});
            const errors = await validate(dto);
            
            // Check that we have validation errors
            expect(errors.length).toBeGreaterThan(0);
            
            // Create a map of property to constraints for easier testing
            const errorMap = errors.reduce((acc, err) => ({
                ...acc,
                [err.property]: Object.keys(err.constraints || {})
            }), {});
            
            // Check required fields
            expect(errorMap.title).toContain('isNotEmpty');
            expect(errorMap.message).toContain('isNotEmpty');
            expect(errorMap.recipients).toContain('isArray');
        });

        it('should accept valid required fields with optional fields using defaults', async () => {
            const dto = new BaseNotificationDto({
                title: 'Test Notification',
                message: 'This is a test notification',
                recipients: ['user1@example.com']
            });
            
            const errors = await validate(dto);
            expect(errors.length).toBe(0);
            
            // Check default values
            expect(dto.type).toBe(NotificationType.INFO);
            expect(dto.priority).toBe(NotificationPriority.LOW);
            expect(dto.status).toBe(NotificationStatus.PENDING);
            expect(dto.isRead).toBe(false);
            expect(dto.metadata).toEqual({});
        });

        it('should validate optional fields when provided', async () => {
            const dto = new BaseNotificationDto({
                title: 'Test Notification',
                message: 'This is a test notification',
                recipients: ['user1@example.com'],
                type: NotificationType.ALERT,
                priority: NotificationPriority.HIGH,
                status: NotificationStatus.DELIVERED,
                isRead: true,
                metadata: { category: 'test' }
            });
            
            const errors = await validate(dto);
            expect(errors.length).toBe(0);
        });

        it('should validate notification type enum', async () => {
            const dto = new BaseNotificationDto({
                type: 'INVALID' as NotificationType,
                priority: NotificationPriority.MEDIUM,
                title: 'Test',
                message: 'Test message',
                recipients: ['user1']
            });
            const errors: ValidationError[] = await validate(dto);
            expect(errors.length).toBeGreaterThan(0);
            expect(errors[0].property).toBe('type');
            expect(errors[0].constraints).toHaveProperty('isEnum');
        });

        it('should validate notification priority enum', async () => {
            const dto = new BaseNotificationDto({
                type: NotificationType.SYSTEM,
                priority: 'INVALID' as NotificationPriority,
                title: 'Test',
                message: 'Test message',
                recipients: ['user1']
            });
            const errors: ValidationError[] = await validate(dto);
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
                recipients: [123] as unknown as string[]
            });
            const errors: ValidationError[] = await validate(dto);
            expect(errors.length).toBeGreaterThan(0);
            expect(errors[0].property).toBe('recipients');
        });

        it('should validate dates correctly', async () => {
            const now = new Date();
            const dto = new BaseNotificationDto({
                type: NotificationType.INFO,
                priority: NotificationPriority.LOW,
                title: 'Test',
                message: 'Test message',
                recipients: ['user1'],
                createdAt: now,
                expiresAt: new Date(now.getTime() + 3600000) // 1 hour later
            });
            const errors: ValidationError[] = await validate(dto);
            expect(errors.length).toBe(0);
        });

        it('should validate metadata as an object', async () => {
            const dto = new BaseNotificationDto({
                type: NotificationType.INFO,
                priority: NotificationPriority.LOW,
                title: 'Test',
                message: 'Test message',
                recipients: ['user1'],
                metadata: 'invalid' as unknown as Record<string, unknown>
            });
            const errors: ValidationError[] = await validate(dto);
            expect(errors.length).toBeGreaterThan(0);
            expect(errors[0].property).toBe('metadata');
            expect(errors[0].constraints).toHaveProperty('isObject');
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

        it('should handle status changes', () => {
            const dto = new BaseNotificationDto({
                type: NotificationType.SYSTEM,
                priority: NotificationPriority.HIGH,
                title: 'Test',
                message: 'Test message',
                recipients: ['user1'],
                status: NotificationStatus.DELIVERED
            });
            expect(dto.status).toBe(NotificationStatus.DELIVERED);
        });
    });

    describe('serialization', () => {
        it('should serialize and deserialize correctly', () => {
            const data = {
                title: 'Test Notification',
                message: 'This is a test notification',
                type: NotificationType.INFO,
                priority: NotificationPriority.LOW,
                recipients: ['user1'],
                metadata: { source: 'test' }
            };
            const dto = new BaseNotificationDto(data);
            const serialized = JSON.stringify(dto);
            const deserialized = plainToInstance(BaseNotificationDto, JSON.parse(serialized));
            expect(deserialized).toBeInstanceOf(BaseNotificationDto);
            expect(deserialized.title).toBe(data.title);
            expect(deserialized.type).toBe(data.type);
            expect(deserialized.metadata).toEqual(data.metadata);
        });

        it('should handle date serialization', () => {
            const now = new Date();
            const dto = new BaseNotificationDto({
                title: 'Test',
                message: 'Test message',
                type: NotificationType.INFO,
                priority: NotificationPriority.LOW,
                recipients: ['user1'],
                createdAt: now,
                expiresAt: new Date(now.getTime() + 3600000)
            });
            const serialized = JSON.stringify(dto);
            const deserialized = plainToInstance(BaseNotificationDto, JSON.parse(serialized));
            expect(deserialized.createdAt).toBeInstanceOf(Date);
            expect(deserialized.expiresAt).toBeInstanceOf(Date);
            expect(deserialized.createdAt.getTime()).toBe(now.getTime());
        });

        it('should handle array serialization', () => {
            const notifications = [
                new BaseNotificationDto({
                    title: 'Test 1',
                    message: 'Test message 1',
                    type: NotificationType.INFO,
                    priority: NotificationPriority.LOW,
                    recipients: ['user1'],
                    metadata: { id: 1 }
                }),
                new BaseNotificationDto({
                    title: 'Test 2',
                    message: 'Test message 2', 
                    type: NotificationType.WARNING,
                    priority: NotificationPriority.HIGH,
                    recipients: ['user2'],
                    metadata: { id: 2 }
                })
            ];
            
            const serialized = JSON.stringify(notifications);
            const deserialized = plainToInstance(BaseNotificationDto, JSON.parse(serialized));
            
            // Verify each notification in the array
            expect(Array.isArray(deserialized)).toBe(true);
            expect(deserialized.length).toBe(2);
            
            // Check first notification
            expect(deserialized[0]).toBeInstanceOf(BaseNotificationDto);
            expect(deserialized[0].title).toBe('Test 1');
            expect(deserialized[0].type).toBe(NotificationType.INFO);
            expect(deserialized[0].metadata).toEqual({ id: 1 });
            
            // Check second notification
            expect(deserialized[1]).toBeInstanceOf(BaseNotificationDto);
            expect(deserialized[1].title).toBe('Test 2'); 
            expect(deserialized[1].type).toBe(NotificationType.WARNING);
            expect(deserialized[1].metadata).toEqual({ id: 2 });
        });
    });

    describe('Performance', () => {
        it('should validate within 1ms', async () => {
            const dto = new BaseNotificationDto({
                type: NotificationType.SYSTEM,
                priority: NotificationPriority.HIGH,
                title: 'Test',
                message: 'Test message',
                recipients: ['user1']
            });
            const start = process.hrtime.bigint();
            await validate(dto);
            const end = process.hrtime.bigint();
            const milliseconds = Number(end - start) / 1e6;
            expect(milliseconds).toBeLessThan(1);
        });

        it('should have small memory footprint', () => {
            const dto = new BaseNotificationDto({
                type: NotificationType.SYSTEM,
                priority: NotificationPriority.HIGH,
                title: 'Test',
                message: 'Test message',
                recipients: ['user1']
            });
            const size = Buffer.byteLength(JSON.stringify(dto));
            expect(size).toBeLessThan(1024); // Less than 1KB
        });
    });
});
