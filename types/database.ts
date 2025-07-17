/**
 * TimePort データベース型定義
 * 
 * Supabaseデータベーススキーマに基づく型定義
 */

// ================================
// 基本型定義
// ================================

export type UUID = string;
export type Timestamp = string;
export type DateString = string;
export type TimeString = string;

// ================================
// 共通インターフェース
// ================================

export interface BaseEntity {
  id: UUID;
  created_at: Timestamp;
  updated_at: Timestamp;
  deleted_at?: Timestamp;
}

// ================================
// 組織・ユーザー関連型
// ================================

export interface Company extends BaseEntity {
  name: string;
  code: string;
  address?: string;
  phone?: string;
}

export interface Group extends BaseEntity {
  company_id: UUID;
  parent_group_id?: UUID;
  code?: string;
  name: string;
  description?: string;
  level: number;
  path: string;
}

export interface UserGroup extends BaseEntity {
  user_id: UUID;
  group_id: UUID;
}

export interface EmploymentType extends BaseEntity {
  company_id: UUID;
  code?: string;
  name: string;
  description?: string;
  is_active: boolean;
  display_order: number;
}

export interface UserProfile extends BaseEntity {
  code?: string;
  first_name: string;
  family_name: string;
  email: string;
  role: 'system_admin' | 'admin' | 'member';
  primary_group_id?: UUID;
  employment_type_id?: UUID;
  work_start_date?: DateString;
  work_end_date?: DateString;
  is_active: boolean;
}

// ================================
// 勤務時間・スケジュール関連型
// ================================

export interface WorkType extends BaseEntity {
  company_id: UUID;
  code?: string;
  name: string;
  work_start_time: TimeString;
  work_end_time: TimeString;
  break_duration_minutes: number;
  is_flexible: boolean;
  flex_start_time?: TimeString;
  flex_end_time?: TimeString;
  core_start_time?: TimeString;
  core_end_time?: TimeString;
  overtime_threshold_minutes: number;
  description?: string;
  is_active: boolean;
  display_order: number;
}

export interface LeaveType extends BaseEntity {
  company_id: UUID;
  code?: string;
  name: string;
  description?: string;
  max_days_per_year?: number;
  settings: Record<string, any>;
  is_active: boolean;
  display_order: number;
}

export interface UserWorkType extends BaseEntity {
  user_id: UUID;
  work_type_id: UUID;
  effective_from: DateString;
  effective_to?: DateString;
}

export interface BreakRecord {
  start: TimeString;
  end: TimeString;
}

export interface Attendance extends BaseEntity {
  user_id: UUID;
  work_date: DateString;
  work_type_id?: UUID;
  clock_in_time?: Timestamp;
  clock_out_time?: Timestamp;
  break_records: BreakRecord[];
  actual_work_minutes?: number;
  overtime_minutes: number;
  late_minutes: number;
  early_leave_minutes: number;
  status: 'normal' | 'late' | 'early_leave' | 'absent';
  auto_calculated: boolean;
  description?: string;
  approved_by?: UUID;
  approved_at?: Timestamp;
}

// ================================
// 申請・承認関連型
// ================================

export interface RequestStatus extends BaseEntity {
  company_id: UUID;
  code: string;
  name: string;
  description?: string;
  color?: string;
  display_order: number;
  settings: Record<string, any>;
  is_active: boolean;
}

export interface FormField {
  id: string;
  name: string;
  type: 'text' | 'textarea' | 'number' | 'date' | 'time' | 'datetime-local' | 'email' | 'tel' | 'select' | 'radio' | 'checkbox' | 'file';
  label: string;
  placeholder?: string;
  required: boolean;
  validation_rules: Record<string, any>;
  options?: string[];
  order: number;
}

export interface ApprovalStep {
  step: number;
  approver_role: string;
  approver_id?: UUID;
  required: boolean;
}

export interface RequestType extends BaseEntity {
  company_id: UUID;
  code: string;
  name: string;
  description?: string;
  category: string;
  form_config: FormField[];
  approval_flow: ApprovalStep[];
  default_status_id?: UUID;
  is_active: boolean;
  display_order: number;
}

