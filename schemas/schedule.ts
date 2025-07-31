import { z } from 'zod';

// ================================
// スケジュール関連スキーマ
// ================================

/**
 * 繰り返しタイプスキーマ
 */
export const RecurrenceTypeSchema = z.enum(['none', 'daily', 'weekly', 'monthly', 'yearly']);

/**
 * スケジュールスキーマ
 */
export const ScheduleSchema = z.object({
  id: z.string().uuid(),
  user_id: z.string().uuid(),
  title: z.string(),
  description: z.string().optional(),
  start_datetime: z.string().datetime(),
  end_datetime: z.string().datetime(),
  location: z.string().optional(),
  url: z.string().optional(),
  is_all_day: z.boolean(),
  recurrence_type: RecurrenceTypeSchema,
  recurrence_interval: z.number().int().min(1),
  recurrence_end_date: z.string().optional(),
  shared_with_groups: z.array(z.string().uuid()),
  is_private: z.boolean(),
  color: z.string(),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
  deleted_at: z.string().datetime().optional(),
});

/**
 * スケジュール作成用入力スキーマ
 */
export const CreateScheduleInputSchema = z.object({
  title: z.string(),
  description: z.string().optional(),
  start_datetime: z.string().datetime(),
  end_datetime: z.string().datetime(),
  location: z.string().optional(),
  url: z.string().optional(),
  is_all_day: z.boolean().optional(),
  recurrence_type: RecurrenceTypeSchema.optional(),
  recurrence_interval: z.number().int().min(1).optional(),
  recurrence_end_date: z.string().optional(),
  shared_with_groups: z.array(z.string().uuid()).optional(),
  is_private: z.boolean().optional(),
  color: z.string().optional(),
});

// ================================
// Todo関連スキーマ
// ================================

/**
 * Todo優先度スキーマ
 */
export const TodoPrioritySchema = z.enum(['low', 'medium', 'high', 'urgent']);

/**
 * Todoステータススキーマ
 */
export const TodoStatusSchema = z.enum(['pending', 'in_progress', 'completed', 'cancelled']);

/**
 * Todoスキーマ
 */
export const TodoSchema = z.object({
  id: z.string().uuid(),
  user_id: z.string().uuid(),
  title: z.string(),
  description: z.string().optional(),
  due_date: z.string().optional(),
  due_time: z.string().optional(),
  priority: TodoPrioritySchema,
  status: TodoStatusSchema,
  category: z.string().optional(),
  tags: z.array(z.string()),
  estimated_hours: z.number().min(0).optional(),
  actual_hours: z.number().min(0).optional(),
  completion_rate: z.number().min(0).max(100),
  shared_with_groups: z.array(z.string().uuid()),
  is_private: z.boolean(),
  completed_at: z.string().datetime().optional(),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
  deleted_at: z.string().datetime().optional(),
});

/**
 * Todo作成用入力スキーマ
 */
export const CreateTodoInputSchema = z.object({
  title: z.string(),
  description: z.string().optional(),
  due_date: z.string().optional(),
  due_time: z.string().optional(),
  priority: TodoPrioritySchema.optional(),
  category: z.string().optional(),
  tags: z.array(z.string()).optional(),
  estimated_hours: z.number().min(0).optional(),
  shared_with_groups: z.array(z.string().uuid()).optional(),
  is_private: z.boolean().optional(),
});

// ================================
// 検索・フィルター関連スキーマ
// ================================

/**
 * スケジュール検索条件スキーマ
 */
export const ScheduleSearchCriteriaSchema = z.object({
  start_date: z.string().optional(),
  end_date: z.string().optional(),
  keyword: z.string().optional(),
  shared_only: z.boolean().optional(),
  group_ids: z.array(z.string().uuid()).optional(),
});

/**
 * Todo検索条件スキーマ
 */
export const TodoSearchCriteriaSchema = z.object({
  status: z.array(TodoStatusSchema).optional(),
  priority: z.array(TodoPrioritySchema).optional(),
  category: z.string().optional(),
  tags: z.array(z.string()).optional(),
  due_date_from: z.string().optional(),
  due_date_to: z.string().optional(),
  keyword: z.string().optional(),
  shared_only: z.boolean().optional(),
});

// スケジュール関連
export type RecurrenceType = z.infer<typeof RecurrenceTypeSchema>;
export type Schedule = z.infer<typeof ScheduleSchema>;
export type CreateScheduleInput = z.infer<typeof CreateScheduleInputSchema>;

// Todo関連
export type TodoPriority = z.infer<typeof TodoPrioritySchema>;
export type TodoStatus = z.infer<typeof TodoStatusSchema>;
export type Todo = z.infer<typeof TodoSchema>;
export type CreateTodoInput = z.infer<typeof CreateTodoInputSchema>;

// 検索・フィルター関連
export type ScheduleSearchCriteria = z.infer<typeof ScheduleSearchCriteriaSchema>;
export type TodoSearchCriteria = z.infer<typeof TodoSearchCriteriaSchema>;
