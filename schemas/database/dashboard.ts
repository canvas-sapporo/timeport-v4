import { z } from 'zod';

// ================================
// ダッシュボード関連型
// ================================

/**
 * ダッシュボード統計
 */
export const DashboardStatsSchema = z.object({
  /** 総ユーザー数 */
  totalUsers: z.number().optional(),
  /** アクティブユーザー数 */
  activeUsers: z.number().optional(),
  /** 保留中申請数 */
  pendingRequests: z.number().optional(),
  /** 今日の勤怠数 */
  todayAttendance: z.number().optional(),
  /** 月次残業時間 */
  monthlyOvertimeHours: z.number().optional(),
  /** 勤務日数 */
  workDays: z.number().optional(),
  /** 残業時間 */
  overtimeHours: z.number().optional(),
  /** 休暇日数 */
  vacationDays: z.number().optional(),
  /** 総勤務時間 */
  totalWorkHours: z.number().optional(),
});

/**
 * ダッシュボードアラート
 */
export const DashboardAlertSchema = z.object({
  /** アラートタイプ */
  type: z.enum(['info', 'warning', 'error', 'success']),
  /** メッセージ */
  message: z.string(),
  /** リンクURL */
  link_url: z.string().optional(),
});

/**
 * 最近のアクティビティ
 */
export const RecentActivitySchema = z.object({
  /** アクティビティタイプ */
  type: z.string(),
  /** タイトル */
  title: z.string().optional(),
  /** 時刻 */
  time: z.string().optional(),
  /** 日付 */
  date: z.string().optional(),
  /** ステータス */
  status: z.string().optional(),
});

// ================================
// 型定義のエクスポート
// ================================

export type DashboardStats = z.infer<typeof DashboardStatsSchema>;
export type DashboardAlert = z.infer<typeof DashboardAlertSchema>;
export type RecentActivity = z.infer<typeof RecentActivitySchema>;
