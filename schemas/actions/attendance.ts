import { z } from 'zod';

// ================================
// 勤怠関連スキーマ
// ================================

/**
 * 打刻結果スキーマ
 */
export const ClockResultSchema = z.object({
  success: z.boolean(),
  message: z.string(),
  attendance: z.record(z.unknown()).optional(),
  error: z.string().optional(),
});

/**
 * 勤怠更新データスキーマ
 */
export const AttendanceUpdateDataSchema = z.object({
  work_type_id: z.string().optional(),
  clock_records: z.array(z.record(z.unknown())).optional(),
  actual_work_minutes: z.number().optional(),
  overtime_minutes: z.number().optional(),
  late_minutes: z.number().optional(),
  early_leave_minutes: z.number().optional(),
  status: z.enum(['normal', 'late', 'early_leave', 'absent']).optional(),
  auto_calculated: z.boolean().optional(),
  description: z.string().optional(),
  approved_by: z.string().optional(),
  approved_at: z.string().optional(),
});

/**
 * 勤怠編集結果スキーマ
 */
export const AttendanceEditResultSchema = z.object({
  success: z.boolean(),
  message: z.string(),
  attendance: z.record(z.unknown()).optional(),
  error: z.string().optional(),
});

/**
 * 勤怠ステータス作成データスキーマ
 */
export const AttendanceStatusCreateDataSchema = z.object({
  name: z.string(),
  display_name: z.string(),
  color: z.string(),
  font_color: z.string(),
  background_color: z.string(),
  sort_order: z.number(),
  logic: z.string().optional(),
  description: z.string().optional(),
});

/**
 * 勤怠ステータス更新データスキーマ
 */
export const AttendanceStatusUpdateDataSchema = z.object({
  display_name: z.string().optional(),
  color: z.string().optional(),
  font_color: z.string().optional(),
  background_color: z.string().optional(),
  sort_order: z.number().optional(),
  is_active: z.boolean().optional(),
  logic: z.string().optional(),
  description: z.string().optional(),
});

// 勤怠関連型
export type ClockResult = z.infer<typeof ClockResultSchema>;
export type AttendanceUpdateData = z.infer<typeof AttendanceUpdateDataSchema>;
export type AttendanceEditResult = z.infer<typeof AttendanceEditResultSchema>;
export type AttendanceStatusCreateData = z.infer<typeof AttendanceStatusCreateDataSchema>;
export type AttendanceStatusUpdateData = z.infer<typeof AttendanceStatusUpdateDataSchema>;
