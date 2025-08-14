'use server';

import { createAdminClient } from '@/lib/supabase';
import { logAudit } from '@/lib/utils/log-system';

type ManualGrantParams = {
	userId: string;
	leaveTypeId: string;
	quantityMinutes: number;
	grantedOn: string; // YYYY-MM-DD
	expiresOn?: string | null; // YYYY-MM-DD | null
	source?: 'manual' | 'correction';
	note?: string;
	createdBy?: string | null;
};

export async function createManualGrant(params: ManualGrantParams): Promise<{ success: boolean; error?: string }>{
	try {
		const supabase = createAdminClient();
		const { error } = await supabase.from('leave_grants').insert({
			user_id: params.userId,
			leave_type_id: params.leaveTypeId,
			quantity_minutes: Math.floor(params.quantityMinutes),
			granted_on: params.grantedOn,
			expires_on: params.expiresOn ?? null,
			source: params.source ?? 'manual',
			note: params.note || null,
			created_by: params.createdBy || null,
		});
		if (error) return { success: false, error: error.message };
		return { success: true };
	} catch (e) {
		return { success: false, error: e instanceof Error ? e.message : 'Unknown error' };
	}
}

export async function importGrantsCsv(companyId: string, csvText: string, createdBy?: string | null): Promise<{ success: boolean; inserted: number; skipped: number; errorRows: number }>{
	const lines = csvText.split(/\r?\n/).filter((l) => l.trim().length > 0);
	if (lines.length <= 1) return { success: true, inserted: 0, skipped: 0, errorRows: 0 };
	const header = lines[0].split(',').map((s) => s.trim());
	const idxUser = header.indexOf('user_id');
	const idxType = header.indexOf('leave_type_id');
	const idxQty = header.indexOf('quantity_minutes');
	const idxGranted = header.indexOf('granted_on');
	const idxExpires = header.indexOf('expires_on');
	const idxNote = header.indexOf('note');
	let ok = 0, skip = 0, err = 0;
	const supabase = createAdminClient();
	for (let i = 1; i < lines.length; i++) {
		const cols = lines[i].split(',');
		if (cols.length < 4 || idxUser < 0 || idxType < 0 || idxQty < 0 || idxGranted < 0) { err++; continue; }
		const userId = cols[idxUser]?.trim();
		const leaveTypeId = cols[idxType]?.trim();
		const quantityMinutes = parseInt(cols[idxQty]?.trim() || '0', 10);
		const grantedOn = cols[idxGranted]?.trim();
		const expiresOn = idxExpires >= 0 ? (cols[idxExpires]?.trim() || null) : null;
		const note = idxNote >= 0 ? (cols[idxNote]?.trim() || null) : null;
		if (!userId || !leaveTypeId || !grantedOn || !Number.isFinite(quantityMinutes)) { err++; continue; }
		// Idempotency: skip if an identical policy/import grant exists same day and quantity
		const { data: existing } = await supabase
			.from('leave_grants')
			.select('id')
			.eq('user_id', userId)
			.eq('leave_type_id', leaveTypeId)
			.eq('granted_on', grantedOn)
			.eq('quantity_minutes', quantityMinutes)
			.in('source', ['import', 'policy'])
			.is('deleted_at', null)
			.limit(1);
		if (existing && existing.length > 0) { skip++; continue; }
		const { error } = await supabase.from('leave_grants').insert({
			user_id: userId,
			leave_type_id: leaveTypeId,
			quantity_minutes: quantityMinutes,
			granted_on: grantedOn,
			expires_on: expiresOn,
			source: 'import',
			note,
			created_by: createdBy || null,
		});
		if (error) { err++; continue; }
		ok++;
	}
	return { success: true, inserted: ok, skipped: skip, errorRows: err };
}

