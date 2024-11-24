import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { BaseConfigDto, ConfigValue } from '../base-config.dto';

describe('BaseConfigDto', () => {
  describe('Type Safety', () => {
    it('should enforce required fields', async () => {
      const dto = new BaseConfigDto({});
      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors.map(e => e.property)).toContain('key');
      expect(errors.map(e => e.property)).toContain('description');
      expect(errors.map(e => e.property)).toContain('environment');
      expect(errors.map(e => e.property)).toContain('value');
    });

    it('should validate ConfigValue structure', async () => {
      const dto = new BaseConfigDto({
        key: 'app.timeout',
        description: 'Application timeout in seconds',
        environment: 'development',
        value: {
          value: 30,
          type: 'number',
          isEncrypted: false
        }
      });
      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });

    it('should validate nested ConfigValue fields', async () => {
      const dto = new BaseConfigDto({
        key: 'app.timeout',
        description: 'Application timeout in seconds',
        environment: 'development',
        value: {
          value: 30,
          type: 123 as unknown, // invalid type - should be string
          isEncrypted: 'false' as unknown // invalid type - should be boolean
        }
      });
      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      const valueErrors = errors.find(e => e.property === 'value')?.children || [];
      expect(valueErrors.map(e => e.property)).toContain('type');
      expect(valueErrors.map(e => e.property)).toContain('isEncrypted');
    });
  });

  describe('Default Values', () => {
    it('should set default enabled to true', () => {
      const dto = new BaseConfigDto({
        key: 'app.feature',
        description: 'Feature flag',
        environment: 'development',
        value: { value: true, type: 'boolean' }
      });
      expect(dto.enabled).toBe(true);
    });

    it('should set default isEncrypted to false in ConfigValue', () => {
      const configValue = new ConfigValue({ value: 'secret', type: 'string' });
      expect(configValue.isEncrypted).toBe(false);
    });

    it('should set default updatedAt in ConfigValue', () => {
      const before = new Date();
      const configValue = new ConfigValue({ value: 'test', type: 'string' });
      const after = new Date();
      
      const updatedAt = new Date(configValue.updatedAt);
      expect(updatedAt.getTime()).toBeGreaterThanOrEqual(before.getTime());
      expect(updatedAt.getTime()).toBeLessThanOrEqual(after.getTime());
    });
  });

  describe('Optional Fields', () => {
    it('should accept valid optional fields', async () => {
      const dto = new BaseConfigDto({
        key: 'app.feature',
        description: 'Feature flag',
        environment: 'development',
        value: { value: true, type: 'boolean' },
        tags: { category: 'feature-flags', team: 'backend' },
        metadata: { lastReviewed: '2023-01-01' }
      });
      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });

    it('should validate tags as object with string values', async () => {
      const dto = new BaseConfigDto({
        key: 'app.feature',
        description: 'Feature flag',
        environment: 'development',
        value: { value: true, type: 'boolean' },
        tags: { valid: 'string', invalid: 123 as unknown }
      });
      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].property).toBe('tags');
    });
  });

  describe('Performance', () => {
    it('should validate within 1ms', async () => {
      const dto = new BaseConfigDto({
        key: 'app.timeout',
        description: 'Application timeout in seconds',
        environment: 'development',
        value: {
          value: 30,
          type: 'number'
        }
      });
      
      const start = process.hrtime();
      await validate(dto);
      const [seconds, nanoseconds] = process.hrtime(start);
      const milliseconds = seconds * 1000 + nanoseconds / 1000000;
      
      expect(milliseconds).toBeLessThan(1);
    });

    it('should have memory footprint less than 2KB', () => {
      const dto = new BaseConfigDto({
        key: 'app.settings',
        description: 'Application settings',
        environment: 'development',
        value: {
          value: { setting1: true, setting2: false },
          type: 'object'
        },
        tags: { category: 'settings' },
        metadata: { lastModified: new Date().toISOString() }
      });
      
      const size: number = Buffer.byteLength(JSON.stringify(dto));
      expect(size).toBeLessThan(2048); // 2KB
    });
  });

  describe('Serialization', () => {
    it('should properly serialize and deserialize', () => {
      const original = new BaseConfigDto({
        key: 'app.feature',
        description: 'Feature flag',
        environment: 'development',
        value: {
          value: true,
          type: 'boolean',
          isEncrypted: false
        },
        tags: { category: 'feature-flags' }
      });

      const serialized = JSON.stringify(original);
      const deserialized = plainToInstance(BaseConfigDto, JSON.parse(serialized));

      expect(deserialized).toBeInstanceOf(BaseConfigDto);
      expect(deserialized.key).toBe(original.key);
      expect(deserialized.value).toBeInstanceOf(ConfigValue);
      expect(deserialized.value.value).toBe(original.value.value);
      expect(deserialized.value.type).toBe(original.value.type);
      expect(deserialized.tags).toEqual(original.tags);
    });

    it('should handle optional fields correctly', () => {
      const original = new BaseConfigDto({
        key: 'app.timeout',
        description: 'Application timeout',
        environment: 'development',
        value: {
          value: 30,
          type: 'number'
        }
      });

      const serialized = JSON.stringify(original);
      const deserialized = plainToInstance(BaseConfigDto, JSON.parse(serialized));

      expect(deserialized.tags).toBeUndefined();
      expect(deserialized.metadata).toBeUndefined();
    });
  });
});
