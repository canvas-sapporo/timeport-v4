import { z } from 'zod';

// ================================
// バッチ処理型スキーマ
// ================================

/**
 * バッチジョブスキーマ
 */
export const BatchJobSchema = z.object({
  id: z.string(),
  type: z.string(),
  status: z.enum(['pending', 'running', 'completed', 'failed', 'cancelled']),
  progress: z.number(),
  total_items: z.number(),
  processed_items: z.number(),
  failed_items: z.number(),
  created_at: z.string(),
  started_at: z.string().optional(),
  completed_at: z.string().optional(),
  error: z.string().optional(),
});

/**
 * バッチジョブ作成リクエストスキーマ
 */
export const BatchJobRequestSchema = z.object({
  type: z.string(),
  data: z.record(z.unknown()),
  priority: z.enum(['low', 'normal', 'high']).optional(),
  scheduled_at: z.string().optional(),
});

// バッチ処理型
export type BatchJob = z.infer<typeof BatchJobSchema>;
export type BatchJobRequest = z.infer<typeof BatchJobRequestSchema>;
