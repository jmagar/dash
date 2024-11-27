import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { BaseConfigDto, ConfigValue } from '../base-config.dto';
import { Environment } from '../enums';

describe('BaseConfigDto', () => {
    describe('Type Safety', () => {
        it('should enforce required fields with proper error messages', async () => {
            const dto = new BaseConfigDto({});
            const errors = await validate(dto);
            
            // Check that we have validation errors
            expect(errors.length).toBeGreaterThan(0);
            
            // Create a map of property to constraints for easier testing
            const errorMap = errors.reduce((acc, err) => ({
                ...acc,
                [err.property]: Object.keys(err.constraints || {})
            }), {});
            
            // Check required fields
            expect(errorMap.key).toContain('isNotEmpty');
            expect(errorMap.description).toContain('isNotEmpty');
            expect(errorMap.environment).toContain('isEnum');
        });

        it('should accept valid required fields with optional fields using defaults', async () => {
            const dto = new BaseConfigDto({
                key: 'app.timeout',
                description: 'Application timeout in seconds',
                environment: Environment.Development
            });
            
            const errors = await validate(dto);
            expect(errors.length).toBe(0);
            
            // Check default values
            expect(dto.enabled).toBe(true);
            expect(dto.tags).toEqual([]);
            expect(dto.metadata).toEqual({});
        });

        it('should validate optional fields when provided', async () => {
            const now = new Date();
            const dto = new BaseConfigDto({
                key: 'app.timeout',
                description: 'Application timeout in seconds',
                environment: Environment.Development,
                enabled: false,
                tags: ['system', 'timeout'],
                value: new ConfigValue<number>({
                    value: 30,
                    type: 'number',
                    isEncrypted: false,
                    updatedAt: now,
                    environment: Environment.Development
                }),
                metadata: { category: 'system' }
            });
            
            const errors = await validate(dto);
            expect(errors.length).toBe(0);
        });

        it('should validate ConfigValue structure', async () => {
            const now = new Date();
            const dto = new BaseConfigDto({
                key: 'app.timeout',
                description: 'Application timeout in seconds',
                environment: Environment.Development,
                value: new ConfigValue<number>({
                    value: 30,
                    type: 'number',
                    isEncrypted: false,
                    updatedAt: now,
                    environment: Environment.Development
                })
            });
            const errors = await validate(dto);
            expect(errors.length).toBe(0);
        });

        it('should validate nested ConfigValue fields', async () => {
            const dto = new BaseConfigDto({
                key: 'app.settings',
                description: 'Application settings',
                environment: Environment.Development,
                value: new ConfigValue<Record<string, unknown>>({
                    value: { debug: true, logLevel: 'info' },
                    type: 'object',
                    isEncrypted: false,
                    updatedAt: new Date(),
                    environment: Environment.Development
                })
            });
            const errors = await validate(dto);
            expect(errors.length).toBe(0);
        });

        it('should validate string array values', async () => {
            const dto = new BaseConfigDto({
                key: 'app.allowed_origins',
                description: 'Allowed CORS origins',
                environment: Environment.Development,
                value: new ConfigValue<string[]>({
                    value: ['http://localhost:3000', 'https://example.com'],
                    type: 'array',
                    isEncrypted: false,
                    updatedAt: new Date(),
                    environment: Environment.Development
                }),
                tags: ['security', 'cors']
            });
            const errors = await validate(dto);
            expect(errors.length).toBe(0);
        });
    });
    describe('Default Values', () => {
        it('should set default values correctly', () => {
            const dto = new BaseConfigDto({
                key: 'app.timeout',
                description: 'Application timeout in seconds',
                environment: Environment.Development
            });
            expect(dto.enabled).toBe(true);
            expect(dto.tags).toEqual([]);
            expect(dto.metadata).toEqual({});
            expect(dto.value).toBeInstanceOf(ConfigValue);
        });
        it('should handle undefined optional fields', () => {
            const dto = new BaseConfigDto({
                key: 'app.timeout',
                description: 'Application timeout in seconds',
                environment: Environment.Development,
                value: new ConfigValue<number>({
                    value: 30,
                    type: 'number',
                    isEncrypted: false,
                    updatedAt: new Date(),
                    environment: Environment.Development
                })
            });
            expect(dto.enabled).toBeUndefined();
            expect(dto.tags).toBeUndefined();
            expect(dto.metadata).toBeUndefined();
        });
    });
    describe('Serialization', () => {
        it('should properly serialize and deserialize', () => {
            const now = new Date();
            const original = new BaseConfigDto({
                key: 'app.timeout',
                description: 'Application timeout in seconds',
                environment: Environment.Development,
                value: new ConfigValue<number>({
                    value: 30,
                    type: 'number',
                    isEncrypted: false,
                    updatedAt: now,
                    environment: Environment.Development
                }),
                enabled: true,
                tags: ['performance', 'timeout'],
                metadata: { source: 'config-file' }
            });
            const serialized = JSON.stringify(original);
            const deserialized = plainToInstance(BaseConfigDto, JSON.parse(serialized));
            expect(deserialized).toBeInstanceOf(BaseConfigDto);
            expect(deserialized.key).toBe(original.key);
            expect(deserialized.description).toBe(original.description);
            expect(deserialized.environment).toBe(original.environment);
            expect(deserialized.value).toBeInstanceOf(ConfigValue);
            expect(deserialized.value.value).toBe(original.value.value);
            expect(deserialized.value.type).toBe(original.value.type);
            expect(deserialized.value.isEncrypted).toBe(original.value.isEncrypted);
            expect(deserialized.value.updatedAt.getTime()).toBe(original.value.updatedAt.getTime());
            expect(deserialized.enabled).toBe(original.enabled);
            expect(deserialized.tags).toEqual(original.tags);
            expect(deserialized.metadata).toEqual(original.metadata);
        });
    });
    describe('Array Serialization', () => {
        it('should handle array serialization correctly', () => {
            const configs = [
                new BaseConfigDto({
                    key: 'app.timeout',
                    description: 'Application timeout in seconds',
                    environment: Environment.Development,
                    value: new ConfigValue<number>({
                        value: 30,
                        type: 'number',
                        isEncrypted: false,
                        updatedAt: new Date(),
                        environment: Environment.Development
                    }),
                    enabled: true,
                    tags: ['performance'],
                    metadata: { unit: 'seconds' }
                }),
                new BaseConfigDto({
                    key: 'app.urls',
                    description: 'Allowed URLs',
                    environment: Environment.Development,
                    value: new ConfigValue<string[]>({
                        value: ['http://localhost', 'https://example.com'],
                        type: 'array',
                        isEncrypted: false,
                        updatedAt: new Date(),
                        environment: Environment.Development
                    }),
                    enabled: true,
                    tags: ['security', 'urls'],
                    metadata: { type: 'cors' }
                })
            ];

            const serialized = JSON.stringify(configs);
            const deserialized = plainToInstance(BaseConfigDto, JSON.parse(serialized));

            // Verify array structure
            expect(Array.isArray(deserialized)).toBe(true);
            expect(deserialized.length).toBe(2);

            // Check first config
            expect(deserialized[0]).toBeInstanceOf(BaseConfigDto);
            expect(deserialized[0].key).toBe('app.timeout');
            expect(deserialized[0].description).toBe('Application timeout in seconds');
            expect(deserialized[0].environment).toBe(Environment.Development);
            expect(deserialized[0].value).toBeInstanceOf(ConfigValue);
            expect(deserialized[0].value.value).toBe(30);
            expect(deserialized[0].value.type).toBe('number');
            expect(deserialized[0].enabled).toBe(true);
            expect(deserialized[0].tags).toEqual(['performance']);
            expect(deserialized[0].metadata).toEqual({ unit: 'seconds' });

            // Check second config
            expect(deserialized[1]).toBeInstanceOf(BaseConfigDto);
            expect(deserialized[1].key).toBe('app.urls');
            expect(deserialized[1].description).toBe('Allowed URLs');
            expect(deserialized[1].environment).toBe(Environment.Development);
            expect(deserialized[1].value).toBeInstanceOf(ConfigValue);
            expect(deserialized[1].value.value).toEqual(['http://localhost', 'https://example.com']);
            expect(deserialized[1].value.type).toBe('array');
            expect(deserialized[1].enabled).toBe(true);
            expect(deserialized[1].tags).toEqual(['security', 'urls']);
            expect(deserialized[1].metadata).toEqual({ type: 'cors' });
        });
    });
    describe('Encryption', () => {
        it('should handle encrypted values', () => {
            const dto = new BaseConfigDto({
                key: 'app.secret',
                description: 'Secret key',
                environment: Environment.Development,
                value: new ConfigValue<string>({
                    value: 'encrypted-value',
                    type: 'string',
                    isEncrypted: true,
                    updatedAt: new Date(),
                    environment: Environment.Development
                })
            });
            expect(dto.value.isEncrypted).toBe(true);
            expect(typeof dto.value.value).toBe('string');
        });
    });
});
