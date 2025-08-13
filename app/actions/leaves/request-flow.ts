'use server';

import { z } from 'zod';
import { getAdminSupabase } from '@/lib/leave/supabase-admin';
import { createClient } from '@supabase/supabase-js';
import { allocateLeave } from './allocate';
import { confirmLeave } from './confirm';
import { releaseLeave } from './release';
import { writeAudit } from '@/lib/audit';

const SubmitInput = z.object({
  requestId: z.string().uuid().optional(),
  userId: z.string().uuid(),
  leaveTypeId: z.string().uuid(),
  details: z.array(z.object({
    startAt: z.string().datetime(),
    endAt: z.string().datetime(),
    unit: z.enum(['day','half','hour']),
    quantity: z.number().positive(),
    reason: z.string().optional(),
  })).min(1),
  hoursPerDay: z.number().positive().default(8),
  policyMinUnit: z.enum(['1h','0.5d','1d']).default('1h'),
  manualGrantIds: z.array(z.string().uuid()).optional(),
  title: z.string().default('有給申請'),
});

export async function submitLeaveRequest(input: z.infer<typeof SubmitInput>) {
  const p = SubmitInput.parse(input);
  const sb = getAdminSupabase();

  const { data: st, error: stErr } = await sb
    .from('statuses').select('id,code').eq('code','leave_pending').single();
  if (stErr || !st?.id) throw new Error('pending status not found');

  let requestId = p.requestId as string | undefined;
  if (!requestId) {
    const { data: reqIns, error: reqErr } = await sb.from('requests').insert({
      request_form_id: null,
      user_id: p.userId,
      form_data: {},
      status_id: st.id,
      title: p.title,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }).select('id').single();
    if (reqErr) throw reqErr;
    requestId = reqIns.id as string;
  } else {
    const { error: upErr } = await sb
      .from('requests').update({ status_id: st.id, updated_at: new Date().toISOString() })
      .eq('id', requestId);
    if (upErr) throw upErr;
  }

  await sb.from('leave_request_details').delete().eq('request_id', requestId);
  const detailRows = p.details.map(d => ({
    request_id: requestId!,
    leave_type_id: p.leaveTypeId,
    start_at: d.startAt,
    end_at: d.endAt,
    quantity: d.quantity,
    unit: d.unit,
    reason: d.reason ?? null,
  }));
  const { error: detErr } = await sb.from('leave_request_details').insert(detailRows);
  if (detErr) throw detErr;

  // [A] ポリシー取得（会社解決のうえ leave_type_id に紐づくもの）
  const sbAnon = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, { auth: { persistSession: false } });
  const { data: vc } = await sbAnon.from('v_user_companies').select('company_id').eq('user_id', p.userId).single();
  const companyId = (vc as any)?.company_id as string | undefined;
  if (!companyId) throw new Error('company could not be resolved for the user');

  const { data: policy } = await sbAnon
    .from('leave_policies')
    .select('business_day_only, blackout_dates, company_id')
    .eq('leave_type_id', p.leaveTypeId)
    .eq('company_id', companyId)
    .single();

  // [B] 会社カレンダから営業日判定（DB関数）
  if ((policy as any)?.business_day_only) {
    for (const d of p.details) {
      const dateStr = new Date(d.startAt).toISOString().slice(0,10);
      const { data: okDay, error: dayErr } = await sb.rpc('fn_is_business_day', { p_company_id: companyId, p_date: dateStr });
      if (dayErr) throw dayErr;
      if (!okDay) {
        throw new Error(`非営業日またはブラックアウト日のため申請できません: ${dateStr}`);
      }
    }
  }

  // [C] 旧ポリシーの blackout_dates（配列）もチェック
  const blackoutDates = (policy as any)?.blackout_dates as string[] | undefined;
  if (blackoutDates?.length) {
    const blackSet = new Set<string>(blackoutDates);
    for (const d of p.details) {
      const dateStr = new Date(d.startAt).toISOString().slice(0,10);
      if (blackSet.has(dateStr)) {
        throw new Error(`ブラックアウト日に申請されています: ${dateStr}`);
      }
    }
  }

  await allocateLeave({
    userId: p.userId,
    leaveTypeId: p.leaveTypeId,
    requestId: requestId!,
    policyMinUnit: p.policyMinUnit,
    hoursPerDay: p.hoursPerDay,
    details: p.details,
    mode: 'hold',
    manualGrantIds: p.manualGrantIds,
  });

  await sb.from('request_approval_history').insert({
    request_id: requestId!,
    step_number: 1,
    action: 'delegate',
    comment: 'submitted',
    processed_at: new Date().toISOString(),
  });

  await writeAudit({
    userId: p.userId,
    action: 'leave_request_submitted',
    targetType: 'requests',
    targetId: requestId!,
    details: { count: p.details.length },
  });

  return { ok: true, requestId } as const;
}

