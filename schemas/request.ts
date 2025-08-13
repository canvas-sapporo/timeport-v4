import { z } from 'zod';
import { LeaveUnitSchema } from './leave';

// ================================
// 申請関連スキーマ
// ================================

/**
 * 申請ステータススキーマ
 */
export const RequestStatusSchema = z.enum([
  'draft',
  'pending',
  'approved',
  'rejected',
  'withdrawn',
  'expired',
]);

/**
 * 申請コメントスキーマ
 */
export const RequestCommentSchema = z.object({
  id: z.string(),
  user_id: z.string().uuid(),
  user_name: z.string(),
  content: z.string(),
  type: z.enum(['submission', 'approval', 'rejection', 'modification', 'withdrawal', 'reply']),
  parent_id: z.string().optional(),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime().optional(),
  attachments: z
    .array(
      z.object({
        id: z.string(),
        name: z.string(),
        url: z.string(),
        size: z.number().int().min(0),
      })
    )
    .optional(),
  replies: z.array(z.any()).optional(),
});

/**
 * 申請添付ファイルスキーマ
 */
export const RequestAttachmentSchema = z.object({
  id: z.string(),
  name: z.string(),
  path: z.string(),
  size: z.number().int().min(0),
  mime_type: z.string(),
  uploaded_by: z.string().uuid(),
  uploaded_at: z.string().datetime(),
});

/**
 * 申請スキーマ
 */
export const RequestSchema = z.object({
  id: z.string().uuid(),
  request_form_id: z.string().uuid(),
  user_id: z.string().uuid(),
  title: z.string().optional(),
  form_data: z.record(
    z.union([z.string(), z.number(), z.boolean(), z.date(), z.array(z.string())])
  ),
  target_date: z.string(),
  start_date: z.string(),
  end_date: z.string(),
  status_id: z.string().uuid().optional(),
  current_approval_step: z.number().int().min(0),
  submission_comment: z.string(),
  comments: z.array(RequestCommentSchema),
  attachments: z.array(RequestAttachmentSchema),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
  deleted_at: z.string().datetime().optional(),
});

/**
 * 申請作成入力スキーマ
 */
export const CreateRequestInputSchema = z.object({
  request_form_id: z.string().uuid(),
  user_id: z.string().uuid(),
  title: z.string().optional(),
  form_data: z.record(
    z.union([z.string(), z.number(), z.boolean(), z.date(), z.array(z.string())])
  ),
  target_date: z.string(),
  start_date: z.string(),
  end_date: z.string(),
  submission_comment: z.string(),
  status_code: z.string().optional(),
});

/**
 * 申請更新入力スキーマ
 */
export const UpdateRequestInputSchema = z.object({
  title: z.string().optional(),
  form_data: z
    .record(z.union([z.string(), z.number(), z.boolean(), z.date(), z.array(z.string())]))
    .optional(),
  target_date: z.string().optional(),
  start_date: z.string().optional(),
  end_date: z.string().optional(),
  status_id: z.string().uuid().optional(),
  current_approval_step: z.number().int().min(0).optional(),
  submission_comment: z.string().optional(),
});

/**
 * 申請承認操作スキーマ
 */
export const ApprovalOperationSchema = z.object({
  request_id: z.string().uuid(),
  approver_id: z.string().uuid(),
  action: z.enum(['approve', 'reject', 'return', 'delegate']),
  comment: z.string().optional(),
  next_approver_id: z.string().uuid().optional(),
  attachments: z
    .array(
      z.object({
        name: z.string(),
        url: z.string(),
        size: z.number().int().min(0),
      })
    )
    .optional(),
});

/**
 * 申請承認結果スキーマ
 */
export const ApprovalResultSchema = z.object({
  success: z.boolean(),
  message: z.string(),
  request: RequestSchema.optional(),
  next_step: z
    .object({
      step_number: z.number().int().min(0),
      approver_id: z.string().uuid().optional(),
      approver_name: z.string().optional(),
    })
    .optional(),
  error: z.string().optional(),
});

/**
 * 申請詳細スキーマ
 */
