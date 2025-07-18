/**
 * TimePort データベースビュー関連型定義
 *
 * データベースビューの型を定義
 */

import type { UUID, DateString, TimeString, Timestamp } from './common';
import type { UserRole } from './auth';
import type { AttendanceStatus, BreakRecord } from './attendance';

// ================================
// ユーザー詳細ビュー型
// ================================

/**
 * ユーザー詳細ビュー
 */
export interface UserDetailView {
  /** ユーザーID */
  id: UUID;
  /** 社員番号 */
  code?: string;
  /** 名前（名） */
  first_name: string;
  /** 名前（姓） */
  family_name: string;
  /** フルネーム */
  full_name: string;
  /** メールアドレス */
  email: string;
  /** ユーザーロール */
  role: UserRole;
  /** 勤務開始日 */
  work_start_date?: DateString;
  /** 有効フラグ */
  is_active: boolean;
  /** 主所属グループ名 */
  primary_group_name?: string;
  /** グループパス */
  group_path?: string;
  /** 雇用形態名 */
  employment_type_name?: string;
  /** 会社名 */
  company_name?: string;
  /** 作成日時 */
  created_at: Timestamp;
  /** 更新日時 */
  updated_at: Timestamp;
}

// ================================
// 勤怠詳細ビュー型
// ================================

/**
 * 勤怠詳細ビュー
 */
export interface AttendanceDetailView {
  /** 勤怠ID */
  id: UUID;
  /** ユーザーID */
  user_id: UUID;
  /** 社員番号 */
  code?: string;
  /** フルネーム */
  full_name: string;
  /** 主所属グループ名 */
  primary_group_name?: string;
  /** 勤務日 */
  work_date: DateString;
  /** 出勤時刻 */
  clock_in_time?: Timestamp;
  /** 退勤時刻 */
  clock_out_time?: Timestamp;
  /** 休憩記録一覧 */
  break_records: BreakRecord[];
  /** 実勤務時間（分） */
  actual_work_minutes?: number;
  /** 残業時間（分） */
  overtime_minutes: number;
  /** 遅刻時間（分） */
  late_minutes: number;
  /** 早退時間（分） */
  early_leave_minutes: number;
  /** ステータス */
  status: AttendanceStatus;
  /** 備考 */
  description?: string;
  /** 勤務タイプ名 */
  work_type_name?: string;
  /** 勤務開始時刻 */
  work_start_time?: TimeString;
  /** 勤務終了時刻 */
  work_end_time?: TimeString;
  /** 作成日時 */
  created_at: Timestamp;
  /** 更新日時 */
  updated_at: Timestamp;
}

// ================================
// 申請詳細ビュー型
// ================================

/**
 * 申請詳細ビュー
 */
export interface RequestDetailView {
  /** 申請ID */
  id: UUID;
  /** ユーザーID */
  user_id: UUID;
  /** 社員番号 */
  code?: string;
  /** 申請者名 */
  applicant_name: string;
  /** 主所属グループ名 */
  primary_group_name?: string;
  /** 申請タイトル */
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
  /** 金額 */
  amount?: number;
  /** ステータス名 */
  status_name?: string;
  /** ステータス色 */
  status_color?: string;
  /** 申請コメント */
  submission_comment?: string;
  /** 申請種別名 */
  request_type_name: string;
  /** 申請カテゴリ */
  request_category: string;
  /** 承認者名 */
  approver_name?: string;
  /** 承認日時 */
  approved_at?: Timestamp;
  /** 却下理由 */
  rejection_reason?: string;
  /** 作成日時 */
  created_at: Timestamp;
  /** 更新日時 */
  updated_at: Timestamp;
}

// ================================
// グループ階層ビュー型
// ================================

/**
 * グループ階層ビュー
 */
export interface GroupHierarchyView {
  /** グループID */
  id: UUID;
  /** 会社ID */
  company_id: UUID;
  /** 親グループID */
  parent_group_id?: UUID;
  /** グループ名 */
  name: string;
  /** グループコード */
  code?: string;
  /** 説明 */
  description?: string;
  /** 階層レベル */
  level: number;
  /** 階層パス */
  path: string;
  /** 会社名 */
  company_name: string;
  /** 親グループ名 */
  parent_group_name?: string;
  /** ユーザー数 */
  user_count: number;
  /** 子グループ数 */
  child_group_count: number;
  /** 作成日時 */
  created_at: Timestamp;
  /** 更新日時 */
  updated_at: Timestamp;
}

// ================================
// ユーザーグループ詳細ビュー型
// ================================

/**
 * ユーザーグループ詳細ビュー
 */
export interface UserGroupDetailView {
  /** ユーザーID */
  user_id: UUID;
  /** グループID */
  group_id: UUID;
  /** ユーザー名 */
  user_name: string;
  /** 社員番号 */
  user_code?: string;
  /** メールアドレス */
  user_email: string;
  /** ユーザーロール */
  user_role: UserRole;
  /** グループ名 */
  group_name: string;
  /** グループコード */
  group_code?: string;
  /** グループパス */
  group_path: string;
  /** 階層レベル */
  group_level: number;
  /** 会社ID */
  company_id: UUID;
  /** 会社名 */
  company_name: string;
  /** 主所属フラグ */
  is_primary: boolean;
}

// ================================
// 申請種別フォーム詳細ビュー型
// ================================

/**
 * 申請種別フォーム詳細ビュー
 */
