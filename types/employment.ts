/**
 * TimePort 雇用・勤務関連型定義
 *
 * 雇用形態、勤務パターン、休暇種別に関する型を定義
 */

import type { BaseEntity, UUID, DateString, TimeString, Settings } from './common';

// ================================
// 雇用形態型
// ================================

/**
 * 雇用形態エンティティ
 */
export interface EmploymentType extends BaseEntity {
  /** 会社ID */
  company_id: UUID;
  /** 雇用形態コード */
  code?: string;
  /** 雇用形態名 */
  name: string;
  /** 説明 */
  description?: string;
  /** 有効フラグ */
  is_active: boolean;
  /** 表示順序 */
  display_order: number;
}

/**
 * 雇用形態作成用入力型
 */
export interface CreateEmploymentTypeInput {
  /** 会社ID */
  company_id: UUID;
  /** 雇用形態コード */
  code?: string;
  /** 雇用形態名 */
  name: string;
  /** 説明 */
  description?: string;
  /** 有効フラグ */
  is_active?: boolean;
  /** 表示順序 */
  display_order?: number;
}

/**
 * 雇用形態更新用入力型
 */
export interface UpdateEmploymentTypeInput {
  /** 雇用形態コード */
  code?: string;
  /** 雇用形態名 */
  name?: string;
  /** 説明 */
  description?: string;
  /** 有効フラグ */
  is_active?: boolean;
  /** 表示順序 */
  display_order?: number;
}

// ================================
// 勤務パターン型
// ================================

/**
 * 勤務パターンエンティティ
 */
export interface WorkType extends BaseEntity {
  /** 会社ID */
  company_id: UUID;
  /** 勤務パターンコード */
  code?: string;
  /** 勤務パターン名 */
  name: string;
  /** 勤務開始時刻 */
  work_start_time: TimeString;
  /** 勤務終了時刻 */
  work_end_time: TimeString;
  /** 休憩時間（分） */
  break_duration_minutes: number;
  /** フレックス勤務フラグ */
  is_flexible: boolean;
  /** フレックス開始可能時刻 */
  flex_start_time?: TimeString;
  /** フレックス終了可能時刻 */
  flex_end_time?: TimeString;
  /** コアタイム開始時刻 */
  core_start_time?: TimeString;
  /** コアタイム終了時刻 */
  core_end_time?: TimeString;
  /** 残業開始閾値（分） */
  overtime_threshold_minutes: number;
  /** 説明 */
  description?: string;
  /** 有効フラグ */
  is_active: boolean;
  /** 表示順序 */
  display_order: number;
}

/**
 * 勤務パターン作成用入力型
 */
export interface CreateWorkTypeInput {
  /** 会社ID */
  company_id: UUID;
  /** 勤務パターンコード */
  code?: string;
  /** 勤務パターン名 */
  name: string;
  /** 勤務開始時刻 */
  work_start_time: TimeString;
  /** 勤務終了時刻 */
  work_end_time: TimeString;
  /** 休憩時間（分） */
  break_duration_minutes?: number;
  /** フレックス勤務フラグ */
  is_flexible?: boolean;
  /** フレックス開始可能時刻 */
  flex_start_time?: TimeString;
  /** フレックス終了可能時刻 */
  flex_end_time?: TimeString;
  /** コアタイム開始時刻 */
  core_start_time?: TimeString;
  /** コアタイム終了時刻 */
  core_end_time?: TimeString;
  /** 残業開始閾値（分） */
  overtime_threshold_minutes?: number;
  /** 説明 */
  description?: string;
  /** 有効フラグ */
  is_active?: boolean;
  /** 表示順序 */
  display_order?: number;
}

/**
 * 勤務パターン更新用入力型
 */
export interface UpdateWorkTypeInput {
  /** 勤務パターンコード */
  code?: string;
  /** 勤務パターン名 */
  name?: string;
  /** 勤務開始時刻 */
  work_start_time?: TimeString;
  /** 勤務終了時刻 */
  work_end_time?: TimeString;
  /** 休憩時間（分） */
  break_duration_minutes?: number;
  /** フレックス勤務フラグ */
  is_flexible?: boolean;
  /** フレックス開始可能時刻 */
  flex_start_time?: TimeString;
  /** フレックス終了可能時刻 */
  flex_end_time?: TimeString;
  /** コアタイム開始時刻 */
  core_start_time?: TimeString;
  /** コアタイム終了時刻 */
  core_end_time?: TimeString;
  /** 残業開始閾値（分） */
  overtime_threshold_minutes?: number;
  /** 説明 */
  description?: string;
  /** 有効フラグ */
  is_active?: boolean;
  /** 表示順序 */
  display_order?: number;
}

// ================================
// 休暇種別型
// ================================

/**
 * 休暇種別エンティティ
 */
export interface LeaveType extends BaseEntity {
  /** 会社ID */
  company_id: UUID;
  /** 休暇種別コード */
  code?: string;
  /** 休暇種別名 */
  name: string;
  /** 説明 */
  description?: string;
  /** 年間最大取得日数 */
  max_days_per_year?: number;
  /** 設定情報 */
  settings: LeaveTypeSettings;
  /** 有効フラグ */
  is_active: boolean;
  /** 表示順序 */
  display_order: number;
}

/**
 * 休暇種別設定
 */
