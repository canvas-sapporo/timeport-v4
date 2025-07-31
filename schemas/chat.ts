import { z } from 'zod';

// ================================
// チャット関連スキーマ
// ================================

/**
 * チャットタイプスキーマ
 */
export const ChatTypeSchema = z.enum(['direct', 'group']);

/**
 * メッセージタイプスキーマ
 */
export const MessageTypeSchema = z.enum(['text', 'file', 'image', 'system']);

/**
 * チャット参加者ロールスキーマ
 */
export const ChatUserRoleSchema = z.enum(['admin', 'member']);

/**
 * 添付ファイルスキーマ
 */
export const AttachmentSchema = z.object({
  file_name: z.string(),
  file_path: z.string(),
  file_size: z.number().int().min(0),
  mime_type: z.string(),
  url: z.string().optional(),
});

/**
 * チャットスキーマ
 */
export const ChatSchema = z.object({
  id: z.string().uuid(),
  company_id: z.string().uuid(),
  name: z.string().optional(),
  chat_type: ChatTypeSchema,
  created_by: z.string().uuid(),
  settings: z.record(z.string(), z.unknown()),
  is_active: z.boolean(),
  last_message_at: z.string().datetime().optional(),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
  deleted_at: z.string().datetime().optional(),
});

/**
 * チャット参加者スキーマ
 */
export const ChatUserSchema = z.object({
  id: z.string().uuid(),
  chat_id: z.string().uuid(),
  user_id: z.string().uuid(),
  role: ChatUserRoleSchema,
  last_read_at: z.string().datetime(),
  joined_at: z.string().datetime(),
  left_at: z.string().datetime().optional(),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
  deleted_at: z.string().datetime().optional(),
});

/**
 * チャットメッセージスキーマ
 */
export const ChatMessageSchema = z.object({
  id: z.string().uuid(),
  chat_id: z.string().uuid(),
  user_id: z.string().uuid(),
  message_type: MessageTypeSchema,
  content: z.string(),
  attachments: z.array(AttachmentSchema),
  reply_to_message_id: z.string().uuid().optional(),
  edited_at: z.string().datetime().optional(),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
  deleted_at: z.string().datetime().optional(),
  user_profiles: z
    .object({
      family_name: z.string(),
      first_name: z.string(),
      email: z.string(),
    })
    .optional(),
});

/**
 * メッセージリアクションスキーマ
 */
export const ChatMessageReactionSchema = z.object({
  id: z.string().uuid(),
  message_id: z.string().uuid(),
  user_id: z.string().uuid(),
  reaction_type: z.string(),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
  deleted_at: z.string().datetime().optional(),
});

/**
 * チャットリストビュースキーマ
 */
export const ChatListViewSchema = ChatSchema.extend({
  participant_count: z.number().int().min(0),
  participant_names: z.string(),
});

/**
 * 未読メッセージ数ビュースキーマ
 */
export const UnreadMessageCountViewSchema = z.object({
  user_id: z.string().uuid(),
  chat_id: z.string().uuid(),
  unread_count: z.number().int().min(0),
});

/**
 * チャット検索条件スキーマ
 */
export const ChatSearchCriteriaSchema = z.object({
  chat_type: ChatTypeSchema.optional(),
  keyword: z.string().optional(),
  unread_only: z.boolean().optional(),
  company_id: z.string().uuid().optional(),
});

/**
 * メッセージ検索条件スキーマ
 */
export const MessageSearchCriteriaSchema = z.object({
  chat_id: z.string().uuid(),
  limit: z.number().int().min(1).optional(),
  offset: z.number().int().min(0).optional(),
  before_date: z.string().datetime().optional(),
  after_date: z.string().datetime().optional(),
});

/**
 * チャット詳細スキーマ
 */