export interface RequestTypeFormDetailView {
  /** 申請種別ID */
  request_type_id: UUID;
  /** フォームID */
  form_id: UUID;
  /** 表示順序 */
  display_order: number;
  /** 必須フラグ */
  is_required: boolean;
  /** フィールド名 */
  field_name: string;
  /** フィールドタイプ */
  field_type: string;
  /** フィールドラベル */
  field_label: string;
  /** フィールドオプション */
  field_options: Record<string, any>;
  /** 申請種別名 */
  request_type_name: string;
  /** 申請種別コード */
  request_type_code: string;
  /** カテゴリ */
  category: string;
}

// ================================
// 月次勤怠統計ビュー型
// ================================

/**
 * 月次勤怠統計ビュー
 */
export interface MonthlyAttendanceStatsView {
  /** ユーザーID */
  user_id: UUID;
  /** 年月 */
  year_month: string;
  /** 勤務日数 */
  work_days: number;
  /** 総勤務時間（分） */
  total_work_minutes: number;
  /** 総残業時間（分） */
  total_overtime_minutes: number;
  /** 遅刻日数 */
  late_days: number;
  /** 早退日数 */
  early_leave_days: number;
  /** 欠勤日数 */
  absent_days: number;
  /** 平均勤務時間（分） */
  average_work_minutes: number;
  /** 平均残業時間（分） */
  average_overtime_minutes: number;
  /** フルネーム */
  full_name: string;
  /** 社員番号 */
  code?: string;
  /** 主所属グループ名 */
  primary_group_name?: string;
}

// ================================
// 申請統計ビュー型
// ================================

/**
 * 申請統計ビュー
 */
export interface RequestStatisticsView {
  /** ユーザーID */
  user_id: UUID;
  /** 社員番号 */
  code?: string;
  /** フルネーム */
  full_name: string;
  /** 主所属グループ名 */
  primary_group_name?: string;
  /** 申請種別名 */
  request_type_name: string;
  /** 申請カテゴリ */
  request_category: string;
  /** 年月 */
  month: string;
  /** 総申請数 */
  total_requests: number;
  /** 承認待ち申請数 */
  pending_requests: number;
  /** 承認済み申請数 */
  approved_requests: number;
  /** 却下申請数 */
  rejected_requests: number;
  /** 承認率（%） */
  approval_rate: number;
}

// ================================
// アクティブユーザービュー型
// ================================

/**
 * アクティブユーザービュー
 */
export interface ActiveUserView {
  /** ユーザーID */
  id: UUID;
  /** 社員番号 */
  code?: string;
  /** 名前（名） */
  first_name: string;
  /** 名前（姓） */
  family_name: string;
  /** フルネーム */
  full_name: string;
  /** 西洋式フルネーム */
  full_name_western: string;
  /** メールアドレス */
  email: string;
  /** ユーザーロール */
  role: UserRole;
  /** 主所属グループID */
  primary_group_id?: UUID;
  /** 雇用形態ID */
  employment_type_id?: UUID;
  /** 勤務タイプID */
  current_work_type_id?: UUID;
  /** 勤務開始日 */
  work_start_date?: DateString;
  /** 勤務終了日 */
  work_end_date?: DateString;
  /** 有効フラグ */
  is_active: boolean;
  /** 勤務タイプ名 */
  work_type_name?: string;
  /** 雇用形態名 */
  employment_type_name?: string;
  /** 作成日時 */
  created_at: Timestamp;
  /** 更新日時 */
  updated_at: Timestamp;
}

// ================================
// アクティブ勤怠ビュー型
// ================================

/**
 * アクティブ勤怠ビュー
 */
export interface ActiveAttendanceView {
  /** 勤怠ID */
  id: UUID;
  /** ユーザーID */
  user_id: UUID;
  /** 勤務日 */
  work_date: DateString;
  /** 勤務タイプID */
  work_type_id?: UUID;
  /** 出勤時刻 */
  clock_in_time?: Timestamp;
  /** 退勤時刻 */
  clock_out_time?: Timestamp;
  /** 休憩記録一覧 */
  break_records: BreakRecord[];
  /** 実勤務時間（分） */
  actual_work_minutes?: number;
  /** 残業時間（分） */
  overtime_minutes: number;
  /** 遅刻時間（分） */
  late_minutes: number;
  /** 早退時間（分） */
  early_leave_minutes: number;
  /** 自動計算フラグ */
  auto_calculated: boolean;
  /** 備考 */
  description?: string;
  /** 承認者ID */
  approved_by?: UUID;
  /** 承認日時 */
  approved_at?: Timestamp;
  /** フルネーム */
  full_name: string;
  /** 勤務タイプ名 */
  work_type_name?: string;
  /** 作成日時 */
  created_at: Timestamp;
  /** 更新日時 */
  updated_at: Timestamp;
}

// ================================
// アクティブ申請ビュー型
// ================================

/**
 * アクティブ申請ビュー
 */
export interface ActiveRequestView {
  /** 申請ID */
  id: UUID;
  /** ユーザーID */
  user_id: UUID;
  /** フルネーム */
  full_name: string;
  /** 申請種別ID */
  request_type_id: UUID;
  /** 申請種別名 */
  request_type_name: string;
  /** 申請タイトル */
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
  /** 金額 */
  amount?: number;
  /** ステータスID */
  status_id?: UUID;
  /** ステータス名 */
  status_name?: string;
  /** 現在の承認ステップ */
  current_approval_step: number;
  /** 申請コメント */
  submission_comment?: string;
  /** 作成日時 */
  created_at: Timestamp;
  /** 更新日時 */
  updated_at: Timestamp;
}
