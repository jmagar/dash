import { validate } from 'class-validator';
import { BaseSearchDto } from '../base-search.dto';
import { SortDirection } from '../enums';

describe('BaseSearchDto', () => {
  describe('Type Safety', () => {
    it('should enforce page as number', async () => {
      const dto = new BaseSearchDto({
        page: '1' as any,
        limit: 10
      });
      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].property).toBe('page');
      expect(errors[0].constraints).toHaveProperty('isNumber');
    });

    it('should enforce limit as number', async () => {
      const dto = new BaseSearchDto({
        page: 1,
        limit: '10' as any
      });
      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].property).toBe('limit');
      expect(errors[0].constraints).toHaveProperty('isNumber');
    });

    it('should validate sort options', async () => {
      const dto = new BaseSearchDto({
        page: 1,
        limit: 10,
        sort: [{
          field: 123 as any, // should be string
          direction: SortDirection.ASC
        }]
      });
      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].property).toBe('sort');
    });

    it('should validate fields as string array', async () => {
      const dto = new BaseSearchDto({
        page: 1,
        limit: 10,
        fields: [123, 456] as any
      });
      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].property).toBe('fields');
    });
  });

  describe('Pagination', () => {
    it('should enforce minimum page value', async () => {
      const dto = new BaseSearchDto({
        page: 0,
        limit: 10
      });
      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].property).toBe('page');
      expect(errors[0].constraints).toHaveProperty('min');
    });

    it('should enforce minimum limit value', async () => {
      const dto = new BaseSearchDto({
        page: 1,
        limit: 0
      });
      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].property).toBe('limit');
      expect(errors[0].constraints).toHaveProperty('min');
    });

    it('should use default values when not provided', () => {
      const dto = new BaseSearchDto({});
      expect(dto.page).toBe(1);
      expect(dto.limit).toBe(10);
    });
  });

  describe('Sort Options', () => {
    it('should validate sort direction enum', async () => {
      const dto = new BaseSearchDto({
        page: 1,
        limit: 10,
        sort: [{
          field: 'name',
          direction: 'INVALID' as any
        }]
      });
      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].property).toBe('sort');
    });

    it('should accept valid sort options', async () => {
      const dto = new BaseSearchDto({
        page: 1,
        limit: 10,
        sort: [
          { field: 'name', direction: SortDirection.ASC },
          { field: 'createdAt', direction: SortDirection.DESC }
        ]
      });
      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });
  });

  describe('Performance', () => {
    it('should validate within 1ms', async () => {
      const dto = new BaseSearchDto({
        page: 1,
        limit: 10,
        query: 'test search',
        sort: [
          { field: 'name', direction: SortDirection.ASC },
          { field: 'createdAt', direction: SortDirection.DESC }
        ],
        fields: ['id', 'name', 'description'],
        filters: JSON.stringify({
          status: 'active',
          category: ['A', 'B']
        })
      });

      const start = process.hrtime();
      await validate(dto);
      const [seconds, nanoseconds] = process.hrtime(start);
      const milliseconds = seconds * 1000 + nanoseconds / 1000000;
      
      expect(milliseconds).toBeLessThan(1);
    });

    it('should have memory footprint less than 2KB', () => {
      const dto = new BaseSearchDto({
        page: 1,
        limit: 10,
        query: 'test search with some longer query string',
        sort: [
          { field: 'name', direction: SortDirection.ASC },
          { field: 'createdAt', direction: SortDirection.DESC },
          { field: 'priority', direction: SortDirection.DESC }
        ],
        fields: ['id', 'name', 'description', 'status', 'category', 'createdAt'],
        filters: JSON.stringify({
          status: 'active',
          category: ['A', 'B', 'C'],
          priority: ['HIGH', 'MEDIUM'],
          dateRange: {
            start: '2023-01-01',
            end: '2023-12-31'
          }
        })
      });

      const size = Buffer.byteLength(JSON.stringify(dto));
      expect(size).toBeLessThan(2048); // 2KB in bytes
    });
  });

  describe('Serialization', () => {
    it('should properly serialize and deserialize with all fields', () => {
      const original = new BaseSearchDto({
        page: 2,
        limit: 20,
        query: 'test search',
        sort: [
          { field: 'name', direction: SortDirection.ASC },
          { field: 'createdAt', direction: SortDirection.DESC }
        ],
        fields: ['id', 'name', 'createdAt'],
        filters: JSON.stringify({ status: 'active' })
      });

      const serialized = JSON.stringify(original);
      const deserialized = new BaseSearchDto(JSON.parse(serialized));

      expect(deserialized).toBeInstanceOf(BaseSearchDto);
      expect(deserialized.page).toBe(original.page);
      expect(deserialized.limit).toBe(original.limit);
      expect(deserialized.query).toBe(original.query);
      expect(deserialized.sort).toEqual(original.sort);
      expect(deserialized.fields).toEqual(original.fields);
      expect(deserialized.filters).toBe(original.filters);
    });

    it('should handle optional fields correctly', () => {
      const original = new BaseSearchDto({
        page: 1,
        limit: 10
      });

      const serialized = JSON.stringify(original);
      const deserialized = new BaseSearchDto(JSON.parse(serialized));

      expect(deserialized.query).toBeUndefined();
      expect(deserialized.sort).toBeUndefined();
      expect(deserialized.fields).toBeUndefined();
      expect(deserialized.filters).toBeUndefined();
    });
  });

  describe('Filter Validation', () => {
    it('should validate filters as JSON string', async () => {
      const dto = new BaseSearchDto({
        page: 1,
        limit: 10,
        filters: '{invalid json'
      });
      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].property).toBe('filters');
    });

    it('should accept valid JSON filters', async () => {
      const dto = new BaseSearchDto({
        page: 1,
        limit: 10,
        filters: JSON.stringify({
          status: 'active',
          categories: ['A', 'B']
        })
      });
      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });
  });
});
