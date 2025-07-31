import { z } from 'zod';

import type { UUID, DateString } from '@/types/common';

// ================================
// 認証関連API型スキーマ
// ================================

/**
 * ログインリクエストスキーマ
 */
export const LoginRequestSchema = z.object({
  email: z.string(),
  password: z.string(),
  remember_me: z.boolean().optional(),
});

/**
 * ログインレスポンススキーマ
 */
export const LoginResponseSchema = z.object({
  success: z.boolean(),
  data: z
    .object({
      user: z.record(z.unknown()),
      access_token: z.string(),
      refresh_token: z.string(),
      expires_in: z.number(),
    })
    .optional(),
  error: z
    .object({
      message: z.string(),
      code: z.string().optional(),
    })
    .optional(),
});

/**
 * リフレッシュトークンリクエストスキーマ
 */
export const RefreshTokenRequestSchema = z.object({
  refresh_token: z.string(),
});

/**
 * ログアウトリクエストスキーマ
 */
export const LogoutRequestSchema = z.object({
  access_token: z.string(),
});

// ================================
// ユーザー関連API型スキーマ
// ================================

/**
 * ユーザー取得パラメータスキーマ
 */
export const GetUsersParamsSchema = z.object({
  role: z.enum(['system-admin', 'admin', 'member']).optional(),
  group_id: z.string().uuid().optional(),
  is_active: z.boolean().optional(),
  employment_type_id: z.string().uuid().optional(),
  page: z.number().optional(),
  limit: z.number().optional(),
  search: z.string().optional(),
  sort_by: z.string().optional(),
  sort_order: z.enum(['asc', 'desc']).optional(),
  include: z.array(z.string()).optional(),
  exclude: z.array(z.string()).optional(),
});

/**
 * ユーザー作成リクエストスキーマ
 */
export const CreateUserRequestSchema = z.object({
  code: z.string().optional(),
  first_name: z.string(),
  family_name: z.string(),
  email: z.string(),
  role: z.enum(['system-admin', 'admin', 'member']),
  primary_group_id: z.string().uuid().optional(),
  employment_type_id: z.string().uuid().optional(),
  work_start_date: z.string().optional(),
  password: z.string(),
});

/**
 * ユーザー更新リクエストスキーマ
 */
export const UpdateUserRequestSchema = z.object({
  code: z.string().optional(),
  first_name: z.string().optional(),
  family_name: z.string().optional(),
  email: z.string().optional(),
  role: z.enum(['system-admin', 'admin', 'member']).optional(),
  primary_group_id: z.string().uuid().optional(),
  employment_type_id: z.string().uuid().optional(),
  work_start_date: z.string().optional(),
  work_end_date: z.string().optional(),
  is_active: z.boolean().optional(),
});

/**
 * ユーザープロフィールレスポンススキーマ
 */
export const UserProfileResponseSchema = z.object({
  success: z.boolean(),
  data: z
    .object({
      id: z.string().uuid(),
      code: z.string().optional(),
      first_name: z.string(),
      family_name: z.string(),
      email: z.string(),
      role: z.string(),
      is_active: z.boolean(),
      created_at: z.string(),
      updated_at: z.string(),
      primary_group: z
        .object({
          id: z.string().uuid(),
          name: z.string(),
        })
        .optional(),
      employment_type: z
        .object({
          id: z.string().uuid(),
          name: z.string(),
        })
        .optional(),
    })
    .optional(),
  error: z
    .object({
      message: z.string(),
      code: z.string().optional(),
    })
    .optional(),
});

// 認証関連API型
export type LoginRequest = z.infer<typeof LoginRequestSchema>;
export type LoginResponse = z.infer<typeof LoginResponseSchema>;
export type RefreshTokenRequest = z.infer<typeof RefreshTokenRequestSchema>;
export type LogoutRequest = z.infer<typeof LogoutRequestSchema>;

// ユーザー関連API型
export type GetUsersParams = z.infer<typeof GetUsersParamsSchema>;
export type CreateUserRequest = z.infer<typeof CreateUserRequestSchema>;
export type UpdateUserRequest = z.infer<typeof UpdateUserRequestSchema>;
export type UserProfileResponse = z.infer<typeof UserProfileResponseSchema>;
