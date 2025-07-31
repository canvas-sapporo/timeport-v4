import { z } from 'zod';

// ================================
// Webhook・統合型スキーマ
// ================================

/**
 * Webhook設定スキーマ
 */
export const WebhookConfigSchema = z.object({
  id: z.string(),
  name: z.string(),
  url: z.string(),
  events: z.array(z.string()),
  secret: z.string().optional(),
  is_active: z.boolean(),
  retry_count: z.number(),
  timeout: z.number(),
});

/**
 * Webhookペイロードスキーマ
 */
export const WebhookPayloadSchema = z.object({
  event: z.string(),
  timestamp: z.string(),
  data: z.record(z.unknown()),
  signature: z.string().optional(),
});

/**
 * Webhook送信結果スキーマ
 */
export const WebhookResultSchema = z.object({
  success: z.boolean(),
  status_code: z.number(),
  response_time: z.number(),
  error: z.string().optional(),
  retry_count: z.number(),
});

// Webhook・統合型
export type WebhookConfig = z.infer<typeof WebhookConfigSchema>;
export type WebhookPayload = z.infer<typeof WebhookPayloadSchema>;
export type WebhookResult = z.infer<typeof WebhookResultSchema>;