export interface Request extends BaseEntity {
  request_type_id: UUID;
  user_id: UUID;
  title: string;
  form_data: Record<string, any>;
  target_date?: DateString;
  start_date?: DateString;
  end_date?: DateString;
  days_count?: number;
  amount?: number;
  status_id?: UUID;
  current_approval_step: number;
  submission_comment?: string;
  /** ステータス */
  status?: 'pending' | 'approved' | 'rejected' | 'withdrawn' | 'expired';
  approved_by?: string;
  approved_at?: string;
  rejection_reason?: string;
}

// ================================
// フォーム・バリデーション関連型
// ================================

export interface Form extends BaseEntity {
  request_type_id: UUID;
  field_name: string;
  field_type: string;
  field_label: string;
  field_options?: Record<string, any>;
  is_required: boolean;
  display_order: number;
}

export interface Validation extends BaseEntity {
  form_id: UUID;
  rule_type: string;
  rule_value?: string;
  error_message?: string;
}

// ================================
// 機能制御・通知関連型
// ================================

export interface Feature extends BaseEntity {
  feature_code: string;
  feature_name: string;
  description?: string;
  target_type: 'company' | 'group' | 'user';
  target_id: UUID;
  is_enabled: boolean;
  settings: Record<string, any>;
}

export interface Notification extends BaseEntity {
  user_id: UUID;
  type: 'info' | 'warning' | 'error' | 'success';
  title: string;
  message: string;
  link_url?: string;
  priority: 'low' | 'normal' | 'high' | 'urgent';
  is_read: boolean;
  read_at?: Timestamp;
  expires_at?: Timestamp;
}

// ================================
// 操作ログ関連型
// ================================

export interface AuditLog extends BaseEntity {
  user_id?: UUID;
  action: string;
  target_type?: string;
  target_id?: UUID;
  before_data?: Record<string, any>;
  after_data?: Record<string, any>;
  details?: Record<string, any>;
  ip_address?: string;
  user_agent?: string;
}

// ================================
// ビュー型定義
// ================================

export interface UserDetailView {
  id: UUID;
  code?: string;
  first_name: string;
  family_name: string;
  full_name: string;
  email: string;
  role: 'system-admin' | 'admin' | 'member';
  work_start_date?: DateString;
  is_active: boolean;
  primary_group_name?: string;
  group_path?: string;
  employment_type_name?: string;
  company_name?: string;
  created_at: Timestamp;
  updated_at: Timestamp;
}

export interface AttendanceDetailView {
  id: UUID;
  user_id: UUID;
  code?: string;
  full_name: string;
  primary_group_name?: string;
  work_date: DateString;
  clock_in_time?: Timestamp;
  clock_out_time?: Timestamp;
  break_records: BreakRecord[];
  actual_work_minutes?: number;
  overtime_minutes: number;
  late_minutes: number;
  early_leave_minutes: number;
  status: string;
  description?: string;
  work_type_name?: string;
  work_start_time?: TimeString;
  work_end_time?: TimeString;
  created_at: Timestamp;
  updated_at: Timestamp;
}

export interface RequestDetailView {
  id: UUID;
  user_id: UUID;
  code?: string;
  applicant_name: string;
  primary_group_name?: string;
  title: string;
  form_data: Record<string, any>;
  target_date?: DateString;
  start_date?: DateString;
  end_date?: DateString;
  days_count?: number;
  amount?: number;
  status_name?: string;
  status_color?: string;
  submission_comment?: string;
  request_type_name: string;
  request_category: string;
  approver_name?: string;
  approved_at?: Timestamp;
  rejection_reason?: string;
  created_at: Timestamp;
  updated_at: Timestamp;
}

// ================================
// 統計・集計関連型
// ================================

export interface MonthlyAttendanceStats {
  work_days: number;
  total_work_hours: number;
  total_overtime_hours: number;
  late_days: number;
  absent_days: number;
  average_work_hours: number;
}

export interface RequestStatistics {
  user_id: UUID;
  code?: string;
  full_name: string;
  primary_group_name?: string;
  request_type_name: string;
  request_category: string;
  month: string;
  total_requests: number;
  pending_requests: number;
  approved_requests: number;
  rejected_requests: number;
  approval_rate: number;
}

// ================================
// API関連型
// ================================

export interface ApiResponse<T> {
  data?: T;
  error?: string;
  message?: string;
  success: boolean;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasMore: boolean;
}

export interface QueryOptions {
  limit?: number;
  offset?: number;
  orderBy?: string;
  ascending?: boolean;
  filters?: Record<string, any>;
}

// ================================
// フィルター関連型
// ================================

