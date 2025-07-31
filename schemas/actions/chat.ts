import { z } from 'zod';

// ================================
// チャット関連スキーマ
// ================================

/**
 * チャット作成リクエストスキーマ
 */
export const CreateChatRequestSchema = z.object({
  name: z.string().optional(),
  type: z.enum(['direct', 'group']),
  participants: z.array(z.string()),
  company_id: z.string(),
});

/**
 * メッセージ送信リクエストスキーマ
 */
export const SendMessageRequestSchema = z.object({
  chat_id: z.string(),
  content: z.string(),
  user_id: z.string(),
});

/**
 * メッセージ既読リクエストスキーマ
 */
export const MarkAsReadRequestSchema = z.object({
  chat_id: z.string(),
  user_id: z.string(),
});

/**
 * リアクション追加リクエストスキーマ
 */
export const AddReactionRequestSchema = z.object({
  message_id: z.string(),
  user_id: z.string(),
  reaction_type: z.string(),
});

// チャット関連型
export type CreateChatRequest = z.infer<typeof CreateChatRequestSchema>;
export type SendMessageRequest = z.infer<typeof SendMessageRequestSchema>;
export type MarkAsReadRequest = z.infer<typeof MarkAsReadRequestSchema>;
export type AddReactionRequest = z.infer<typeof AddReactionRequestSchema>;
