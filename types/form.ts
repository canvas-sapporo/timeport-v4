/**
 * TimePort フォーム関連型定義
 *
 * 動的フォーム、フォームビルダー、バリデーションに関する型を定義
 */

import type { BaseEntity, UUID, Timestamp } from './common';

// ================================
// フォームフィールド型
// ================================

/**
 * フォームフィールドタイプ
 */
export type FieldType =
  | 'text'
  | 'textarea'
  | 'number'
  | 'date'
  | 'time'
  | 'datetime-local'
  | 'email'
  | 'tel'
  | 'url'
  | 'password'
  | 'select'
  | 'radio'
  | 'checkbox'
  | 'file'
  | 'hidden';

/**
 * バリデーションルール
 */
export interface ValidationRule {
  /** ルールタイプ */
  type:
    | 'required'
    | 'minLength'
    | 'maxLength'
    | 'min'
    | 'max'
    | 'pattern'
    | 'email'
    | 'tel'
    | 'url'
    | 'custom';
  /** ルール値 */
  value?: string | number;
  /** エラーメッセージ */
  message?: string;
  /** カスタムバリデーター関数 */
  validator?: (value: any) => boolean | string;
}

/**
 * フィールド選択肢
 */
export interface FieldOption {
  /** 値 */
  value: string | number;
  /** ラベル */
  label: string;
  /** 無効フラグ */
  disabled?: boolean;
  /** 説明 */
  description?: string;
}

/**
 * 条件表示ロジック
 */
export interface ConditionalLogic {
  /** 条件フィールド */
  field: string;
  /** 演算子 */
  operator: 'equals' | 'not_equals' | 'contains' | 'not_contains' | 'greater_than' | 'less_than';
  /** 条件値 */
  value: any;
  /** アクション */
  action: 'show' | 'hide' | 'require' | 'disable';
}

/**
 * フォームフィールド
 */
export interface FormField {
  /** フィールドID */
  id: string;
  /** フィールド名 */
  name: string;
  /** フィールドタイプ */
  type: FieldType;
  /** ラベル */
  label: string;
  /** プレースホルダー */
  placeholder?: string;
  /** 説明 */
  description?: string;
  /** 必須フラグ */
  required: boolean;
  /** 無効フラグ */
  disabled?: boolean;
  /** 読み取り専用フラグ */
  readonly?: boolean;
  /** バリデーションルール */
  validation_rules: ValidationRule[];
  /** 選択肢 */
  options?: FieldOption[];
  /** デフォルト値 */
  default_value?: any;
  /** 表示順序 */
  order: number;
  /** 表示幅 */
  width?: 'full' | 'half' | 'third' | 'quarter';
  /** 条件表示ロジック */
  conditional_logic?: ConditionalLogic[];
  /** メタデータ */
  metadata?: Record<string, any>;
}

// ================================
// フォーム設定型
// ================================

/**
 * フォームセクション
 */
export interface FormSection {
  /** セクションID */
  id: string;
  /** タイトル */
  title: string;
  /** 説明 */
  description?: string;
  /** 表示順序 */
  order: number;
  /** 折りたたみ可能フラグ */
  collapsible?: boolean;
  /** 初期折りたたみ状態 */
  collapsed?: boolean;
  /** フィールド一覧 */
  fields: FormField[];
}

/**
 * フォーム設定
 */
export interface FormSettings {
  /** 下書き保存許可 */
  allow_draft: boolean;
  /** 自動保存 */
  auto_save: boolean;
  /** 進捗表示 */
  show_progress: boolean;
  /** 確認画面必須 */
  require_confirmation: boolean;
  /** カスタムCSS */
  custom_css?: string;
  /** カスタムJavaScript */
  custom_js?: string;
  /** 送信ボタンテキスト */
  submit_button_text?: string;
  /** キャンセルボタンテキスト */
  cancel_button_text?: string;
  /** 成功メッセージ */
  success_message?: string;
  /** エラーメッセージ */
  error_message?: string;
}

/**
 * フォーム設定
 */
export interface FormConfiguration {
  /** フォームID */
  id: string;
  /** タイトル */
  title: string;
  /** 説明 */
  description?: string;
  /** セクション一覧 */
  sections: FormSection[];
  /** 設定 */
  settings: FormSettings;
  /** メタデータ */
  metadata?: Record<string, any>;
}

// ================================
// フォーム送信・バリデーション型
// ================================

/**
 * フォーム送信データ
 */
export interface FormSubmission {
  /** フォームID */
  form_id: string;
  /** ユーザーID */
  user_id: UUID;
  /** 送信データ */
  data: Record<string, any>;
  /** ステータス */
  status: 'draft' | 'submitted' | 'processing' | 'completed' | 'error';
  /** 送信日時 */
  submitted_at?: Timestamp;
  /** メタデータ */
  metadata?: Record<string, any>;
}

