import { z } from 'zod';

// ================================
// 認証・ユーザー関連スキーマ
// ================================

/**
 * ログインアクションのレスポンススキーマ
 */
export const LoginResponseSchema = z.object({
  success: z.boolean(),
  error: z.string().optional(),
});

/**
 * ユーザー会社情報スキーマ
 */
export const UserCompanyInfoSchema = z.object({
  company_id: z.string().uuid(),
  company_name: z.string(),
  company_code: z.string(),
  group_id: z.string().uuid(),
  group_name: z.string(),
});

/**
 * 承認者情報スキーマ
 */
export const ApproverInfoSchema = z.object({
  id: z.string(),
  first_name: z.string(),
  family_name: z.string(),
  email: z.string(),
  role: z.string(),
});

// 認証・ユーザー関連型
export type LoginResponse = z.infer<typeof LoginResponseSchema>;
export type UserCompanyInfo = z.infer<typeof UserCompanyInfoSchema>;
export type ApproverInfo = z.infer<typeof ApproverInfoSchema>;
