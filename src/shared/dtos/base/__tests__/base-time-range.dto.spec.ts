import { validate } from 'class-validator';
import { BaseTimeRangeDto, TimeGranularity } from '../base-time-range.dto';

describe('BaseTimeRangeDto', () => {
  describe('Type Safety', () => {
    it('should enforce startDate as Date', async () => {
      const dto = new BaseTimeRangeDto({
        startDate: 'invalid-date' as any,
        endDate: new Date()
      });
      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      const dateError = errors.find(e => e.property === 'startDate');
      expect(dateError).toBeDefined();
      expect(dateError?.constraints).toHaveProperty('isDate');
    });

    it('should enforce endDate as Date', async () => {
      const dto = new BaseTimeRangeDto({
        startDate: new Date(),
        endDate: 'invalid-date' as any
      });
      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      const dateError = errors.find(e => e.property === 'endDate');
      expect(dateError).toBeDefined();
      expect(dateError?.constraints).toHaveProperty('isDate');
    });

    it('should accept valid timezone string', async () => {
      const dto = new BaseTimeRangeDto({
        startDate: new Date(),
        endDate: new Date(),
        timezone: 'America/New_York'
      });
      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });

    it('should reject invalid timezone string', async () => {
      const dto = new BaseTimeRangeDto({
        startDate: new Date(),
        endDate: new Date(),
        timezone: 'Invalid/Timezone'
      });
      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      const timezoneError = errors.find(e => e.property === 'timezone');
      expect(timezoneError).toBeDefined();
    });

    it('should accept valid granularity enum values', async () => {
      const validGranularities = Object.values(TimeGranularity);
      
      for (const granularity of validGranularities) {
        const dto = new BaseTimeRangeDto({
          startDate: new Date(),
          endDate: new Date(),
          granularity
        });
        const errors = await validate(dto);
        expect(errors.length).toBe(0);
      }
    });

    it('should reject invalid granularity values', async () => {
      const dto = new BaseTimeRangeDto({
        startDate: new Date(),
        endDate: new Date(),
        granularity: 'invalid' as any
      });
      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      const granularityError = errors.find(e => e.property === 'granularity');
      expect(granularityError).toBeDefined();
      expect(granularityError?.constraints).toHaveProperty('isEnum');
    });
  });

  describe('Date Validation', () => {
    it('should validate that startDate is before endDate', async () => {
      const endDate = new Date();
      const startDate = new Date(endDate.getTime() + 1000); // startDate after endDate
      
      const dto = new BaseTimeRangeDto({
        startDate,
        endDate
      });
      
      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      const dateError = errors.find(e => e.constraints?.isStartDateBeforeEndDate);
      expect(dateError).toBeDefined();
    });

    it('should accept equal start and end dates', async () => {
      const date = new Date();
      const dto = new BaseTimeRangeDto({
        startDate: new Date(date),
        endDate: new Date(date)
      });
      
      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });

    it('should accept valid date range with timezone and granularity', async () => {
      const startDate = new Date('2023-01-01T00:00:00Z');
      const endDate = new Date('2023-12-31T23:59:59Z');
      
      const dto = new BaseTimeRangeDto({
        startDate,
        endDate,
        timezone: 'UTC',
        granularity: TimeGranularity.MONTH
      });
      
      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });
  });

  describe('Performance', () => {
    it('should validate within 1ms', async () => {
      const dto = new BaseTimeRangeDto({
        startDate: new Date(),
        endDate: new Date(),
        timezone: 'UTC',
        granularity: TimeGranularity.DAY
      });

      const start = process.hrtime();
      await validate(dto);
      const [seconds, nanoseconds] = process.hrtime(start);
      const milliseconds = seconds * 1000 + nanoseconds / 1000000;
      
      expect(milliseconds).toBeLessThan(1);
    });

    it('should have memory footprint less than 2KB', () => {
      const dto = new BaseTimeRangeDto({
        startDate: new Date(),
        endDate: new Date(),
        timezone: 'America/Los_Angeles',
        granularity: TimeGranularity.MONTH
      });

      const size = Buffer.byteLength(JSON.stringify(dto));
      expect(size).toBeLessThan(2048); // 2KB in bytes
    });
  });

  describe('Serialization', () => {
    it('should properly serialize and deserialize', () => {
      const original = new BaseTimeRangeDto({
        startDate: new Date('2023-01-01T00:00:00Z'),
        endDate: new Date('2023-12-31T23:59:59Z'),
        timezone: 'UTC',
        granularity: TimeGranularity.MONTH
      });

      const serialized = JSON.stringify(original);
      const deserialized = new BaseTimeRangeDto(JSON.parse(serialized));

      expect(deserialized.startDate.toISOString()).toBe(original.startDate.toISOString());
      expect(deserialized.endDate.toISOString()).toBe(original.endDate.toISOString());
      expect(deserialized.timezone).toBe(original.timezone);
      expect(deserialized.granularity).toBe(original.granularity);
    });
  });
});