export const RequestDetailSchema = RequestSchema.extend({
  request_form: z.object({
    id: z.string().uuid(),
    name: z.string(),
    category: z.string(),
    form_config: z.array(z.any()),
    approval_flow: z.array(z.any()),
  }),
  applicant: z.object({
    id: z.string().uuid(),
    full_name: z.string(),
    employee_code: z.string().optional(),
    group_name: z.string().optional(),
  }),
  status: z.object({
    id: z.string().uuid(),
    name: z.string(),
    code: z.string(),
    color: z.string().optional(),
    settings: z.record(z.string(), z.unknown()),
  }),
  approval_history: z.array(
    z.object({
      step_number: z.number().int().min(0),
      approver_id: z.string().uuid(),
      approver_name: z.string(),
      action: z.string(),
      comment: z.string().optional(),
      processed_at: z.string().datetime(),
    })
  ),
  next_approver: z
    .object({
      id: z.string().uuid(),
      name: z.string(),
      role: z.string(),
    })
    .optional(),
});

/**
 * 申請統計スキーマ
 */
export const RequestStatisticsSchema = z.object({
  period_start: z.string(),
  period_end: z.string(),
  total_requests: z.number().int().min(0),
  by_status: z.record(z.string(), z.number().int().min(0)),
  by_form: z.record(z.string(), z.number().int().min(0)),
  by_category: z.record(z.string(), z.number().int().min(0)),
  by_month: z.record(z.string(), z.number().int().min(0)),
  average_processing_hours: z.number().min(0),
  approval_rate: z.number().min(0).max(100),
  rejection_rate: z.number().min(0).max(100),
});

/**
 * 申請一覧取得結果スキーマ
 */
export const GetRequestsResultSchema = z.object({
  success: z.boolean(),
  data: z.array(RequestSchema).optional(),
  error: z.string().optional(),
});

/**
 * 申請詳細取得結果スキーマ
 */
export const GetRequestDetailResultSchema = z.object({
  success: z.boolean(),
  data: RequestDetailSchema.optional(),
  error: z.string().optional(),
});

/**
 * 申請更新結果スキーマ
 */
export const UpdateRequestResultSchema = z.object({
  success: z.boolean(),
  message: z.string(),
  error: z.string().optional(),
});

/**
 * 申請承認結果スキーマ
 */
export const ApproveRequestResultSchema = z.object({
  success: z.boolean(),
  message: z.string(),
  error: z.string().optional(),
});

// ================================
// 申請フォーム関連スキーマ
// ================================

/**
 * フォームフィールドタイプスキーマ
 */
export const FormFieldTypeSchema = z.enum([
  'text',
  'textarea',
  'number',
  'date',
  'time',
  'datetime-local',
  'email',
  'tel',
  'url',
  'password',
  'select',
  'radio',
  'checkbox',
  'file',
  'hidden',
  'object',
]);

/**
 * バリデーションルールスキーマ
 */
export const ValidationRuleSchema = z.object({
  type: z.enum([
    'required',
    'minLength',
    'maxLength',
    'min',
    'max',
    'pattern',
    'email',
    'tel',
    'url',
    'custom',
  ]),
  value: z.union([z.string(), z.number()]).optional(),
  message: z.string().optional(),
  validator: z.string().optional(),
});

/**
 * オブジェクトバリデーションルールスキーマ
 */
export const ObjectValidationRuleSchema = z.object({
  type: z.enum(['date_past_only', 'clock_records_valid', 'required_field']),
  message: z.string(),
  target_field: z.string().optional(),
});

/**
 * オブジェクトメタデータスキーマ
 */
export const AttendanceObjectMetadataSchema = z.object({
  object_type: z.literal('attendance'),
  editable_fields: z.array(z.string()),
  required_fields: z.array(z.string()),
  excluded_fields: z.array(z.string()),
  validation_rules: z.array(ObjectValidationRuleSchema).optional(),
  field_settings: z
    .record(
      z.string(),
      z.object({
        label: z.string(),
        type: z.string(),
        required: z.boolean(),
        description: z.string().optional(),
      })
    )
    .optional(),
});

export const LeaveObjectMetadataSchema = z.object({
  object_type: z.literal('leave'),
  leave_type_id: z.string().uuid(),
  allowed_units: z.array(LeaveUnitSchema).nonempty(),
  min_booking_unit_minutes: z.number().int().min(1).max(480),
  rounding_minutes: z.number().int().min(1).max(240),
  half_day_mode: z.enum(['fixed_hours', 'am_pm']).default('fixed_hours'),
  allow_multi_day: z.boolean().default(true),
  // UI専用フラグ
  require_reason: z.boolean().default(false),
  require_attachment: z.boolean().default(false),
  show_balance: z.boolean().default(true),
});

