import { z } from 'zod';

import { BaseEntitySchema, UUIDSchema, DateStringSchema } from './base';

// ================================
// 組織・ユーザー関連型
// ================================

/**
 * 企業
 */
export const CompanySchema = BaseEntitySchema.extend({
  /** 企業名 */
  name: z.string(),
  /** 企業コード */
  code: z.string(),
  /** 住所 */
  address: z.string().optional(),
  /** 電話番号 */
  phone: z.string().optional(),
});

/**
 * グループ
 */
export const GroupSchema = BaseEntitySchema.extend({
  /** 企業ID */
  company_id: UUIDSchema,
  /** 親グループID */
  parent_group_id: UUIDSchema.optional(),
  /** グループコード */
  code: z.string().optional(),
  /** グループ名 */
  name: z.string(),
  /** 説明 */
  description: z.string().optional(),
  /** レベル */
  level: z.number(),
  /** パス */
  path: z.string(),
});

/**
 * ユーザーグループ
 */
export const UserGroupSchema = BaseEntitySchema.extend({
  /** ユーザーID */
  user_id: UUIDSchema,
  /** グループID */
  group_id: UUIDSchema,
});

/**
 * 雇用形態
 */
export const EmploymentTypeSchema = BaseEntitySchema.extend({
  /** 企業ID */
  company_id: UUIDSchema,
  /** 雇用形態コード */
  code: z.string().optional(),
  /** 雇用形態名 */
  name: z.string(),
  /** 説明 */
  description: z.string().optional(),
  /** 有効フラグ */
  is_active: z.boolean(),
  /** 表示順序 */
  display_order: z.number(),
});

/**
 * ユーザープロフィール
 */
export const UserProfileSchema = BaseEntitySchema.extend({
  /** ユーザーコード */
  code: z.string().optional(),
  /** 名 */
  first_name: z.string(),
  /** 姓 */
  family_name: z.string(),
  /** メールアドレス */
  email: z.string().email(),
  /** ロール */
  role: z.enum(['system-admin', 'admin', 'member']),
  /** 主グループID */
  primary_group_id: UUIDSchema.optional(),
  /** 雇用形態ID */
  employment_type_id: UUIDSchema.optional(),
  /** 勤務開始日 */
  work_start_date: DateStringSchema.optional(),
  /** 勤務終了日 */
  work_end_date: DateStringSchema.optional(),
  /** 有効フラグ */
  is_active: z.boolean(),
});

// ================================
// 型定義のエクスポート
// ================================

export type Company = z.infer<typeof CompanySchema>;
export type Group = z.infer<typeof GroupSchema>;
export type UserGroup = z.infer<typeof UserGroupSchema>;
export type EmploymentType = z.infer<typeof EmploymentTypeSchema>;
export type UserProfile = z.infer<typeof UserProfileSchema>;
