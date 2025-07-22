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