export async function runPolicyGrantFlat(params: { companyId: string; leaveTypeId: string; grantDate: string; createdBy?: string | null }): Promise<{ success: boolean; granted: number; skipped: number; error?: string }>{
	try {
		const supabase = createAdminClient();
		// Load policy
		const { data: pol } = await supabase
			.from('leave_policies')
			.select('day_hours, base_days_by_service, expire_months')
			.eq('company_id', params.companyId)
			.eq('leave_type_id', params.leaveTypeId)
			.is('deleted_at', null)
			.single();
		const dayHours = (pol as { day_hours?: number } | null)?.day_hours || 8;
		const baseDaysByService = (pol as { base_days_by_service?: Record<string, number> } | null)?.base_days_by_service || {};
		const baseDays = baseDaysByService['0'] ?? 10;
		const quantityMinutes = Math.floor(baseDays * dayHours * 60);
		const expireMonths = (pol as { expire_months?: number } | null)?.expire_months || 24;
		const expiresOn = new Date(params.grantDate);
		expiresOn.setMonth(expiresOn.getMonth() + expireMonths);
		const expiresOnStr = `${expiresOn.getFullYear()}-${String(expiresOn.getMonth() + 1).padStart(2, '0')}-${String(expiresOn.getDate()).padStart(2, '0')}`;

		// Company users
		const { data: users } = await supabase
			.from('v_user_companies')
			.select('user_id')
			.eq('company_id', params.companyId);
		const userIds = ((users || []) as Array<{ user_id: string }>).map((u) => u.user_id);
		let granted = 0, skipped = 0;
		for (const userId of userIds) {
			// Idempotency check
			const { data: existing } = await supabase
				.from('leave_grants')
				.select('id')
				.eq('user_id', userId)
				.eq('leave_type_id', params.leaveTypeId)
				.eq('granted_on', params.grantDate)
				.eq('source', 'policy')
				.is('deleted_at', null)
				.limit(1);
			if (existing && existing.length > 0) { skipped++; continue; }
			const { error } = await supabase.from('leave_grants').insert({
				user_id: userId,
				leave_type_id: params.leaveTypeId,
				quantity_minutes: quantityMinutes,
				granted_on: params.grantDate,
				expires_on: expiresOnStr,
				source: 'policy',
				note: null,
				created_by: params.createdBy || null,
			});
			if (error) { skipped++; continue; }
			granted++;
		}
		return { success: true, granted, skipped };
	} catch (e) {
		return { success: false, granted: 0, skipped: 0, error: e instanceof Error ? e.message : 'Unknown error' };
	}
}

// ==========================
// 高度な付与（anniversary / fiscal_fixed / monthly）
// ==========================

type AdvancedGrantParams = {
  companyId: string;
  leaveTypeId: string;
  grantDate: string; // YYYY-MM-DD (JST)
  accrualMethod: 'anniversary' | 'fiscal_fixed' | 'monthly';
  fiscalStartMonth?: number; // 1-12 (fiscal_fixedのみ)
  createdBy?: string | null;
};

