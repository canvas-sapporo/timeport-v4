'use server';

import { createAdminClient } from '@/lib/supabase';

type UpdateLeavePolicyPatch = {
  fiscal_start_month?: number;
  day_hours?: number;
  anniversary_offset_days?: number;
  monthly_proration?: boolean;
  monthly_proration_basis?: 'days' | 'hours';
  monthly_min_attendance_rate?: number; // 0..1
  carryover_max_days?: number | null;
  expire_months?: number;
  allow_negative?: boolean;
  min_booking_unit_minutes?: number;
  rounding_minutes?: number;
  hold_on_apply?: boolean;
  deduction_timing?: 'apply' | 'approve';
  business_day_only?: boolean;
  base_days_by_service?: Record<string, number>;
  allowed_units?: Array<'day' | 'half' | 'hour'>;
  half_day_mode?: 'fixed_hours' | 'am_pm';
  allow_multi_day?: boolean;
  blackout_dates?: string[];
};

export async function updateLeavePolicyPartial(params: {
  companyId: string;
  leaveTypeId: string;
  patch: UpdateLeavePolicyPatch;
  currentUserId?: string | null;
}): Promise<{ success: boolean; error?: string }>{
  try {
    const supabase = createAdminClient();
    const body: Record<string, unknown> = {
      company_id: params.companyId,
      leave_type_id: params.leaveTypeId,
      updated_at: new Date().toISOString(),
    };
    if (params.patch.fiscal_start_month !== undefined) {
      const m = Number(params.patch.fiscal_start_month);
      if (!Number.isFinite(m) || m < 1 || m > 12) {
        return { success: false, error: 'fiscal_start_monthは1-12の整数で指定してください' };
      }
      body.fiscal_start_month = m;
    }
    if (params.patch.day_hours !== undefined) {
      const dh = Number(params.patch.day_hours);
      if (!Number.isFinite(dh) || dh <= 0 || dh > 24) {
        return { success: false, error: 'day_hoursは0より大きく24以下の数値で指定してください' };
      }
      body.day_hours = Math.round(dh * 100) / 100; // 小数点2桁まで許容
    }
    if (params.patch.anniversary_offset_days !== undefined) {
      const ao = Number(params.patch.anniversary_offset_days);
      if (!Number.isFinite(ao) || Math.floor(ao) !== ao || ao < -366 || ao > 366) {
        return { success: false, error: 'anniversary_offset_daysは-366〜366の整数で指定してください' };
      }
      body.anniversary_offset_days = ao;
    }
    if (params.patch.monthly_proration !== undefined) {
      body.monthly_proration = !!params.patch.monthly_proration;
    }
    if (params.patch.monthly_proration_basis !== undefined) {
      const basis = params.patch.monthly_proration_basis;
      if (basis !== 'days' && basis !== 'hours') {
        return { success: false, error: "monthly_proration_basisは'days'または'hours'を指定してください" };
      }
      body.monthly_proration_basis = basis;
    }
    if (params.patch.monthly_min_attendance_rate !== undefined) {
      const rate = Number(params.patch.monthly_min_attendance_rate);
      if (!Number.isFinite(rate) || rate < 0 || rate > 1) {
        return { success: false, error: 'monthly_min_attendance_rateは0〜1の数値で指定してください' };
      }
      body.monthly_min_attendance_rate = rate;
    }
    if (params.patch.carryover_max_days !== undefined) {
      const v = params.patch.carryover_max_days;
      if (v === null) {
        body.carryover_max_days = null;
      } else {
        const num = Number(v);
        if (!Number.isFinite(num) || num < 0 || num > 9999) {
          return { success: false, error: 'carryover_max_daysは0以上の数値（必要なら小数）で指定してください' };
        }
        body.carryover_max_days = num;
      }
    }
    if (params.patch.expire_months !== undefined) {
      const m = Number(params.patch.expire_months);
      if (!Number.isFinite(m) || Math.floor(m) !== m || m < 0 || m > 120) {
        return { success: false, error: 'expire_monthsは0〜120の整数で指定してください' };
      }
      body.expire_months = m;
    }
    if (params.patch.allow_negative !== undefined) {
      body.allow_negative = !!params.patch.allow_negative;
    }
    if (params.patch.min_booking_unit_minutes !== undefined) {
      const v = Number(params.patch.min_booking_unit_minutes);
      if (!Number.isFinite(v) || Math.floor(v) !== v || v <= 0 || v > 1440) {
        return { success: false, error: 'min_booking_unit_minutesは1〜1440の整数で指定してください' };
      }
      body.min_booking_unit_minutes = v;
    }
    if (params.patch.rounding_minutes !== undefined) {
      const v = Number(params.patch.rounding_minutes);
      if (!Number.isFinite(v) || Math.floor(v) !== v || v < 0 || v > 120) {
        return { success: false, error: 'rounding_minutesは0〜120の整数で指定してください' };
      }
      body.rounding_minutes = v;
    }
    if (params.patch.hold_on_apply !== undefined) {
      body.hold_on_apply = !!params.patch.hold_on_apply;
    }
    if (params.patch.deduction_timing !== undefined) {
      const dt = params.patch.deduction_timing;
      if (dt !== 'apply' && dt !== 'approve') {
        return { success: false, error: "deduction_timingは'apply'または'approve'を指定してください" };
      }
      body.deduction_timing = dt;
    }
    if (params.patch.business_day_only !== undefined) {
      body.business_day_only = !!params.patch.business_day_only;
    }
    if (params.patch.base_days_by_service !== undefined) {
      const src = params.patch.base_days_by_service;
      const out: Record<string, number> = {};
      for (const [k, v] of Object.entries(src)) {
        if (!/^\d+$/.test(k)) {
          return { success: false, error: 'base_days_by_serviceのキーは0以上の整数年（文字列）で指定してください' };
        }
        const num = Number(v);
        if (!Number.isFinite(num) || num < 0 || num > 365) {
          return { success: false, error: 'base_days_by_serviceの値は0〜365の数値で指定してください' };
        }
        out[k] = num;
      }
      body.base_days_by_service = out as unknown as Record<string, unknown>;
    }
    if (params.patch.allowed_units !== undefined) {
      const valid: Array<'day' | 'half' | 'hour'> = [];
      for (const u of params.patch.allowed_units) {
        if (u === 'day' || u === 'half' || u === 'hour') valid.push(u);
        else return { success: false, error: "allowed_unitsは'day'|'half'|'hour'のみ指定できます" };
      }
      if (valid.length === 0) {
        return { success: false, error: 'allowed_unitsは1つ以上を指定してください' };
      }
      body.allowed_units = valid as unknown as unknown[];
    }
    if (params.patch.half_day_mode !== undefined) {
      const m = params.patch.half_day_mode;
      if (m !== 'fixed_hours' && m !== 'am_pm') {
        return { success: false, error: "half_day_modeは'fixed_hours'または'am_pm'を指定してください" };
      }
      body.half_day_mode = m;
    }
    if (params.patch.allow_multi_day !== undefined) {
      body.allow_multi_day = !!params.patch.allow_multi_day;
    }
    if (params.patch.blackout_dates !== undefined) {
      const arr: string[] = [];
      for (const d of params.patch.blackout_dates) {
        if (typeof d !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(d)) {
          return { success: false, error: 'blackout_datesはYYYY-MM-DDの配列で指定してください' };
        }
        arr.push(d);
      }
      body.blackout_dates = arr as unknown as unknown[];
    }

    const { error } = await supabase
      .from('leave_policies')
      .upsert(body, { onConflict: 'company_id,leave_type_id' });
    if (error) return { success: false, error: error.message };
    return { success: true };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : 'Unknown error' };
  }
}


