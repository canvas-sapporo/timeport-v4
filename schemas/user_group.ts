import { z } from 'zod';

import type { UUID, Timestamp } from '@/types/common';

// ================================
// ユーザーグループ関連スキーマ
// ================================

/**
 * ユーザーグループスキーマ
 */
export const UserGroupSchema = z.object({
  id: z.string().uuid(),
  user_id: z.string().uuid(),
  group_id: z.string().uuid(),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
  deleted_at: z.string().datetime().optional(),
});

/**
 * ユーザーグループ作成用入力スキーマ
 */
export const CreateUserGroupInputSchema = z.object({
  user_id: z.string().uuid(),
  group_id: z.string().uuid(),
});

/**
 * ユーザーグループ更新用入力スキーマ
 */
export const UpdateUserGroupInputSchema = z.object({
  user_id: z.string().uuid().optional(),
  group_id: z.string().uuid().optional(),
});

/**
 * ユーザーグループ削除用入力スキーマ
 */
export const DeleteUserGroupInputSchema = z.object({
  user_id: z.string().uuid(),
  group_id: z.string().uuid(),
});

/**
 * ユーザーグループ取得結果スキーマ
 */
export const GetUserGroupsResultSchema = z.object({
  success: z.boolean(),
  data: z.array(UserGroupSchema).optional(),
  error: z.string().optional(),
});

/**
 * ユーザーグループ作成結果スキーマ
 */
export const CreateUserGroupResultSchema = z.object({
  success: z.boolean(),
  message: z.string(),
  data: UserGroupSchema.optional(),
  error: z.string().optional(),
});

/**
 * ユーザーグループ更新結果スキーマ
 */
export const UpdateUserGroupResultSchema = z.object({
  success: z.boolean(),
  message: z.string(),
  data: UserGroupSchema.optional(),
  error: z.string().optional(),
});

/**
 * ユーザーグループ削除結果スキーマ
 */
export const DeleteUserGroupResultSchema = z.object({
  success: z.boolean(),
  message: z.string(),
  error: z.string().optional(),
});

// ユーザーグループ関連
export type UserGroup = z.infer<typeof UserGroupSchema>;
export type CreateUserGroupInput = z.infer<typeof CreateUserGroupInputSchema>;
export type UpdateUserGroupInput = z.infer<typeof UpdateUserGroupInputSchema>;
export type DeleteUserGroupInput = z.infer<typeof DeleteUserGroupInputSchema>;
export type GetUserGroupsResult = z.infer<typeof GetUserGroupsResultSchema>;
export type CreateUserGroupResult = z.infer<typeof CreateUserGroupResultSchema>;
export type UpdateUserGroupResult = z.infer<typeof UpdateUserGroupResultSchema>;
export type DeleteUserGroupResult = z.infer<typeof DeleteUserGroupResultSchema>;
