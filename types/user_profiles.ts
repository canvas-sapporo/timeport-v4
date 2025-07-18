// ユーザープロフィール型定義
import type { UUID } from './common';

export interface UserProfile {
  id: UUID;
  code?: string;
  family_name: string;
  first_name: string;
  family_name_kana: string;
  first_name_kana: string;
  email: string;
  phone?: string;
  role: 'system-admin' | 'admin' | 'member';
  employment_type_id?: UUID;
  current_work_type_id?: UUID;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  deleted_at?: string;
}
