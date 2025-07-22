/**
 * TimePort 勤怠管理関連型定義
 *
 * 勤怠記録、打刻、休憩記録に関する型を定義
 */

import type { BaseEntity, UUID, DateString, TimeString, Timestamp } from './common';

// ================================
// 勤怠ステータス型
// ================================

/**
 * 勤怠ステータス
 * - normal: 正常出勤
 * - late: 遅刻
 * - early_leave: 早退
 * - absent: 欠勤
 */
export type AttendanceStatus = 'normal' | 'late' | 'early_leave' | 'absent';

// ================================
// 休憩記録型
// ================================

/**
 * 休憩記録（JSONB格納用）
 */
export interface BreakRecord {
  /** 休憩開始時刻 */
  start: TimeString;
  /** 休憩終了時刻 */
  end: TimeString;
  /** 休憩種別 */
  type?: 'lunch' | 'break' | 'other';
  /** 備考 */
  note?: string;
}

// ================================
// 勤怠記録型
// ================================

/**
 * 勤怠記録エンティティ
 */
export interface Attendance extends BaseEntity {
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
  /** ステータス */
  status: 'normal' | 'late' | 'early_leave' | 'absent';
  /** 自動計算フラグ */
  auto_calculated: boolean;
  /** 備考 */
  description?: string;
  /** 承認者ID */
  approved_by?: UUID;
  /** 承認日時 */
  approved_at?: Timestamp;
  /** 総休憩時間（分）- 計算フィールド */
  total_break_minutes?: number;
  /** 休憩回数 - 計算フィールド */
  break_count?: number;
  /** 承認状態 - 計算フィールド */
  approval_status?: 'approved' | 'pending';
  /** 承認者名 - 計算フィールド */
  approver_name?: string;
  /** 勤務タイプ名 - 計算フィールド */
  work_type_name?: string;
  /** ユーザー名 - 計算フィールド（admin用） */
  user_name?: string;
  /** ユーザーコード - 計算フィールド（admin用） */
  user_code?: string;
}

/**
 * 勤怠記録作成用入力型
 */
export interface CreateAttendanceInput {
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
  break_records?: BreakRecord[];
  /** 実勤務時間（分） */
  actual_work_minutes?: number;
  /** 備考 */
  description?: string;
}

/**
 * 勤怠記録更新用入力型
 */
export interface UpdateAttendanceInput {
  /** 勤務タイプID */
  work_type_id?: UUID;
  /** 出勤時刻 */
  clock_in_time?: Timestamp;
  /** 退勤時刻 */
  clock_out_time?: Timestamp;
  /** 休憩記録一覧 */
  break_records?: BreakRecord[];
  /** 実勤務時間（分） */
  actual_work_minutes?: number;
  /** 備考 */
  description?: string;
  /** 承認者ID */
  approved_by?: UUID;
  /** 承認日時 */
  approved_at?: Timestamp;
}

// ================================
// 打刻操作型
// ================================

/**
 * 打刻タイプ
 */
export type ClockType = 'clock_in' | 'clock_out' | 'break_start' | 'break_end';

/**
 * 打刻操作
 */
export interface ClockOperation {
  /** ユーザーID */
  user_id: UUID;
  /** 打刻タイプ */
  type: ClockType;
  /** 打刻時刻 */
  timestamp: Timestamp;
  /** 勤務タイプID（出勤時のみ） */
  work_type_id?: UUID;
  /** 位置情報 */
  location?: {
    latitude: number;
    longitude: number;
    accuracy?: number;
  };
  /** 備考 */
  note?: string;
}

/**
 * 打刻結果
 */
export interface ClockResult {
  /** 成功フラグ */
  success: boolean;
  /** メッセージ */
  message: string;
  /** 更新された勤怠記録 */
  attendance?: Attendance;
  /** エラー詳細 */
  error?: string;
  /** 警告メッセージ */
  warnings?: string[];
}

// ================================
// 勤怠統計型
// ================================

/**
 * 月次勤怠統計
 */
export interface MonthlyAttendanceStats {
  /** 対象年月 */
  year_month: string;
  /** 勤務日数 */
  work_days: number;
  /** 総勤務時間（時間） */
  total_work_hours: number;
  /** 総残業時間（時間） */
  total_overtime_hours: number;
  /** 遅刻日数 */
  late_days: number;
  /** 早退日数 */
  early_leave_days: number;
  /** 欠勤日数 */
  absent_days: number;
  /** 平均勤務時間（時間） */
  average_work_hours: number;
  /** 平均残業時間（時間） */
  average_overtime_hours: number;
  /** 出勤率（%） */
  attendance_rate: number;
}

/**
 * 日次勤怠サマリー
 */
export interface DailyAttendanceSummary {
  /** 勤務日 */
  work_date: DateString;
  /** 出勤時刻 */
  clock_in_time?: TimeString;
  /** 退勤時刻 */
  clock_out_time?: TimeString;
  /** 勤務時間（時間） */
  work_hours: number;
  /** 残業時間（時間） */
  overtime_hours: number;
  /** ステータス */
  status: AttendanceStatus;
  /** 休憩時間（分） */
  break_minutes: number;
  /** 備考 */
  notes?: string;
}

