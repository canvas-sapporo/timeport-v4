'use server';

import { createAdminClient } from '@/lib/supabase';
import { logAudit, logSystem } from '@/lib/utils/log-system';
import { getUserCompanyId } from '@/lib/actions/user';

type UUID = string;

export type DeductionTiming = 'apply' | 'approve';

export interface LeavePolicy {
  id: UUID;
  company_id: UUID;
  leave_type_id: UUID;
  accrual_method: 'anniversary' | 'fiscal_fixed' | 'monthly';
  base_days_by_service: Record<string, number>;
  carryover_max_days: number | null;
  expire_months: number | null;
  allow_negative: boolean;
  hold_on_apply: boolean;
  deduction_timing: DeductionTiming;
  business_day_only: boolean;
  blackout_dates: unknown[];
  day_hours: number;
  min_booking_unit_minutes: number;
  rounding_minutes: number;
  allowed_units: string[];
  half_day_mode: 'fixed_hours' | 'am_pm';
  allow_multi_day: boolean;
}

export interface AllocateParams {
  userId: UUID;
  leaveTypeId: UUID;
  quantityMinutes: number; // 正の値（逆仕訳は別APIで作る）
  consumedOn: string; // YYYY-MM-DD
  requestId?: UUID;
  createdBy?: UUID;
  allowNegative?: boolean;
}

export interface HoldForRequestParams {
  requestId: UUID;
  currentUserId: UUID;
}

export interface FinalizeOnApproveParams {
  requestId: UUID;
  approverId: UUID;
}

export interface ReleaseOnRejectParams {
  requestId: UUID;
  currentUserId: UUID;
}

export interface ReverseOnCancelParams {
  requestId: UUID;
  currentUserId: UUID;
}

async function fetchPolicyOrDefault(companyId: UUID, leaveTypeId: UUID): Promise<LeavePolicy> {
  const supabase = createAdminClient();
  const { data } = await supabase
    .from('leave_policies')
    .select('*')
    .eq('company_id', companyId)
    .eq('leave_type_id', leaveTypeId)
    .eq('is_active', true)
    .is('deleted_at', null)
    .maybeSingle();

  if (data) {
    return data as unknown as LeavePolicy;
  }

  // フォールバック（既定値）
  return {
    id: '00000000-0000-0000-0000-000000000000',
    company_id: companyId,
    leave_type_id: leaveTypeId,
    accrual_method: 'anniversary',
    base_days_by_service: {},
    carryover_max_days: null,
    expire_months: 24,
    allow_negative: false,
    hold_on_apply: true,
    deduction_timing: 'approve',
    business_day_only: true,
    blackout_dates: [],
    day_hours: 8,
    min_booking_unit_minutes: 60,
    rounding_minutes: 15,
    allowed_units: ['day', 'half', 'hour'],
    half_day_mode: 'fixed_hours',
    allow_multi_day: true,
  };
}

/**
 * 指定ユーザー・種別の残高（分）を取得
 */
export async function getBalanceMinutes(userId: UUID, leaveTypeId: UUID): Promise<number> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from('v_leave_balances')
    .select('balance_minutes')
    .eq('user_id', userId)
    .eq('leave_type_id', leaveTypeId)
    .maybeSingle();
  if (error) throw error;
  return data?.balance_minutes ?? 0;
}

/**
 * FIFOで付与から消費を割当てる。
 * 注意: 現段階はアプリ側制御。高並行時は将来的にDB関数でFOR UPDATEを使った実装へ移行する。
 */
