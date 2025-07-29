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
 * - late_early_leave: 遅刻・早退
 * - absent: 欠勤
 */
export type AttendanceStatus = 'normal' | 'late' | 'early_leave' | 'late_early_leave' | 'absent';

/**
 * 勤怠ステータスエンティティ
 */
export interface AttendanceStatusEntity extends BaseEntity {
  /** 会社ID */
  company_id: UUID;
  /** システム内部名 */
  name: string;
  /** 表示名 */
  display_name: string;
  /** バッジの色 */
  color: string;
  /** フォント色 */
  font_color: string;
  /** 背景色 */
  background_color: string;
  /** 表示順序 */
  sort_order: number;
  /** 有効/無効フラグ */
  is_active: boolean;
  /** 必須フラグ（削除不可） */
  is_required: boolean;
  /** ステータス判定ロジック */
  logic?: string;
  /** 説明 */
  description?: string;
}

/**
 * ステータス判定ロジックの型定義
 */
export interface StatusLogic {
  /** ロジックタイプ */
  type: 'function' | 'condition';
  /** 関数名または条件名 */
  name: string;
  /** 条件配列 */
  conditions: StatusCondition[];
}

/**
 * ステータス判定条件の型定義
 */
export interface StatusCondition {
  /** フィールド名 */
  field: string;
  /** 演算子 */
  operator:
    | 'has_sessions'
    | 'has_completed_sessions'
    | 'empty'
    | 'greater_than'
    | 'less_than'
    | 'equals'
    | 'not_equals';
  /** 比較値 */
  value: unknown;
}

// ================================
// 休憩記録型
// ================================

/**
 * 休憩記録（新clock_records用）
 */
export interface ClockBreakRecord {
  /** 休憩開始日時（ISO8601） */
  break_start: string; // Timestamp
  /** 休憩終了日時（ISO8601） */
  break_end: string; // Timestamp
}

/**
 * 1勤務セッション（出退勤＋休憩）
 */
export interface ClockRecord {
  /** 出勤日時（ISO8601） */
  in_time: string; // Timestamp
  /** 退勤日時（ISO8601） */
  out_time: string; // Timestamp
  /** 休憩リスト */
  breaks: ClockBreakRecord[];
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
  /**
   * @deprecated clock_recordsへ移行予定
   */
  clock_in_time?: Timestamp;
  /**
   * @deprecated clock_recordsへ移行予定
   */
  clock_out_time?: Timestamp;
  /**
   * @deprecated clock_recordsへ移行予定
   */
  break_records: ClockBreakRecord[];
  /** 新しい複数勤務セッション記録 */
  clock_records: ClockRecord[];
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
  /** 勤怠ステータスID（attendance_statusesテーブルへの参照） */
  attendance_status_id?: UUID;
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
  /** 元の勤怠記録ID（編集履歴管理用） */
  source_id?: UUID;
  /** 編集理由 */
  edit_reason?: string;
  /** 編集者ID */
  edited_by?: UUID;
  /** 編集履歴の有無 */
  has_edit_history?: boolean;
  /** 動的ステータス（計算フィールド） */
  dynamicStatus?: string;
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
  /**
   * @deprecated clock_recordsへ移行予定
   */
  clock_in_time?: Timestamp;
  /**
   * @deprecated clock_recordsへ移行予定
   */
  clock_out_time?: Timestamp;
  /**
   * @deprecated clock_recordsへ移行予定
   */
  break_records?: ClockBreakRecord[];
  /** 新しい複数勤務セッション記録 */
  clock_records: ClockRecord[];
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
  /**
   * @deprecated clock_recordsへ移行予定
   */
  clock_in_time?: Timestamp;
  /**
   * @deprecated clock_recordsへ移行予定
   */
  clock_out_time?: Timestamp;
  /**
   * @deprecated clock_recordsへ移行予定
   */
  break_records?: ClockBreakRecord[];
  /** 新しい複数勤務セッション記録 */
  clock_records?: ClockRecord[];
  /** 実勤務時間（分） */
  actual_work_minutes?: number;
  /** 備考 */
  description?: string;
  /** 承認者ID */
  approved_by?: UUID;
  /** 承認日時 */
  approved_at?: Timestamp;
}

/**
 * 勤怠記録編集入力（時刻編集用）
 */
export interface EditAttendanceTimeInput {
  /** 編集対象の勤怠記録ID */
  attendance_id: UUID;
  /** 編集するclock_records */
  clock_records: ClockRecord[];
  /** 編集理由 */
  edit_reason: string;
  /** 編集者ID */
  edited_by: UUID;
}

/**
 * 勤怠記録編集履歴
 */
export interface AttendanceEditHistory {
  /** 編集履歴ID */
  id: UUID;
  /** 元の勤怠記録ID */
  source_id: UUID;
  /** 編集後の勤怠記録ID */
  edited_id: UUID;
  /** 編集理由 */
  edit_reason: string;
  /** 編集者ID */
  edited_by: UUID;
  /** 編集日時 */
  edited_at: Timestamp;
  /** 編集前のclock_records */
  original_clock_records: ClockRecord[];
  /** 編集後のclock_records */
  edited_clock_records: ClockRecord[];
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
