/**
 * TimePort 申請・承認関連型定義
 *
 * 申請、申請種別、承認フローに関する型を定義
 */

import type { BaseEntity, UUID, DateString, Timestamp, Settings } from './common';

// ================================
// 申請ステータス型
// ================================

/**
 * 申請ステータス
 * - pending: 承認待ち
 * - approved: 承認済み
 * - rejected: 却下
 * - withdrawn: 取り下げ
 * - expired: 期限切れ
 */
export type RequestStatus = 'pending' | 'approved' | 'rejected' | 'withdrawn' | 'expired';

// ================================
// 申請コメント型
// ================================

/**
 * 申請コメント（JSONB格納用）
 */
export interface RequestComment {
  /** コメントID */
  id: string;
  /** コメント者ID */
  user_id: UUID;
  /** コメント者名 */
  user_name: string;
  /** コメント内容 */
  content: string;
  /** コメント種別 */
  type: 'submission' | 'approval' | 'rejection' | 'modification' | 'withdrawal';
  /** 作成日時 */
  created_at: Timestamp;
  /** 添付ファイル */
  attachments?: Array<{
    id: string;
    name: string;
    url: string;
    size: number;
  }>;
}

// ================================
// 申請種別型
// ================================

/**
 * 申請種別エンティティ
 */
export interface RequestType extends BaseEntity {
  /** 会社ID */
  company_id: UUID;
  /** 申請種別コード */
  code: string;
  /** 申請種別名 */
  name: string;
  /** 説明 */
  description?: string;
  /** カテゴリ */
  category: string;
  /** フォーム設定 */
  form_config: FormFieldConfig[];
  /** 承認フロー */
  approval_flow: ApprovalStep[];
  /** デフォルトステータスID */
  default_status_id?: UUID;
  /** 有効フラグ */
  is_active: boolean;
  /** 表示順序 */
  display_order: number;
}

/**
 * フォームフィールド設定
 */
export interface FormFieldConfig {
  /** フィールドID */
  id: string;
  /** フィールド名 */
  name: string;
  /** フィールドタイプ */
  type: FormFieldType;
  /** ラベル */
  label: string;
  /** プレースホルダー */
  placeholder?: string;
  /** 説明 */
  description?: string;
  /** 必須フラグ */
  required: boolean;
  /** バリデーションルール */
  validation_rules: ValidationRule[];
  /** 選択肢（select, radio, checkbox用） */
  options?: string[];
  /** デフォルト値 */
  default_value?: any;
  /** 表示順序 */
  order: number;
  /** 表示幅 */
  width?: 'full' | 'half' | 'third' | 'quarter';
  /** 条件表示ロジック */
  conditional_logic?: ConditionalLogic[];
  /** メタデータ */
  metadata?: Record<string, any>;
}

/**
 * フォームフィールドタイプ
 */
export type FormFieldType =
  | 'text'
  | 'textarea'
  | 'number'
  | 'date'
  | 'time'
  | 'datetime-local'
  | 'email'
  | 'tel'
  | 'url'
  | 'password'
  | 'select'
  | 'radio'
  | 'checkbox'
  | 'file'
  | 'hidden';

/**
 * バリデーションルール
 */
export interface ValidationRule {
  /** ルールタイプ */
  type:
    | 'required'
    | 'minLength'
    | 'maxLength'
    | 'min'
    | 'max'
    | 'pattern'
    | 'email'
    | 'tel'
    | 'url'
    | 'custom';
  /** ルール値 */
  value?: string | number;
  /** エラーメッセージ */
  message?: string;
  /** カスタムバリデーター */
  validator?: string;
}

/**
 * 条件表示ロジック
 */
export interface ConditionalLogic {
  /** 条件フィールド */
  field: string;
  /** 演算子 */
  operator: 'equals' | 'not_equals' | 'contains' | 'not_contains' | 'greater_than' | 'less_than';
  /** 条件値 */
  value: any;
  /** アクション */
  action: 'show' | 'hide' | 'require' | 'disable';
}

/**
 * 承認ステップ
 */
export interface ApprovalStep {
  /** ステップ番号 */
  step: number;
  /** ステップ名 */
  name: string;
  /** 説明 */
  description?: string;
  /** 承認者ロール */
  approver_role?: string;
  /** 承認者ID */
  approver_id?: UUID;
  /** 必須フラグ */
  required: boolean;
  /** 自動承認フラグ */
  auto_approve?: boolean;
  /** 条件 */
  conditions?: ConditionalLogic[];
  /** 並列承認フラグ */
  parallel?: boolean;
  /** タイムアウト（時間） */
  timeout_hours?: number;
}

