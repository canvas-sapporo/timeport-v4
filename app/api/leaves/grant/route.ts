import { NextRequest, NextResponse } from 'next/server';
import { getAdminSupabase } from '@/lib/leave/supabase-admin';
import { writeAudit } from '@/lib/audit';

export async function POST(req: NextRequest) {
  const secret = req.headers.get('x-cron-secret');
  if (!process.env.CRON_SECRET || secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const companyId = body.companyId ?? null; // 指定なければ全社
  const date = body.date ?? null; // 'YYYY-MM-DD' 指定でバックフィル可能

  const supabase = getAdminSupabase();
  const { data, error } = await supabase.rpc('fn_issue_leave_grants', {
    p_company_id: companyId,
    p_today: date,
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  await writeAudit({
    action: 'grant_issue_job',
    targetType: 'leave_grants',
    details: { result: data },
  });
  return NextResponse.json({ ok: true, result: data });
}


