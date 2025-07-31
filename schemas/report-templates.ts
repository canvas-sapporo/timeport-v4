import { z } from 'zod';

// ================================
// レポートテンプレート関連スキーマ
// ================================

/**
 * レポートフィールドタイプスキーマ
 */
export const ReportFieldTypeSchema = z.enum([
  'text',
  'textarea',
  'number',
  'date',
  'time',
  'datetime',
  'email',
  'phone',
  'url',
  'select',
  'radio',
  'checkbox',
  'file',
  'hidden',
]);

/**
 * レポートフィールドオプションスキーマ
 */
export const ReportFieldOptionSchema = z.object({
  label: z.string(),
  value: z.union([z.string(), z.number()]),
});

/**
 * レポートフィールド設定スキーマ
 */
export const ReportFieldConfigSchema = z.object({
  id: z.string(),
  type: ReportFieldTypeSchema,
  label: z.string(),
  required: z.boolean().optional(),
  placeholder: z.string().optional(),
  default_value: z.union([z.string(), z.number(), z.boolean()]).optional(),
  options: z
    .object({
      markdown: z.boolean().optional(),
      preview: z.boolean().optional(),
      rows: z.number().int().min(1).optional(),
      min: z.number().optional(),
      max: z.number().optional(),
      step: z.number().optional(),
      multiple: z.boolean().optional(),
      accept: z.string().optional(),
      options: z.array(ReportFieldOptionSchema).optional(),
    })
    .optional(),
});

/**
 * 承認者設定スキーマ
 */
export const ApproverConfigSchema = z.object({
  type: z.enum(['user', 'group']),
  user_id: z.string().uuid().optional(),
  group_id: z.string().uuid().optional(),
});

/**
 * 承認フロー設定スキーマ
 */
export const ApprovalFlowConfigSchema = z.object({
  type: z.enum(['static', 'dynamic']),
  approvers: z.array(ApproverConfigSchema),
});

/**
 * ステータス遷移スキーマ
 */
export const StatusTransitionSchema = z.object({
  from: z.string(),
  to: z.string(),
  action: z.string(),
});

/**
 * ステータスフロー設定スキーマ
 */
export const StatusFlowConfigSchema = z.object({
  transitions: z.array(StatusTransitionSchema),
});

/**
 * レポートテンプレートスキーマ
 */
export const ReportTemplateSchema = z.object({
  id: z.string().uuid(),
  company_id: z.string().uuid(),
  group_id: z.string().uuid().optional(),
  name: z.string(),
  description: z.string().optional(),
  form_config: z.array(ReportFieldConfigSchema),
  approval_flow: ApprovalFlowConfigSchema,
  status_flow: StatusFlowConfigSchema,
  is_active: z.boolean(),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
  deleted_at: z.string().datetime().optional(),
});

/**
 * レポートステータススキーマ
 */
export const ReportStatusSchema = z.object({
  id: z.string().uuid(),
  company_id: z.string().uuid(),
  name: z.string(),
  display_name: z.string(),
  font_color: z.string(),
  background_color: z.string(),
  order_index: z.number().int().min(0),
  is_active: z.boolean(),
  is_required: z.boolean(),
  description: z.string().optional(),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
  deleted_at: z.string().datetime().optional(),
});

/**
 * レポートスキーマ
 */
export const ReportSchema = z.object({
  id: z.string().uuid(),
  company_id: z.string().uuid(),
  user_id: z.string().uuid(),
  template_id: z.string().uuid(),
  title: z.string(),
  content: z.record(
    z.string(),
    z.union([z.string(), z.number(), z.boolean(), z.array(z.string())])
  ),
  current_status_id: z.string().uuid(),
  report_date: z.string(),
  submitted_at: z.string().datetime().optional(),
  completed_at: z.string().datetime().optional(),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
  deleted_at: z.string().datetime().optional(),
});

/**
 * レポート承認スキーマ
 */
export const ReportApprovalSchema = z.object({
  id: z.string().uuid(),
  report_id: z.string().uuid(),
  approver_id: z.string().uuid(),
  status_id: z.string().uuid(),
  comment: z.string().optional(),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
  deleted_at: z.string().datetime().optional(),
});

/**
 * レポート添付ファイルスキーマ
 */
export const ReportAttachmentSchema = z.object({
  id: z.string().uuid(),
  report_id: z.string().uuid(),
  file_name: z.string(),
  file_path: z.string(),
  file_size: z.number().int().min(0),
  mime_type: z.string().optional(),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
  deleted_at: z.string().datetime().optional(),
});

/**
 * レポート作成データスキーマ
 */