// ================================
// 申請型
// ================================

/**
 * 申請エンティティ
 */
export interface Request extends BaseEntity {
  /** 申請種別ID */
  request_type_id: UUID;
  /** 申請者ID */
  user_id: UUID;
  /** 申請タイトル */
  title: string;
  /** フォームデータ */
  form_data: Record<string, any>;
  /** 対象日 */
  target_date?: DateString;
  /** 開始日 */
  start_date?: DateString;
  /** 終了日 */
  end_date?: DateString;
  /** 日数 */
  days_count?: number;
  /** 金額 */
  amount?: number;
  /** ステータスID */
  status_id?: UUID;
  /** 現在の承認ステップ */
  current_approval_step: number;
  /** 申請コメント */
  submission_comment?: string;
  /** ステータス */
  status?: 'pending' | 'approved' | 'rejected' | 'withdrawn' | 'expired';
  approved_by?: string;
  approved_at?: string;
  rejection_reason?: string;
}

/**
 * 申請作成用入力型
 */
export interface CreateRequestInput {
  /** 申請種別ID */
  request_type_id: UUID;
  /** 申請者ID */
  user_id: UUID;
  /** 申請タイトル */
  title: string;
  /** フォームデータ */
  form_data: Record<string, any>;
  /** 対象日 */
  target_date?: DateString;
  /** 開始日 */
  start_date?: DateString;
  /** 終了日 */
  end_date?: DateString;
  /** 日数 */
  days_count?: number;
  /** 金額 */
  amount?: number;
  /** 申請コメント */
  submission_comment?: string;
}

/**
 * 申請更新用入力型
 */
export interface UpdateRequestInput {
  /** 申請タイトル */
  title?: string;
  /** フォームデータ */
  form_data?: Record<string, any>;
  /** 対象日 */
  target_date?: DateString;
  /** 開始日 */
  start_date?: DateString;
  /** 終了日 */
  end_date?: DateString;
  /** 日数 */
  days_count?: number;
  /** 金額 */
  amount?: number;
  /** ステータスID */
  status_id?: UUID;
  /** 現在の承認ステップ */
  current_approval_step?: number;
}

// ================================
// 申請ステータスマスター型
// ================================

/**
 * 申請ステータスマスターエンティティ
 */
export interface RequestStatusMaster extends BaseEntity {
  /** 会社ID */
  company_id: UUID;
  /** ステータスコード */
  code: string;
  /** ステータス名 */
  name: string;
  /** 説明 */
  description?: string;
  /** 表示色（HEXカラーコード） */
  color?: string;
  /** 表示順序 */
  display_order: number;
  /** 設定情報 */
  settings: RequestStatusSettings;
  /** 有効フラグ */
  is_active: boolean;
}

/**
 * 申請ステータス設定
 */
export interface RequestStatusSettings {
  /** 初期ステータスフラグ */
  is_initial?: boolean;
  /** 最終ステータスフラグ */
  is_final?: boolean;
  /** 承認済みフラグ */
  is_approved?: boolean;
  /** 却下フラグ */
  is_rejected?: boolean;
  /** 編集可能フラグ */
  is_editable?: boolean;
  /** 取り下げ可能フラグ */
  is_withdrawable?: boolean;
}

// ================================
// 承認操作型
// ================================

/**
 * 承認操作
 */
export interface ApprovalOperation {
  /** 申請ID */
  request_id: UUID;
  /** 承認者ID */
  approver_id: UUID;
  /** 操作タイプ */
  action: 'approve' | 'reject' | 'return' | 'delegate';
  /** コメント */
  comment?: string;
  /** 次の承認者ID（委任時） */
  next_approver_id?: UUID;
  /** 添付ファイル */
  attachments?: Array<{
    name: string;
    url: string;
    size: number;
  }>;
}

/**
 * 承認結果
 */
export interface ApprovalResult {
  /** 成功フラグ */
  success: boolean;
  /** メッセージ */
  message: string;
  /** 更新された申請 */
  request?: Request;
  /** 次のステップ情報 */
  next_step?: {
    step_number: number;
    approver_id?: UUID;
    approver_name?: string;
  };
  /** エラー詳細 */
  error?: string;
}

