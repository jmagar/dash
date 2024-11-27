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
            const dto = new BaseMetricsDto({
                name: 'request_count',
                description: 'Total number of requests',
                value: new MetricValue({
                    value: 100,
                    type: 'INVALID_TYPE' as MetricType
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
                        type: MetricType.COUNTER,
                        timestamp: new Date().toISOString()
                    }),
                    new MetricValue({
                        value: 75,
                        type: MetricType.COUNTER,
                        timestamp: new Date().toISOString()
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
            const timestamp: number = new Date(metricValue.timestamp);
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
                        type: MetricType.COUNTER,
                        timestamp: new Date().toISOString()
                    }),
                    new MetricValue({
                        value: 75,
                        type: MetricType.COUNTER,
                        timestamp: new Date().toISOString()
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
                        type: MetricType.COUNTER,
                        timestamp: new Date().toISOString()
                    }),
                    new MetricValue({
                        value: 75,
                        type: MetricType.COUNTER,
                        timestamp: new Date().toISOString()
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
            const deserialized = plainToInstance(BaseMetricsDto, JSON.parse(serialized));
            expect(deserialized).toBeInstanceOf(BaseMetricsDto);
            expect(deserialized.name).toBe(original.name);
            expect(deserialized.value).toBeInstanceOf(MetricValue);
            expect(deserialized.value.value).toBe(original.value.value);
            expect(deserialized.value.type).toBe(original.value.type);
            expect(deserialized.history?.[0]).toBeInstanceOf(MetricValue);
            expect(deserialized.labels).toEqual(original.labels);
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
            const deserialized = plainToInstance(BaseMetricsDto, JSON.parse(serialized));
            expect(deserialized.labels).toBeUndefined();
            expect(deserialized.history).toBeUndefined();
            expect(deserialized.metadata).toBeUndefined();
        });
    });
    describe('validation', () => {
        it('should enforce required fields with proper error messages', async () => {
            const dto = new BaseMetricsDto({});
            const errors = await validate(dto);
            
            // Check that we have validation errors
            expect(errors.length).toBeGreaterThan(0);
            
            // Create a map of property to constraints for easier testing
            const errorMap = errors.reduce((acc, err) => ({
                ...acc,
                [err.property]: Object.keys(err.constraints || {})
            }), {});
            
            // Check required fields
            expect(errorMap.name).toContain('isNotEmpty');
            expect(errorMap.description).toContain('isNotEmpty');
            expect(errorMap.value).toContain('isNotEmpty');
        });

        it('should accept valid required fields with optional fields omitted', async () => {
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

        it('should validate optional fields when provided', async () => {
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

        it('should validate a valid metric', async () => {
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

        it('should validate metric with labels', async () => {
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

        it('should validate metric with history', async () => {
            const metric = new BaseMetricsDto({
                name: 'disk_usage',
                description: 'Disk usage',
                value: new MetricValue({
                    value: 500,
                    type: MetricType.GAUGE,
                    unit: 'GB'
                }),
                history: [
                    new MetricValue({
                        value: 400,
                        type: MetricType.GAUGE,
                        unit: 'GB'
                    }),
                    new MetricValue({
                        value: 450,
                        type: MetricType.GAUGE,
                        unit: 'GB'
                    })
                ]
            });
            expect(await metric.isValid()).toBe(true);
        });

        it('should validate metric with metadata', async () => {
            const metric = new BaseMetricsDto({
                name: 'network_latency',
                description: 'Network latency',
                value: new MetricValue({
                    value: 50,
                    type: MetricType.GAUGE,
                    unit: 'ms'
                }),
                metadata: {
                    source: 'ping',
                    target: 'google.com'
                }
            });
            expect(await metric.isValid()).toBe(true);
        });
    });
    describe('serialization', () => {
        it('should serialize and deserialize correctly', () => {
            const original = new BaseMetricsDto({
                name: 'test_metric',
                description: 'Test metric',
                value: new MetricValue({
                    value: 100,
                    type: MetricType.COUNTER
                }),
                history: [
                    new MetricValue({
                        value: 50,
                        type: MetricType.COUNTER,
                        timestamp: new Date().toISOString()
                    }),
                    new MetricValue({
                        value: 75,
                        type: MetricType.COUNTER,
                        timestamp: new Date().toISOString()
                    })
                ],
                labels: { env: 'test' }
            });
            const serialized = JSON.stringify(original);
            const deserialized = JSON.parse(serialized);
            expect(deserialized).toBeDefined();
            expect(deserialized.name).toBe(original.name);
            expect(deserialized.value.value).toBe(original.value.value);
            expect(deserialized.value.type).toBe(original.value.type);
            expect(deserialized.history?.[0].value).toBe(original.history?.[0].value);
            expect(deserialized.labels).toEqual(original.labels);
        });
        it('should handle minimal metric data', () => {
            const original = new BaseMetricsDto({
                name: 'minimal_metric',
                description: 'Minimal metric',
                value: new MetricValue({
                    value: 100,
                    type: MetricType.COUNTER
                })
            });
            const serialized = JSON.stringify(original);
            const deserialized = JSON.parse(serialized);
            expect(deserialized).toBeDefined();
            expect(deserialized.name).toBe(original.name);
            expect(deserialized.value.value).toBe(original.value.value);
            expect(deserialized.labels).toBeUndefined();
            expect(deserialized.history).toBeUndefined();
            expect(deserialized.metadata).toBeUndefined();
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
            const deserialized = JSON.parse(serialized);

            // Verify array structure
            expect(Array.isArray(deserialized)).toBe(true);
            expect(deserialized.length).toBe(2);

            // Check first metric
            expect(deserialized[0]).toBeDefined();
            expect(deserialized[0].name).toBe('request_count');
            expect(deserialized[0].description).toBe('Total number of requests');
            expect(deserialized[0].value).toBeDefined();
            expect(deserialized[0].value.value).toBe(100);
            expect(deserialized[0].value.type).toBe(MetricType.COUNTER);
            expect(deserialized[0].value.unit).toBe('requests/sec');
            expect(deserialized[0].labels).toEqual({ service: 'api', env: 'prod' });
            expect(deserialized[0].history?.[0]).toBeDefined();
            expect(deserialized[0].history?.[0].value).toBe(90);
            expect(deserialized[0].metadata).toEqual({ lastReset: '2023-01-01T00:00:00.000Z' });

            // Check second metric
            expect(deserialized[1]).toBeDefined();
            expect(deserialized[1].name).toBe('memory_usage');
            expect(deserialized[1].description).toBe('Memory usage in bytes');
            expect(deserialized[1].value).toBeDefined();
            expect(deserialized[1].value.value).toBe(1024);
            expect(deserialized[1].value.type).toBe(MetricType.GAUGE);
            expect(deserialized[1].value.unit).toBe('bytes');
            expect(deserialized[1].labels).toEqual({ service: 'worker', env: 'prod' });
            expect(deserialized[1].history?.[0]).toBeDefined();
            expect(deserialized[1].history?.[0].value).toBe(512);
            expect(deserialized[1].metadata).toEqual({ lastCheck: '2023-01-01T00:00:00.000Z' });
        });
    });
});
