import { validate } from 'class-validator';
import { BaseEntityDto, AuditInfo } from '../base-entity.dto';

describe('BaseEntityDto', () => {
  const validUUID = '123e4567-e89b-12d3-a456-426614174000';
  const validAudit = {
    createdAt: new Date('2023-01-01T00:00:00Z'),
    createdBy: validUUID,
    updatedAt: new Date('2023-01-02T00:00:00Z'),
    updatedBy: validUUID
  };

  describe('Type Safety', () => {
    it('should enforce id as UUID', async () => {
      const dto = new BaseEntityDto({
        id: 'invalid-uuid',
        tenantId: validUUID,
        audit: validAudit
      });
      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      const idError = errors.find(e => e.property === 'id');
      expect(idError).toBeDefined();
      expect(idError?.constraints).toHaveProperty('isUuid');
    });

    it('should enforce tenantId as UUID', async () => {
      const dto = new BaseEntityDto({
        id: validUUID,
        tenantId: 'invalid-tenant',
        audit: validAudit
      });
      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      const tenantError = errors.find(e => e.property === 'tenantId');
      expect(tenantError).toBeDefined();
      expect(tenantError?.constraints).toHaveProperty('isUuid');
    });

    it('should validate metadata structure', async () => {
      const dto = new BaseEntityDto({
        id: validUUID,
        tenantId: validUUID,
        audit: validAudit,
        metadata: { key: 'value' }
      });
      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });

    it('should validate version as non-negative integer', async () => {
      const dto = new BaseEntityDto({
        id: validUUID,
        tenantId: validUUID,
        audit: validAudit,
        version: -1
      });
      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      const versionError = errors.find(e => e.property === 'version');
      expect(versionError).toBeDefined();
      expect(versionError?.constraints).toHaveProperty('min');
    });

    it('should validate tags format', async () => {
      const dto = new BaseEntityDto({
        id: validUUID,
        tenantId: validUUID,
        audit: validAudit,
        tags: ['', 'a'.repeat(51)]
      });
      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      const tagsError = errors.find(e => e.property === 'tags');
      expect(tagsError).toBeDefined();
      expect(tagsError?.constraints).toBeDefined();
    });
  });

  describe('Audit Validation', () => {
    it('should validate audit date order', async () => {
      const dto = new BaseEntityDto({
        id: validUUID,
        tenantId: validUUID,
        audit: {
          ...validAudit,
          updatedAt: new Date('2022-12-31T23:59:59Z') // Before createdAt
        }
      });
      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      const auditError = errors.find(e => e.property === 'audit');
      expect(auditError).toBeDefined();
      expect(auditError?.constraints).toHaveProperty('isAuditDatesValid');
    });

    it('should validate deletedAt date order', async () => {
      const dto = new BaseEntityDto({
        id: validUUID,
        tenantId: validUUID,
        audit: {
          ...validAudit,
          deletedAt: new Date('2022-12-31T23:59:59Z') // Before updatedAt
        }
      });
      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      const auditError = errors.find(e => e.property === 'audit');
      expect(auditError).toBeDefined();
      expect(auditError?.constraints).toHaveProperty('isAuditDatesValid');
    });
  });

  describe('Default Values', () => {
    it('should set default isActive to true', () => {
      const dto = new BaseEntityDto({
        id: validUUID,
        tenantId: validUUID,
        audit: validAudit
      });
      expect(dto.isActive).toBe(true);
    });

    it('should set default version to 0', () => {
      const dto = new BaseEntityDto({
        id: validUUID,
        tenantId: validUUID,
        audit: validAudit
      });
      expect(dto.version).toBe(0);
    });
  });

  describe('Performance', () => {
    it('should validate within 1ms', async () => {
      const dto = new BaseEntityDto({
        id: validUUID,
        tenantId: validUUID,
        audit: validAudit
      });

      const start = process.hrtime();
      await validate(dto);
      const [seconds, nanoseconds] = process.hrtime(start);
      const milliseconds = seconds * 1000 + nanoseconds / 1000000;
      
      expect(milliseconds).toBeLessThan(1);
    });

    it('should have memory footprint less than 2KB', () => {
      const dto = new BaseEntityDto({
        id: validUUID,
        tenantId: validUUID,
        audit: validAudit,
        metadata: { key: 'value' },
        tags: ['tag1', 'tag2']
      });

      const size = Buffer.byteLength(JSON.stringify(dto));
      expect(size).toBeLessThan(2048); // 2KB in bytes
    });
  });

  describe('Serialization', () => {
    it('should properly serialize and deserialize', () => {
      const original = new BaseEntityDto({
        id: validUUID,
        tenantId: validUUID,
        audit: {
          createdAt: new Date('2023-01-01T00:00:00Z'),
          createdBy: validUUID,
          updatedAt: new Date('2023-01-02T00:00:00Z'),
          updatedBy: validUUID,
          deletedAt: new Date('2023-01-03T00:00:00Z'),
          deletedBy: validUUID
        },
        version: 1,
        isActive: false,
        tags: ['tag1', 'tag2'],
        metadata: { key: 'value' }
      });

      const serialized = JSON.stringify(original);
      const deserialized = new BaseEntityDto(JSON.parse(serialized));

      expect(deserialized.id).toBe(original.id);
      expect(deserialized.tenantId).toBe(original.tenantId);
      expect(deserialized.audit.createdAt.toISOString()).toBe(original.audit.createdAt.toISOString());
      expect(deserialized.audit.updatedAt.toISOString()).toBe(original.audit.updatedAt.toISOString());
      expect(deserialized.audit.deletedAt?.toISOString()).toBe(original.audit.deletedAt?.toISOString());
      expect(deserialized.version).toBe(original.version);
      expect(deserialized.isActive).toBe(original.isActive);
      expect(deserialized.tags).toEqual(original.tags);
      expect(deserialized.metadata).toEqual(original.metadata);
    });

    it('should handle optional fields correctly', () => {
      const original = new BaseEntityDto({
        id: validUUID,
        tenantId: validUUID,
        audit: validAudit
      });

      const serialized = JSON.stringify(original);
      const deserialized = new BaseEntityDto(JSON.parse(serialized));

      expect(deserialized.version).toBe(0);
      expect(deserialized.isActive).toBe(true);
      expect(deserialized.tags).toBeUndefined();
      expect(deserialized.metadata).toBeUndefined();
    });
  });
});
