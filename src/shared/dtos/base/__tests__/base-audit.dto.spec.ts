import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { AuditAction, AuditChange, BaseAuditDto } from '../base-audit.dto';

describe('BaseAuditDto', () => {
    describe('Type Safety', () => {
        it('should enforce required fields', async () => {
            const dto = new BaseAuditDto({});
            const errors = await validate(dto);
            expect(errors.length).toBeGreaterThan(0);
            expect(errors.map(e => e.property)).toContain('action');
            expect(errors.map(e => e.property)).toContain('actor');
            expect(errors.map(e => e.property)).toContain('actorType');
            expect(errors.map(e => e.property)).toContain('resource');
            expect(errors.map(e => e.property)).toContain('resourceType');
        });
        it('should validate action enum values', async () => {
            const validDto = new BaseAuditDto({
                action: AuditAction.CREATE,
                actor: 'user1',
                actorType: 'user',
                resource: 'document',
                resourceType: 'file'
            });
            const validErrors = await validate(validDto);
            expect(validErrors.length).toBe(0);
            const invalidDto = new BaseAuditDto({
                action: 'INVALID_ACTION' as AuditAction,
                actor: 'user1',
                actorType: 'user',
                resource: 'document',
                resourceType: 'file'
            });
            const invalidErrors = await validate(invalidDto);
            expect(invalidErrors.length).toBeGreaterThan(0);
            expect(invalidErrors[0].property).toBe('action');
        });
        it('should validate AuditChange structure', async () => {
            const dto = new BaseAuditDto({
                action: AuditAction.UPDATE,
                actor: 'user1',
                actorType: 'user',
                resource: 'document',
                resourceType: 'file',
                changes: [
                    new AuditChange({ field: 'name', oldValue: 'old.txt', newValue: 'new.txt' }),
                    new AuditChange({ field: 'size', oldValue: 100, newValue: 200 })
                ]
            });
            const errors = await validate(dto);
            expect(errors.length).toBe(0);
        });
        it('should handle invalid AuditChange structure', async () => {
            const dto = new BaseAuditDto({
                action: AuditAction.UPDATE,
                actor: 'user1',
                actorType: 'user',
                resource: 'document',
                resourceType: 'file',
                changes: [
                    { field: 123, oldValue: 'old.txt', newValue: 'new.txt' } as unknown as AuditChange
                ]
            });
            const errors = await validate(dto);
            expect(errors.length).toBeGreaterThan(0);
            const changeErrors = errors.find(e => e.property === 'changes')?.children || [];
            expect(changeErrors[0]?.children?.[0]?.property).toBe('field');
        });
    });
    describe('Default Values', () => {
        it('should set default timestamp to current date', () => {
            const before = new Date();
            const dto = new BaseAuditDto({
                action: AuditAction.CREATE,
                actor: 'user1',
                actorType: 'user',
                resource: 'document',
                resourceType: 'file'
            });
            const after = new Date();
            expect(dto.timestamp.getTime()).toBeGreaterThanOrEqual(before.getTime());
            expect(dto.timestamp.getTime()).toBeLessThanOrEqual(after.getTime());
        });
        it('should set default values in constructor', () => {
            const dto = new BaseAuditDto({});
            expect(dto.action).toBe(AuditAction.READ);
            expect(dto.actor).toBe('');
            expect(dto.actorType).toBe('SYSTEM');
            expect(dto.resource).toBe('');
            expect(dto.resourceType).toBe('');
        });
    });
    describe('Serialization', () => {
        it('should properly serialize and deserialize', () => {
            const now = new Date();
            const original = new BaseAuditDto({
                action: AuditAction.UPDATE,
                actor: 'user1',
                actorType: 'user',
                resource: 'document',
                resourceType: 'file',
                timestamp: now,
                duration: 150,
                changes: [
                    new AuditChange({ field: 'name', oldValue: 'old.txt', newValue: 'new.txt' })
                ],
                metadata: { source: 'test' }
            });
            const serialized = JSON.stringify(original);
            const deserialized = plainToInstance(BaseAuditDto, JSON.parse(serialized));
            expect(deserialized).toBeInstanceOf(BaseAuditDto);
            expect(deserialized.action).toBe(original.action);
            expect(deserialized.actor).toBe(original.actor);
            expect(deserialized.actorType).toBe(original.actorType);
            expect(deserialized.resource).toBe(original.resource);
            expect(deserialized.resourceType).toBe(original.resourceType);
            expect(deserialized.timestamp.getTime()).toBe(original.timestamp.getTime());
            expect(deserialized.duration).toBe(original.duration);
            expect(deserialized.changes?.[0]).toBeInstanceOf(AuditChange);
            expect(deserialized.changes?.[0].field).toBe(original.changes?.[0].field);
            expect(deserialized.metadata).toEqual(original.metadata);
        });
        it('should handle optional fields', () => {
            const dto = new BaseAuditDto({
                action: AuditAction.CREATE,
                actor: 'user1',
                actorType: 'user',
                resource: 'document',
                resourceType: 'file'
            });
            expect(dto.duration).toBeUndefined();
            expect(dto.changes).toBeUndefined();
            expect(dto.metadata).toBeUndefined();
        });
    });
    describe('Array Serialization', () => {
        it('should handle array serialization correctly', () => {
            const auditLogs = [
                new BaseAuditDto({
                    action: AuditAction.CREATE,
                    actor: 'user1',
                    actorType: 'user',
                    resource: 'document1',
                    resourceType: 'file',
                    changes: [
                        new AuditChange({ field: 'name', oldValue: null, newValue: 'doc1.txt' })
                    ]
                }),
                new BaseAuditDto({
                    action: AuditAction.UPDATE,
                    actor: 'user2',
                    actorType: 'user',
                    resource: 'document2',
                    resourceType: 'file',
                    changes: [
                        new AuditChange({ field: 'content', oldValue: 'old', newValue: 'new' })
                    ]
                })
            ];

            const serialized = JSON.stringify(auditLogs);
            const deserialized = plainToInstance(BaseAuditDto, JSON.parse(serialized));

            // Verify array structure
            expect(Array.isArray(deserialized)).toBe(true);
            expect(deserialized.length).toBe(2);

            // Check first audit log
            expect(deserialized[0]).toBeInstanceOf(BaseAuditDto);
            expect(deserialized[0].action).toBe(AuditAction.CREATE);
            expect(deserialized[0].actor).toBe('user1');
            expect(deserialized[0].actorType).toBe('user');
            expect(deserialized[0].resource).toBe('document1');
            expect(deserialized[0].resourceType).toBe('file');
            expect(deserialized[0].changes?.[0]).toBeInstanceOf(AuditChange);
            expect(deserialized[0].changes?.[0].field).toBe('name');
            expect(deserialized[0].changes?.[0].newValue).toBe('doc1.txt');

            // Check second audit log
            expect(deserialized[1]).toBeInstanceOf(BaseAuditDto);
            expect(deserialized[1].action).toBe(AuditAction.UPDATE);
            expect(deserialized[1].actor).toBe('user2');
            expect(deserialized[1].actorType).toBe('user');
            expect(deserialized[1].resource).toBe('document2');
            expect(deserialized[1].resourceType).toBe('file');
            expect(deserialized[1].changes?.[0]).toBeInstanceOf(AuditChange);
            expect(deserialized[1].changes?.[0].field).toBe('content');
            expect(deserialized[1].changes?.[0].oldValue).toBe('old');
            expect(deserialized[1].changes?.[0].newValue).toBe('new');
        });
    });
});
