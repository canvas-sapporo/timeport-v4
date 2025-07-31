import { z } from 'zod';

// ================================
// フォーム送信・バリデーション型
// ================================

/**
 * フォーム送信データ
 */
export const FormSubmissionSchema = z.object({
  /** フォームID */
  form_id: z.string(),
  /** ユーザーID */
  user_id: z.string().uuid(),
  /** 送信データ */
  data: z.record(z.unknown()),
  /** ステータス */
  status: z.enum(['draft', 'submitted', 'processing', 'completed', 'error']),
  /** 送信日時 */
  submitted_at: z.string().datetime().optional(),
  /** メタデータ */
  metadata: z.record(z.unknown()).optional(),
});

/**
 * バリデーションエラー
 */
export const ValidationErrorSchema = z.object({
  /** フィールド名 */
  field: z.string(),
  /** エラーメッセージ */
  message: z.string(),
  /** エラーコード */
  code: z.string().optional(),
});

/**
 * フォームバリデーション結果
 */
export const FormValidationResultSchema = z.object({
  /** バリデーション成功フラグ */
  valid: z.boolean(),
  /** エラー一覧 */
  errors: z.array(ValidationErrorSchema),
  /** 警告一覧 */
  warnings: z.array(ValidationErrorSchema).optional(),
});

// ================================
// フォームデータ型
// ================================

/**
 * フォームデータ型
 */
export const FormDataSchema = z.record(
  z.union([z.string(), z.number(), z.boolean(), z.array(z.string()), z.instanceof(File), z.null()])
);

/**
 * フォームエラー型
 */
export const FormErrorsSchema = z.record(z.string().optional());

/**
 * フォーム状態型
 */
export const FormStateSchema = z.object({
  isDirty: z.boolean(),
  isSubmitting: z.boolean(),
  isValid: z.boolean(),
  errors: FormErrorsSchema,
  touched: z.record(z.boolean()),
  values: FormDataSchema,
});

/**
 * フォーム変更イベント型
 */
export const FormChangeEventSchema = z.object({
  field: z.string(),
  value: z.unknown(),
  formState: FormStateSchema,
});

/**
 * フォーム送信イベント型
 */
export const FormSubmitEventSchema = z.object({
  data: FormDataSchema,
  formState: FormStateSchema,
  isValid: z.boolean(),
});

/**
 * フォームエラーイベント型
 */
export const FormErrorEventSchema = z.object({
  errors: FormErrorsSchema,
  field: z.string().optional(),
  message: z.string(),
});

// ================================
// 型定義のエクスポート
// ================================

export type FormSubmission = z.infer<typeof FormSubmissionSchema>;
export type ValidationError = z.infer<typeof ValidationErrorSchema>;
export type FormValidationResult = z.infer<typeof FormValidationResultSchema>;
export type FormData = z.infer<typeof FormDataSchema>;
export type FormErrors = z.infer<typeof FormErrorsSchema>;
export type FormState = z.infer<typeof FormStateSchema>;
export type FormChangeEvent = z.infer<typeof FormChangeEventSchema>;
export type FormSubmitEvent = z.infer<typeof FormSubmitEventSchema>;
export type FormErrorEvent = z.infer<typeof FormErrorEventSchema>;
