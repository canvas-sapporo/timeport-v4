import { z } from 'zod';

// ================================
// 勤怠関連スキーマ
// ================================

/**
 * 勤怠ステータススキーマ
 */
export const AttendanceStatusSchema = z.object({
  id: z.string().uuid(),
  company_id: z.string().uuid(),
  name: z.string(),
  display_name: z.string(),
  color: z.string(),
  font_color: z.string(),
  background_color: z.string(),
  sort_order: z.number().int().min(0),
  is_active: z.boolean(),
  is_required: z.boolean(),
  logic: z.string().optional(),
  description: z.string().optional(),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
  deleted_at: z.string().datetime().optional(),
});

/**
 * 休憩記録スキーマ
 */
export const ClockBreakRecordSchema = z.object({
  break_start: z.string().datetime(),
  break_end: z.string().datetime(),
});

/**
 * 打刻記録スキーマ
 */
export const ClockRecordSchema = z.object({
  in_time: z.string().datetime(),
  out_time: z.string().datetime().optional(),
  breaks: z.array(ClockBreakRecordSchema),
});

/**
 * 勤怠記録スキーマ
 */
export const AttendanceSchema = z.object({
  id: z.string().uuid(),
  user_id: z.string().uuid(),
  work_date: z.string(),
  work_type_id: z.string().uuid().optional(),
  clock_in_time: z.string().datetime().optional(),
  clock_out_time: z.string().datetime().optional(),
  break_records: z.array(ClockBreakRecordSchema),
  clock_records: z.array(ClockRecordSchema),
  actual_work_minutes: z.number().int().min(0).optional(),
  overtime_minutes: z.number().int().min(0),
  late_minutes: z.number().int().min(0),
  early_leave_minutes: z.number().int().min(0),
  status: z.enum(['normal', 'late', 'early_leave', 'absent']),
  attendance_status_id: z.string().uuid().optional(),
  auto_calculated: z.boolean(),
  description: z.string().optional(),
  approved_by: z.string().uuid().optional(),
  approved_at: z.string().datetime().optional(),
  total_break_minutes: z.number().int().min(0).optional(),
  break_count: z.number().int().min(0).optional(),
  approval_status: z.enum(['approved', 'pending']).optional(),
  approver_name: z.string().optional(),
  work_type_name: z.string().optional(),
  user_name: z.string().optional(),
  user_code: z.string().optional(),
  source_id: z.string().uuid().optional(),
  edit_reason: z.string().optional(),
  edited_by: z.string().uuid().optional(),
  has_edit_history: z.boolean().optional(),
  dynamicStatus: z.union([z.string(), AttendanceStatusSchema]).optional(),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
  deleted_at: z.string().datetime().optional(),
});

/**
 * 打刻操作スキーマ
 */
export const ClockOperationSchema = z.object({
  user_id: z.string().uuid(),
  type: z.enum(['clock_in', 'clock_out', 'break_start', 'break_end']),
  timestamp: z.string().datetime(),
  work_type_id: z.string().uuid().optional(),
  location: z
    .object({
      latitude: z.number(),
      longitude: z.number(),
      accuracy: z.number().optional(),
    })
    .optional(),
  note: z.string().optional(),
});

/**
 * 打刻タイプスキーマ
 */
export const ClockTypeSchema = z.enum(['clock_in', 'clock_out', 'break_start', 'break_end']);

/**
 * ステータスロジックスキーマ
 */
export const StatusLogicSchema = z.object({
  conditions: z.array(
    z.object({
      field: z.string(),
      operator: z.enum([
        'equals',
        'not_equals',
        'greater_than',
        'less_than',
        'contains',
        'has_sessions',
        'has_complete_sessions',
        'empty',
      ]),
      value: z.union([z.string(), z.number(), z.boolean()]),
    })
  ),
  logic: z.enum(['AND', 'OR']),
});

/**
 * 打刻結果スキーマ
 */
export const ClockResultSchema = z.object({
  success: z.boolean(),
  message: z.string(),
  attendance: AttendanceSchema.optional(),
  error: z.string().optional(),
  warnings: z.array(z.string()).optional(),
});

/**
 * 勤怠作成入力スキーマ
 */
export const CreateAttendanceInputSchema = z.object({
  user_id: z.string().uuid(),
  work_date: z.string(),
  work_type_id: z.string().uuid().optional(),
  clock_in_time: z.string().datetime().optional(),
  clock_out_time: z.string().datetime().optional(),
  break_records: z.array(ClockBreakRecordSchema).optional(),
  clock_records: z.array(ClockRecordSchema),
  actual_work_minutes: z.number().int().min(0).optional(),
  description: z.string().optional(),
});

/**
 * 勤怠更新入力スキーマ
 */
export const UpdateAttendanceInputSchema = z.object({
  work_type_id: z.string().uuid().optional(),
  clock_in_time: z.string().datetime().optional(),
  clock_out_time: z.string().datetime().optional(),
  break_records: z.array(ClockBreakRecordSchema).optional(),
  clock_records: z.array(ClockRecordSchema).optional(),
  actual_work_minutes: z.number().int().min(0).optional(),
  description: z.string().optional(),
  approved_by: z.string().uuid().optional(),
  approved_at: z.string().datetime().optional(),
});

/**
 * 勤怠編集入力スキーマ
 */
export const EditAttendanceTimeInputSchema = z.object({
  attendance_id: z.string().uuid(),
  clock_records: z.array(ClockRecordSchema),
  edit_reason: z.string(),
  edited_by: z.string().uuid(),
});

/**
 * 勤怠編集履歴スキーマ
 */
