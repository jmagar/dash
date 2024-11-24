import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { BasePermissionDto, PermissionType, ResourceType, PermissionLevel } from '../base-permission.dto';

describe('BasePermissionDto', () => {
  describe('Type Safety', () => {
    it('should enforce required fields', async () => {
      const dto = new BasePermissionDto({});
      const errors = await validate(dto);
      expect(errors.map(e => e.property)).toContain('type');
      expect(errors.map(e => e.property)).toContain('resourceType');
      expect(errors.map(e => e.property)).toContain('resourceId');
    });

    it('should validate permission type enum', async () => {
      const dto = new BasePermissionDto({
        type: 'INVALID' as PermissionType,
        resourceType: ResourceType.FILE,
        resourceId: 'test-file'
      });
      const errors = await validate(dto);
      expect(errors.some(err => err.property === 'type')).toBeTruthy();
    });

    it('should validate resource type enum', async () => {
      const dto = new BasePermissionDto({
        type: PermissionType.READ,
        resourceType: 'INVALID' as ResourceType,
        resourceId: 'test-file'
      });
      const errors = await validate(dto);
      expect(errors.some(err => err.property === 'resourceType')).toBeTruthy();
    });

    it('should validate permission level enum', async () => {
      const validDto = new BasePermissionDto({
        type: PermissionType.READ,
        resourceType: ResourceType.FILE,
        resourceId: '123',
        level: PermissionLevel.READ
      });
      const validErrors = await validate(validDto);
      expect(validErrors.length).toBe(0);

      const invalidDto = new BasePermissionDto({
        type: PermissionType.READ,
        resourceType: ResourceType.FILE,
        resourceId: '123',
        level: 'INVALID' as PermissionLevel
      });
      const invalidErrors = await validate(invalidDto);
      expect(invalidErrors.length).toBeGreaterThan(0);
      expect(invalidErrors[0].property).toBe('level');
    });
  });

  describe('Optional Fields', () => {
    it('should accept valid optional fields', async () => {
      const now = new Date();
      const dto = new BasePermissionDto({
        type: PermissionType.READ,
        resourceType: ResourceType.FILE,
        resourceId: 'test-file',
        expiresAt: now,
        metadata: {
          owner: 'test-user',
          department: 'engineering'
        }
      });
      const errors = await validate(dto);
      expect(errors.length).toBe(0);
      expect(dto.expiresAt).toBe(now);
      expect(dto.metadata).toEqual({
        owner: 'test-user',
        department: 'engineering'
      });
    });

    it('should handle missing optional fields', async () => {
      const dto = new BasePermissionDto({
        type: PermissionType.READ,
        resourceType: ResourceType.FILE,
        resourceId: 'test-file'
      });
      const errors = await validate(dto);
      expect(errors.length).toBe(0);
      expect(dto.expiresAt).toBeUndefined();
      expect(dto.metadata).toBeUndefined();
    });
  });

  describe('Performance', () => {
    it('should validate within 1ms', async () => {
      const dto = new BasePermissionDto({
        type: PermissionType.READ,
        resourceType: ResourceType.FILE,
        resourceId: 'test-file'
      });
      const start = process.hrtime();
      await validate(dto);
      const [seconds, nanoseconds] = process.hrtime(start);
      const milliseconds = seconds * 1000 + nanoseconds / 1000000;
      expect(milliseconds).toBeLessThan(1);
    });

    it('should have memory footprint less than 2KB', () => {
      const dto = new BasePermissionDto({
        type: PermissionType.READ,
        resourceType: ResourceType.FILE,
        resourceId: 'test-file',
        metadata: {
          owner: 'test-user',
          department: 'engineering'
        }
      });
      const size: number = Buffer.byteLength(JSON.stringify(dto));
      expect(size).toBeLessThan(2048); // 2KB
    });
  });

  describe('Serialization', () => {
    it('should properly serialize and deserialize', () => {
      const original = new BasePermissionDto({
        type: PermissionType.READ,
        resourceType: ResourceType.FILE,
        resourceId: 'test-file',
        expiresAt: new Date('2024-01-01'),
        metadata: {
          owner: 'test-user'
        }
      });
      const serialized = JSON.stringify(original);
      const deserialized = new BasePermissionDto(JSON.parse(serialized));
      expect(deserialized.type).toBe(original.type);
      expect(deserialized.resourceType).toBe(original.resourceType);
      expect(deserialized.resourceId).toBe(original.resourceId);
      expect(deserialized.metadata).toEqual(original.metadata);
    });

    it('should handle optional fields correctly', () => {
      const original = new BasePermissionDto({
        type: PermissionType.READ,
        resourceType: ResourceType.FILE,
        resourceId: 'test-file'
      });
      const serialized = JSON.stringify(original);
      const deserialized = new BasePermissionDto(JSON.parse(serialized));
      expect(deserialized.expiresAt).toBeUndefined();
      expect(deserialized.metadata).toBeUndefined();
    });
  });
});
