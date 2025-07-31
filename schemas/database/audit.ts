import { z } from 'zod';

import { BaseEntitySchema, UUIDSchema, DynamicDataSchema } from './base';

// ================================
// 操作ログ関連型
// ================================

/**
 * 監査ログ
 */
export const AuditLogSchema = BaseEntitySchema.extend({
  /** ユーザーID */
  user_id: UUIDSchema.optional(),
  /** アクション */
  action: z.string(),
  /** 対象タイプ */
  target_type: z.string().optional(),
  /** 対象ID */
  target_id: UUIDSchema.optional(),
  /** 変更前データ */
  before_data: z.record(DynamicDataSchema).optional(),
  /** 変更後データ */
  after_data: z.record(DynamicDataSchema).optional(),
  /** 詳細 */
  details: z.record(DynamicDataSchema).optional(),
  /** IPアドレス */
  ip_address: z.string().optional(),
  /** ユーザーエージェント */
  user_agent: z.string().optional(),
});

// ================================
// 型定義のエクスポート
// ================================

export type AuditLog = z.infer<typeof AuditLogSchema>;
