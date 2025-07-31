import { z } from 'zod';

import { FilterDataSchema } from './base';

// ================================
// API関連型
// ================================

/**
 * APIレスポンス
 */
export const ApiResponseSchema = z.object({
  /** データ */
  data: z.unknown().optional(),
  /** エラー */
  error: z.string().optional(),
  /** メッセージ */
  message: z.string().optional(),
  /** 成功フラグ */
  success: z.boolean(),
});

/**
 * ページネーション付きレスポンス
 */
export const PaginatedResponseSchema = z.object({
  /** データ */
  data: z.array(z.unknown()),
  /** 総数 */
  total: z.number(),
  /** ページ番号 */
  page: z.number(),
  /** 制限 */
  limit: z.number(),
  /** 総ページ数 */
  totalPages: z.number(),
  /** 次のページがあるか */
  hasMore: z.boolean(),
});

/**
 * クエリオプション
 */
export const QueryOptionsSchema = z.object({
  /** 制限 */
  limit: z.number().optional(),
  /** オフセット */
  offset: z.number().optional(),
  /** ソート項目 */
  orderBy: z.string().optional(),
  /** 昇順フラグ */
  ascending: z.boolean().optional(),
  /** フィルター */
  filters: FilterDataSchema.optional(),
});

// ================================
// 型定義のエクスポート
// ================================

export type ApiResponse<T = unknown> = z.infer<typeof ApiResponseSchema> & { data?: T };
export type PaginatedResponse<T = unknown> = z.infer<typeof PaginatedResponseSchema> & {
  data: T[];
};
export type QueryOptions = z.infer<typeof QueryOptionsSchema>;
