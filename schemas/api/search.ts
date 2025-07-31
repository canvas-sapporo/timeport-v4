import { z } from 'zod';

// ================================
// 検索・フィルタ型スキーマ
// ================================

/**
 * 基本検索パラメータスキーマ
 */
export const SearchParamsSchema = z.object({
  q: z.string().optional(),
  search: z.string().optional(),
  sort_by: z.string().optional(),
  sort_order: z.enum(['asc', 'desc']).optional(),
});

/**
 * 日付範囲検索パラメータスキーマ
 */
export const DateRangeParamsSchema = z.object({
  start_date: z.string().optional(),
  end_date: z.string().optional(),
  date_from: z.string().optional(),
  date_to: z.string().optional(),
});

/**
 * ステータス検索パラメータスキーマ
 */
export const StatusParamsSchema = z.object({
  status: z.string().optional(),
  is_active: z.boolean().optional(),
  is_deleted: z.boolean().optional(),
});

/**
 * 複合検索パラメータスキーマ
 */
export const AdvancedSearchParamsSchema = SearchParamsSchema.merge(DateRangeParamsSchema)
  .merge(StatusParamsSchema)
  .extend({
    filters: z.record(z.unknown()).optional(),
    include: z.array(z.string()).optional(),
    exclude: z.array(z.string()).optional(),
  });

// 検索・フィルタ型
export type SearchParams = z.infer<typeof SearchParamsSchema>;
export type DateRangeParams = z.infer<typeof DateRangeParamsSchema>;
export type StatusParams = z.infer<typeof StatusParamsSchema>;
export type AdvancedSearchParams = z.infer<typeof AdvancedSearchParamsSchema>;
