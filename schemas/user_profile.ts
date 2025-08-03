import { z } from 'zod';

import type { UUID } from '@/types/common';

// ================================
// ユーザープロフィール関連スキーマ
// ================================

/**
 * 企業情報スキーマ
 */
export const CompanyInfoSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  code: z.string().optional(),
  address: z.string().optional(),
  phone: z.string().optional(),
  is_active: z.boolean(),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
});

/**
 * チャット送信キー設定スキーマ
 */
export const ChatSendKeySettingSchema = z.object({
  chat_send_key_shift_enter: z.boolean(),
});

/**
 * ユーザー設定スキーマ
 */
export const UserSettingsSchema = z.object({
  chat_send_key_shift_enter: z.boolean(),
});

/**
 * ユーザープロフィール取得結果スキーマ
 */
export const GetUserProfileResultSchema = z.object({
  success: z.boolean(),
  data: z.any().optional(),
  error: z.string().optional(),
});

/**
 * ユーザーグループ取得結果スキーマ
 */
export const GetUserGroupsResultSchema = z.object({
  success: z.boolean(),
  data: z.array(z.any()).optional(),
  error: z.string().optional(),
});

/**
 * 企業情報取得結果スキーマ
 */
export const GetCompanyInfoResultSchema = z.object({
  success: z.boolean(),
  data: CompanyInfoSchema.optional(),
  error: z.string().optional(),
});

/**
 * チャット送信キー設定取得結果スキーマ
 */
export const GetChatSendKeySettingResultSchema = z.object({
  success: z.boolean(),
  data: z.boolean().optional(),
  error: z.string().optional(),
});

/**
 * チャット送信キー設定更新結果スキーマ
 */
export const UpdateChatSendKeySettingResultSchema = z.object({
  success: z.boolean(),
  message: z.string(),
  error: z.string().optional(),
});

/**
 * ユーザー設定取得結果スキーマ
 */
export const GetUserSettingsResultSchema2 = z.object({
  success: z.boolean(),
  data: UserSettingsSchema.optional(),
  error: z.string().optional(),
});

// ================================
// ユーザープロフィール関連スキーマ（追加）
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
 * ユーザー作成用入力スキーマ
 */
export const CreateUserProfileInputSchema = z.object({
  code: z.string(),
  family_name: z.string(),
  first_name: z.string(),
  family_name_kana: z.string(),
  first_name_kana: z.string(),
  email: z.string().email(),
  phone: z.string().optional(),
  role: z.enum(['admin', 'member']),
  employment_type_id: z.string().uuid().optional(),
  current_work_type_id: z.string().uuid().optional(),
  group_ids: z.array(z.string().uuid()),
});

/**
 * ユーザー更新用入力スキーマ
 */
export const UpdateUserProfileInputSchema = z.object({
  code: z.string().optional(),
  family_name: z.string().optional(),
  first_name: z.string().optional(),
  family_name_kana: z.string().optional(),
  first_name_kana: z.string().optional(),
  email: z.string().email().optional(),
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
  limit: z.number().int().min(1).optional(),
});

/**
 * ユーザーの企業情報スキーマ
 */
export const UserCompanyInfoSchema = z.object({
  company_id: z.string().uuid(),
  company_name: z.string(),
  company_code: z.string(),
  group_id: z.string().uuid(),
  group_name: z.string(),
});

/**
 * ユーザーの企業ID取得結果スキーマ
 */
export const GetUserCompanyResultSchema = z.object({
  success: z.boolean(),
  company_info: UserCompanyInfoSchema.optional(),
  error: z.string().optional(),
});

// ================================
// ユーザープロフィール関連インターフェース
// ================================

/**
 * ユーザーIDから企業IDを取得する関数の型定義
 * 実装は lib/utils/user.ts に配置
 */
export type GetUserCompanyFunction = (userId: UUID) => Promise<GetUserCompanyResult>;

/**
 * ユーザーIDから企業IDを取得する関数（同期版）
 * 実装は lib/utils/user.ts に配置
 */
export type GetUserCompanySyncFunction = (userId: UUID) => GetUserCompanyResult | null;

// ユーザープロフィール関連
export type CompanyInfo = z.infer<typeof CompanyInfoSchema>;
export type ChatSendKeySetting = z.infer<typeof ChatSendKeySettingSchema>;
export type UserSettings = z.infer<typeof UserSettingsSchema>;
export type GetUserProfileResult = z.infer<typeof GetUserProfileResultSchema>;
export type GetUserGroupsResult = z.infer<typeof GetUserGroupsResultSchema>;
export type GetCompanyInfoResult = z.infer<typeof GetCompanyInfoResultSchema>;
export type GetChatSendKeySettingResult = z.infer<typeof GetChatSendKeySettingResultSchema>;
export type UpdateChatSendKeySettingResult = z.infer<typeof UpdateChatSendKeySettingResultSchema>;
export type GetUserSettingsResult2 = z.infer<typeof GetUserSettingsResultSchema2>;

// ユーザープロフィール関連（追加）
export type UserProfile = z.infer<typeof UserProfileSchema>;
export type CreateUserProfileInput = z.infer<typeof CreateUserProfileInputSchema>;
export type UpdateUserProfileInput = z.infer<typeof UpdateUserProfileInputSchema>;
export type UserSearchParams = z.infer<typeof UserSearchParamsSchema>;
export type UserCompanyInfo = z.infer<typeof UserCompanyInfoSchema>;
export type GetUserCompanyResult = z.infer<typeof GetUserCompanyResultSchema>;