export const ObjectMetadataSchema = z.union([
  AttendanceObjectMetadataSchema,
  LeaveObjectMetadataSchema,
]);

/**
 * 条件表示ロジックスキーマ
 */
export const ConditionalLogicSchema = z.object({
  field: z.string(),
  operator: z.enum([
    'equals',
    'not_equals',
    'contains',
    'not_contains',
    'greater_than',
    'less_than',
  ]),
  value: z.union([z.string(), z.number(), z.boolean()]),
  action: z.enum(['show', 'hide', 'require', 'disable']),
});

/**
 * 計算設定スキーマ
 */
export const CalculationConfigSchema = z.object({
  type: z.enum(['sum', 'multiply', 'divide', 'subtract', 'date_diff', 'time_diff', 'custom']),
  formula: z.string().optional(),
  target_fields: z.array(z.string()),
  result_field: z.string(),
  conditions: z.array(ConditionalLogicSchema).optional(),
});

/**
 * フォームフィールド設定スキーマ
 */
export const FormFieldConfigSchema = z.object({
  id: z.string(),
  name: z.string(),
  type: FormFieldTypeSchema,
  label: z.string(),
  placeholder: z.string().optional(),
  description: z.string().optional(),
  required: z.boolean(),
  validation_rules: z.array(ValidationRuleSchema),
  options: z.array(z.string()).optional(),
  default_value: z.union([z.string(), z.number(), z.boolean(), z.date()]).optional(),
  order: z.number().int().min(0),
  width: z.enum(['full', 'half', 'third', 'quarter']).optional(),
  conditional_logic: z.array(ConditionalLogicSchema).optional(),
  calculation_config: CalculationConfigSchema.optional(),
  metadata: z
    .union([
      z.record(z.string(), z.union([z.string(), z.number(), z.boolean()])),
      ObjectMetadataSchema,
    ])
    .optional(),
});

/**
 * 承認ステップスキーマ
 */
export const ApprovalStepSchema = z.object({
  step: z.number().int().min(1),
  name: z.string(),
  description: z.string().optional(),
  approver_role: z.string().optional(),
  approver_id: z.string().uuid().optional(),
  required: z.boolean(),
  auto_approve: z.boolean().optional(),
  conditions: z.array(ConditionalLogicSchema).optional(),
  parallel: z.boolean().optional(),
  timeout_hours: z.number().int().min(0).optional(),
});

/**
 * 申請フォームスキーマ
 */
export const RequestFormSchema = z.object({
  id: z.string().uuid(),
  code: z.string().optional(),
  name: z.string(),
  description: z.string().optional(),
  category: z.string(),
  form_config: z.array(FormFieldConfigSchema),
  approval_flow: z.array(ApprovalStepSchema),
  default_status_id: z.string().uuid().optional(),
  is_active: z.boolean(),
  display_order: z.number().int().min(0),
  object_config: ObjectMetadataSchema.optional(),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
  deleted_at: z.string().datetime().optional(),
});

/**
 * ステータス設定スキーマ
 */
export const StatusSettingsSchema = z.object({
  is_initial: z.boolean().optional(),
  is_final: z.boolean().optional(),
  is_approved: z.boolean().optional(),
  is_rejected: z.boolean().optional(),
  is_editable: z.boolean().optional(),
  is_withdrawable: z.boolean().optional(),
  is_active: z.boolean().optional(),
});

/**
 * ステータスマスタースキーマ
 */
export const StatusMasterSchema = z.object({
  id: z.string().uuid(),
  company_id: z.string().uuid().optional(),
  code: z.string(),
  name: z.string(),
  description: z.string().optional(),
  color: z.string().optional(),
  category: z.string(),
  display_order: z.number().int().min(0),
  settings: StatusSettingsSchema,
  is_active: z.boolean(),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
  deleted_at: z.string().datetime().optional(),
});

/**
 * 承認履歴スキーマ
 */
export const ApprovalHistorySchema = z.object({
  step_number: z.number().int().min(0),
  approver_id: z.string().uuid(),
  approver_name: z.string(),
  action: z.string(),
  comment: z.string().optional(),
  processed_at: z.string().datetime(),
});

/**
 * ユーザー申請統計スキーマ
 */
