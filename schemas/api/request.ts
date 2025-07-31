import { z } from 'zod';

import type { UUID, DateString } from '@/types/common';

// ================================
// 申請関連API型スキーマ
// ================================

/**
 * 申請取得パラメータスキーマ
 */
export const GetRequestsParamsSchema = z.object({
  user_id: z.string().uuid().optional(),
  request_type_id: z.string().uuid().optional(),
  status: z.enum(['pending', 'approved', 'rejected']).optional(),
  category: z.string().optional(),
  start_date: z.string().optional(),
  end_date: z.string().optional(),
  page: z.number().optional(),
  limit: z.number().optional(),
  search: z.string().optional(),
  sort_by: z.string().optional(),
  sort_order: z.enum(['asc', 'desc']).optional(),
  include: z.array(z.string()).optional(),
  exclude: z.array(z.string()).optional(),
});

/**
 * 申請作成リクエストスキーマ
 */
export const CreateRequestRequestSchema = z.object({
  request_type_id: z.string().uuid(),
  title: z.string(),
  form_data: z.record(z.unknown()),
  target_date: z.string().optional(),
  start_date: z.string().optional(),
  end_date: z.string().optional(),
  days_count: z.number().optional(),
  submission_comment: z.string().optional(),
});

/**
 * 申請ステータス更新リクエストスキーマ
 */
export const UpdateRequestStatusRequestSchema = z.object({
  status: z.enum(['approved', 'rejected']),
  approver_comment: z.string().optional(),
  rejection_reason: z.string().optional(),
});

/**
 * 申請レスポンススキーマ
 */
export const RequestResponseSchema = z.object({
  success: z.boolean(),
  data: z
    .object({
      id: z.string().uuid(),
      user_id: z.string().uuid(),
      request_type_id: z.string().uuid(),
      title: z.string(),
      form_data: z.record(z.unknown()),
      status: z.string(),
      target_date: z.string().optional(),
      start_date: z.string().optional(),
      end_date: z.string().optional(),
      days_count: z.number().optional(),
      submission_comment: z.string().optional(),
      approver_comment: z.string().optional(),
      rejection_reason: z.string().optional(),
      created_at: z.string(),
      updated_at: z.string(),
      request_type: z.record(z.unknown()),
      applicant: z.object({
        id: z.string().uuid(),
        full_name: z.string(),
        code: z.string().optional(),
      }),
      approver: z
        .object({
          id: z.string().uuid(),
          full_name: z.string(),
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

// ================================
// 申請種別関連API型スキーマ
// ================================

/**
 * 申請種別取得パラメータスキーマ
 */
export const GetRequestTypesParamsSchema = z.object({
  category: z.string().optional(),
  is_active: z.boolean().optional(),
  page: z.number().optional(),
  limit: z.number().optional(),
  search: z.string().optional(),
  sort_by: z.string().optional(),
  sort_order: z.enum(['asc', 'desc']).optional(),
  include: z.array(z.string()).optional(),
  exclude: z.array(z.string()).optional(),
});

/**
 * 申請種別作成リクエストスキーマ
 */
export const CreateRequestTypeRequestSchema = z.object({
  code: z.string(),
  name: z.string(),
  description: z.string().optional(),
  category: z.string(),
  form_config: z.array(z.record(z.unknown())),
  approval_flow: z.array(z.record(z.unknown())),
  is_active: z.boolean().optional(),
});

/**
 * 申請種別更新リクエストスキーマ
 */
export const UpdateRequestTypeRequestSchema = z.object({
  code: z.string().optional(),
  name: z.string().optional(),
  description: z.string().optional(),
  category: z.string().optional(),
  form_config: z.array(z.record(z.unknown())).optional(),
  approval_flow: z.array(z.record(z.unknown())).optional(),
  is_active: z.boolean().optional(),
});

// 申請関連API型
export type GetRequestsParams = z.infer<typeof GetRequestsParamsSchema>;
export type CreateRequestRequest = z.infer<typeof CreateRequestRequestSchema>;
export type UpdateRequestStatusRequest = z.infer<typeof UpdateRequestStatusRequestSchema>;
export type RequestResponse = z.infer<typeof RequestResponseSchema>;

// 申請種別関連API型
export type GetRequestTypesParams = z.infer<typeof GetRequestTypesParamsSchema>;
export type CreateRequestTypeRequest = z.infer<typeof CreateRequestTypeRequestSchema>;
export type UpdateRequestTypeRequest = z.infer<typeof UpdateRequestTypeRequestSchema>;
