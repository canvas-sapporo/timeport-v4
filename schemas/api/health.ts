import { z } from 'zod';

// ================================
// ヘルスチェック・監視型スキーマ
// ================================

/**
 * ヘルスチェック結果スキーマ
 */
export const HealthCheckResultSchema = z.object({
  status: z.enum(['healthy', 'degraded', 'unhealthy']),
  timestamp: z.string(),
  checks: z.array(z.lazy(() => HealthCheckSchema)),
});

/**
 * 個別ヘルスチェックスキーマ
 */
export const HealthCheckSchema = z.object({
  name: z.string(),
  status: z.enum(['healthy', 'degraded', 'unhealthy']),
  response_time: z.number(),
  error: z.string().optional(),
  details: z.record(z.unknown()).optional(),
});

/**
 * システム情報スキーマ
 */
export const SystemInfoSchema = z.object({
  version: z.string(),
  environment: z.string(),
  uptime: z.number(),
  memory_usage: z.number(),
  cpu_usage: z.number(),
  database_status: z.string(),
  cache_status: z.string(),
});

// ヘルスチェック・監視型
export type HealthCheckResult = z.infer<typeof HealthCheckResultSchema>;
export type HealthCheck = z.infer<typeof HealthCheckSchema>;
export type SystemInfo = z.infer<typeof SystemInfoSchema>;
