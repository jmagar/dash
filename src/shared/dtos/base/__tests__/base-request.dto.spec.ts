import { BaseRequestDto, UserContext, TenantContext, RequestSettings } from '../base-request.dto';
import { validate } from 'class-validator';
describe('BaseRequestDto', () => {
    describe('Constructor', () => {
        it('should create an instance with minimal data', () => {
            const dto = new BaseRequestDto({});
            expect(dto).toBeInstanceOf(BaseRequestDto);
        });
        it('should create an instance with complete data', () => {
            const userContext = {
                userId: '123e4567-e89b-12d3-a456-426614174000',
                roles: ['admin', 'user'],
                permissions: ['read', 'write'],
                preferences: { theme: 'dark' }
            };
            const tenantContext = {
                tenantId: '123e4567-e89b-12d3-a456-426614174001',
                tenantType: 'enterprise',
                settings: { maxUsers: 100 }
            };
            const settings = {
                priority: 'HIGH' as const,
                timeoutMs: 5000,
                detailed: true,
                responseFormat: 'JSON' as const
            };
            const dto = new BaseRequestDto({
                requestId: '123e4567-e89b-12d3-a456-426614174002',
                clientTimestamp: new Date().toISOString(),
                clientVersion: '1.0.0',
                source: 'web',
                userContext,
                tenantContext,
                settings,
                metadata: { browser: 'Chrome' }
            });
            expect(dto.requestId).toBeDefined();
            expect(dto.userContext).toBeDefined();
            expect(dto.tenantContext).toBeDefined();
            expect(dto.settings).toBeDefined();
        });
    });
    describe('Validation', () => {
        it('should validate an empty request', async () => {
            const dto = new BaseRequestDto({});
            const errors = await validate(dto);
            expect(errors).toHaveLength(0);
        });
        it('should validate UUID format for requestId', async () => {
            const dto = new BaseRequestDto({
                requestId: 'invalid-uuid'
            });
            const errors = await validate(dto);
            expect(errors).toHaveLength(1);
        });
        it('should validate nested UserContext', async () => {
            const dto = new BaseRequestDto({
                userContext: {
                    userId: 'invalid-uuid',
                    roles: ['admin'],
                    permissions: [123] // invalid type
                } as any
            });
            const errors = await validate(dto, { whitelist: true });
            expect(errors).toHaveLength(1);
        });
        it('should validate nested TenantContext', async () => {
            const dto = new BaseRequestDto({
                tenantContext: {
                    tenantId: 'invalid-uuid',
                    settings: 'invalid-settings' // should be an object
                } as any
            });
            const errors = await validate(dto, { whitelist: true });
            expect(errors).toHaveLength(1);
        });
        it('should validate nested RequestSettings', async () => {
            const dto = new BaseRequestDto({
                settings: {
                    priority: 'INVALID_PRIORITY',
                    timeoutMs: 'invalid-timeout',
                    detailed: 'not-a-boolean',
                    responseFormat: 'INVALID_FORMAT'
                } as any
            });
            const errors = await validate(dto, { whitelist: true });
            expect(errors).toHaveLength(1);
        });
    });
    describe('UserContext', () => {
        it('should validate a complete user context', async () => {
            const context = new UserContext();
            Object.assign(context, {
                userId: '123e4567-e89b-12d3-a456-426614174000',
                roles: ['admin'],
                permissions: ['read'],
                preferences: { theme: 'dark' }
            });
            const errors = await validate(context);
            expect(errors).toHaveLength(0);
        });
        it('should require userId and roles', async () => {
            const context = new UserContext();
            const errors = await validate(context);
            expect(errors.length).toBeGreaterThan(0);
        });
    });
    describe('TenantContext', () => {
        it('should validate a complete tenant context', async () => {
            const context = new TenantContext();
            Object.assign(context, {
                tenantId: '123e4567-e89b-12d3-a456-426614174000',
                tenantType: 'enterprise',
                settings: { maxUsers: 100 }
            });
            const errors = await validate(context);
            expect(errors).toHaveLength(0);
        });
        it('should require tenantId', async () => {
            const context = new TenantContext();
            const errors = await validate(context);
            expect(errors.length).toBeGreaterThan(0);
        });
    });
    describe('RequestSettings', () => {
        it('should validate a complete settings object', async () => {
            const settings = new RequestSettings();
            Object.assign(settings, {
                priority: 'HIGH',
                timeoutMs: 5000,
                detailed: true,
                responseFormat: 'JSON'
            });
            const errors = await validate(settings);
            expect(errors).toHaveLength(0);
        });
        it('should use default values when not provided', () => {
            const settings = new RequestSettings();
            expect(settings.priority).toBe('MEDIUM');
            expect(settings.timeoutMs).toBe(30000);
            expect(settings.detailed).toBe(false);
            expect(settings.responseFormat).toBe('JSON');
        });
    });
    describe('Performance', () => {
        it('should instantiate quickly with nested objects', () => {
            const start = process.hrtime();
            const createComplexDto = () => new BaseRequestDto({
                requestId: '123e4567-e89b-12d3-a456-426614174000',
                clientTimestamp: new Date().toISOString(),
                clientVersion: '1.0.0',
                source: 'web',
                userContext: {
                    userId: '123e4567-e89b-12d3-a456-426614174001',
                    roles: ['admin'],
                    permissions: ['read', 'write'],
                    preferences: { theme: 'dark' }
                },
                tenantContext: {
                    tenantId: '123e4567-e89b-12d3-a456-426614174002',
                    tenantType: 'enterprise',
                    settings: { maxUsers: 100 }
                },
                settings: {
                    priority: 'HIGH',
                    timeoutMs: 5000,
                    detailed: true,
                    responseFormat: 'JSON'
                },
                metadata: { browser: 'Chrome' }
            });
            // Create multiple instances to test performance
            Array(100).fill(null).forEach(() => createComplexDto());
            const [seconds, nanoseconds] = process.hrtime(start);
            const milliseconds = seconds * 1000 + nanoseconds / 1000000;
            expect(milliseconds).toBeLessThan(100);
        });
    });
    describe('Serialization', () => {
        it('should correctly serialize and deserialize', () => {
            const original = new BaseRequestDto({
                requestId: '123e4567-e89b-12d3-a456-426614174000',
                clientTimestamp: new Date().toISOString(),
                userContext: {
                    userId: '123e4567-e89b-12d3-a456-426614174001',
                    roles: ['admin']
                },
                settings: {
                    priority: 'HIGH',
                    detailed: true
                }
            });
            const serialized = JSON.stringify(original);
            const deserialized = new BaseRequestDto(JSON.parse(serialized));
            expect(deserialized).toBeInstanceOf(BaseRequestDto);
            expect(deserialized.requestId).toBe(original.requestId);
            expect(deserialized.userContext?.roles).toEqual(original.userContext?.roles);
            expect(deserialized.settings?.priority).toBe(original.settings?.priority);
        });
    });
});