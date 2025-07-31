import { z } from 'zod';

import { UUIDSchema, TimestampSchema } from '../database/base';

import { NotificationTypeSchema, NotificationPrioritySchema } from './template';

// ================================
// 検索・フィルター関連型
// ================================

/**
 * 機能対象タイプ
 */
export const FeatureTargetTypeSchema = z.enum(['company', 'group', 'user']);

/**
 * 通知検索条件
 */
export const NotificationSearchCriteriaSchema = z.object({
  /** ユーザーID */
  user_id: UUIDSchema.optional(),
  /** 通知タイプ */
  type: NotificationTypeSchema.optional(),
  /** 既読フラグ */
  is_read: z.boolean().optional(),
  /** 優先度 */
  priority: NotificationPrioritySchema.optional(),
  /** 検索キーワード */
  keyword: z.string().optional(),
  /** 開始日時 */
  start_date: TimestampSchema.optional(),
  /** 終了日時 */
  end_date: TimestampSchema.optional(),
});

/**
 * 機能検索条件
 */
export const FeatureSearchCriteriaSchema = z.object({
  /** 機能コード */
  feature_code: z.string().optional(),
  /** 対象タイプ */
  target_type: FeatureTargetTypeSchema.optional(),
  /** 対象ID */
  target_id: UUIDSchema.optional(),
  /** 有効フラグ */
  is_enabled: z.boolean().optional(),
  /** 検索キーワード */
  keyword: z.string().optional(),
});

// ================================
// 型定義のエクスポート
// ================================

export type FeatureTargetType = z.infer<typeof FeatureTargetTypeSchema>;
export type NotificationSearchCriteria = z.infer<typeof NotificationSearchCriteriaSchema>;
export type FeatureSearchCriteria = z.infer<typeof FeatureSearchCriteriaSchema>;
