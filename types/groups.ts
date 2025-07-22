// グループ型定義
import type { UUID } from './common';

export interface Group {
  id: UUID;
  company_id: UUID;
  parent_group_id?: UUID;
  code?: string;
  name: string;
  description?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  deleted_at?: string;
}

// グループ管理用の型定義
export interface CreateGroupFormData {
  name: string;
  code?: string;
  description?: string;
}

export interface EditGroupFormData {
  name: string;
  code?: string;
  description?: string;
}

export interface CreateGroupResult {
  id: UUID;
  name: string;
  code?: string;
  description?: string;
  created_at: string;
  updated_at: string;
}

export interface UpdateGroupResult {
  id: UUID;
  name: string;
  code?: string;
  description?: string;
  updated_at: string;
}

export interface DeleteGroupResult {
  id: UUID;
  deleted_at: string;
}

export interface GroupListResponse {
  groups: Group[];
  total: number;
  page: number;
  limit: number;
}

export interface GroupSearchParams {
  page?: number;
  limit?: number;
  search?: string;
  company_id?: UUID;
}

export interface GroupStats {
  total: number;
  active: number;
  inactive: number;
}

export interface GroupValidationResult {
  isValid: boolean;
  errors: Array<{
    field: keyof CreateGroupFormData | keyof EditGroupFormData;
    message: string;
    code: string;
  }>;
}
