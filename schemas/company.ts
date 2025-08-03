import { z } from 'zod';

import type { BaseEntity, UUID, Timestamp, UpdateInput } from '@/types/common';

// ================================
// 企業関連スキーマ
// ================================

/**
 * 企業スキーマ
 */
export const CompanySchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  code: z.string(),
  address: z.string().optional(),
  phone: z.string().optional(),
  is_active: z.boolean(),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
  deleted_at: z.string().datetime().optional(),
});

/**
 * 企業作成用入力スキーマ
 */
export const CreateCompanyInputSchema = z.object({
  name: z.string(),
  code: z.string(),
  address: z.string().optional(),
  phone: z.string().optional(),
  is_active: z.boolean(),
});

/**
 * 企業更新用入力スキーマ
 */
export const UpdateCompanyInputSchema = z.object({
  name: z.string().optional(),
  code: z.string().optional(),
  address: z.string().optional(),
  phone: z.string().optional(),
  is_active: z.boolean().optional(),
});

/**
 * 企業作成フォームデータスキーマ
 */
export const CreateCompanyFormDataSchema = z.object({
  name: z.string().min(1, '企業名は必須です'),
  code: z.string().min(1, 'コードは必須です'),
  address: z.string(),
  phone: z.string(),
  is_active: z.boolean(),
  group_name: z.string().min(1, '初期グループ名は必須です'),
  admin_code: z.string().min(1, '管理者コードは必須です'),
  admin_family_name: z.string().min(1, '管理者姓は必須です'),
  admin_first_name: z.string().min(1, '管理者名は必須です'),
  admin_family_name_kana: z.string().min(1, '管理者姓カナは必須です'),
  admin_first_name_kana: z.string().min(1, '管理者名カナは必須です'),
  admin_email: z.string().email('有効なメールアドレスを入力してください'),
  admin_password: z.string().min(8, 'パスワードは8文字以上で入力してください'),
});

/**
 * 企業編集フォームデータスキーマ
 */
export const UpdateCompanyFormDataSchema = z.object({
  name: z.string().min(1, '企業名は必須です'),
  code: z.string().min(1, 'コードは必須です'),
  address: z.string(),
  phone: z.string(),
  is_active: z.boolean(),
});

/**
 * 企業検索パラメータスキーマ
 */
export const CompanySearchParamsSchema = z.object({
  search: z.string().optional(),
  status: z.enum(['all', 'active', 'inactive']).optional(),
  page: z.number().int().min(1).optional(),
  limit: z.number().int().min(1).max(100).optional(),
  orderBy: z.string().optional(),
  ascending: z.boolean().optional(),
});

/**
 * 企業作成結果スキーマ
 */
export const CreateCompanyResultSchema = z.object({
  company: CompanySchema,
  groupId: z.string().uuid(),
  adminUserId: z.string().uuid(),
});

/**
 * 企業更新結果スキーマ
 */
export const UpdateCompanyResultSchema = z.object({
  company: CompanySchema,
  updatedFields: z.array(z.string()),
});

/**
 * 企業削除結果スキーマ
 */
export const DeleteCompanyResultSchema = z.object({
  companyId: z.string().uuid(),
  deletedAt: z.string().datetime(),
});

/**
 * 企業一覧レスポンススキーマ
 */
export const CompanyListResponseSchema = z.object({
  companies: z.array(CompanySchema),
  total: z.number().int().min(0),
  activeCount: z.number().int().min(0),
  deletedCount: z.number().int().min(0),
  pagination: z.object({
    page: z.number().int().min(1),
    limit: z.number().int().min(1),
    totalPages: z.number().int().min(0),
    hasMore: z.boolean(),
    hasPrevious: z.boolean(),
  }),
});

/**
 * 企業統計スキーマ
 */
export const CompanyStatsSchema = z.object({
  total: z.number().int().min(0),
  active: z.number().int().min(0),
  inactive: z.number().int().min(0),
  deleted: z.number().int().min(0),
  createdThisMonth: z.number().int().min(0),
  updatedThisMonth: z.number().int().min(0),
});

/**
 * 企業バリデーション結果スキーマ
 */
export const CompanyValidationResultSchema = z.object({
  isValid: z.boolean(),
  errors: z.array(
    z.object({
      field: z.string(),
      message: z.string(),
      code: z.string(),
    })
  ),
});

/**
 * 企業バリデーションエラースキーマ
 */
export const CompanyValidationErrorSchema = z.object({
  field: z.string(),
  message: z.string(),
  code: z.string(),
});

// 企業関連
export type Company = z.infer<typeof CompanySchema>;
export type CreateCompanyInput = z.infer<typeof CreateCompanyInputSchema>;
export type UpdateCompanyInput = z.infer<typeof UpdateCompanyInputSchema>;
export type CreateCompanyFormData = z.infer<typeof CreateCompanyFormDataSchema>;
export type EditCompanyFormData = z.infer<typeof UpdateCompanyFormDataSchema>;
export type CompanySearchParams = z.infer<typeof CompanySearchParamsSchema>;
export type CreateCompanyResult = z.infer<typeof CreateCompanyResultSchema>;
export type UpdateCompanyResult = z.infer<typeof UpdateCompanyResultSchema>;
export type DeleteCompanyResult = z.infer<typeof DeleteCompanyResultSchema>;
export type CompanyListResponse = z.infer<typeof CompanyListResponseSchema>;
export type CompanyStats = z.infer<typeof CompanyStatsSchema>;
export type CompanyValidationResult = z.infer<typeof CompanyValidationResultSchema>;
export type CompanyValidationError = z.infer<typeof CompanyValidationErrorSchema>;