export async function runPolicyGrantAdvanced(params: AdvancedGrantParams): Promise<{ success: boolean; granted: number; skipped: number; error?: string }>{
  try {
    const supabase = createAdminClient();
    const traceId = crypto.randomUUID();
    const startedAt = new Date().toISOString();

    // policy取得
    const { data: pol } = await supabase
      .from('leave_policies')
      .select('day_hours, base_days_by_service, expire_months, fiscal_start_month, anniversary_offset_days, monthly_proration, monthly_proration_basis, monthly_min_attendance_rate')
      .eq('company_id', params.companyId)
      .eq('leave_type_id', params.leaveTypeId)
      .is('deleted_at', null)
      .single();

    const dayHours = (pol as { day_hours?: number } | null)?.day_hours || 8;
    const baseDaysByService = (pol as { base_days_by_service?: Record<string, number> } | null)?.base_days_by_service || {};
    const expireMonths = (pol as { expire_months?: number } | null)?.expire_months || 24;
    const policyFiscalStart = (pol as { fiscal_start_month?: number } | null)?.fiscal_start_month || 4;
    const annivOffsetDays = (pol as { anniversary_offset_days?: number } | null)?.anniversary_offset_days || 0;
    const monthlyProration = !!((pol as { monthly_proration?: boolean } | null)?.monthly_proration);
    const monthlyProrationBasis = ((pol as { monthly_proration_basis?: string } | null)?.monthly_proration_basis || 'days') as 'days' | 'hours';
    const monthlyMinAttendanceRate = Number((pol as { monthly_min_attendance_rate?: number } | null)?.monthly_min_attendance_rate || 0);

    // 会社のユーザー
    const { data: users } = await supabase
      .from('v_user_companies')
      .select('user_id')
      .eq('company_id', params.companyId);
    const userIds = ((users || []) as Array<{ user_id: string }>).map((u) => u.user_id);

    // 入社日などは user_profiles.joined_date を想定（なければskip）
    const { data: profiles } = await supabase
      .from('user_profiles')
      .select('id, joined_date')
      .in('id', userIds)
      .is('deleted_at', null);

    const profileMap = new Map<string, { joined_date?: string | null }>();
    (profiles || []).forEach((p) => profileMap.set((p as { id: string }).id, p as { joined_date?: string | null }));

    const grantDate = new Date(params.grantDate);

    let granted = 0;
    let skipped = 0;

    for (const userId of userIds) {
      // 1) 対象判定
      let eligible = false;
      let serviceYears = 0;
      const prof = profileMap.get(userId);
      const joined = prof?.joined_date ? new Date(prof.joined_date) : null;

      if (params.accrualMethod === 'anniversary') {
        if (!joined) { skipped++; continue; }
        const jd = new Date(joined);
        // 前倒し/後倒しオフセット考慮
        const target = new Date(Date.UTC(grantDate.getUTCFullYear(), jd.getUTCMonth(), jd.getUTCDate()))
        target.setUTCDate(target.getUTCDate() + annivOffsetDays);
        eligible = (target.getUTCFullYear() === grantDate.getUTCFullYear() && target.getUTCMonth() === grantDate.getUTCMonth() && target.getUTCDate() === grantDate.getUTCDate());
        serviceYears = Math.max(0, grantDate.getUTCFullYear() - jd.getUTCFullYear());
        if (!eligible) { skipped++; continue; }
      } else if (params.accrualMethod === 'fiscal_fixed') {
        const startMonth = Math.min(12, Math.max(1, params.fiscalStartMonth || policyFiscalStart));
        // 期首月の1日に付与（ex: 4/1）
        eligible = (grantDate.getUTCMonth() + 1) === startMonth && grantDate.getUTCDate() === 1;
        if (!joined) { skipped++; continue; }
        const anniversary = new Date(Date.UTC(grantDate.getUTCFullYear(), startMonth - 1, 1));
        serviceYears = Math.max(0, anniversary.getUTCFullYear() - new Date(joined).getUTCFullYear());
        if (!eligible) { skipped++; continue; }
      } else if (params.accrualMethod === 'monthly') {
        // 毎月1日に付与（前月の出勤実績で按分）
        eligible = grantDate.getUTCDate() === 1;
        serviceYears = 0; // 月次は年次加算なし（必要に応じて別ロジック）
        if (!eligible) { skipped++; continue; }
      }

      // 2) 付与日数の決定
      let baseDays = baseDaysByService[String(serviceYears)] ?? baseDaysByService['0'] ?? 0;
      // 月次の按分（厳密版）: 対象月（前月）の勤怠から出勤率を算出して比例配分
      if (params.accrualMethod === 'monthly' && monthlyProration) {
        // 対象期間: 付与日の前月1日〜前月末
        const targetYear = grantDate.getUTCMonth() === 0 ? grantDate.getUTCFullYear() - 1 : grantDate.getUTCFullYear();
        const targetMonthIndex = (grantDate.getUTCMonth() + 11) % 12; // 0-11 (前月)
        const periodStart = new Date(Date.UTC(targetYear, targetMonthIndex, 1));
        const periodEnd = new Date(Date.UTC(targetYear, targetMonthIndex + 1, 0)); // 月末
        const startStr = `${periodStart.getUTCFullYear()}-${String(periodStart.getUTCMonth() + 1).padStart(2, '0')}-${String(periodStart.getUTCDate()).padStart(2, '0')}`;
        const endStr = `${periodEnd.getUTCFullYear()}-${String(periodEnd.getUTCMonth() + 1).padStart(2, '0')}-${String(periodEnd.getUTCDate()).padStart(2, '0')}`;

        // 会社カレンダーから当月の稼働日数（workday）を取得。0件なら平日(Mon-Fri)で代替
        let workdaysInMonth = 0;
        {
        const { data: cal } = await supabase
          .from('company_calendar_dates')
          .select('day_type, calendar_date')
          .eq('company_id', params.companyId)
          .gte('calendar_date', startStr)
          .lte('calendar_date', endStr)
          .is('deleted_at', null);
          if (cal && cal.length > 0) {
            workdaysInMonth = (cal as Array<{ day_type: string }>).filter((d) => d.day_type === 'workday').length;
          }
          if (!cal || cal.length === 0 || workdaysInMonth === 0) {
            // 平日カウント（Mon-Fri）
            let tmp = new Date(periodStart.getTime());
            while (tmp <= periodEnd) {
              const dow = tmp.getUTCDay(); // 0=Sun..6=Sat
              if (dow >= 1 && dow <= 5) workdaysInMonth++;
              tmp.setUTCDate(tmp.getUTCDate() + 1);
            }
          }
        }

        // ユーザーの実出勤
        const { data: atns } = await supabase
          .from('attendances')
          .select('work_date, actual_work_minutes')
          .eq('user_id', userId)
          .eq('is_current', true)
          .is('deleted_at', null)
          .gte('work_date', startStr)
          .lte('work_date', endStr);

        // 出勤日: 実労働が正のunique日数
        const uniqueDays = new Set<string>();
        let workedMinutesSum = 0;
        for (const r of (atns || []) as Array<{ work_date: string; actual_work_minutes?: number }>) {
          const mins = Number(r.actual_work_minutes || 0);
          if (mins > 0) {
            uniqueDays.add(r.work_date);
            workedMinutesSum += mins;
          }
        }
        const attendedDays = uniqueDays.size;

        let attendanceRate = 0;
        if (monthlyProrationBasis === 'days') {
          attendanceRate = workdaysInMonth > 0 ? attendedDays / workdaysInMonth : 0;
        } else {
          const expectedHours = workdaysInMonth * dayHours;
          const workedHours = workedMinutesSum / 60;
          attendanceRate = expectedHours > 0 ? workedHours / expectedHours : 0;
        }
        // 最低出勤率を満たさない場合0付与
        if (attendanceRate < monthlyMinAttendanceRate) {
          baseDays = 0;
        } else {
          // 比例配分（0..1にクリップ）
          const ratio = Math.max(0, Math.min(1, attendanceRate));
          baseDays = baseDays * ratio;
        }
      }
      // 2.5) 繰越（前期末で失効する残を上限まで移送）- monthlyは対象外
      let carryoverMinutes = 0;
      const carryoverMaxDays = (pol as { carryover_max_days?: number | null } | null)?.carryover_max_days;
      if (params.accrualMethod !== 'monthly' && carryoverMaxDays !== null && carryoverMaxDays !== undefined) {
        const capMinutes = Math.max(0, Math.floor(Number(carryoverMaxDays) * dayHours * 60));
        // 前日（期末）に失効するgrantの残を集計
        const prevEnd = new Date(Date.UTC(grantDate.getUTCFullYear(), grantDate.getUTCMonth(), grantDate.getUTCDate()));
        prevEnd.setUTCDate(prevEnd.getUTCDate() - 1);
        const prevEndStr = `${prevEnd.getUTCFullYear()}-${String(prevEnd.getUTCMonth() + 1).padStart(2, '0')}-${String(prevEnd.getUTCDate()).padStart(2, '0')}`;
        const { data: expiringGrants } = await supabase
          .from('leave_grants')
          .select('id, quantity_minutes')
          .eq('user_id', userId)
          .eq('leave_type_id', params.leaveTypeId)
          .eq('expires_on', prevEndStr)
          .is('deleted_at', null);
        const grantIds = (expiringGrants || []).map((g) => (g as { id: string }).id);
        let consumedByGrant = new Map<string, number>();
        if (grantIds.length > 0) {
          const { data: cons } = await supabase
            .from('leave_consumptions')
            .select('grant_id, quantity_minutes')
            .in('grant_id', grantIds)
            .is('deleted_at', null);
          (cons || []).forEach((c) => {
            const gid = (c as { grant_id: string }).grant_id;
            const qty = Number((c as { quantity_minutes: number }).quantity_minutes) || 0;
            consumedByGrant.set(gid, (consumedByGrant.get(gid) || 0) + qty);
          });
        }
        let leftoverSum = 0;
        (expiringGrants || []).forEach((g) => {
          const gid = (g as { id: string }).id;
          const qty = Number((g as { quantity_minutes: number }).quantity_minutes) || 0;
          const used = consumedByGrant.get(gid) || 0;
          const left = Math.max(0, qty - used);
          leftoverSum += left;
        });
        carryoverMinutes = Math.min(capMinutes, leftoverSum);
      }

      const grantMinutesFromBase = Math.floor(baseDays * dayHours * 60);
      const quantityMinutes = grantMinutesFromBase + (carryoverMinutes || 0);
      if (quantityMinutes <= 0) { skipped++; continue; }

      // 3) 重複防止（同日・policy）
      const { data: existing } = await supabase
        .from('leave_grants')
        .select('id')
        .eq('user_id', userId)
        .eq('leave_type_id', params.leaveTypeId)
        .eq('granted_on', params.grantDate)
        .eq('source', 'policy')
        .is('deleted_at', null)
        .limit(1);
      if (existing && existing.length > 0) { skipped++; continue; }

      // 4) 失効日計算
      const exp = new Date(params.grantDate);
      exp.setMonth(exp.getMonth() + expireMonths);
      const expStr = `${exp.getUTCFullYear()}-${String(exp.getUTCMonth() + 1).padStart(2, '0')}-${String(exp.getUTCDate()).padStart(2, '0')}`;

      const { error } = await supabase.from('leave_grants').insert({
        user_id: userId,
        leave_type_id: params.leaveTypeId,
        quantity_minutes: quantityMinutes,
        granted_on: params.grantDate,
        expires_on: expStr,
        source: 'policy',
        note: carryoverMinutes > 0 ? `carryover:${carryoverMinutes}` : null,
        created_by: params.createdBy || null,
      });
      if (error) { skipped++; continue; }
      granted++;
    }

    const finishedAt = new Date().toISOString();
    await logAudit('leave_grant_run_finished', {
      user_id: params.createdBy || undefined,
      company_id: params.companyId,
      target_type: 'leave_grants',
      target_id: undefined,
      before_data: undefined,
      after_data: {
        granted,
        skipped,
      },
      details: {
        action_type: 'policy_grant',
        accrual_method: params.accrualMethod,
        fiscal_start_month: params.fiscalStartMonth,
        leave_type_id: params.leaveTypeId,
        grant_date: params.grantDate,
        started_at: startedAt,
        finished_at: finishedAt,
        trace_id: traceId,
      },
    });
    return { success: true, granted, skipped };
  } catch (e) {
    await logAudit('leave_grant_run_failed', {
      user_id: params.createdBy || undefined,
      company_id: params.companyId,
      target_type: 'leave_grants',
      details: {
        action_type: 'policy_grant',
        accrual_method: params.accrualMethod,
        leave_type_id: params.leaveTypeId,
        grant_date: params.grantDate,
        error: e instanceof Error ? e.message : 'Unknown error',
      },
    });
    return { success: false, granted: 0, skipped: 0, error: e instanceof Error ? e.message : 'Unknown error' };
  }
}


