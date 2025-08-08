import { z } from 'zod';

import { ObjectMetadataSchema } from './request';

// ================================
// 申請フォーム関連スキーマ
// ================================

/**
 * 申請フォームスキーマ
 */
export const RequestFormSchema = z.object({
  name: z.string().min(1, '申請フォーム名は必須です'),
  description: z.string().optional(),
  category: z.string().min(1, 'カテゴリは必須です'),
  form_config: z.array(z.any()).default([]),
  approval_flow: z.array(z.any()).default([]),
  is_active: z.boolean().default(true),
  object_config: ObjectMetadataSchema.optional(),
});

/**
 * 申請フォーム作成結果スキーマ
 */
export const CreateRequestFormResultSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  description: z.string().optional(),
  category: z.string(),
  created_at: z.string().datetime(),
});

/**
 * 申請フォーム更新結果スキーマ
 */
export const UpdateRequestFormResultSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  description: z.string().optional(),
  category: z.string(),
  updated_at: z.string().datetime(),
});

/**
 * 申請フォーム削除結果スキーマ
 */
export const DeleteRequestFormResultSchema = z.object({
  id: z.string().uuid(),
  deleted_at: z.string().datetime(),
});

/**
 * 申請フォーム一覧レスポンススキーマ
 */
export const RequestFormListResponseSchema = z.object({
  forms: z.array(z.any()),
  total: z.number().int().min(0),
});

/**
 * 申請フォーム詳細スキーマ
 */
export const RequestFormDetailSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  description: z.string().optional(),
  category: z.string(),
  form_config: z.array(z.any()),
  approval_flow: z.array(z.any()),
  is_active: z.boolean(),
  object_config: ObjectMetadataSchema.optional(),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
});

// 申請フォーム関連
export type RequestFormData = z.infer<typeof RequestFormSchema>;
export type CreateRequestFormResult = z.infer<typeof CreateRequestFormResultSchema>;
export type UpdateRequestFormResult = z.infer<typeof UpdateRequestFormResultSchema>;
export type DeleteRequestFormResult = z.infer<typeof DeleteRequestFormResultSchema>;
export type RequestFormListResponse = z.infer<typeof RequestFormListResponseSchema>;
export type RequestFormDetail = z.infer<typeof RequestFormDetailSchema>;
