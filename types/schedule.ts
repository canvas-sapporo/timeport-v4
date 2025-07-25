// ================================
// スケジュール関連型
// ================================

import type { BaseEntity, UUID, DateString, TimeString, Timestamp } from './common';

/**
 * 繰り返しタイプ
 */
export type RecurrenceType = 'none' | 'daily' | 'weekly' | 'monthly' | 'yearly';

/**
 * スケジュールエンティティ
 */
export interface Schedule extends BaseEntity {
  /** ユーザーID */
  user_id: UUID;
  /** タイトル */
  title: string;
  /** 説明 */
  description?: string;
  /** 開始日時 */
  start_datetime: Timestamp;
  /** 終了日時 */
  end_datetime: Timestamp;
  /** 場所 */
  location?: string;
  /** URL（Zoom等） */
  url?: string;
  /** 終日フラグ */
  is_all_day: boolean;
  /** 繰り返しタイプ */
  recurrence_type: RecurrenceType;
  /** 繰り返し間隔 */
  recurrence_interval: number;
  /** 繰り返し終了日 */
  recurrence_end_date?: DateString;
  /** 共有グループ */
  shared_with_groups: UUID[];
  /** プライベートフラグ */
  is_private: boolean;
  /** 表示色 */
  color: string;
}

/**
 * スケジュール作成用入力型
 */
export interface CreateScheduleInput {
  title: string;
  description?: string;
  start_datetime: Timestamp;
  end_datetime: Timestamp;
  location?: string;
  url?: string;
  is_all_day?: boolean;
  recurrence_type?: RecurrenceType;
  recurrence_interval?: number;
  recurrence_end_date?: DateString;
  shared_with_groups?: UUID[];
  is_private?: boolean;
  color?: string;
}

// ================================
// Todo関連型
// ================================

/**
 * Todo優先度
 */
export type TodoPriority = 'low' | 'medium' | 'high' | 'urgent';

/**
 * Todoステータス
 */
export type TodoStatus = 'pending' | 'in_progress' | 'completed' | 'cancelled';

/**
 * Todoエンティティ
 */
export interface Todo extends BaseEntity {
  /** ユーザーID */
  user_id: UUID;
  /** タイトル */
  title: string;
  /** 説明 */
  description?: string;
  /** 期日 */
  due_date?: DateString;
  /** 期限時刻 */
  due_time?: TimeString;
  /** 優先度 */
  priority: TodoPriority;
  /** ステータス */
  status: TodoStatus;
  /** カテゴリ */
  category?: string;
  /** タグ */
  tags: string[];
  /** 予想作業時間 */
  estimated_hours?: number;
  /** 実際の作業時間 */
  actual_hours?: number;
  /** 完了率 */
  completion_rate: number;
  /** 共有グループ */
  shared_with_groups: UUID[];
  /** プライベートフラグ */
  is_private: boolean;
  /** 完了日時 */
  completed_at?: Timestamp;
}

/**
 * Todo作成用入力型
 */
export interface CreateTodoInput {
  title: string;
  description?: string;
  due_date?: DateString;
  due_time?: TimeString;
  priority?: TodoPriority;
  category?: string;
  tags?: string[];
  estimated_hours?: number;
  shared_with_groups?: UUID[];
  is_private?: boolean;
}

// ================================
// 検索・フィルター関連型
// ================================

/**
 * スケジュール検索条件
 */
export interface ScheduleSearchCriteria {
  start_date?: DateString;
  end_date?: DateString;
  keyword?: string;
  shared_only?: boolean;
  group_ids?: UUID[];
}

/**
 * Todo検索条件
 */
export interface TodoSearchCriteria {
  status?: TodoStatus[];
  priority?: TodoPriority[];
  category?: string;
  tags?: string[];
  due_date_from?: DateString;
  due_date_to?: DateString;
  keyword?: string;
  shared_only?: boolean;
}
