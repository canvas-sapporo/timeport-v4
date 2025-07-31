import { z } from 'zod';

// ================================
// レポート関連スキーマ
// ================================

/**
 * レポート作成データスキーマ
 */
export const ReportCreateDataSchema = z.object({
  template_id: z.string(),
  title: z.string(),
  content: z.record(z.union([z.string(), z.number(), z.boolean(), z.array(z.string())])),
  report_date: z.string(),
});

/**
 * レポート更新データスキーマ
 */
export const ReportUpdateDataSchema = z.object({
  title: z.string().optional(),
  content: z.record(z.union([z.string(), z.number(), z.boolean(), z.array(z.string())])).optional(),
});

/**
 * レポート承認データスキーマ
 */
export const ReportApproveDataSchema = z.object({
  status_id: z.string(),
  comment: z.string().optional(),
});

// レポート関連型
export type ReportCreateData = z.infer<typeof ReportCreateDataSchema>;
export type ReportUpdateData = z.infer<typeof ReportUpdateDataSchema>;
export type ReportApproveData = z.infer<typeof ReportApproveDataSchema>;
