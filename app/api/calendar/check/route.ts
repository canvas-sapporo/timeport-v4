import { NextRequest, NextResponse } from 'next/server';
import { getAdminSupabase } from '@/lib/leave/supabase-admin';

export async function GET(req: NextRequest) {
  const companyId = req.nextUrl.searchParams.get('company_id');
  const date = req.nextUrl.searchParams.get('date');
  if (!companyId || !date) return NextResponse.json({ error: 'company_id and date required' }, { status: 400 });

  const sb = getAdminSupabase();
  const { data, error } = await sb.rpc('fn_is_business_day', { p_company_id: companyId, p_date: date });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true, isBusinessDay: !!data });
}


