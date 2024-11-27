import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { BaseHealthDto, HealthMetrics } from '../base-health.dto';

describe('BaseHealthDto', () => {
    describe('Type Safety', () => {
        it('should enforce required fields with proper error messages', async () => {
            const dto = new BaseHealthDto({});
            const errors = await validate(dto);
            
            // Check that we have validation errors
            expect(errors.length).toBeGreaterThan(0);
            
            // Create a map of property to constraints for easier testing
            const errorMap = errors.reduce((acc, err) => ({
                ...acc,
                [err.property]: Object.keys(err.constraints || {})
            }), {});
            
            // Check required fields
            expect(errorMap.isHealthy).toContain('isBoolean');
            expect(errorMap.uptime).toContain('isNumber');
            expect(errorMap.version).toContain('isString');
        });

        it('should accept valid required fields with optional fields omitted', async () => {
            const dto = new BaseHealthDto({
                isHealthy: true,
                uptime: 3600,
                version: '1.0.0'
            });
            
            const errors = await validate(dto);
            expect(errors.length).toBe(0);
            
            // Check default values
            expect(dto.timestamp).toBeInstanceOf(Date);
            expect(dto.metadata).toEqual({});
        });

        it('should validate optional fields when provided', async () => {
            const metrics = new HealthMetrics({
                memoryUsage: 512,
                cpuUsage: 25.5,
                diskUsage: 75.0
            });
            
            const dto = new BaseHealthDto({
                isHealthy: true,
                uptime: 3600,
                version: '1.0.0',
                metrics,
                metadata: { environment: 'production' }
            });
            
            const errors = await validate(dto);
            expect(errors.length).toBe(0);
        });

        it('should validate metrics structure', async () => {
            const dto = new BaseHealthDto({
                isHealthy: true,
                uptime: 3600,
                version: '1.0.0',
                metrics: new HealthMetrics({
                    memoryUsage: 512,
                    cpuUsage: 25.5,
                    diskUsage: 75.0
                })
            });
            const errors = await validate(dto);
            expect(errors.length).toBe(0);
        });

        it('should validate nested metrics fields', async () => {
            const dto = new BaseHealthDto({
                isHealthy: true,
                uptime: 3600,
                version: '1.0.0',
                metrics: new HealthMetrics({
                    memoryUsage: 'invalid' as unknown,
                    cpuUsage: '25.5' as unknown,
                    diskUsage: true as unknown
                })
            });
            const errors = await validate(dto);
            expect(errors.length).toBeGreaterThan(0);
            const metricsErrors = errors.find(e => e.property === 'metrics')?.children || [];
            expect(metricsErrors.map(e => e.property)).toContain('memoryUsage');
            expect(metricsErrors.map(e => e.property)).toContain('cpuUsage');
            expect(metricsErrors.map(e => e.property)).toContain('diskUsage');
        });
    });
    describe('Default Values', () => {
        it('should set default timestamp to current ISO string', () => {
            const before = new Date();
            const dto = new BaseHealthDto({
                isHealthy: true,
                uptime: 3600,
                version: '1.0.0',
                metrics: new HealthMetrics({
                    memoryUsage: 512,
                    cpuUsage: 25.5,
                    diskUsage: 75.0
                })
            });
            const after = new Date();
            expect(dto.timestamp.getTime()).toBeGreaterThanOrEqual(before.getTime());
            expect(dto.timestamp.getTime()).toBeLessThanOrEqual(after.getTime());
            expect(dto.timestamp.toISOString()).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
        });
    });
    describe('Optional Fields', () => {
        it('should accept valid optional fields', async () => {
            const dto = new BaseHealthDto({
                isHealthy: true,
                uptime: 3600,
                version: '1.0.0',
                metrics: new HealthMetrics({
                    memoryUsage: 512,
                    cpuUsage: 25.5,
                    diskUsage: 75.0
                }),
                metadata: {
                    lastCheck: new Date().toISOString(),
                    dependencies: { database: 'healthy', cache: 'healthy' }
                }
            });
            const errors = await validate(dto);
            expect(errors.length).toBe(0);
        });
        it('should validate metadata as object', async () => {
            const dto = new BaseHealthDto({
                isHealthy: true,
                uptime: 3600,
                version: '1.0.0',
                metrics: new HealthMetrics({
                    memoryUsage: 512,
                    cpuUsage: 25.5,
                    diskUsage: 75.0
                }),
                metadata: 'invalid' as unknown
            });
            const errors = await validate(dto);
            expect(errors.length).toBeGreaterThan(0);
            expect(errors[0].property).toBe('metadata');
        });
    });
    describe('Performance', () => {
        it('should validate within 1ms', async () => {
            const dto = new BaseHealthDto({
                isHealthy: true,
                uptime: 3600,
                version: '1.0.0',
                metrics: new HealthMetrics({
                    memoryUsage: 512,
                    cpuUsage: 25.5,
                    diskUsage: 75.0
                })
            });
            const start = process.hrtime();
            await validate(dto);
            const [seconds, nanoseconds] = process.hrtime(start);
            const milliseconds = seconds * 1000 + nanoseconds / 1000000;
            expect(milliseconds).toBeLessThan(1);
        });
        it('should have memory footprint less than 2KB', () => {
            const dto = new BaseHealthDto({
                isHealthy: true,
                uptime: 3600,
                version: '1.0.0',
                metrics: new HealthMetrics({
                    memoryUsage: 512,
                    cpuUsage: 25.5,
                    diskUsage: 75.0
                }),
                metadata: {
                    lastCheck: new Date().toISOString(),
                    dependencies: { database: 'healthy', cache: 'healthy' }
                }
            });
            const size: number = Buffer.byteLength(JSON.stringify(dto));
            expect(size).toBeLessThan(2048); // 2KB
        });
    });
    describe('Serialization', () => {
        it('should properly serialize and deserialize', () => {
            const original = new BaseHealthDto({
                isHealthy: true,
                uptime: 3600,
                version: '1.0.0',
                metrics: new HealthMetrics({
                    memoryUsage: 512,
                    cpuUsage: 25.5,
                    diskUsage: 75.0
                }),
                metadata: { dependencies: { database: 'healthy' } }
            });
            const serialized = JSON.stringify(original);
            const deserialized = plainToInstance(BaseHealthDto, JSON.parse(serialized));
            expect(deserialized).toBeInstanceOf(BaseHealthDto);
            expect(deserialized.isHealthy).toBe(original.isHealthy);
            expect(deserialized.uptime).toBe(original.uptime);
            expect(deserialized.version).toBe(original.version);
            expect(deserialized.metrics).toBeInstanceOf(HealthMetrics);
            expect(deserialized.metrics.memoryUsage).toBe(original.metrics.memoryUsage);
            expect(deserialized.metadata).toEqual(original.metadata);
        });
        it('should handle optional fields correctly', () => {
            const original = new BaseHealthDto({
                isHealthy: true,
                uptime: 3600,
                version: '1.0.0',
                metrics: new HealthMetrics({
                    memoryUsage: 512,
                    cpuUsage: 25.5,
                    diskUsage: 75.0
                })
            });
            const serialized = JSON.stringify(original);
            const deserialized = plainToInstance(BaseHealthDto, JSON.parse(serialized));
            expect(deserialized.metadata).toBeUndefined();
        });
    });
    describe('Array Serialization', () => {
        it('should handle array serialization correctly', () => {
            const healthChecks = [
                new BaseHealthDto({
                    isHealthy: true,
                    uptime: 3600,
                    version: '1.0.0',
                    metrics: new HealthMetrics({
                        memoryUsage: 512,
                        cpuUsage: 25.5,
                        diskUsage: 75.0
                    }),
                    metadata: { service: 'api', region: 'us-east' }
                }),
                new BaseHealthDto({
                    isHealthy: false,
                    uptime: 7200,
                    version: '1.0.1',
                    metrics: new HealthMetrics({
                        memoryUsage: 1024,
                        cpuUsage: 85.0,
                        diskUsage: 90.0,
                        networkLatency: 150
                    }),
                    metadata: { service: 'worker', region: 'us-west' }
                })
            ];

            const serialized = JSON.stringify(healthChecks);
            const deserialized = plainToInstance(BaseHealthDto, JSON.parse(serialized));

            // Verify array structure
            expect(Array.isArray(deserialized)).toBe(true);
            expect(deserialized.length).toBe(2);

            // Check first health check
            expect(deserialized[0]).toBeInstanceOf(BaseHealthDto);
            expect(deserialized[0].isHealthy).toBe(true);
            expect(deserialized[0].uptime).toBe(3600);
            expect(deserialized[0].version).toBe('1.0.0');
            expect(deserialized[0].metrics).toBeInstanceOf(HealthMetrics);
            expect(deserialized[0].metrics.memoryUsage).toBe(512);
            expect(deserialized[0].metrics.cpuUsage).toBe(25.5);
            expect(deserialized[0].metrics.diskUsage).toBe(75.0);
            expect(deserialized[0].metadata).toEqual({ service: 'api', region: 'us-east' });

            // Check second health check
            expect(deserialized[1]).toBeInstanceOf(BaseHealthDto);
            expect(deserialized[1].isHealthy).toBe(false);
            expect(deserialized[1].uptime).toBe(7200);
            expect(deserialized[1].version).toBe('1.0.1');
            expect(deserialized[1].metrics).toBeInstanceOf(HealthMetrics);
            expect(deserialized[1].metrics.memoryUsage).toBe(1024);
            expect(deserialized[1].metrics.cpuUsage).toBe(85.0);
            expect(deserialized[1].metrics.diskUsage).toBe(90.0);
            expect(deserialized[1].metrics.networkLatency).toBe(150);
            expect(deserialized[1].metadata).toEqual({ service: 'worker', region: 'us-west' });
        });
    });
});
