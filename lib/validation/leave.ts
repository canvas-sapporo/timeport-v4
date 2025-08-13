'use server';

import { createAdminClient } from '@/lib/supabase';
import { getUserCompanyId } from '@/lib/actions/user';

type UUID = string;

export interface ValidationIssue {
  code: string;
  message: string;
  detail_id?: UUID;
}

export interface ValidationResult {
  valid: boolean;
  issues: ValidationIssue[];
}

interface PolicyRow {
  id: UUID;
  company_id: UUID;
  leave_type_id: UUID;
  allow_negative: boolean;
  hold_on_apply: boolean;
  deduction_timing: 'apply' | 'approve';
  business_day_only: boolean;
  blackout_dates: string[] | null;
  day_hours: number;
  min_booking_unit_minutes: number;
  rounding_minutes: number;
  allowed_units: string[];
  half_day_mode: 'fixed_hours' | 'am_pm';
}

async function fetchActivePolicy(companyId: UUID, leaveTypeId: UUID): Promise<PolicyRow | null> {
  const supabase = createAdminClient();
  const { data } = await supabase
    .from('leave_policies')
    .select(
      'id, company_id, leave_type_id, allow_negative, hold_on_apply, deduction_timing, business_day_only, blackout_dates, day_hours, min_booking_unit_minutes, rounding_minutes, allowed_units, half_day_mode'
    )
    .eq('company_id', companyId)
    .eq('leave_type_id', leaveTypeId)
    .eq('is_active', true)
    .is('deleted_at', null)
    .maybeSingle();
  return (data as unknown as PolicyRow) || null;
}

function getDateKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}

async function isBlackoutOrHoliday(companyId: UUID, dateKey: string): Promise<boolean> {
  const supabase = createAdminClient();
  const { data } = await supabase
    .from('company_calendar_dates')
    .select('day_type, is_blackout')
    .eq('company_id', companyId)
    .eq('calendar_date', dateKey)
    .is('deleted_at', null)
    .maybeSingle();
  if (!data) return false;
  const row = data as unknown as { day_type?: string; is_blackout?: boolean };
  const isHolidayType = row.day_type === 'holiday' || row.day_type === 'company_holiday' || row.day_type === 'public_holiday';
  return !!row.is_blackout || !!isHolidayType;
}

function minutesForUnit(unit: 'day' | 'half' | 'hour', dayHours: number): number {
  if (unit === 'day') return dayHours * 60;
  if (unit === 'half') return Math.floor((dayHours * 60) / 2);
  return 60; // hour
}

export async function validateLeaveRequestDetails(requestId: UUID): Promise<ValidationResult> {
  const supabase = createAdminClient();
  const issues: ValidationIssue[] = [];

  // リクエストと申請者
  const { data: req, error: reqErr } = await supabase
    .from('requests')
    .select('id, user_id')
    .eq('id', requestId)
    .maybeSingle();
  if (reqErr || !req) {
    return { valid: false, issues: [{ code: 'REQUEST_NOT_FOUND', message: '申請が見つかりません' }] };
  }

  const userId = (req as { user_id: UUID }).user_id;
  const companyId = await getUserCompanyId(userId);
  if (!companyId) {
    return { valid: false, issues: [{ code: 'COMPANY_NOT_RESOLVED', message: '会社を特定できません' }] };
  }

  // 明細取得
  const { data: details, error: detErr } = await supabase
    .from('leave_request_details')
    .select('id, leave_type_id, start_at, end_at, quantity_minutes, unit')
    .eq('request_id', requestId)
    .is('deleted_at', null);
  if (detErr) {
    return { valid: false, issues: [{ code: 'FETCH_ERROR', message: detErr.message }] };
  }
  if (!details || details.length === 0) {
    return { valid: true, issues: [] };
  }

  // まず明細レベルの検証
  for (const d of details as Array<{
    id: UUID;
    leave_type_id: UUID;
    start_at: string;
    end_at: string;
    quantity_minutes: number;
    unit: 'day' | 'half' | 'hour';
  }>) {
    const start = new Date(d.start_at);
    const end = new Date(d.end_at);
    if (!(start instanceof Date) || !(end instanceof Date) || isNaN(start.getTime()) || isNaN(end.getTime()) || start >= end) {
      issues.push({ code: 'INVALID_PERIOD', message: '開始と終了の時刻が不正です', detail_id: d.id });
      continue;
    }

    const policy = (await fetchActivePolicy(companyId, d.leave_type_id)) || {
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
    };

    if (!policy.allowed_units.includes(d.unit)) {
      issues.push({ code: 'UNIT_NOT_ALLOWED', message: `許可されていない単位です: ${d.unit}`, detail_id: d.id });
    }

    // 単位・丸めの整合性
    if (d.unit === 'day') {
      const expected = minutesForUnit('day', policy.day_hours);
      if (d.quantity_minutes !== expected) {
        issues.push({ code: 'QUANTITY_MISMATCH', message: `日単位の分数(${expected})と合いません`, detail_id: d.id });
      }
    } else if (d.unit === 'half') {
      const expected = minutesForUnit('half', policy.day_hours);
      if (d.quantity_minutes !== expected) {
        issues.push({ code: 'QUANTITY_MISMATCH', message: `半日単位の分数(${expected})と合いません`, detail_id: d.id });
      }
    } else if (d.unit === 'hour') {
      if (d.quantity_minutes % policy.rounding_minutes !== 0) {
        issues.push({ code: 'ROUNDING_VIOLATION', message: `丸め単位(${policy.rounding_minutes}分)に一致しません`, detail_id: d.id });
      }
    }

    if (d.quantity_minutes % policy.min_booking_unit_minutes !== 0) {
      issues.push({ code: 'MIN_UNIT_VIOLATION', message: `最小単位(${policy.min_booking_unit_minutes}分)に一致しません`, detail_id: d.id });
    }

    // 営業日・ブラックアウト
    const dateKey = getDateKey(start);
    if (Array.isArray(policy.blackout_dates) && policy.blackout_dates.includes(dateKey)) {
      issues.push({ code: 'BLACKOUT_POLICY', message: 'ポリシーの取得不可日に該当します', detail_id: d.id });
    }
    if (policy.business_day_only) {
      const blocked = await isBlackoutOrHoliday(companyId, dateKey);
      if (blocked) {
        issues.push({ code: 'NON_BUSINESS_DAY', message: '営業日以外に取得しようとしています', detail_id: d.id });
      }
    }
  }

  // 残高チェック（種別別合算）
  const byType = new Map<string, number>();
  for (const d of (details || []) as Array<{ leave_type_id: UUID; quantity_minutes: number }>) {
    byType.set(d.leave_type_id, (byType.get(d.leave_type_id) || 0) + d.quantity_minutes);
  }

  for (const [leaveTypeId, totalMinutes] of byType) {
    const policy = (await fetchActivePolicy(companyId, leaveTypeId)) || ({ allow_negative: false } as Partial<PolicyRow>);
    if (!policy.allow_negative) {
      const { data: bal } = await createAdminClient()
        .from('v_leave_balances')
        .select('balance_minutes')
        .eq('user_id', userId)
        .eq('leave_type_id', leaveTypeId)
        .maybeSingle();
      const balance = (bal as { balance_minutes?: number } | null)?.balance_minutes ?? 0;
      if (balance < totalMinutes) {
        issues.push({ code: 'INSUFFICIENT_BALANCE', message: '残高が不足しています', detail_id: undefined });
      }
    }
  }

  return { valid: issues.length === 0, issues };
}


