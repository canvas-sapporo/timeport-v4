import { z } from 'zod';

// ================================
// 勤務形態関連スキーマ
// ================================

/**
 * 勤務形態設定スキーマ
 */
export const WorkTypeSettingsSchema = z.object({
  allow_overtime: z.boolean().optional(),
  max_overtime_hours: z.number().int().min(0).optional(),
  night_work_allowance: z.boolean().optional(),
  holiday_work_allowance: z.boolean().optional(),
  special_break_times: z.array(z.string()).optional(),
  flexible_work_days: z.array(z.string()).optional(),
  custom_rules: z.record(z.string(), z.unknown()).optional(),
});

/**
 * 勤務形態スキーマ
 */
export const WorkTypeSchema = z.object({
  id: z.string().uuid(),
  company_id: z.string().uuid(),
  code: z.string().optional(),
  name: z.string(),
  work_start_time: z.string(),
  work_end_time: z.string(),
  break_duration_minutes: z.number().int().min(0),
  is_flexible: z.boolean(),
  flex_start_time: z.string().optional(),
  flex_end_time: z.string().optional(),
  core_start_time: z.string().optional(),
  core_end_time: z.string().optional(),
  overtime_threshold_minutes: z.number().int().min(0),
  late_threshold_minutes: z.number().int().min(0),
  description: z.string().optional(),
  settings: WorkTypeSettingsSchema,
  is_active: z.boolean(),
  display_order: z.number().int().min(0),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
  deleted_at: z.string().datetime().optional(),
});

/**
 * 勤務形態作成フォームデータスキーマ
 */
export const CreateWorkTypeFormDataSchema = z.object({
  code: z.string().min(1, '勤務形態コードは必須です'),
  name: z.string().min(1, '勤務形態名は必須です'),
  work_start_time: z.string().min(1, '勤務開始時刻は必須です'),
  work_end_time: z.string().min(1, '勤務終了時刻は必須です'),
  break_duration_minutes: z.number().int().min(0),
  is_flexible: z.boolean(),
  flex_start_time: z.string().optional(),
  flex_end_time: z.string().optional(),
  core_start_time: z.string().optional(),
  core_end_time: z.string().optional(),
  overtime_threshold_minutes: z.number().int().min(0),
  late_threshold_minutes: z.number().int().min(0),
  description: z.string(),
});

/**
 * 勤務形態編集フォームデータスキーマ
 */
export const EditWorkTypeFormDataSchema = z.object({
  code: z.string().min(1, '勤務形態コードは必須です'),
  name: z.string().min(1, '勤務形態名は必須です'),
  work_start_time: z.string().min(1, '勤務開始時刻は必須です'),
  work_end_time: z.string().min(1, '勤務終了時刻は必須です'),
  break_duration_minutes: z.number().int().min(0),
  is_flexible: z.boolean(),
  flex_start_time: z.string().optional(),
  flex_end_time: z.string().optional(),
  core_start_time: z.string().optional(),
  core_end_time: z.string().optional(),
  overtime_threshold_minutes: z.number().int().min(0),
  late_threshold_minutes: z.number().int().min(0),
  description: z.string(),
});

/**
 * 勤務形態検索パラメータスキーマ
 */
export const WorkTypeSearchParamsSchema = z.object({
  search: z.string().optional(),
  is_flexible: z.boolean().optional(),
  status: z.enum(['all', 'active', 'inactive']).optional(),
  page: z.number().int().min(1).optional(),
  limit: z.number().int().min(1).max(100).optional(),
  orderBy: z.string().optional(),
  ascending: z.boolean().optional(),
});

/**
 * 勤務形態作成結果スキーマ
 */
export const CreateWorkTypeResultSchema = z.object({
  id: z.string().uuid(),
  code: z.string(),
  name: z.string(),
  work_start_time: z.string(),
  work_end_time: z.string(),
  break_duration_minutes: z.number().int().min(0),
  is_flexible: z.boolean(),
  created_at: z.string().datetime(),
});

/**
 * 勤務形態更新結果スキーマ
 */
export const UpdateWorkTypeResultSchema = z.object({
  id: z.string().uuid(),
  code: z.string(),
  name: z.string(),
  work_start_time: z.string(),
  work_end_time: z.string(),
  break_duration_minutes: z.number().int().min(0),
  is_flexible: z.boolean(),
  updated_at: z.string().datetime(),
});

/**
 * 勤務形態削除結果スキーマ
 */
export const DeleteWorkTypeResultSchema = z.object({
  id: z.string().uuid(),
  deleted_at: z.string().datetime(),
});

/**
 * 勤務形態一覧レスポンススキーマ
 */
export const WorkTypeListResponseSchema = z.object({
  work_types: z.array(WorkTypeSchema),
  total: z.number().int().min(0),
  page: z.number().int().min(1),
  limit: z.number().int().min(1),
});

/**
 * 勤務形態統計スキーマ
 */
export const WorkTypeStatsSchema = z.object({
  total: z.number().int().min(0),
  active: z.number().int().min(0),
  inactive: z.number().int().min(0),
  flexible: z.number().int().min(0),
});

/**
 * 勤務形態バリデーション結果スキーマ
 */
export const WorkTypeValidationResultSchema = z.object({
  isValid: z.boolean(),
  errors: z.array(
    z.object({
      field: z.string(),
      message: z.string(),
      code: z.string(),
    })
  ),
});

// 勤務形態関連
export type WorkTypeSettings = z.infer<typeof WorkTypeSettingsSchema>;
export type WorkTypeData = z.infer<typeof WorkTypeSchema>;
export type CreateWorkTypeFormData = z.infer<typeof CreateWorkTypeFormDataSchema>;
export type EditWorkTypeFormData = z.infer<typeof EditWorkTypeFormDataSchema>;
export type WorkTypeSearchParams = z.infer<typeof WorkTypeSearchParamsSchema>;
export type CreateWorkTypeResult = z.infer<typeof CreateWorkTypeResultSchema>;
export type UpdateWorkTypeResult = z.infer<typeof UpdateWorkTypeResultSchema>;
export type DeleteWorkTypeResult = z.infer<typeof DeleteWorkTypeResultSchema>;
export type WorkTypeListResponse = z.infer<typeof WorkTypeListResponseSchema>;
export type WorkTypeStats = z.infer<typeof WorkTypeStatsSchema>;
export type WorkTypeValidationResult = z.infer<typeof WorkTypeValidationResultSchema>;