export const AttendanceEditHistorySchema = z.object({
  id: z.string().uuid(),
  source_id: z.string().uuid(),
  edited_id: z.string().uuid(),
  edit_reason: z.string(),
  edited_by: z.string().uuid(),
  edited_at: z.string().datetime(),
  original_clock_records: z.array(ClockRecordSchema),
  edited_clock_records: z.array(ClockRecordSchema),
});

/**
 * 勤怠検索条件スキーマ
 */
export const AttendanceSearchCriteriaSchema = z.object({
  user_id: z.string().uuid().optional(),
  group_id: z.string().uuid().optional(),
  start_date: z.string().optional(),
  end_date: z.string().optional(),
  status: z.enum(['normal', 'late', 'early_leave', 'absent']).optional(),
  work_type_id: z.string().uuid().optional(),
  approval_status: z.enum(['pending', 'approved', 'rejected']).optional(),
  has_overtime: z.boolean().optional(),
  has_late: z.boolean().optional(),
});

/**
 * 勤怠統計スキーマ（簡易版）
 */
export const MonthlyAttendanceStatsSchema = z.object({
  year_month: z.string(),
  work_days: z.number().int().min(0),
  total_work_hours: z.number().min(0),
  total_overtime_hours: z.number().min(0),
  late_days: z.number().int().min(0),
  early_leave_days: z.number().int().min(0),
  absent_days: z.number().int().min(0),
  average_work_hours: z.number().min(0),
  average_overtime_hours: z.number().min(0),
  attendance_rate: z.number().min(0).max(100),
});

/**
 * 日次勤怠サマリースキーマ
 */
export const DailyAttendanceSummarySchema = z.object({
  work_date: z.string(),
  clock_in_time: z.string().optional(),
  clock_out_time: z.string().optional(),
  work_hours: z.number().min(0),
  overtime_hours: z.number().min(0),
  status: z.enum(['normal', 'late', 'early_leave', 'absent']),
  break_minutes: z.number().int().min(0),
  notes: z.string().optional(),
});

/**
 * 勤怠集計スキーマ
 */
export const AttendanceAggregationSchema = z.object({
  period_start: z.string(),
  period_end: z.string(),
  total_work_days: z.number().int().min(0),
  total_work_minutes: z.number().int().min(0),
  total_overtime_minutes: z.number().int().min(0),
  total_break_minutes: z.number().int().min(0),
  late_count: z.number().int().min(0),
  early_leave_count: z.number().int().min(0),
  absent_count: z.number().int().min(0),
  average_clock_in_time: z.string().optional(),
  average_clock_out_time: z.string().optional(),
});

/**
 * 勤怠フィルタースキーマ
 */
export const AttendanceFiltersSchema = z.object({
  dateRange: z.object({
    startDate: z.string().nullable(),
    endDate: z.string().nullable(),
  }),
  status: z.array(z.string()),
  hasOvertime: z.boolean().nullable(),
  workTypeId: z.string().nullable(),
  approvalStatus: z.enum(['pending', 'approved', 'rejected']).nullable(),
  userId: z.string().nullable(),
  groupId: z.string().nullable(),
});

/**
 * 勤怠詳細スキーマ
 */
export const AttendanceDetailSchema = AttendanceSchema.extend({
  user: z.object({
    id: z.string().uuid(),
    full_name: z.string(),
    employee_code: z.string().optional(),
  }),
  work_type: z
    .object({
      id: z.string().uuid(),
      name: z.string(),
      work_start_time: z.string(),
      work_end_time: z.string(),
      break_duration_minutes: z.number().int().min(0),
    })
    .optional(),
  approver: z
    .object({
      id: z.string().uuid(),
      full_name: z.string(),
    })
    .optional(),
  calculations: z.object({
    standard_work_minutes: z.number().int().min(0),
    actual_work_minutes: z.number().int().min(0),
    total_break_minutes: z.number().int().min(0),
    overtime_minutes: z.number().int().min(0),
    night_work_minutes: z.number().int().min(0),
  }),
  status_info: z.object({
    status: z.enum(['normal', 'late', 'early_leave', 'absent']),
    late_minutes: z.number().int().min(0),
    early_leave_minutes: z.number().int().min(0),
    warnings: z.array(z.string()),
  }),
});

// 勤怠関連
export type AttendanceStatusData = z.infer<typeof AttendanceStatusSchema>;
export type ClockBreakRecord = z.infer<typeof ClockBreakRecordSchema>;
export type ClockRecord = z.infer<typeof ClockRecordSchema>;
export type AttendanceData = z.infer<typeof AttendanceSchema>;
export type AttendanceFilters = z.infer<typeof AttendanceFiltersSchema>;
export type ClockOperation = z.infer<typeof ClockOperationSchema>;
export type ClockResult = z.infer<typeof ClockResultSchema>;
export type ClockType = z.infer<typeof ClockTypeSchema>;
export type StatusLogic = z.infer<typeof StatusLogicSchema>;
export type CreateAttendanceInput = z.infer<typeof CreateAttendanceInputSchema>;
export type UpdateAttendanceInput = z.infer<typeof UpdateAttendanceInputSchema>;
export type EditAttendanceTimeInput = z.infer<typeof EditAttendanceTimeInputSchema>;
export type AttendanceEditHistory = z.infer<typeof AttendanceEditHistorySchema>;
export type AttendanceSearchCriteria = z.infer<typeof AttendanceSearchCriteriaSchema>;
export type MonthlyAttendanceStats = z.infer<typeof MonthlyAttendanceStatsSchema>;
export type DailyAttendanceSummary = z.infer<typeof DailyAttendanceSummarySchema>;
export type AttendanceAggregation = z.infer<typeof AttendanceAggregationSchema>;
export type AttendanceDetail = z.infer<typeof AttendanceDetailSchema>;
