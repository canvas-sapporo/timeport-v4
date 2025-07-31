import { z } from 'zod';

// ================================
// 通知・イベント型スキーマ
// ================================

/**
 * 通知メッセージスキーマ
 */
export const NotificationMessageSchema = z.object({
  id: z.string(),
  type: z.enum(['info', 'success', 'warning', 'error']),
  title: z.string(),
  message: z.string(),
  data: z.record(z.unknown()).optional(),
  created_at: z.string(),
  read_at: z.string().optional(),
});

/**
 * 通知設定スキーマ
 */
export const NotificationSettingsSchema = z.object({
  email: z.boolean(),
  push: z.boolean(),
  in_app: z.boolean(),
  frequency: z.enum(['immediate', 'daily', 'weekly']),
  categories: z.array(z.string()),
});

/**
 * 通知送信リクエストスキーマ
 */
export const NotificationSendRequestSchema = z.object({
  recipients: z.array(z.string()),
  type: z.string(),
  title: z.string(),
  message: z.string(),
  data: z.record(z.unknown()).optional(),
  priority: z.enum(['low', 'normal', 'high']).optional(),
  scheduled_at: z.string().optional(),
});

// 通知・イベント型
export type NotificationMessage = z.infer<typeof NotificationMessageSchema>;
export type NotificationSettings = z.infer<typeof NotificationSettingsSchema>;
export type NotificationSendRequest = z.infer<typeof NotificationSendRequestSchema>;
