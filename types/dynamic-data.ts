/**
 * 動的データ関連の型定義
 *
 * フォームデータ、設定データ、メタデータなど、
 * 動的な構造を持つデータの型を定義
 */

import { z } from 'zod';

// ================================
// 基本データ型
// ================================

/**
 * 動的データの基本型
 */
export const DynamicDataSchema = z.union([
  z.string(),
  z.number(),
  z.boolean(),
  z.null(),
  z.undefined(),
  z.array(z.string()),
  z.array(z.number()),
  z.array(z.boolean()),
  z.record(z.unknown()),
]);

/**
 * 動的フォームデータ型
 */
export const DynamicFormDataSchema = z.record(DynamicDataSchema);

/**
 * 設定データ型
 */
export const SettingsDataSchema = z.record(
  z.union([
    z.string(),
    z.number(),
    z.boolean(),
    z.array(z.string()),
    z.array(z.number()),
    z.record(z.unknown()),
  ])
);

/**
 * メタデータ型
 */
export const MetadataSchema = z.record(
  z.union([
    z.string(),
    z.number(),
    z.boolean(),
    z.array(z.string()),
    z.array(z.number()),
    z.record(z.unknown()),
  ])
);

// ================================
// フォーム設定型
// ================================

/**
 * フォーム設定項目型
 */
export const FormConfigItemSchema = z.object({
  /** フィールド名 */
  field_name: z.string(),
  /** フィールドタイプ */
  field_type: z.string(),
  /** 必須フラグ */
  required: z.boolean().optional(),
  /** デフォルト値 */
  default_value: DynamicDataSchema.optional(),
  /** バリデーションルール */
  validation_rules: z.array(z.record(z.unknown())).optional(),
  /** 表示設定 */
  display_options: z.record(z.unknown()).optional(),
});

/**
 * 承認フロー項目型
 */
export const ApprovalFlowItemSchema = z.object({
  /** ステップ番号 */
  step: z.number(),
  /** ステップ名 */
  name: z.string(),
  /** 承認者ロール */
  approver_role: z.string().optional(),
  /** 承認者ID */
  approver_id: z.string().optional(),
  /** 必須フラグ */
  required: z.boolean(),
  /** 条件 */
  conditions: z.array(z.record(z.unknown())).optional(),
});

// ================================
// エラーデータ型
// ================================

/**
 * エラー情報型
 */
export const ErrorDataSchema = z.object({
  /** エラーメッセージ */
  message: z.string(),
  /** エラーコード */
  code: z.string().optional(),
  /** フィールド名 */
  field: z.string().optional(),
  /** 詳細情報 */
  details: z.record(z.unknown()).optional(),
});

/**
 * バリデーションエラー型
 */
export const ValidationErrorDataSchema = z.object({
  /** フィールド名 */
  field: z.string(),
  /** エラーメッセージ */
  message: z.string(),
  /** エラータイプ */
  type: z.string().optional(),
  /** エラー値 */
  value: DynamicDataSchema.optional(),
});

// ================================
// レスポンスデータ型
// ================================

/**
 * APIレスポンスデータ型
 */
export const ApiResponseDataSchema = z.object({
  /** 成功フラグ */
  success: z.boolean(),
  /** データ */
  data: DynamicDataSchema.optional(),
  /** エラー情報 */
  error: ErrorDataSchema.optional(),
  /** メタ情報 */
  meta: z.record(z.unknown()).optional(),
});

/**
 * リストレスポンスデータ型
 */
export const ListResponseDataSchema = z.object({
  /** アイテム一覧 */
  items: z.array(z.record(z.unknown())),
  /** 総件数 */
  total: z.number(),
  /** ページ情報 */
  pagination: z
    .object({
      page: z.number(),
      limit: z.number(),
      total_pages: z.number(),
    })
    .optional(),
});

// ================================
// 型定義のエクスポート
// ================================

export type DynamicData = z.infer<typeof DynamicDataSchema>;
export type DynamicFormData = z.infer<typeof DynamicFormDataSchema>;
export type SettingsData = z.infer<typeof SettingsDataSchema>;
export type Metadata = z.infer<typeof MetadataSchema>;
export type FormConfigItem = z.infer<typeof FormConfigItemSchema>;
export type ApprovalFlowItem = z.infer<typeof ApprovalFlowItemSchema>;
export type ErrorData = z.infer<typeof ErrorDataSchema>;
export type ValidationErrorData = z.infer<typeof ValidationErrorDataSchema>;
export type ApiResponseData = z.infer<typeof ApiResponseDataSchema>;
export type ListResponseData = z.infer<typeof ListResponseDataSchema>;
