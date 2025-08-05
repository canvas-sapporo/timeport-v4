// 認証関連
export type { AuthUser, LoginCredentials } from '@/schemas/auth';

// 企業・雇用関連
export type { Company } from '@/schemas/company';
export type { EmploymentType, WorkType } from '@/schemas/employment-type';

// グループ関連
export type { Group } from '@/schemas/group';

// フォーム関連
export type {
  FormField,
  FormSection,
  FormConfiguration,
  FormSettings,
  FormSubmission,
  ValidationRule,
  FieldOption,
  ConditionalLogic,
  DynamicFormProps,
  FormFieldProps,
  FormBuilderField,
  FormBuilderSection,
  FormBuilderConfiguration,
  FormBuilderProps,
  RequestFormField,
  ApprovalStep,
  RequestFormConfiguration,
  FormTemplate,
  FormTemplateCategory,
  FormAnalytics,
  FormExportOptions,
  FormImportOptions,
  CustomFieldDefinition,
  CustomFieldRegistry,
  FormPermission,
  FormNotificationRule,
  FormData,
  FormErrors,
  FormState,
  FormChangeEvent,
  FormSubmitEvent,
  FormErrorEvent,
} from '@/schemas/form';

// リクエスト関連
export type { RequestForm, RequestStatus } from '@/schemas/request';

// システム関連
export type {
  SystemStatus,
  SystemAlert,
  SystemBackup,
  NotificationTemplate,
  NotificationType,
  NotificationPriority,
  FeatureTargetType,
  NotificationSearchCriteria,
  FeatureSearchCriteria,
  FeatureSettings,
  CreateFeatureInput,
  UpdateFeatureInput,
  CreateNotificationInput,
  UpdateNotificationInput,
  CreateAuditLogInput,
  AuditLogSearchCriteria,
} from '@/schemas/system';

// UI関連
export type {} from './ui';

// ユーザーグループ関連
export type { UserGroup } from '@/schemas/user_group';

// ビュー関連
export type {
  UserDetailView,
  AttendanceDetailView,
  RequestDetailView,
  GroupHierarchyView,
  UserGroupDetailView,
  RequestTypeFormDetailView,
  ActiveUserView,
  ActiveAttendanceView,
  ActiveRequestView,
} from '@/schemas/database/view';

// 統計関連
export type { MonthlyAttendanceStatsView, RequestStatisticsView } from '@/schemas/database/stats';

// 動的データ関連
export type {
  DynamicData,
  DynamicFormData,
  SettingsData,
  Metadata,
  FormConfigItem,
  ApprovalFlowItem,
  ErrorData,
  ValidationErrorData,
  ApiResponseData,
  ListResponseData,
} from './dynamic-data';

// データベース関連
export type {
  DatabaseTable,
  DatabaseView,
  DatabaseRow,
  DatabaseInsert,
  DatabaseUpdate,
  StatisticsData,
  StatisticsResult,
} from './database-types';

// 出席関連
export type { AttendanceData } from '@/schemas/attendance';

// レポート関連
export type {
  ReportStatus,
  ReportFieldType,
  ReportFieldConfig,
  ReportFieldOption,
  ApprovalFlowConfig,
  StatusFlowConfig,
  StatusTransition,
  Report,
  ReportApproval,
  ReportAttachment,
  CreateReportData,
  UpdateReportData,
  ApproveReportData,
  ReportListItem,
  ReportDetail,
  ReportStatistics,
} from '@/schemas/report';

// レポートテンプレート関連
export type {
  ReportTemplateData as ReportTemplate,
  ReportTemplateListResult,
  ReportTemplateDetailResult,
  UpdateReportTemplateResult,
  DeleteReportTemplateResult,
} from '@/schemas/report-templates';
