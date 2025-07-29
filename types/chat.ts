// ================================
// チャット関連型
// ================================

import type { BaseEntity, UUID, DateString, TimeString, Timestamp } from './common';

/**
 * チャットタイプ
 */
export type ChatType = 'direct' | 'group';

/**
 * メッセージタイプ
 */
export type MessageType = 'text' | 'file' | 'image' | 'system';

/**
 * リアクションタイプ
 */
export type ReactionType = string; // 絵文字コード等

/**
 * チャット参加者ロール
 */
export type ChatUserRole = 'admin' | 'member';

/**
 * チャットエンティティ
 */
export interface Chat extends BaseEntity {
  /** 会社ID */
  company_id: UUID;
  /** チャット名（グループチャットの場合のみ） */
  name?: string;
  /** チャットタイプ */
  chat_type: ChatType;
  /** 作成者ID */
  created_by: UUID;
  /** チャット設定（JSONB） */
  settings: Record<string, unknown>;
  /** 有効フラグ */
  is_active: boolean;
  /** 最終メッセージ日時 */
  last_message_at?: Timestamp;
}

/**
 * チャット参加者エンティティ
 */
export interface ChatUser extends BaseEntity {
  /** チャットID */
  chat_id: UUID;
  /** ユーザーID */
  user_id: UUID;
  /** 参加者ロール */
  role: ChatUserRole;
  /** 最終既読日時 */
  last_read_at: Timestamp;
  /** 参加日時 */
  joined_at: Timestamp;
  /** 退出日時 */
  left_at?: Timestamp;
}

/**
 * チャットメッセージエンティティ
 */
export interface ChatMessage extends BaseEntity {
  /** チャットID */
  chat_id: UUID;
  /** ユーザーID */
  user_id: UUID;
  /** メッセージタイプ */
  message_type: MessageType;
  /** メッセージ内容 */
  content: string;
  /** 添付ファイル情報（JSONB） */
  attachments: Array<{
    file_name: string;
    file_path: string;
    file_size: number;
    mime_type: string;
    url?: string;
  }>;
  /** 返信先メッセージID */
  reply_to_message_id?: UUID;
  /** 編集日時 */
  edited_at?: Timestamp;
  /** 送信者情報 */
  user_profiles?: {
    family_name: string;
    first_name: string;
    email: string;
  };
}

/**
 * メッセージリアクションエンティティ
 */
export interface ChatMessageReaction extends BaseEntity {
  /** メッセージID */
  message_id: UUID;
  /** ユーザーID */
  user_id: UUID;
  /** リアクションタイプ */
  reaction_type: ReactionType;
}

// ================================
// ビュー関連型
// ================================

/**
 * チャット一覧ビュー
 */
export interface ChatListView extends Chat {
  /** 参加者数 */
  participant_count: number;
  /** 参加者名一覧 */
  participant_names: string;
}

/**
 * 未読メッセージ数ビュー
 */
export interface UnreadMessageCountView {
  /** ユーザーID */
  user_id: UUID;
  /** チャットID */
  chat_id: UUID;
  /** 未読メッセージ数 */
  unread_count: number;
}

// ================================
// 検索・フィルター関連型
// ================================

/**
 * チャット検索条件
 */
export interface ChatSearchCriteria {
  chat_type?: ChatType;
  keyword?: string;
  unread_only?: boolean;
  company_id?: UUID;
}

/**
 * メッセージ検索条件
 */
export interface MessageSearchCriteria {
  chat_id: UUID;
  limit?: number;
  offset?: number;
  before_date?: Timestamp;
  after_date?: Timestamp;
}

// ================================
// API関連型
// ================================

/**
 * チャット詳細（参加者情報含む）
 */
export interface ChatDetail extends Chat {
  participants: Array<{
    user_id: UUID;
    user_name: string;
    user_email: string;
    role: ChatUserRole;
    last_read_at: Timestamp;
    joined_at: Timestamp;
  }>;
  unread_count: number;
  last_message?: ChatMessage;
}

/**
 * メッセージ詳細（送信者情報含む）
 */
export interface MessageDetail extends ChatMessage {
  sender: {
    id: UUID;
    name: string;
    email: string;
  };
  reply_to?: {
    id: UUID;
    content: string;
    sender_name: string;
  };
  reactions: Array<{
    reaction_type: ReactionType;
    users: Array<{
      id: UUID;
      name: string;
    }>;
  }>;
}

/**
 * チャット作成リクエスト
 */
export interface CreateChatRequest {
  company_id: UUID;
  name?: string;
  chat_type: ChatType;
  participant_ids: UUID[];
  settings?: Record<string, unknown>;
}

/**
 * メッセージ送信リクエスト
 */
export interface SendMessageRequest {
  chat_id: UUID;
  user_id: UUID;
  content: string;
  message_type?: MessageType;
  attachments?: Array<{
    file_name: string;
    file_path: string;
    file_size: number;
    mime_type: string;
  }>;
  reply_to_message_id?: UUID;
}

/**
 * リアクション追加リクエスト
 */
export interface AddReactionRequest {
  message_id: UUID;
  reaction_type: ReactionType;
}

/**
 * 既読更新リクエスト
 */
export interface MarkAsReadRequest {
  chat_id: UUID;
  user_id: UUID;
  last_read_at?: Timestamp;
}

// ================================
// リアルタイム関連型
// ================================

/**
 * リアルタイムメッセージイベント
 */
export interface RealtimeMessageEvent {
  type: 'message_created' | 'message_updated' | 'message_deleted';
  chat_id: UUID;
  message: ChatMessage;
}

/**
 * リアルタイム既読イベント
 */
export interface RealtimeReadEvent {
  type: 'read_updated';
  chat_id: UUID;
  user_id: UUID;
  last_read_at: Timestamp;
}

/**
 * リアルタイムリアクションイベント
 */
export interface RealtimeReactionEvent {
  type: 'reaction_added' | 'reaction_removed';
  message_id: UUID;
  reaction: ChatMessageReaction;
}

/**
 * リアルタイムイベント統合型
 */
export type RealtimeEvent = RealtimeMessageEvent | RealtimeReadEvent | RealtimeReactionEvent;
