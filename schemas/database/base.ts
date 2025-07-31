import { z } from 'zod';

// ================================
// 基本型定義
// ================================

/**
 * UUID型
 */
export const UUIDSchema = z.string().uuid();

/**
 * タイムスタンプ型
 */
export const TimestampSchema = z.string().datetime();

/**
 * 日付文字列型
 */
export const DateStringSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

/**
 * 時刻文字列型
 */
export const TimeStringSchema = z.string().regex(/^\d{2}:\d{2}$/);

/**
 * 基本エンティティ
 */
export const BaseEntitySchema = z.object({
  /** ID */
  id: UUIDSchema,
  /** 作成日時 */
  created_at: TimestampSchema,
  /** 更新日時 */
  updated_at: TimestampSchema,
  /** 削除日時 */
  deleted_at: TimestampSchema.optional(),
});

// ================================
// 動的データ用の専用型定義
// ================================

/**
 * 動的データ型
 */
export const DynamicDataSchema = z.union([
  z.string(),
  z.number(),
  z.boolean(),
  z.array(z.string()),
  z.null(),
  z.record(z.unknown()),
]);

/**
 * 設定データ型
 */
export const SettingsDataSchema = z.record(
  z.union([z.string(), z.number(), z.boolean(), z.array(z.string()), z.record(z.unknown())])
);

/**
 * フィルターデータ型
 */
export const FilterDataSchema = z.record(
  z.union([z.string(), z.number(), z.boolean(), z.array(z.string()), z.null()])
);

// ================================
// 型定義のエクスポート
// ================================

export type UUID = z.infer<typeof UUIDSchema>;
export type Timestamp = z.infer<typeof TimestampSchema>;
export type DateString = z.infer<typeof DateStringSchema>;
export type TimeString = z.infer<typeof TimeStringSchema>;
export type BaseEntity = z.infer<typeof BaseEntitySchema>;
export type DynamicData = z.infer<typeof DynamicDataSchema>;
export type SettingsData = z.infer<typeof SettingsDataSchema>;
export type FilterData = z.infer<typeof FilterDataSchema>;
