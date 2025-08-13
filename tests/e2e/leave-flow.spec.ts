import { test, expect } from '@playwright/test';
import { createClient } from '@supabase/supabase-js';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const userId = process.env.E2E_USER_ID!;
const leaveTypeId = process.env.E2E_LEAVE_TYPE_ID!;

async function createRequest(sb: any) {
  const { data, error } = await sb
    .from('requests')
    .insert({
      request_form_id: null,
      user_id: userId,
      form_data: {},
      status_id: null,
      title: 'e2e leave',
      target_date: new Date().toISOString().slice(0, 10),
    })
    .select('id')
    .single();
  if (error) throw error;
  return data.id as string;
}

test('leave end-to-end flow with audit', async () => {
  const sb = createClient(url, key, { auth: { persistSession: false } });

  await sb.from('leave_consumptions').delete().eq('user_id', userId);

  const bal0 = await sb
    .from('v_leave_balances')
    .select('*')
    .eq('user_id', userId)
    .eq('leave_type_id', leaveTypeId);
  const before = bal0.data?.[0]?.balance_hours ?? 0;

  const { error: issueErr } = await sb.rpc('fn_issue_leave_grants', { p_company_id: null });
  expect(issueErr).toBeNull();

  const bal1 = await sb
    .from('v_leave_balances')
    .select('*')
    .eq('user_id', userId)
    .eq('leave_type_id', leaveTypeId);
  const afterGrant = bal1.data?.[0]?.balance_hours ?? 0;
  expect(afterGrant).toBeGreaterThanOrEqual(before);

  const requestId1 = await createRequest(sb);
  const needs = [{ consumed_on: new Date().toISOString().slice(0, 10), quantity: 2 }];
  const hold = await sb.rpc('fn_allocate_leave', {
    p_user_id: userId,
    p_leave_type_id: leaveTypeId,
    p_request_id: requestId1,
    p_needs: needs,
    p_is_hold: true,
    p_manual_grant_ids: null,
  });
  expect(hold.error).toBeNull();

  const bal2 = await sb
    .from('v_leave_balances')
    .select('*')
    .eq('user_id', userId)
    .eq('leave_type_id', leaveTypeId);
  const afterHold = bal2.data?.[0]?.balance_hours ?? 0;
  expect(afterHold).toBe(afterGrant);

  const rel = await sb.rpc('fn_release_leave', { p_request_id: requestId1 });
  expect(rel.error).toBeNull();

  const bal3 = await sb
    .from('v_leave_balances')
    .select('*')
    .eq('user_id', userId)
    .eq('leave_type_id', leaveTypeId);
  const afterReject = bal3.data?.[0]?.balance_hours ?? 0;
  expect(afterReject).toBe(afterGrant);

  const requestId2 = await createRequest(sb);
  const hold2 = await sb.rpc('fn_allocate_leave', {
    p_user_id: userId,
    p_leave_type_id: leaveTypeId,
    p_request_id: requestId2,
    p_needs: needs,
    p_is_hold: true,
  });
  expect(hold2.error).toBeNull();

  const conf = await sb.rpc('fn_confirm_leave', { p_request_id: requestId2 });
  expect(conf.error).toBeNull();

  const bal4 = await sb
    .from('v_leave_balances')
    .select('*')
    .eq('user_id', userId)
    .eq('leave_type_id', leaveTypeId);
  const afterApprove = bal4.data?.[0]?.balance_hours ?? 0;
  expect(afterApprove).toBe(afterGrant - 2);

  const rev = await sb.rpc('fn_reverse_confirmed_leave', {
    p_request_id: requestId2,
    p_reason: 'e2e cancel',
  });
  expect(rev.error).toBeNull();

  const bal5 = await sb
    .from('v_leave_balances')
    .select('*')
    .eq('user_id', userId)
    .eq('leave_type_id', leaveTypeId);
  const afterReverse = bal5.data?.[0]?.balance_hours ?? 0;
  expect(afterReverse).toBe(afterGrant);

  const audits = await sb
    .from('audit_logs')
    .select('id')
    .order('created_at', { ascending: false })
    .limit(5);
  expect(audits.error).toBeNull();
  expect((audits.data ?? []).length).toBeGreaterThan(0);
});


