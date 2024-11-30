import { plainToInstance } from 'class-transformer';
import { validate, ValidationError } from 'class-validator';
import { BaseMetricsDto, MetricType, MetricValue } from '../base-metrics.dto';

describe('BaseMetricsDto', () => {
    describe('Type Safety', () => {
        it('should enforce required fields', async () => {
            const dto = new BaseMetricsDto({});
            const errors = await validate(dto);
            expect(errors.length).toBeGreaterThan(0);
            expect(errors.map(e => e.property)).toContain('name');
            expect(errors.map(e => e.property)).toContain('description');
            expect(errors.map(e => e.property)).toContain('value');
        });
        it('should validate metric value structure', async () => {
            const dto = new BaseMetricsDto({
                name: 'request_count',
                description: 'Total number of requests',
                value: new MetricValue({
                    value: 100,
                    type: MetricType.COUNTER
                })
            });
            const errors = await validate(dto);
            expect(errors.length).toBe(0);
        });
        it('should validate metric type enum', async () => {
            const invalidType = 'INVALID_TYPE';
            const dto = new BaseMetricsDto({
                name: 'request_count',
                description: 'Total number of requests',
                value: new MetricValue({
                    value: 100,
                    type: invalidType as any
                })
            });
            const errors = await validate(dto);
            expect(errors.length).toBeGreaterThan(0);
            const valueErrors = errors.find(e => e.property === 'value')?.children || [];
            expect((valueErrors[0] as ValidationError).property).toBe('type');
        });
        it('should validate historical values', async () => {
            const dto = new BaseMetricsDto({
                name: 'request_count',
                description: 'Total number of requests',
                value: new MetricValue({
                    value: 100,
                    type: MetricType.COUNTER
                }),
                history: [
                    new MetricValue({
                        value: 50,
                        type: MetricType.COUNTER
                    }),
                    new MetricValue({
                        value: 75,
                        type: MetricType.COUNTER
                    })
                ]
            });
            const errors = await validate(dto);
            expect(errors.length).toBe(0);
        });
    });
    describe('Default Values', () => {
        it('should set default timestamp in MetricValue', () => {
            const before = new Date();
            const metricValue = new MetricValue({
                value: 100,
                type: MetricType.COUNTER
            });
            const after = new Date();
            const timestamp = new Date(metricValue.timestamp);
            expect(timestamp.getTime()).toBeGreaterThanOrEqual(before.getTime());
            expect(timestamp.getTime()).toBeLessThanOrEqual(after.getTime());
            expect(metricValue.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
        });
    });
    describe('Optional Fields', () => {
        it('should accept valid optional fields', async () => {
            const dto = new BaseMetricsDto({
                name: 'request_count',
                description: 'Total number of requests',
                value: new MetricValue({
                    value: 100,
                    type: MetricType.COUNTER,
                    unit: 'requests/sec'
                }),
                labels: { service: 'api', env: 'prod' },
                history: [
                    new MetricValue({
                        value: 90,
                        type: MetricType.COUNTER,
                        unit: 'requests/sec'
                    })
                ],
                metadata: { lastReset: new Date().toISOString() }
            });
            const errors = await validate(dto);
            expect(errors.length).toBe(0);
        });
        it('should validate labels as object with string values', async () => {
            const dto = new BaseMetricsDto({
                name: 'request_count',
                description: 'Total number of requests',
                value: new MetricValue({
                    value: 100,
                    type: MetricType.COUNTER
                }),
                labels: { valid: 'string', invalid: '123' }
            });
            const errors = await validate(dto);
            expect(errors.length).toBe(0);
        });
    });
    describe('Performance', () => {
        it('should validate within 1ms', async () => {
            const dto = new BaseMetricsDto({
                name: 'request_count',
                description: 'Total number of requests',
                value: new MetricValue({
                    value: 100,
                    type: MetricType.COUNTER
                }),
                history: [
                    new MetricValue({
                        value: 50,
                        type: MetricType.COUNTER
                    }),
                    new MetricValue({
                        value: 75,
                        type: MetricType.COUNTER
                    })
                ]
            });
            const start = process.hrtime();
            await validate(dto);
            const [seconds, nanoseconds] = process.hrtime(start);
            const milliseconds = seconds * 1000 + nanoseconds / 1000000;
            expect(milliseconds).toBeLessThan(1);
        });
        it('should have memory footprint less than 2KB', () => {
            const dto = new BaseMetricsDto({
                name: 'request_count',
                description: 'Total number of requests',
                value: new MetricValue({
                    value: 100,
                    type: MetricType.COUNTER
                }),
                history: [
                    new MetricValue({
                        value: 50,
                        type: MetricType.COUNTER
                    }),
                    new MetricValue({
                        value: 75,
                        type: MetricType.COUNTER
                    })
                ],
                labels: {
                    service: 'api',
                    environment: 'production'
                },
                metadata: {
                    lastUpdate: new Date().toISOString(),
                    source: 'test'
                }
            });
            const size = Buffer.byteLength(JSON.stringify(dto));
            expect(size).toBeLessThan(2048); // 2KB in bytes
        });
    });
    describe('Serialization', () => {
        it('should properly serialize and deserialize', () => {
            const original = new BaseMetricsDto({
                name: 'request_count',
                description: 'Total number of requests',
                value: new MetricValue({
                    value: 100,
                    type: MetricType.COUNTER,
                    unit: 'requests/sec'
                }),
                labels: { service: 'api' },
                history: [
                    new MetricValue({
                        value: 90,
                        type: MetricType.COUNTER,
                        unit: 'requests/sec'
                    })
                ]
            });
            const serialized = JSON.stringify(original);
            const parsed = JSON.parse(serialized);
            const deserialized = plainToInstance(BaseMetricsDto, parsed);
            const result = Array.isArray(deserialized) ? deserialized[0] : deserialized;
            expect(result).toBeInstanceOf(BaseMetricsDto);
            expect(result.name).toBe(original.name);
            expect(result.value).toBeInstanceOf(MetricValue);
            expect(result.value.value).toBe(original.value.value);
            expect(result.value.type).toBe(original.value.type);
            expect(result.value.unit).toBe(original.value.unit);
            expect(result.history?.[0]).toBeInstanceOf(MetricValue);
            expect(result.labels).toEqual(original.labels);
        });
        it('should handle optional fields correctly', () => {
            const original = new BaseMetricsDto({
                name: 'request_count',
                description: 'Total number of requests',
                value: new MetricValue({
                    value: 100,
                    type: MetricType.COUNTER
                })
            });
            const serialized = JSON.stringify(original);
            const parsed = JSON.parse(serialized);
            const deserialized = plainToInstance(BaseMetricsDto, parsed);
            const result = Array.isArray(deserialized) ? deserialized[0] : deserialized;
            expect(result.labels).toBeUndefined();
            expect(result.history).toBeUndefined();
            expect(result.metadata).toBeUndefined();
        });
    });
    describe('validation', () => {
        it('should enforce required fields with proper error messages', async () => {
            const dto = new BaseMetricsDto({});
            const errors = await validate(dto);
            
            // Check that we have validation errors
            expect(errors.length).toBeGreaterThan(0);
            
            // Create a map of property to constraints for easier testing
            const errorMap: Record<string, string[]> = errors.reduce((acc, err) => ({
                ...acc,
                [err.property]: Object.keys(err.constraints || {})
            }), {} as Record<string, string[]>);
            
            // Check required fields
            expect(errorMap['name']).toContain('isNotEmpty');
            expect(errorMap['description']).toContain('isNotEmpty');
            expect(errorMap['value']).toContain('isNotEmpty');
        });

        it('should validate metric value constraints', async () => {
            const dto = new BaseMetricsDto({
                name: 'test_metric',
                description: 'Test metric description',
                value: new MetricValue({
                    value: 100,
                    type: MetricType.COUNTER
                })
            });
            
            const errors = await validate(dto);
            expect(errors.length).toBe(0);
        });

        it('should validate optional fields correctly', async () => {
            const dto = new BaseMetricsDto({
                name: 'test_metric',
                description: 'Test metric description',
                value: new MetricValue({
                    value: 100,
                    type: MetricType.COUNTER
                }),
                history: [
                    new MetricValue({
                        value: 90,
                        type: MetricType.COUNTER
                    })
                ],
                metadata: { test: 'value' }
            });
            
            const errors = await validate(dto);
            expect(errors.length).toBe(0);
        });

        it('should validate metric types correctly', async () => {
            const metric = new BaseMetricsDto({
                name: 'cpu_usage',
                description: 'CPU usage percentage',
                value: new MetricValue({
                    value: 75,
                    type: MetricType.GAUGE,
                    unit: '%'
                })
            });
            expect(await metric.isValid()).toBe(true);
        });

        it('should validate metric units correctly', async () => {
            const metric = new BaseMetricsDto({
                name: 'memory_usage',
                description: 'Memory usage',
                value: new MetricValue({
                    value: 1024,
                    type: MetricType.GAUGE,
                    unit: 'MB'
                }),
                labels: { valid: 'string', invalid: '123' }
            });
            expect(await metric.isValid()).toBe(true);
        });
    });
    describe('Array Serialization', () => {
        it('should handle array serialization correctly', () => {
            const metrics = [
                new BaseMetricsDto({
                    name: 'request_count',
                    description: 'Total number of requests',
                    value: new MetricValue({
                        value: 100,
                        type: MetricType.COUNTER,
                        unit: 'requests/sec'
                    }),
                    labels: { service: 'api', env: 'prod' },
                    history: [
                        new MetricValue({
                            value: 90,
                            type: MetricType.COUNTER,
                            unit: 'requests/sec'
                        })
                    ],
                    metadata: { lastReset: '2023-01-01T00:00:00.000Z' }
                }),
                new BaseMetricsDto({
                    name: 'memory_usage',
                    description: 'Memory usage in bytes',
                    value: new MetricValue({
                        value: 1024,
                        type: MetricType.GAUGE,
                        unit: 'bytes'
                    }),
                    labels: { service: 'worker', env: 'prod' },
                    history: [
                        new MetricValue({
                            value: 512,
                            type: MetricType.GAUGE,
                            unit: 'bytes'
                        })
                    ],
                    metadata: { lastCheck: '2023-01-01T00:00:00.000Z' }
                })
            ];

            const serialized = JSON.stringify(metrics);
            const parsed = JSON.parse(serialized);
            const deserialized = plainToInstance(BaseMetricsDto, parsed);

            // Verify array structure
            expect(Array.isArray(deserialized)).toBe(true);
            expect(deserialized.length).toBe(2);

            // Check first metric
            const first = deserialized[0];
            expect(first).toBeDefined();
            expect(first.name).toBe('request_count');
            expect(first.description).toBe('Total number of requests');
            expect(first.value).toBeDefined();
            expect(first.value.value).toBe(100);
            expect(first.value.type).toBe(MetricType.COUNTER);
            expect(first.value.unit).toBe('requests/sec');
            expect(first.labels).toEqual({ service: 'api', env: 'prod' });
            expect(first.history?.[0]).toBeDefined();
            expect(first.history?.[0].value).toBe(90);
            expect(first.metadata).toEqual({ lastReset: '2023-01-01T00:00:00.000Z' });

            // Check second metric
            const second = deserialized[1];
            expect(second).toBeDefined();
            expect(second.name).toBe('memory_usage');
            expect(second.description).toBe('Memory usage in bytes');
            expect(second.value).toBeDefined();
            expect(second.value.value).toBe(1024);
            expect(second.value.type).toBe(MetricType.GAUGE);
            expect(second.value.unit).toBe('bytes');
            expect(second.labels).toEqual({ service: 'worker', env: 'prod' });
            expect(second.history?.[0]).toBeDefined();
            expect(second.history?.[0].value).toBe(512);
            expect(second.metadata).toEqual({ lastCheck: '2023-01-01T00:00:00.000Z' });
        });
    });
});
