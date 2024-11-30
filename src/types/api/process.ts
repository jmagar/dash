import { z } from 'zod';
import type { ApiEndpoint } from './base';
import { routeParamsSchema } from './base';

// Process schemas
export const processSchema = z.object({
  pid: z.number().int().min(1),
  name: z.string().min(1),
  command: z.string(),
  args: z.array(z.string()),
  status: z.enum(['running', 'stopped', 'zombie', 'unknown']),
  cpu: z.number().min(0).max(100),
  memory: z.number().min(0),
  user: z.string(),
  startTime: z.date(),
  uptime: z.number(),
});

export type Process = z.infer<typeof processSchema>;

// Process metrics schema
export const processMetricsSchema = z.object({
  pid: z.number().int().min(1),
  timestamp: z.date(),
  cpu: z.number().min(0).max(100),
  memory: z.number().min(0),
  threads: z.number().int().min(0),
  fds: z.number().int().min(0),
  io: z.object({
    read: z.number().min(0),
    write: z.number().min(0),
  }),
});

export type ProcessMetrics = z.infer<typeof processMetricsSchema>;

// Request schemas
export const processQuerySchema = z.object({
  hostId: z.string().uuid(),
  filter: z.object({
    name: z.string().optional(),
    user: z.string().optional(),
    status: processSchema.shape.status.optional(),
  }).optional(),
});

export type ProcessQuery = z.infer<typeof processQuerySchema>;

// API Endpoints
export const processEndpoints = {
  list: {
    config: {
      method: 'GET',
      path: '/hosts/:hostId/processes',
      requiresAuth: true,
    },
    requestSchema: routeParamsSchema.pick({ hostId: true }),
    responseSchema: z.array(processSchema),
  } satisfies ApiEndpoint<{ hostId: string }, Process[]>,

  get: {
    config: {
      method: 'GET',
      path: '/hosts/:hostId/processes/:pid',
      requiresAuth: true,
    },
    requestSchema: routeParamsSchema.pick({ hostId: true }).extend({
      pid: z.number().int().min(1),
    }),
    responseSchema: processSchema,
  } satisfies ApiEndpoint<{ hostId: string; pid: number }, Process>,

  metrics: {
    config: {
      method: 'GET',
      path: '/hosts/:hostId/processes/:pid/metrics',
      requiresAuth: true,
    },
    requestSchema: routeParamsSchema.pick({ hostId: true }).extend({
      pid: z.number().int().min(1),
    }),
    responseSchema: processMetricsSchema,
  } satisfies ApiEndpoint<{ hostId: string; pid: number }, ProcessMetrics>,

  kill: {
    config: {
      method: 'POST',
      path: '/hosts/:hostId/processes/:pid/kill',
      requiresAuth: true,
    },
    requestSchema: routeParamsSchema.pick({ hostId: true }).extend({
      pid: z.number().int().min(1),
      signal: z.enum(['SIGTERM', 'SIGKILL', 'SIGINT']).optional(),
    }),
    responseSchema: z.object({ success: z.boolean() }),
  } satisfies ApiEndpoint<{ hostId: string; pid: number; signal?: string }, { success: boolean }>,
};