export const ChatDetailSchema = ChatSchema.extend({
  participants: z.array(
    z.object({
      user_id: z.string().uuid(),
      user_name: z.string(),
      user_email: z.string().email(),
      role: ChatUserRoleSchema,
      last_read_at: z.string().datetime(),
      joined_at: z.string().datetime(),
    })
  ),
  unread_count: z.number().int().min(0),
  last_message: ChatMessageSchema.optional(),
});

/**
 * メッセージ詳細スキーマ
 */
export const MessageDetailSchema = ChatMessageSchema.extend({
  sender: z.object({
    id: z.string().uuid(),
    name: z.string(),
    email: z.string().email(),
  }),
  reply_to: z
    .object({
      id: z.string().uuid(),
      content: z.string(),
      sender_name: z.string(),
    })
    .optional(),
  reactions: z.array(
    z.object({
      reaction_type: z.string(),
      users: z.array(
        z.object({
          id: z.string().uuid(),
          name: z.string(),
        })
      ),
    })
  ),
});

/**
 * チャット作成要求スキーマ
 */
export const CreateChatRequestSchema = z.object({
  company_id: z.string().uuid(),
  name: z.string().optional(),
  chat_type: ChatTypeSchema,
  participant_ids: z.array(z.string().uuid()),
  settings: z.record(z.string(), z.unknown()).optional(),
});

/**
 * メッセージ送信要求スキーマ
 */
export const SendMessageRequestSchema = z.object({
  chat_id: z.string().uuid(),
  user_id: z.string().uuid(),
  content: z.string(),
  message_type: MessageTypeSchema.optional(),
  attachments: z
    .array(
      z.object({
        file_name: z.string(),
        file_path: z.string(),
        file_size: z.number().int().min(0),
        mime_type: z.string(),
      })
    )
    .optional(),
  reply_to_message_id: z.string().uuid().optional(),
});

/**
 * リアクション追加要求スキーマ
 */
export const AddReactionRequestSchema = z.object({
  message_id: z.string().uuid(),
  reaction_type: z.string(),
});

/**
 * 既読マーク要求スキーマ
 */
export const MarkAsReadRequestSchema = z.object({
  chat_id: z.string().uuid(),
  user_id: z.string().uuid(),
  last_read_at: z.string().datetime().optional(),
});

/**
 * ユーザー検索結果スキーマ
 */
export const UserSearchResultSchema = z.object({
  id: z.string().uuid(),
  code: z.string(),
  family_name: z.string(),
  first_name: z.string(),
  family_name_kana: z.string(),
  first_name_kana: z.string(),
  email: z.string().email(),
});

// チャット関連
export type ChatType = z.infer<typeof ChatTypeSchema>;
export type MessageType = z.infer<typeof MessageTypeSchema>;
export type ChatUserRole = z.infer<typeof ChatUserRoleSchema>;
export type Attachment = z.infer<typeof AttachmentSchema>;
export type ChatData = z.infer<typeof ChatSchema>;
export type ChatUserData = z.infer<typeof ChatUserSchema>;
export type ChatMessageData = z.infer<typeof ChatMessageSchema>;
export type ChatMessageReactionData = z.infer<typeof ChatMessageReactionSchema>;
export type ChatListView = z.infer<typeof ChatListViewSchema>;
export type UnreadMessageCountView = z.infer<typeof UnreadMessageCountViewSchema>;
export type ChatSearchCriteria = z.infer<typeof ChatSearchCriteriaSchema>;
export type MessageSearchCriteria = z.infer<typeof MessageSearchCriteriaSchema>;
export type ChatDetail = z.infer<typeof ChatDetailSchema>;
export type MessageDetail = z.infer<typeof MessageDetailSchema>;
export type CreateChatRequest = z.infer<typeof CreateChatRequestSchema>;
export type SendMessageRequest = z.infer<typeof SendMessageRequestSchema>;
export type AddReactionRequest = z.infer<typeof AddReactionRequestSchema>;
export type MarkAsReadRequest = z.infer<typeof MarkAsReadRequestSchema>;
export type UserSearchResult = z.infer<typeof UserSearchResultSchema>;
