import { z } from 'zod';

// ================================
// 共通バリデーション型スキーマ
// ================================

/**
 * バリデーションエラースキーマ
 */
export const ValidationErrorSchema = z.object({
  field: z.string(),
  message: z.string(),
  code: z.string().optional(),
  value: z.unknown().optional(),
});

/**
 * バリデーション結果スキーマ
 */
export const ValidationResultSchema = z.object({
  isValid: z.boolean(),
  errors: z.array(ValidationErrorSchema),
});

/**
 * フォームバリデーション結果スキーマ
 */
export const FormValidationResultSchema = z.object({
  isValid: z.boolean(),
  errors: z.array(ValidationErrorSchema),
  data: z.record(z.unknown()).optional(),
});

/**
 * バリデーションエラーレスポンススキーマ
 */
export const ValidationErrorResponseSchema = z.object({
  success: z.literal(false),
  error: z.object({
    message: z.string(),
    code: z.literal('VALIDATION_ERROR'),
    details: z.array(ValidationErrorSchema),
  }),
});

// 共通バリデーション型
export type ValidationError = z.infer<typeof ValidationErrorSchema>;
export type ValidationResult = z.infer<typeof ValidationResultSchema>;
export type FormValidationResult<T = Record<string, unknown>> = z.infer<
  typeof FormValidationResultSchema
> & {
  data?: T;
};
export type ValidationErrorResponse = z.infer<typeof ValidationErrorResponseSchema>;
