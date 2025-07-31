import { z } from 'zod';

import type { UUID } from '@/types/common';

// ================================
// グループ関連API型スキーマ
// ================================

/**
 * グループ取得パラメータスキーマ
 */
export const GetGroupsParamsSchema = z.object({
  company_id: z.string().uuid().optional(),
  parent_group_id: z.string().uuid().optional(),
  level: z.number().optional(),
  page: z.number().optional(),
  limit: z.number().optional(),
  search: z.string().optional(),
  sort_by: z.string().optional(),
  sort_order: z.enum(['asc', 'desc']).optional(),
  include: z.array(z.string()).optional(),
  exclude: z.array(z.string()).optional(),
});

/**
 * グループ作成リクエストスキーマ
 */
export const CreateGroupRequestSchema = z.object({
  company_id: z.string().uuid(),
  parent_group_id: z.string().uuid().optional(),
  code: z.string().optional(),
  name: z.string(),
  description: z.string().optional(),
});

/**
 * グループ更新リクエストスキーマ
 */
export const UpdateGroupRequestSchema = z.object({
  parent_group_id: z.string().uuid().optional(),
  code: z.string().optional(),
  name: z.string().optional(),
  description: z.string().optional(),
});

// グループ関連API型
export type GetGroupsParams = z.infer<typeof GetGroupsParamsSchema>;
export type CreateGroupRequest = z.infer<typeof CreateGroupRequestSchema>;
export type UpdateGroupRequest = z.infer<typeof UpdateGroupRequestSchema>;
