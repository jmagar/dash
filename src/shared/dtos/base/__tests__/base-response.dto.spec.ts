import { validate } from 'class-validator';
import { BaseResponseDto } from '../base-response.dto';
describe('BaseResponseDto', () => {
    describe('Type Safety', () => {
        it('should enforce success as boolean', async () => {
            const dto = new BaseResponseDto({
                success: 'true' as any, // intentionally wrong type
                message: 'test',
                data: { test: 'data' }
            });
            const errors = await validate(dto);
            expect(errors.length).toBeGreaterThan(0);
            expect(errors[0].constraints).toHaveProperty('isBoolean');
        });
        it('should allow optional message as string', async () => {
            const dto = new BaseResponseDto({
                success: true,
                message: 123 as any // intentionally wrong type
            });
            const errors = await validate(dto);
            expect(errors.length).toBeGreaterThan(0);
            expect(errors[0].constraints).toHaveProperty('isString');
        });
        it('should validate with generic data type', async () => {
            interface TestData {
                id: string;
                value: number;
            }
            const dto = new BaseResponseDto<TestData>({
                success: true,
                data: {
                    id: '123',
                    value: 456
                }
            });
            const errors = await validate(dto);
            expect(errors.length).toBe(0);
        });
    });
    describe('Performance', () => {
        it('should validate within 1ms', async () => {
            const dto = new BaseResponseDto({
                success: true,
                message: 'Operation successful',
                data: { test: 'data' }
            });
            const start = process.hrtime();
            await validate(dto);
            const [seconds, nanoseconds] = process.hrtime(start);
            const milliseconds = seconds * 1000 + nanoseconds / 1000000;
            expect(milliseconds).toBeLessThan(1);
        });
        it('should have memory footprint less than 2KB', () => {
            const dto = new BaseResponseDto({
                success: true,
                message: 'Operation successful',
                data: { test: 'data' },
                timestamp: new Date().toISOString()
            });
            const size = Buffer.byteLength(JSON.stringify(dto));
            expect(size).toBeLessThan(2048); // 2KB in bytes
        });
    });
    describe('Serialization', () => {
        it('should properly serialize and deserialize with data', () => {
            const original = new BaseResponseDto({
                success: true,
                message: 'Test message',
                data: { id: 1, name: 'test' },
                timestamp: new Date().toISOString()
            });
            const serialized = JSON.stringify(original);
            const deserialized = new BaseResponseDto(JSON.parse(serialized));
            expect(deserialized).toBeInstanceOf(BaseResponseDto);
            expect(deserialized.success).toBe(original.success);
            expect(deserialized.message).toBe(original.message);
            expect(deserialized.data).toEqual(original.data);
        });
        it('should handle undefined optional fields', () => {
            const original = new BaseResponseDto({
                success: true
            });
            const serialized = JSON.stringify(original);
            const deserialized = new BaseResponseDto(JSON.parse(serialized));
            expect(deserialized.message).toBeUndefined();
            expect(deserialized.data).toBeUndefined();
        });
    });
    describe('Timestamp', () => {
        it('should automatically set timestamp on creation', () => {
            const dto = new BaseResponseDto({
                success: true
            });
            expect(dto.timestamp).toBeDefined();
            expect(new Date(dto.timestamp).getTime()).not.toBeNaN();
        });
        it('should allow override of timestamp', () => {
            const customTimestamp = '2023-01-01T00:00:00.000Z';
            const dto = new BaseResponseDto({
                success: true,
                timestamp: customTimestamp
            });
            expect(dto.timestamp).toBe(customTimestamp);
        });
    });
});