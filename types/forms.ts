// TimePort フォーム関連型定義

import type { UUID } from './database';

// ================================
// フォームフィールド型
// ================================

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

export interface ValidationRule {
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
  value?: string | number;
  message?: string;
  validator?: (value: any) => boolean | string;
}

export interface FieldOption {
  value: string | number;
  label: string;
  disabled?: boolean;
  description?: string;
}

export interface ConditionalLogic {
  field: string;
  operator: 'equals' | 'not_equals' | 'contains' | 'not_contains' | 'greater_than' | 'less_than';
  value: any;
  action: 'show' | 'hide' | 'require' | 'disable';
}

export interface FormField {
  id: string;
  name: string;
  type: FieldType;
  label: string;
  placeholder?: string;
  description?: string;
  required: boolean;
  disabled?: boolean;
  readonly?: boolean;
  validation_rules: ValidationRule[];
  options?: FieldOption[];
  default_value?: any;
  order: number;
  width?: 'full' | 'half' | 'third' | 'quarter';
  conditional_logic?: ConditionalLogic[];
  metadata?: Record<string, any>;
}

// ================================
// フォーム設定型
// ================================

export interface FormSection {
  id: string;
  title: string;
  description?: string;
  order: number;
  collapsible?: boolean;
  collapsed?: boolean;
  fields: FormField[];
}

export interface FormConfiguration {
  id: string;
  title: string;
  description?: string;
  sections: FormSection[];
  settings: FormSettings;
  metadata?: Record<string, any>;
}

export interface FormSettings {
  allow_draft: boolean;
  auto_save: boolean;
  show_progress: boolean;
  require_confirmation: boolean;
  custom_css?: string;
  custom_js?: string;
  submit_button_text?: string;
  cancel_button_text?: string;
  success_message?: string;
  error_message?: string;
}

// ================================
// フォーム送信・バリデーション型
// ================================

export interface FormSubmission {
  form_id: string;
  user_id: UUID;
  data: Record<string, any>;
  status: 'draft' | 'submitted' | 'processing' | 'completed' | 'error';
  submitted_at?: string;
  metadata?: Record<string, any>;
}

export interface ValidationError {
  field: string;
  message: string;
  code?: string;
}

export interface FormValidationResult {
  valid: boolean;
  errors: ValidationError[];
  warnings?: ValidationError[];
}

// ================================
// 動的フォーム型
// ================================

export interface DynamicFormProps {
  configuration: FormConfiguration;
  initialData?: Record<string, any>;
  onSubmit: (data: Record<string, any>) => void | Promise<void>;
  onValidate?: (data: Record<string, any>) => FormValidationResult | Promise<FormValidationResult>;
  onChange?: (data: Record<string, any>) => void;
  onFieldChange?: (fieldName: string, value: any) => void;
  loading?: boolean;
  disabled?: boolean;
  mode?: 'create' | 'edit' | 'view';
}

export interface FormFieldProps {
  field: FormField;
  value: any;
  onChange: (value: any) => void;
  onBlur?: () => void;
  error?: string;
  disabled?: boolean;
  readonly?: boolean;
  mode?: 'create' | 'edit' | 'view';
}

// ================================
// フォームビルダー型
// ================================

export interface FormBuilderField extends Omit<FormField, 'id'> {
  id?: string;
  isNew?: boolean;
  isDirty?: boolean;
}

export interface FormBuilderSection extends Omit<FormSection, 'id' | 'fields'> {
  id?: string;
  fields: FormBuilderField[];
  isNew?: boolean;
  isDirty?: boolean;
}

export interface FormBuilderConfiguration extends Omit<FormConfiguration, 'id' | 'sections'> {
  id?: string;
  sections: FormBuilderSection[];
  isNew?: boolean;
  isDirty?: boolean;
}

export interface FormBuilderProps {
  initialConfiguration?: FormBuilderConfiguration;
  onSave: (configuration: FormBuilderConfiguration) => void | Promise<void>;
  onCancel?: () => void;
  onPreview?: (configuration: FormBuilderConfiguration) => void;
  loading?: boolean;
  mode?: 'create' | 'edit';
}

// ================================
// 申請フォーム特化型
// ================================

export interface RequestFormField extends FormField {
  affects_calculation?: boolean;
  calculation_field?: 'days_count' | 'amount' | 'hours';
  approval_required?: boolean;
}

export interface RequestFormConfiguration extends Omit<FormConfiguration, 'sections'> {
  request_type_id: UUID;
  category: string;
  approval_flow: ApprovalStep[];
  sections: Array<FormSection & { fields: RequestFormField[] }>;
}

export interface ApprovalStep {
  step: number;
  name: string;
  description?: string;
  approver_role?: string;
  approver_id?: UUID;
  required: boolean;
  auto_approve?: boolean;
  conditions?: ConditionalLogic[];
}

// ================================
// フォームテンプレート型
// ================================

export interface FormTemplate {
  id: string;
  name: string;
  description?: string;
  category: string;
  configuration: FormConfiguration;
  is_system: boolean;
  is_active: boolean;
  usage_count: number;
  created_at: string;
  updated_at: string;
}

export interface FormTemplateCategory {
  id: string;
  name: string;
  description?: string;
  icon?: string;
  order: number;
  templates: FormTemplate[];
}

// ================================
// フォーム分析型
// ================================

export interface FormAnalytics {
  form_id: string;
  total_submissions: number;
  completion_rate: number;
  average_completion_time: number;
  abandonment_points: Array<{
    field: string;
    abandonment_rate: number;
  }>;
  field_analytics: Array<{
    field: string;
    completion_rate: number;
    error_rate: number;
    average_time: number;
  }>;
  submission_trends: Array<{
    date: string;
    submissions: number;
    completions: number;
  }>;
}

// ================================
// フォームエクスポート型
// ================================

export interface FormExportOptions {
  format: 'json' | 'yaml' | 'xml';
  include_data?: boolean;
  include_analytics?: boolean;
  date_range?: {
    start_date: string;
    end_date: string;
  };
}

export interface FormImportOptions {
  merge_strategy: 'replace' | 'merge' | 'append';
  validate_before_import: boolean;
  backup_existing: boolean;
}

// ================================
// カスタムフィールド型
// ================================

export interface CustomFieldDefinition {
  type: string;
  name: string;
  description: string;
  icon?: string;
  default_props: Partial<FormField>;
  validation_schema: Record<string, any>;
  render_component?: string;
}

export interface CustomFieldRegistry {
  [key: string]: CustomFieldDefinition;
}

// ================================
// フォーム権限型
// ================================

export interface FormPermission {
  form_id: string;
  user_id?: UUID;
  role?: string;
  group_id?: UUID;
  permissions: Array<'view' | 'create' | 'edit' | 'delete' | 'submit' | 'approve'>;
  conditions?: ConditionalLogic[];
}

// ================================
// フォーム通知型
// ================================

export interface FormNotificationRule {
  id: string;
  form_id: string;
  trigger: 'submit' | 'approve' | 'reject' | 'update' | 'deadline';
  recipients: Array<{
    type: 'user' | 'role' | 'group' | 'email';
    value: string;
  }>;
  template: {
    subject: string;
    body: string;
    variables?: Record<string, string>;
  };
  conditions?: ConditionalLogic[];
  is_active: boolean;
}