const DecisionInput = z.object({
  requestId: z.string().uuid(),
  approverId: z.string().uuid().optional(),
  action: z.enum(['approve','reject','cancel']),
  comment: z.string().optional(),
});

export async function decideLeaveRequest(input: z.infer<typeof DecisionInput>) {
  const p = DecisionInput.parse(input);
  const sb = getAdminSupabase();

  const { data: req, error: reqErr } = await sb
    .from('requests').select('id, user_id, status_id, title').eq('id', p.requestId).single();
  if (reqErr || !req) throw new Error('request not found');

  const needCodes = ['leave_approved','leave_rejected','leave_canceled'];
  const { data: sts, error: stsErr } = await sb
    .from('statuses').select('id,code').in('code', needCodes);
  if (stsErr) throw stsErr;

  const idOf = (code: string) => sts?.find(s => s.code === code)?.id;

  if (p.action === 'approve') {
    await confirmLeave({ requestId: p.requestId });
    await sb.from('requests').update({
      status_id: idOf('leave_approved'),
      updated_at: new Date().toISOString(),
      approved_by: p.approverId ?? null,
      approved_at: new Date().toISOString(),
    }).eq('id', p.requestId);

    await sb.from('request_approval_history').insert({
      request_id: p.requestId,
      step_number: 1,
      approver_id: p.approverId ?? null,
      action: 'approve',
      comment: p.comment ?? null,
      processed_at: new Date().toISOString(),
    });

    await writeAudit({
      userId: p.approverId,
      action: 'leave_request_approved',
      targetType: 'requests',
      targetId: p.requestId,
    });

    return { ok: true, status: 'approved' } as const;
  }

  if (p.action === 'reject') {
    await releaseLeave({ requestId: p.requestId, mode: 'reject_hold' });
    await sb.from('requests').update({
      status_id: idOf('leave_rejected'),
      updated_at: new Date().toISOString(),
    }).eq('id', p.requestId);

    await sb.from('request_approval_history').insert({
      request_id: p.requestId,
      step_number: 1,
      approver_id: p.approverId ?? null,
      action: 'reject',
      comment: p.comment ?? null,
      processed_at: new Date().toISOString(),
    });

    await writeAudit({
      userId: p.approverId,
      action: 'leave_request_rejected',
      targetType: 'requests',
      targetId: p.requestId,
    });

    return { ok: true, status: 'rejected' } as const;
  }

  if (p.action === 'cancel') {
    await releaseLeave({ requestId: p.requestId, mode: 'reverse_confirmed', reason: p.comment ?? 'cancel' });
    await sb.from('requests').update({
      status_id: idOf('leave_canceled'),
      updated_at: new Date().toISOString(),
    }).eq('id', p.requestId);

    await sb.from('request_approval_history').insert({
      request_id: p.requestId,
      step_number: 1,
      approver_id: p.approverId ?? null,
      action: 'return',
      comment: p.comment ?? null,
      processed_at: new Date().toISOString(),
    });

    await writeAudit({
      userId: p.approverId,
      action: 'leave_request_canceled',
      targetType: 'requests',
      targetId: p.requestId,
    });

    return { ok: true, status: 'canceled' } as const;
  }

  throw new Error('unknown action');
}


