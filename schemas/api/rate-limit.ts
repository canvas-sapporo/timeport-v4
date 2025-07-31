import { z } from 'zod';

// ================================
// レート制限型スキーマ
// ================================

/**
 * レート制限情報スキーマ
 */
export const RateLimitInfoSchema = z.object({
  limit: z.number(),
  remaining: z.number(),
  reset_time: z.string(),
  retry_after: z.number().optional(),
});

/**
 * レート制限レスポンススキーマ
 */
export const RateLimitResponseSchema = z.object({
  success: z.literal(false),
  error: z.object({
    message: z.string(),
    code: z.literal('RATE_LIMIT_EXCEEDED'),
    retry_after: z.number(),
  }),
  rate_limit: RateLimitInfoSchema,
});

// レート制限型
export type RateLimitInfo = z.infer<typeof RateLimitInfoSchema>;
export type RateLimitResponse = z.infer<typeof RateLimitResponseSchema>;
