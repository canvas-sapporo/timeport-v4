import { z } from 'zod';

// ================================
// 認証・認可型スキーマ
// ================================

/**
 * 認証トークンスキーマ
 */
export const AuthTokenSchema = z.object({
  access_token: z.string(),
  refresh_token: z.string().optional(),
  token_type: z.literal('Bearer'),
  expires_in: z.number(),
  expires_at: z.string(),
});

/**
 * 認証ユーザー情報スキーマ
 */
export const AuthUserSchema = z.object({
  id: z.string(),
  email: z.string(),
  role: z.string(),
  permissions: z.array(z.string()),
  company_id: z.string().optional(),
  group_id: z.string().optional(),
});

/**
 * 認証レスポンススキーマ
 */
export const AuthResponseSchema = z.object({
  user: AuthUserSchema,
  token: AuthTokenSchema,
});

/**
 * 権限チェックスキーマ
 */
export const PermissionCheckSchema = z.object({
  resource: z.string(),
  action: z.enum(['create', 'read', 'update', 'delete', 'list']),
  allowed: z.boolean(),
  reason: z.string().optional(),
});

// 認証・認可型
export type AuthToken = z.infer<typeof AuthTokenSchema>;
export type AuthUser = z.infer<typeof AuthUserSchema>;
export type AuthResponse = z.infer<typeof AuthResponseSchema>;
export type PermissionCheck = z.infer<typeof PermissionCheckSchema>;
