import { z } from 'zod';

import { UUIDSchema, DateStringSchema } from './base';

// ================================
// フィルター関連型
// ================================

/**
 * 勤怠フィルター
 */
export const AttendanceFilterSchema = z.object({
  /** ユーザーID */
  user_id: UUIDSchema.optional(),
  /** グループID */
  group_id: UUIDSchema.optional(),
  /** 開始日 */
  start_date: DateStringSchema.optional(),
  /** 終了日 */
  end_date: DateStringSchema.optional(),
  /** ステータス */
  status: z.string().optional(),
  /** 勤務形態ID */
  work_type_id: UUIDSchema.optional(),
});

/**
 * 申請フィルター
 */
export const RequestFilterSchema = z.object({
  /** ユーザーID */
  user_id: UUIDSchema.optional(),
  /** 申請種別ID */
  request_type_id: UUIDSchema.optional(),
  /** ステータスID */
  status_id: UUIDSchema.optional(),
  /** 開始日 */
  start_date: DateStringSchema.optional(),
  /** 終了日 */
  end_date: DateStringSchema.optional(),
  /** カテゴリ */
  category: z.string().optional(),
});

/**
 * ユーザーフィルター
 */
export const UserFilterSchema = z.object({
  /** グループID */
  group_id: UUIDSchema.optional(),
  /** ロール */
  role: z.string().optional(),
  /** 有効フラグ */
  is_active: z.boolean().optional(),
  /** 雇用形態ID */
  employment_type_id: UUIDSchema.optional(),
  /** 検索文字列 */
  search: z.string().optional(),
});

// ================================
// 型定義のエクスポート
// ================================

export type AttendanceFilter = z.infer<typeof AttendanceFilterSchema>;
export type RequestFilter = z.infer<typeof RequestFilterSchema>;
export type UserFilter = z.infer<typeof UserFilterSchema>;
