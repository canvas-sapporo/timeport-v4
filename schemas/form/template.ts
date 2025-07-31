import { z } from 'zod';

import { FormFieldSchema, ConditionalLogicSchema } from '@/schemas/form/field';

// ================================
// フォーム設定型
// ================================

/**
 * フォームセクション
 */
export const FormSectionSchema = z.object({
  /** セクションID */
  id: z.string(),
  /** セクション名 */
  name: z.string(),
  /** 説明 */
  description: z.string().optional(),
  /** フィールド一覧 */
  fields: z.array(FormFieldSchema),
  /** 表示順序 */
  order: z.number(),
  /** 条件付き表示 */
  conditional_display: ConditionalLogicSchema.optional(),
});

/**
 * フォーム設定
 */
export const FormSettingsSchema = z.object({
  /** 下書き保存許可 */
  allow_draft: z.boolean(),
  /** 自動保存 */
  auto_save: z.boolean(),
  /** 進捗表示 */
  show_progress: z.boolean(),
  /** 確認画面必須 */
  require_confirmation: z.boolean(),
  /** カスタムCSS */
  custom_css: z.string().optional(),
  /** カスタムJavaScript */
  custom_js: z.string().optional(),
  /** 送信ボタンテキスト */
  submit_button_text: z.string().optional(),
  /** キャンセルボタンテキスト */
  cancel_button_text: z.string().optional(),
  /** 成功メッセージ */
  success_message: z.string().optional(),
  /** エラーメッセージ */
  error_message: z.string().optional(),
});

/**
 * 申請フォームフィールド
 */
export const RequestFormFieldSchema = FormFieldSchema.extend({
  /** 計算に影響するフラグ */
  affects_calculation: z.boolean().optional(),
  /** 計算フィールド */
  calculation_field: z.enum(['days_count', 'amount', 'hours']).optional(),
  /** 承認必須フラグ */
  approval_required: z.boolean().optional(),
});

// ================================
// 申請フォーム特化型
// ================================

/**
 * 承認ステップ
 */
export const ApprovalStepSchema = z.object({
  /** ステップ番号 */
  step: z.number(),
  /** ステップ名 */
  name: z.string(),
  /** 説明 */
  description: z.string().optional(),
  /** 承認者ロール */
  approver_role: z.string().optional(),
  /** 承認者ID */
  approver_id: z.string().uuid().optional(),
  /** 必須フラグ */
  required: z.boolean(),
  /** 自動承認フラグ */
  auto_approve: z.boolean().optional(),
  /** 条件 */
  conditions: z.array(ConditionalLogicSchema).optional(),
});

/**
 * フォーム設定
 */
export const FormConfigurationSchema = z.object({
  /** 申請種別ID */
  request_type_id: z.string().uuid(),
  /** カテゴリ */
  category: z.string(),
  /** 承認フロー */
  approval_flow: z.array(ApprovalStepSchema),
  /** セクション一覧 */
  sections: z.array(FormSectionSchema),
});

/**
 * 申請フォーム設定
 */
export const RequestFormConfigurationSchema = FormConfigurationSchema.omit({
  sections: true,
}).extend({
  /** 申請種別ID */
  request_type_id: z.string().uuid(),
  /** カテゴリ */
  category: z.string(),
  /** 承認フロー */
  approval_flow: z.array(ApprovalStepSchema),
  /** セクション一覧 */
  sections: z.array(FormSectionSchema),
});

// ================================
// フォームテンプレート型
// ================================

/**
 * フォームテンプレート
 */
export const FormTemplateSchema = z.object({
  /** テンプレートID */
  id: z.string(),
  /** テンプレート名 */
  name: z.string(),
  /** 説明 */
  description: z.string().optional(),
  /** カテゴリ */
  category: z.string(),
  /** フォーム設定 */
  configuration: FormConfigurationSchema,
  /** システムテンプレートフラグ */
  is_system: z.boolean(),
  /** 有効フラグ */
  is_active: z.boolean(),
  /** 使用回数 */
  usage_count: z.number(),
  /** 作成日時 */
  created_at: z.string().datetime(),
  /** 編集日時 */
  updated_at: z.string().datetime(),
});

/**
 * フォームテンプレートカテゴリ
 */
export const FormTemplateCategorySchema = z.object({
  /** カテゴリID */
  id: z.string(),
  /** カテゴリ名 */
  name: z.string(),
  /** 説明 */
  description: z.string().optional(),
  /** アイコン */
  icon: z.string().optional(),
  /** 表示順序 */
  order: z.number(),
  /** テンプレート一覧 */
  templates: z.array(FormTemplateSchema),
});

