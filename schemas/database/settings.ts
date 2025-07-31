import { z } from 'zod';

import { TimeStringSchema } from './base';

// ================================
// 設定関連型
// ================================

/**
 * システム設定
 */
export const SystemSettingsSchema = z.object({
  /** 会社名 */
  company_name: z.string(),
  /** タイムゾーン */
  timezone: z.string(),
  /** 勤務時間 */
  working_hours: z.object({
    /** 開始時刻 */
    start: TimeStringSchema,
    /** 終了時刻 */
    end: TimeStringSchema,
    /** 休憩時間（分） */
    break_duration: z.number(),
  }),
  /** 残業閾値 */
  overtime_threshold: z.number(),
  /** 自動退勤フラグ */
  auto_clock_out: z.boolean(),
  /** 承認必須フラグ */
  require_approval: z.boolean(),
});

/**
 * 通知設定
 */
export const NotificationSettingsSchema = z.object({
  /** メール通知 */
  email_notifications: z.boolean(),
  /** 遅刻アラート */
  late_arrival_alert: z.boolean(),
  /** 残業アラート */
  overtime_alert: z.boolean(),
  /** 申請アラート */
  application_alert: z.boolean(),
  /** システムメンテナンス */
  system_maintenance: z.boolean(),
});

/**
 * 機能設定
 */
export const FeatureSettingsSchema = z.object({
  /** 勤怠機能 */
  attendance: z.boolean(),
  /** 申請機能 */
  requests: z.boolean(),
  /** ユーザー管理 */
  user_management: z.boolean(),
  /** グループ管理 */
  group_management: z.boolean(),
  /** 分析機能 */
  analytics: z.boolean(),
});

// ================================
// 型定義のエクスポート
// ================================

export type SystemSettings = z.infer<typeof SystemSettingsSchema>;
export type NotificationSettings = z.infer<typeof NotificationSettingsSchema>;
export type FeatureSettings = z.infer<typeof FeatureSettingsSchema>;