export interface LeaveTypeSettings {
  /** 有給休暇フラグ */
  is_paid?: boolean;
  /** 年次有給休暇フラグ */
  is_annual_leave?: boolean;
  /** 最小申請日数 */
  min_notice_days?: number;
  /** 最大連続取得日数 */
  max_consecutive_days?: number;
  /** 半日取得可能フラグ */
  allow_half_day?: boolean;
  /** 時間単位取得可能フラグ */
  allow_hourly?: boolean;
  /** 承認必須フラグ */
  requires_approval?: boolean;
  /** 医師の診断書必要日数 */
  medical_certificate_required_days?: number;
}

/**
 * 休暇種別作成用入力型
 */
export interface CreateLeaveTypeInput {
  /** 会社ID */
  company_id: UUID;
  /** 休暇種別コード */
  code?: string;
  /** 休暇種別名 */
  name: string;
  /** 説明 */
  description?: string;
  /** 年間最大取得日数 */
  max_days_per_year?: number;
  /** 設定情報 */
  settings?: LeaveTypeSettings;
  /** 有効フラグ */
  is_active?: boolean;
  /** 表示順序 */
  display_order?: number;
}

/**
 * 休暇種別更新用入力型
 */
export interface UpdateLeaveTypeInput {
  /** 休暇種別コード */
  code?: string;
  /** 休暇種別名 */
  name?: string;
  /** 説明 */
  description?: string;
  /** 年間最大取得日数 */
  max_days_per_year?: number;
  /** 設定情報 */
  settings?: LeaveTypeSettings;
  /** 有効フラグ */
  is_active?: boolean;
  /** 表示順序 */
  display_order?: number;
}

// ================================
// ユーザー勤務タイプ履歴型
// ================================

/**
 * ユーザー勤務タイプ履歴エンティティ
 */
export interface UserWorkTypeHistory extends BaseEntity {
  /** ユーザーID */
  user_id: UUID;
  /** 勤務タイプID */
  work_type_id: UUID;
  /** 適用開始日 */
  effective_from: DateString;
  /** 適用終了日 */
  effective_to?: DateString;
}

/**
 * ユーザー勤務タイプ履歴作成用入力型
 */
export interface CreateUserWorkTypeHistoryInput {
  /** ユーザーID */
  user_id: UUID;
  /** 勤務タイプID */
  work_type_id: UUID;
  /** 適用開始日 */
  effective_from: DateString;
  /** 適用終了日 */
  effective_to?: DateString;
}

// ================================
// 勤務時間計算型
// ================================

/**
 * 勤務時間計算結果
 */
export interface WorkTimeCalculation {
  /** 標準勤務時間（分） */
  standard_work_minutes: number;
  /** 実勤務時間（分） */
  actual_work_minutes: number;
  /** 休憩時間（分） */
  break_minutes: number;
  /** 残業時間（分） */
  overtime_minutes: number;
  /** 深夜勤務時間（分） */
  night_work_minutes: number;
  /** 休日勤務時間（分） */
  holiday_work_minutes: number;
}

/**
 * フレックス勤務制約
 */
export interface FlexWorkConstraints {
  /** 最早出勤可能時刻 */
  earliest_start: TimeString;
  /** 最遅退勤可能時刻 */
  latest_end: TimeString;
  /** コアタイム開始 */
  core_start: TimeString;
  /** コアタイム終了 */
  core_end: TimeString;
  /** 最小勤務時間（分） */
  min_work_minutes: number;
  /** 最大勤務時間（分） */
  max_work_minutes: number;
}

// ================================
// 勤務パターン詳細型
// ================================

/**
 * 勤務パターン詳細情報（リレーション含む）
 */
export interface WorkTypeDetail extends WorkType {
  /** 会社情報 */
  company: {
    id: UUID;
    name: string;
    code: string;
  };
  /** 利用ユーザー数 */
  user_count: number;
  /** 勤務時間計算情報 */
  calculation_info: WorkTimeCalculation;
  /** フレックス制約（フレックス勤務の場合） */
  flex_constraints?: FlexWorkConstraints;
  /** 統計情報 */
  statistics: {
    /** 平均勤務時間（分） */
    average_work_minutes: number;
    /** 平均残業時間（分） */
    average_overtime_minutes: number;
    /** 利用率（%） */
    usage_rate: number;
  };
}

// ================================
// 検索・フィルター型
// ================================

/**
 * 雇用形態検索条件
 */
export interface EmploymentTypeSearchCriteria {
  /** 会社ID */
  company_id?: UUID;
  /** 検索キーワード */
  keyword?: string;
  /** 有効フラグ */
  is_active?: boolean;
}

/**
 * 勤務パターン検索条件
 */
export interface WorkTypeSearchCriteria {
  /** 会社ID */
  company_id?: UUID;
  /** 検索キーワード */
  keyword?: string;
  /** フレックス勤務フラグ */
  is_flexible?: boolean;
  /** 有効フラグ */
  is_active?: boolean;
}

/**
 * 休暇種別検索条件
 */
export interface LeaveTypeSearchCriteria {
  /** 会社ID */
  company_id?: UUID;
  /** 検索キーワード */
  keyword?: string;
  /** 有給休暇フラグ */
  is_paid?: boolean;
  /** 有効フラグ */
  is_active?: boolean;
}
