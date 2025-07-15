/**
 * TimePort システム管理関連型定義
 * 
 * 機能制御、通知、ログ、システム設定に関する型を定義
 */

import type { BaseEntity, UUID, Timestamp, Settings } from './common';

// ================================
// 機能制御型
// ================================

/**
 * 機能対象タイプ
 */
export type FeatureTargetType = 'company' | 'group' | 'user';

/**
 * 機能制御エンティティ
 */
export interface Feature extends BaseEntity {
  /** 機能コード */
  feature_code: string;
  /** 機能名 */
  feature_name: string;
  /** 説明 */
  description?: string;
  /** 対象タイプ */
  target_type: FeatureTargetType;
  /** 対象ID */
  target_id: UUID;
  /** 有効フラグ */
  is_enabled: boolean;
  /** 設定情報 */
  settings: FeatureSettings;
}

/**
 * 機能設定
 */
export interface FeatureSettings {
  /** 制限設定 */
  limits?: {
    max_users?: number;
    max_requests_per_day?: number;
    max_file_size_mb?: number;
  };
  /** 通知設定 */
  notifications?: {
    email_enabled?: boolean;
    sms_enabled?: boolean;
    push_enabled?: boolean;
  };
  /** UI設定 */
  ui_config?: {
    theme?: string;
    layout?: string;
    custom_css?: string;
  };
  /** 業務ロジック設定 */
  business_rules?: Record<string, any>;
}

/**
 * 機能制御作成用入力型
 */
export interface CreateFeatureInput {
  /** 機能コード */
  feature_code: string;
  /** 機能名 */
  feature_name: string;
  /** 説明 */
  description?: string;
  /** 対象タイプ */
  target_type: FeatureTargetType;
  /** 対象ID */
  target_id: UUID;
  /** 有効フラグ */
  is_enabled?: boolean;
  /** 設定情報 */
  settings?: FeatureSettings;
}

/**
 * 機能制御更新用入力型
 */
export interface UpdateFeatureInput {
  /** 機能名 */
  feature_name?: string;
  /** 説明 */
  description?: string;
  /** 有効フラグ */
  is_enabled?: boolean;
  /** 設定情報 */
  settings?: FeatureSettings;
}

// ================================
// 通知型
// ================================

/**
 * 通知タイプ
 */
export type NotificationType = 'info' | 'warning' | 'error' | 'success';

/**
 * 通知優先度
 */
export type NotificationPriority = 'low' | 'normal' | 'high' | 'urgent';

/**
 * 通知エンティティ
 */
export interface Notification extends BaseEntity {
  /** ユーザーID */
  user_id: UUID;
  /** 通知タイプ */
  type: NotificationType;
  /** タイトル */
  title: string;
  /** メッセージ */
  message: string;
  /** リンクURL */
  link_url?: string;
  /** 優先度 */
  priority: NotificationPriority;
  /** 既読フラグ */
  is_read: boolean;
  /** 既読日時 */
  read_at?: Timestamp;
  /** 有効期限 */
  expires_at?: Timestamp;
}

/**
 * 通知作成用入力型
 */
export interface CreateNotificationInput {
  /** ユーザーID */
  user_id: UUID;
  /** 通知タイプ */
  type: NotificationType;
  /** タイトル */
  title: string;
  /** メッセージ */
  message: string;
  /** リンクURL */
  link_url?: string;
  /** 優先度 */
  priority?: NotificationPriority;
  /** 有効期限 */
  expires_at?: Timestamp;
}

/**
 * 通知更新用入力型
 */
export interface UpdateNotificationInput {
  /** 既読フラグ */
  is_read?: boolean;
  /** 既読日時 */
  read_at?: Timestamp;
}

/**
 *   通知テンプレート
 */
export interface NotificationTemplate {
  /** テンプレートID */
  id: string;
  /** テンプレートコード */
  code: string;
  /** タイトルテンプレート */
  title_template: string;
  /** メッセージテンプレート */
  message_template: string;
  /** 通知タイプ */
  type: NotificationType;
  /** 優先度 */
  priority: NotificationPriority;
  /** 有効期限（時間） */
  expiry_hours?: number;
  /** 変数定義 */
  variables: Array<{
    name: string;
    description: string;
    required: boolean;
  }>;
}

// ================================
// 操作ログ型
// ================================

/**
 * 操作ログエンティティ
 */
export interface AuditLog extends BaseEntity {
  /** ユーザーID */
  user_id?: UUID;
  /** 操作種別 */
  action: string;
  /** 対象タイプ */
  target_type?: string;
  /** 対象ID */
  target_id?: UUID;
  /** 変更前データ */
  before_data?: Record<string, any>;
  /** 変更後データ */
  after_data?: Record<string, any>;
  /** 詳細情報 */
  details?: Record<string, any>;
  /** IPアドレス */
  ip_address?: string;
  /** ユーザーエージェント */
  user_agent?: string;
}

/**
 * 操作ログ作成用入力型
 */
