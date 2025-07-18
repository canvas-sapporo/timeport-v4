// グループ型定義
import type { UUID } from './common';

export interface Group {
  id: UUID;
  company_id: UUID;
  parent_group_id?: UUID;
  code?: string;
  name: string;
  description?: string;
  created_at: string;
  updated_at: string;
  deleted_at?: string;
}