export const CreateReportDataSchema = z.object({
  template_id: z.string().uuid(),
  title: z.string(),
  content: z.record(
    z.string(),
    z.union([z.string(), z.number(), z.boolean(), z.array(z.string())])
  ),
  report_date: z.string(),
  attachments: z.array(z.instanceof(File)).optional(),
});

/**
 * レポート更新データスキーマ
 */
export const UpdateReportDataSchema = z.object({
  title: z.string().optional(),
  content: z
    .record(z.string(), z.union([z.string(), z.number(), z.boolean(), z.array(z.string())]))
    .optional(),
  attachments: z.array(z.instanceof(File)).optional(),
});

/**
 * レポート承認データスキーマ
 */
export const ApproveReportDataSchema = z.object({
  status_id: z.string().uuid(),
  comment: z.string().optional(),
});

/**
 * レポートリストアイテムスキーマ
 */
export const ReportListItemSchema = z.object({
  id: z.string().uuid(),
  title: z.string(),
  template_name: z.string(),
  report_date: z.string(),
  current_status: z.object({
    name: z.string(),
    display_name: z.string(),
    font_color: z.string(),
    background_color: z.string(),
  }),
  submitted_at: z.string().datetime().optional(),
  completed_at: z.string().datetime().optional(),
  approver_name: z.string().optional(),
});

/**
 * レポート詳細スキーマ
 */
export const ReportDetailSchema = ReportSchema.extend({
  template: ReportTemplateSchema,
  current_status: ReportStatusSchema,
  approvals: z.array(
    ReportApprovalSchema.extend({
      approver: z.object({
        name: z.string(),
      }),
      status: ReportStatusSchema,
    })
  ),
  attachments: z.array(ReportAttachmentSchema),
});

/**
 * レポート統計スキーマ
 */
export const ReportStatisticsSchema = z.object({
  total_reports: z.number().int().min(0),
  draft_reports: z.number().int().min(0),
  submitted_reports: z.number().int().min(0),
  completed_reports: z.number().int().min(0),
  pending_approval_reports: z.number().int().min(0),
});

/**
 * レポートテンプレート取得結果スキーマ
 */
export const ReportTemplateListResultSchema = z.object({
  success: z.boolean(),
  data: z.array(ReportTemplateSchema).optional(),
  error: z.string().optional(),
});

/**
 * レポートテンプレート詳細取得結果スキーマ
 */
export const ReportTemplateDetailResultSchema = z.object({
  success: z.boolean(),
  data: ReportTemplateSchema.optional(),
  error: z.string().optional(),
});

/**
 * レポートテンプレート更新結果スキーマ
 */
export const UpdateReportTemplateResultSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  description: z.string().optional(),
  updated_at: z.string().datetime(),
});

/**
 * レポートテンプレート削除結果スキーマ
 */
export const DeleteReportTemplateResultSchema = z.object({
  id: z.string().uuid(),
  deleted_at: z.string().datetime(),
});

// レポートテンプレート関連
export type ReportFieldType = z.infer<typeof ReportFieldTypeSchema>;
export type ReportFieldOption = z.infer<typeof ReportFieldOptionSchema>;
export type ReportFieldConfig = z.infer<typeof ReportFieldConfigSchema>;
export type ApproverConfig = z.infer<typeof ApproverConfigSchema>;
export type ApprovalFlowConfig = z.infer<typeof ApprovalFlowConfigSchema>;
export type StatusTransition = z.infer<typeof StatusTransitionSchema>;
export type StatusFlowConfig = z.infer<typeof StatusFlowConfigSchema>;
export type ReportTemplateData = z.infer<typeof ReportTemplateSchema>;
export type ReportStatusData = z.infer<typeof ReportStatusSchema>;
export type ReportData = z.infer<typeof ReportSchema>;
export type ReportApprovalData = z.infer<typeof ReportApprovalSchema>;
export type ReportAttachmentData = z.infer<typeof ReportAttachmentSchema>;
export type CreateReportData = z.infer<typeof CreateReportDataSchema>;
export type UpdateReportData = z.infer<typeof UpdateReportDataSchema>;
export type ApproveReportData = z.infer<typeof ApproveReportDataSchema>;
export type ReportListItem = z.infer<typeof ReportListItemSchema>;
export type ReportDetail = z.infer<typeof ReportDetailSchema>;
export type ReportStatistics = z.infer<typeof ReportStatisticsSchema>;
export type ReportTemplateListResult = z.infer<typeof ReportTemplateListResultSchema>;
export type ReportTemplateDetailResult = z.infer<typeof ReportTemplateDetailResultSchema>;
export type UpdateReportTemplateResult = z.infer<typeof UpdateReportTemplateResultSchema>;
export type DeleteReportTemplateResult = z.infer<typeof DeleteReportTemplateResultSchema>;