// ================================
// カスタムフィールド型
// ================================

/**
 * カスタムフィールド定義
 */
export const CustomFieldDefinitionSchema = z.object({
  /** フィールドタイプ */
  type: z.string(),
  /** フィールド名 */
  name: z.string(),
  /** 説明 */
  description: z.string(),
  /** アイコン */
  icon: z.string().optional(),
  /** デフォルトプロパティ */
  default_props: z.record(z.unknown()),
  /** バリデーションスキーマ */
  validation_schema: z.record(z.unknown()),
  /** レンダリングコンポーネント */
  render_component: z.string().optional(),
});

/**
 * カスタムフィールドレジストリ
 */
export const CustomFieldRegistrySchema = z.record(CustomFieldDefinitionSchema);

// ================================
// フォーム権限型
// ================================

/**
 * フォーム権限
 */
export const FormPermissionSchema = z.object({
  /** フォームID */
  form_id: z.string(),
  /** ユーザーID */
  user_id: z.string().uuid().optional(),
  /** ロール */
  role: z.string().optional(),
  /** グループID */
  group_id: z.string().uuid().optional(),
  /** 権限一覧 */
  permissions: z.array(z.enum(['view', 'create', 'edit', 'delete', 'submit', 'approve'])),
  /** 条件 */
  conditions: z.array(ConditionalLogicSchema).optional(),
});

// ================================
// フォーム通知型
// ================================

/**
 * フォーム通知ルール
 */
export const FormNotificationRuleSchema = z.object({
  /** ルールID */
  id: z.string(),
  /** フォームID */
  form_id: z.string(),
  /** トリガー */
  trigger: z.enum(['submit', 'approve', 'reject', 'update', 'deadline']),
  /** 受信者一覧 */
  recipients: z.array(
    z.object({
      type: z.enum(['user', 'role', 'group', 'email']),
      value: z.string(),
    })
  ),
  /** テンプレート */
  template: z.object({
    subject: z.string(),
    body: z.string(),
    variables: z.record(z.string()).optional(),
  }),
  /** 条件 */
  conditions: z.array(ConditionalLogicSchema).optional(),
  /** 有効フラグ */
  is_active: z.boolean(),
});

// ================================
// フォームエクスポート型
// ================================

/**
 * フォームエクスポートオプション
 */
export const FormExportOptionsSchema = z.object({
  /** エクスポート形式 */
  format: z.enum(['json', 'yaml', 'xml']),
  /** データ含める */
  include_data: z.boolean().optional(),
  /** 分析データ含める */
  include_analytics: z.boolean().optional(),
  /** 日付範囲 */
  date_range: z
    .object({
      start_date: z.string(),
      end_date: z.string(),
    })
    .optional(),
});

/**
 * フォームインポートオプション
 */
export const FormImportOptionsSchema = z.object({
  /** マージ戦略 */
  merge_strategy: z.enum(['replace', 'merge', 'append']),
  /** インポート前バリデーション */
  validate_before_import: z.boolean(),
  /** 既存データバックアップ */
  backup_existing: z.boolean(),
});

// ================================
// 型定義のエクスポート
// ================================

export type FormSection = z.infer<typeof FormSectionSchema>;
export type FormSettings = z.infer<typeof FormSettingsSchema>;
export type FormConfiguration = z.infer<typeof FormConfigurationSchema>;
export type RequestFormField = z.infer<typeof RequestFormFieldSchema>;
export type ApprovalStep = z.infer<typeof ApprovalStepSchema>;
export type RequestFormConfiguration = z.infer<typeof RequestFormConfigurationSchema>;
export type FormTemplate = z.infer<typeof FormTemplateSchema>;
export type FormTemplateCategory = z.infer<typeof FormTemplateCategorySchema>;
export type CustomFieldDefinition = z.infer<typeof CustomFieldDefinitionSchema>;
export type CustomFieldRegistry = z.infer<typeof CustomFieldRegistrySchema>;
export type FormPermission = z.infer<typeof FormPermissionSchema>;
export type FormNotificationRule = z.infer<typeof FormNotificationRuleSchema>;
export type FormExportOptions = z.infer<typeof FormExportOptionsSchema>;
export type FormImportOptions = z.infer<typeof FormImportOptionsSchema>;
