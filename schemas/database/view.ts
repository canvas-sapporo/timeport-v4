import { z } from 'zod';

import {
  UUIDSchema,
  TimestampSchema,
  DateStringSchema,
  TimeStringSchema,
  DynamicDataSchema,
} from './base';
import { BreakRecordSchema } from './attendance';

// ================================
// 既存のビュー型定義（詳細版に更新）
// ================================

// ================================
// ビュー型定義
// ================================

/**
 * ユーザー詳細ビュー
 */
export const UserDetailViewSchema = z.object({
  /** ユーザーID */
  id: UUIDSchema,
  /** 個人コード */
  code: z.string().optional(),
  /** 名前（名） */
  first_name: z.string(),
  /** 名前（姓） */
  family_name: z.string(),
  /** フルネーム */
  full_name: z.string(),
  /** メールアドレス */
  email: z.string(),
  /** ユーザーロール */
  role: z.enum(['system-admin', 'admin', 'member']),
  /** 勤務開始日 */
  work_start_date: DateStringSchema.optional(),
  /** 有効フラグ */
  is_active: z.boolean(),
  /** 主所属グループ名 */
  primary_group_name: z.string().optional(),
  /** グループパス */
  group_path: z.string().optional(),
  /** 雇用形態名 */
  employment_type_name: z.string().optional(),
  /** 会社名 */
  company_name: z.string().optional(),
  /** 作成日時 */
  created_at: TimestampSchema,
  /** 編集日時 */
  updated_at: TimestampSchema,
});

/**
 * 勤怠詳細ビュー
 */
export const AttendanceDetailViewSchema = z.object({
  /** 勤怠ID */
  id: UUIDSchema,
  /** ユーザーID */
  user_id: UUIDSchema,
  /** 個人コード */
  code: z.string().optional(),
  /** フルネーム */
  full_name: z.string(),
  /** 主所属グループ名 */
  primary_group_name: z.string().optional(),
  /** 勤務日 */
  work_date: DateStringSchema,
  /** 出勤時刻 */
  clock_in_time: TimestampSchema.optional(),
  /** 退勤時刻 */
  clock_out_time: TimestampSchema.optional(),
  /** 休憩記録一覧 */
  break_records: z.array(BreakRecordSchema),
  /** 実勤務時間（分） */
  actual_work_minutes: z.number().optional(),
  /** 残業時間（分） */
  overtime_minutes: z.number(),
  /** 遅刻時間（分） */
  late_minutes: z.number(),
  /** 早退時間（分） */
  early_leave_minutes: z.number(),
  /** ステータス */
  status: z.string(),
  /** 備考 */
  description: z.string().optional(),
  /** 勤務タイプ名 */
  work_type_name: z.string().optional(),
  /** 勤務開始時刻 */
  work_start_time: TimeStringSchema.optional(),
  /** 勤務終了時刻 */
  work_end_time: TimeStringSchema.optional(),
  /** 作成日時 */
  created_at: TimestampSchema,
  /** 編集日時 */
  updated_at: TimestampSchema,
});

/**
 * 申請詳細ビュー
 */
export const RequestDetailViewSchema = z.object({
  /** 申請ID */
  id: UUIDSchema,
  /** ユーザーID */
  user_id: UUIDSchema,
  /** 個人コード */
  code: z.string().optional(),
  /** 申請者名 */
  applicant_name: z.string(),
  /** 主所属グループ名 */
  primary_group_name: z.string().optional(),
  /** 申請タイトル */
  title: z.string(),
  /** フォームデータ */
  form_data: z.record(DynamicDataSchema),
  /** 対象日 */
  target_date: DateStringSchema.optional(),
  /** 開始日 */
  start_date: DateStringSchema.optional(),
  /** 終了日 */
  end_date: DateStringSchema.optional(),
  /** 日数 */
  days_count: z.number().optional(),
  /** 金額 */
  amount: z.number().optional(),
  /** ステータス名 */
  status_name: z.string().optional(),
  /** ステータス色 */
  status_color: z.string().optional(),
  /** 申請コメント */
  submission_comment: z.string().optional(),
  /** 申請種別名 */
  request_type_name: z.string(),
  /** 申請カテゴリ */
  request_category: z.string(),
  /** 承認者名 */
  approver_name: z.string().optional(),
  /** 承認日時 */
  approved_at: TimestampSchema.optional(),
  /** 却下理由 */
  rejection_reason: z.string().optional(),
  /** 作成日時 */
  created_at: TimestampSchema,
  /** 編集日時 */
  updated_at: TimestampSchema,
});

