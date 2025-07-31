import { z } from 'zod';

import { FormFieldSchema, FormSectionSchema } from '@/schemas/form/field';
import { FormConfigurationSchema } from '@/schemas/form/template';

// ================================
// フォームビルダー型
// ================================

/**
 * フォームビルダーフィールド
 */
export const FormBuilderFieldSchema = FormFieldSchema.omit({ id: true }).extend({
  /** フィールドID（新規作成時は未定義） */
  id: z.string().optional(),
  /** 新規フラグ */
  isNew: z.boolean().optional(),
  /** 変更フラグ */
  isDirty: z.boolean().optional(),
});

/**
 * フォームビルダーセクション
 */
export const FormBuilderSectionSchema = FormSectionSchema.omit({ id: true, fields: true }).extend({
  /** セクションID（新規作成時は未定義） */
  id: z.string().optional(),
  /** フィールド一覧 */
  fields: z.array(FormBuilderFieldSchema),
  /** 新規フラグ */
  isNew: z.boolean().optional(),
  /** 変更フラグ */
  isDirty: z.boolean().optional(),
});

/**
 * フォームビルダー設定
 */
export const FormBuilderConfigurationSchema = FormConfigurationSchema.omit({
  sections: true,
}).extend({
  /** フォームID（新規作成時は未定義） */
  id: z.string().optional(),
  /** セクション一覧 */
  sections: z.array(FormBuilderSectionSchema),
  /** 新規フラグ */
  isNew: z.boolean().optional(),
  /** 変更フラグ */
  isDirty: z.boolean().optional(),
});

/**
 * フォームビルダープロパティ
 */
export const FormBuilderPropsSchema = z.object({
  /** 初期設定 */
  initialConfiguration: FormBuilderConfigurationSchema.optional(),
  /** 保存ハンドラー */
  onSave: z
    .function()
    .args(FormBuilderConfigurationSchema)
    .returns(z.union([z.void(), z.promise(z.void())])),
  /** キャンセルハンドラー */
  onCancel: z.function().returns(z.void()).optional(),
  /** プレビューハンドラー */
  onPreview: z.function().args(FormBuilderConfigurationSchema).returns(z.void()).optional(),
  /** ローディング状態 */
  loading: z.boolean().optional(),
  /** モード */
  mode: z.enum(['create', 'edit']).optional(),
});

// ================================
// 動的フォーム型
// ================================

/**
 * 動的フォームプロパティ
 */
export const DynamicFormPropsSchema = z.object({
  /** フォーム設定 */
  configuration: FormConfigurationSchema,
  /** 初期データ */
  initialData: z.record(z.unknown()).optional(),
  /** 送信ハンドラー */
  onSubmit: z
    .function()
    .args(z.record(z.unknown()))
    .returns(z.union([z.void(), z.promise(z.void())])),
  /** バリデーションハンドラー */
  onValidate: z
    .function()
    .args(z.record(z.unknown()))
    .returns(z.union([z.unknown(), z.promise(z.unknown())]))
    .optional(),
  /** 変更ハンドラー */
  onChange: z.function().args(z.record(z.unknown())).returns(z.void()).optional(),
  /** フィールド変更ハンドラー */
  onFieldChange: z.function().args(z.string(), z.unknown()).returns(z.void()).optional(),
  /** ローディング状態 */
  loading: z.boolean().optional(),
  /** 無効状態 */
  disabled: z.boolean().optional(),
  /** モード */
  mode: z.enum(['create', 'edit', 'view']).optional(),
});

/**
 * フォームフィールドプロパティ
 */
export const FormFieldPropsSchema = z.object({
  /** フィールド設定 */
  field: FormFieldSchema,
  /** 値 */
  value: z.unknown(),
  /** 変更ハンドラー */
  onChange: z.function().args(z.unknown()).returns(z.void()),
  /** ブラーハンドラー */
  onBlur: z.function().returns(z.void()).optional(),
  /** エラーメッセージ */
  error: z.string().optional(),
  /** 無効状態 */
  disabled: z.boolean().optional(),
  /** 読み取り専用状態 */
  readonly: z.boolean().optional(),
  /** モード */
  mode: z.enum(['create', 'edit', 'view']).optional(),
});

// ================================
// 型定義のエクスポート
// ================================

export type FormBuilderField = z.infer<typeof FormBuilderFieldSchema>;
export type FormBuilderSection = z.infer<typeof FormBuilderSectionSchema>;
export type FormBuilderConfiguration = z.infer<typeof FormBuilderConfigurationSchema>;
export type FormBuilderProps = z.infer<typeof FormBuilderPropsSchema>;
export type DynamicFormProps = z.infer<typeof DynamicFormPropsSchema>;
export type FormFieldProps = z.infer<typeof FormFieldPropsSchema>;
