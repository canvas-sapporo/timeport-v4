import { z } from 'zod';

import type {
  BaseEntity,
  UUID,
  DateString,
  TimeString,
  Settings,
  UpdateInput,
} from '@/types/common';

// ================================
// 雇用形態関連スキーマ
// ================================

/**
 * 雇用形態作成用入力スキーマ
 */
export const CreateEmploymentTypeInputSchema = z.object({
  company_id: z.string().uuid(),
  code: z.string().optional(),
  name: z.string(),
  description: z.string().optional(),
  is_active: z.boolean().optional(),
  display_order: z.number().int().min(0).optional(),
});

/**
 * 雇用形態更新用入力スキーマ
 */
export const UpdateEmploymentTypeInputSchema = z.object({
  code: z.string().optional(),
  name: z.string().optional(),
  description: z.string().optional(),
  is_active: z.boolean().optional(),
  display_order: z.number().int().min(0).optional(),
});

/**
 * 雇用形態作成フォームスキーマ
 */
export const CreateEmploymentTypeFormSchema = z.object({
  code: z
    .string()
    .min(1, '雇用形態コードは必須です')
    .max(50, '雇用形態コードは50文字以内で入力してください')
    .regex(/^[A-Z0-9_-]+$/, '雇用形態コードは英数字、ハイフン、アンダースコアのみ使用可能です'),
  name: z
    .string()
    .min(1, '雇用形態名は必須です')
    .max(100, '雇用形態名は100文字以内で入力してください'),
  description: z.string().max(500, '説明は500文字以内で入力してください').optional().default(''),
});

/**
 * 雇用形態編集フォームスキーマ
 */
export const EditEmploymentTypeFormSchema = z.object({
  code: z
    .string()
    .min(1, '雇用形態コードは必須です')
    .max(50, '雇用形態コードは50文字以内で入力してください')
    .regex(/^[A-Z0-9_-]+$/, '雇用形態コードは英数字、ハイフン、アンダースコアのみ使用可能です'),
  name: z
    .string()
    .min(1, '雇用形態名は必須です')
    .max(100, '雇用形態名は100文字以内で入力してください'),
  description: z.string().max(500, '説明は500文字以内で入力してください').optional().default(''),
});

/**
 * 雇用形態検索パラメータスキーマ
 */
export const EmploymentTypeSearchParamsSchema = z.object({
  search: z.string().optional(),
  status: z.enum(['all', 'active', 'inactive']).optional().default('all'),
  page: z.number().int().min(1).optional().default(1),
  limit: z.number().int().min(1).max(100).optional().default(10),
  orderBy: z.string().optional(),
  ascending: z.boolean().optional().default(true),
});

/**
 * 雇用形態エンティティスキーマ
 */
export const EmploymentTypeSchema = z.object({
  id: z.string().uuid(),
  company_id: z.string().uuid(),
  code: z.string().optional(),
  name: z.string(),
  description: z.string().optional(),
  is_active: z.boolean(),
  display_order: z.number().int().min(0),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime().optional(),
  deleted_at: z.string().datetime().optional(),
});

/**
 * 雇用形態作成結果スキーマ
 */
export const CreateEmploymentTypeResultSchema = z.object({
  id: z.string().uuid(),
  code: z.string(),
  name: z.string(),
  description: z.string(),
  created_at: z.string().datetime(),
});

/**
 * 雇用形態更新結果スキーマ
 */
export const UpdateEmploymentTypeResultSchema = z.object({
  id: z.string().uuid(),
  code: z.string(),
  name: z.string(),
  description: z.string(),
  updated_at: z.string().datetime(),
});

/**
 * 雇用形態削除結果スキーマ
 */
export const DeleteEmploymentTypeResultSchema = z.object({
  id: z.string().uuid(),
  deleted_at: z.string().datetime(),
});

/**
 * 雇用形態一覧レスポンススキーマ
 */
