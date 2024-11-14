/**
 * Cache module exports
 * Provides a centralized interface for caching operations
 */

import type { ICacheService } from './cache/types';
import { cacheService } from './cache/CacheService';

const cache: ICacheService = cacheService;

export default cache;
export * from './cache/types';
export * from './cache/config';
