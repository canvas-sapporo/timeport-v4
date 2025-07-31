import { z } from 'zod';

// ================================
// ログ・監査型スキーマ
// ================================

/**
 * アクティビティログスキーマ
 */
export const ActivityLogSchema = z.object({
  id: z.string(),
  user_id: z.string(),
  action: z.string(),
  resource_type: z.string(),
  resource_id: z.string(),
  details: z.record(z.unknown()),
  ip_address: z.string().optional(),
  user_agent: z.string().optional(),
  created_at: z.string(),
});

/**
 * 監査ログスキーマ
 */
export const AuditLogSchema = z.object({
  id: z.string(),
  user_id: z.string(),
  action: z.enum(['create', 'update', 'delete', 'login', 'logout', 'permission_change']),
  resource_type: z.string(),
  resource_id: z.string(),
  old_values: z.record(z.unknown()).optional(),
  new_values: z.record(z.unknown()).optional(),
  ip_address: z.string().optional(),
  user_agent: z.string().optional(),
  created_at: z.string(),
});

// ログ・監査型
export type ActivityLog = z.infer<typeof ActivityLogSchema>;
export type AuditLog = z.infer<typeof AuditLogSchema>;
