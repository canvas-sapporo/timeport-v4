import { z } from 'zod';

import { BaseEntitySchema, UUIDSchema, DynamicDataSchema } from './base';

// ================================
// ログシステム関連型
// ================================

/**
 * システムログレベル
 */
export const LogLevelSchema = z.enum(['debug', 'info', 'warn', 'error', 'fatal']);

/**
 * システムログ
 */
export const SystemLogSchema = BaseEntitySchema.extend({
  /** ログレベル */
  level: LogLevelSchema,

  /** リクエスト情報 */
  host: z.string().optional(),
  method: z.string().optional(),
  path: z.string().optional(),
  status_code: z.number().optional(),
  response_time_ms: z.number().optional(),

  /** サイズ情報 */
  request_size_bytes: z.number().optional(),
  response_size_bytes: z.number().optional(),
  memory_usage_mb: z.number().optional(),

  /** エラー情報 */
  error_message: z.string().optional(),
  error_stack: z.string().optional(),

  /** コンテキスト情報 */
  user_id: UUIDSchema.optional(),
  company_id: UUIDSchema.optional(),
  session_id: z.string().optional(),

  /** ネットワーク情報 */
  ip_address: z.string().optional(),
  user_agent: z.string().optional(),
  referer: z.string().optional(),

  /** トレーシング情報 */
  trace_id: z.string().optional(),
  request_id: z.string().optional(),

  /** 機能情報 */
  feature_name: z.string().optional(),
  action_type: z.string().optional(),
  resource_type: z.string().optional(),
  resource_id: UUIDSchema.optional(),

  /** 環境情報 */
  environment: z.string().optional(),
  app_version: z.string().optional(),

  /** 追加メタデータ */
  metadata: z.record(DynamicDataSchema).optional(),

  /** パフォーマンス最適化 */
  created_date: z.string().optional(),
});

/**
 * 監査ログ
 */
export const AuditLogSchema = BaseEntitySchema.extend({
  /** ユーザー情報 */
  user_id: UUIDSchema.optional(),
  company_id: UUIDSchema.optional(),

  /** 操作情報 */
  action: z.string(),
  target_type: z.string().optional(),
  target_id: UUIDSchema.optional(),

  /** データ変更 */
  before_data: z.record(DynamicDataSchema).optional(),
  after_data: z.record(DynamicDataSchema).optional(),

  /** 詳細情報 */
  details: z.record(DynamicDataSchema).optional(),

  /** ネットワーク情報 */
  ip_address: z.string().optional(),
  user_agent: z.string().optional(),

  /** セッション情報 */
  session_id: z.string().optional(),

  /** パフォーマンス最適化 */
  created_date: z.string().optional(),

  /** ユーザープロフィール情報（JOIN結果） */
  user_profiles: z
    .object({
      id: UUIDSchema,
      family_name: z.string(),
      first_name: z.string(),
    })
    .optional(),
});

/**
 * ログ設定
 */
export const LogSettingSchema = BaseEntitySchema.extend({
  /** 設定情報 */
  setting_key: z.string(),
  setting_value: z.record(DynamicDataSchema),
  description: z.string().optional(),

  /** 作成者情報 */
  created_by: UUIDSchema.optional(),
});

/**
 * ログ設定キー
 */
export const LogSettingKeySchema = z.enum([
  'system_log_level',
  'system_log_enabled',
  'audit_log_enabled',
  'buffer_size',
  'flush_interval',
  'error_log_immediate',
]);

/**
 * ログフィルター
 */
export const LogFilterSchema = z.object({
  /** 日付範囲 */
  start_date: z.string().optional(),
  end_date: z.string().optional(),

  /** ログレベル */
  levels: z.array(LogLevelSchema).optional(),

  /** ユーザー */
  user_id: UUIDSchema.optional(),

  /** 会社 */
  company_id: UUIDSchema.optional(),

  /** パス */
  path: z.string().optional(),

  /** 機能名 */
  feature_name: z.string().optional(),

  /** エラーのみ */
  errors_only: z.boolean().optional(),

  /** 検索キーワード */
  search: z.string().optional(),

  /** ページネーション */
  page: z.number().min(1).default(1),
  limit: z.number().min(1).max(1000).default(50),
});

/**
 * ログ統計
 */
export const LogStatsSchema = z.object({
  /** 総件数 */
  total_count: z.number(),

  /** レベル別件数 */
  level_counts: z.record(z.number()),

  /** 日別件数 */
  daily_counts: z.array(
    z.object({
      date: z.string(),
      count: z.number(),
    })
  ),

  /** エラー率 */
  error_rate: z.number(),

  /** 平均レスポンス時間 */
  avg_response_time: z.number().optional(),
});

// ================================
// 型定義のエクスポート
// ================================

export type LogLevel = z.infer<typeof LogLevelSchema>;
export type SystemLog = z.infer<typeof SystemLogSchema>;
export type AuditLog = z.infer<typeof AuditLogSchema>;
export type LogSetting = z.infer<typeof LogSettingSchema>;
export type LogSettingKey = z.infer<typeof LogSettingKeySchema>;
export type LogFilter = z.infer<typeof LogFilterSchema>;
export type LogStats = z.infer<typeof LogStatsSchema>;