// ================================
// 申請詳細型
// ================================

/**
 * 申請詳細（リレーション含む）
 */
export interface RequestDetail extends Request {
  /** 申請種別情報 */
  request_type: {
    id: UUID;
    name: string;
    category: string;
    form_config: FormFieldConfig[];
    approval_flow: ApprovalStep[];
  };
  /** 申請者情報 */
  applicant: {
    id: UUID;
    full_name: string;
    employee_code?: string;
    group_name?: string;
  };
  /** ステータス情報 */
  // status: {
  //   id: UUID;
  //   name: string;
  //   code: string;
  //   color?: string;
  // };
  /** 承認履歴 */
  approval_history: Array<{
    step: number;
    approver_id: UUID;
    approver_name: string;
    action: string;
    comment?: string;
    processed_at: Timestamp;
  }>;
  /** コメント履歴 */
  comments: RequestComment[];
  /** 添付ファイル */
  attachments: Array<{
    id: string;
    name: string;
    url: string;
    size: number;
    uploaded_by: UUID;
    uploaded_at: Timestamp;
  }>;
  /** 次の承認者 */
  next_approver?: {
    id: UUID;
    name: string;
    role: string;
  };
}

// ================================
// 申請統計型
// ================================

/**
 * 申請統計
 */
export interface RequestStatistics {
  /** 期間開始日 */
  period_start: DateString;
  /** 期間終了日 */
  period_end: DateString;
  /** 総申請数 */
  total_requests: number;
  /** ステータス別件数 */
  by_status: Record<string, number>;
  /** 種別別件数 */
  by_type: Record<string, number>;
  /** 月別件数 */
  by_month: Record<string, number>;
  /** 平均処理時間（時間） */
  average_processing_hours: number;
  /** 承認率（%） */
  approval_rate: number;
  /** 却下率（%） */
  rejection_rate: number;
}

/**
 * ユーザー申請統計
 */
export interface UserRequestStatistics {
  /** ユーザーID */
  user_id: UUID;
  /** 期間開始日 */
  period_start: DateString;
  /** 期間終了日 */
  period_end: DateString;
  /** 申請数 */
  request_count: number;
  /** 承認数 */
  approved_count: number;
  /** 却下数 */
  rejected_count: number;
  /** 承認率（%） */
  approval_rate: number;
  /** 平均処理時間（時間） */
  average_processing_hours: number;
  /** 種別別申請数 */
  by_type: Record<string, number>;
}

// ================================
// 検索・フィルター型
// ================================

/**
 * 申請検索条件
 */
export interface RequestSearchCriteria {
  /** 申請者ID */
  user_id?: UUID;
  /** グループID */
  group_id?: UUID;
  /** 申請種別ID */
  request_type_id?: UUID;
  /** ステータス */
  status?: RequestStatus;
  /** カテゴリ */
  category?: string;
  /** 開始日 */
  start_date?: DateString;
  /** 終了日 */
  end_date?: DateString;
  /** 申請日範囲開始 */
  created_from?: DateString;
  /** 申請日範囲終了 */
  created_to?: DateString;
  /** 承認者ID */
  approver_id?: UUID;
  /** 検索キーワード */
  keyword?: string;
  /** 金額範囲最小 */
  amount_min?: number;
  /** 金額範囲最大 */
  amount_max?: number;
}

/**
 * 申請種別検索条件
 */
export interface RequestTypeSearchCriteria {
  /** 会社ID */
  company_id?: UUID;
  /** カテゴリ */
  category?: string;
  /** 有効フラグ */
  is_active?: boolean;
  /** 検索キーワード */
  keyword?: string;
}

// ================================
// 申請設定型
// ================================

/**
 * 申請設定
 */
export interface RequestSettings {
  /** 自動承認有効 */
  auto_approval_enabled: boolean;
  /** 自動承認金額上限 */
  auto_approval_amount_limit?: number;
  /** 承認タイムアウト（時間） */
  approval_timeout_hours: number;
  /** 取り下げ可能期間（時間） */
  withdrawal_allowed_hours: number;
  /** 添付ファイル最大サイズ（MB） */
  max_attachment_size_mb: number;
  /** 添付ファイル最大数 */
  max_attachment_count: number;
  /** 許可ファイル形式 */
  allowed_file_types: string[];
  /** 通知設定 */
  notification_settings: {
    email_enabled: boolean;
    sms_enabled: boolean;
    push_enabled: boolean;
  };
}