export interface CreateAuditLogInput {
  /** ユーザーID */
  user_id?: UUID;
  /** 操作種別 */
  action: string;
  /** 対象タイプ */
  target_type?: string;
  /** 対象ID */
  target_id?: UUID;
  /** 変更前データ */
  before_data?: Record<string, any>;
  /** 変更後データ */
  after_data?: Record<string, any>;
  /** 詳細情報 */
  details?: Record<string, any>;
  /** IPアドレス */
  ip_address?: string;
  /** ユーザーエージェント */
  user_agent?: string;
}

/**
 * 操作ログ検索条件
 */
export interface AuditLogSearchCriteria {
  /** ユーザーID */
  user_id?: UUID;
  /** 操作種別 */
  action?: string;
  /** 対象タイプ */
  target_type?: string;
  /** 対象ID */
  target_id?: UUID;
  /** 開始日時 */
  start_date?: Timestamp;
  /** 終了日時 */
  end_date?: Timestamp;
  /** IPアドレス */
  ip_address?: string;
}

// ================================
// システム設定型
// ================================

/**
 * システム設定
 */
export interface SystemSettings {
  /** 会社名 */
  company_name: string;
  /** タイムゾーン */
  timezone: string;
  /** 勤務時間設定 */
  working_hours: {
    /** 開始時刻 */
    start: string;
    /** 終了時刻 */
    end: string;
    /** 休憩時間（分） */
    break_duration: number;
  };
  /** 残業閾値（分） */
  overtime_threshold: number;
  /** 自動退勤フラグ */
  auto_clock_out: boolean;
  /** 承認必須フラグ */
  require_approval: boolean;
}

/**
 * 通知設定
 */
export interface NotificationSettings {
  /** メール通知有効 */
  email_notifications: boolean;
  /** 遅刻アラート */
  late_arrival_alert: boolean;
  /** 残業アラート */
  overtime_alert: boolean;
  /** 申請アラート */
  application_alert: boolean;
  /** システムメンテナンス通知 */
  system_maintenance: boolean;
}

/**
 * 機能設定
 */
export interface FeatureSettings {
  /** 勤怠管理機能 */
  attendance: boolean;
  /** 申請機能 */
  requests: boolean;
  /** ユーザー管理機能 */
  user_management: boolean;
  /** グループ管理機能 */
  group_management: boolean;
  /** 分析機能 */
  analytics: boolean;
}

// ================================
// システム監視型
// ================================

/**
 * システム状態
 */
export interface SystemStatus {
  /** 稼働状態 */
  status: 'operational' | 'degraded' | 'maintenance' | 'outage';
  /** 稼働時間（秒） */
  uptime: number;
  /** CPU使用率（%） */
  cpu_usage: number;
  /** メモリ使用率（%） */
  memory_usage: number;
  /** ディスク使用率（%） */
  disk_usage: number;
  /** アクティブセッション数 */
  active_sessions: number;
  /** 1分間リクエスト数 */
  requests_per_minute: number;
  /** 平均レスポンス時間（ms） */
  average_response_time: number;
  /** エラー率（%） */
  error_rate: number;
  /** 最終チェック時刻 */
  last_checked: Timestamp;
}

/**
 * システムアラート
 */
export interface SystemAlert {
  /** アラートID */
  id: string;
  /** アラートタイプ */
  type: 'info' | 'warning' | 'error' | 'critical';
  /** タイトル */
  title: string;
  /** メッセージ */
  message: string;
  /** 発生時刻 */
  occurred_at: Timestamp;
  /** 解決済みフラグ */
  resolved: boolean;
  /** 解決時刻 */
  resolved_at?: Timestamp;
  /** 影響範囲 */
  affected_components: string[];
  /** 詳細情報 */
  details?: Record<string, any>;
}

/**
 * システムバックアップ
 */
export interface SystemBackup {
  /** バックアップID */
  id: string;
  /** バックアップ名 */
  name: string;
  /** 説明 */
  description?: string;
  /** サイズ（バイト） */
  size: number;
  /** 作成日時 */
  created_at: Timestamp;
  /** 作成者ID */
  created_by?: UUID;
  /** バックアップタイプ */
  type: 'full' | 'incremental' | 'differential';
  /** ステータス */
  status: 'completed' | 'in_progress' | 'failed';
  /** 保存場所 */
  storage_location: string;
  /** 有効期限 */
  expires_at?: Timestamp;
}

// ================================
// 検索・フィルター型
// ================================

/**
 * 通知検索条件
 */
export interface NotificationSearchCriteria {
  /** ユーザーID */
  user_id?: UUID;
  /** 通知タイプ */
  type?: NotificationType;
  /** 既読フラグ */
  is_read?: boolean;
  /** 優先度 */
  priority?: NotificationPriority;
  /** 検索キーワード */
  keyword?: string;
  /** 開始日時 */
  start_date?: Timestamp;
  /** 終了日時 */
  end_date?: Timestamp;
}

/**
 * 機能検索条件
 */
export interface FeatureSearchCriteria {
  /** 機能コード */
  feature_code?: string;
  /** 対象タイプ */
  target_type?: FeatureTargetType;
  /** 対象ID */
  target_id?: UUID;
  /** 有効フラグ */
  is_enabled?: boolean;
  /** 検索キーワード */
  keyword?: string;
}