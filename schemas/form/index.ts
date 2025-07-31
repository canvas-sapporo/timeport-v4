// ================================
// フォーム関連スキーマのメインエクスポート
// ================================

// フィールド関連（基本型のみ）
export type {
  FieldType,
  ValidationRule,
  FieldOption,
  ConditionalLogic,
  FormField,
  FormSection,
} from './field';

// バリデーション関連
export type {
  FormSubmission,
  ValidationError,
  FormValidationResult,
  FormData,
  FormErrors,
  FormState,
  FormChangeEvent,
  FormSubmitEvent,
  FormErrorEvent,
} from './validation';

// フォームビルダー関連
export type {
  FormBuilderField,
  FormBuilderSection,
  FormBuilderConfiguration,
  FormBuilderProps,
  DynamicFormProps,
  FormFieldProps,
} from './builder';

// テンプレート関連
export type {
  FormSettings,
  FormConfiguration,
  RequestFormField,
  ApprovalStep,
  RequestFormConfiguration,
  FormTemplate,
  FormTemplateCategory,
  CustomFieldDefinition,
  CustomFieldRegistry,
  FormPermission,
  FormNotificationRule,
  FormExportOptions,
  FormImportOptions,
} from './template';

// 分析・統計関連
export type { FormAnalytics } from './analytics';