// ================================
// 新規ビュー型定義
// ================================

/**
 * グループ階層ビュー
 */
export const GroupHierarchyViewSchema = z.object({
  /** グループID */
  id: UUIDSchema,
  /** 会社ID */
  company_id: UUIDSchema,
  /** 親グループID */
  parent_group_id: UUIDSchema.optional(),
  /** グループ名 */
  name: z.string(),
  /** グループコード */
  code: z.string().optional(),
  /** 説明 */
  description: z.string().optional(),
  /** 階層レベル */
  level: z.number(),
  /** 階層パス */
  path: z.string(),
  /** 会社名 */
  company_name: z.string(),
  /** 親グループ名 */
  parent_group_name: z.string().optional(),
  /** ユーザー数 */
  user_count: z.number(),
  /** 子グループ数 */
  child_group_count: z.number(),
  /** 作成日時 */
  created_at: TimestampSchema,
  /** 編集日時 */
  updated_at: TimestampSchema,
});

/**
 * ユーザーグループ詳細ビュー
 */
export const UserGroupDetailViewSchema = z.object({
  /** ユーザーID */
  user_id: UUIDSchema,
  /** グループID */
  group_id: UUIDSchema,
  /** ユーザー名 */
  user_name: z.string(),
  /** 個人コード */
  user_code: z.string().optional(),
  /** メールアドレス */
  user_email: z.string(),
  /** ユーザーロール */
  user_role: z.enum(['system-admin', 'admin', 'member']),
  /** グループ名 */
  group_name: z.string(),
  /** グループコード */
  group_code: z.string().optional(),
  /** グループパス */
  group_path: z.string(),
  /** 階層レベル */
  group_level: z.number(),
  /** 会社ID */
  company_id: UUIDSchema,
  /** 会社名 */
  company_name: z.string(),
  /** 主所属フラグ */
  is_primary: z.boolean(),
});

/**
 * 申請種別フォーム詳細ビュー
 */
export const RequestTypeFormDetailViewSchema = z.object({
  /** 申請種別ID */
  request_type_id: UUIDSchema,
  /** フォームID */
  form_id: UUIDSchema,
  /** 表示順序 */
  display_order: z.number(),
  /** 必須フラグ */
  is_required: z.boolean(),
  /** フィールド名 */
  field_name: z.string(),
  /** フィールドタイプ */
  field_type: z.string(),
  /** フィールドラベル */
  field_label: z.string(),
  /** フィールドオプション */
  field_options: z.record(z.union([z.string(), z.number(), z.boolean(), z.array(z.string())])),
  /** 申請種別名 */
  request_type_name: z.string(),
  /** 申請種別コード */
  request_type_code: z.string(),
  /** カテゴリ */
  category: z.string(),
});

/**
 * アクティブユーザービュー
 */
export const ActiveUserViewSchema = z.object({
  /** ユーザーID */
  id: UUIDSchema,
  /** 個人コード */
  code: z.string().optional(),
  /** 名前（名） */
  first_name: z.string(),
  /** 名前（姓） */
  family_name: z.string(),
  /** フルネーム */
  full_name: z.string(),
  /** 西洋式フルネーム */
  full_name_western: z.string(),
  /** メールアドレス */
  email: z.string(),
  /** ユーザーロール */
  role: z.enum(['system-admin', 'admin', 'member']),
  /** 主所属グループID */
  primary_group_id: UUIDSchema.optional(),
  /** 雇用形態ID */
  employment_type_id: UUIDSchema.optional(),
  /** 勤務タイプID */
  current_work_type_id: UUIDSchema.optional(),
  /** 勤務開始日 */
  work_start_date: DateStringSchema.optional(),
  /** 勤務終了日 */
  work_end_date: DateStringSchema.optional(),
  /** 有効フラグ */
  is_active: z.boolean(),
  /** 勤務タイプ名 */
  work_type_name: z.string().optional(),
  /** 雇用形態名 */
  employment_type_name: z.string().optional(),
  /** 作成日時 */
  created_at: TimestampSchema,
  /** 編集日時 */
  updated_at: TimestampSchema,
});