/**
 * バリデーションエラー
 */
export interface ValidationError {
  /** フィールド名 */
  field: string;
  /** エラーメッセージ */
  message: string;
  /** エラーコード */
  code?: string;
}

/**
 * フォームバリデーション結果
 */
export interface FormValidationResult {
  /** バリデーション成功フラグ */
  valid: boolean;
  /** エラー一覧 */
  errors: ValidationError[];
  /** 警告一覧 */
  warnings?: ValidationError[];
}

// ================================
// 動的フォーム型
// ================================

/**
 * 動的フォームプロパティ
 */
export interface DynamicFormProps {
  /** フォーム設定 */
  configuration: FormConfiguration;
  /** 初期データ */
  initialData?: Record<string, any>;
  /** 送信ハンドラー */
  onSubmit: (data: Record<string, any>) => void | Promise<void>;
  /** バリデーションハンドラー */
  onValidate?: (data: Record<string, any>) => FormValidationResult | Promise<FormValidationResult>;
  /** 変更ハンドラー */
  onChange?: (data: Record<string, any>) => void;
  /** フィールド変更ハンドラー */
  onFieldChange?: (fieldName: string, value: any) => void;
  /** ローディング状態 */
  loading?: boolean;
  /** 無効状態 */
  disabled?: boolean;
  /** モード */
  mode?: 'create' | 'edit' | 'view';
}

/**
 * フォームフィールドプロパティ
 */
export interface FormFieldProps {
  /** フィールド設定 */
  field: FormField;
  /** 値 */
  value: any;
  /** 変更ハンドラー */
  onChange: (value: any) => void;
  /** ブラーハンドラー */
  onBlur?: () => void;
  /** エラーメッセージ */
  error?: string;
  /** 無効状態 */
  disabled?: boolean;
  /** 読み取り専用状態 */
  readonly?: boolean;
  /** モード */
  mode?: 'create' | 'edit' | 'view';
}

// ================================
// フォームビルダー型
// ================================

/**
 * フォームビルダーフィールド
 */
export interface FormBuilderField extends Omit<FormField, 'id'> {
  /** フィールドID（新規作成時は未定義） */
  id?: string;
  /** 新規フラグ */
  isNew?: boolean;
  /** 変更フラグ */
  isDirty?: boolean;
}

/**
 * フォームビルダーセクション
 */
export interface FormBuilderSection extends Omit<FormSection, 'id' | 'fields'> {
  /** セクションID（新規作成時は未定義） */
  id?: string;
  /** フィールド一覧 */
  fields: FormBuilderField[];
  /** 新規フラグ */
  isNew?: boolean;
  /** 変更フラグ */
  isDirty?: boolean;
}

/**
 * フォームビルダー設定
 */
export interface FormBuilderConfiguration extends Omit<FormConfiguration, 'id' | 'sections'> {
  /** フォームID（新規作成時は未定義） */
  id?: string;
  /** セクション一覧 */
  sections: FormBuilderSection[];
  /** 新規フラグ */
  isNew?: boolean;
  /** 変更フラグ */
  isDirty?: boolean;
}

/**
 * フォームビルダープロパティ
 */
export interface FormBuilderProps {
  /** 初期設定 */
  initialConfiguration?: FormBuilderConfiguration;
  /** 保存ハンドラー */
  onSave: (configuration: FormBuilderConfiguration) => void | Promise<void>;
  /** キャンセルハンドラー */
  onCancel?: () => void;
  /** プレビューハンドラー */
  onPreview?: (configuration: FormBuilderConfiguration) => void;
  /** ローディング状態 */
  loading?: boolean;
  /** モード */
  mode?: 'create' | 'edit';
}

// ================================
// 申請フォーム特化型
// ================================

/**
 * 申請フォームフィールド
 */
export interface RequestFormField extends FormField {
  /** 計算に影響するフラグ */
  affects_calculation?: boolean;
  /** 計算フィールド */
  calculation_field?: 'days_count' | 'amount' | 'hours';
  /** 承認必須フラグ */
  approval_required?: boolean;
}

/**
 * 申請フォーム設定
 */
export interface RequestFormConfiguration extends Omit<FormConfiguration, 'sections'> {
  /** 申請種別ID */
  request_type_id: UUID;
  /** カテゴリ */
  category: string;
  /** 承認フロー */
  approval_flow: ApprovalStep[];
  /** セクション一覧 */
  sections: Array<FormSection & { fields: RequestFormField[] }>;
}

/**
 * 承認ステップ
 */
