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
 * チャットエンティティ
 */
export interface Chat extends BaseEntity {
  /** チャット名 */
  name?: string;
  /** 説明 */
  description?: string;
  /** チャットタイプ */
  chat_type: ChatType;
  /** 作成者ID */
  created_by: UUID;
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
  /** 参加日時 */
  joined_at: Timestamp;
  /** 最終既読日時 */
  last_read_at: Timestamp;
  /** 管理者フラグ */
  is_admin: boolean;
  /** ミュートフラグ */
  is_muted: boolean;
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
  content?: string;
  /** ファイルURL */
  file_url?: string;
  /** ファイル名 */
  file_name?: string;
  /** ファイルサイズ */
  file_size?: number;
  /** 絵文字リアクション */
  emoji_reactions: Record<string, UUID[]>;
  /** 返信先メッセージID */
  reply_to_message_id?: UUID;
  /** 編集フラグ */
  is_edited: boolean;
  /** 編集日時 */
  edited_at?: Timestamp;
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
    is_admin: boolean;
    last_read_at: Timestamp;
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
}