export const EmploymentTypeListResponseSchema = z.object({
  employment_types: z.array(EmploymentTypeSchema),
  total: z.number().int().min(0),
  page: z.number().int().min(1),
  limit: z.number().int().min(1),
});

/**
 * 雇用形態統計スキーマ
 */
export const EmploymentTypeStatsSchema = z.object({
  total: z.number().int().min(0),
  active: z.number().int().min(0),
  inactive: z.number().int().min(0),
});

/**
 * 雇用形態ステータス切り替え結果スキーマ
 */
export const ToggleEmploymentTypeStatusResultSchema = z.object({
  id: z.string().uuid(),
  is_active: z.boolean(),
});

/**
 * 雇用形態バリデーション結果スキーマ
 */
export const EmploymentTypeValidationResultSchema = z.object({
  isValid: z.boolean(),
  errors: z.array(
    z.object({
      field: z.string(),
      message: z.string(),
      code: z.string(),
    })
  ),
});

// ================================
// 勤務パターン関連スキーマ
// ================================

/**
 * 勤務形態設定スキーマ
 */
export const WorkTypeSettingsSchema = z.object({
  allow_overtime: z.boolean().optional(),
  max_overtime_hours: z.number().optional(),
  night_work_allowance: z.boolean().optional(),
  holiday_work_allowance: z.boolean().optional(),
  special_break_times: z.array(z.string()).optional(),
  flexible_work_days: z.array(z.string()).optional(),
  custom_rules: z.record(z.unknown()).optional(),
});

/**
 * 勤務パターンエンティティスキーマ
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
  updated_at: z.string().datetime().optional(),
  deleted_at: z.string().datetime().optional(),
});

/**
 * 勤務パターン作成用入力スキーマ
 */
export const CreateWorkTypeInputSchema = z.object({
  company_id: z.string().uuid(),
  code: z.string().optional(),
  name: z.string(),
  work_start_time: z.string(),
  work_end_time: z.string(),
  break_duration_minutes: z.number().int().min(0).optional(),
  is_flexible: z.boolean().optional(),
  flex_start_time: z.string().optional(),
  flex_end_time: z.string().optional(),
  core_start_time: z.string().optional(),
  core_end_time: z.string().optional(),
  overtime_threshold_minutes: z.number().int().min(0).optional(),
  description: z.string().optional(),
  settings: WorkTypeSettingsSchema.optional(),
  is_active: z.boolean().optional(),
  display_order: z.number().int().min(0).optional(),
});

/**
 * 勤務パターン更新用入力スキーマ
 */
export const UpdateWorkTypeInputSchema = z.object({
  code: z.string().optional(),
  name: z.string().optional(),
  work_start_time: z.string().optional(),
  work_end_time: z.string().optional(),
  break_duration_minutes: z.number().int().min(0).optional(),
  is_flexible: z.boolean().optional(),
  flex_start_time: z.string().optional(),
  flex_end_time: z.string().optional(),
  core_start_time: z.string().optional(),
  core_end_time: z.string().optional(),
  overtime_threshold_minutes: z.number().int().min(0).optional(),
  description: z.string().optional(),
  settings: WorkTypeSettingsSchema.optional(),
  is_active: z.boolean().optional(),
  display_order: z.number().int().min(0).optional(),
});

/**
 * 勤務形態作成用フォームデータスキーマ
 */
export const CreateWorkTypeFormDataSchema = z.object({
  code: z.string().min(1, '勤務形態コードは必須です'),
  name: z.string().min(1, '勤務形態名は必須です'),
  work_start_time: z.string().min(1, '勤務開始時刻は必須です'),
  work_end_time: z.string().min(1, '勤務終了時刻は必須です'),
  break_duration_minutes: z.number().int().min(0, '休憩時間は0分以上で入力してください'),
  is_flexible: z.boolean(),
  flex_start_time: z.string().optional(),
  flex_end_time: z.string().optional(),
  core_start_time: z.string().optional(),
  core_end_time: z.string().optional(),
  overtime_threshold_minutes: z.number().int().min(0, '残業開始閾値は0分以上で入力してください'),
  late_threshold_minutes: z.number().int().min(0, '遅刻許容時間は0分以上で入力してください'),
  description: z.string().max(500, '説明は500文字以内で入力してください').optional().default(''),
});

