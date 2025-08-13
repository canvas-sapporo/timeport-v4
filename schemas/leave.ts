import { z } from 'zod';

export const LeaveUnitSchema = z.enum(['day', 'half', 'hour']);

export const LeaveRequestDetailInputSchema = z.object({
  leave_type_id: z.string().uuid(),
  start_at: z.string().datetime(),
  end_at: z.string().datetime(),
  unit: LeaveUnitSchema,
  quantity_minutes: z.number().int().positive(),
  reason: z.string().max(1000).optional(),
});

export const LeavePolicyInputSchema = z.object({
  day_hours: z.number().int().min(1).max(24),
  min_booking_unit_minutes: z.number().int().min(1).max(480),
  rounding_minutes: z.number().int().min(1).max(240),
  allowed_units: z.array(LeaveUnitSchema).nonempty(),
  half_day_mode: z.enum(['fixed_hours', 'am_pm']),
  allow_multi_day: z.boolean().default(true),
});

export type LeaveUnit = z.infer<typeof LeaveUnitSchema>;
export type LeaveRequestDetailInput = z.infer<typeof LeaveRequestDetailInputSchema>;
export type LeavePolicyInput = z.infer<typeof LeavePolicyInputSchema>;