/**
 * アクティブ勤怠ビュー
 */
export const ActiveAttendanceViewSchema = z.object({
  /** 勤怠ID */
  id: UUIDSchema,
  /** ユーザーID */
  user_id: UUIDSchema,
  /** 勤務日 */
  work_date: DateStringSchema,
  /** 勤務タイプID */
  work_type_id: UUIDSchema.optional(),
  /** 出勤時刻 */
  clock_in_time: TimestampSchema.optional(),
  /** 退勤時刻 */
  clock_out_time: TimestampSchema.optional(),
  /** 休憩記録一覧 */
  break_records: z.array(BreakRecordSchema),
  /** 実勤務時間（分） */
  actual_work_minutes: z.number().optional(),
  /** 残業時間（分） */
  overtime_minutes: z.number(),
  /** 遅刻時間（分） */
  late_minutes: z.number(),
  /** 早退時間（分） */
  early_leave_minutes: z.number(),
  /** 自動計算フラグ */
  auto_calculated: z.boolean(),
  /** 備考 */
  description: z.string().optional(),
  /** 承認者ID */
  approved_by: UUIDSchema.optional(),
  /** 承認日時 */
  approved_at: TimestampSchema.optional(),
  /** フルネーム */
  full_name: z.string(),
  /** 勤務タイプ名 */
  work_type_name: z.string().optional(),
  /** 作成日時 */
  created_at: TimestampSchema,
  /** 編集日時 */
  updated_at: TimestampSchema,
});

/**
 * アクティブ申請ビュー
 */
export const ActiveRequestViewSchema = z.object({
  /** 申請ID */
  id: UUIDSchema,
  /** ユーザーID */
  user_id: UUIDSchema,
  /** フルネーム */
  full_name: z.string(),
  /** 申請種別ID */
  request_type_id: UUIDSchema,
  /** 申請種別名 */
  request_type_name: z.string(),
  /** 申請タイトル */
  title: z.string(),
  /** フォームデータ */
  form_data: z.record(
    z.union([z.string(), z.number(), z.boolean(), z.date(), z.array(z.string())])
  ),
  /** 対象日 */
  target_date: DateStringSchema.optional(),
  /** 開始日 */
  start_date: DateStringSchema.optional(),
  /** 終了日 */
  end_date: DateStringSchema.optional(),
  /** 日数 */
  days_count: z.number().optional(),
  /** 金額 */
  amount: z.number().optional(),
  /** ステータスID */
  status_id: UUIDSchema.optional(),
  /** ステータス名 */
  status_name: z.string().optional(),
  /** 現在の承認ステップ */
  current_approval_step: z.number(),
  /** 申請コメント */
  submission_comment: z.string().optional(),
  /** 作成日時 */
  created_at: TimestampSchema,
  /** 編集日時 */
  updated_at: TimestampSchema,
});

// ================================
// 型定義のエクスポート
// ================================

export type UserDetailView = z.infer<typeof UserDetailViewSchema>;
export type AttendanceDetailView = z.infer<typeof AttendanceDetailViewSchema>;
export type RequestDetailView = z.infer<typeof RequestDetailViewSchema>;
export type GroupHierarchyView = z.infer<typeof GroupHierarchyViewSchema>;
export type UserGroupDetailView = z.infer<typeof UserGroupDetailViewSchema>;
export type RequestTypeFormDetailView = z.infer<typeof RequestTypeFormDetailViewSchema>;
export type ActiveUserView = z.infer<typeof ActiveUserViewSchema>;
export type ActiveAttendanceView = z.infer<typeof ActiveAttendanceViewSchema>;
export type ActiveRequestView = z.infer<typeof ActiveRequestViewSchema>;
