import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { AuditAction, BaseAuditDto } from '../base-audit.dto';

describe('BaseAuditDto', () => {
  describe('Type Safety', () => {
    it('should enforce required fields', async () => {
      const dto = new BaseAuditDto({});
      const errors: Error[] = await validate(dto);
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
          { field: 'name', oldValue: 'old.txt', newValue: 'new.txt' },
          { field: 'size', oldValue: 100, newValue: 200 }
        ]
      });
      const errors: Error[] = await validate(dto);
      expect(errors.length).toBe(0);
    });
  });

  describe('Default Values', () => {
    it('should set default timestamp to current time', () => {
      const before = new Date();
      const dto = new BaseAuditDto({
        action: AuditAction.CREATE,
        actor: 'user1',
        actorType: 'user',
        resource: 'document',
        resourceType: 'file'
      });
      const after = new Date();
      
      expect(dto.timestamp).toBeInstanceOf(Date);
      expect(dto.timestamp.getTime()).toBeGreaterThanOrEqual(before.getTime());
      expect(dto.timestamp.getTime()).toBeLessThanOrEqual(after.getTime());
    });
  });

  describe('Optional Fields', () => {
    it('should accept valid optional fields', async () => {
      const dto = new BaseAuditDto({
        action: AuditAction.UPDATE,
        actor: 'user1',
        actorType: 'user',
        resource: 'document',
        resourceType: 'file',
        duration: 1500,
        metadata: { ip: '127.0.0.1', browser: 'Chrome' }
      });
      const errors: Error[] = await validate(dto);
      expect(errors.length).toBe(0);
    });

    it('should validate metadata as object', async () => {
      const dto = new BaseAuditDto({
        action: AuditAction.CREATE,
        actor: 'user1',
        actorType: 'user',
        resource: 'document',
        resourceType: 'file',
        metadata: 'invalid' as unknown
      });
      const errors: Error[] = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].property).toBe('metadata');
    });
  });

  describe('Performance', () => {
    it('should validate within 1ms', async () => {
      const dto = new BaseAuditDto({
        action: AuditAction.CREATE,
        actor: 'user1',
        actorType: 'user',
        resource: 'document',
        resourceType: 'file'
      });
      
      const start = process.hrtime();
      await validate(dto);
      const [seconds, nanoseconds] = process.hrtime(start);
      const milliseconds = seconds * 1000 + nanoseconds / 1000000;
      
      expect(milliseconds).toBeLessThan(1);
    });

    it('should have memory footprint less than 2KB', () => {
      const dto = new BaseAuditDto({
        action: AuditAction.CREATE,
        actor: 'user1',
        actorType: 'user',
        resource: 'document',
        resourceType: 'file',
        changes: [
          { field: 'name', oldValue: 'old.txt', newValue: 'new.txt' }
        ],
        metadata: { ip: '127.0.0.1', browser: 'Chrome' }
      });
      
      const size: number = Buffer.byteLength(JSON.stringify(dto));
      expect(size).toBeLessThan(2048); // 2KB
    });
  });

  describe('Serialization', () => {
    it('should properly serialize and deserialize', () => {
      const original = new BaseAuditDto({
        action: AuditAction.UPDATE,
        actor: 'user1',
        actorType: 'user',
        resource: 'document',
        resourceType: 'file',
        changes: [
          { field: 'name', oldValue: 'old.txt', newValue: 'new.txt' }
        ],
        metadata: { ip: '127.0.0.1' }
      });

      const serialized = JSON.stringify(original);
      const deserialized = plainToInstance(BaseAuditDto, JSON.parse(serialized));

      expect(deserialized).toBeInstanceOf(BaseAuditDto);
      expect(deserialized.action).toBe(original.action);
      expect(deserialized.actor).toBe(original.actor);
      expect(deserialized.changes).toEqual(original.changes);
      expect(deserialized.metadata).toEqual(original.metadata);
    });

    it('should handle optional fields correctly', () => {
      const original = new BaseAuditDto({
        action: AuditAction.CREATE,
        actor: 'user1',
        actorType: 'user',
        resource: 'document',
        resourceType: 'file'
      });

      const serialized = JSON.stringify(original);
      const deserialized = plainToInstance(BaseAuditDto, JSON.parse(serialized));

      expect(deserialized.changes).toBeUndefined();
      expect(deserialized.metadata).toBeUndefined();
      expect(deserialized.duration).toBeUndefined();
    });
  });
});
