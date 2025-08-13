'use server';

import { z } from 'zod';
import { getAdminSupabase } from '@/lib/leave/supabase-admin';
import { LeaveRequestDetailInput } from '@/schemas/leave';
import { writeAudit } from '@/lib/audit';

// 入力：UI側でdetailsを用意（unit: day/half/hour, quantityはUI入力）
// needsはこの関数内で「日付ごとの合計時間(h)」に正規化します。
const AllocateInput = z.object({
  userId: z.string().uuid(),
  leaveTypeId: z.string().uuid(),
  requestId: z.string().uuid(),
  policyMinUnit: z.enum(['1h','0.5d','1d']).default('1h'),
  hoursPerDay: z.number().positive().default(8),
  details: z.array(z.object({
    startAt: z.string().datetime(),
    endAt: z.string().datetime(),
    unit: z.enum(['day','half','hour']),
    quantity: z.number().positive(),
  })).min(1),
  mode: z.enum(['hold','confirm']).default('hold'),
  manualGrantIds: z.array(z.string().uuid()).optional(),
});

export type AllocateInputType = z.infer<typeof AllocateInput>;

export async function allocateLeave(input: AllocateInputType) {
  const parsed = AllocateInput.parse(input);
  const { userId, leaveTypeId, requestId, hoursPerDay, policyMinUnit, details, mode, manualGrantIds } = parsed;

  // 1) details を「日付→合計時間(h)」に集約
  const byDate = new Map<string, number>();

  for (const d of details as LeaveRequestDetailInput[]) {
    const start = new Date(d.startAt);
    const end   = new Date(d.endAt);

    if (!(start.getTime() < end.getTime())) {
      throw new Error('startAt must be before endAt');
    }

    // 今回は「1明細=同じ日内」を推奨。もし日跨ぎあれば日割り分解はStep5で行う想定。
    const dateKey = `${start.getFullYear()}-${String(start.getMonth()+1).padStart(2,'0')}-${String(start.getDate()).padStart(2,'0')}`;

    let hours = 0;
    if (d.unit === 'hour') hours = d.quantity;
    if (d.unit === 'half') hours = (hoursPerDay / 2) * d.quantity;
    if (d.unit === 'day')  hours = hoursPerDay * d.quantity;

    // minUnit 四捨五入（簡易: 1hのみ厳密、他は事前丸め前提）
    const rounded = policyMinUnit === '1h' ? Math.round(hours) : hours;

    byDate.set(dateKey, (byDate.get(dateKey) ?? 0) + rounded);
  }

  const needs = Array.from(byDate.entries()).map(([consumed_on, quantity]) => ({
    consumed_on,
    quantity
  }));

  const supabase = getAdminSupabase();

  const { data, error } = await supabase.rpc('fn_allocate_leave', {
    p_user_id: userId,
    p_leave_type_id: leaveTypeId,
    p_request_id: requestId,
    p_needs: needs as any,
    p_is_hold: mode === 'hold',
    p_manual_grant_ids: manualGrantIds ?? null,
  });

  if (error) {
    throw new Error(`allocateLeave failed: ${error.message}`);
  }
  await writeAudit({
    userId,
    action: parsed.mode === 'hold' ? 'leave_allocate_hold' : 'leave_allocate_confirm',
    targetType: 'leave_consumptions',
    details: { requestId, rows: (data as any)?.rows ?? [] },
  });
  return data as unknown;
}


