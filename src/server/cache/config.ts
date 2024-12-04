import { z } from 'zod';
import { 
  RedisConnectionConfig, 
  RedisConfig 
} from '../../types/redis';

export const CacheConfigSchema = z.object({
  strategy: z.enum(['redis', 'lru', 'hybrid']).default('lru'),
  redisConfig: z.object({
    host: z.string().default('localhost'),
    port: z.number().default(6379),
    password: z.string().optional(),
    db: z.number().optional(),
    maxRetriesPerRequest: z.number().optional().default(3),
    enableReadyCheck: z.boolean().optional().default(true),
  }).optional(),
  maxSize: z.number().positive().default(1000),
  ttl: z.number().positive().default(3600), // 1 hour default
});

export type CacheConfig = z.infer<typeof CacheConfigSchema>;

export const defaultCacheConfig: CacheConfig = {
  strategy: 'lru',
  redisConfig: {
    host: 'localhost',
    port: 6379,
    maxRetriesPerRequest: 3,
    enableReadyCheck: true,
  },
  maxSize: 1000,
  ttl: 3600,
};
