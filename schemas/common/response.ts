import { z } from 'zod';

// ================================
// 共通APIレスポンス型スキーマ
// ================================

/**
 * 基本的なAPIレスポンススキーマ
 */
export const ApiResponseSchema = z.object({
  success: z.boolean(),
  data: z.unknown().optional(),
  error: z
    .object({
      message: z.string(),
      code: z.string().optional(),
    })
    .optional(),
});

/**
 * 成功レスポンススキーマ
 */
export const SuccessResponseSchema = z.object({
  success: z.literal(true),
  data: z.unknown(),
});

/**
 * エラーレスポンススキーマ
 */
export const ErrorResponseSchema = z.object({
  success: z.literal(false),
  error: z.object({
    message: z.string(),
    code: z.string().optional(),
  }),
});

/**
 * 条件付きレスポンススキーマ
 */
export const ConditionalResponseSchema = z.union([SuccessResponseSchema, ErrorResponseSchema]);

// 共通APIレスポンス型
export type ApiResponse<T = unknown> = z.infer<typeof ApiResponseSchema> & {
  data?: T;
};
export type SuccessResponse<T = unknown> = z.infer<typeof SuccessResponseSchema> & {
  data: T;
};
export type ErrorResponse = z.infer<typeof ErrorResponseSchema>;
export type ConditionalResponse<T> = SuccessResponse<T> | ErrorResponse;
