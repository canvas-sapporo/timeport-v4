import { z } from 'zod';

import type { UUID, Timestamp } from '@/types/common';

// ================================
// ダッシュボード関連API型スキーマ
// ================================

/**
 * ダッシュボード統計レスポンススキーマ
 */
export const DashboardStatsResponseSchema = z.object({
  success: z.boolean(),
  data: z
    .object({
      user_stats: z
        .object({
          total_users: z.number(),
          active_users: z.number(),
          new_users_this_month: z.number(),
        })
        .optional(),
      attendance_stats: z
        .object({
          today_attendance: z.number(),
          monthly_work_days: z.number(),
          monthly_overtime_hours: z.number(),
          late_arrivals_this_month: z.number(),
        })
        .optional(),
      request_stats: z
        .object({
          pending_requests: z.number(),
          approved_requests_this_month: z.number(),
          rejected_requests_this_month: z.number(),
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
 * 最近のアクティビティレスポンススキーマ
 */
export const RecentActivityResponseSchema = z.object({
  success: z.boolean(),
  data: z
    .array(
      z.object({
        id: z.string().uuid(),
        type: z.string(),
        title: z.string(),
        description: z.string().optional(),
        timestamp: z.string(),
        user: z
          .object({
            id: z.string().uuid(),
            full_name: z.string(),
          })
          .optional(),
      })
    )
    .optional(),
  error: z
    .object({
      message: z.string(),
      code: z.string().optional(),
    })
    .optional(),
});

// ダッシュボード関連API型
export type DashboardStatsResponse = z.infer<typeof DashboardStatsResponseSchema>;
export type RecentActivityResponse = z.infer<typeof RecentActivityResponseSchema>;
