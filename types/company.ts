/**
 * TimePort 会社・組織関連型定義
 * 
 * 会社、グループ、組織階層に関する型を定義
 */

import type { BaseEntity, UUID, Timestamp, Settings } from './common';

// ================================
// 会社型
// ================================

/**
 * 会社エンティティ
 */
export interface Company extends BaseEntity {
  /** 会社名 */
  name: string;
  /** 会社コード */
  code: string;
  /** 住所 */
  address?: string;
  /** 電話番号 */
  phone?: string;
  /** 有効フラグ */
  is_active: boolean;
}

/**
 * 会社作成用入力型
 */
export interface CreateCompanyInput {
  /** 会社名 */
  name: string;
  /** 会社コード */
  code: string;
  /** 住所 */
  address?: string;
  /** 電話番号 */
  phone?: string;
  /** 有効フラグ */
  is_active?: boolean;
}

/**
 * 会社更新用入力型
 */
export interface UpdateCompanyInput {
  /** 会社名 */
  name?: string;
  /** 会社コード */
  code?: string;
  /** 住所 */
  address?: string;
  /** 電話番号 */
  phone?: string;
  /** 有効フラグ */
  is_active?: boolean;
}