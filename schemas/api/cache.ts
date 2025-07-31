import { z } from 'zod';

// ================================
// キャッシュ・パフォーマンス型スキーマ
// ================================

/**
 * キャッシュ設定スキーマ
 */
export const CacheConfigSchema = z.object({
  enabled: z.boolean(),
  ttl: z.number(),
  key_prefix: z.string(),
  strategy: z.enum(['memory', 'redis', 'database']),
});

/**
 * パフォーマンスメトリクススキーマ
 */
export const PerformanceMetricsSchema = z.object({
  response_time: z.number(),
  memory_usage: z.number(),
  cpu_usage: z.number(),
  database_queries: z.number(),
  cache_hits: z.number(),
  cache_misses: z.number(),
});

// キャッシュ・パフォーマンス型
export type CacheConfig = z.infer<typeof CacheConfigSchema>;
export type PerformanceMetrics = z.infer<typeof PerformanceMetricsSchema>;
