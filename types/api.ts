/**
 * TimePort API関連型定義
 * 
 * API通信、リクエスト、レスポンスに関する型を定義
 */

import type { 
  UUID, 
  Timestamp, 
  DateString,
  UserProfile,
  Attendance,
  Request,
  RequestType,
  Group,
  Notification,
  MonthlyAttendanceStats
} from './database';

// ================================
// API レスポンス型
// ================================

/**
 * API基本レスポンス
 */
export interface ApiResponse<T = any> {
  /** レスポンスデータ */
  data?: T;
  /** エラーメッセージ */
  error?: string;
  /** 成功/エラーメッセージ */
  message?: string;
  /** 成功フラグ */
  success: boolean;
  /** タイムスタンプ */
  timestamp?: Timestamp;
}

/**
 * APIエラー
 */
export interface ApiError {
  /** エラーコード */
  code: string;
  /** エラーメッセージ */
  message: string;
  /** 詳細情報 */
  details?: Record<string, any>;
  /** タイムスタンプ */
  timestamp: Timestamp;
}

/**
 * ページネーション付きAPIレスポンス
 */
export interface PaginatedApiResponse<T> extends ApiResponse<T[]> {
  /** ページネーション情報 */
  pagination: {
    /** 総件数 */
    total: number;
    /** 現在のページ */
    page: number;
    /** 1ページあたりの件数 */
    limit: number;
    /** 総ページ数 */
    totalPages: number;
    /** 次ページ存在フラグ */
    hasMore: boolean;
    /** 前ページ存在フラグ */
    hasPrevious: boolean;
  };
}

// ================================
// API リクエスト型
// ================================

/**
 * ページネーションパラメータ
 */
export interface PaginationParams {
  /** ページ番号 */
  page?: number;
  /** 1ページあたりの件数 */
  limit?: number;
  /** オフセット */
  offset?: number;
}

/**
 * ソートパラメータ
 */
export interface SortParams {
  /** ソートフィールド */
  orderBy?: string;
  /** ソート方向 */
  sortDirection?: 'asc' | 'desc';
}

/**
 * フィルターパラメータ
 */
export interface FilterParams {
  /** 検索キーワード */
  search?: string;
  /** フィルター条件 */
  filters?: Record<string, any>;
}

/**
 * クエリパラメータ
 */
export interface QueryParams extends PaginationParams, SortParams, FilterParams {
  /** 含めるリレーション */
  include?: string[];
  /** 除外するフィールド */
  exclude?: string[];
}

// ================================
// 認証関連API型
// ================================

/**
 * ログインリクエスト
 */
export interface LoginRequest {
  /** メールアドレス */
  email: string;
  /** パスワード */
  password: string;
  /** ログイン状態を保持するか */
  remember_me?: boolean;
}

/**
 * ログインレスポンス
 */
export interface LoginResponse extends ApiResponse {
  /** レスポンスデータ */
  data: {
    /** ユーザー情報 */
    user: UserProfile;
    /** アクセストークン */
    access_token: string;
    /** リフレッシュトークン */
    refresh_token: string;
    /** トークン有効期限（秒） */
    expires_in: number;
  };
}

/**
 * トークンリフレッシュリクエスト
 */
export interface RefreshTokenRequest {
  /** リフレッシュトークン */
  refresh_token: string;
}

/**
 * ログアウトリクエスト
 */
export interface LogoutRequest {
  /** アクセストークン */
  access_token: string;
}

// ================================
// ユーザー関連API型
// ================================

/**
 * ユーザー検索パラメータ
 */
export interface GetUsersParams extends QueryParams {
  /** ロール */
  role?: 'system-admin' | 'admin' | 'member';
  /** グループID */
  group_id?: UUID;
  /** 有効フラグ */
  is_active?: boolean;
  /** 雇用形態ID */
  employment_type_id?: UUID;
}

/**
 * ユーザー作成リクエスト
 */
export interface CreateUserRequest {
  /** 社員番号 */
  code?: string;
  /** 名前（名） */
  first_name: string;
  /** 名前（姓） */
  family_name: string;
  /** メールアドレス */
  email: string;
  /** ユーザーロール */
  role: 'system-admin' | 'admin' | 'member';
  /** 主所属グループID */
  primary_group_id?: UUID;
  /** 雇用形態ID */
  employment_type_id?: UUID;
  /** 勤務開始日 */
  work_start_date?: DateString;
  /** パスワード */
  password: string;
}

/**
 * ユーザー更新リクエスト
 */
