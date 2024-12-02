import { z } from 'zod';

export const ResourceMetricsSchema = z.object({
  value: z.number(),
  unit: z.enum(['percentage', 'bytes', 'bytesPerSecond']),
  timestamp: z.string()
}).readonly();

export type ResourceMetrics = z.infer<typeof ResourceMetricsSchema>;

export const NetworkMetricsSchema = z.object({
  rx: ResourceMetricsSchema,
  tx: ResourceMetricsSchema
}).readonly();

export type NetworkMetrics = z.infer<typeof NetworkMetricsSchema>;

export const AgentMetricsSchema = z.object({
  cpu: ResourceMetricsSchema,
  memory: ResourceMetricsSchema,
  disk: ResourceMetricsSchema,
  network: NetworkMetricsSchema,
  timestamp: z.string()
}).readonly();

export type AgentMetrics = z.infer<typeof AgentMetricsSchema>;
