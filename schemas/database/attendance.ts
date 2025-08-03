import { z } from 'zod';

import {
  BaseEntitySchema,
  UUIDSchema,
  DateStringSchema,
  TimeStringSchema,
  TimestampSchema,
} from './base';

// ================================
// 勤務時間・スケジュール関連型
// ================================

/**
 * 勤務形態
 */
export const WorkTypeSchema = BaseEntitySchema.extend({
  /** 企業ID */
  company_id: UUIDSchema,
  /** 勤務形態コード */
  code: z.string().optional(),
  /** 勤務形態名 */
  name: z.string(),
  /** 勤務開始時刻 */
  work_start_time: TimeStringSchema,
  /** 勤務終了時刻 */
  work_end_time: TimeStringSchema,
  /** 休憩時間（分） */
  break_duration_minutes: z.number(),
  /** フレックスタイムフラグ */
  is_flexible: z.boolean(),
  /** フレックス開始時刻 */
  flex_start_time: TimeStringSchema.optional(),
  /** フレックス終了時刻 */
  flex_end_time: TimeStringSchema.optional(),
  /** コアタイム開始時刻 */
  core_start_time: TimeStringSchema.optional(),
  /** コアタイム終了時刻 */
  core_end_time: TimeStringSchema.optional(),
  /** 残業閾値（分） */
  overtime_threshold_minutes: z.number(),
  /** 説明 */
  description: z.string().optional(),
  /** 有効フラグ */
  is_active: z.boolean(),
  /** 表示順序 */
  display_order: z.number(),
});

/**
 * 休暇種別
 */
export const LeaveTypeSchema = BaseEntitySchema.extend({
  /** 企業ID */
  company_id: UUIDSchema,
  /** 休暇種別コード */
  code: z.string().optional(),
  /** 休暇種別名 */
  name: z.string(),
  /** 説明 */
  description: z.string().optional(),
  /** 年間最大日数 */
  max_days_per_year: z.number().optional(),
  /** 設定 */
  settings: z.record(z.unknown()),
  /** 有効フラグ */
  is_active: z.boolean(),
  /** 表示順序 */
  display_order: z.number(),
});

/**
 * ユーザー勤務形態
 */
export const UserWorkTypeSchema = BaseEntitySchema.extend({
  /** ユーザーID */
  user_id: UUIDSchema,
  /** 勤務形態ID */
  work_type_id: UUIDSchema,
  /** 適用開始日 */
  effective_from: DateStringSchema,
  /** 適用終了日 */
  effective_to: DateStringSchema.optional(),
});

/**
 * 休憩記録
 */
export const BreakRecordSchema = z.object({
  /** 開始時刻 */
  start: TimeStringSchema,
  /** 終了時刻 */
  end: TimeStringSchema,
});

/**
 * 勤怠
 */
export const AttendanceSchema = BaseEntitySchema.extend({
  /** ユーザーID */
  user_id: UUIDSchema,
  /** 勤務日 */
  work_date: DateStringSchema,
  /** 勤務形態ID */
  work_type_id: UUIDSchema.optional(),
  /** 出勤時刻 */
  clock_in_time: TimestampSchema.optional(),
  /** 退勤時刻 */
  clock_out_time: TimestampSchema.optional(),
  /** 休憩記録 */
  break_records: z.array(BreakRecordSchema),
  /** 実際勤務時間（分） */
  actual_work_minutes: z.number().optional(),
  /** 残業時間（分） */
  overtime_minutes: z.number(),
  /** 遅刻時間（分） */
  late_minutes: z.number(),
  /** 早退時間（分） */
  early_leave_minutes: z.number(),
  /** ステータス */
  status: z.enum(['normal', 'late', 'early_leave', 'absent']),
  /** 勤怠ステータスID */
  attendance_status_id: UUIDSchema.optional(),
  /** 自動計算フラグ */
  auto_calculated: z.boolean(),
  /** 説明 */
  description: z.string().optional(),
  /** 承認者ID */
  approved_by: UUIDSchema.optional(),
  /** 承認日時 */
  approved_at: TimestampSchema.optional(),
});

/**
 * 勤怠ステータス
 */
export const AttendanceStatusSchema = BaseEntitySchema.extend({
  /** 企業ID */
  company_id: UUIDSchema,
  /** ステータス名 */
  name: z.string(),
  /** 表示名 */
  display_name: z.string(),
  /** 色 */
  color: z.string(),
  /** フォント色 */
  font_color: z.string(),
  /** 背景色 */
  background_color: z.string(),
  /** ソート順序 */
  sort_order: z.number(),
  /** 有効フラグ */
  is_active: z.boolean(),
  /** 必須フラグ */
  is_required: z.boolean(),
  /** ロジック */
  logic: z.string().optional(),
  /** 説明 */
  description: z.string().optional(),
});

// ================================
// 型定義のエクスポート
// ================================

export type WorkType = z.infer<typeof WorkTypeSchema>;
export type LeaveType = z.infer<typeof LeaveTypeSchema>;
export type UserWorkType = z.infer<typeof UserWorkTypeSchema>;
export type BreakRecord = z.infer<typeof BreakRecordSchema>;
export type Attendance = z.infer<typeof AttendanceSchema>;
export type AttendanceStatus = z.infer<typeof AttendanceStatusSchema>;
