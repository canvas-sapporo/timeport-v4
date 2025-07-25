// ================================
// レポート関連型
// ================================

import type { BaseEntity, UUID, DateString, TimeString, Timestamp } from './common';

/**
 * レポートテンプレートタイプ
 */
export type ReportTemplateType = 'daily' | 'weekly' | 'monthly' | 'project' | 'custom';

/**
 * レポートステータス
 */
export type ReportStatus = 'draft' | 'submitted' | 'reviewed';

/**
 * レポートテンプレートエンティティ
 */
export interface ReportTemplate extends BaseEntity {
  /** 会社ID */
  company_id: UUID;
  /** テンプレート名 */
  name: string;
  /** 説明 */
  description?: string;
  /** テンプレートタイプ */
  template_type: ReportTemplateType;
  /** フォームフィールド */
  form_fields: FormField[];
  /** 有効フラグ */
  is_active: boolean;
  /** 表示順序 */
  display_order: number;
  /** 作成者ID */
  created_by?: UUID;
}

/**
 * レポートエンティティ
 */
export interface Report extends BaseEntity {
  /** テンプレートID */
  template_id: UUID;
  /** ユーザーID */
  user_id: UUID;
  /** タイトル */
  title: string;
  /** レポート日付 */
  report_date: DateString;
  /** フォームデータ */
  form_data: Record<string, any>;
  /** ステータス */
  status: ReportStatus;
  /** 提出日時 */
  submitted_at?: Timestamp;
  /** 確認者ID */
  reviewed_by?: UUID;
  /** 確認日時 */
  reviewed_at?: Timestamp;
  /** 確認者コメント */
  reviewer_comment?: string;
  /** 既読フラグ */
  is_read: boolean;
}

/**
 * フォームフィールド
 */
export interface FormField {
  id: string;
  name: string;
  type: 'text' | 'textarea' | 'number' | 'date' | 'time' | 'select' | 'checkbox' | 'radio';
  label: string;
  placeholder?: string;
  required: boolean;
  options?: string[];
  validation?: {
    min?: number;
    max?: number;
    minLength?: number;
    maxLength?: number;
    pattern?: string;
  };
  order: number;
}

// ================================
// 検索・フィルター関連型
// ================================

/**
 * レポート検索条件
 */
export interface ReportSearchCriteria {
  template_id?: UUID;
  status?: ReportStatus[];
  report_date_from?: DateString;
  report_date_to?: DateString;
  keyword?: string;
}
