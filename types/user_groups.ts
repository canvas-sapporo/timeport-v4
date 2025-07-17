// ユーザーグループ型定義
import type { UUID } from './common';

export interface UserGroup {
  id: UUID;
  user_id: UUID;
  group_id: UUID;
  created_at: string;
  updated_at: string;
  deleted_at?: string;
} 