// ポリシーからaccrual_methodを自動判定して実行
export async function runPolicyGrantAuto(params: { companyId: string; leaveTypeId: string; grantDate: string; createdBy?: string | null }): Promise<{ success: boolean; granted: number; skipped: number; error?: string }>{
  try {
    const supabase = createAdminClient();
    const traceId = crypto.randomUUID();
    const startedAt = new Date().toISOString();
    // Acquire advisory lock
    const { data: lockAcquired } = await supabase.rpc('try_start_leave_grant', {
      company_id: params.companyId,
      leave_type_id: params.leaveTypeId,
      grant_date: params.grantDate,
    });
    if (!lockAcquired) {
      await logAudit('leave_grant_run_skipped_locked', {
        user_id: params.createdBy || undefined,
        company_id: params.companyId,
        target_type: 'leave_grants',
        details: {
          action_type: 'policy_grant',
          leave_type_id: params.leaveTypeId,
          grant_date: params.grantDate,
          reason: 'another run is in progress',
        },
      });
      return { success: false, granted: 0, skipped: 0, error: 'Another grant run is in progress' };
    }

    const { data: pol, error } = await supabase
      .from('leave_policies')
      .select('accrual_method, fiscal_start_month')
      .eq('company_id', params.companyId)
      .eq('leave_type_id', params.leaveTypeId)
      .is('deleted_at', null)
      .single();
    if (error) {
      await logAudit('leave_grant_run_failed', {
        user_id: params.createdBy || undefined,
        company_id: params.companyId,
        target_type: 'leave_grants',
        details: {
          action_type: 'policy_grant',
          leave_type_id: params.leaveTypeId,
          grant_date: params.grantDate,
          error: error.message,
        },
      });
      return { success: false, granted: 0, skipped: 0, error: error.message };
    }
    const accrualMethod = ((pol as { accrual_method?: string } | null)?.accrual_method || 'anniversary') as 'anniversary' | 'fiscal_fixed' | 'monthly';
    const fiscalStartMonth = (pol as { fiscal_start_month?: number } | null)?.fiscal_start_month;
    await logAudit('leave_grant_run_started', {
      user_id: params.createdBy || undefined,
      company_id: params.companyId,
      target_type: 'leave_grants',
      details: {
        action_type: 'policy_grant',
        accrual_method: accrualMethod,
        fiscal_start_month: fiscalStartMonth,
        leave_type_id: params.leaveTypeId,
        grant_date: params.grantDate,
        started_at: startedAt,
        trace_id: traceId,
      },
    });
    // 委譲
    const res = await runPolicyGrantAdvanced({
      companyId: params.companyId,
      leaveTypeId: params.leaveTypeId,
      grantDate: params.grantDate,
      accrualMethod,
      fiscalStartMonth,
      createdBy: params.createdBy || null,
    });
    const finishedAt = new Date().toISOString();
    await logAudit('leave_grant_run_finished', {
      user_id: params.createdBy || undefined,
      company_id: params.companyId,
      target_type: 'leave_grants',
      after_data: { granted: res.granted, skipped: res.skipped },
      details: {
        action_type: 'policy_grant',
        accrual_method: accrualMethod,
        fiscal_start_month: fiscalStartMonth,
        leave_type_id: params.leaveTypeId,
        grant_date: params.grantDate,
        started_at: startedAt,
        finished_at: finishedAt,
        trace_id: traceId,
      },
    });
    // Release advisory lock
    await supabase.rpc('finish_leave_grant', {
      company_id: params.companyId,
      leave_type_id: params.leaveTypeId,
      grant_date: params.grantDate,
    });
    return res;
  } catch (e) {
    // Best-effort unlock on error
    try {
      const supabase = createAdminClient();
      await supabase.rpc('finish_leave_grant', {
        company_id: params.companyId,
        leave_type_id: params.leaveTypeId,
        grant_date: params.grantDate,
      });
    } catch {}
    await logAudit('leave_grant_run_failed', {
      user_id: params.createdBy || undefined,
      company_id: params.companyId,
      target_type: 'leave_grants',
      details: {
        action_type: 'policy_grant',
        leave_type_id: params.leaveTypeId,
        grant_date: params.grantDate,
        error: e instanceof Error ? e.message : 'Unknown error',
      },
    });
    return { success: false, granted: 0, skipped: 0, error: e instanceof Error ? e.message : 'Unknown error' };
  }
}