export interface AttendanceFilter {
  user_id?: UUID;
  group_id?: UUID;
  start_date?: DateString;
  end_date?: DateString;
  status?: string;
  work_type_id?: UUID;
}

export interface RequestFilter {
  user_id?: UUID;
  request_type_id?: UUID;
  status_id?: UUID;
  start_date?: DateString;
  end_date?: DateString;
  category?: string;
}

export interface UserFilter {
  group_id?: UUID;
  role?: string;
  is_active?: boolean;
  employment_type_id?: UUID;
  search?: string;
}

// ================================
// フォーム関連型
// ================================

export interface FormValidationRule {
  type: 'required' | 'minLength' | 'maxLength' | 'pattern' | 'min' | 'max' | 'email' | 'tel';
  value?: string | number;
  message?: string;
}

export interface DynamicFormField {
  id: string;
  name: string;
  type: FormField['type'];
  label: string;
  placeholder?: string;
  required: boolean;
  validation_rules: FormValidationRule[];
  options?: string[];
  order: number;
  default_value?: any;
}

export interface FormSubmissionData {
  request_type_id: UUID;
  user_id: UUID;
  title: string;
  form_data: Record<string, any>;
  target_date?: DateString;
  start_date?: DateString;
  end_date?: DateString;
  days_count?: number;
  submission_comment?: string;
}

// ================================
// ダッシュボード関連型
// ================================

export interface DashboardStats {
  totalUsers?: number;
  activeUsers?: number;
  pendingRequests?: number;
  todayAttendance?: number;
  monthlyOvertimeHours?: number;
  workDays?: number;
  overtimeHours?: number;
  vacationDays?: number;
  totalWorkHours?: number;
}

export interface DashboardAlert {
  type: 'info' | 'warning' | 'error' | 'success';
  message: string;
  link_url?: string;
}

export interface RecentActivity {
  type: string;
  title?: string;
  time?: string;
  date?: string;
  status?: string;
}

// ================================
// 設定関連型
// ================================

export interface SystemSettings {
  company_name: string;
  timezone: string;
  working_hours: {
    start: TimeString;
    end: TimeString;
    break_duration: number;
  };
  overtime_threshold: number;
  auto_clock_out: boolean;
  require_approval: boolean;
}

export interface NotificationSettings {
  email_notifications: boolean;
  late_arrival_alert: boolean;
  overtime_alert: boolean;
  application_alert: boolean;
  system_maintenance: boolean;
}

export interface FeatureSettings {
  attendance: boolean;
  requests: boolean;
  user_management: boolean;
  group_management: boolean;
  analytics: boolean;
}

// ================================
// エクスポート用型定義
// ================================

export type DatabaseTables = {
  companies: Company;
  groups: Group;
  user_groups: UserGroup;
  employment_types: EmploymentType;
  user_profiles: UserProfile;
  work_types: WorkType;
  leave_types: LeaveType;
  user_work_types: UserWorkType;
  attendances: Attendance;
  request_statuses: RequestStatus;
  request_types: RequestType;
  requests: Request;
  forms: Form;
  validations: Validation;
  features: Feature;
  notifications: Notification;
  audit_logs: AuditLog;
};

export type DatabaseViews = {
  user_details: UserDetailView;
  attendance_details: AttendanceDetailView;
  request_details: RequestDetailView;
};

// ================================
// Supabase Database型定義
// ================================

export interface Database {
  public: {
    Tables: {
      [K in keyof DatabaseTables]: {
        Row: DatabaseTables[K];
        Insert: Omit<DatabaseTables[K], 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Omit<DatabaseTables[K], 'id' | 'created_at' | 'updated_at'>>;
      };
    };
    Views: {
      [K in keyof DatabaseViews]: {
        Row: DatabaseViews[K];
      };
    };
    Functions: {
      calculate_work_minutes: {
        Args: {
          clock_in_time: Timestamp;
          clock_out_time: Timestamp;
          break_records?: BreakRecord[];
        };
        Returns: number;
      };
      calculate_overtime_minutes: {
        Args: {
          actual_work_minutes: number;
          overtime_threshold_minutes?: number;
        };
        Returns: number;
      };
      calculate_monthly_stats: {
        Args: {
          target_user_id: UUID;
          target_month: DateString;
        };
        Returns: MonthlyAttendanceStats[];
      };
    };
  };
}