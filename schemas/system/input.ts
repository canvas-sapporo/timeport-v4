import { z } from 'zod';

import { UUIDSchema, TimestampSchema } from '../database/base';

import { NotificationTypeSchema, NotificationPrioritySchema } from './template';
import { FeatureTargetTypeSchema } from './search';

// ================================
// 入力型・更新型
// ================================

/**
 * 機能設定
 */
export const FeatureSettingsSchema = z.object({
  /** 制限設定 */
  limits: z
    .object({
      max_users: z.number().optional(),
      max_requests_per_day: z.number().optional(),
      max_file_size_mb: z.number().optional(),
    })
    .optional(),
  /** 通知設定 */
  notifications: z
    .object({
      email_enabled: z.boolean().optional(),
      sms_enabled: z.boolean().optional(),
      push_enabled: z.boolean().optional(),
    })
    .optional(),
  /** UI設定 */
  ui_config: z
    .object({
      theme: z.string().optional(),
      layout: z.string().optional(),
      custom_css: z.string().optional(),
    })
    .optional(),
  /** 業務ロジック設定 */
  business_rules: z.record(z.unknown()).optional(),
});

/**
 * 機能制御作成用入力型
 */
export const CreateFeatureInputSchema = z.object({
  /** 機能コード */
  feature_code: z.string(),
  /** 機能名 */
  feature_name: z.string(),
  /** 説明 */
  description: z.string().optional(),
  /** 企業ID */
  company_id: UUIDSchema,
  /** 有効フラグ */
  is_active: z.boolean().optional(),
  /** 設定情報 */
  settings: FeatureSettingsSchema.optional(),
});

/**
 * 機能制御更新用入力型
 */
export const UpdateFeatureInputSchema = z.object({
  /** 機能名 */
  feature_name: z.string().optional(),
  /** 説明 */
  description: z.string().optional(),
  /** 有効フラグ */
  is_active: z.boolean().optional(),
  /** 設定情報 */
  settings: FeatureSettingsSchema.optional(),
});

/**
 * 通知作成用入力型
 */
export const CreateNotificationInputSchema = z.object({
  /** ユーザーID */
  user_id: UUIDSchema,
  /** 通知タイプ */
  type: NotificationTypeSchema,
  /** タイトル */
  title: z.string(),
  /** メッセージ */
  message: z.string(),
  /** リンクURL */
  link_url: z.string().optional(),
  /** 優先度 */
  priority: NotificationPrioritySchema.optional(),
  /** 有効期限 */
  expires_at: TimestampSchema.optional(),
});

/**
 * 通知更新用入力型
 */
export const UpdateNotificationInputSchema = z.object({
  /** 既読フラグ */
  is_read: z.boolean().optional(),
  /** 既読日時 */
  read_at: TimestampSchema.optional(),
});

/**
 * 操作ログ作成用入力型
 */
export const CreateAuditLogInputSchema = z.object({
  /** ユーザーID */
  user_id: UUIDSchema.optional(),
  /** 操作種別 */
  action: z.string(),
  /** 対象タイプ */
  target_type: z.string().optional(),
  /** 対象ID */
  target_id: UUIDSchema.optional(),
  /** 変更前データ */
  before_data: z.record(z.unknown()).optional(),
  /** 変更後データ */
  after_data: z.record(z.unknown()).optional(),
  /** 詳細情報 */
  details: z.record(z.unknown()).optional(),
  /** IPアドレス */
  ip_address: z.string().optional(),
  /** ユーザーエージェント */
  user_agent: z.string().optional(),
});

/**
 * 操作ログ検索条件
 */
export const AuditLogSearchCriteriaSchema = z.object({
  /** ユーザーID */
  user_id: UUIDSchema.optional(),
  /** 操作種別 */
  action: z.string().optional(),
  /** 対象タイプ */
  target_type: z.string().optional(),
  /** 対象ID */
  target_id: UUIDSchema.optional(),
  /** 開始日時 */
  start_date: TimestampSchema.optional(),
  /** 終了日時 */
  end_date: TimestampSchema.optional(),
  /** IPアドレス */
  ip_address: z.string().optional(),
});

// ================================
// 型定義のエクスポート
// ================================

export type FeatureSettings = z.infer<typeof FeatureSettingsSchema>;
export type CreateFeatureInput = z.infer<typeof CreateFeatureInputSchema>;
export type UpdateFeatureInput = z.infer<typeof UpdateFeatureInputSchema>;
export type CreateNotificationInput = z.infer<typeof CreateNotificationInputSchema>;
export type UpdateNotificationInput = z.infer<typeof UpdateNotificationInputSchema>;
export type CreateAuditLogInput = z.infer<typeof CreateAuditLogInputSchema>;
export type AuditLogSearchCriteria = z.infer<typeof AuditLogSearchCriteriaSchema>;