/**
 * 勤務形態編集用フォームデータスキーマ
 */
export const EditWorkTypeFormDataSchema = z.object({
  code: z.string().min(1, '勤務形態コードは必須です'),
  name: z.string().min(1, '勤務形態名は必須です'),
  work_start_time: z.string().min(1, '勤務開始時刻は必須です'),
  work_end_time: z.string().min(1, '勤務終了時刻は必須です'),
  break_duration_minutes: z.number().int().min(0, '休憩時間は0分以上で入力してください'),
  is_flexible: z.boolean(),
  flex_start_time: z.string().optional(),
  flex_end_time: z.string().optional(),
  core_start_time: z.string().optional(),
  core_end_time: z.string().optional(),
  overtime_threshold_minutes: z.number().int().min(0, '残業開始閾値は0分以上で入力してください'),
  late_threshold_minutes: z.number().int().min(0, '遅刻許容時間は0分以上で入力してください'),
  description: z.string().max(500, '説明は500文字以内で入力してください').optional().default(''),
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

// ================================
// 型エクスポート
// ================================

// 雇用形態関連
export type CreateEmploymentTypeInput = z.infer<typeof CreateEmploymentTypeInputSchema>;
export type UpdateEmploymentTypeInput = z.infer<typeof UpdateEmploymentTypeInputSchema>;
export type CreateEmploymentTypeFormData = z.infer<typeof CreateEmploymentTypeFormSchema>;
export type EditEmploymentTypeFormData = z.infer<typeof EditEmploymentTypeFormSchema>;
export type EmploymentTypeSearchParams = z.infer<typeof EmploymentTypeSearchParamsSchema>;
export type EmploymentType = z.infer<typeof EmploymentTypeSchema>;
export type CreateEmploymentTypeResult = z.infer<typeof CreateEmploymentTypeResultSchema>;
export type UpdateEmploymentTypeResult = z.infer<typeof UpdateEmploymentTypeResultSchema>;
export type DeleteEmploymentTypeResult = z.infer<typeof DeleteEmploymentTypeResultSchema>;
export type EmploymentTypeListResponse = z.infer<typeof EmploymentTypeListResponseSchema>;
export type EmploymentTypeStats = z.infer<typeof EmploymentTypeStatsSchema>;
export type ToggleEmploymentTypeStatusResult = z.infer<
  typeof ToggleEmploymentTypeStatusResultSchema
>;
export type EmploymentTypeValidationResult = z.infer<typeof EmploymentTypeValidationResultSchema>;

// 勤務パターン関連
export type WorkTypeSettings = z.infer<typeof WorkTypeSettingsSchema>;
export type WorkType = z.infer<typeof WorkTypeSchema>;
export type CreateWorkTypeInput = z.infer<typeof CreateWorkTypeInputSchema>;
export type UpdateWorkTypeInput = z.infer<typeof UpdateWorkTypeInputSchema>;
export type CreateWorkTypeFormData = z.infer<typeof CreateWorkTypeFormDataSchema>;
export type EditWorkTypeFormData = z.infer<typeof EditWorkTypeFormDataSchema>;
export type WorkTypeSearchParams = z.infer<typeof WorkTypeSearchParamsSchema>;
export type CreateWorkTypeResult = z.infer<typeof CreateWorkTypeResultSchema>;
export type UpdateWorkTypeResult = z.infer<typeof UpdateWorkTypeResultSchema>;
export type DeleteWorkTypeResult = z.infer<typeof DeleteWorkTypeResultSchema>;
export type WorkTypeListResponse = z.infer<typeof WorkTypeListResponseSchema>;
export type WorkTypeStats = z.infer<typeof WorkTypeStatsSchema>;
export type WorkTypeValidationResult = z.infer<typeof WorkTypeValidationResultSchema>;
