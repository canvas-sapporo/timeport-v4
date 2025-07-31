// ================================
// 共通型定義エクスポート
// ================================

// 共通レスポンス型
export type {
  ApiResponse,
  SuccessResponse,
  ErrorResponse,
  ConditionalResponse,
} from './common/response';

// 共通バリデーション型
export type {
  ValidationError,
  ValidationResult,
  FormValidationResult,
  ValidationErrorResponse,
} from './common/validation';

// ================================
// フォーム関連型定義エクスポート
// ================================

// フォームフィールド型
export type {
  FieldType,
  ValidationRule,
  FieldOption,
  ConditionalLogic,
  FormField,
} from './form/field';

// フォーム設定型
export type { FormSection, FormSettings, FormConfiguration } from './form/template';

// フォーム送信・バリデーション型
export type { FormSubmission, ValidationError as FormValidationError } from './form/validation';

// 動的フォーム型
export type { DynamicFormProps, FormFieldProps } from './form/builder';

// フォームビルダー型
export type {
  FormBuilderField,
  FormBuilderSection,
  FormBuilderConfiguration,
  FormBuilderProps,
} from './form/builder';

// 申請フォーム特化型
export type { RequestFormField, ApprovalStep, RequestFormConfiguration } from './form/template';

// フォームテンプレート型
export type { FormTemplate, FormTemplateCategory } from './form/template';

// フォーム分析型
export type { FormAnalytics } from './form/analytics';

// フォームエクスポート型
export type { FormExportOptions, FormImportOptions } from './form/template';

// カスタムフィールド型
export type { CustomFieldDefinition, CustomFieldRegistry } from './form/template';

// フォーム権限型
export type { FormPermission } from './form/template';

// フォーム通知型
export type { FormNotificationRule } from './form/template';

// フォームデータ型
export type {
  FormData,
  FormErrors,
  FormState,
  FormChangeEvent,
  FormSubmitEvent,
  FormErrorEvent,
} from './form/validation';

// ================================
// API関連型定義エクスポート
// ================================

// ページネーション型
export type { PaginationParams, PaginationInfo, PaginatedResponse } from './api/pagination';

// 検索・フィルタ型
export type {
  SearchParams,
  DateRangeParams,
  StatusParams,
  AdvancedSearchParams,
} from './api/search';

// エラーハンドリング型
export type { ApiError } from './api/error';

// 認証・認可型
export type { AuthToken, AuthUser, AuthResponse, PermissionCheck } from './api/auth';

// ファイル・アップロード型
export type {
  FileInfo,
  FileUploadRequest,
  FileUploadResponse,
  FileDeleteResponse,
} from './api/file';

// 通知・イベント型
export type {
  NotificationMessage,
  NotificationSettings,
  NotificationSendRequest,
} from './api/notification';

// ログ・監査型
export type { ActivityLog, AuditLog } from './api/log';

// キャッシュ・パフォーマンス型
export type { CacheConfig, PerformanceMetrics } from './api/cache';

// Webhook・統合型
export type { WebhookConfig, WebhookPayload, WebhookResult } from './api/webhook';

// バッチ処理型
export type { BatchJob, BatchJobRequest } from './api/batch';

// ヘルスチェック・監視型
export type { HealthCheckResult, HealthCheck, SystemInfo } from './api/health';

// レート制限型
export type { RateLimitInfo, RateLimitResponse } from './api/rate-limit';

// 認証関連API型
export type { LoginRequest, LoginResponse, RefreshTokenRequest, LogoutRequest } from './api/user';

// ユーザー関連API型
export type {
  GetUsersParams,
  CreateUserRequest,
  UpdateUserRequest,
  UserProfileResponse,
} from './api/user';

// 勤怠関連API型
export type {
  GetAttendanceParams,
  ClockInRequest,
  ClockOutRequest,
  BreakRequest,
  AttendanceResponse,
  MonthlyStatsResponse,
} from './api/attendance';

// 申請関連API型
export type {
  GetRequestsParams,
  CreateRequestRequest,
  UpdateRequestStatusRequest,
  RequestResponse,
} from './api/request';

// 申請種別関連API型
export type {
  GetRequestTypesParams,
  CreateRequestTypeRequest,
  UpdateRequestTypeRequest,
} from './api/request';

// グループ関連API型
export type { GetGroupsParams, CreateGroupRequest, UpdateGroupRequest } from './api/group';

// ダッシュボード関連API型
export type { DashboardStatsResponse, RecentActivityResponse } from './api/dashboard';

// システム設定関連API型
export type { SystemSettingsResponse, UpdateSystemSettingsRequest } from './api/system';

// システム管理関連型
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
} from './system';

// ビュー関連型
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
} from './database/view';

// 統計関連型
export type { MonthlyAttendanceStatsView, RequestStatisticsView } from './database/stats';

// ファイル関連API型
export type { FileUploadRequestLegacy, FileUploadResponseLegacy } from './api/export';

// バッチ処理関連API型
export type { BatchOperationRequest, BatchOperationResponse } from './api/export';

// エクスポート・インポート関連API型
export type { ExportRequest, ExportResponse, ImportRequest, ImportResponse } from './api/export';
