import { z } from 'zod';

// ================================
// 通知テンプレート関連型
// ================================

/**
 * 通知タイプ
 */
export const NotificationTypeSchema = z.enum(['info', 'warning', 'error', 'success']);

/**
 * 通知優先度
 */
export const NotificationPrioritySchema = z.enum(['low', 'normal', 'high', 'urgent']);

/**
 * 通知テンプレート変数
 */
export const NotificationTemplateVariableSchema = z.object({
  /** 変数名 */
  name: z.string(),
  /** 説明 */
  description: z.string(),
  /** 必須フラグ */
  required: z.boolean(),
});

/**
 * 通知テンプレート
 */
export const NotificationTemplateSchema = z.object({
  /** テンプレートID */
  id: z.string(),
  /** テンプレートコード */
  code: z.string(),
  /** タイトルテンプレート */
  title_template: z.string(),
  /** メッセージテンプレート */
  message_template: z.string(),
  /** 通知タイプ */
  type: NotificationTypeSchema,
  /** 優先度 */
  priority: NotificationPrioritySchema,
  /** 有効期限（時間） */
  expiry_hours: z.number().optional(),
  /** 変数定義 */
  variables: z.array(NotificationTemplateVariableSchema),
});

// ================================
// 型定義のエクスポート
// ================================

export type NotificationType = z.infer<typeof NotificationTypeSchema>;
export type NotificationPriority = z.infer<typeof NotificationPrioritySchema>;
export type NotificationTemplateVariable = z.infer<typeof NotificationTemplateVariableSchema>;
export type NotificationTemplate = z.infer<typeof NotificationTemplateSchema>;
