import { z } from 'zod';

import { UUIDSchema, TimestampSchema, DateStringSchema, TimeStringSchema } from './base';
import { BreakRecordSchema } from './attendance';

// ================================
// Supabase Database型定義
// ================================

/**
 * データベーステーブル型定義
 */
export const DatabaseTablesSchema = z.object({
  companies: z.any(), // Company
  groups: z.any(), // Group
  user_groups: z.any(), // UserGroup
  employment_types: z.any(), // EmploymentType
  user_profiles: z.any(), // UserProfile
  work_types: z.any(), // WorkType
  leave_types: z.any(), // LeaveType
  user_work_types: z.any(), // UserWorkType
  attendances: z.any(), // Attendance
  request_statuses: z.any(), // RequestStatus
  request_forms: z.any(), // RequestForm
  requests: z.any(), // Request
  forms: z.any(), // Form
  validations: z.any(), // Validation
  features: z.any(), // Feature
  notifications: z.any(), // Notification
  audit_logs: z.any(), // AuditLog
});

/**
 * データベースビュー型定義
 */
export const DatabaseViewsSchema = z.object({
  user_details: z.any(), // UserDetailView
  attendance_details: z.any(), // AttendanceDetailView
  request_details: z.any(), // RequestDetailView
});

/**
 * データベース関数型定義
 */
export const DatabaseFunctionsSchema = z.object({
  calculate_work_minutes: z.object({
    Args: z.object({
      clock_in_time: TimestampSchema,
      clock_out_time: TimestampSchema,
      break_records: z.array(BreakRecordSchema).optional(),
    }),
    Returns: z.number(),
  }),
  calculate_overtime_minutes: z.object({
    Args: z.object({
      actual_work_minutes: z.number(),
      overtime_threshold_minutes: z.number().optional(),
    }),
    Returns: z.number(),
  }),
  calculate_monthly_stats: z.object({
    Args: z.object({
      target_user_id: UUIDSchema,
      target_month: DateStringSchema,
    }),
    Returns: z.array(z.any()), // MonthlyAttendanceStats[]
  }),
});

/**
 * Supabase Database型定義
 */
export const DatabaseSchema = z.object({
  public: z.object({
    Tables: z.record(
      z.object({
        Row: z.any(),
        Insert: z.any(),
        Update: z.any(),
      })
    ),
    Views: z.record(
      z.object({
        Row: z.any(),
      })
    ),
    Functions: DatabaseFunctionsSchema,
  }),
});

// ================================
// 型定義のエクスポート
// ================================

export type DatabaseTables = z.infer<typeof DatabaseTablesSchema>;
export type DatabaseViews = z.infer<typeof DatabaseViewsSchema>;
export type DatabaseFunctions = z.infer<typeof DatabaseFunctionsSchema>;
export type Database = z.infer<typeof DatabaseSchema>;
