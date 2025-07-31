import { z } from 'zod';

// 共通バリデーション型をインポート
export * from '@/schemas/common/validation';

// ================================
// API固有エラーハンドリング型スキーマ
// ================================

/**
 * APIエラースキーマ
 */
export const ApiErrorSchema = z.object({
  message: z.string(),
  code: z.string(),
  status_code: z.number().optional(),
  details: z.record(z.unknown()).optional(),
  stack: z.string().optional(),
});

// API固有エラーハンドリング型
export type ApiError = z.infer<typeof ApiErrorSchema>;
