import { z } from 'zod';

import type { UUID, Timestamp } from '@/types/common';

// ================================
// 設定関連スキーマ
// ================================

/**
 * 設定タイプスキーマ
 */
export const SettingTypeSchema = z.enum(['csv_export', 'attendance', 'notification']);

/**
 * CSVエクスポート設定スキーマ
 */
export const CsvExportSettingSchema = z.object({
  name: z.string(),
  period: z.object({
    type: z.literal('date_range'),
    start_date: z.string().nullable(),
    end_date: z.string().nullable(),
  }),
  columns: z.array(z.string()),
  format: z.object({
    encoding: z.enum(['UTF-8', 'Shift_JIS']),
    delimiter: z.enum(['comma', 'tab']),
    date_format: z.string(),
    time_format: z.string(),
    empty_value: z.enum(['blank', '--']),
  }),
});

/**
 * 勤怠設定スキーマ
 */
export const AttendanceSettingSchema = z.object({
  late_threshold_minutes: z.number().int().min(0),
  early_leave_threshold_minutes: z.number().int().min(0),
  work_hours_per_day: z.number().min(0),
  overtime_threshold_minutes: z.number().int().min(0),
});

/**
 * 通知設定スキーマ
 */
export const NotificationSettingSchema = z.object({
  email_notifications: z.boolean(),
  push_notifications: z.boolean(),
  notification_types: z.array(z.string()),
});

/**
 * 設定値スキーマ
 */
export const SettingValueSchema = z.union([
  CsvExportSettingSchema,
  AttendanceSettingSchema,
  NotificationSettingSchema,
]);

/**
 * 設定スキーマ
 */
export const SettingSchema = z.object({
  id: z.string().uuid(),
  role: z.enum(['system-admin', 'admin', 'member']),
  user_id: z.string().uuid().optional(),
  setting_type: z.string(),
  setting_key: z.string(),
  setting_value: SettingValueSchema,
  is_default: z.boolean(),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
  deleted_at: z.string().datetime().optional(),
});

/**
 * 設定取得結果スキーマ
 */
export const GetSettingResultSchema = z.object({
  success: z.boolean(),
  data: SettingSchema.optional(),
  error: z.string().optional(),
});

/**
 * 設定保存結果スキーマ
 */
export const SaveSettingResultSchema = z.object({
  success: z.boolean(),
  message: z.string(),
  error: z.string().optional(),
});

/**
 * 設定削除結果スキーマ
 */
export const DeleteSettingResultSchema = z.object({
  success: z.boolean(),
  error: z.string().optional(),
});

/**
 * 設定一覧取得結果スキーマ
 */
export const GetUserSettingsResultSchema = z.object({
  success: z.boolean(),
  data: z.array(SettingSchema).optional(),
  error: z.string().optional(),
});

// ================================
// 設定関連インターフェース
// ================================

/**
 * 設定エンティティ
 */
export interface Setting {
  id: UUID;
  role: 'system-admin' | 'admin' | 'member';
  user_id?: UUID;
  setting_type: string;
  setting_key: string;
  setting_value: CsvExportSetting | AttendanceSetting | NotificationSetting;
  is_default: boolean;
  created_at: Timestamp;
  updated_at: Timestamp;
  deleted_at?: Timestamp;
}

/**
 * 設定値
 */
export interface SettingValue {
  csv_export: CsvExportSetting;
  attendance: AttendanceSetting;
  notification: NotificationSetting;
}

// 設定関連
export type SettingType = z.infer<typeof SettingTypeSchema>;
export type CsvExportSetting = z.infer<typeof CsvExportSettingSchema>;
export type AttendanceSetting = z.infer<typeof AttendanceSettingSchema>;
export type NotificationSetting = z.infer<typeof NotificationSettingSchema>;
export type SettingValueUnion = z.infer<typeof SettingValueSchema>;
export type SettingData = z.infer<typeof SettingSchema>;
export type GetSettingResult = z.infer<typeof GetSettingResultSchema>;
export type SaveSettingResult = z.infer<typeof SaveSettingResultSchema>;
export type DeleteSettingResult = z.infer<typeof DeleteSettingResultSchema>;
export type GetUserSettingsResult = z.infer<typeof GetUserSettingsResultSchema>;
