import { z } from 'zod';

import { BaseEntitySchema, UUIDSchema } from './base';

// ================================
// フォーム・バリデーション関連型
// ================================

/**
 * フォーム
 */
export const FormSchema = BaseEntitySchema.extend({
  /** 申請フォームID */
  request_form_id: UUIDSchema,
  /** フィールド名 */
  field_name: z.string(),
  /** フィールドタイプ */
  field_type: z.string(),
  /** フィールドラベル */
  field_label: z.string(),
  /** フィールドオプション */
  field_options: z.record(z.unknown()).optional(),
  /** 必須フラグ */
  is_required: z.boolean(),
  /** 表示順序 */
  display_order: z.number(),
});

/**
 * バリデーション
 */
export const ValidationSchema = BaseEntitySchema.extend({
  /** フォームID */
  form_id: UUIDSchema,
  /** ルールタイプ */
  rule_type: z.string(),
  /** ルール値 */
  rule_value: z.string().optional(),
  /** エラーメッセージ */
  error_message: z.string().optional(),
});

// ================================
// 型定義のエクスポート
// ================================

export type Form = z.infer<typeof FormSchema>;
export type Validation = z.infer<typeof ValidationSchema>;
