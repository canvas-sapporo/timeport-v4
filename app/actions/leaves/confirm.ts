'use server';

import { z } from 'zod';
import { getAdminSupabase } from '@/lib/leave/supabase-admin';

const ConfirmInput = z.object({
  requestId: z.string().uuid(),
});

export async function confirmLeave(input: { requestId: string }) {
  const { requestId } = ConfirmInput.parse(input);
  const supabase = getAdminSupabase();
  const { error } = await supabase.rpc('fn_confirm_leave', { p_request_id: requestId });
  if (error) throw new Error(`confirmLeave failed: ${error.message}`);
  return { ok: true };
}


