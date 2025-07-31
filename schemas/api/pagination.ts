import { z } from 'zod';

// ================================
// ページネーション型スキーマ
// ================================

/**
 * ページネーションパラメータスキーマ
 */
export const PaginationParamsSchema = z.object({
  page: z.number().optional(),
  limit: z.number().optional(),
  offset: z.number().optional(),
});

/**
 * ページネーション情報スキーマ
 */
export const PaginationInfoSchema = z.object({
  current_page: z.number(),
  total_pages: z.number(),
  total_count: z.number(),
  limit: z.number(),
  has_next: z.boolean(),
  has_prev: z.boolean(),
});

/**
 * ページネーション付きレスポンススキーマ
 */
export const PaginatedResponseSchema = z.object({
  data: z.array(z.unknown()),
  pagination: PaginationInfoSchema,
});

// ページネーション型
export type PaginationParams = z.infer<typeof PaginationParamsSchema>;
export type PaginationInfo = z.infer<typeof PaginationInfoSchema>;
export type PaginatedResponse<T> = z.infer<typeof PaginatedResponseSchema> & {
  data: T[];
};
