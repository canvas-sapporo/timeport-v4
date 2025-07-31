import { z } from 'zod';

// ================================
// フォームフィールド型
// ================================

/**
 * フォームフィールドタイプ
 */
export const FieldTypeSchema = z.enum([
  'text',
  'textarea',
  'number',
  'date',
  'time',
  'datetime-local',
  'email',
  'tel',
  'url',
  'password',
  'select',
  'radio',
  'checkbox',
  'file',
  'hidden',
]);

/**
 * バリデーションルール
 */
export const ValidationRuleSchema = z.object({
  /** ルールタイプ */
  type: z.enum([
    'required',
    'minLength',
    'maxLength',
    'min',
    'max',
    'pattern',
    'email',
    'tel',
    'url',
    'custom',
  ]),
  /** ルール値 */
  value: z.union([z.string(), z.number()]).optional(),
  /** エラーメッセージ */
  message: z.string().optional(),
  /** カスタムバリデーター関数 */
  validator: z
    .function()
    .args(z.unknown())
    .returns(z.union([z.boolean(), z.string()]))
    .optional(),
});

/**
 * フィールド選択肢
 */
export const FieldOptionSchema = z.object({
  /** 値 */
  value: z.union([z.string(), z.number()]),
  /** ラベル */
  label: z.string(),
  /** 無効フラグ */
  disabled: z.boolean().optional(),
  /** 説明 */
  description: z.string().optional(),
});

/**
 * 条件表示ロジック
 */
export const ConditionalLogicSchema = z.object({
  /** 条件フィールド */
  field: z.string(),
  /** 演算子 */
  operator: z.enum([
    'equals',
    'not_equals',
    'contains',
    'not_contains',
    'greater_than',
    'less_than',
  ]),
  /** 条件値 */
  value: z.union([z.string(), z.number(), z.boolean()]),
  /** アクション */
  action: z.enum(['show', 'hide', 'require', 'disable']),
});

/**
 * フォームフィールド
 */
export const FormFieldSchema = z.object({
  /** フィールドID */
  id: z.string(),
  /** フィールド名 */
  name: z.string(),
  /** フィールドタイプ */
  type: FieldTypeSchema,
  /** ラベル */
  label: z.string(),
  /** プレースホルダー */
  placeholder: z.string().optional(),
  /** 説明 */
  description: z.string().optional(),
  /** 必須フラグ */
  required: z.boolean(),
  /** 無効フラグ */
  disabled: z.boolean().optional(),
  /** 読み取り専用フラグ */
  readonly: z.boolean().optional(),
  /** バリデーションルール */
  validation_rules: z.array(ValidationRuleSchema),
  /** 選択肢 */
  options: z.array(FieldOptionSchema).optional(),
  /** デフォルト値 */
  default_value: z.unknown().optional(),
  /** 表示順序 */
  order: z.number(),
  /** 表示幅 */
  width: z.enum(['full', 'half', 'third', 'quarter']).optional(),
  /** 条件表示ロジック */
  conditional_logic: z.array(ConditionalLogicSchema).optional(),
  /** メタデータ */
  metadata: z.record(z.unknown()).optional(),
});

// ================================
// フォーム設定型
// ================================

/**
 * フォームセクション
 */
export const FormSectionSchema = z.object({
  /** セクションID */
  id: z.string(),
  /** タイトル */
  title: z.string(),
  /** 説明 */
  description: z.string().optional(),
  /** 表示順序 */
  order: z.number(),
  /** 折りたたみ可能フラグ */
  collapsible: z.boolean().optional(),
  /** 初期折りたたみ状態 */
  collapsed: z.boolean().optional(),
  /** フィールド一覧 */
  fields: z.array(FormFieldSchema),
});

// ================================
// 型定義のエクスポート
// ================================

export type FieldType = z.infer<typeof FieldTypeSchema>;
export type ValidationRule = z.infer<typeof ValidationRuleSchema>;
export type FieldOption = z.infer<typeof FieldOptionSchema>;
export type ConditionalLogic = z.infer<typeof ConditionalLogicSchema>;
export type FormField = z.infer<typeof FormFieldSchema>;
export type FormSection = z.infer<typeof FormSectionSchema>;
