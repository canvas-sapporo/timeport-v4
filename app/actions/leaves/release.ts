'use server';

import { z } from 'zod';
import { getAdminSupabase } from '@/lib/leave/supabase-admin';

const ReleaseInput = z.object({
  requestId: z.string().uuid(),
  mode: z.enum(['reject_hold','reverse_confirmed']).default('reject_hold'),
  reason: z.string().optional(),
});

export async function releaseLeave(input: { requestId: string; mode?: 'reject_hold'|'reverse_confirmed'; reason?: string }) {
  const parsed = ReleaseInput.parse(input);
  const supabase = getAdminSupabase();

  if (parsed.mode === 'reject_hold') {
    const { error } = await supabase.rpc('fn_release_leave', { p_request_id: parsed.requestId });
    if (error) throw new Error(`releaseLeave (hold) failed: ${error.message}`);
    return { ok: true, mode: parsed.mode } as const;
  }

  const { data, error } = await supabase.rpc('fn_reverse_confirmed_leave', {
    p_request_id: parsed.requestId,
    p_reason: parsed.reason ?? 'reverse',
  });
  if (error) throw new Error(`releaseLeave (reverse) failed: ${error.message}`);
  return { ok: true, mode: parsed.mode, reversed: data } as const;
}


