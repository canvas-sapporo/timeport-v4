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
}

// ================================
// グループ型
// ================================

/**
 * グループエンティティ（部署・チーム・勤務地等）
 */
export interface Group extends BaseEntity {
  /** 会社ID */
  company_id: UUID;
  /** 親グループID */
  parent_group_id?: UUID;
  /** グループコード */
  code?: string;
  /** グループ名 */
  name: string;
  /** 説明 */
  description?: string;
}

/**
 * グループ作成用入力型
 */
export interface CreateGroupInput {
  /** 会社ID */
  company_id: UUID;
  /** 親グループID */
  parent_group_id?: UUID;
  /** グループコード */
  code?: string;
  /** グループ名 */
  name: string;
  /** 説明 */
  description?: string;
}

/**
 * グループ更新用入力型
 */
export interface UpdateGroupInput {
  /** 親グループID */
  parent_group_id?: UUID;
  /** グループコード */
  code?: string;
  /** グループ名 */
  name?: string;
  /** 説明 */
  description?: string;
}

// ================================
// ユーザーグループ関連型
// ================================

/**
 * ユーザーグループ関連エンティティ
 */
export interface UserGroup extends BaseEntity {
  /** ユーザーID */
  user_id: UUID;
  /** グループID */
  group_id: UUID;
}

/**
 * ユーザーグループ関連作成用入力型
 */
export interface CreateUserGroupInput {
  /** ユーザーID */
  user_id: UUID;
  /** グループID */
  group_id: UUID;
}

// ================================
// 組織階層関連型
// ================================

/**
 * グループ階層情報
 */
export interface GroupHierarchy {
  /** グループID */
  id: UUID;
  /** グループ名 */
  name: string;
  /** グループコード */
  code?: string;
  /** 階層レベル（1=最上位） */
  level: number;
  /** 階層パス（/company/group1/group2） */
  path: string;
  /** 親グループID */
  parent_id?: UUID;
  /** 子グループ一覧 */
  children: GroupHierarchy[];
  /** 所属ユーザー数 */
  user_count: number;
}

/**
 * 組織ツリー構造
 */
export interface OrganizationTree {
  /** 会社情報 */
  company: Company;
  /** ルートグループ一覧 */
  root_groups: GroupHierarchy[];
  /** 総ユーザー数 */
  total_users: number;
  /** 総グループ数 */
  total_groups: number;
  /** 最大階層レベル */
  max_level: number;
}

// ================================
// グループ詳細型
// ================================

/**
 * グループ詳細情報（リレーション含む）
 */
export interface GroupDetail extends Group {
  /** 会社情報 */
  company: Company;
  /** 親グループ情報 */
  parent_group?: Group;
  /** 子グループ一覧 */
  child_groups: Group[];
  /** 所属ユーザー一覧 */
  users: Array<{
    id: UUID;
    full_name: string;
    email: string;
    role: string;
    is_primary: boolean;
  }>;
  /** 階層情報 */
  hierarchy: {
    level: number;
    path: string;
    breadcrumb: Array<{
      id: UUID;
      name: string;
    }>;
  };
  /** 統計情報 */
  statistics: {
    direct_user_count: number;
    total_user_count: number;
    child_group_count: number;
    depth: number;
  };
}

// ================================
// 組織管理型
// ================================

/**
 * 組織移動操作
 */
export interface OrganizationMoveOperation {
  /** 移動対象ID */
  target_id: UUID;
  /** 移動対象タイプ */
  target_type: 'user' | 'group';
  /** 移動先グループID */
  destination_group_id: UUID;
  /** 移動元グループID */
  source_group_id?: UUID;
}

/**
 * 組織統計情報
 */
export interface OrganizationStatistics {
  /** 会社ID */
  company_id: UUID;
  /** 総ユーザー数 */
  total_users: number;
  /** アクティブユーザー数 */
  active_users: number;
  /** 総グループ数 */
  total_groups: number;
  /** 階層レベル別グループ数 */
  groups_by_level: Record<number, number>;
  /** ロール別ユーザー数 */
  users_by_role: Record<string, number>;
  /** 最終更新日時 */
  last_updated: Timestamp;
}

// ================================
// 検索・フィルター型
// ================================

/**
 * グループ検索条件
 */
export interface GroupSearchCriteria {
  /** 会社ID */
  company_id?: UUID;
  /** 親グループID */
  parent_group_id?: UUID;
  /** 検索キーワード（名前・コード） */
  keyword?: string;
  /** 階層レベル */
  level?: number;
  /** 最小ユーザー数 */
  min_user_count?: number;
  /** 最大ユーザー数 */
  max_user_count?: number;
}

/**
 * ユーザーグループ検索条件
 */
export interface UserGroupSearchCriteria {
  /** ユーザーID */
  user_id?: UUID;
  /** グループID */
  group_id?: UUID;
  /** 会社ID */
  company_id?: UUID;
  /** 主所属のみ */
  primary_only?: boolean;
}

// ================================
// 組織変更履歴型
// ================================

/**
 * 組織変更履歴
 */
export interface OrganizationChangeHistory extends BaseEntity {
  /** 変更対象タイプ */
  target_type: 'company' | 'group' | 'user_group';
  /** 変更対象ID */
  target_id: UUID;
  /** 変更タイプ */
  change_type: 'create' | 'update' | 'delete' | 'move';
  /** 変更前データ */
  before_data?: Record<string, any>;
  /** 変更後データ */
  after_data?: Record<string, any>;
  /** 変更者ID */
  changed_by: UUID;
  /** 変更理由 */
  reason?: string;
}