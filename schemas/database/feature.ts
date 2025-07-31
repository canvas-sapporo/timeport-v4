import { z } from 'zod';

import { BaseEntitySchema, UUIDSchema, TimestampSchema, SettingsDataSchema } from './base';

// ================================
// 機能制御・通知関連型
// ================================

/**
 * 機能
 */
export const FeatureSchema = BaseEntitySchema.extend({
  /** 機能コード */
  feature_code: z.string(),
  /** 機能名 */
  feature_name: z.string(),
  /** 説明 */
  description: z.string().optional(),
  /** 対象タイプ */
  target_type: z.enum(['company', 'group', 'user']),
  /** 対象ID */
  target_id: UUIDSchema,
  /** 有効フラグ */
  is_enabled: z.boolean(),
  /** 設定 */
  settings: z.record(SettingsDataSchema),
});

/**
 * 通知
 */
export const NotificationSchema = BaseEntitySchema.extend({
  /** ユーザーID */
  user_id: UUIDSchema,
  /** 通知タイプ */
  type: z.enum(['info', 'warning', 'error', 'success']),
  /** タイトル */
  title: z.string(),
  /** メッセージ */
  message: z.string(),
  /** リンクURL */
  link_url: z.string().optional(),
  /** 優先度 */
  priority: z.enum(['low', 'normal', 'high', 'urgent']),
  /** 既読フラグ */
  is_read: z.boolean(),
  /** 既読日時 */
  read_at: TimestampSchema.optional(),
  /** 有効期限 */
  expires_at: TimestampSchema.optional(),
});

// ================================
// 型定義のエクスポート
// ================================

export type Feature = z.infer<typeof FeatureSchema>;
export type Notification = z.infer<typeof NotificationSchema>;
