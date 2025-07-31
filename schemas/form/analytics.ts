import { z } from 'zod';

// ================================
// フォーム分析型
// ================================

/**
 * フォーム分析データ
 */
export const FormAnalyticsSchema = z.object({
  /** フォームID */
  form_id: z.string(),
  /** 総送信数 */
  total_submissions: z.number(),
  /** 完了率（%） */
  completion_rate: z.number(),
  /** 平均完了時間（分） */
  average_completion_time: z.number(),
  /** 離脱ポイント */
  abandonment_points: z.array(
    z.object({
      field: z.string(),
      abandonment_rate: z.number(),
    })
  ),
  /** フィールド分析 */
  field_analytics: z.array(
    z.object({
      field: z.string(),
      completion_rate: z.number(),
      error_rate: z.number(),
      average_time: z.number(),
    })
  ),
  /** 送信トレンド */
  submission_trends: z.array(
    z.object({
      date: z.string(),
      submissions: z.number(),
      completions: z.number(),
    })
  ),
});

// ================================
// 型定義のエクスポート
// ================================

export type FormAnalytics = z.infer<typeof FormAnalyticsSchema>;