export const UserRequestStatisticsSchema = z.object({
  user_id: z.string().uuid(),
  period_start: z.string(),
  period_end: z.string(),
  request_count: z.number().int().min(0),
  approved_count: z.number().int().min(0),
  rejected_count: z.number().int().min(0),
  approval_rate: z.number().min(0).max(100),
  average_processing_hours: z.number().min(0),
  by_form: z.record(z.string(), z.number().int().min(0)),
});

/**
 * 申請検索条件スキーマ
 */
export const RequestSearchCriteriaSchema = z.object({
  user_id: z.string().uuid().optional(),
  group_id: z.string().uuid().optional(),
  request_form_id: z.string().uuid().optional(),
  status: RequestStatusSchema.optional(),
  category: z.string().optional(),
  start_date: z.string().optional(),
  end_date: z.string().optional(),
  created_from: z.string().optional(),
  created_to: z.string().optional(),
  approver_id: z.string().uuid().optional(),
  keyword: z.string().optional(),
});

/**
 * 申請フォーム検索条件スキーマ
 */
export const RequestFormSearchCriteriaSchema = z.object({
  company_id: z.string().uuid().optional(),
  category: z.string().optional(),
  is_active: z.boolean().optional(),
  keyword: z.string().optional(),
});

/**
 * 申請設定スキーマ
 */
export const RequestSettingsSchema = z.object({
  auto_approval_enabled: z.boolean(),
  auto_approval_amount_limit: z.number().optional(),
  approval_timeout_hours: z.number().int().min(0),
  withdrawal_allowed_hours: z.number().int().min(0),
  max_attachment_size_mb: z.number().int().min(0),
  max_attachment_count: z.number().int().min(0),
  allowed_file_types: z.array(z.string()),
  notification_settings: z.object({
    email_enabled: z.boolean(),
    sms_enabled: z.boolean(),
    push_enabled: z.boolean(),
  }),
});

// 申請関連
export type RequestStatus = z.infer<typeof RequestStatusSchema>;
export type RequestComment = z.infer<typeof RequestCommentSchema>;
export type RequestAttachment = z.infer<typeof RequestAttachmentSchema>;
export type RequestData = z.infer<typeof RequestSchema>;
export type CreateRequestInput = z.infer<typeof CreateRequestInputSchema>;
export type UpdateRequestInput = z.infer<typeof UpdateRequestInputSchema>;
export type ApprovalOperation = z.infer<typeof ApprovalOperationSchema>;
export type ApprovalResult = z.infer<typeof ApprovalResultSchema>;
export type RequestDetail = z.infer<typeof RequestDetailSchema>;
export type RequestStatistics = z.infer<typeof RequestStatisticsSchema>;
export type GetRequestsResult = z.infer<typeof GetRequestsResultSchema>;
export type GetRequestDetailResult = z.infer<typeof GetRequestDetailResultSchema>;
export type UpdateRequestResult = z.infer<typeof UpdateRequestResultSchema>;
export type ApproveRequestResult = z.infer<typeof ApproveRequestResultSchema>;

// 申請フォーム関連
export type FormFieldType = z.infer<typeof FormFieldTypeSchema>;
export type ValidationRule = z.infer<typeof ValidationRuleSchema>;
export type ObjectValidationRule = z.infer<typeof ObjectValidationRuleSchema>;
export type ObjectMetadata = z.infer<typeof ObjectMetadataSchema>;
export type LeaveObjectMetadata = z.infer<typeof LeaveObjectMetadataSchema>;
export type AttendanceObjectMetadata = z.infer<typeof AttendanceObjectMetadataSchema>;
export type ConditionalLogic = z.infer<typeof ConditionalLogicSchema>;
export type CalculationConfig = z.infer<typeof CalculationConfigSchema>;
export type FormFieldConfig = z.infer<typeof FormFieldConfigSchema>;
export type ApprovalStep = z.infer<typeof ApprovalStepSchema>;
export type RequestForm = z.infer<typeof RequestFormSchema>;
export type StatusSettings = z.infer<typeof StatusSettingsSchema>;
export type StatusMaster = z.infer<typeof StatusMasterSchema>;
export type ApprovalHistory = z.infer<typeof ApprovalHistorySchema>;
export type UserRequestStatistics = z.infer<typeof UserRequestStatisticsSchema>;
export type RequestSearchCriteria = z.infer<typeof RequestSearchCriteriaSchema>;
export type RequestFormSearchCriteria = z.infer<typeof RequestFormSearchCriteriaSchema>;
export type RequestSettings = z.infer<typeof RequestSettingsSchema>;
