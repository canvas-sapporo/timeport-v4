import { z } from 'zod';

import { ObjectMetadataSchema } from '../request';

import { BaseEntitySchema, UUIDSchema, DateStringSchema, DynamicDataSchema } from './base';

// ================================
// 申請・承認関連型
// ================================

/**
 * 申請ステータス
 */
export const RequestStatusSchema = BaseEntitySchema.extend({
  /** 企業ID */
  company_id: UUIDSchema,
  /** ステータスコード */
  code: z.string(),
  /** ステータス名 */
  name: z.string(),
  /** 説明 */
  description: z.string().optional(),
  /** 色 */
  color: z.string().optional(),
  /** 表示順序 */
  display_order: z.number(),
  /** 設定 */
  settings: z.record(z.unknown()),
  /** 有効フラグ */
  is_active: z.boolean(),
});

/**
 * 承認ステップ
 */
export const ApprovalStepSchema = z.object({
  /** ステップ番号 */
  step: z.number(),
  /** ステップ名 */
  name: z.string(),
  /** 説明 */
  description: z.string().optional(),
  /** 承認者ロール */
  approver_role: z.string().optional(),
  /** 承認者ID */
  approver_id: UUIDSchema.optional(),
  /** 必須フラグ */
  required: z.boolean(),
  /** 自動承認フラグ */
  auto_approve: z.boolean().optional(),
});

/**
 * 申請フォーム
 */
export const RequestFormSchema = BaseEntitySchema.extend({
  /** 申請フォームコード */
  code: z.string().optional(),
  /** 申請フォーム名 */
  name: z.string(),
  /** 説明 */
  description: z.string().optional(),
  /** カテゴリ */
  category: z.string(),
  /** フォーム設定 */
  form_config: z.array(
    z.object({
      id: z.string(),
      name: z.string(),
      type: z.enum([
        'text',
        'textarea',
        'number',
        'date',
        'time',
        'datetime-local',
        'email',
        'tel',
        'select',
        'radio',
        'checkbox',
        'file',
      ]),
      label: z.string(),
      placeholder: z.string().optional(),
      required: z.boolean(),
      validation_rules: z.record(z.unknown()),
      options: z.array(z.string()).optional(),
      order: z.number(),
    })
  ),
  /** 承認フロー */
  approval_flow: z.array(ApprovalStepSchema),
  /** デフォルトステータスID */
  default_status_id: UUIDSchema.optional(),
  /** 有効フラグ */
  is_active: z.boolean(),
  /** 表示順序 */
  display_order: z.number(),
  /** オブジェクト設定 */
  object_config: ObjectMetadataSchema.optional(),
});

/**
 * 申請
 */
export const RequestSchema = BaseEntitySchema.extend({
  /** 申請フォームID */
  request_form_id: UUIDSchema,
  /** ユーザーID */
  user_id: UUIDSchema,
  /** タイトル */
  title: z.string(),
  /** フォームデータ */
  form_data: z.record(DynamicDataSchema),
  /** 対象日 */
  target_date: DateStringSchema.optional(),
  /** 開始日 */
  start_date: DateStringSchema.optional(),
  /** 終了日 */
  end_date: DateStringSchema.optional(),
  /** 日数 */
  days_count: z.number().optional(),
  /** 金額 */
  amount: z.number().optional(),
  /** ステータスID */
  status_id: UUIDSchema.optional(),
  /** 現在の承認ステップ */
  current_approval_step: z.number(),
  /** 提出コメント */
  submission_comment: z.string().optional(),
  /** ステータス */
  status: z.enum(['pending', 'approved', 'rejected', 'withdrawn', 'expired']).optional(),
  /** 承認者 */
  approved_by: z.string().optional(),
  /** 承認日時 */
  approved_at: z.string().optional(),
  /** 却下理由 */
  rejection_reason: z.string().optional(),
});

// ================================
// 型定義のエクスポート
// ================================

export type RequestStatus = z.infer<typeof RequestStatusSchema>;
export type ApprovalStep = z.infer<typeof ApprovalStepSchema>;
export type RequestForm = z.infer<typeof RequestFormSchema>;
export type Request = z.infer<typeof RequestSchema>;