export interface ApprovalStep {
  /** ステップ番号 */
  step: number;
  /** ステップ名 */
  name: string;
  /** 説明 */
  description?: string;
  /** 承認者ロール */
  approver_role?: string;
  /** 承認者ID */
  approver_id?: UUID;
  /** 必須フラグ */
  required: boolean;
  /** 自動承認フラグ */
  auto_approve?: boolean;
  /** 条件 */
  conditions?: ConditionalLogic[];
}

// ================================
// フォームテンプレート型
// ================================

/**
 * フォームテンプレート
 */
export interface FormTemplate {
  /** テンプレートID */
  id: string;
  /** テンプレート名 */
  name: string;
  /** 説明 */
  description?: string;
  /** カテゴリ */
  category: string;
  /** フォーム設定 */
  configuration: FormConfiguration;
  /** システムテンプレートフラグ */
  is_system: boolean;
  /** 有効フラグ */
  is_active: boolean;
  /** 使用回数 */
  usage_count: number;
  /** 作成日時 */
  created_at: Timestamp;
  /** 編集日時 */
  updated_at: Timestamp;
}

/**
 * フォームテンプレートカテゴリ
 */
export interface FormTemplateCategory {
  /** カテゴリID */
  id: string;
  /** カテゴリ名 */
  name: string;
  /** 説明 */
  description?: string;
  /** アイコン */
  icon?: string;
  /** 表示順序 */
  order: number;
  /** テンプレート一覧 */
  templates: FormTemplate[];
}

// ================================
// フォーム分析型
// ================================

/**
 * フォーム分析データ
 */
export interface FormAnalytics {
  /** フォームID */
  form_id: string;
  /** 総送信数 */
  total_submissions: number;
  /** 完了率（%） */
  completion_rate: number;
  /** 平均完了時間（分） */
  average_completion_time: number;
  /** 離脱ポイント */
  abandonment_points: Array<{
    field: string;
    abandonment_rate: number;
  }>;
  /** フィールド分析 */
  field_analytics: Array<{
    field: string;
    completion_rate: number;
    error_rate: number;
    average_time: number;
  }>;
  /** 送信トレンド */
  submission_trends: Array<{
    date: string;
    submissions: number;
    completions: number;
  }>;
}

// ================================
// フォームエクスポート型
// ================================

/**
 * フォームエクスポートオプション
 */
export interface FormExportOptions {
  /** エクスポート形式 */
  format: 'json' | 'yaml' | 'xml';
  /** データ含める */
  include_data?: boolean;
  /** 分析データ含める */
  include_analytics?: boolean;
  /** 日付範囲 */
  date_range?: {
    start_date: string;
    end_date: string;
  };
}

/**
 * フォームインポートオプション
 */
export interface FormImportOptions {
  /** マージ戦略 */
  merge_strategy: 'replace' | 'merge' | 'append';
  /** インポート前バリデーション */
  validate_before_import: boolean;
  /** 既存データバックアップ */
  backup_existing: boolean;
}

// ================================
// カスタムフィールド型
// ================================

/**
 * カスタムフィールド定義
 */
export interface CustomFieldDefinition {
  /** フィールドタイプ */
  type: string;
  /** フィールド名 */
  name: string;
  /** 説明 */
  description: string;
  /** アイコン */
  icon?: string;
  /** デフォルトプロパティ */
  default_props: Partial<FormField>;
  /** バリデーションスキーマ */
  validation_schema: Record<string, any>;
  /** レンダリングコンポーネント */
  render_component?: string;
}

/**
 * カスタムフィールドレジストリ
 */
export interface CustomFieldRegistry {
  [key: string]: CustomFieldDefinition;
}

// ================================
// フォーム権限型
// ================================

/**
 * フォーム権限
 */
export interface FormPermission {
  /** フォームID */
  form_id: string;
  /** ユーザーID */
  user_id?: UUID;
  /** ロール */
  role?: string;
  /** グループID */
  group_id?: UUID;
  /** 権限一覧 */
  permissions: Array<'view' | 'create' | 'edit' | 'delete' | 'submit' | 'approve'>;
  /** 条件 */
  conditions?: ConditionalLogic[];
}

// ================================
// フォーム通知型
// ================================

/**
 * フォーム通知ルール
 */
export interface FormNotificationRule {
  /** ルールID */
  id: string;
  /** フォームID */
  form_id: string;
  /** トリガー */
  trigger: 'submit' | 'approve' | 'reject' | 'update' | 'deadline';
  /** 受信者一覧 */
  recipients: Array<{
    type: 'user' | 'role' | 'group' | 'email';
    value: string;
  }>;
  /** テンプレート */
  template: {
    subject: string;
    body: string;
    variables?: Record<string, string>;
  };
  /** 条件 */
  conditions?: ConditionalLogic[];
  /** 有効フラグ */
  is_active: boolean;
}
