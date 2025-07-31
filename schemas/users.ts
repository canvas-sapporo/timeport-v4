import { z } from 'zod';

// ================================
// ユーザー関連スキーマ
// ================================

/**
 * ユーザープロフィールスキーマ
 */
export const UserProfileSchema = z.object({
  id: z.string().uuid(),
  code: z.string(),
  family_name: z.string(),
  first_name: z.string(),
  family_name_kana: z.string(),
  first_name_kana: z.string(),
  email: z.string().email(),
  phone: z.string().optional(),
  role: z.enum(['system-admin', 'admin', 'member']),
  employment_type_id: z.string().uuid().optional(),
  current_work_type_id: z.string().uuid().optional(),
  is_active: z.boolean(),
  chat_send_key_shift_enter: z.boolean(),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
  deleted_at: z.string().datetime().optional(),
});

/**
 * ユーザー作成入力スキーマ
 */
export const CreateUserProfileInputSchema = z.object({
  code: z.string().min(1, 'ユーザーコードは必須です'),
  family_name: z.string().min(1, '姓は必須です'),
  first_name: z.string().min(1, '名は必須です'),
  family_name_kana: z.string().min(1, '姓（カナ）は必須です'),
  first_name_kana: z.string().min(1, '名（カナ）は必須です'),
  email: z.string().email('有効なメールアドレスを入力してください'),
  phone: z.string().optional(),
  role: z.enum(['admin', 'member']),
  employment_type_id: z.string().uuid().optional(),
  current_work_type_id: z.string().uuid().optional(),
  group_ids: z.array(z.string().uuid()),
});

/**
 * ユーザー更新入力スキーマ
 */
export const UpdateUserProfileInputSchema = z.object({
  code: z.string().min(1, 'ユーザーコードは必須です').optional(),
  family_name: z.string().min(1, '姓は必須です').optional(),
  first_name: z.string().min(1, '名は必須です').optional(),
  family_name_kana: z.string().min(1, '姓（カナ）は必須です').optional(),
  first_name_kana: z.string().min(1, '名（カナ）は必須です').optional(),
  email: z.string().email('有効なメールアドレスを入力してください').optional(),
  phone: z.string().optional(),
  role: z.enum(['admin', 'member']).optional(),
  employment_type_id: z.string().uuid().optional(),
  current_work_type_id: z.string().uuid().optional(),
  group_ids: z.array(z.string().uuid()).optional(),
  is_active: z.boolean().optional(),
});

/**
 * ユーザー検索パラメータスキーマ
 */
export const UserSearchParamsSchema = z.object({
  company_id: z.string().uuid().optional(),
  search: z.string().optional(),
  role: z.enum(['admin', 'member']).optional(),
  is_active: z.boolean().optional(),
  group_id: z.string().uuid().optional(),
  page: z.number().int().min(1).optional(),
  limit: z.number().int().min(1).max(100).optional(),
});

/**
 * 承認者スキーマ
 */
export const ApproverSchema = z.object({
  id: z.string().uuid(),
  first_name: z.string(),
  family_name: z.string(),
  email: z.string().email(),
  role: z.enum(['system-admin', 'admin', 'member']),
});

/**
 * ユーザー作成結果スキーマ
 */
export const CreateUserResultSchema = z.object({
  success: z.boolean(),
  data: UserProfileSchema.optional(),
  error: z.string().optional(),
});

/**
 * ユーザー更新結果スキーマ
 */
export const UpdateUserResultSchema = z.object({
  success: z.boolean(),
  data: UserProfileSchema.optional(),
  error: z.string().optional(),
});

/**
 * ユーザー削除結果スキーマ
 */
export const DeleteUserResultSchema = z.object({
  success: z.boolean(),
  error: z.string().optional(),
});

/**
 * ユーザー一覧レスポンススキーマ
 */
export const UserListResponseSchema = z.object({
  success: z.boolean(),
  data: z.array(z.any()).default([]),
  total: z.number().int().min(0).default(0),
  error: z.union([z.string(), z.any()]).optional(),
});

/**
 * ユーザー詳細レスポンススキーマ
 */
export const UserDetailResponseSchema = z.object({
  success: z.boolean(),
  data: z.any().optional(),
  error: z.union([z.string(), z.any()]).optional(),
});

/**
 * 承認者一覧レスポンススキーマ
 */
export const ApproverListResponseSchema = z.object({
  success: z.boolean(),
  data: z.array(ApproverSchema).default([]),
  error: z.string().optional(),
});

/**
 * ユーザー統計スキーマ
 */
export const UserStatsSchema = z.object({
  total_users: z.number().int().min(0),
  active_users: z.number().int().min(0),
  inactive_users: z.number().int().min(0),
  admin_users: z.number().int().min(0),
  member_users: z.number().int().min(0),
  by_group: z.record(z.string(), z.number().int().min(0)),
  by_employment_type: z.record(z.string(), z.number().int().min(0)),
});

// ユーザー関連
export type UserProfileData = z.infer<typeof UserProfileSchema>;
export type CreateUserProfileInput = z.infer<typeof CreateUserProfileInputSchema>;
export type UpdateUserProfileInput = z.infer<typeof UpdateUserProfileInputSchema>;
export type UserSearchParams = z.infer<typeof UserSearchParamsSchema>;
export type ApproverData = z.infer<typeof ApproverSchema>;
export type CreateUserResult = z.infer<typeof CreateUserResultSchema>;
export type UpdateUserResult = z.infer<typeof UpdateUserResultSchema>;
export type DeleteUserResult = z.infer<typeof DeleteUserResultSchema>;
export type UserListResponse = z.infer<typeof UserListResponseSchema>;
export type UserDetailResponse = z.infer<typeof UserDetailResponseSchema>;
export type ApproverListResponse = z.infer<typeof ApproverListResponseSchema>;
export type UserStats = z.infer<typeof UserStatsSchema>;
