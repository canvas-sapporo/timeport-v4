import type { UUID, BaseEntity, DateString, Timestamp } from './common';

// ================================
// レポートステータス
// ================================

export interface ReportStatus extends BaseEntity {
  company_id: UUID;
  name: string; // システム内部名 (draft, submitted, unread, read, review, resubmit, completed)
  display_name: string; // 表示名 (作成中, 提出済み, 未読, 既読, レビュー, 再提出, 完了)
  font_color: string; // 文字色 (hex color)
  background_color: string; // 背景色 (hex color)
  order_index: number; // 表示順序
  is_active: boolean; // 有効/無効フラグ
  is_required: boolean; // 必須フラグ（削除不可）
  description?: string; // 説明
}

// ================================
// レポートテンプレート
// ================================

export type ReportFieldType =
  | 'text' // テキスト
  | 'textarea' // テキストエリア
  | 'number' // 数値
  | 'date' // 日付
  | 'time' // 時刻
  | 'datetime' // 日時
  | 'email' // メール
  | 'phone' // 電話番号
  | 'url' // URL
  | 'select' // セレクト
  | 'radio' // ラジオ
  | 'checkbox' // チェックボックス
  | 'file' // ファイル
  | 'hidden'; // 隠しフィールド

export interface ReportFieldOption {
  label: string;
  value: string | number;
}

export interface ReportFieldConfig {
  id: string;
  type: ReportFieldType;
  label: string;
  required?: boolean;
  placeholder?: string;
  default_value?: string | number | boolean;
  options?: {
    markdown?: boolean; // Markdown記述を有効化
    preview?: boolean; // プレビュー機能を有効化
    rows?: number; // テキストエリアの行数
    min?: number; // 数値の最小値
    max?: number; // 数値の最大値
    step?: number; // 数値のステップ
    multiple?: boolean; // ファイル複数選択
    accept?: string; // ファイル形式制限
    options?: ReportFieldOption[]; // セレクト、ラジオ、チェックボックス用
  };
}

export interface ApprovalFlowConfig {
  type: 'static' | 'dynamic'; // 静的または動的
  approvers: Array<{
    type: 'user' | 'group';
    user_id?: UUID;
    group_id?: UUID;
  }>;
}

export interface StatusTransition {
  from: string;
  to: string;
  action: string; // submit, auto, read, review, reject, resubmit, approve
}

export interface StatusFlowConfig {
  transitions: StatusTransition[];
}

export interface ReportTemplate extends BaseEntity {
  company_id: UUID;
  group_id?: UUID; // NULLの場合は全グループで使用可能
  name: string; // 例：「日報テンプレート」「週報テンプレート」
  description?: string;
  form_config: ReportFieldConfig[]; // 動的フォーム設定
  approval_flow: ApprovalFlowConfig; // 承認フロー設定
  status_flow: StatusFlowConfig; // ステータス遷移ルール
  is_active: boolean;
}

// ================================
// レポート
// ================================

export interface Report extends BaseEntity {
  company_id: UUID;
  user_id: UUID;
  template_id: UUID;
  title: string;
  content: Record<string, string | number | boolean | string[]>; // 動的フォームデータ
  current_status_id: UUID;
  report_date: DateString; // レポート対象日
  submitted_at?: Timestamp;
  completed_at?: Timestamp;
}

// ================================
// レポート承認
// ================================

export interface ReportApproval extends BaseEntity {
  report_id: UUID;
  approver_id: UUID;
  status_id: UUID; // 承認時のステータスを記録
  comment?: string;
}

// ================================
// レポート添付ファイル
// ================================

export interface ReportAttachment extends BaseEntity {
  report_id: UUID;
  file_name: string;
  file_path: string; // Supabase Storage パス
  file_size: number;
  mime_type?: string;
}

// ================================
// レポート作成・更新用
// ================================

export interface CreateReportData {
  template_id: UUID;
  title: string;
  content: Record<string, string | number | boolean | string[]>;
  report_date: DateString;
  attachments?: File[];
}

export interface UpdateReportData {
  title?: string;
  content?: Record<string, string | number | boolean | string[]>;
  attachments?: File[];
}

// ================================
// レポート承認用
// ================================

export interface ApproveReportData {
  status_id: UUID;
  comment?: string;
}

// ================================
// レポート一覧用
// ================================

export interface ReportListItem {
  id: UUID;
  title: string;
  template_name: string;
  report_date: DateString;
  current_status: {
    name: string;
    display_name: string;
    font_color: string;
    background_color: string;
  };
  submitted_at?: Timestamp;
  completed_at?: Timestamp;
  approver_name?: string;
}

// ================================
// レポート詳細用
// ================================

export interface ReportDetail extends Report {
  template: ReportTemplate;
  current_status: ReportStatus;
  approvals: Array<
    ReportApproval & {
      approver: {
        name: string;
      };
      status: ReportStatus;
    }
  >;
  attachments: ReportAttachment[];
}

// ================================
// レポート統計
// ================================

export interface ReportStatistics {
  total_reports: number;
  draft_reports: number;
  submitted_reports: number;
  completed_reports: number;
  pending_approval_reports: number;
}