export interface UpdateUserRequest {
  /** 社員番号 */
  code?: string;
  /** 名前（名） */
  first_name?: string;
  /** 名前（姓） */
  family_name?: string;
  /** メールアドレス */
  email?: string;
  /** ユーザーロール */
  role?: 'system-admin' | 'admin' | 'member';
  /** 主所属グループID */
  primary_group_id?: UUID;
  /** 雇用形態ID */
  employment_type_id?: UUID;
  /** 勤務開始日 */
  work_start_date?: DateString;
  /** 勤務終了日 */
  work_end_date?: DateString;
  /** 有効フラグ */
  is_active?: boolean;
}

/**
 * ユーザープロフィールレスポンス
 */
export interface UserProfileResponse extends ApiResponse {
  /** レスポンスデータ */
  data: UserProfile & {
    /** 主所属グループ */
    primary_group?: Group;
    /** 雇用形態 */
    employment_type?: {
      id: UUID;
      name: string;
    };
  };
}

// ================================
// 勤怠関連API型
// ================================

/**
 * 勤怠検索パラメータ
 */
export interface GetAttendanceParams extends QueryParams {
  /** ユーザーID */
  user_id?: UUID;
  /** 開始日 */
  start_date?: DateString;
  /** 終了日 */
  end_date?: DateString;
  /** ステータス */
  status?: 'normal' | 'late' | 'early_leave' | 'absent';
  /** 勤務タイプID */
  work_type_id?: UUID;
}

/**
 * 出勤打刻リクエスト
 */
export interface ClockInRequest {
  /** ユーザーID */
  user_id: UUID;
  /** 勤務タイプID */
  work_type_id?: UUID;
  /** 出勤時刻 */
  clock_in_time?: Timestamp;
  /** 備考 */
  notes?: string;
}

/**
 * 退勤打刻リクエスト
 */
export interface ClockOutRequest {
  /** ユーザーID */
  user_id: UUID;
  /** 退勤時刻 */
  clock_out_time?: Timestamp;
  /** 備考 */
  notes?: string;
}

/**
 * 休憩リクエスト
 */
export interface BreakRequest {
  /** ユーザーID */
  user_id: UUID;
  /** 休憩時刻 */
  break_time: Timestamp;
  /** 休憩タイプ */
  break_type: 'start' | 'end';
}

/**
 * 勤怠レスポンス
 */
export interface AttendanceResponse extends ApiResponse {
  /** レスポンスデータ */
  data: Attendance & {
    /** 勤務タイプ */
    work_type?: {
      id: UUID;
      name: string;
      work_start_time: string;
      work_end_time: string;
    };
  };
}

/**
 * 月次統計レスポンス
 */
export interface MonthlyStatsResponse extends ApiResponse {
  /** レスポンスデータ */
  data: MonthlyAttendanceStats;
}

// ================================
// 申請関連API型
// ================================

/**
 * 申請検索パラメータ
 */
export interface GetRequestsParams extends QueryParams {
  /** ユーザーID */
  user_id?: UUID;
  /** 申請種別ID */
  request_type_id?: UUID;
  /** ステータス */
  status?: 'pending' | 'approved' | 'rejected';
  /** カテゴリ */
  category?: string;
  /** 開始日 */
  start_date?: DateString;
  /** 終了日 */
  end_date?: DateString;
}

/**
 * 申請作成リクエスト
 */
export interface CreateRequestRequest {
  /** 申請種別ID */
  request_type_id: UUID;
  /** タイトル */
  title: string;
  /** フォームデータ */
  form_data: Record<string, any>;
  /** 対象日 */
  target_date?: DateString;
  /** 開始日 */
  start_date?: DateString;
  /** 終了日 */
  end_date?: DateString;
  /** 日数 */
  days_count?: number;
  /** 申請コメント */
  submission_comment?: string;
}

/**
 * 申請ステータス更新リクエスト
 */
export interface UpdateRequestStatusRequest {
  /** ステータス */
  status: 'approved' | 'rejected';
  /** 承認者コメント */
  approver_comment?: string;
  /** 却下理由 */
  rejection_reason?: string;
}

/**
 * 申請レスポンス
 */
export interface RequestResponse extends ApiResponse {
  /** レスポンスデータ */
  data: Request & {
    /** 申請種別 */
    request_type: RequestType;
    /** 申請者 */
    applicant: {
      id: UUID;
      full_name: string;
      code?: string;
    };
    /** 承認者 */
    approver?: {
      id: UUID;
      full_name: string;
    };
  };
}

// ================================
// 申請種別関連API型
// ================================

