// ユーザープロフィール型定義
import type { UUID } from './common';

export interface UserProfile {
  id: UUID;
  code: string; // 必須項目に変更
  family_name: string;
  first_name: string;
  family_name_kana: string;
  first_name_kana: string;
  email: string;
  phone?: string;
  role: 'system-admin' | 'admin' | 'member';
  employment_type_id?: UUID; // 後で必須にする予定
  current_work_type_id?: UUID; // 後で必須にする予定
  is_active: boolean;
  chat_send_key_shift_enter: boolean; // チャット送信キー設定: true=Shift+Enter, false=Enter
  created_at: string;
  updated_at: string;
  deleted_at?: string;
}

// ユーザー作成用の型定義
export interface CreateUserProfileInput {
  code: string;
  family_name: string;
  first_name: string;
  family_name_kana: string;
  first_name_kana: string;
  email: string;
  phone?: string;
  role: 'admin' | 'member';
  employment_type_id?: UUID;
  current_work_type_id?: UUID;
  group_ids: UUID[]; // 複数グループ選択
}

// ユーザー更新用の型定義
export interface UpdateUserProfileInput {
  code?: string;
  family_name?: string;
  first_name?: string;
  family_name_kana?: string;
  first_name_kana?: string;
  email?: string;
  phone?: string;
  role?: 'admin' | 'member';
  employment_type_id?: UUID;
  current_work_type_id?: UUID;
  group_ids?: UUID[]; // 複数グループ選択
  is_active?: boolean;
}

// ユーザー検索用の型定義
export interface UserSearchParams {
  company_id?: UUID;
  search?: string;
  role?: 'admin' | 'member';
  is_active?: boolean;
  group_id?: UUID;
  page?: number;
  limit?: number;
}

// ================================
// ユーザー会社関連の型定義
// ================================

/**
 * ユーザーの会社情報
 */
export interface UserCompanyInfo {
  /** 会社ID */
  company_id: UUID;
  /** 会社名 */
  company_name: string;
  /** 会社コード */
  company_code: string;
  /** グループID */
  group_id: UUID;
  /** グループ名 */
  group_name: string;
}

/**
 * ユーザーの会社ID取得結果
 */
export interface GetUserCompanyResult {
  /** 成功フラグ */
  success: boolean;
  /** 会社情報 */
  company_info?: UserCompanyInfo;
  /** エラーメッセージ */
  error?: string;
}

// ================================
// ユーザー会社関連のユーティリティ関数
// ================================

/**
 * ユーザーIDから会社IDを取得する関数の型定義
 * 実装は lib/utils/user.ts に配置
 */
export type GetUserCompanyFunction = (userId: UUID) => Promise<GetUserCompanyResult>;

/**
 * ユーザーIDから会社IDを取得する関数（同期版）
 * 実装は lib/utils/user.ts に配置
 */
export type GetUserCompanySyncFunction = (userId: UUID) => GetUserCompanyResult | null;
