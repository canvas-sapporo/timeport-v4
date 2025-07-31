import { z } from 'zod';

import type { BaseEntity, UUID, UpdateInput } from '@/types/common';

// ================================
// グループ関連スキーマ
// ================================

/**
 * グループ作成用入力スキーマ
 */
export const CreateGroupInputSchema = z.object({
  company_id: z.string().uuid(),
  parent_group_id: z.string().uuid().optional(),
  code: z.string().optional(),
  name: z.string(),
  description: z.string().optional(),
  is_active: z.boolean().optional(),
});

/**
 * グループ更新用入力スキーマ
 */
export const UpdateGroupInputSchema = z.object({
  parent_group_id: z.string().uuid().optional(),
  code: z.string().optional(),
  name: z.string().optional(),
  description: z.string().optional(),
  is_active: z.boolean().optional(),
});

/**
 * グループ作成フォームスキーマ
 */
export const CreateGroupFormSchema = z.object({
  name: z
    .string()
    .min(1, 'グループ名は必須です')
    .max(100, 'グループ名は100文字以内で入力してください'),
  code: z
    .string()
    .max(50, 'グループコードは50文字以内で入力してください')
    .regex(/^[A-Z0-9_-]*$/, 'グループコードは英数字、ハイフン、アンダースコアのみ使用可能です')
    .optional(),
  description: z.string().max(500, '説明は500文字以内で入力してください').optional(),
});

/**
 * グループ編集フォームスキーマ
 */
export const EditGroupFormSchema = z.object({
  name: z
    .string()
    .min(1, 'グループ名は必須です')
    .max(100, 'グループ名は100文字以内で入力してください'),
  code: z
    .string()
    .max(50, 'グループコードは50文字以内で入力してください')
    .regex(/^[A-Z0-9_-]*$/, 'グループコードは英数字、ハイフン、アンダースコアのみ使用可能です')
    .optional(),
  description: z.string().max(500, '説明は500文字以内で入力してください').optional(),
});

/**
 * グループ検索パラメータスキーマ
 */
export const GroupSearchParamsSchema = z.object({
  page: z.number().int().min(1).optional().default(1),
  limit: z.number().int().min(1).max(100).optional().default(10),
  search: z.string().optional(),
  company_id: z.string().uuid().optional(),
});

/**
 * グループエンティティスキーマ
 */
export const GroupSchema = z.object({
  id: z.string().uuid(),
  company_id: z.string().uuid(),
  parent_group_id: z.string().uuid().optional(),
  code: z.string().optional(),
  name: z.string(),
  description: z.string().optional(),
  is_active: z.boolean(),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
  deleted_at: z.string().datetime().optional(),
});

/**
 * グループ作成結果スキーマ
 */
export const CreateGroupResultSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  code: z.string().optional(),
  description: z.string().optional(),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
});

/**
 * グループ更新結果スキーマ
 */
export const UpdateGroupResultSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  code: z.string().optional(),
  description: z.string().optional(),
  updated_at: z.string().datetime(),
});

/**
 * グループ削除結果スキーマ
 */
export const DeleteGroupResultSchema = z.object({
  id: z.string().uuid(),
  deleted_at: z.string().datetime(),
});

/**
 * グループ一覧レスポンススキーマ
 */
export const GroupListResponseSchema = z.object({
  groups: z.array(GroupSchema),
  total: z.number().int().min(0),
  page: z.number().int().min(1),
  limit: z.number().int().min(1),
});

/**
 * グループ統計スキーマ
 */
export const GroupStatsSchema = z.object({
  total: z.number().int().min(0),
  active: z.number().int().min(0),
  inactive: z.number().int().min(0),
});

/**
 * グループステータス切り替え結果スキーマ
 */
export const ToggleGroupStatusResultSchema = z.object({
  id: z.string().uuid(),
  is_active: z.boolean(),
});

/**
 * グループ削除安全性チェック結果スキーマ
 */
export const GroupDeletionSafetyResultSchema = z.object({
  canDelete: z.boolean(),
  affectedUsers: z.array(
    z.object({
      id: z.string().uuid(),
      full_name: z.string(),
      email: z.string(),
    })
  ),
});

/**
 * グループバリデーション結果スキーマ
 */
export const GroupValidationResultSchema = z.object({
  isValid: z.boolean(),
  errors: z.array(
    z.object({
      field: z.string(),
      message: z.string(),
      code: z.string(),
    })
  ),
});

// グループ関連
export type CreateGroupInput = z.infer<typeof CreateGroupInputSchema>;
export type UpdateGroupInput = z.infer<typeof UpdateGroupInputSchema>;
export type CreateGroupFormData = z.infer<typeof CreateGroupFormSchema>;
export type EditGroupFormData = z.infer<typeof EditGroupFormSchema>;
export type GroupSearchParams = z.infer<typeof GroupSearchParamsSchema>;
export type Group = z.infer<typeof GroupSchema>;
export type CreateGroupResult = z.infer<typeof CreateGroupResultSchema>;
export type UpdateGroupResult = z.infer<typeof UpdateGroupResultSchema>;
export type DeleteGroupResult = z.infer<typeof DeleteGroupResultSchema>;
export type GroupListResponse = z.infer<typeof GroupListResponseSchema>;
export type GroupStats = z.infer<typeof GroupStatsSchema>;
export type ToggleGroupStatusResult = z.infer<typeof ToggleGroupStatusResultSchema>;
export type GroupDeletionSafetyResult = z.infer<typeof GroupDeletionSafetyResultSchema>;
export type GroupValidationResult = z.infer<typeof GroupValidationResultSchema>;
