import { z } from 'zod';

import { UUIDSchema, TimestampSchema } from '../database/base';

// ================================
// システム監視関連型
// ================================

/**
 * システム状態
 */
export const SystemStatusSchema = z.object({
  /** 稼働状態 */
  status: z.enum(['operational', 'degraded', 'maintenance', 'outage']),
  /** 稼働時間（秒） */
  uptime: z.number(),
  /** CPU使用率（%） */
  cpu_usage: z.number(),
  /** メモリ使用率（%） */
  memory_usage: z.number(),
  /** ディスク使用率（%） */
  disk_usage: z.number(),
  /** アクティブセッション数 */
  active_sessions: z.number(),
  /** 1分間リクエスト数 */
  requests_per_minute: z.number(),
  /** 平均レスポンス時間（ms） */
  average_response_time: z.number(),
  /** エラー率（%） */
  error_rate: z.number(),
  /** 最終チェック時刻 */
  last_checked: TimestampSchema,
});

/**
 * システムアラート
 */
export const SystemAlertSchema = z.object({
  /** アラートID */
  id: z.string(),
  /** アラートタイプ */
  type: z.enum(['info', 'warning', 'error', 'critical']),
  /** タイトル */
  title: z.string(),
  /** メッセージ */
  message: z.string(),
  /** 発生時刻 */
  occurred_at: TimestampSchema,
  /** 解決済みフラグ */
  resolved: z.boolean(),
  /** 解決時刻 */
  resolved_at: TimestampSchema.optional(),
  /** 影響範囲 */
  affected_components: z.array(z.string()),
  /** 詳細情報 */
  details: z.record(z.unknown()).optional(),
});

/**
 * システムバックアップ
 */
export const SystemBackupSchema = z.object({
  /** バックアップID */
  id: z.string(),
  /** バックアップ名 */
  name: z.string(),
  /** 説明 */
  description: z.string().optional(),
  /** サイズ（バイト） */
  size: z.number(),
  /** 作成日時 */
  created_at: TimestampSchema,
  /** 作成者ID */
  created_by: UUIDSchema.optional(),
  /** バックアップタイプ */
  type: z.enum(['full', 'incremental', 'differential']),
  /** ステータス */
  status: z.enum(['completed', 'in_progress', 'failed']),
  /** 保存場所 */
  storage_location: z.string(),
  /** 有効期限 */
  expires_at: TimestampSchema.optional(),
});

// ================================
// 型定義のエクスポート
// ================================

export type SystemStatus = z.infer<typeof SystemStatusSchema>;
export type SystemAlert = z.infer<typeof SystemAlertSchema>;
export type SystemBackup = z.infer<typeof SystemBackupSchema>;
