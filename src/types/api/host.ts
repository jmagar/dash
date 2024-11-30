import { z } from 'zod';
import type { ApiEndpoint } from './base';
import { routeParamsSchema } from './base';

// Host schemas
export const hostSchema = z.object({
  id: z.string().uuid(),
  friendlyName: z.string().min(1),
  hostname: z.string().min(1),
  port: z.number().int().min(1).max(65535),
  username: z.string().min(1),
  status: z.enum(['online', 'offline', 'error', 'installing']),
  os: z.string().optional(),
  arch: z.string().optional(),
  version: z.string().optional(),
  metrics: z.object({
    cpu: z.number(),
    memory: z.number(),
    disk: z.number(),
    network: z.object({
      rx: z.number(),
      tx: z.number(),
    }),
  }).optional(),
  config: z.object({
    logLevel: z.enum(['debug', 'info', 'warn', 'error']),
    useSyslog: z.boolean(),
    metrics: z.object({
      collectionInterval: z.number(),
      retentionPeriod: z.number(),
      includeIO: z.boolean(),
      includeNetwork: z.boolean(),
      includeExtended: z.boolean(),
    }),
  }).optional(),
  lastSeen: z.string().datetime().optional(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export type Host = z.infer<typeof hostSchema>;

// Request schemas
export const createHostSchema = hostSchema.omit({
  id: true,
  status: true,
  os: true,
  arch: true,
  version: true,
  metrics: true,
  lastSeen: true,
  createdAt: true,
  updatedAt: true,
});

export type CreateHostRequest = z.infer<typeof createHostSchema>;

export const updateHostSchema = createHostSchema.partial();

export type UpdateHostRequest = z.infer<typeof updateHostSchema>;

// API Endpoints
export const hostEndpoints = {
  create: {
    config: {
      method: 'POST',
      path: '/hosts',
      requiresAuth: true,
    },
    requestSchema: createHostSchema,
    responseSchema: hostSchema,
  } satisfies ApiEndpoint<CreateHostRequest, Host>,

  update: {
    config: {
      method: 'PUT',
      path: '/hosts/:id',
      requiresAuth: true,
    },
    requestSchema: updateHostSchema,
    responseSchema: hostSchema,
  } satisfies ApiEndpoint<UpdateHostRequest, Host>,

  delete: {
    config: {
      method: 'DELETE',
      path: '/hosts/:id',
      requiresAuth: true,
    },
    requestSchema: routeParamsSchema.pick({ id: true }),
    responseSchema: z.object({ success: z.boolean() }),
  } satisfies ApiEndpoint<{ id: string }, { success: boolean }>,

  get: {
    config: {
      method: 'GET',
      path: '/hosts/:id',
      requiresAuth: true,
    },
    requestSchema: routeParamsSchema.pick({ id: true }),
    responseSchema: hostSchema,
  } satisfies ApiEndpoint<{ id: string }, Host>,

  list: {
    config: {
      method: 'GET',
      path: '/hosts',
      requiresAuth: true,
    },
    requestSchema: z.object({}),
    responseSchema: z.array(hostSchema),
  } satisfies ApiEndpoint<Record<string, never>, Host[]>,
};
