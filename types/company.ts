/**
 * TimePort 会社・組織関連型定義
 *
 * 会社、グループ、組織階層に関する型を定義
 */

import type { BaseEntity, UUID, Timestamp, Settings, CreateInput, UpdateInput } from './common';

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
  created_at: string;
  updated_at: string;
  deleted_at?: string;
}

/**
 * 会社作成用入力型（厳密な型定義）
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
  is_active: boolean;
}

/**
 * 会社更新用入力型（厳密な型定義）
 */
export interface UpdateCompanyInput extends UpdateInput<Company> {
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

/**
 * 会社作成用フォーム型（UI用）
 */
export interface CreateCompanyFormData {
  // 企業情報
  name: string;
  code: string;
  address: string;
  phone: string;
  is_active: boolean;

  // グループ情報
  group_name: string;

  // 管理者ユーザー情報
  admin_code: string;
  admin_family_name: string;
  admin_first_name: string;
  admin_family_name_kana: string;
  admin_first_name_kana: string;
  admin_email: string;
  admin_password: string;
}

/**
 * 会社編集用フォーム型（UI用）
 */
export interface EditCompanyFormData {
  name: string;
  code: string;
  address: string;
  phone: string;
  is_active: boolean;
}

// ================================
// 会社クエリ型
// ================================

/**
 * 会社検索条件
 */
export interface CompanySearchParams {
  /** 検索キーワード */
  search?: string;
  /** ステータスフィルター */
  status?: 'all' | 'active' | 'inactive';
  /** ページ番号 */
  page?: number;
  /** 1ページあたりの件数 */
  limit?: number;
  /** ソートフィールド */
  orderBy?: keyof Company;
  /** 昇順/降順 */
  ascending?: boolean;
}

/**
 * 会社一覧レスポンス
 */
export interface CompanyListResponse {
  /** 会社一覧 */
  companies: Company[];
  /** 総件数 */
  total: number;
  /** アクティブ件数 */
  activeCount: number;
  /** 削除済み件数 */
  deletedCount: number;
  /** ページネーション情報 */
  pagination: {
    page: number;
    limit: number;
    totalPages: number;
    hasMore: boolean;
    hasPrevious: boolean;
  };
}

// ================================
// 会社操作結果型
// ================================

/**
 * 会社作成結果
 */
export interface CreateCompanyResult {
  /** 作成された会社 */
  company: Company;
  /** 作成されたグループID */
  groupId: UUID;
  /** 作成された管理者ユーザーID */
  adminUserId: UUID;
}

/**
 * 会社更新結果
 */
export interface UpdateCompanyResult {
  /** 更新された会社 */
  company: Company;
  /** 更新されたフィールド */
  updatedFields: (keyof UpdateCompanyInput)[];
}

/**
 * 会社削除結果
 */
export interface DeleteCompanyResult {
  /** 削除された会社ID */
  companyId: UUID;
  /** 削除日時 */
  deletedAt: Timestamp;
}

// ================================
// 会社統計型
// ================================

/**
 * 会社統計情報
 */
export interface CompanyStats {
  /** 総会社数 */
  total: number;
  /** アクティブ会社数 */
  active: number;
  /** 無効会社数 */
  inactive: number;
  /** 削除済み会社数 */
  deleted: number;
  /** 今月作成された会社数 */
  createdThisMonth: number;
  /** 今月更新された会社数 */
  updatedThisMonth: number;
}

// ================================
// 会社バリデーション型
// ================================

/**
 * 会社バリデーションエラー
 */
export interface CompanyValidationError {
  /** フィールド名 */
  field: keyof CreateCompanyFormData | keyof EditCompanyFormData;
  /** エラーメッセージ */
  message: string;
  /** エラーコード */
  code: string;
}

/**
 * 会社バリデーション結果
 */
export interface CompanyValidationResult {
  /** バリデーション成功フラグ */
  isValid: boolean;
  /** エラー一覧 */
  errors: CompanyValidationError[];
}
