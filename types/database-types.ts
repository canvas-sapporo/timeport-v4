/**
 * データベース関連の型定義
 *
 * Supabaseのテーブル構造やビュー構造を表現する型を定義
 */

import { z } from 'zod';

// ================================
// データベーステーブル型
// ================================

/**
 * データベーステーブル構造型
 */
export const DatabaseTableSchema = z.object({
  /** テーブル名 */
  name: z.string(),
  /** スキーマ名 */
  schema: z.string(),
  /** カラム情報 */
  columns: z.array(
    z.object({
      name: z.string(),
      type: z.string(),
      nullable: z.boolean(),
      default: z.string().optional(),
    })
  ),
  /** 主キー */
  primary_key: z.array(z.string()).optional(),
  /** 外部キー */
  foreign_keys: z
    .array(
      z.object({
        column: z.string(),
        references: z.object({
          table: z.string(),
          column: z.string(),
        }),
      })
    )
    .optional(),
});

/**
 * データベースビュー構造型
 */
export const DatabaseViewSchema = z.object({
  /** ビュー名 */
  name: z.string(),
  /** スキーマ名 */
  schema: z.string(),
  /** 定義SQL */
  definition: z.string(),
  /** カラム情報 */
  columns: z.array(
    z.object({
      name: z.string(),
      type: z.string(),
      nullable: z.boolean(),
    })
  ),
});

// ================================
// データベース操作型
// ================================

/**
 * データベース行型（読み取り）
 */
export const DatabaseRowSchema = z.record(
  z.union([z.string(), z.number(), z.boolean(), z.null(), z.undefined(), z.date()])
);

/**
 * データベース挿入型
 */
export const DatabaseInsertSchema = z.record(
  z.union([z.string(), z.number(), z.boolean(), z.null(), z.undefined(), z.date()])
);

/**
 * データベース更新型
 */
export const DatabaseUpdateSchema = z
  .record(z.union([z.string(), z.number(), z.boolean(), z.null(), z.undefined(), z.date()]))
  .optional();

// ================================
// 統計データ型
// ================================

/**
 * 統計データ型
 */
export const StatisticsDataSchema = z.object({
  /** 統計名 */
  name: z.string(),
  /** 統計値 */
  value: z.number(),
  /** 単位 */
  unit: z.string().optional(),
  /** 期間 */
  period: z.string().optional(),
  /** 前回値 */
  previous_value: z.number().optional(),
  /** 変化率 */
  change_rate: z.number().optional(),
  /** メタデータ */
  metadata: z.record(z.unknown()).optional(),
});

/**
 * 統計結果型
 */
export const StatisticsResultSchema = z.object({
  /** 統計データ一覧 */
  data: z.array(StatisticsDataSchema),
  /** 集計期間 */
  period: z.object({
    start: z.string(),
    end: z.string(),
  }),
  /** メタ情報 */
  meta: z.record(z.unknown()).optional(),
});

// ================================
// 型定義のエクスポート
// ================================

export type DatabaseTable = z.infer<typeof DatabaseTableSchema>;
export type DatabaseView = z.infer<typeof DatabaseViewSchema>;
export type DatabaseRow = z.infer<typeof DatabaseRowSchema>;
export type DatabaseInsert = z.infer<typeof DatabaseInsertSchema>;
export type DatabaseUpdate = z.infer<typeof DatabaseUpdateSchema>;
export type StatisticsData = z.infer<typeof StatisticsDataSchema>;
export type StatisticsResult = z.infer<typeof StatisticsResultSchema>;
