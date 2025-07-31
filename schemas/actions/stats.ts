import { z } from 'zod';

// ================================
// 統計・集計関連スキーマ
// ================================

/**
 * 基本統計情報スキーマ
 */
export const BaseStatsSchema = z.object({
  total: z.number(),
  active: z.number(),
  inactive: z.number(),
});

/**
 * 日付別統計情報スキーマ
 */
export const DateStatsSchema = z.object({
  date: z.string(),
  count: z.number(),
});

/**
 * カテゴリ別統計情報スキーマ
 */
export const CategoryStatsSchema = z.object({
  category: z.string(),
  count: z.number(),
  percentage: z.number(),
});

// 統計・集計関連型
export type BaseStats = z.infer<typeof BaseStatsSchema>;
export type DateStats = z.infer<typeof DateStatsSchema>;
export type CategoryStats = z.infer<typeof CategoryStatsSchema>;
