import { z } from 'zod';

// ================================
// 設定関連スキーマ
// ================================

/**
 * 設定保存パラメータスキーマ
 */
export const SettingSaveParamsSchema = z.object({
  userId: z.string(),
  role: z.enum(['system-admin', 'admin', 'member']),
  settingType: z.string(),
  settingKey: z.string(),
  settingValue: z.record(z.unknown()),
  isDefault: z.boolean().optional(),
});

/**
 * 設定取得パラメータスキーマ
 */
export const SettingGetParamsSchema = z.object({
  userId: z.string(),
  role: z.enum(['system-admin', 'admin', 'member']),
  settingType: z.string(),
  settingKey: z.string(),
});

/**
 * 機能設定スキーマ
 */
export const FeatureConfigSchema = z.object({
  chat: z.boolean(),
  report: z.boolean(),
  schedule: z.boolean(),
});

/**
 * 機能切り替えリクエストスキーマ
 */
export const FeatureToggleRequestSchema = z.object({
  company_id: z.string(),
  feature_code: z.string(),
  is_active: z.boolean(),
});

// 設定関連型
export type SettingSaveParams = z.infer<typeof SettingSaveParamsSchema>;
export type SettingGetParams = z.infer<typeof SettingGetParamsSchema>;
export type FeatureConfig = z.infer<typeof FeatureConfigSchema>;
export type FeatureToggleRequest = z.infer<typeof FeatureToggleRequestSchema>;