/**
 * 申請種別検索パラメータ
 */
export interface GetRequestTypesParams extends QueryParams {
  /** カテゴリ */
  category?: string;
  /** 有効フラグ */
  is_active?: boolean;
}

/**
 * 申請種別作成リクエスト
 */
export interface CreateRequestTypeRequest {
  /** コード */
  code: string;
  /** 名前 */
  name: string;
  /** 説明 */
  description?: string;
  /** カテゴリ */
  category: string;
  /** フォーム設定 */
  form_config: any[];
  /** 承認フロー */
  approval_flow: any[];
  /** 有効フラグ */
  is_active?: boolean;
}

/**
 * 申請種別更新リクエスト
 */
export interface UpdateRequestTypeRequest {
  /** コード */
  code?: string;
  /** 名前 */
  name?: string;
  /** 説明 */
  description?: string;
  /** カテゴリ */
  category?: string;
  /** フォーム設定 */
  form_config?: any[];
  /** 承認フロー */
  approval_flow?: any[];
  /** 有効フラグ */
  is_active?: boolean;
}

// ================================
// グループ関連API型
// ================================

/**
 * グループ検索パラメータ
 */
export interface GetGroupsParams extends QueryParams {
  /** 会社ID */
  company_id?: UUID;
  /** 親グループID */
  parent_group_id?: UUID;
  /** 階層レベル */
  level?: number;
}

/**
 * グループ作成リクエスト
 */
export interface CreateGroupRequest {
  /** 会社ID */
  company_id: UUID;
  /** 親グループID */
  parent_group_id?: UUID;
  /** コード */
  code?: string;
  /** 名前 */
  name: string;
  /** 説明 */
  description?: string;
}

/**
 * グループ更新リクエスト
 */
export interface UpdateGroupRequest {
  /** 親グループID */
  parent_group_id?: UUID;
  /** コード */
  code?: string;
  /** 名前 */
  name?: string;
  /** 説明 */
  description?: string;
}

// ================================
// 通知関連API型
// ================================

/**
 * 通知検索パラメータ
 */
export interface GetNotificationsParams extends QueryParams {
  /** ユーザーID */
  user_id?: UUID;
  /** タイプ */
  type?: 'info' | 'warning' | 'error' | 'success';
  /** 既読フラグ */
  is_read?: boolean;
  /** 優先度 */
  priority?: 'low' | 'normal' | 'high' | 'urgent';
}

/**
 * 通知作成リクエスト
 */
export interface CreateNotificationRequest {
  /** ユーザーID */
  user_id: UUID;
  /** タイプ */
  type: 'info' | 'warning' | 'error' | 'success';
  /** タイトル */
  title: string;
  /** メッセージ */
  message: string;
  /** リンクURL */
  link_url?: string;
  /** 優先度 */
  priority?: 'low' | 'normal' | 'high' | 'urgent';
  /** 有効期限 */
  expires_at?: Timestamp;
}

/**
 * 通知既読リクエスト
 */
export interface MarkNotificationReadRequest {
  /** 通知ID一覧 */
  notification_ids: UUID[];
}

// ================================
// ダッシュボード関連API型
// ================================

/**
 * ダッシュボード統計レスポンス
 */
export interface DashboardStatsResponse extends ApiResponse {
  /** レスポンスデータ */
  data: {
    /** ユーザー統計 */
    user_stats?: {
      /** 総ユーザー数 */
      total_users: number;
      /** アクティブユーザー数 */
      active_users: number;
      /** 今月の新規ユーザー数 */
      new_users_this_month: number;
    };
    /** 勤怠統計 */
    attendance_stats?: {
      /** 今日の出勤者数 */
      today_attendance: number;
      /** 今月の勤務日数 */
      monthly_work_days: number;
      /** 今月の残業時間 */
      monthly_overtime_hours: number;
      /** 今月の遅刻回数 */
      late_arrivals_this_month: number;
    };
    /** 申請統計 */
    request_stats?: {
      /** 承認待ち申請数 */
      pending_requests: number;
      /** 今月の承認済み申請数 */
      approved_requests_this_month: number;
      /** 今月の却下申請数 */
      rejected_requests_this_month: number;
    };
  };
}

/**
 * 最近のアクティビティレスポンス
 */
export interface RecentActivityResponse extends ApiResponse {
  /** レスポンスデータ */
  data: Array<{
    /** アクティビティID */
    id: UUID;
    /** アクティビティタイプ */
    type: string;
    /** タイトル */
    title: string;
    /** 説明 */
    description?: string;
    /** タイムスタンプ */
    timestamp: Timestamp;
    /** ユーザー */
    user?: {
      id: UUID;
      full_name: string;
    };
  }>;
}

