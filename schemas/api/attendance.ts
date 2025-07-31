import { z } from 'zod';

import type { UUID, DateString, Timestamp } from '@/types/common';

// ================================
// 勤怠関連API型スキーマ
// ================================

/**
 * 勤怠取得パラメータスキーマ
 */
export const GetAttendanceParamsSchema = z.object({
  user_id: z.string().uuid().optional(),
  start_date: z.string().optional(),
  end_date: z.string().optional(),
  status: z.enum(['normal', 'late', 'early_leave', 'absent']).optional(),
  work_type_id: z.string().uuid().optional(),
  page: z.number().optional(),
  limit: z.number().optional(),
  search: z.string().optional(),
  sort_by: z.string().optional(),
  sort_order: z.enum(['asc', 'desc']).optional(),
  include: z.array(z.string()).optional(),
  exclude: z.array(z.string()).optional(),
});

/**
 * 出勤リクエストスキーマ
 */
export const ClockInRequestSchema = z.object({
  user_id: z.string().uuid(),
  work_type_id: z.string().uuid().optional(),
  clock_in_time: z.string().optional(),
  notes: z.string().optional(),
});

/**
 * 退勤リクエストスキーマ
 */
export const ClockOutRequestSchema = z.object({
  user_id: z.string().uuid(),
  clock_out_time: z.string().optional(),
  notes: z.string().optional(),
});

/**
 * 休憩リクエストスキーマ
 */
export const BreakRequestSchema = z.object({
  user_id: z.string().uuid(),
  break_time: z.string(),
  break_type: z.enum(['start', 'end']),
});

/**
 * 勤怠レスポンススキーマ
 */
export const AttendanceResponseSchema = z.object({
  success: z.boolean(),
  data: z
    .object({
      id: z.string().uuid(),
      user_id: z.string().uuid(),
      date: z.string(),
      clock_records: z.array(z.record(z.unknown())),
      actual_work_minutes: z.number().optional(),
      overtime_minutes: z.number().optional(),
      late_minutes: z.number().optional(),
      early_leave_minutes: z.number().optional(),
      status: z.string().optional(),
      work_type: z
        .object({
          id: z.string().uuid(),
          name: z.string(),
          work_start_time: z.string(),
          work_end_time: z.string(),
        })
        .optional(),
    })
    .optional(),
  error: z
    .object({
      message: z.string(),
      code: z.string().optional(),
    })
    .optional(),
});

/**
 * 月次統計レスポンススキーマ
 */
export const MonthlyStatsResponseSchema = z.object({
  success: z.boolean(),
  data: z.record(z.unknown()).optional(),
  error: z
    .object({
      message: z.string(),
      code: z.string().optional(),
    })
    .optional(),
});

// 勤怠関連API型
export type GetAttendanceParams = z.infer<typeof GetAttendanceParamsSchema>;
export type ClockInRequest = z.infer<typeof ClockInRequestSchema>;
export type ClockOutRequest = z.infer<typeof ClockOutRequestSchema>;
export type BreakRequest = z.infer<typeof BreakRequestSchema>;
export type AttendanceResponse = z.infer<typeof AttendanceResponseSchema>;
export type MonthlyStatsResponse = z.infer<typeof MonthlyStatsResponseSchema>;
