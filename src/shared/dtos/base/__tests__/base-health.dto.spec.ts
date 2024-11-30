import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { BaseHealthDto, HealthMetrics } from '../base-health.dto';
import type { HealthStatus } from '../../../../types/health';

describe('BaseHealthDto', () => {
    describe('Type Safety', () => {
        it('should enforce required fields with proper error messages', async () => {
            const dto = new BaseHealthDto({});
            const errors = await validate(dto);
            
            // Check that we have validation errors
            expect(errors.length).toBeGreaterThan(0);
            
            // Create a map of property to constraints for easier testing
            const errorMap = errors.reduce<Record<string, string[]>>((acc, err) => ({
                ...acc,
                [err.property]: Object.keys(err.constraints || {})
            }), {});
            
            // Check required fields
            expect(errorMap.status).toContain('isString');
            expect(errorMap.uptime).toContain('isNumber');
            expect(errorMap.version).toContain('isString');
        });

        it('should accept valid required fields with optional fields omitted', async () => {
            const dto = new BaseHealthDto({
                status: 'healthy' as HealthStatus,
                uptime: 3600,
                version: '1.0.0'
            });
            
            const errors = await validate(dto);
            expect(errors.length).toBe(0);
            
            // Check default values
            expect(dto.timestamp).toBeInstanceOf(Date);
            expect(dto.metadata).toBeUndefined();
            expect(dto.metrics).toBeUndefined();
        });

        it('should validate optional fields when provided', async () => {
            const metrics = new HealthMetrics({
                memoryUsage: 512,
                cpuUsage: 25.5,
                diskUsage: 75.0,
                networkLatency: 100
            });
            
            const dto = new BaseHealthDto({
                status: 'healthy' as HealthStatus,
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
                status: 'healthy' as HealthStatus,
                uptime: 3600,
                version: '1.0.0',
                metrics: new HealthMetrics({
                    memoryUsage: 512,
                    cpuUsage: 25.5,
                    diskUsage: 75.0,
                    networkLatency: 100
                })
            });
            const errors = await validate(dto);
            expect(errors.length).toBe(0);
        });

        it('should validate nested metrics fields', async () => {
            const dto = new BaseHealthDto({
                status: 'healthy' as HealthStatus,
                uptime: 3600,
                version: '1.0.0',
                metrics: new HealthMetrics({
                    memoryUsage: 'invalid' as unknown as number,
                    cpuUsage: '25.5' as unknown as number,
                    diskUsage: true as unknown as number,
                    networkLatency: 'slow' as unknown as number
                })
            });
            const errors = await validate(dto);
            expect(errors.length).toBeGreaterThan(0);
            const metricsErrors = errors.find(e => e.property === 'metrics')?.children || [];
            expect(metricsErrors.map(e => e.property)).toContain('memoryUsage');
            expect(metricsErrors.map(e => e.property)).toContain('cpuUsage');
            expect(metricsErrors.map(e => e.property)).toContain('diskUsage');
            expect(metricsErrors.map(e => e.property)).toContain('networkLatency');
        });
    });

    describe('Default Values', () => {
        it('should set default timestamp to current ISO string', () => {
            const before = new Date();
            const dto = new BaseHealthDto({
                status: 'healthy' as HealthStatus,
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

        it('should set default status to healthy', () => {
            const dto = new BaseHealthDto({
                uptime: 3600,
                version: '1.0.0'
            });
            expect(dto.status).toBe('healthy');
        });
    });

    describe('Status Updates', () => {
        it('should update status based on metrics thresholds', () => {
            const dto = new BaseHealthDto({
                status: 'healthy' as HealthStatus,
                uptime: 3600,
                version: '1.0.0',
                metrics: new HealthMetrics({
                    memoryUsage: 90,  // Above threshold
                    cpuUsage: 85,     // Above threshold
                    diskUsage: 95,    // Above threshold
                    networkLatency: 1500 // Above threshold
                })
            });
            
            dto.updateStatus();
            expect(dto.status).toBe('degraded');
        });

        it('should maintain healthy status when metrics are below thresholds', () => {
            const dto = new BaseHealthDto({
                status: 'healthy' as HealthStatus,
                uptime: 3600,
                version: '1.0.0',
                metrics: new HealthMetrics({
                    memoryUsage: 70,  // Below threshold
                    cpuUsage: 65,     // Below threshold
                    diskUsage: 75,    // Below threshold
                    networkLatency: 500 // Below threshold
                })
            });
            
            dto.updateStatus();
            expect(dto.status).toBe('healthy');
        });
    });

    describe('Performance', () => {
        it('should validate within 1ms', async () => {
            const dto = new BaseHealthDto({
                status: 'healthy' as HealthStatus,
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
    });

    describe('Serialization', () => {
        it('should properly serialize and deserialize', () => {
            const original = new BaseHealthDto({
                status: 'healthy' as HealthStatus,
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
            const parsed = JSON.parse(serialized);
            const deserialized = plainToInstance(BaseHealthDto, parsed);
            expect(deserialized).toBeInstanceOf(BaseHealthDto);
            expect(deserialized.status).toBe(original.status);
            expect(deserialized.uptime).toBe(original.uptime);
            expect(deserialized.version).toBe(original.version);
            expect(deserialized.metrics).toBeInstanceOf(HealthMetrics);
            expect(deserialized.metrics?.memoryUsage).toBe(original.metrics?.memoryUsage);
            expect(deserialized.metadata).toEqual(original.metadata);
        });
    });
});
