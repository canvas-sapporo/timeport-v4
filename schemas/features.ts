import { z } from 'zod';

// ================================
// 機能関連スキーマ
// ================================

/**
 * 機能設定スキーマ
 */
export const FeatureSettingsSchema = z.object({
  limits: z
    .object({
      max_users: z.number().int().min(0).optional(),
      max_requests_per_day: z.number().int().min(0).optional(),
      max_file_size_mb: z.number().int().min(0).optional(),
    })
    .optional(),
  notifications: z
    .object({
      email_enabled: z.boolean().optional(),
      sms_enabled: z.boolean().optional(),
      push_enabled: z.boolean().optional(),
    })
    .optional(),
  ui_config: z
    .object({
      theme: z.string().optional(),
      layout: z.string().optional(),
      custom_css: z.string().optional(),
    })
    .optional(),
  business_rules: z.record(z.string(), z.unknown()).optional(),
});

/**
 * 機能スキーマ
 */
export const FeatureSchema = z.object({
  id: z.string().uuid(),
  feature_code: z.string(),
  feature_name: z.string(),
  description: z.string().optional(),
  company_id: z.string().uuid(),
  is_active: z.boolean(),
  settings: FeatureSettingsSchema,
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
  deleted_at: z.string().datetime().optional(),
});

/**
 * 会社機能スキーマ
 */
export const CompanyFeaturesSchema = z.object({
  company_id: z.string().uuid(),
  company_name: z.string(),
  features: z.object({
    chat: z.boolean(),
    report: z.boolean(),
    schedule: z.boolean(),
  }),
});

/**
 * 機能切り替えリクエストスキーマ
 */
export const FeatureToggleRequestSchema = z.object({
  company_id: z.string().uuid(),
  feature_code: z.string(),
  is_active: z.boolean(),
});

/**
 * 機能更新リクエストスキーマ
 */
export const FeatureUpdateRequestSchema = z.object({
  chat: z.boolean(),
  report: z.boolean(),
  schedule: z.boolean(),
});

/**
 * 機能切り替え結果スキーマ
 */
export const FeatureToggleResultSchema = z.object({
  company_id: z.string().uuid(),
  feature_code: z.string(),
  is_active: z.boolean(),
  updated_at: z.string().datetime(),
});

/**
 * 機能更新結果スキーマ
 */
export const FeatureUpdateResultSchema = z.array(z.any());

/**
 * 機能作成結果スキーマ
 */
export const FeatureCreateResultSchema = z.array(z.any());

/**
 * 機能状態確認結果スキーマ
 */
export const FeatureStatusResultSchema = z.object({
  chat: z.boolean(),
  report: z.boolean(),
  schedule: z.boolean(),
});

// 機能関連
export type FeatureSettings = z.infer<typeof FeatureSettingsSchema>;
export type FeatureData = z.infer<typeof FeatureSchema>;
export type CompanyFeatures = z.infer<typeof CompanyFeaturesSchema>;
export type FeatureToggleRequest = z.infer<typeof FeatureToggleRequestSchema>;
export type FeatureUpdateRequest = z.infer<typeof FeatureUpdateRequestSchema>;
export type FeatureToggleResult = z.infer<typeof FeatureToggleResultSchema>;
export type FeatureUpdateResult = z.infer<typeof FeatureUpdateResultSchema>;
export type FeatureCreateResult = z.infer<typeof FeatureCreateResultSchema>;
export type FeatureStatusResult = z.infer<typeof FeatureStatusResultSchema>;