type PreviewGrantParams = {
  companyId: string;
  leaveTypeId: string;
  grantDate: string; // YYYY-MM-DD (JST)
};

export async function previewPolicyGrantAdvanced(params: PreviewGrantParams): Promise<{
  success: boolean;
  accrualMethod?: 'anniversary' | 'fiscal_fixed' | 'monthly';
  results: Array<{
    userId: string;
    eligible: boolean;
    serviceYears: number;
    baseDays: number;
    quantityMinutes: number;
    reason?: string;
    duplicate?: boolean;
  }>;
  error?: string;
}> {
  try {
    const supabase = createAdminClient();

    const { data: pol } = await supabase
      .from('leave_policies')
      .select('day_hours, base_days_by_service, expire_months, fiscal_start_month, anniversary_offset_days, monthly_proration, monthly_proration_basis, monthly_min_attendance_rate, accrual_method')
      .eq('company_id', params.companyId)
      .eq('leave_type_id', params.leaveTypeId)
      .is('deleted_at', null)
      .single();

    const dayHours = (pol as { day_hours?: number } | null)?.day_hours || 8;
    const baseDaysByService = (pol as { base_days_by_service?: Record<string, number> } | null)?.base_days_by_service || {};
    const policyFiscalStart = (pol as { fiscal_start_month?: number } | null)?.fiscal_start_month || 4;
    const annivOffsetDays = (pol as { anniversary_offset_days?: number } | null)?.anniversary_offset_days || 0;
    const monthlyProration = !!((pol as { monthly_proration?: boolean } | null)?.monthly_proration);
    const monthlyProrationBasis = ((pol as { monthly_proration_basis?: string } | null)?.monthly_proration_basis || 'days') as 'days' | 'hours';
    const monthlyMinAttendanceRate = Number((pol as { monthly_min_attendance_rate?: number } | null)?.monthly_min_attendance_rate || 0);
    const accrualMethod = ((pol as { accrual_method?: string } | null)?.accrual_method || 'anniversary') as 'anniversary' | 'fiscal_fixed' | 'monthly';

    // company users
    const { data: users } = await supabase
      .from('v_user_companies')
      .select('user_id')
      .eq('company_id', params.companyId);
    const userIds = ((users || []) as Array<{ user_id: string }>).map((u) => u.user_id);

    const { data: profiles } = await supabase
      .from('user_profiles')
      .select('id, joined_date')
      .in('id', userIds)
      .is('deleted_at', null);
    const profileMap = new Map<string, { joined_date?: string | null }>();
    (profiles || []).forEach((p) => profileMap.set((p as { id: string }).id, p as { joined_date?: string | null }));

    const grantDate = new Date(params.grantDate);

    const results: Array<{ userId: string; eligible: boolean; serviceYears: number; baseDays: number; quantityMinutes: number; reason?: string; duplicate?: boolean }> = [];

    for (const userId of userIds) {
      let eligible = false;
      let reason: string | undefined;
      let serviceYears = 0;
      const prof = profileMap.get(userId);
      const joined = prof?.joined_date ? new Date(prof.joined_date) : null;

      if (accrualMethod === 'anniversary') {
        if (!joined) { results.push({ userId, eligible: false, serviceYears: 0, baseDays: 0, quantityMinutes: 0, reason: 'joined_dateなし' }); continue; }
        const jd = new Date(joined);
        const target = new Date(Date.UTC(grantDate.getUTCFullYear(), jd.getUTCMonth(), jd.getUTCDate()));
        target.setUTCDate(target.getUTCDate() + annivOffsetDays);
        eligible = (target.getUTCFullYear() === grantDate.getUTCFullYear() && target.getUTCMonth() === grantDate.getUTCMonth() && target.getUTCDate() === grantDate.getUTCDate());
        serviceYears = Math.max(0, grantDate.getUTCFullYear() - jd.getUTCFullYear());
        if (!eligible) reason = '対象日ではない';
      } else if (accrualMethod === 'fiscal_fixed') {
        const startMonth = Math.min(12, Math.max(1, policyFiscalStart));
        eligible = (grantDate.getUTCMonth() + 1) === startMonth && grantDate.getUTCDate() === 1;
        if (!joined) { results.push({ userId, eligible: false, serviceYears: 0, baseDays: 0, quantityMinutes: 0, reason: 'joined_dateなし' }); continue; }
        const anniversary = new Date(Date.UTC(grantDate.getUTCFullYear(), startMonth - 1, 1));
        serviceYears = Math.max(0, anniversary.getUTCFullYear() - new Date(joined).getUTCFullYear());
        if (!eligible) reason = '対象日ではない';
      } else {
        // monthly
        eligible = grantDate.getUTCDate() === 1;
        serviceYears = 0;
        if (!eligible) reason = '対象日ではない';
      }

      let baseDays = baseDaysByService[String(serviceYears)] ?? baseDaysByService['0'] ?? 0;

      // Monthly proration
      if (accrualMethod === 'monthly' && monthlyProration) {
        const targetYear = grantDate.getUTCMonth() === 0 ? grantDate.getUTCFullYear() - 1 : grantDate.getUTCFullYear();
        const targetMonthIndex = (grantDate.getUTCMonth() + 11) % 12;
        const periodStart = new Date(Date.UTC(targetYear, targetMonthIndex, 1));
        const periodEnd = new Date(Date.UTC(targetYear, targetMonthIndex + 1, 0));
        const startStr = `${periodStart.getUTCFullYear()}-${String(periodStart.getUTCMonth() + 1).padStart(2, '0')}-${String(periodStart.getUTCDate()).padStart(2, '0')}`;
        const endStr = `${periodEnd.getUTCFullYear()}-${String(periodEnd.getUTCMonth() + 1).padStart(2, '0')}-${String(periodEnd.getUTCDate()).padStart(2, '0')}`;

        let workdaysInMonth = 0;
        const { data: cal } = await supabase
          .from('company_calendar_dates')
          .select('day_type, calendar_date')
          .eq('company_id', params.companyId)
          .gte('calendar_date', startStr)
          .lte('calendar_date', endStr)
          .is('deleted_at', null);
        if (cal && cal.length > 0) {
          workdaysInMonth = (cal as Array<{ day_type: string }>).filter((d) => d.day_type === 'workday').length;
        }
        if (!cal || cal.length === 0 || workdaysInMonth === 0) {
          let tmp = new Date(periodStart.getTime());
          while (tmp <= periodEnd) {
            const dow = tmp.getUTCDay();
            if (dow >= 1 && dow <= 5) workdaysInMonth++;
            tmp.setUTCDate(tmp.getUTCDate() + 1);
          }
        }

        const { data: atns } = await supabase
          .from('attendances')
          .select('work_date, actual_work_minutes')
          .eq('user_id', userId)
          .eq('is_current', true)
          .is('deleted_at', null)
          .gte('work_date', startStr)
          .lte('work_date', endStr);

        const uniqueDays = new Set<string>();
        let workedMinutesSum = 0;
        for (const r of (atns || []) as Array<{ work_date: string; actual_work_minutes?: number }>) {
          const mins = Number(r.actual_work_minutes || 0);
          if (mins > 0) {
            uniqueDays.add(r.work_date);
            workedMinutesSum += mins;
          }
        }
        const attendedDays = uniqueDays.size;

        let attendanceRate = 0;
        if (monthlyProrationBasis === 'days') {
          attendanceRate = workdaysInMonth > 0 ? attendedDays / workdaysInMonth : 0;
        } else {
          const expectedHours = workdaysInMonth * dayHours;
          const workedHours = workedMinutesSum / 60;
          attendanceRate = expectedHours > 0 ? workedHours / expectedHours : 0;
        }
        if (attendanceRate < monthlyMinAttendanceRate) {
          baseDays = 0;
          reason = `出勤率未達 (${(attendanceRate * 100).toFixed(1)}%)`;
        } else {
          const ratio = Math.max(0, Math.min(1, attendanceRate));
          baseDays = baseDays * ratio;
        }
      }

      let quantityMinutes = 0;
      if (!eligible) {
        // keep reason
      } else if (baseDays <= 0) {
        reason = reason || '基準日数0';
      } else {
        quantityMinutes = Math.floor(baseDays * dayHours * 60);
      }

      // 重複確認（参考情報）
      let duplicate = false;
      if (eligible && quantityMinutes > 0) {
        const { data: existing } = await supabase
          .from('leave_grants')
          .select('id')
          .eq('user_id', userId)
          .eq('leave_type_id', params.leaveTypeId)
          .eq('granted_on', params.grantDate)
          .eq('source', 'policy')
          .is('deleted_at', null)
          .limit(1);
        duplicate = !!(existing && existing.length > 0);
        if (duplicate) {
          reason = '同日付のpolicy付与が既存';
        }
      }

      results.push({ userId, eligible, serviceYears, baseDays, quantityMinutes, reason, duplicate });
    }

    return { success: true, accrualMethod, results };
  } catch (e) {
    return { success: false, results: [], error: e instanceof Error ? e.message : 'Unknown error' };
  }
}