/**
 * 勤怠集計データ
 */
export interface AttendanceAggregation {
  /** 期間開始日 */
  period_start: DateString;
  /** 期間終了日 */
  period_end: DateString;
  /** 総勤務日数 */
  total_work_days: number;
  /** 総勤務時間（分） */
  total_work_minutes: number;
  /** 総残業時間（分） */
  total_overtime_minutes: number;
  /** 総休憩時間（分） */
  total_break_minutes: number;
  /** 遅刻回数 */
  late_count: number;
  /** 早退回数 */
  early_leave_count: number;
  /** 欠勤回数 */
  absent_count: number;
  /** 平均出勤時刻 */
  average_clock_in_time?: TimeString;
  /** 平均退勤時刻 */
  average_clock_out_time?: TimeString;
}

// ================================
// 勤怠詳細型
// ================================

/**
 * 勤怠記録詳細（リレーション含む）
 */
export interface AttendanceDetail extends Attendance {
  /** ユーザー情報 */
  user: {
    id: UUID;
    full_name: string;
    employee_code?: string;
  };
  /** 勤務タイプ情報 */
  work_type?: {
    id: UUID;
    name: string;
    work_start_time: TimeString;
    work_end_time: TimeString;
    break_duration_minutes: number;
  };
  /** 承認者情報 */
  approver?: {
    id: UUID;
    full_name: string;
  };
  /** 計算結果 */
  calculations: {
    /** 標準勤務時間（分） */
    standard_work_minutes: number;
    /** 実勤務時間（分） */
    actual_work_minutes: number;
    /** 総休憩時間（分） */
    total_break_minutes: number;
    /** 残業時間（分） */
    overtime_minutes: number;
    /** 深夜勤務時間（分） */
    night_work_minutes: number;
  };
  /** ステータス情報 */
  status_info: {
    /** ステータス */
    status: AttendanceStatus;
    /** 遅刻時間（分） */
    late_minutes: number;
    /** 早退時間（分） */
    early_leave_minutes: number;
    /** 警告メッセージ */
    warnings: string[];
  };
}

// ================================
// 検索・フィルター型
// ================================

/**
 * 勤怠記録検索条件
 */
export interface AttendanceSearchCriteria {
  /** ユーザーID */
  user_id?: UUID;
  /** グループID */
  group_id?: UUID;
  /** 開始日 */
  start_date?: DateString;
  /** 終了日 */
  end_date?: DateString;
  /** ステータス */
  status?: AttendanceStatus;
  /** 勤務タイプID */
  work_type_id?: UUID;
  /** 承認状態 */
  approval_status?: 'pending' | 'approved' | 'rejected';
  /** 残業あり */
  has_overtime?: boolean;
  /** 遅刻あり */
  has_late?: boolean;
}

/**
 * 勤怠フィルター設定
 */
export interface AttendanceFilters {
  /** 日付範囲 */
  dateRange: {
    startDate: DateString | null;
    endDate: DateString | null;
  };
  /** ステータス（複数選択可能） */
  status: AttendanceStatus[];
  /** 残業フィルター */
  hasOvertime: boolean | null;
  /** 勤務タイプID */
  workTypeId: UUID | null;
  /** 承認状態 */
  approvalStatus: 'pending' | 'approved' | 'rejected' | null;
  /** ユーザーID（admin用） */
  userId?: UUID | null;
  /** グループID（admin用） */
  groupId?: UUID | null;
}

/**
 * 勤怠統計検索条件
 */
export interface AttendanceStatsSearchCriteria {
  /** ユーザーID */
  user_id?: UUID;
  /** グループID */
  group_id?: UUID;
  /** 年月 */
  year_month?: string;
  /** 開始年月 */
  start_year_month?: string;
  /** 終了年月 */
  end_year_month?: string;
}

// ================================
// 勤怠設定型
// ================================

/**
 * 勤怠設定
 */
export interface AttendanceSettings {
  /** 自動計算有効 */
  auto_calculation_enabled: boolean;
  /** 遅刻許容時間（分） */
  late_tolerance_minutes: number;
  /** 早退許容時間（分） */
  early_leave_tolerance_minutes: number;
  /** 残業開始閾値（分） */
  overtime_threshold_minutes: number;
  /** 深夜勤務開始時刻 */
  night_work_start_time: TimeString;
  /** 深夜勤務終了時刻 */
  night_work_end_time: TimeString;
  /** 位置情報必須 */
  location_required: boolean;
  /** 承認必須 */
  approval_required: boolean;
  /** 自動承認日数 */
  auto_approval_days?: number;
}

// ================================
// 勤怠エラー型
// ================================

/**
 * 勤怠エラータイプ
 */
export type AttendanceErrorType =
  | 'already_clocked_in'
  | 'not_clocked_in'
  | 'invalid_time'
  | 'future_date'
  | 'duplicate_record'
  | 'missing_work_type'
  | 'location_required'
  | 'outside_work_hours';

/**
 * 勤怠エラー
 */
export interface AttendanceError {
  /** エラータイプ */
  type: AttendanceErrorType;
  /** エラーメッセージ */
  message: string;
  /** エラー詳細 */
  details?: Record<string, unknown>;
  /** 修正提案 */
  suggestions?: string[];
}
