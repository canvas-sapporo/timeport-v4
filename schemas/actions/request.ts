import { z } from 'zod';

// ================================
// 申請関連スキーマ
// ================================

/**
 * 申請更新データスキーマ
 */
export const RequestUpdateDataSchema = z.object({
  form_data: z.record(z.unknown()).optional(),
  target_date: z.string().nullable().optional(),
  start_date: z.string().nullable().optional(),
  end_date: z.string().nullable().optional(),
});

/**
 * 申請ステータス更新結果スキーマ
 */
export const RequestStatusUpdateResultSchema = z.object({
  success: z.boolean(),
  message: z.string(),
  error: z.string().optional(),
});

/**
 * 申請承認結果スキーマ
 */
export const RequestApprovalResultSchema = z.object({
  success: z.boolean(),
  message: z.string(),
  error: z.string().optional(),
});

// 申請関連型
export type RequestUpdateData = z.infer<typeof RequestUpdateDataSchema>;
export type RequestStatusUpdateResult = z.infer<typeof RequestStatusUpdateResultSchema>;
export type RequestApprovalResult = z.infer<typeof RequestApprovalResultSchema>;
