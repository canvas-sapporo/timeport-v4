import { z } from 'zod';

// ================================
// システム設定関連API型スキーマ
// ================================

/**
 * システム設定レスポンススキーマ
 */
export const SystemSettingsResponseSchema = z.object({
  success: z.boolean(),
  data: z
    .object({
      company: z.object({
        name: z.string(),
        timezone: z.string(),
      }),
      working_hours: z.object({
        start: z.string(),
        end: z.string(),
        break_duration: z.number(),
      }),
      features: z.record(z.boolean()),
      notifications: z.record(z.boolean()),
    })
    .optional(),
  error: z
    .object({
      message: z.string(),
      code: z.string().optional(),
    })
    .optional(),
});

/**
 * システム設定更新リクエストスキーマ
 */
export const UpdateSystemSettingsRequestSchema = z.object({
  company: z
    .object({
      name: z.string().optional(),
      timezone: z.string().optional(),
    })
    .optional(),
  working_hours: z
    .object({
      start: z.string().optional(),
      end: z.string().optional(),
      break_duration: z.number().optional(),
    })
    .optional(),
  features: z.record(z.boolean()).optional(),
  notifications: z.record(z.boolean()).optional(),
});

// システム設定関連API型
export type SystemSettingsResponse = z.infer<typeof SystemSettingsResponseSchema>;
export type UpdateSystemSettingsRequest = z.infer<typeof UpdateSystemSettingsRequestSchema>;
