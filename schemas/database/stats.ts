import { z } from 'zod';

import { UUIDSchema } from './base';

// ================================
// 統計・集計関連型
// ================================

/**
 * 月次勤怠統計（詳細版）
 */
export const MonthlyAttendanceStatsViewSchema = z.object({
  /** ユーザーID */
  user_id: UUIDSchema,
  /** 年月 */
  year_month: z.string(),
  /** 勤務日数 */
  work_days: z.number(),
  /** 総勤務時間（分） */
  total_work_minutes: z.number(),
  /** 総残業時間（分） */
  total_overtime_minutes: z.number(),
  /** 遅刻日数 */
  late_days: z.number(),
  /** 早退日数 */
  early_leave_days: z.number(),
  /** 欠勤日数 */
  absent_days: z.number(),
  /** 平均勤務時間（分） */
  average_work_minutes: z.number(),
  /** 平均残業時間（分） */
  average_overtime_minutes: z.number(),
  /** フルネーム */
  full_name: z.string(),
  /** 個人コード */
  code: z.string().optional(),
  /** 主所属グループ名 */
  primary_group_name: z.string().optional(),
});

/**
 * 月次勤怠統計（簡易版）
 */
export const MonthlyAttendanceStatsSchema = z.object({
  /** 勤務日数 */
  work_days: z.number(),
  /** 総勤務時間 */
  total_work_hours: z.number(),
  /** 総残業時間 */
  total_overtime_hours: z.number(),
  /** 遅刻日数 */
  late_days: z.number(),
  /** 欠勤日数 */
  absent_days: z.number(),
  /** 平均勤務時間 */
  average_work_hours: z.number(),
});

/**
 * 申請統計（詳細版）
 */
export const RequestStatisticsViewSchema = z.object({
  /** ユーザーID */
  user_id: UUIDSchema,
  /** 個人コード */
  code: z.string().optional(),
  /** フルネーム */
  full_name: z.string(),
  /** 主所属グループ名 */
  primary_group_name: z.string().optional(),
  /** 申請種別名 */
  request_type_name: z.string(),
  /** 申請カテゴリ */
  request_category: z.string(),
  /** 年月 */
  month: z.string(),
  /** 総申請数 */
  total_requests: z.number(),
  /** 承認待ち申請数 */
  pending_requests: z.number(),
  /** 承認済み申請数 */
  approved_requests: z.number(),
  /** 却下申請数 */
  rejected_requests: z.number(),
  /** 承認率（%） */
  approval_rate: z.number(),
});

/**
 * 申請統計（簡易版）
 */
export const RequestStatisticsSchema = z.object({
  /** ユーザーID */
  user_id: UUIDSchema,
  /** ユーザーコード */
  code: z.string().optional(),
  /** フルネーム */
  full_name: z.string(),
  /** 主グループ名 */
  primary_group_name: z.string().optional(),
  /** 申請種別名 */
  request_type_name: z.string(),
  /** 申請カテゴリ */
  request_category: z.string(),
  /** 月 */
  month: z.string(),
  /** 総申請数 */
  total_requests: z.number(),
  /** 保留中申請数 */
  pending_requests: z.number(),
  /** 承認済み申請数 */
  approved_requests: z.number(),
  /** 却下申請数 */
  rejected_requests: z.number(),
  /** 承認率 */
  approval_rate: z.number(),
});

// ================================
// 型定義のエクスポート
// ================================

export type MonthlyAttendanceStatsView = z.infer<typeof MonthlyAttendanceStatsViewSchema>;
export type RequestStatisticsView = z.infer<typeof RequestStatisticsViewSchema>;
export type MonthlyAttendanceStats = z.infer<typeof MonthlyAttendanceStatsSchema>;
export type RequestStatistics = z.infer<typeof RequestStatisticsSchema>;