export async function allocateConsumptionFIFO(params: AllocateParams): Promise<{ insertedCount: number; remainingMinutes: number }> {
  const { userId, leaveTypeId, quantityMinutes, consumedOn, requestId, createdBy, allowNegative } = params;
  if (quantityMinutes <= 0) throw new Error('quantityMinutes must be positive');

  const supabase = createAdminClient();

  // 現在の残高確認（allowNegative=false なら不足時エラー）
  if (!allowNegative) {
    const balance = await getBalanceMinutes(userId, leaveTypeId);
    if (balance < quantityMinutes) {
      throw new Error('INSUFFICIENT_BALANCE');
    }
  }

  // 候補grant取得（期限内）
  const { data: grants, error: grantsError } = await supabase
    .from('leave_grants')
    .select('id, quantity_minutes, granted_on, expires_on')
    .eq('user_id', userId)
    .eq('leave_type_id', leaveTypeId)
    .is('deleted_at', null)
    .or('expires_on.is.null,expires_on.gte.' + new Date(consumedOn).toISOString().slice(0, 10))
    .order('granted_on', { ascending: true })
    .order('created_at', { ascending: true });
  if (grantsError) throw grantsError;

  // 各grantの消費済み合計（符号付き）
  const grantIds = (grants ?? []).map((g) => g.id);
  const consumptionByGrant = new Map<string, number>();
  if (grantIds.length > 0) {
    const { data: consumedRows, error: consumedError } = await supabase
      .from('leave_consumptions')
      .select('grant_id, quantity_minutes')
      .in('grant_id', grantIds)
      .is('deleted_at', null);
    if (consumedError) throw consumedError;
    for (const row of consumedRows ?? []) {
      const prev = consumptionByGrant.get(row.grant_id) ?? 0;
      consumptionByGrant.set(row.grant_id, prev + (row.quantity_minutes as number));
    }
  }

  let remaining = quantityMinutes;
  const inserts: Array<{ request_id?: UUID; user_id: UUID; leave_type_id: UUID; grant_id: UUID; quantity_minutes: number; consumed_on: string; created_by?: UUID }> = [];

  for (const g of grants ?? []) {
    if (remaining <= 0) break;
    const consumed = consumptionByGrant.get(g.id) ?? 0;
    const available = (g.quantity_minutes as number) - consumed;
    if (available <= 0) continue;
    const take = Math.min(available, remaining);
    inserts.push({
      request_id: requestId,
      user_id: userId,
      leave_type_id: leaveTypeId,
      grant_id: g.id as string,
      quantity_minutes: take,
      consumed_on: consumedOn,
      created_by: createdBy,
    });
    remaining -= take;
  }

  // allowNegative が true か残が満たせた場合のみ挿入
  if (remaining > 0 && !allowNegative) {
    throw new Error('INSUFFICIENT_ALLOCATABLE_GRANTS');
  }

  if (inserts.length > 0) {
    const { error: insertError } = await supabase.from('leave_consumptions').insert(inserts);
    if (insertError) throw insertError;
  }

  return { insertedCount: inserts.length, remainingMinutes: remaining };
}

/**
 * 申請作成時の仮押さえ（hold_on_apply=true のポリシーに限り、申請時点で消費を作成）
 */
export async function holdConsumptionsForRequest(params: HoldForRequestParams): Promise<void> {
  const { requestId, currentUserId } = params;
  const supabase = createAdminClient();

  // 申請・明細・申請者取得
  const { data: request, error: reqErr } = await supabase
    .from('requests')
    .select('id, user_id, created_at')
    .eq('id', requestId)
    .maybeSingle();
  if (reqErr || !request) throw reqErr || new Error('REQUEST_NOT_FOUND');

  const { data: details, error: detErr } = await supabase
    .from('leave_request_details')
    .select('leave_type_id, start_at, end_at, quantity_minutes, unit')
    .eq('request_id', requestId)
    .is('deleted_at', null);
  if (detErr) throw detErr;
  if (!details || details.length === 0) return;

  const companyId = await getUserCompanyId(request.user_id);
  if (!companyId) throw new Error('COMPANY_NOT_RESOLVED');

  // 明細ごとにポリシー評価し、hold_on_apply=true の場合は即時消費を作成
  for (const d of details) {
    const leaveTypeId = d.leave_type_id as string;
    const policy = await fetchPolicyOrDefault(companyId, leaveTypeId);
    if (!policy.hold_on_apply) continue;

    const consumedOn = new Date(d.start_at as string).toISOString().slice(0, 10);
    await allocateConsumptionFIFO({
      userId: request.user_id as string,
      leaveTypeId,
      quantityMinutes: d.quantity_minutes as number,
      consumedOn,
      requestId: requestId,
      createdBy: currentUserId,
      allowNegative: policy.allow_negative,
    });
  }

  await logAudit('leave_hold_created', {
    user_id: currentUserId,
    target_type: 'requests',
    target_id: requestId,
  });
}

