import { NextResponse } from 'next/server';

import { createAdminClient } from '@/lib/supabase';
import { runPolicyGrantFlat, runPolicyGrantAdvanced } from '@/lib/actions/leave-grants';

function getJstDateString(date: Date): string {
  const jstMs = date.getTime() + 9 * 60 * 60 * 1000;
  const d = new Date(jstMs);
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, '0');
  const day = String(d.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export async function GET(req: Request) {
  try {
    // 簡易トークン認証（Vercel Cron からの呼び出し保護）
    const token = req.headers.get('x-cron-secret');
    if (!process.env.CRON_SECRET || token !== process.env.CRON_SECRET) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    const supabase = createAdminClient();

    // 実行対象の付与日（JST）
    const grantDate = getJstDateString(new Date());

    // 有効なポリシーを全社・全種別で取得
    const { data: policies, error } = await supabase
      .from('leave_policies')
      .select('company_id, leave_type_id, is_active, accrual_method')
      .eq('is_active', true)
      .is('deleted_at', null);
    if (error) {
      return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    }

    const targets = (policies || []).map((p) => ({
      companyId: (p as { company_id: string }).company_id,
      leaveTypeId: (p as { leave_type_id: string }).leave_type_id,
      accrualMethod: (p as { accrual_method?: string }).accrual_method || 'anniversary',
    }));

    const results: Array<{ companyId: string; leaveTypeId: string; granted: number; skipped: number; success: boolean; error?: string }> = [];
    for (const t of targets) {
      // accrual_method に応じて分岐
      // eslint-disable-next-line no-await-in-loop
      const res = t.accrualMethod === 'anniversary'
        ? await runPolicyGrantAdvanced({ companyId: t.companyId, leaveTypeId: t.leaveTypeId, grantDate, accrualMethod: 'anniversary' })
        : t.accrualMethod === 'monthly'
          ? await runPolicyGrantAdvanced({ companyId: t.companyId, leaveTypeId: t.leaveTypeId, grantDate, accrualMethod: 'monthly' })
          : await runPolicyGrantAdvanced({ companyId: t.companyId, leaveTypeId: t.leaveTypeId, grantDate, accrualMethod: 'fiscal_fixed' });
      results.push({ companyId: t.companyId, leaveTypeId: t.leaveTypeId, granted: res.granted || 0, skipped: res.skipped || 0, success: !!res.success, error: res.error });
    }

    const summary = {
      ok: true,
      grantDate,
      totalPolicies: targets.length,
      totalGranted: results.reduce((s, r) => s + (r.granted || 0), 0),
      totalSkipped: results.reduce((s, r) => s + (r.skipped || 0), 0),
      results,
    };

    return NextResponse.json(summary);
  } catch (e) {
    return NextResponse.json({ ok: false, error: e instanceof Error ? e.message : 'Unknown error' }, { status: 500 });
  }
}


