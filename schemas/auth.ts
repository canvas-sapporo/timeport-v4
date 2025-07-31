import { z } from 'zod';

// ================================
// 認証関連スキーマ
// ================================

/**
 * ユーザーロールスキーマ
 */
export const UserRoleSchema = z.enum(['system-admin', 'admin', 'member']);

/**
 * 認証ユーザースキーマ
 */
export const AuthUserSchema = z.object({
  id: z.string().uuid(),
  employee_id: z.string().optional(),
  full_name: z.string(),
  email: z.string().email(),
  role: UserRoleSchema,
  primary_group_id: z.string().uuid().optional(),
  company_id: z.string().uuid().optional(),
});

/**
 * ログイン認証情報スキーマ
 */
export const LoginCredentialsSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
  remember_me: z.boolean().optional(),
});

/**
 * ログイン応答スキーマ
 */
export const LoginResponseSchema = z.object({
  user: AuthUserSchema,
  access_token: z.string(),
  refresh_token: z.string(),
  expires_in: z.number().int().min(0),
});

/**
 * パスワードリセット要求スキーマ
 */
export const PasswordResetRequestSchema = z.object({
  email: z.string().email(),
});

/**
 * パスワード変更要求スキーマ
 */
export const PasswordChangeRequestSchema = z.object({
  current_password: z.string().min(1),
  new_password: z.string().min(1),
  confirm_password: z.string().min(1),
});

/**
 * 権限チェック結果スキーマ
 */
export const PermissionCheckSchema = z.object({
  allowed: z.boolean(),
  reason: z.string().optional(),
  required_role: UserRoleSchema.optional(),
});

/**
 * リソース権限スキーマ
 */
export const ResourcePermissionSchema = z.object({
  resource_type: z.string(),
  resource_id: z.string().uuid().optional(),
  action: z.enum(['create', 'read', 'update', 'delete']),
  allowed: z.boolean(),
});

/**
 * ユーザーセッションスキーマ
 */
export const UserSessionSchema = z.object({
  session_id: z.string(),
  user_id: z.string().uuid(),
  user: AuthUserSchema,
  started_at: z.string().datetime(),
  last_accessed_at: z.string().datetime(),
  expires_at: z.string().datetime(),
  ip_address: z.string().optional(),
  user_agent: z.string().optional(),
});

/**
 * フルネームヘルパースキーマ
 */
export const FullNameHelperSchema = z.object({
  western_style: z.string(),
  japanese_style: z.string(),
  display_name: z.string(),
});

/**
 * ユーザープロフィール詳細スキーマ
 */
export const UserProfileDetailSchema = z.object({
  id: z.string().uuid(),
  code: z.string().optional(),
  first_name: z.string(),
  family_name: z.string(),
  email: z.string().email(),
  role: UserRoleSchema,
  primary_group_id: z.string().uuid().optional(),
  employment_type_id: z.string().uuid().optional(),
  work_start_date: z.string().optional(),
  work_end_date: z.string().optional(),
  is_active: z.boolean(),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
  deleted_at: z.string().datetime().optional(),
  full_name: FullNameHelperSchema,
  primary_group: z
    .object({
      id: z.string().uuid(),
      name: z.string(),
      path: z.string(),
    })
    .optional(),
  employment_type: z
    .object({
      id: z.string().uuid(),
      name: z.string(),
      code: z.string().optional(),
    })
    .optional(),
  groups: z
    .array(
      z.object({
        id: z.string().uuid(),
        name: z.string(),
        role: z.string().optional(),
      })
    )
    .optional(),
});

/**
 * 認証設定スキーマ
 */
export const AuthSettingsSchema = z.object({
  session_timeout_minutes: z.number().int().min(1),
  password_min_length: z.number().int().min(1),
  password_require_complexity: z.boolean(),
  mfa_enabled: z.boolean(),
  max_login_attempts: z.number().int().min(1),
  account_lockout_minutes: z.number().int().min(0),
});

/**
 * ログインアクション結果スキーマ
 */
export const LoginActionResultSchema = z.object({
  error: z.string().optional(),
  user: AuthUserSchema.optional(),
});

// 認証関連
export type UserRole = z.infer<typeof UserRoleSchema>;
export type AuthUser = z.infer<typeof AuthUserSchema>;
export type LoginCredentials = z.infer<typeof LoginCredentialsSchema>;
export type LoginResponse = z.infer<typeof LoginResponseSchema>;
export type PasswordResetRequest = z.infer<typeof PasswordResetRequestSchema>;
export type PasswordChangeRequest = z.infer<typeof PasswordChangeRequestSchema>;
export type PermissionCheck = z.infer<typeof PermissionCheckSchema>;
export type ResourcePermission = z.infer<typeof ResourcePermissionSchema>;
export type UserSession = z.infer<typeof UserSessionSchema>;
export type FullNameHelper = z.infer<typeof FullNameHelperSchema>;
export type UserProfileDetail = z.infer<typeof UserProfileDetailSchema>;
export type AuthSettings = z.infer<typeof AuthSettingsSchema>;
export type LoginActionResult = z.infer<typeof LoginActionResultSchema>;