/**
 * 承認時の確定処理（deduction_timing='approve' かつ hold_on_apply=false のポリシーで消費を作成）
 */
export async function finalizeConsumptionsOnApprove(params: FinalizeOnApproveParams): Promise<void> {
  const { requestId, approverId } = params;
  const supabase = createAdminClient();

  const { data: request, error: reqErr } = await supabase
    .from('requests')
    .select('id, user_id')
    .eq('id', requestId)
    .maybeSingle();
  if (reqErr || !request) throw reqErr || new Error('REQUEST_NOT_FOUND');

  const { data: details, error: detErr } = await supabase
    .from('leave_request_details')
    .select('leave_type_id, start_at, end_at, quantity_minutes, unit')
    .eq('request_id', requestId)
    .is('deleted_at', null);
  if (detErr) throw detErr;
  if (!details || details.length === 0) return;

  const companyId = await getUserCompanyId(request.user_id);
  if (!companyId) throw new Error('COMPANY_NOT_RESOLVED');

  for (const d of details) {
    const leaveTypeId = d.leave_type_id as string;
    const policy = await fetchPolicyOrDefault(companyId, leaveTypeId);
    if (policy.deduction_timing !== 'approve' || policy.hold_on_apply) continue; // 申請時に作成済み or approve不要

    const consumedOn = new Date(d.start_at as string).toISOString().slice(0, 10);
    await allocateConsumptionFIFO({
      userId: request.user_id as string,
      leaveTypeId,
      quantityMinutes: d.quantity_minutes as number,
      consumedOn,
      requestId: requestId,
      createdBy: approverId,
      allowNegative: policy.allow_negative,
    });
  }

  await logAudit('leave_consumption_finalized', {
    user_id: approverId,
    target_type: 'requests',
    target_id: requestId,
  });
}

/**
 * 却下・取り下げ時の解放（申請に紐づく消費を削除）
 */
export async function releaseConsumptionsForRequest(params: ReleaseOnRejectParams): Promise<void> {
  const { requestId, currentUserId } = params;
  const supabase = createAdminClient();

  const { error } = await supabase
    .from('leave_consumptions')
    .delete()
    .eq('request_id', requestId)
    .is('deleted_at', null);
  if (error) throw error;

  await logAudit('leave_hold_released', {
    user_id: currentUserId,
    target_type: 'requests',
    target_id: requestId,
  });
}

/**
 * 承認後の取消時の逆仕訳（同一request_idに紐づく消費を負数で打ち消し）
 */
export async function reverseConsumptionsForRequest(params: ReverseOnCancelParams): Promise<void> {
  const { requestId, currentUserId } = params;
  const supabase = createAdminClient();

  const { data: rows, error: fetchErr } = await supabase
    .from('leave_consumptions')
    .select('user_id, leave_type_id, grant_id, quantity_minutes, consumed_on')
    .eq('request_id', requestId)
    .is('deleted_at', null);
  if (fetchErr) throw fetchErr;
  if (!rows || rows.length === 0) return;

  const reversals = rows.map((r) => ({
    request_id: requestId,
    user_id: r.user_id as string,
    leave_type_id: r.leave_type_id as string,
    grant_id: r.grant_id as string,
    quantity_minutes: -(r.quantity_minutes as number),
    consumed_on: r.consumed_on as string,
    created_by: currentUserId,
  }));

  const { error: insErr } = await supabase.from('leave_consumptions').insert(reversals);
  if (insErr) throw insErr;

  await logAudit('leave_consumption_reversed', {
    user_id: currentUserId,
    target_type: 'requests',
    target_id: requestId,
  });
}