// ================================
// 設定関連API型
// ================================

/**
 * システム設定レスポンス
 */
export interface SystemSettingsResponse extends ApiResponse {
  /** レスポンスデータ */
  data: {
    /** 会社設定 */
    company: {
      /** 会社名 */
      name: string;
      /** タイムゾーン */
      timezone: string;
    };
    /** 勤務時間設定 */
    working_hours: {
      /** 開始時刻 */
      start: string;
      /** 終了時刻 */
      end: string;
      /** 休憩時間（分） */
      break_duration: number;
    };
    /** 機能設定 */
    features: Record<string, boolean>;
    /** 通知設定 */
    notifications: Record<string, boolean>;
  };
}

/**
 * システム設定更新リクエスト
 */
export interface UpdateSystemSettingsRequest {
  /** 会社設定 */
  company?: {
    /** 会社名 */
    name?: string;
    /** タイムゾーン */
    timezone?: string;
  };
  /** 勤務時間設定 */
  working_hours?: {
    /** 開始時刻 */
    start?: string;
    /** 終了時刻 */
    end?: string;
    /** 休憩時間（分） */
    break_duration?: number;
  };
  /** 機能設定 */
  features?: Record<string, boolean>;
  /** 通知設定 */
  notifications?: Record<string, boolean>;
}

// ================================
// ファイルアップロード関連API型
// ================================

/**
 * ファイルアップロードリクエスト
 */
export interface FileUploadRequest {
  /** ファイル */
  file: File;
  /** カテゴリ */
  category: 'profile' | 'attachment' | 'document';
  /** 説明 */
  description?: string;
}

/**
 * ファイルアップロードレスポンス
 */
export interface FileUploadResponse extends ApiResponse {
  /** レスポンスデータ */
  data: {
    /** ファイルID */
    id: UUID;
    /** ファイル名 */
    filename: string;
    /** オリジナルファイル名 */
    original_name: string;
    /** MIMEタイプ */
    mime_type: string;
    /** サイズ */
    size: number;
    /** URL */
    url: string;
    /** カテゴリ */
    category: string;
    /** アップロード日時 */
    uploaded_at: Timestamp;
  };
}

// ================================
// バッチ処理関連API型
// ================================

/**
 * バッチ操作リクエスト
 */
export interface BatchOperationRequest<T = any> {
  /** 操作タイプ */
  operation: 'create' | 'update' | 'delete';
  /** 対象アイテム */
  items: T[];
}

/**
 * バッチ操作レスポンス
 */
export interface BatchOperationResponse extends ApiResponse {
  /** レスポンスデータ */
  data: {
    /** 総件数 */
    total: number;
    /** 成功件数 */
    successful: number;
    /** 失敗件数 */
    failed: number;
    /** エラー一覧 */
    errors: Array<{
      /** インデックス */
      index: number;
      /** エラー */
      error: string;
    }>;
  };
}

// ================================
// エクスポート・インポート関連API型
// ================================

/**
 * エクスポートリクエスト
 */
export interface ExportRequest {
  /** エクスポートタイプ */
  type: 'attendance' | 'requests' | 'users';
  /** フォーマット */
  format: 'csv' | 'xlsx' | 'pdf';
  /** フィルター条件 */
  filters?: Record<string, any>;
  /** 日付範囲 */
  date_range?: {
    /** 開始日 */
    start_date: DateString;
    /** 終了日 */
    end_date: DateString;
  };
}

/**
 * エクスポートレスポンス
 */
export interface ExportResponse extends ApiResponse {
  /** レスポンスデータ */
  data: {
    /** ダウンロードURL */
    download_url: string;
    /** ファイル名 */
    filename: string;
    /** 有効期限 */
    expires_at: Timestamp;
  };
}

/**
 * インポートリクエスト
 */
export interface ImportRequest {
  /** インポートタイプ */
  type: 'attendance' | 'users';
  /** ファイル */
  file: File;
  /** オプション */
  options?: Record<string, any>;
}

/**
 * インポートレスポンス
 */
export interface ImportResponse extends ApiResponse {
  /** レスポンスデータ */
  data: {
    /** 総行数 */
    total_rows: number;
    /** インポート行数 */
    imported_rows: number;
    /** 失敗行数 */
    failed_rows: number;
    /** エラー一覧 */
    errors: Array<{
      /** 行番号 */
      row: number;
      /** エラー */
      error: string;
    }>;
  };
}